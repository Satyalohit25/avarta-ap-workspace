import { prisma } from "../../config/database";
import { ApiError } from "../../lib/errors";
import { parsePagination, paginationMeta } from "../../lib/pagination";
import { applyTransition } from "../../workflow/engine";
import type { PaymentGatewayProvider, PaymentGatewayConfig } from "./adapter";

export async function listPayments(params: {
  organizationId: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const { page, pageSize } = parsePagination(params);
  const where = {
    organizationId: params.organizationId,
    ...(params.status ? { status: params.status as unknown as never } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: { invoice: { include: { supplier: true } } },
      orderBy: { scheduledDate: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    data: rows.map((p) => ({
      id: p.id,
      invoiceId: p.invoiceId,
      invoiceNumber: p.invoice.invoiceNumber,
      vendor: p.invoice.supplier?.displayName ?? "Unknown",
      amount: p.amount.toString(),
      currency: p.currency,
      dueDate: p.scheduledDate,
      status: p.status,
      method: p.paymentMethod,
      utrNumber: (p as unknown as { utrNumber?: string | null }).utrNumber ?? null,
      settlementDate: (p as unknown as { settlementDate?: Date | null }).settlementDate ?? null,
      clearingDocumentNumber: (p as unknown as { clearingDocumentNumber?: string | null }).clearingDocumentNumber ?? null,
    })),
    meta: paginationMeta(page, pageSize, total),
  };
}

// Doc 14 §14.18 — creates a payment record in AWAITING_SCHEDULE, moved to
// SCHEDULED once a date is confirmed.
// If an active payment already exists (AWAITING_SCHEDULE, SCHEDULED, or PROCESSING),
// updating the schedule date is allowed, while a duplicate create is prevented (returning 409).
export async function schedulePayment(organizationId: string, input: {
  invoiceId: string;
  amount: string | number;
  scheduledDate: string;
  paymentMethod?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const lockedRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Invoice"
      WHERE "id" = ${input.invoiceId} AND "organizationId" = ${organizationId}
      FOR UPDATE
    `;
    if (!lockedRows || lockedRows.length === 0) {
      throw ApiError.notFound("Invoice not found");
    }

    const invoice = await tx.invoice.findFirst({
      where: { id: input.invoiceId, organizationId },
    });
    if (!invoice) throw ApiError.notFound("Invoice not found");
    if (invoice.status !== "SCHEDULED" && invoice.workflowState !== "SCHEDULED") {
      throw ApiError.conflict("Invoice must be approved before payment can be scheduled.");
    }

    const existingPayment = await tx.payment.findFirst({
      where: {
        organizationId,
        invoiceId: input.invoiceId,
        status: { in: ["AWAITING_SCHEDULE", "SCHEDULED", "PROCESSING"] },
      },
    });

    if (existingPayment) {
      // If payment is already in SCHEDULED or AWAITING_SCHEDULE, update the scheduledDate
      if (existingPayment.status === "SCHEDULED" || existingPayment.status === "AWAITING_SCHEDULE") {
        return tx.payment.update({
          where: { id_organizationId: { id: existingPayment.id, organizationId } },
          data: {
            scheduledDate: new Date(input.scheduledDate),
            paymentMethod: input.paymentMethod ?? existingPayment.paymentMethod,
            status: "SCHEDULED",
          },
        });
      }
      throw ApiError.conflict("An active payment already exists for this invoice.");
    }

    // Check if there is already a PAID payment
    const paidPayment = await tx.payment.findFirst({
      where: {
        organizationId,
        invoiceId: input.invoiceId,
        status: "PAID",
      },
    });
    if (paidPayment) {
      throw ApiError.conflict("Invoice has already been paid.");
    }

    return tx.payment.create({
      data: {
        organizationId,
        invoiceId: input.invoiceId,
        amount: input.amount,
        currency: invoice.currency,
        paymentMethod: input.paymentMethod ?? "BANK_TRANSFER",
        scheduledDate: new Date(input.scheduledDate),
        status: "SCHEDULED",
      },
    });
  });
}

export function calculateIndianFiscalYear(date: Date = new Date()): string {
  const month = date.getMonth(); // 0 = Jan, 3 = Apr
  const year = date.getFullYear();
  const startYear = month >= 3 ? year : year - 1;
  const endYearShort = String((startYear + 1) % 100).padStart(2, "0");
  return `FY${startYear}-${endYearShort}`;
}

// Doc 14 §14.18 execute — runs the SCHEDULED -> PROCESSING_PAYMENT ->
// PAID/FAILED engine transitions and updates the payment row to match.
export async function executePayment(
  organizationId: string,
  paymentId: string,
  userId?: string,
  details?: { utrNumber?: string; settlementDate?: string | Date; clearingDocumentNumber?: string }
) {
  // Claim the payment under a row lock before touching the gateway. Without
  // this, two concurrent requests can both read SCHEDULED and both pay out.
  const payment = await prisma.$transaction(async (tx) => {
    const lockedRows = await tx.$queryRaw<Array<{ id: string; status: string }>>`
      SELECT "id", "status" FROM "Payment"
      WHERE "id" = ${paymentId} AND "organizationId" = ${organizationId}
      FOR UPDATE
    `;
    if (!lockedRows || lockedRows.length === 0) {
      throw ApiError.notFound("Payment not found");
    }

    const current = await tx.payment.findFirst({
      where: { id: paymentId, organizationId },
      include: { invoice: { include: { supplier: true } } },
    });
    if (!current) throw ApiError.notFound("Payment not found");

    if (current.status === "PAID") {
      throw ApiError.conflict("Payment has already been executed and is marked as PAID.");
    }
    // Allow retrying FAILED payments alongside SCHEDULED and AWAITING_SCHEDULE
    if (current.status !== "SCHEDULED" && current.status !== "AWAITING_SCHEDULE" && current.status !== "FAILED") {
      throw ApiError.conflict(`Payment cannot be executed from status "${current.status}"`);
    }

    // Doc 24 C8-7 / Doc 06 §4.2: Segregation of Duties (SoD)
    // The person who edited a supplier's bank details cannot release that supplier's payment.
    if (userId && current.invoice?.supplierId) {
      const bankChangeAudit = await tx.auditLog.findFirst({
        where: {
          organizationId,
          userId,
          entityType: { in: ["SUPPLIER", "BANK_ACCOUNT", "SUPPLIER_BANK_ACCOUNT"] },
          action: { in: ["UPDATE_BANK_ACCOUNT", "CHANGE_BANK_DETAILS", "SUPPLIER_BANK_EDITED"] },
          entityId: current.invoice.supplierId,
        },
      });

      if (bankChangeAudit) {
        throw ApiError.forbidden(
          "Segregation of Duties (SoD) violation: The user who edited this supplier's bank details cannot release payment to this supplier (Doc 24 C8-7)."
        );
      }
    }

    // Claim the row + advance the workflow in the same transaction. The
    // engine rejects a second PAYMENT_RUN once the invoice is PROCESSING_PAYMENT.
    await tx.payment.update({
      where: { id_organizationId: { id: paymentId, organizationId } },
      data: { status: "PROCESSING" },
    });
    await applyTransition({
      invoiceId: current.invoiceId,
      organizationId,
      event: "PAYMENT_RUN",
      triggeredBy: userId,
      tx,
    });

    return current;
  });

  // Resolve tenant's configured Payment Gateway (BYOPG)
  const { IntegrationRepository } = await import("../integrations/repository");
  const { decryptSecret } = await import("../../lib/crypto");
  const { getPaymentGatewayAdapter } = await import("./adapter");

  const pgRecords = await IntegrationRepository.findByType(organizationId, "PAYMENT_GATEWAY");
  const activePg = pgRecords.find((r) => r.status === "CONNECTED") || pgRecords[0];

  let config: Record<string, unknown> = {
    provider: activePg?.provider || "MANUAL_BANK_TRANSFER",
  };

  if (activePg?.encryptedConfig) {
    try {
      const decrypted = JSON.parse(decryptSecret(activePg.encryptedConfig));
      config = { ...config, ...decrypted };
    } catch {
      // Configuration fallback
    }
  }

  const adapter = getPaymentGatewayAdapter(config.provider as PaymentGatewayProvider);
  const payoutResult = await adapter.initiatePayout(config as unknown as PaymentGatewayConfig, {
    paymentId: payment.id,
    amount: Number(payment.amount),
    currency: payment.currency,
    beneficiaryName: payment.invoice?.supplier?.displayName || "Vendor Payee",
    utrNumber: details?.utrNumber,
    clearingDocumentNumber: details?.clearingDocumentNumber,
  });

  if (!payoutResult.success) {
    await applyTransition({ invoiceId: payment.invoiceId, organizationId, event: "PAYMENT_FAILURE", triggeredBy: userId });
    // Keep row in FAILED status with failureReason so it is distinguishable,
    // and can be retried either directly or via retryPayment.
    await prisma.payment.update({
      where: { id_organizationId: { id: paymentId, organizationId } },
      data: {
        status: "FAILED",
        failureReason: payoutResult.errorMessage || "Gateway rejected transaction",
      },
    });
    throw ApiError.badRequest(
      `Payment execution failed: ${payoutResult.errorMessage || "Gateway rejected transaction"}`
    );
  }

  const finalUtr = details?.utrNumber?.trim() || payoutResult.utrNumber?.trim();
  if (!finalUtr) {
    throw ApiError.badRequest(
      "Bank UTR or settlement transaction reference number is required to confirm payment."
    );
  }
  const finalClearingDoc = details?.clearingDocumentNumber?.trim() || payoutResult.clearingDocumentNumber?.trim() || null;
  const settlementDate = details?.settlementDate ? new Date(details.settlementDate) : (payoutResult.executedAt || new Date());

  return prisma.$transaction(async (tx) => {
    // Payment confirmed by Gateway Adapter / recorded UTR — execute state advance atomically in this transaction (F5)
    await applyTransition({
      invoiceId: payment.invoiceId,
      organizationId,
      event: "PAYMENT_SUCCESS",
      triggeredBy: userId,
      utrNumber: finalUtr,
      settlementDate,
      tx,
    });

    // Stamp invoice with clearing document and legitimate Indian fiscal year (F4)
    await tx.invoice.update({
      where: {
        id_organizationId: {
          id: payment.invoiceId,
          organizationId,
        },
      },
      data: {
        erpClearingNumber: finalClearingDoc,
        fiscalYear: calculateIndianFiscalYear(settlementDate),
      },
    });

    return tx.payment.update({
      where: {
        id_organizationId: {
          id: paymentId,
          organizationId,
        },
      },
      data: {
        status: "PAID",
        processedAt: settlementDate,
        utrNumber: finalUtr,
        settlementDate,
        clearingDocumentNumber: finalClearingDoc,
      },
    });
  });
}

// Allows retrying a FAILED payment by resetting it to SCHEDULED with an audit log entry
export async function retryPayment(
  organizationId: string,
  paymentId: string,
  userId?: string
) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { id: paymentId, organizationId },
    });
    if (!payment) {
      throw ApiError.notFound("Payment not found");
    }
    if (payment.status !== "FAILED") {
      throw ApiError.badRequest(`Only FAILED payments can be retried. Current status is ${payment.status}.`);
    }

    const updated = await tx.payment.update({
      where: { id_organizationId: { id: paymentId, organizationId } },
      data: {
        status: "SCHEDULED",
        failureReason: null,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId,
        userId: userId ?? null,
        action: "PAYMENT_RETRY_SCHEDULED",
        entityType: "payment",
        entityId: paymentId,
        beforeData: { status: "FAILED", failureReason: payment.failureReason },
        afterData: { status: "SCHEDULED" },
      },
    });

    return updated;
  });
}

export async function generateBankExportFile(
  organizationId: string,
  format: "nacha" | "csv",
  paymentIds?: string[]
) {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  const whereClause: Record<string, unknown> = {
    organizationId,
    status: { in: ["SCHEDULED", "AWAITING_SCHEDULE", "PROCESSING"] },
  };
  if (paymentIds && paymentIds.length > 0) {
    whereClause.id = { in: paymentIds };
  }

  const payments = await prisma.payment.findMany({
    where: whereClause,
    include: { invoice: { include: { supplier: true } } },
    orderBy: { scheduledDate: "asc" },
  });

  if (payments.length === 0) {
    throw ApiError.badRequest("No payments found eligible for bank export.");
  }

  const { decryptSecret } = await import("../../lib/crypto");

  const supplierIds = Array.from(
    new Set(payments.map((p) => p.invoice?.supplierId).filter(Boolean))
  ) as string[];

  const bankAccounts = await prisma.bankAccount.findMany({
    where: {
      organizationId,
      supplierId: { in: supplierIds },
    },
  });

  const records = payments.map((p) => {
    const supplier = p.invoice?.supplier;
    const supplierName = supplier?.displayName || p.invoice?.supplierId || "Unknown Vendor";

    if (!supplier?.id) {
      throw ApiError.badRequest(
        `Cannot export bank file: Payment for invoice ${p.invoice?.invoiceNumber || p.id} has no associated supplier.`
      );
    }

    const supplierAccounts = bankAccounts.filter((ba) => ba.supplierId === supplier.id);
    const verifiedAccount =
      supplierAccounts.find((ba) => ba.isPrimary && ba.status === "VERIFIED") ||
      supplierAccounts.find((ba) => ba.status === "VERIFIED");

    if (!verifiedAccount) {
      throw ApiError.badRequest(
        `Cannot export bank file: Supplier '${supplierName}' has no verified bank account.`
      );
    }

    let accountNumber: string;
    try {
      accountNumber = decryptSecret(verifiedAccount.encryptedAccountNumber);
    } catch {
      throw ApiError.badRequest(
        `Cannot export bank file: Failed to decrypt bank account for supplier '${supplierName}'.`
      );
    }

    return {
      paymentId: p.id,
      amount: Number(p.amount),
      currency: p.currency,
      beneficiaryName: supplier.displayName,
      accountNumber,
      routingNumber: verifiedAccount.ifscSwift,
      invoiceNumber: p.invoice?.invoiceNumber || "INV-GEN",
      dueDate: p.scheduledDate || new Date(),
    };
  });

  const { generateNachaFile, generateBankCsv } = await import("./bank-file-generator");
  if (format === "nacha") {
    return generateNachaFile(org?.name || "AVARTA WORKSPACE", org?.id || "ORG001", records);
  }
  return generateBankCsv(records);
}
