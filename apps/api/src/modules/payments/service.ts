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
      clearingDate: (p as unknown as { clearingDate?: Date | null }).clearingDate ?? null,
      clearingDocumentNumber: (p as unknown as { clearingDocumentNumber?: string | null }).clearingDocumentNumber ?? null,
    })),
    meta: paginationMeta(page, pageSize, total),
  };
}

// Doc 14 §14.18 — creates a payment record in AWAITING_SCHEDULE, moved to
// SCHEDULED once a date is confirmed. Simplified here into one call.
export async function schedulePayment(organizationId: string, input: {
  invoiceId: string;
  amount: string | number;
  scheduledDate: string;
  paymentMethod?: string;
}) {
  // Serialize scheduling per invoice and return any existing active payment
  // instead of creating a duplicate on double-submit / retry.
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
      return existingPayment;
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
  details?: { utrNumber?: string; clearingDocumentNumber?: string }
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
    if (current.status !== "SCHEDULED" && current.status !== "AWAITING_SCHEDULE") {
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
    // Return the row to SCHEDULED so it stays retry-eligible, matching the
    // engine's PROCESSING_PAYMENT -> SCHEDULED failure transition.
    await prisma.payment.update({
      where: { id_organizationId: { id: paymentId, organizationId } },
      data: {
        status: "SCHEDULED",
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
  const clearingDate = payoutResult.executedAt || new Date();

  return prisma.$transaction(async (tx) => {
    // Payment confirmed by Gateway Adapter / recorded UTR — execute state advance atomically in this transaction (F5)
    await applyTransition({
      invoiceId: payment.invoiceId,
      organizationId,
      event: "PAYMENT_SUCCESS",
      triggeredBy: userId,
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
        fiscalYear: calculateIndianFiscalYear(clearingDate),
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
        processedAt: clearingDate,
        utrNumber: finalUtr,
        clearingDate,
        clearingDocumentNumber: finalClearingDoc,
      },
    });
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
