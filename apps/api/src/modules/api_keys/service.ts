import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { ApiError } from "../../lib/errors";
import { runWithApiKeyLookupBypass } from "../../config/tenant-guard";

export interface ApiKeyDto {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  status: "ACTIVE" | "REVOKED";
  lastUsedAt: string | null;
  createdAt: string;
}

function toDto(record: {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: Prisma.JsonValue;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}): ApiKeyDto {
  return {
    id: record.id,
    name: record.name,
    keyPrefix: record.keyPrefix,
    scopes: Array.isArray(record.scopes)
      ? (record.scopes.filter((scope) => typeof scope === "string") as string[])
      : ["invoices:read", "invoices:write"],
    status: record.revokedAt ? "REVOKED" : "ACTIVE",
    lastUsedAt: record.lastUsedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
  };
}

export async function listApiKeys(organizationId: string): Promise<ApiKeyDto[]> {
  const records = await prisma.apiKey.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });
  return records.map(toDto);
}

export async function createApiKey(
  organizationId: string,
  userId: string,
  input: { name: string; scopes?: string[] }
) {
  const existing = await prisma.apiKey.count({
    where: { organizationId, revokedAt: null },
  });
  if (existing >= 20) {
    throw ApiError.badRequest("A workspace can have at most 20 active API keys.");
  }

  const rawKey = `apk_${crypto.randomBytes(32).toString("hex")}`;
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 12);

  const record = await prisma.apiKey.create({
    data: {
      organizationId,
      name: input.name,
      keyPrefix,
      keyHash,
      createdById: userId,
      scopes: (input.scopes && input.scopes.length > 0
        ? input.scopes
        : ["invoices:read", "invoices:write"]) as Prisma.InputJsonValue,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId,
      action: "API_KEY_CREATED",
      entityType: "api_key",
      entityId: record.id,
      afterData: { name: record.name, keyPrefix: record.keyPrefix },
    },
  });

  return {
    ...toDto(record),
    // The plaintext key is returned exactly once and never stored.
    key: rawKey,
  };
}

export async function revokeApiKey(
  organizationId: string,
  userId: string,
  apiKeyId: string
) {
  const existing = await prisma.apiKey.findFirst({
    where: { id: apiKeyId, organizationId },
  });
  if (!existing) throw ApiError.notFound("API key not found");
  if (existing.revokedAt) return toDto(existing);

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.apiKey.updateMany({
      where: { id: apiKeyId, organizationId },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) throw ApiError.notFound("API key not found");
    return tx.apiKey.findFirst({ where: { id: apiKeyId, organizationId } });
  });
  if (!updated) throw ApiError.notFound("API key not found");

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId,
      action: "API_KEY_REVOKED",
      entityType: "api_key",
      entityId: updated.id,
      afterData: { name: updated.name, keyPrefix: updated.keyPrefix },
    },
  });

  return toDto(updated);
}

export async function authenticateApiKey(rawKey: string) {
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const record = await runWithApiKeyLookupBypass(() =>
    prisma.apiKey.findUnique({ where: { keyHash } })
  );
  if (!record || record.revokedAt) {
    throw ApiError.unauthorized("API key is invalid or revoked");
  }

  const user = record.createdById
    ? await prisma.user.findFirst({
        where: { id: record.createdById, organizationId: record.organizationId },
      })
    : null;

  if (!user || user.status !== "ACTIVE") {
    throw ApiError.unauthorized("The user that owns this API key is no longer active");
  }

  await prisma.apiKey.updateMany({
    where: { id: record.id, organizationId: record.organizationId },
    data: { lastUsedAt: new Date() },
  });

  return {
    userId: user.id,
    organizationId: record.organizationId,
    role: user.role,
  };
}
