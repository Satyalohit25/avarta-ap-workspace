import { prisma } from "../../config/database";
import { ApiError } from "../../lib/errors";
import { applyTransition } from "../../workflow/engine";
import { CsvErpAdapter, ErpAdapter, JournalEntry, ErpSyncResult } from "./adapter";

const defaultAdapter: ErpAdapter = new CsvErpAdapter();

export function buildJournalEntry(invoice: {
  id: string;
  invoiceNumber: string;
  currency: string;
  subtotalAmount?: unknown;
  taxAmount?: unknown;
  totalAmount: unknown;
  supplier?: { displayName?: string; legalName?: string } | null;
}): JournalEntry {
  const total = Number(invoice.totalAmount);
  const tax = Number(invoice.taxAmount ?? 0);
  const subtotal = total - tax;
  const vendorName = invoice.supplier?.displayName || invoice.supplier?.legalName || "Verified AP Supplier";
  const postingDate = new Date().toISOString().split("T")[0];
  const entryNumber = `JE-AVARTA-${Date.now().toString().slice(-6)}`;

  return {
    entryNumber,
    postingDate,
    reference: `INV-${invoice.invoiceNumber}`,
    currency: invoice.currency,
    lines: [
      {
        accountCode: "500000",
        accountName: "Operating Expenses / Cost of Goods",
        debit: subtotal,
        credit: 0,
        description: `Expense booking for invoice ${invoice.invoiceNumber}`,
      },
      ...(tax > 0
        ? [
            {
              accountCode: "140000",
              accountName: "Input GST / Tax Credit Receivable",
              debit: tax,
              credit: 0,
              description: `Input statutory tax credit for invoice ${invoice.invoiceNumber}`,
            },
          ]
        : []),
      {
        accountCode: "200000",
        accountName: `Accounts Payable - ${vendorName}`,
        debit: 0,
        credit: total,
        description: `Vendor liability for invoice ${invoice.invoiceNumber}`,
      },
    ],
  };
}

export async function syncInvoiceWithErp(params: {
  organizationId: string;
  invoiceId: string;
  userId?: string;
  targetErp?: string;
}): Promise<{ syncResult: ErpSyncResult; invoiceNumber: string; clearingDocNumber: string }> {
  const { organizationId, invoiceId, userId, targetErp } = params;

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    include: { supplier: true },
  });

  if (!invoice) throw ApiError.notFound("Invoice not found");

  const entry = buildJournalEntry(invoice);
  const syncResult = await defaultAdapter.exportJournalEntry(entry);

  const clearingDocNumber = entry.entryNumber;

  // Stamping clearing document reference onto invoice
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      erpClearingNumber: clearingDocNumber,
      fiscalYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    },
  });

  await applyTransition({
    invoiceId,
    event: "ERP_SUCCESS",
    triggeredBy: userId,
    reason: `Posted double-entry ledger journal ${entry.entryNumber} via ${targetErp || defaultAdapter.name}`,
  });

  return {
    syncResult,
    invoiceNumber: invoice.invoiceNumber,
    clearingDocNumber,
  };
}
