import { prisma } from "../../config/database";
import { parsePagination, paginationMeta } from "../../lib/pagination";

export async function listApprovals(params: {
  organizationId: string;
  approverId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const { page, pageSize } = parsePagination(params);
  const where = {
    invoice: { organizationId: params.organizationId },
    ...(params.approverId ? { approverId: params.approverId } : {}),
    ...(params.status ? { status: params.status as unknown as never } : { status: "PENDING" as unknown as never }),
  };

  const [rows, total] = await Promise.all([
    prisma.approval.findMany({
      where,
      include: { invoice: { include: { supplier: true } } },
      orderBy: { requestedAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.approval.count({ where }),
  ]);

  return {
    data: rows.map((a) => ({
      id: a.id,
      invoiceId: a.invoiceId,
      invoiceNumber: a.invoice.invoiceNumber,
      vendor: a.invoice.supplier?.displayName ?? "Unknown",
      amount: a.invoice.totalAmount.toString(),
      currency: a.invoice.currency,
      dueDate: a.invoice.dueDate,
      status: a.status,
      requestedAt: a.requestedAt,
    })),
    meta: paginationMeta(page, pageSize, total),
  };
}
