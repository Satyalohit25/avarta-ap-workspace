import { prisma } from "../../config/database";

/**
 * Hard ceiling for a single export. Keeps a runaway tenant from exhausting
 * memory while still covering realistic SME invoice registers. If a tenant
 * hits this limit the CSV row count is reported back to the caller.
 */
export const MAX_EXPORT_ROWS = 10_000;

export async function findInvoicesForExport(organizationId: string) {
  return prisma.invoice.findMany({
    where: { organizationId },
    include: { supplier: { select: { displayName: true, supplierCode: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: MAX_EXPORT_ROWS,
  });
}

export async function findSuppliersForExport(organizationId: string) {
  return prisma.supplier.findMany({
    where: { organizationId },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: MAX_EXPORT_ROWS,
  });
}

export async function findPaymentsForExport(organizationId: string) {
  return prisma.payment.findMany({
    where: { organizationId },
    include: { invoice: { select: { invoiceNumber: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: MAX_EXPORT_ROWS,
  });
}
