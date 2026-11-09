import { prisma } from "../../config/database";
import {
  findInvoicesForExport,
  findPaymentsForExport,
  findSuppliersForExport,
  MAX_EXPORT_ROWS,
} from "./repository";

export type ExportDataset = "invoices" | "suppliers" | "payments";

export interface ExportResult {
  dataset: ExportDataset;
  filename: string;
  csv: string;
  rowCount: number;
  truncated: boolean;
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text: string;
  if (value instanceof Date) text = value.toISOString();
  else if (typeof value === "object" && "toString" in value) text = String(value);
  else text = String(value);

  // Neutralise spreadsheet formula injection (=, +, -, @ leading) while
  // still exporting readable values.
  if (/^[=+\-@]/.test(text)) text = `'${text}`;

  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  // BOM keeps Excel from mangling UTF-8 invoice/vendor names.
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

function isoDate(value: Date | null | undefined): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

export async function exportDataset(
  organizationId: string,
  userId: string,
  dataset: ExportDataset
): Promise<ExportResult> {
  let csv: string;
  let rowCount: number;

  if (dataset === "invoices") {
    const invoices = await findInvoicesForExport(organizationId);
    rowCount = invoices.length;
    csv = toCsv(
      [
        "invoiceNumber",
        "supplierCode",
        "supplierName",
        "invoiceDate",
        "dueDate",
        "currency",
        "subtotalAmount",
        "taxAmount",
        "totalAmount",
        "paidAmount",
        "status",
        "workflowState",
        "source",
      ],
      invoices.map((invoice) => [
        invoice.invoiceNumber,
        invoice.supplier?.supplierCode ?? "",
        invoice.supplier?.displayName ?? "",
        isoDate(invoice.invoiceDate),
        isoDate(invoice.dueDate),
        invoice.currency,
        invoice.subtotalAmount.toString(),
        invoice.taxAmount.toString(),
        invoice.totalAmount.toString(),
        invoice.paidAmount.toString(),
        invoice.status,
        invoice.workflowState,
        invoice.source,
      ])
    );
  } else if (dataset === "suppliers") {
    const suppliers = await findSuppliersForExport(organizationId);
    rowCount = suppliers.length;
    csv = toCsv(
      [
        "supplierCode",
        "legalName",
        "displayName",
        "gstNumber",
        "country",
        "currency",
        "paymentTermsDays",
        "status",
        "email",
        "phone",
        "bankName",
        "accountNumberLast4",
        "ifscCode",
        "beneficiaryName",
        "outstandingBalance",
      ],
      suppliers.map((supplier) => [
        supplier.supplierCode,
        supplier.legalName,
        supplier.displayName,
        supplier.gstNumber ?? "",
        supplier.country,
        supplier.currency,
        supplier.paymentTermsDays,
        supplier.status,
        supplier.email ?? "",
        supplier.phone ?? "",
        supplier.bankName ?? "",
        supplier.accountNumberLast4 ?? "",
        supplier.ifscCode ?? "",
        supplier.beneficiaryName ?? "",
        supplier.outstandingBalance.toString(),
      ])
    );
  } else {
    const payments = await findPaymentsForExport(organizationId);
    rowCount = payments.length;
    csv = toCsv(
      [
        "paymentReference",
        "invoiceNumber",
        "utrNumber",
        "amount",
        "currency",
        "paymentMethod",
        "status",
        "scheduledDate",
        "processedAt",
        "settlementDate",
        "beneficiaryName",
        "beneficiaryAccountNumberLast4",
        "beneficiaryIfsc",
        "failureReason",
      ],
      payments.map((payment) => [
        payment.paymentReference ?? "",
        payment.invoice?.invoiceNumber ?? "",
        payment.utrNumber ?? "",
        payment.amount.toString(),
        payment.currency,
        payment.paymentMethod,
        payment.status,
        isoDate(payment.scheduledDate),
        isoDate(payment.processedAt),
        isoDate(payment.settlementDate),
        payment.beneficiaryName ?? "",
        payment.beneficiaryAccountNumberLast4 ?? "",
        payment.beneficiaryIfsc ?? "",
        payment.failureReason ?? "",
      ])
    );
  }

  // Exporting financial records is an auditable action.
  await prisma.auditLog.create({
    data: {
      organizationId,
      userId,
      action: "WORKSPACE_DATA_EXPORTED",
      entityType: "data_export",
      entityId: dataset,
      afterData: { dataset, rowCount },
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  return {
    dataset,
    filename: `avarta-${dataset}-${today}.csv`,
    csv,
    rowCount,
    truncated: rowCount >= MAX_EXPORT_ROWS,
  };
}
