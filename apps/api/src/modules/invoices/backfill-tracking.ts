import { prisma } from "../../config/database";
import { generateTrackingToken, hashTrackingToken, encryptTrackingToken } from "../../lib/crypto";

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
export async function backfillInvoiceTrackingTokens(): Promise<BackfillTrackingResult> {
  // Step 1: Backfill missing tokens for invoices where trackingTokenHash is null
  const invoicesWithoutToken = await prisma.invoice.findMany({
    where: {
      trackingTokenHash: null,
    },
    select: {
      id: true,
      status: true,
    },
  });

  let createdCount = 0;
  for (const inv of invoicesWithoutToken) {
    const rawToken = generateTrackingToken();
    const tokenHash = hashTrackingToken(rawToken);
    const encryptedToken = encryptTrackingToken(rawToken, "v1");

    // Standard retention: 90 days, or 270 days if already PAID
    const days = inv.status === "PAID" ? 270 : 90;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await prisma.invoice.update({
      where: { id: inv.id },
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
      status: true,
      trackingTokenExpiresAt: true,
    },
  });

  let recomputedCount = 0;
  const now = Date.now();

  for (const inv of existingInvoices) {
    const isPaid = inv.status === "PAID";
    const targetDays = isPaid ? 270 : 90;
    const minThresholdDays = isPaid ? 250 : 75; // Tolerance buffer to prevent re-updating on idempotent runs

    const currentExpiryTime = inv.trackingTokenExpiresAt ? inv.trackingTokenExpiresAt.getTime() : 0;
    const thresholdTime = now + minThresholdDays * 24 * 60 * 60 * 1000;

    if (currentExpiryTime < thresholdTime) {
      const newExpiresAt = new Date(now + targetDays * 24 * 60 * 60 * 1000);
      await prisma.invoice.update({
        where: { id: inv.id },
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
}
