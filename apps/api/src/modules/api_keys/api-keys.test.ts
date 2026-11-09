import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../config/database";
import {
  authenticateApiKey,
  createApiKey,
  listApiKeys,
  revokeApiKey,
} from "./service";
import { apiKeyPathIsBlocked } from "../../middleware/auth";

const ORG_A = "org-apikey-test-a";
const ORG_B = "org-apikey-test-b";
const USER_A = "user-apikey-test-a";
const USER_B = "user-apikey-test-b";

describe("Workspace API keys", () => {
  beforeEach(async () => {
    await prisma.apiKey.deleteMany({
      where: { organizationId: { in: [ORG_A, ORG_B] } },
    });
    await prisma.auditLog.deleteMany({
      where: { organizationId: { in: [ORG_A, ORG_B] } },
    });
    await prisma.user.deleteMany({ where: { id: { in: [USER_A, USER_B] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [ORG_A, ORG_B] } } });
    await prisma.organization.createMany({
      data: [
        { id: ORG_A, name: "API Key Test A", defaultCurrency: "INR", country: "IN" },
        { id: ORG_B, name: "API Key Test B", defaultCurrency: "INR", country: "IN" },
      ],
    });
    await prisma.user.createMany({
      data: [
        {
          id: USER_A,
          organizationId: ORG_A,
          email: "admin@apikey-test.example",
          passwordHash: "x",
          fullName: "API Admin",
          role: "ADMINISTRATOR",
        },
        {
          id: USER_B,
          organizationId: ORG_B,
          email: "admin@apikey-other.example",
          passwordHash: "x",
          fullName: "Other Admin",
          role: "ADMINISTRATOR",
        },
      ],
    });
  });

  it("returns the plaintext key once and stores only its hash", async () => {
    const created = await createApiKey(ORG_A, USER_A, { name: "ERP Sync" });

    expect(created.key).toMatch(/^apk_[a-f0-9]{64}$/);
    expect(created.keyPrefix).toBe(created.key?.slice(0, 12));
    expect(created.status).toBe("ACTIVE");

    const stored = await prisma.apiKey.findFirst({
      where: { id: created.id, organizationId: ORG_A },
    });
    expect(stored?.keyHash).not.toBe(created.key);
    expect(stored?.keyHash).toHaveLength(64);

    const listed = await listApiKeys(ORG_A);
    expect(listed).toHaveLength(1);
    expect(listed[0]).not.toHaveProperty("key");
  });

  it("authenticates a valid key and inherits the creator's role", async () => {
    const created = await createApiKey(ORG_A, USER_A, { name: "Ingest" });
    const payload = await authenticateApiKey(created.key as string);

    expect(payload.organizationId).toBe(ORG_A);
    expect(payload.userId).toBe(USER_A);
    expect(payload.role).toBe("ADMINISTRATOR");
  });

  it("rejects a revoked key", async () => {
    const created = await createApiKey(ORG_A, USER_A, { name: "Temporary" });
    await revokeApiKey(ORG_A, USER_A, created.id);

    await expect(authenticateApiKey(created.key as string)).rejects.toThrow(
      /invalid or revoked/i
    );

    const listed = await listApiKeys(ORG_A);
    expect(listed[0].status).toBe("REVOKED");
  });

  it("does not let another tenant revoke the key", async () => {
    const created = await createApiKey(ORG_A, USER_A, { name: "Scoped" });

    await expect(revokeApiKey(ORG_B, USER_B, created.id)).rejects.toThrow(
      /not found/i
    );
    const stillActive = await prisma.apiKey.findFirst({
      where: { id: created.id, organizationId: ORG_A },
    });
    expect(stillActive?.revokedAt).toBeNull();
  });

  it("keeps key listings tenant-scoped", async () => {
    await createApiKey(ORG_A, USER_A, { name: "A Key" });
    await createApiKey(ORG_B, USER_B, { name: "B Key" });

    const listA = await listApiKeys(ORG_A);
    expect(listA).toHaveLength(1);
    expect(listA[0].name).toBe("A Key");
  });

  it("blocks privileged routes under both /api/v1 and the legacy /api mount", () => {
    for (const prefix of ["/api/v1", "/api"]) {
      expect(apiKeyPathIsBlocked(`${prefix}/organization/settings`)).toBe(true);
      expect(apiKeyPathIsBlocked(`${prefix}/billing/upgrade`)).toBe(true);
      expect(apiKeyPathIsBlocked(`${prefix}/api-keys`)).toBe(true);
      expect(apiKeyPathIsBlocked(`${prefix}/data-export/invoices`)).toBe(true);
      expect(apiKeyPathIsBlocked(`${prefix}/notifications/preferences`)).toBe(true);
      expect(apiKeyPathIsBlocked(`${prefix}/notifications/test-email`)).toBe(true);
    }

    // Ingestion routes remain usable by scoped keys.
    expect(apiKeyPathIsBlocked("/api/v1/invoices")).toBe(false);
    expect(apiKeyPathIsBlocked("/api/suppliers")).toBe(false);
    expect(apiKeyPathIsBlocked("/api/v1/notifications")).toBe(false);
  });
});
