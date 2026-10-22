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
  overrideSoloAdmin?: boolean;
  overrideReason?: string;
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
  const {
    organizationId,
    invoiceId,
    invoiceNumber,
    totalAmount,
    userId,
    userRole,
    currency,
    overrideSoloAdmin,
    overrideReason,
  } = params;

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
  // An invoice creator/uploader cannot approve their own invoice unless solo-admin override conditions are met
  if (userId) {
    const creationLog = await tx.auditLog.findFirst({
      where: {
        organizationId,
        entityId: invoiceId,
        action: { in: ["INVOICE_CREATED", "DOCUMENT_UPLOADED"] },
      },
    });

    if (creationLog?.userId && creationLog.userId === userId) {
      if (overrideSoloAdmin) {
        if (userRole !== "ADMINISTRATOR") {
          throw ApiError.forbidden(
            "Only an Administrator can override Segregation of Duties."
          );
        }

        if (!overrideReason || overrideReason.trim().length < 10) {
          throw ApiError.badRequest(
            "A justification reason of at least 10 characters is required to override Segregation of Duties."
          );
        }

        const activeAdminCount = await tx.user.count({
          where: {
            organizationId,
            role: "ADMINISTRATOR",
            status: "ACTIVE",
          },
        });

        if (activeAdminCount > 1) {
          throw ApiError.forbidden(
            `Segregation of Duties override is only permitted for single-administrator organizations (organization has ${activeAdminCount} active administrators).`
          );
        }

        // Write audit log in the same transaction using real columns (beforeData, afterData)
        await tx.auditLog.create({
          data: {
            organizationId,
            userId,
            action: "APPROVAL_SOD_OVERRIDE",
            entityType: "INVOICE",
            entityId: invoiceId,
            beforeData: {
              sodEnforced: true,
              creatorId: creationLog.userId,
            },
            afterData: {
              sodOverridden: true,
              overrideReason: overrideReason.trim(),
              activeAdminCount,
              role: userRole,
            },
            result: "SUCCESS",
          },
        });
      } else {
        throw ApiError.forbidden(
          "Segregation of Duties (SoD) violation: The user who created or uploaded this invoice cannot approve it (AICPA SOC 2 Common Criteria)."
        );
      }
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
  overrideSoloAdmin,
  overrideReason,
}: {
  organizationId: string;
  invoiceId: string;
  userId?: string;
  userRole?: string;
  notes?: string;
  overrideSoloAdmin?: boolean;
  overrideReason?: string;
}) {
  return prisma.$transaction(async (tx) => {
    // Acquire pessimistic row lock on Invoice table with verified casing
    const lockedRows = await tx.$queryRawUnsafe<
      Array<{
        id: string;
        organizationId: string;
        workflowState: string;
        invoiceNumber: string;
        totalAmount: Prisma.Decimal;
        currency: string;
      }>
    >(
      `SELECT "id", "organizationId", "workflowState", "invoiceNumber", "totalAmount", "currency" FROM "Invoice" WHERE "id" = $1 AND "organizationId" = $2 FOR UPDATE`,
      invoiceId,
      organizationId
    );
    if (!lockedRows || lockedRows.length === 0) {
      throw ApiError.notFound("Invoice not found");
    }
    const lockedInvoice = lockedRows[0];
    if (lockedInvoice.workflowState !== "WAITING_APPROVAL") {
      throw ApiError.conflict(
        `Invoice is not waiting for approval (current workflow state: ${lockedInvoice.workflowState})`
      );
    }

    await verifyApprovalAuthority(tx, {
      organizationId,
      invoiceId,
      invoiceNumber: lockedInvoice.invoiceNumber,
      totalAmount: lockedInvoice.totalAmount,
      currency: lockedInvoice.currency,
      userId,
      userRole,
      overrideSoloAdmin,
      overrideReason,
    });

    await applyTransition({
      invoiceId,
      event: "APPROVED",
      triggeredBy: userId,
      reason: notes,
      tx,
    });

    return lockedInvoice;
  });
}

export async function executeInvoiceRejection({
  organizationId,
  invoiceId,
  userId,
  reason,
}: {
  organizationId: string;
  invoiceId: string;
  userId?: string;
  reason?: string;
}) {
  if (!reason || reason.trim().length === 0) {
    throw ApiError.badRequest("A reason is required when rejecting an invoice");
  }

  return prisma.$transaction(async (tx) => {
    // Acquire pessimistic row lock on Invoice table with verified casing
    const lockedRows = await tx.$queryRawUnsafe<
      Array<{
        id: string;
        organizationId: string;
        workflowState: string;
        invoiceNumber: string;
      }>
    >(
      `SELECT "id", "organizationId", "workflowState", "invoiceNumber" FROM "Invoice" WHERE "id" = $1 AND "organizationId" = $2 FOR UPDATE`,
      invoiceId,
      organizationId
    );
    if (!lockedRows || lockedRows.length === 0) {
      throw ApiError.notFound("Invoice not found");
    }
    const lockedInvoice = lockedRows[0];
    if (lockedInvoice.workflowState !== "WAITING_APPROVAL") {
      throw ApiError.conflict(
        `Invoice is not waiting for approval (current workflow state: ${lockedInvoice.workflowState})`
      );
    }

    await applyTransition({
      invoiceId,
      event: "REJECTED",
      triggeredBy: userId,
      reason: reason.trim(),
      tx,
    });

    return lockedInvoice;
  });
}

export async function approveApproval(
  organizationId: string,
  approvalId: string,
  userId?: string,
  userRole?: Role,
  notes?: string,
  overrideSoloAdmin?: boolean,
  overrideReason?: string,
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

  await executeInvoiceApproval({
    organizationId,
    invoiceId: approval.invoiceId,
    userId,
    userRole,
    notes,
    overrideSoloAdmin,
    overrideReason,
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

  await executeInvoiceRejection({
    organizationId,
    invoiceId: approval.invoiceId,
    userId,
    reason,
  });

  return prisma.approval.findUnique({
    where: { id: approvalId },
    include: { invoice: { include: { supplier: true } } },
  });
}
