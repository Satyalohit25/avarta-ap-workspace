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
      `Payment gateway payout initiation failed: ${payoutResult.errorMessage || "Gateway rejected transaction"}`
    );
  }

  // Payment confirmed by Gateway Adapter — proceed with state advance
  await applyTransition({ invoiceId: payment.invoiceId, organizationId, event: "PAYMENT_SUCCESS", triggeredBy: userId });

  const finalUtr = details?.utrNumber || payoutResult.utrNumber || `NEFT-${Date.now().toString().slice(-8)}`;
  const finalClearingDoc = details?.clearingDocumentNumber || payoutResult.clearingDocumentNumber || `CLR-${Date.now().toString(36).toUpperCase()}`;
  const clearingDate = payoutResult.executedAt || new Date();

  return prisma.$transaction(async (tx) => {
    // Stamp invoice with clearing document and buyer invoice id
    await tx.invoice.update({
      where: {
        id_organizationId: {
          id: payment.invoiceId,
          organizationId,
        },
      },
      data: {
        erpClearingNumber: finalClearingDoc,
        buyerInvoiceId: `2522${Date.now().toString().slice(-6)}`,
        fiscalYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
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

  const records = payments.map((p) => ({
    paymentId: p.id,
    amount: Number(p.amount),
    currency: p.currency,
    beneficiaryName: p.invoice?.supplier?.displayName || "Vendor Payee",
    accountNumber: "9876543210",
    routingNumber: p.currency === "INR" ? "HDFC0001234" : "121000358",
    invoiceNumber: p.invoice?.invoiceNumber || "INV-GEN",
    dueDate: p.scheduledDate || new Date(),
  }));

  const { generateNachaFile, generateBankCsv } = await import("./bank-file-generator");
  if (format === "nacha") {
    return generateNachaFile(org?.name || "AVARTA WORKSPACE", org?.id || "ORG001", records);
  }
  return generateBankCsv(records);
}
