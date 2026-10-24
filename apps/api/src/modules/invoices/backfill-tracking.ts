import { prisma } from "../../config/database";
import { generateTrackingToken, hashTrackingToken, encryptTrackingToken } from "../../lib/crypto";
import { runWithAdminBackfillBypass } from "../../config/tenant-guard";

export interface BackfillTrackingResult {
  created: number;
  recomputed: number;
  totalProcessed: number;
}

/**
 * Backfills tracking token hash, encrypted token, and expiration timestamp
 * for any legacy invoices that lack them, and idempotently recomputes existing
 * tracking token expirations to the canonical retention policy:
 * - 90 days for standard invoices
 * - 270 days for PAID invoices (90 + 180 days retention)
 */
export async function backfillInvoiceTrackingTokens(operator = "admin-migration-backfill"): Promise<BackfillTrackingResult> {
  return runWithAdminBackfillBypass("tracking-backfill", operator, async () => {
    // Step 1: Backfill missing tokens for invoices where trackingTokenHash is null
    const invoicesWithoutToken = await prisma.invoice.findMany({
      where: {
        trackingTokenHash: null,
      },
      select: {
        id: true,
        organizationId: true,
        status: true,
        createdAt: true,
      },
    });

    let createdCount = 0;
    for (const inv of invoicesWithoutToken) {
      const rawToken = generateTrackingToken();
      const tokenHash = hashTrackingToken(rawToken);
      const encryptedToken = encryptTrackingToken(rawToken, "v1");

      // Standard retention: 90 days from invoice creation, or 270 days if already PAID
      const days = inv.status === "PAID" ? 270 : 90;
      const expiresAt = new Date(inv.createdAt.getTime() + days * 24 * 60 * 60 * 1000);

      await prisma.invoice.update({
        where: {
          id_organizationId: {
            id: inv.id,
            organizationId: inv.organizationId,
          },
        },
        data: {
          trackingTokenHash: tokenHash,
          trackingTokenEncrypted: encryptedToken,
          trackingTokenExpiresAt: expiresAt,
        },
      });
      createdCount++;
    }

    // Step 2: Idempotent recomputation for existing tokens
    // Fixes previously backfilled rows that received 30 days (or 90 days for PAID)
    const existingInvoices = await prisma.invoice.findMany({
      where: {
        trackingTokenHash: { not: null },
      },
      select: {
        id: true,
        organizationId: true,
        status: true,
        createdAt: true,
        trackingTokenExpiresAt: true,
      },
    });

    let recomputedCount = 0;

    for (const inv of existingInvoices) {
      const isPaid = inv.status === "PAID";
      const targetDays = isPaid ? 270 : 90;

      const currentExpiryTime = inv.trackingTokenExpiresAt ? inv.trackingTokenExpiresAt.getTime() : 0;
      const expectedExpiryTime = inv.createdAt.getTime() + targetDays * 24 * 60 * 60 * 1000;

      // Tolerance buffer of 1 day to prevent re-updating on idempotent runs
      if (Math.abs(currentExpiryTime - expectedExpiryTime) > 24 * 60 * 60 * 1000) {
        const newExpiresAt = new Date(expectedExpiryTime);
        await prisma.invoice.update({
          where: {
            id_organizationId: {
              id: inv.id,
              organizationId: inv.organizationId,
            },
          },
          data: {
            trackingTokenExpiresAt: newExpiresAt,
          },
        });
        recomputedCount++;
      }
    }

    return {
      created: createdCount,
      recomputed: recomputedCount,
      totalProcessed: createdCount + recomputedCount,
    };
  });
}

// CLI Execution Entrypoint
if (process.argv[1]?.replace(/\\/g, "/").includes("backfill-tracking")) {
  const isProd = process.env.NODE_ENV === "production";
  const hasConfirm = process.argv.includes("--confirm-production-backfill");
  if (isProd && !hasConfirm) {
    console.error("FATAL: In production, --confirm-production-backfill flag is required to run tracking backfill.");
    process.exit(1);
  }
  console.log(`[BACKFILL] Starting invoice tracking token backfill and recomputation (operator: admin-migration-backfill)...`);
  backfillInvoiceTrackingTokens("admin-migration-backfill")
    .then((result) => {
      console.log(`[BACKFILL SUCCESS] Created: ${result.created}, Recomputed: ${result.recomputed}, Total Processed: ${result.totalProcessed}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[BACKFILL ERROR]`, err);
      process.exit(1);
    });
}

