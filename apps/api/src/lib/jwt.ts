import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../config/database";

export interface AuthTokenPayload {
  userId: string;
  organizationId: string;
  role: string;
  tokenVersion?: number;
  iat?: number;
  exp?: number;
}

// In-memory fast-lookup cache for revoked tokens & user revocation timestamps
const revokedTokensCache = new Set<string>();
const userRevocationTimestampsCache = new Map<string, number>();

export function clearTokenRevocationCaches(): void {
  revokedTokensCache.clear();
  userRevocationTimestampsCache.clear();
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function revokeTokenAsync(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  revokedTokensCache.add(tokenHash);
  try {
    const decoded = jwt.decode(token) as AuthTokenPayload | null;
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + (env.jwtExpiresIn || 900) * 1000);

    await prisma.revokedToken.upsert({
      where: { tokenHash },
      create: { tokenHash, expiresAt },
      update: {},
    });
  } catch {
    // If DB operation fails or schema not yet ready, in-memory cache remains active
  }
}

export function revokeToken(token: string): void {
  const tokenHash = hashToken(token);
  revokedTokensCache.add(tokenHash);
  // Asynchronously write to DB
  revokeTokenAsync(token).catch(() => {});
}

export async function revokeAllUserTokensAsync(userId: string): Promise<void> {
  userRevocationTimestampsCache.set(userId, Date.now());
  try {
    // Increment user.tokenVersion in DB to permanently invalidate all issued tokens
    await prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
    // Revoke all refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch {
    // Fallback to cache if user table not reachable
  }
}

export function revokeAllUserTokens(userId: string): void {
  userRevocationTimestampsCache.set(userId, Date.now());
  revokeAllUserTokensAsync(userId).catch(() => {});
}

export async function isTokenRevokedAsync(token: string, payload: AuthTokenPayload): Promise<boolean> {
  const tokenHash = hashToken(token);
  if (revokedTokensCache.has(tokenHash)) {
    return true;
  }

  // Check DB revoked tokens
  try {
    const dbRevoked = await prisma.revokedToken.findUnique({
      where: { tokenHash },
    });
    if (dbRevoked) {
      revokedTokensCache.add(tokenHash);
      return true;
    }
  } catch {
    // In case DB is temporarily unreachable during tests
  }

  // Check user token version against DB
  if (payload.userId && payload.tokenVersion !== undefined) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { tokenVersion: true, status: true },
      });
      if (!user || user.status !== "ACTIVE" || user.tokenVersion !== payload.tokenVersion) {
        return true;
      }
    } catch {
      // In case DB is unreachable
    }
  }

  // Check in-memory timestamp fallback
  if (payload.userId && payload.iat) {
    const revokedAfter = userRevocationTimestampsCache.get(payload.userId);
    if (revokedAfter && payload.iat * 1000 < revokedAfter) {
      return true;
    }
  }

  return false;
}

export function isTokenRevoked(token: string, payload: AuthTokenPayload): boolean {
  const tokenHash = hashToken(token);
  if (revokedTokensCache.has(tokenHash)) {
    return true;
  }
  if (payload.userId && payload.iat) {
    const revokedAfter = userRevocationTimestampsCache.get(payload.userId);
    if (revokedAfter && payload.iat * 1000 < revokedAfter) {
      return true;
    }
  }
  return false;
}

export function signAccessToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  const payload = jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
  if (isTokenRevoked(token, payload)) {
    throw new Error("Token has been revoked or invalidated");
  }
  return payload;
}

export async function verifyAccessTokenAsync(token: string): Promise<AuthTokenPayload> {
  const payload = jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
  const revoked = await isTokenRevokedAsync(token, payload);
  if (revoked) {
    throw new Error("Token has been revoked or invalidated");
  }
  return payload;
}
