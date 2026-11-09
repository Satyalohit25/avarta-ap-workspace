import { encryptSecret, decryptSecret, maskSecret } from "../../lib/crypto";
import { testByokApiKey, ByokTestResult } from "../../ai/byok-tester";
import { tenantDbManager, DatabaseTestResult } from "../../lib/tenant-db-manager";
import { getErpAdapter, ErpTestResult, ErpSyncResult } from "../erp/adapter";
import { IntegrationRepository } from "./repository";
import { prisma } from "../../config/database";
import { buildJournalEntry } from "../erp/service";
import { applyTransition } from "../../workflow/engine";

import {
  getPaymentGatewayAdapter,
  PaymentGatewayProvider,
  PaymentGatewayConfig,
  PaymentGatewayTestResult,
} from "../payments/adapter";
import {
  EmailConfig,
  EmailDispatchResult,
  EmailMessage,
  sendEmail,
  testEmailConnection,
} from "../../lib/email-sender";

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
  paymentGateway: {
    provider: string;
    name: string;
    status: string;
    accountName?: string;
    maskedKey?: string;
    lastTestedAt?: Date | null;
  };
  email: {
    provider: string;
    status: string;
    fromName?: string;
    fromEmail?: string;
    replyTo?: string;
    maskedKey?: string;
    lastTestedAt?: Date | null;
  };
}

export class IntegrationsService {
  static async getSummary(organizationId: string): Promise<IntegrationsSummary> {
    const byokRecords = await IntegrationRepository.findByType(organizationId, "BYOK_AI");
    const byodbRecords = await IntegrationRepository.findByType(organizationId, "BYODB");
    const erpRecords = await IntegrationRepository.findByType(organizationId, "ERP");
    const pgRecords = await IntegrationRepository.findByType(organizationId, "PAYMENT_GATEWAY");
    const emailRecords = await IntegrationRepository.findByType(organizationId, "EMAIL");

    const activeByok = byokRecords.find((r) => r.status === "CONNECTED") || byokRecords[0];
    const activeByodb = byodbRecords.find((r) => r.status === "CONNECTED") || byodbRecords[0];
    const activeErp = erpRecords.find((r) => r.status === "CONNECTED") || erpRecords[0];
    const activePg = pgRecords.find((r) => r.status === "CONNECTED") || pgRecords[0];
    const activeEmail = emailRecords.find((r) => r.status === "CONNECTED") || emailRecords[0];

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

    let maskedPgKey: string | undefined;
    if (activePg?.encryptedConfig) {
      try {
        const parsed = JSON.parse(decryptSecret(activePg.encryptedConfig));
        if (parsed.apiKey) maskedPgKey = maskSecret(parsed.apiKey);
        else if (parsed.apiSecret) maskedPgKey = maskSecret(parsed.apiSecret);
      } catch {
        maskedPgKey = "••••••••";
      }
    }

    let maskedEmailKey: string | undefined;
    let emailConfig: Partial<EmailConfig> = {};
    if (activeEmail?.encryptedConfig) {
      try {
        emailConfig = JSON.parse(decryptSecret(activeEmail.encryptedConfig)) as EmailConfig;
        if (emailConfig.apiKey) maskedEmailKey = maskSecret(emailConfig.apiKey);
        else if (emailConfig.smtpPassword) maskedEmailKey = maskSecret(emailConfig.smtpPassword);
      } catch {
        maskedEmailKey = "••••••••";
      }
    }

    const erpAdapter = getErpAdapter(activeErp?.provider || "csv");
    const pgAdapter = getPaymentGatewayAdapter(
      (activePg?.provider as PaymentGatewayProvider) || "MANUAL_BANK_TRANSFER"
    );

    return {
      byok: {
        provider: activeByok?.provider || "NONE",
        maskedKey: maskedByokKey,
        status: activeByok?.status || "DISCONNECTED",
        lastTestedAt: activeByok?.lastTestedAt,
        modelsAvailable: (activeByok?.settings?.modelsAvailable as string[]) || [],
      },
      byodb: {
        mode: activeByodb && activeByodb.status === "CONNECTED" ? "CUSTOM" : "MANAGED",
        maskedUrl: maskedDbUrl,
        status: activeByodb?.status || "MANAGED",
        latencyMs: activeByodb?.settings?.latencyMs as number | undefined,
        lastTestedAt: activeByodb?.lastTestedAt,
        databaseName: activeByodb?.settings?.databaseName as string | undefined,
      },
      erp: {
        provider: activeErp?.provider || "csv",
        name: erpAdapter.name,
        status: activeErp?.status || "DISCONNECTED",
        lastSyncAt: activeErp?.lastSyncAt ?? null,
        config: (activeErp?.settings?.config as Record<string, string>) || {},
      },
      paymentGateway: {
        provider: activePg?.provider || "MANUAL_BANK_TRANSFER",
        name: pgAdapter.name,
        status: activePg?.status || "DISCONNECTED",
        accountName: activePg?.settings?.accountName as string | undefined,
        maskedKey: maskedPgKey,
        lastTestedAt: activePg?.lastTestedAt,
      },
      email: {
        provider: activeEmail?.provider || "NONE",
        status: activeEmail?.status || "DISCONNECTED",
        fromName: emailConfig.fromName,
        fromEmail: emailConfig.fromEmail,
        replyTo: emailConfig.replyTo,
        maskedKey: maskedEmailKey,
        lastTestedAt: activeEmail?.lastTestedAt,
      },
    };
  }

