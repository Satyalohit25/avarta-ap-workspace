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
export async function executePayment(organizationId: string, paymentId: string, userId?: string) {
  const payment = await prisma.payment.findFirst({ where: { id: paymentId, organizationId } });
  if (!payment) throw ApiError.notFound("Payment not found");

  await applyTransition({ invoiceId: payment.invoiceId, event: "PAYMENT_RUN", triggeredBy: userId });

  // Mock external payment provider — always succeeds in this slice.
  await applyTransition({ invoiceId: payment.invoiceId, event: "PAYMENT_SUCCESS", triggeredBy: userId });

  return prisma.payment.update({
    where: { id: paymentId },
    data: { status: "PAID", processedAt: new Date() },
  });
}
