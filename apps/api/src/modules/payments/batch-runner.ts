import { prisma } from "../../config/database";
import { executePayment } from "./service";

export interface RunBatchPaymentsInput {
  organizationId: string;
  userId?: string;
  paymentIds?: string[];
  cutoffDate?: Date;
}

export interface BatchPaymentResultItem {
  paymentId: string;
  invoiceId: string;
  amount: number;
  status: "SUCCESS" | "FAILED";
  utrNumber?: string;
  error?: string;
}

export interface RunBatchPaymentsResult {
  totalProcessed: number;
  succeeded: number;
  failed: number;
  items: BatchPaymentResultItem[];
}

/**
 * Runs a batch of scheduled payments.
 * AGENTS.md Rule 5: Batch processing requires idempotency key at the route level.
 * Executes each payment individually through the workflow engine.
 */
export async function runBatchPayments(input: RunBatchPaymentsInput): Promise<RunBatchPaymentsResult> {
  const { organizationId, userId, paymentIds, cutoffDate } = input;

  const whereClause: Record<string, unknown> = {
    organizationId,
    status: { in: ["SCHEDULED", "AWAITING_SCHEDULE"] },
  };

  if (paymentIds && paymentIds.length > 0) {
    whereClause.id = { in: paymentIds };
  } else if (cutoffDate) {
    whereClause.scheduledDate = { lte: cutoffDate };
  } else {
    // Default to scheduled payments due on or before today
    whereClause.scheduledDate = { lte: new Date() };
  }

  const payments = await prisma.payment.findMany({
    where: whereClause,
    orderBy: { scheduledDate: "asc" },
  });

  const results: BatchPaymentResultItem[] = [];
  let succeeded = 0;
  let failed = 0;

  for (const payment of payments) {
    try {
      const executed = await executePayment(organizationId, payment.id, userId);
      results.push({
        paymentId: payment.id,
        invoiceId: payment.invoiceId,
        amount: Number(payment.amount),
        status: "SUCCESS",
        utrNumber: (executed as unknown as { utrNumber?: string }).utrNumber,
      });
      succeeded++;
    } catch (err: unknown) {
      results.push({
        paymentId: payment.id,
        invoiceId: payment.invoiceId,
        amount: Number(payment.amount),
        status: "FAILED",
        error: err instanceof Error ? err.message : String(err),
      });
      failed++;
    }
  }

  return {
    totalProcessed: payments.length,
    succeeded,
    failed,
    items: results,
  };
}
