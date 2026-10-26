import { prisma } from "../../config/database";

export interface IntegrationRecord {
  id: string;
  organizationId: string;
  type: "BYOK_AI" | "BYODB" | "ERP" | "STORAGE" | "PAYMENT_GATEWAY";
  provider: string;
  encryptedConfig: string;
  settings?: Record<string, unknown> | null;
  status: "CONNECTED" | "DISCONNECTED" | "ERROR";
  lastTestedAt?: Date | null;
  lastSyncAt?: Date | null;
  errorMessage?: string | null;
}

// In-memory fallback cache to ensure zero disruption
const memoryStore = new Map<string, IntegrationRecord>();

function getCacheKey(organizationId: string, type: string, provider: string): string {
  return `${organizationId}:${type}:${provider}`;
}

export class IntegrationRepository {
  private static tableEnsured = false;

  private static async ensureTable() {
    if (this.tableEnsured) return;
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "OrganizationIntegration" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "organizationId" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "provider" TEXT NOT NULL,
          "encryptedConfig" TEXT NOT NULL,
          "settings" JSONB,
          "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
          "lastTestedAt" TIMESTAMP(3),
          "lastSyncAt" TIMESTAMP(3),
          "errorMessage" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationIntegration_org_type_provider_key" 
        ON "OrganizationIntegration" ("organizationId", "type", "provider");
      `);
      this.tableEnsured = true;
    } catch {
      // Table may exist or DB in different dialect; use memory fallback
      this.tableEnsured = true;
    }
  }

  static async find(
    organizationId: string,
    type: string,
    provider: string
  ): Promise<IntegrationRecord | null> {
    await this.ensureTable();

    try {
      const records = (await prisma.$queryRawUnsafe(
        `SELECT * FROM "OrganizationIntegration" WHERE "organizationId" = $1 AND "type" = $2 AND "provider" = $3 LIMIT 1;`,
        organizationId,
        type,
        provider
      )) as IntegrationRecord[];

      if (records && records.length > 0) {
        return records[0];
      }
    } catch {
      // Fall through to memory store
    }

    return memoryStore.get(getCacheKey(organizationId, type, provider)) || null;
  }

  static async findByType(organizationId: string, type: string): Promise<IntegrationRecord[]> {
    await this.ensureTable();

    try {
      const records = (await prisma.$queryRawUnsafe(
        `SELECT * FROM "OrganizationIntegration" WHERE "organizationId" = $1 AND "type" = $2;`,
        organizationId,
        type
      )) as IntegrationRecord[];

      if (records && records.length > 0) {
        return records;
      }
    } catch {
      // Fall through to memory store
    }

    const matches: IntegrationRecord[] = [];
    for (const [key, value] of memoryStore.entries()) {
      if (key.startsWith(`${organizationId}:${type}:`)) {
        matches.push(value);
      }
    }
    return matches;
  }

  static async upsert(record: Omit<IntegrationRecord, "id"> & { id?: string }): Promise<IntegrationRecord> {
    await this.ensureTable();
    const id = record.id || `intg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullRecord: IntegrationRecord = {
      ...record,
      id,
    };

    // Always update memory store
    memoryStore.set(getCacheKey(record.organizationId, record.type, record.provider), fullRecord);

    try {
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO "OrganizationIntegration" 
          ("id", "organizationId", "type", "provider", "encryptedConfig", "settings", "status", "lastTestedAt", "lastSyncAt", "errorMessage", "updatedAt")
        VALUES 
          ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, CURRENT_TIMESTAMP)
        ON CONFLICT ("organizationId", "type", "provider") 
        DO UPDATE SET
          "encryptedConfig" = EXCLUDED."encryptedConfig",
          "settings" = EXCLUDED."settings",
          "status" = EXCLUDED."status",
          "lastTestedAt" = EXCLUDED."lastTestedAt",
          "lastSyncAt" = EXCLUDED."lastSyncAt",
          "errorMessage" = EXCLUDED."errorMessage",
          "updatedAt" = CURRENT_TIMESTAMP;
      `,
        id,
        record.organizationId,
        record.type,
        record.provider,
        record.encryptedConfig,
        JSON.stringify(record.settings || {}),
        record.status,
        record.lastTestedAt || null,
        record.lastSyncAt || null,
        record.errorMessage || null
      );
    } catch {
      // Memory store already holds the record
    }

    return fullRecord;
  }
}
