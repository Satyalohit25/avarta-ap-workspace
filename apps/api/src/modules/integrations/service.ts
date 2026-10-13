import { encryptSecret, decryptSecret, maskSecret } from "../../lib/crypto";
import { testByokApiKey, ByokTestResult } from "../../ai/byok-tester";
import { tenantDbManager, DatabaseTestResult } from "../../lib/tenant-db-manager";
import { getErpAdapter, ErpTestResult, ErpSyncResult } from "../erp/adapter";
import { IntegrationRepository } from "./repository";
import { prisma } from "../../config/database";
import { buildJournalEntry } from "../erp/service";
import { applyTransition } from "../../workflow/engine";

export interface IntegrationsSummary {
  byok: {
    provider: string;
    maskedKey?: string;
    status: string;
    lastTestedAt?: Date | null;
    modelsAvailable?: string[];
  };
  byodb: {
    mode: "MANAGED" | "CUSTOM";
    maskedUrl?: string;
    status: string;
    latencyMs?: number;
    lastTestedAt?: Date | null;
    databaseName?: string;
  };
  erp: {
    provider: string;
    name: string;
    status: string;
    lastSyncAt?: Date | null;
    config?: Record<string, string>;
  };
}

export class IntegrationsService {
  static async getSummary(organizationId: string): Promise<IntegrationsSummary> {
    const byokRecords = await IntegrationRepository.findByType(organizationId, "BYOK_AI");
    const byodbRecords = await IntegrationRepository.findByType(organizationId, "BYODB");
    const erpRecords = await IntegrationRepository.findByType(organizationId, "ERP");

    const activeByok = byokRecords.find((r) => r.status === "CONNECTED") || byokRecords[0];
    const activeByodb = byodbRecords.find((r) => r.status === "CONNECTED") || byodbRecords[0];
    const activeErp = erpRecords.find((r) => r.status === "CONNECTED") || erpRecords[0];

    let maskedByokKey: string | undefined;
    if (activeByok?.encryptedConfig) {
      try {
        const plain = decryptSecret(activeByok.encryptedConfig);
        maskedByokKey = maskSecret(plain);
      } catch {
        maskedByokKey = "••••••••";
      }
    }

    let maskedDbUrl: string | undefined;
    if (activeByodb?.encryptedConfig) {
      try {
        const plain = decryptSecret(activeByodb.encryptedConfig);
        maskedDbUrl = maskSecret(plain);
      } catch {
        maskedDbUrl = "••••••••";
      }
    }

    const erpAdapter = getErpAdapter(activeErp?.provider || "csv");

    return {
      byok: {
        provider: activeByok?.provider || "TRIAL",
        maskedKey: maskedByokKey,
        status: activeByok?.status || "CONNECTED",
        lastTestedAt: activeByok?.lastTestedAt,
        modelsAvailable: (activeByok?.settings?.modelsAvailable as string[]) || ["Gemini 1.5 Flash (Trial)"],
      },
      byodb: {
        mode: activeByodb && activeByodb.status === "CONNECTED" ? "CUSTOM" : "MANAGED",
        maskedUrl: maskedDbUrl,
        status: activeByodb?.status || "CONNECTED",
        latencyMs: (activeByodb?.settings?.latencyMs as number) || 12,
        lastTestedAt: activeByodb?.lastTestedAt,
        databaseName: (activeByodb?.settings?.databaseName as string) || "avarta_managed_db",
      },
      erp: {
        provider: activeErp?.provider || "csv",
        name: erpAdapter.name,
        status: activeErp?.status || "CONNECTED",
        lastSyncAt: activeErp?.lastSyncAt || new Date(),
        config: (activeErp?.settings?.config as Record<string, string>) || {},
      },
    };
  }

  static async testAndSaveByok(
    organizationId: string,
    provider: "GEMINI" | "OPENAI" | "TEXTRACT",
    apiKey: string,
    save = true
  ): Promise<ByokTestResult> {
    const testResult = await testByokApiKey(provider, apiKey);

    if (testResult.success && save) {
      const encrypted = encryptSecret(apiKey);
      await IntegrationRepository.upsert({
        organizationId,
        type: "BYOK_AI",
        provider,
        encryptedConfig: encrypted,
        status: "CONNECTED",
        lastTestedAt: new Date(),
        settings: {
          modelsAvailable: testResult.modelsAvailable || [],
          latencyMs: testResult.latencyMs,
        },
      });
    }

    return testResult;
  }

  static async testAndSaveByodb(
    organizationId: string,
    connectionUrl: string,
    save = true
  ): Promise<DatabaseTestResult> {
    const testResult = await tenantDbManager.testConnection(connectionUrl);

    if (testResult.success && save) {
      const encrypted = encryptSecret(connectionUrl);
      await IntegrationRepository.upsert({
        organizationId,
        type: "BYODB",
        provider: "POSTGRESQL",
        encryptedConfig: encrypted,
        status: "CONNECTED",
        lastTestedAt: new Date(),
        settings: {
          latencyMs: testResult.latencyMs,
          databaseName: testResult.databaseName,
          tableCount: testResult.tableCount,
        },
      });
    }

    return testResult;
  }

  static async testAndSaveErp(
    organizationId: string,
    provider: string,
    config: Record<string, string>,
    save = true
  ): Promise<ErpTestResult> {
    const adapter = getErpAdapter(provider);
    const testResult = await adapter.testConnection(config);

    if (save) {
      const encrypted = encryptSecret(JSON.stringify(config));
      await IntegrationRepository.upsert({
        organizationId,
        type: "ERP",
        provider: provider.toUpperCase(),
        encryptedConfig: encrypted,
        status: testResult.success ? "CONNECTED" : "ERROR",
        lastTestedAt: new Date(),
        errorMessage: testResult.success ? null : testResult.message,
        settings: { config },
      });
    }

    return testResult;
  }

  static async syncInvoicesToErp(
    organizationId: string,
    userId?: string
  ): Promise<{ syncedCount: number; batchReference: string; format: string }> {
    const erpRecords = await IntegrationRepository.findByType(organizationId, "ERP");
    const activeErp = erpRecords.find((r) => r.status === "CONNECTED") || erpRecords[0];
    const adapter = getErpAdapter(activeErp?.provider || "csv");

    // Fetch invoices in SCHEDULED or PAID status eligible for ERP posting
    const eligibleInvoices = await prisma.invoice.findMany({
      where: {
        organizationId,
        status: { in: ["SCHEDULED", "PAID", "APPROVED"] },
        erpClearingNumber: null,
      },
      include: { supplier: true },
      take: 25,
    });

    const batchReference = `BATCH-ERP-${Date.now().toString().slice(-6)}`;
    let syncedCount = 0;

    for (const invoice of eligibleInvoices) {
      try {
        const entry = buildJournalEntry(invoice);
        await adapter.exportJournalEntry(entry, (activeErp?.settings?.config as Record<string, string>) || {});

        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            erpClearingNumber: entry.entryNumber,
            fiscalYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
          },
        });

        await applyTransition({
          invoiceId: invoice.id,
          event: "ERP_SUCCESS",
          triggeredBy: userId,
          reason: `Posted to ${adapter.name} via Sovereign Batch ${batchReference}`,
        }).catch(() => {});

        syncedCount++;
      } catch {
        // Continue with next invoice in batch
      }
    }

    if (activeErp) {
      await IntegrationRepository.upsert({
        ...activeErp,
        lastSyncAt: new Date(),
      });
    }

    return {
      syncedCount,
      batchReference,
      format: adapter.id.toUpperCase(),
    };
  }
}
