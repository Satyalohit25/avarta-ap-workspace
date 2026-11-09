import { prisma } from "../../config/database";
import { Prisma } from "@prisma/client";

export type IntegrationType =
  | "BYOK_AI"
  | "BYODB"
  | "ERP"
  | "STORAGE"
  | "PAYMENT_GATEWAY"
  | "EMAIL"
  | "NOTIFICATION";

export interface IntegrationRecord {
  id: string;
  organizationId: string;
  type: IntegrationType;
  provider: string;
  encryptedConfig: string;
  settings?: Record<string, unknown> | null;
  status: "CONNECTED" | "DISCONNECTED" | "ERROR";
  lastTestedAt?: Date | null;
  lastSyncAt?: Date | null;
  errorMessage?: string | null;
}

function normalizeType(type: string): IntegrationType {
  return type as IntegrationType;
}

export class IntegrationRepository {
  static async find(
    organizationId: string,
    type: string,
    provider: string
  ): Promise<IntegrationRecord | null> {
    const record = await prisma.organizationIntegration.findFirst({
      where: { organizationId, type, provider },
    });
    return record ? this.toRecord(record) : null;
  }

  static async findByType(
    organizationId: string,
    type: string
  ): Promise<IntegrationRecord[]> {
    const records = await prisma.organizationIntegration.findMany({
      where: { organizationId, type },
    });
    return records.map((record) => this.toRecord(record));
  }

  static async upsert(
    record: Omit<IntegrationRecord, "id"> & { id?: string }
  ): Promise<IntegrationRecord> {
    const data = {
      organizationId: record.organizationId,
      type: record.type,
      provider: record.provider,
      encryptedConfig: record.encryptedConfig,
      settings: (record.settings ?? {}) as Prisma.InputJsonValue,
      status: record.status,
      lastTestedAt: record.lastTestedAt ?? null,
      lastSyncAt: record.lastSyncAt ?? null,
      errorMessage: record.errorMessage ?? null,
    };

    const saved = await prisma.organizationIntegration.upsert({
      where: {
        organizationId_type_provider: {
          organizationId: record.organizationId,
          type: record.type,
          provider: record.provider,
        },
      },
      create: data,
      update: {
        encryptedConfig: data.encryptedConfig,
        settings: data.settings,
        status: data.status,
        lastTestedAt: data.lastTestedAt,
        lastSyncAt: data.lastSyncAt,
        errorMessage: data.errorMessage,
      },
    });

    return this.toRecord(saved);
  }

  static async remove(organizationId: string, type: string, provider: string) {
    // Connectors are revoked, never deleted (AGENTS.md Rule 3). The caller
    // marks the record DISCONNECTED with an empty encrypted payload.
    const existing = await prisma.organizationIntegration.findFirst({
      where: { organizationId, type, provider },
    });
    if (!existing) return null;
    const saved = await prisma.organizationIntegration.update({
      where: { id: existing.id },
      data: {
        status: "DISCONNECTED",
        encryptedConfig: "",
        settings: {},
        errorMessage: null,
      },
    });
    return this.toRecord(saved);
  }

  private static toRecord(record: {
    id: string;
    organizationId: string;
    type: string;
    provider: string;
    encryptedConfig: string;
    settings: Prisma.JsonValue;
    status: string;
    lastTestedAt: Date | null;
    lastSyncAt: Date | null;
    errorMessage: string | null;
  }): IntegrationRecord {
    return {
      id: record.id,
      organizationId: record.organizationId,
      type: normalizeType(record.type),
      provider: record.provider,
      encryptedConfig: record.encryptedConfig,
      settings:
        record.settings && typeof record.settings === "object"
          ? (record.settings as Record<string, unknown>)
          : null,
      status:
        record.status === "CONNECTED" || record.status === "ERROR"
          ? record.status
          : "DISCONNECTED",
      lastTestedAt: record.lastTestedAt,
      lastSyncAt: record.lastSyncAt,
      errorMessage: record.errorMessage,
    };
  }
}
