import { prisma } from "../../config/database";
import { ApiError } from "../../lib/errors";
import { parsePagination, paginationMeta } from "../../lib/pagination";
import { applyTransition } from "../../workflow/engine";
import { Role } from "../../middleware/permissions";
import { canRoleApproveAmount, getTierForAmount } from "./thresholds";

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
    ...(params.status
      ? { status: params.status as unknown as never }
      : { status: "PENDING" as unknown as never }),
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
  userRole?: Role,
  notes?: string,
) {
  const approval = await prisma.approval.findFirst({
    where: { id: approvalId },
    include: { invoice: true },
  });
  if (!approval || approval.invoice.organizationId !== organizationId) {
    throw ApiError.notFound("Approval not found");
  }
  if (approval.status !== "PENDING") {
    throw ApiError.conflict(
      `Approval has already been resolved with status "${approval.status}"`,
    );
  }

  // AGENTS.md / Blueprint: Enforce amount approval thresholds by role
  if (userRole) {
    const amount = Number(approval.invoice.totalAmount);
    if (!canRoleApproveAmount(userRole, amount)) {
      const tier = getTierForAmount(amount);
      throw ApiError.forbidden(
        `Role "${userRole}" is not authorized to approve invoices of amount ${amount}. Required roles: ${tier.allowedRoles.join(", ")}`
      );
    }
  }

  // AICPA SOC 2 Common Criteria: Segregation of Duties (SoD)
  // An invoice creator/uploader cannot approve their own invoice
  if (userId) {
    const creationLog = await prisma.auditLog.findFirst({
      where: {
        organizationId,
        entityId: approval.invoiceId,
        action: "INVOICE_CREATED",
      },
    });

    if (creationLog && creationLog.userId && creationLog.userId === userId) {
      throw ApiError.forbidden(
        "Segregation of Duties (SoD) violation: The user who created or uploaded this invoice cannot approve it (AICPA SOC 2 Common Criteria)."
      );
    }
  }

  // AGENTS.md Rule 1 & Rule 6: Open exceptions must be resolved before financial approval
  const openException = await prisma.exception.findFirst({
    where: {
      invoiceId: approval.invoiceId,
      status: { in: ["OPEN", "ASSIGNED", "UNDER_REVIEW"] },
    },
  });
  if (openException) {
    throw ApiError.conflict(
      `Cannot approve invoice ${approval.invoice.invoiceNumber}: Invoice has an unresolved blocking exception "${openException.type}". Exceptions must be resolved before financial approval.`
    );
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
  reason?: string,
) {
  const approval = await prisma.approval.findFirst({
    where: { id: approvalId },
    include: { invoice: true },
  });
  if (!approval || approval.invoice.organizationId !== organizationId) {
    throw ApiError.notFound("Approval not found");
  }
  if (approval.status !== "PENDING") {
    throw ApiError.conflict(
      `Approval has already been resolved with status "${approval.status}"`,
    );
  }
  if (!reason || reason.trim().length === 0) {
    throw ApiError.badRequest(
      "A reason is required when rejecting an approval",
    );
  }

  await applyTransition({
    invoiceId: approval.invoiceId,
    event: "REJECTED",
    triggeredBy: userId,
    reason: reason.trim(),
  });

  return prisma.approval.findUnique({
    where: { id: approvalId },
    include: { invoice: { include: { supplier: true } } },
  });
}
