import { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../config/database";

export interface DatabaseTestResult {
  success: boolean;
  latencyMs: number;
  databaseName?: string;
  serverVersion?: string;
  tableCount?: number;
  message: string;
}

export interface TenantConnectionEntry {
  client: PrismaClient;
  lastUsed: number;
}

/**
 * Validates a database URL for Server-Side Request Forgery (SSRF) and security constraints.
 * Blocks private subnets, localhost, and cloud metadata services (e.g. 169.254.169.254).
 */
export function validateDatabaseUrlSecurity(connectionUrl: string): { safe: boolean; reason?: string } {
  try {
    const url = new URL(connectionUrl);
    const host = url.hostname.toLowerCase();

    // 1. Block Localhost and Loopback
    if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "0.0.0.0") {
      return { safe: false, reason: "Localhost and loopback addresses are prohibited for external BYODB connections (SSRF Protection)." };
    }

    // 2. Block Cloud Instance Metadata (AWS / GCP / Azure 169.254.169.254)
    if (host === "169.254.169.254" || host.startsWith("169.254.")) {
      return { safe: false, reason: "Cloud instance metadata services (169.254.x.x) are strictly blocked (SSRF Protection)." };
    }

    // 3. Block Private Subnets (RFC 1918)
    if (
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
    ) {
      return { safe: false, reason: "Internal private network subnets (RFC 1918) are prohibited for external BYODB connections." };
    }

    // 4. Require TLS / SSL in production
    const isLocalOrTest = process.env.NODE_ENV === "test";
    const sslMode = url.searchParams.get("sslmode")?.toLowerCase();
    if (!isLocalOrTest && (!sslMode || sslMode === "disable")) {
      return {
        safe: false,
        reason: "Transport Layer Security (TLS/SSL) is mandatory for custom databases. Please append '?sslmode=require' to your connection URL.",
      };
    }

    return { safe: true };
  } catch {
    return { safe: false, reason: "Malformed database connection string URL." };
  }
}

class TenantDatabaseManager {
  private tenantPools = new Map<string, TenantConnectionEntry>();
  private readonly IDLE_TTL_MS = 15 * 60 * 1000; // 15 minutes idle eviction

  constructor() {
    // Periodically evict idle connection pools
    setInterval(() => this.evictIdlePools(), 5 * 60 * 1000).unref();
  }

  /**
   * Tests an external PostgreSQL connection URL.
   * Measures latency, retrieves database name and table count, and maps network errors
   * into human-friendly explanations.
   */
  async testConnection(connectionUrl: string): Promise<DatabaseTestResult> {
    if (!connectionUrl || !connectionUrl.startsWith("postgres")) {
      return {
        success: false,
        latencyMs: 0,
        message: "Invalid connection string. Must start with postgresql:// or postgres://",
      };
    }

    // SSRF & TLS Security Audit Gate
    const securityCheck = validateDatabaseUrlSecurity(connectionUrl);
    if (!securityCheck.safe) {
      return {
        success: false,
        latencyMs: 0,
        message: `Security Rejection: ${securityCheck.reason}`,
      };
    }

    const start = Date.now();
    let tempClient: PrismaClient | null = null;

    try {
      tempClient = new PrismaClient({
        datasources: { db: { url: connectionUrl } },
        log: ["error"],
      });

      // 1. Socket and query test
      const queryResult = (await tempClient.$queryRawUnsafe(
        "SELECT 1 as alive, current_database() as db_name, version() as pg_version;"
      )) as Array<{ alive: number; db_name: string; pg_version: string }>;

      const latencyMs = Date.now() - start;
      const dbInfo = queryResult[0];

      // 2. Count existing tables in public schema
      const tablesResult = (await tempClient.$queryRawUnsafe(
        "SELECT count(*)::int as count FROM information_schema.tables WHERE table_schema = 'public';"
      )) as Array<{ count: number }>;

      const tableCount = tablesResult[0]?.count ?? 0;

      return {
        success: true,
        latencyMs,
        databaseName: dbInfo?.db_name || "Unknown",
        serverVersion: dbInfo?.pg_version?.split(" ")[0] || "PostgreSQL",
        tableCount,
        message: `Connected successfully in ${latencyMs}ms (${tableCount} tables found in public schema).`,
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - start;
      const errorMsg = (err instanceof Error ? err.message : String(err)).toLowerCase();

      let friendlyMessage = "Failed to connect to database.";
      if (errorMsg.includes("authentication failed") || errorMsg.includes("password")) {
        friendlyMessage = "Authentication failed. Please verify your database username and password.";
      } else if (errorMsg.includes("econnrefused") || errorMsg.includes("connection refused")) {
        friendlyMessage = "Connection refused. Please verify that the host and port (default 5432) are reachable.";
      } else if (errorMsg.includes("timed out") || errorMsg.includes("etimedout")) {
        friendlyMessage =
          "Connection timed out. Check firewall rules or cloud IP allowlists (e.g. Supabase, AWS RDS Security Group).";
      } else if (errorMsg.includes("database") && errorMsg.includes("does not exist")) {
        friendlyMessage = "The specified database name does not exist on the target PostgreSQL server.";
      } else if (errorMsg.includes("ssl") || errorMsg.includes("certificate")) {
        friendlyMessage = "SSL negotiation failed. Try adding '?sslmode=require' to your connection URL.";
      } else {
        friendlyMessage = `Connection error: ${err instanceof Error ? err.message : String(err)}`;
      }

      return {
        success: false,
        latencyMs,
        message: friendlyMessage,
      };
    } finally {
      if (tempClient) {
        await tempClient.$disconnect().catch(() => {});
      }
    }
  }

  /**
   * Retrieves the active Prisma client for an organization.
   * If the organization has a dedicated custom database URL, returns their dedicated client.
   * Otherwise falls back to the default shared database client.
   */
  async getClientForTenant(
    organizationId: string,
    customDbUrl?: string | null
  ): Promise<PrismaClient> {
    if (!customDbUrl) {
      return defaultPrisma;
    }

    const cached = this.tenantPools.get(organizationId);
    if (cached) {
      cached.lastUsed = Date.now();
      return cached.client;
    }

    // Initialize dedicated pool
    const client = new PrismaClient({
      datasources: { db: { url: customDbUrl } },
      log: ["error"],
    });

    await client.$connect();
    this.tenantPools.set(organizationId, { client, lastUsed: Date.now() });
    return client;
  }

  private evictIdlePools() {
    const now = Date.now();
    for (const [orgId, entry] of this.tenantPools.entries()) {
      if (now - entry.lastUsed > this.IDLE_TTL_MS) {
        entry.client.$disconnect().catch(() => {});
        this.tenantPools.delete(orgId);
      }
    }
  }
}

export const tenantDbManager = new TenantDatabaseManager();
