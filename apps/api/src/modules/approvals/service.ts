import { prisma } from "../../config/database";
import { ApiError } from "../../lib/errors";
import { parsePagination, paginationMeta } from "../../lib/pagination";
import { applyTransition } from "../../workflow/engine";

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

export async function approveApproval(
  organizationId: string,
  approvalId: string,
  userId?: string,
  notes?: string
) {
  const approval = await prisma.approval.findFirst({
    where: { id: approvalId },
    include: { invoice: true },
  });
  if (!approval || approval.invoice.organizationId !== organizationId) {
    throw ApiError.notFound("Approval not found");
  }

  // AGENTS.md rule 4: applyTransition changes workflow_instances.current_state and invoices.status
  await applyTransition({
    invoiceId: approval.invoiceId,
    event: "APPROVED",
    triggeredBy: userId,
    reason: notes,
  });

  return prisma.approval.findUnique({
    where: { id: approvalId },
    include: { invoice: { include: { supplier: true } } },
  });
}

export async function rejectApproval(
  organizationId: string,
  approvalId: string,
  userId?: string,
  reason?: string
) {
  const approval = await prisma.approval.findFirst({
    where: { id: approvalId },
    include: { invoice: true },
  });
  if (!approval || approval.invoice.organizationId !== organizationId) {
    throw ApiError.notFound("Approval not found");
  }

  await applyTransition({
    invoiceId: approval.invoiceId,
    event: "REJECTED",
    triggeredBy: userId,
    reason,
  });

  return prisma.approval.findUnique({
    where: { id: approvalId },
    include: { invoice: { include: { supplier: true } } },
  });
}

