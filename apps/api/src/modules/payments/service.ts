import { prisma } from "../../config/database";
import { ApiError } from "../../lib/errors";
import { parsePagination, paginationMeta } from "../../lib/pagination";
import { applyTransition } from "../../workflow/engine";

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
  const invoice = await prisma.invoice.findFirst({ where: { id: input.invoiceId, organizationId } });
  if (!invoice) throw ApiError.notFound("Invoice not found");
  if (invoice.status !== "SCHEDULED" && invoice.workflowState !== "SCHEDULED") {
    throw ApiError.conflict("Invoice must be approved before payment can be scheduled.");
  }

  const payment = await prisma.payment.create({
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

  return payment;
}

// Doc 14 §14.18 execute — runs the SCHEDULED -> PROCESSING_PAYMENT ->
// PAID/FAILED engine transitions and updates the payment row to match.
export async function executePayment(
  organizationId: string,
  paymentId: string,
  userId?: string,
  details?: { utrNumber?: string; clearingDocumentNumber?: string }
) {
  const payment = await prisma.payment.findFirst({ where: { id: paymentId, organizationId } });
  if (!payment) throw ApiError.notFound("Payment not found");

  await applyTransition({ invoiceId: payment.invoiceId, event: "PAYMENT_RUN", triggeredBy: userId });

  // Mock external payment provider — always succeeds in this slice.
  await applyTransition({ invoiceId: payment.invoiceId, event: "PAYMENT_SUCCESS", triggeredBy: userId });

  const generatedUtr = details?.utrNumber || `NEFT-AVARTA-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
  const clearingDoc = details?.clearingDocumentNumber || `2533${Math.floor(100000 + Math.random() * 900000)}`;
  const clearingDate = new Date();

  // Also stamp invoice with clearing document and buyer invoice id per Tata Chemicals standard
  await prisma.invoice.update({
    where: { id: payment.invoiceId },
    data: {
      erpClearingNumber: clearingDoc,
      buyerInvoiceId: `2522${Math.floor(100000 + Math.random() * 900000)}`,
      fiscalYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    },
  });

  return prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: "PAID",
      processedAt: clearingDate,
      utrNumber: generatedUtr,
      clearingDate,
      clearingDocumentNumber: clearingDoc,
    },
  });
}
