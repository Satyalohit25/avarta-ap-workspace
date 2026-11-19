/**
 * Canonical tracking token lifetime rules:
 * - Active invoices (any status prior to PAID / settlement): 90 days from issuance/creation.
 * - Settled / PAID invoices: 270 days (9 months) total retention for vendor audit and remittance verification.
 *   When an invoice transitions to PAID, its token expiry is extended to paidAt + 270 days (or Date.now() + 270 days).
 */

export const TRACKING_TOKEN_ACTIVE_LIFESPAN_DAYS = 90;
export const TRACKING_TOKEN_PAID_LIFESPAN_DAYS = 270;

export function calculateTrackingExpiry(
  status: string,
  baseDate: Date = new Date()
): Date {
  const isPaid = status.toUpperCase() === "PAID";
  const days = isPaid
    ? TRACKING_TOKEN_PAID_LIFESPAN_DAYS
    : TRACKING_TOKEN_ACTIVE_LIFESPAN_DAYS;

  return new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
}
