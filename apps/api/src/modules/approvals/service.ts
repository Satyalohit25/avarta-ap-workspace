import { Prisma } from "@prisma/client";
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

export interface VerifyApprovalAuthorityParams {
  organizationId: string;
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number | Prisma.Decimal;
  currency?: string;
  userId?: string;
  userRole?: string;
}

/**
 * Shared approval authority enforcement (ACT-P0-J / Day 1).
 * Note: Keeps existing hardcoded tiers for Day 1 as specified; DB-backed tiers land in Phase 2A.
 * Enforces amount thresholds, Segregation of Duties (creator !== approver),
 * and unresolved blocking exceptions inside the caller's transaction.
 */
export async function verifyApprovalAuthority(
  tx: Prisma.TransactionClient,
  params: VerifyApprovalAuthorityParams
) {
  const { organizationId, invoiceId, invoiceNumber, totalAmount, userId, userRole, currency } = params;

  // 1. Enforce amount approval thresholds by role
  if (userRole) {
    const amountNum = Number(totalAmount);
    if (!canRoleApproveAmount(userRole as Role, amountNum)) {
      const tier = getTierForAmount(amountNum, currency || "INR");
      throw ApiError.forbidden(
        `Role "${userRole}" is not authorized to approve invoices of amount ${amountNum}. Required roles: ${tier.allowedRoles.join(", ")}`
      );
    }
  }

  // 2. AICPA SOC 2 Common Criteria: Segregation of Duties (SoD)
  // An invoice creator/uploader cannot approve their own invoice
  if (userId) {
    const creationLog = await tx.auditLog.findFirst({
      where: {
        organizationId,
        entityId: invoiceId,
        action: { in: ["INVOICE_CREATED", "DOCUMENT_UPLOADED"] },
      },
    });

    if (creationLog?.userId && creationLog.userId === userId) {
      throw ApiError.forbidden(
        "Segregation of Duties (SoD) violation: The user who created or uploaded this invoice cannot approve it (AICPA SOC 2 Common Criteria)."
      );
    }
  }

  // 3. AGENTS.md Rule 1 & Rule 6: Open exceptions must be resolved before financial approval
  const openException = await tx.exception.findFirst({
    where: {
      invoiceId,
      status: { in: ["OPEN", "ASSIGNED", "UNDER_REVIEW"] },
    },
  });
  if (openException) {
    throw ApiError.conflict(
      `Cannot approve invoice ${invoiceNumber}: Invoice has an unresolved blocking exception "${openException.type}". Exceptions must be resolved before financial approval.`
    );
  }
}

/**
 * Executes an invoice approval transactionally, unifying /approvals/:id/approve and /invoices/:id/transitions (APPROVE)
 */
export async function executeInvoiceApproval({
  organizationId,
  invoiceId,
  userId,
  userRole,
  notes,
}: {
  organizationId: string;
  invoiceId: string;
  userId?: string;
  userRole?: string;
  notes?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, organizationId },
    });
    if (!invoice) throw ApiError.notFound("Invoice not found");

    await verifyApprovalAuthority(tx, {
      organizationId,
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      currency: invoice.currency,
      userId,
      userRole,
    });

    await applyTransition({
      invoiceId,
      event: "APPROVED",
      triggeredBy: userId,
      reason: notes,
      tx,
    });

    return invoice;
  });
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

  await prisma.$transaction(async (tx) => {
    await verifyApprovalAuthority(tx, {
      organizationId,
      invoiceId: approval.invoiceId,
      invoiceNumber: approval.invoice.invoiceNumber,
      totalAmount: approval.invoice.totalAmount,
      currency: approval.invoice.currency,
      userId,
      userRole,
    });

    await applyTransition({
      invoiceId: approval.invoiceId,
      event: "APPROVED",
      triggeredBy: userId,
      reason: notes,
      tx,
    });
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