  static async testAndSaveEmail(
    organizationId: string,
    config: EmailConfig,
    save = true,
    testRecipient?: string
  ): Promise<EmailDispatchResult> {
    let effectiveConfig = config;

    // Preserve stored secrets when the administrator leaves a credential
    // field blank (the UI never receives the plaintext secret).
    if (save) {
      const existing = await IntegrationRepository.find(
        organizationId,
        "EMAIL",
        config.provider
      );
      if (existing?.encryptedConfig) {
        try {
          const stored = JSON.parse(decryptSecret(existing.encryptedConfig)) as EmailConfig;
          effectiveConfig = {
            ...stored,
            ...config,
            smtpPassword: config.smtpPassword || stored.smtpPassword,
            apiKey: config.apiKey || stored.apiKey,
          };
        } catch {
          // Fall back to the supplied config if the stored blob is unreadable.
        }
      }
    }

    const testResult = await testEmailConnection(effectiveConfig, testRecipient);

    if (testResult.success && save) {
      const encrypted = encryptSecret(JSON.stringify(effectiveConfig));
      await IntegrationRepository.upsert({
        organizationId,
        type: "EMAIL",
        provider: effectiveConfig.provider,
        encryptedConfig: encrypted,
        status: "CONNECTED",
        lastTestedAt: new Date(),
        settings: {
          fromName: effectiveConfig.fromName,
          fromEmail: effectiveConfig.fromEmail,
          replyTo: effectiveConfig.replyTo,
          latencyMs: testResult.latencyMs,
        },
      });
    }

    return testResult;
  }

  /**
   * Sends a transactional email through the tenant's own connector. Returns
   * `sent: false` with a reason when no connector is configured — callers must
   * never report a fake delivery.
   */
  static async sendTransactionalEmail(
    organizationId: string,
    message: EmailMessage
  ): Promise<{ sent: boolean; reason?: string; result?: EmailDispatchResult }> {
    const records = await IntegrationRepository.findByType(organizationId, "EMAIL");
    const active = records.find((r) => r.status === "CONNECTED");
    if (!active || !active.encryptedConfig) {
      return { sent: false, reason: "No email connector is configured for this workspace." };
    }

    let config: EmailConfig;
    try {
      config = JSON.parse(decryptSecret(active.encryptedConfig)) as EmailConfig;
    } catch {
      return { sent: false, reason: "The email connector credentials could not be decrypted." };
    }

    const result = await sendEmail(config, message);
    return { sent: result.success, reason: result.success ? undefined : result.message, result };
  }

  static async disconnect(
    organizationId: string,
    type: "BYOK_AI" | "BYODB" | "ERP" | "PAYMENT_GATEWAY" | "EMAIL",
    provider: string
  ) {
    return IntegrationRepository.remove(organizationId, type, provider);
  }

  static async testAndSavePaymentGateway(
    organizationId: string,
    provider: PaymentGatewayProvider,
    config: PaymentGatewayConfig,
    save = true
  ): Promise<PaymentGatewayTestResult> {
    const adapter = getPaymentGatewayAdapter(provider);
    const testResult = await adapter.testConnection(config);

    if (testResult.success && save) {
      const encrypted = encryptSecret(JSON.stringify(config));
      await IntegrationRepository.upsert({
        organizationId,
        type: "PAYMENT_GATEWAY",
        provider,
        encryptedConfig: encrypted,
        status: "CONNECTED",
        lastTestedAt: new Date(),
        settings: {
          accountName: testResult.accountName,
          balanceCurrency: testResult.balanceCurrency,
          availableBalance: testResult.availableBalance,
          latencyMs: testResult.latencyMs,
        },
      });
    }

    return testResult;
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
  ): Promise<{ syncedCount: number; failedCount: number; batchReference: string; format: string }> {
    const erpRecords = await IntegrationRepository.findByType(organizationId, "ERP");
    const activeErp = erpRecords.find((r) => r.status === "CONNECTED") || erpRecords[0];
    const adapter = getErpAdapter(activeErp?.provider || "csv");

    // Only PAID invoices can legally transition PAID -> ERP_SYNC. Including
    // SCHEDULED/APPROVED here meant the engine rejected the transition while
    // the clearing number was still stamped, falsely reporting a sync.
    const eligibleInvoices = await prisma.invoice.findMany({
      where: {
        organizationId,
        workflowState: "PAID",
        erpClearingNumber: null,
      },
      include: { supplier: true },
      take: 25,
    });

    const batchReference = `BATCH-ERP-${Date.now().toString().slice(-6)}`;
    let syncedCount = 0;
    let failedCount = 0;

    for (const invoice of eligibleInvoices) {
      try {
        const entry = buildJournalEntry(invoice);
        await adapter.exportJournalEntry(entry, (activeErp?.settings?.config as Record<string, string>) || {});

        await prisma.$transaction(async (tx) => {
          await applyTransition({
            invoiceId: invoice.id,
            organizationId,
            event: "ERP_SUCCESS",
            triggeredBy: userId,
            reason: `Posted to ${adapter.name} via Sovereign Batch ${batchReference}`,
            tx,
          });

          await tx.invoice.update({
            where: {
              id_organizationId: {
                id: invoice.id,
                organizationId,
              },
            },
            data: {
              erpClearingNumber: entry.entryNumber,
              fiscalYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
            },
          });
        });

        syncedCount++;
      } catch {
        failedCount++;
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
      failedCount,
      batchReference,
      format: adapter.id.toUpperCase(),
    };
  }
}
