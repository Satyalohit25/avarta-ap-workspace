import { prisma } from "../../config/database";
import { generateTrackingToken, hashTrackingToken, encryptTrackingToken } from "../../lib/crypto";

/**
 * Backfills tracking token hash, encrypted token, and expiration timestamp
 * for any legacy invoices that lack them.
 */
export async function backfillInvoiceTrackingTokens(): Promise<{ updated: number }> {
  // Query invoices that do not have a trackingTokenHash
  const invoices = await prisma.invoice.findMany({
    where: {
      trackingTokenHash: null,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (invoices.length === 0) {
    return { updated: 0 };
  }

  let updatedCount = 0;
  for (const inv of invoices) {
    const rawToken = generateTrackingToken();
    const tokenHash = hashTrackingToken(rawToken);
    const encryptedToken = encryptTrackingToken(rawToken, "v1");

    // If already paid, grant 90-day retention; otherwise standard 30-day window
    const days = inv.status === "PAID" ? 90 : 30;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await prisma.invoice.update({
      where: { id: inv.id },
      data: {
        trackingTokenHash: tokenHash,
        trackingTokenEncrypted: encryptedToken,
        trackingTokenExpiresAt: expiresAt,
      },
    });
    updatedCount++;
  }

  return { updated: updatedCount };
}
