import { useMemo, useState } from "react";
import {
  X,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Download,
  Database,
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "../../../components/ui/Button";
import { Alert } from "../../../components/ui/Alert";
import { createInvoice, listInvoices } from "../../../api/invoices";
import { ApiRequestError } from "../../../api/client";

interface ImportWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

type Step = "source" | "preview" | "progress" | "summary";

interface PreviewItem {
  rowNumber: number;
  invoiceNumber: string;
  vendorName: string;
  date: string;
  amount: number;
  currency: string;
  isDuplicate: boolean;
  error?: string;
}

const TEMPLATE_CSV = [
  "invoiceNumber,vendorName,date,amount,currency",
  "INV-1001,Acme Supplies Pvt Ltd,2026-11-01,12500.00,INR",
  "INV-1002,Northwind Traders,2026-11-02,43250.50,INR",
].join("\n");

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function normalizeHeader(value: string): string {
  return value.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

const HEADER_ALIASES: Record<string, string[]> = {
  invoiceNumber: ["invoicenumber", "invoiceno", "invoice", "number", "billno", "documentnumber"],
  vendorName: ["vendorname", "vendor", "supplier", "suppliername", "party", "partyname"],
  date: ["date", "invoicedate", "billdate", "documentdate"],
  amount: ["amount", "total", "totalamount", "invoiceamount", "grandtotal"],
  currency: ["currency", "ccy", "currencycode"],
};

function findColumn(headers: string[], field: keyof typeof HEADER_ALIASES): number {
  const aliases = HEADER_ALIASES[field];
  return headers.findIndex((header) => aliases.includes(normalizeHeader(header)));
}

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[₹$€£,\s]/g, "").replace(/[^\d.-]/g, "");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : NaN;
}

function parseDate(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) return value;

  const dmy = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(value);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = dmy[3];
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

export function ImportWizardModal({ isOpen, onClose, onImportComplete }: ImportWizardModalProps) {
  const [step, setStep] = useState<Step>("source");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [duplicateCheckWarning, setDuplicateCheckWarning] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState<{ imported: number; skipped: number; failed: number }>({
    imported: 0,
    skipped: 0,
    failed: 0,
  });

  const importableItems = useMemo(
    () => previewItems.filter((item) => !item.isDuplicate && !item.error),
    [previewItems]
  );
  const duplicateCount = previewItems.filter((item) => item.isDuplicate).length;
  const invalidCount = previewItems.filter((item) => Boolean(item.error)).length;

  async function loadExistingInvoiceNumbers(): Promise<Set<string>> {
    const numbers = new Set<string>();
    let page = 1;
    let totalPages = 1;

    // Read the invoice register so duplicates are flagged before import.
    // The API also enforces a unique constraint, so a race still cannot
    // double-post an invoice.
    do {
      const result = await listInvoices({ page, pageSize: 100 });
      for (const invoice of result.data) {
        numbers.add(invoice.invoiceNumber.trim().toLowerCase());
      }
      totalPages = result.meta.totalPages;
      page += 1;
    } while (page <= totalPages && page <= 20);

    return numbers;
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setLoadingPreview(true);
    setParseErrors([]);
    setDuplicateCheckWarning(null);
    setPreviewItems([]);

    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        setParseErrors(["The selected file is empty."]);
        setLoadingPreview(false);
        return;
      }

      const headers = rows[0];
      const columns = {
        invoiceNumber: findColumn(headers, "invoiceNumber"),
        vendorName: findColumn(headers, "vendorName"),
        date: findColumn(headers, "date"),
        amount: findColumn(headers, "amount"),
        currency: findColumn(headers, "currency"),
      };

      const missing = Object.entries(columns)
        .filter(([field, index]) => field !== "currency" && index === -1)
        .map(([field]) => field);

      if (missing.length > 0) {
        setParseErrors([
          `Missing required column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}. Expected headers: invoiceNumber, vendorName, date, amount, currency (optional).`,
        ]);
        setLoadingPreview(false);
        return;
      }

      const errors: string[] = [];
      const items: PreviewItem[] = [];

      rows.slice(1).forEach((cells, idx) => {
        const rowNumber = idx + 2;
        const invoiceNumber = (cells[columns.invoiceNumber] ?? "").trim();
        const vendorName = (cells[columns.vendorName] ?? "").trim();
        const rawDate = cells[columns.date] ?? "";
        const rawAmount = cells[columns.amount] ?? "";
        const currency = (
          (columns.currency >= 0 ? cells[columns.currency] : "") || "INR"
        )
          .trim()
          .toUpperCase();

        let error: string | undefined;
        const date = parseDate(rawDate);
        const amount = parseAmount(rawAmount);

        if (!invoiceNumber) error = "Missing invoice number.";
        else if (!vendorName) error = "Missing vendor name.";
        else if (!date) error = `Unrecognised date "${rawDate}".`;
        else if (!Number.isFinite(amount) || amount <= 0) {
          error = `Invalid amount "${rawAmount}".`;
        }

        if (error) errors.push(`Row ${rowNumber}: ${error}`);

        items.push({
          rowNumber,
          invoiceNumber,
          vendorName,
          date: date || "",
          amount: Number.isFinite(amount) ? amount : 0,
          currency: currency || "INR",
          isDuplicate: false,
          error,
        });
      });

      setParseErrors(errors);
      setPreviewItems(items);

      try {
        const existing = await loadExistingInvoiceNumbers();
        setPreviewItems((prev) =>
          prev.map((item) =>
            item.error
              ? item
              : {
                  ...item,
                  isDuplicate: existing.has(item.invoiceNumber.toLowerCase()),
                }
          )
        );
      } catch (err) {
        setDuplicateCheckWarning(
          `Duplicate pre-check could not complete (${err instanceof Error ? err.message : "unknown error"}). The server will still reject duplicate invoice numbers during import.`
        );
      }

      setStep("preview");
    } catch (err) {
      setParseErrors([
        err instanceof Error ? err.message : "The selected file could not be read.",
      ]);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleExecuteImport() {
    if (importableItems.length === 0) return;
    setStep("progress");
    setImportProgress(0);

    let countImported = 0;
    let countFailed = 0;
    let countSkipped = duplicateCount;

    for (let i = 0; i < importableItems.length; i += 1) {
      const item = importableItems[i];
      try {
        await createInvoice({
          invoiceNumber: item.invoiceNumber,
          totalAmount: item.amount,
          currency: item.currency,
          subtotalAmount: item.amount,
          taxAmount: 0,
          invoiceDate: item.date,
          lines: [
            {
              lineNumber: 1,
              description: `Imported from ${selectedFileName || "CSV"} — ${item.vendorName}`,
              quantity: 1,
              unitPrice: item.amount,
              lineAmount: item.amount,
            },
          ],
        });
        countImported += 1;
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 409) {
          // The unique invoice-number constraint caught a duplicate that the
          // preview missed (e.g. created after the pre-check).
          countSkipped += 1;
        } else {
          countFailed += 1;
        }
      }
      setImportProgress(Math.round(((i + 1) / importableItems.length) * 100));
    }

    setImportStats({
      imported: countImported,
      skipped: countSkipped,
      failed: countFailed,
    });
    setStep("summary");
    if (onImportComplete) onImportComplete();
  }

  function handleDownloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "avarta-invoice-import-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    setStep("source");
    setSelectedFileName(null);
    setPreviewItems([]);
    setParseErrors([]);
    setDuplicateCheckWarning(null);
    setImportProgress(0);
    setImportStats({ imported: 0, skipped: 0, failed: 0 });
    onClose();
  }

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && handleReset()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-neutral-950/60 dark:bg-zinc-950/80 transition-opacity" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 max-h-[90vh] w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-lg border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-lg focus:outline-none">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Database size={18} />
              </div>
              <div>
                <DialogPrimitive.Title className="text-body font-bold text-neutral-900 dark:text-zinc-100">
                  Import Invoices
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-micro text-neutral-500 dark:text-zinc-400">
                  Bulk import an invoice register from CSV with duplicate protection
                </DialogPrimitive.Description>
              </div>
            </div>
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-300 rounded-lg"
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </DialogPrimitive.Close>
          </div>

          <div className="py-5">
            {step === "source" && (
              <div className="space-y-4">
                <p className="text-body-sm text-neutral-600 dark:text-zinc-400">
                  Upload a CSV invoice register. Each row is created as a received invoice and
                  enters the normal capture and validation workflow.
                </p>

                <div className="p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-800/40 flex items-start gap-3">
                  <FileSpreadsheet className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" size={20} />
                  <div className="space-y-1 min-w-0">
                    <h4 className="text-body-sm font-semibold text-neutral-900 dark:text-zinc-100">
                      Required CSV columns
                    </h4>
                    <p className="text-micro text-neutral-500 dark:text-zinc-400">
                      <code className="font-mono">invoiceNumber</code>,{" "}
                      <code className="font-mono">vendorName</code>,{" "}
                      <code className="font-mono">date</code>,{" "}
                      <code className="font-mono">amount</code>; optional{" "}
                      <code className="font-mono">currency</code> (defaults to INR).
                    </p>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="inline-flex items-center gap-1 text-micro font-semibold text-indigo-600 dark:text-indigo-400 hover:underline pt-1"
                    >
                      <Download size={12} />
                      <span>Download CSV template</span>
                    </button>
                  </div>
                </div>

                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-neutral-300 dark:border-zinc-700 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-400 cursor-pointer transition-colors bg-neutral-50 dark:bg-zinc-800/40">
                  <Upload className="text-neutral-400 mb-2" size={24} />
                  <span className="text-body-sm font-semibold text-neutral-800 dark:text-zinc-200">
                    {loadingPreview ? "Reading file…" : "Click to select a CSV invoice file"}
                  </span>
                  <span className="text-micro text-neutral-500 dark:text-zinc-400 mt-1">
                    UTF-8 CSV · no vendor data is invented
                  </span>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={loadingPreview}
                  />
                </label>

                {parseErrors.length > 0 && (
                  <Alert type="error" title="File could not be parsed">
                    <ul className="list-disc pl-4 space-y-1">
                      {parseErrors.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  </Alert>
                )}

                <p className="text-micro text-neutral-500 dark:text-zinc-400">
                  Importing from Tally, QuickBooks, or Xero? Export the invoice register from
                  your accounting system as CSV — ERP connectors in Settings are for publishing
                  approved invoices back to your ledger.
                </p>
              </div>
            )}

            {step === "preview" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-body-sm">
                  <span className="text-neutral-600 dark:text-zinc-400">
                    Source:{" "}
                    <strong className="text-neutral-900 dark:text-zinc-100">{selectedFileName}</strong>
                  </span>
                  <span className="font-mono text-micro text-neutral-500 dark:text-zinc-400">
                    {previewItems.length} rows found
                  </span>
                </div>

                <div className="border border-neutral-200 dark:border-zinc-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-caption">
                    <thead className="bg-neutral-50 dark:bg-zinc-800 border-b border-neutral-200 dark:border-zinc-800 text-micro font-semibold text-neutral-500 dark:text-zinc-400 uppercase tracking-wider">
                      <tr>
                        <th className="p-2.5">Invoice #</th>
                        <th className="p-2.5">Vendor</th>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5 text-right">Amount</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-zinc-800">
                      {previewItems.map((item) => (
                        <tr
                          key={item.rowNumber}
                          className={
                            item.error
                              ? "bg-red-50/40 dark:bg-red-950/20"
                              : item.isDuplicate
                                ? "bg-amber-50/40 dark:bg-amber-950/20"
                                : ""
                          }
                        >
                          <td className="p-2.5 font-mono font-medium text-neutral-900 dark:text-zinc-100">
                            {item.invoiceNumber || "—"}
                          </td>
                          <td className="p-2.5 text-neutral-700 dark:text-zinc-300 truncate max-w-[140px]">
                            {item.vendorName || "—"}
                          </td>
                          <td className="p-2.5 text-neutral-500 dark:text-zinc-400">
                            {item.date || "—"}
                          </td>
                          <td className="p-2.5 text-right font-mono tabular-nums text-neutral-900 dark:text-zinc-100 font-semibold">
                            {item.currency} {item.amount.toLocaleString("en-IN")}
                          </td>
                          <td className="p-2.5 text-center">
                            {item.error ? (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/60 px-1.5 py-0.5 rounded"
                                title={item.error}
                              >
                                <AlertTriangle size={10} />
                                Invalid
                              </span>
                            ) : item.isDuplicate ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                                Duplicate (Skip)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                                Ready
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {duplicateCheckWarning && (
                  <Alert type="warning">{duplicateCheckWarning}</Alert>
                )}

                {duplicateCount > 0 && (
                  <Alert type="warning">
                    {duplicateCount} invoice{duplicateCount === 1 ? "" : "s"} already exist
                    in this workspace and will be skipped.
                  </Alert>
                )}

                {invalidCount > 0 && (
                  <Alert type="error" title={`${invalidCount} invalid row(s)`}>
                    Fix the highlighted rows in your CSV and upload again. Invalid rows are
                    never imported.
                  </Alert>
                )}

                <div className="flex items-center justify-between pt-2">
                  <Button variant="outline" onClick={() => setStep("source")}>
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleExecuteImport}
                    disabled={importableItems.length === 0}
                    className="gap-2"
                  >
                    <span>Confirm &amp; Import ({importableItems.length})</span>
                    <ArrowRight size={14} />
                  </Button>
                </div>
              </div>
            )}

            {step === "progress" && (
              <div className="space-y-4 py-6 text-center">
                <RefreshCw size={32} className="animate-spin text-indigo-600 dark:text-indigo-400 mx-auto" />
                <h4 className="text-body font-semibold text-neutral-900 dark:text-zinc-100">
                  Importing invoices into the intake register…
                </h4>
                <p className="text-caption text-neutral-500 dark:text-zinc-400">
                  Each invoice is validated and stocked independently.
                </p>
                <div className="w-full max-w-md mx-auto h-2 bg-neutral-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-colors duration-100"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
              </div>
            )}

            {step === "summary" && (
              <div className="space-y-4 text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-body font-semibold text-neutral-900 dark:text-zinc-100 text-balance">
                    Import complete
                  </h3>
                  <p className="text-caption text-neutral-600 dark:text-zinc-400">
                    Imported invoices are now in the intake register awaiting capture.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2.5 max-w-sm mx-auto text-left pt-2">
                  <div className="p-3 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-800/40 text-center">
                    <span className="block text-h3 font-bold font-mono text-emerald-600">
                      {importStats.imported}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-medium">Imported</span>
                  </div>
                  <div className="p-3 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-800/40 text-center">
                    <span className="block text-h3 font-bold font-mono text-amber-600">
                      {importStats.skipped}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-medium">Skipped (Dup)</span>
                  </div>
                  <div className="p-3 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-800/40 text-center">
                    <span className="block text-h3 font-bold font-mono text-neutral-500">
                      {importStats.failed}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-medium">Failed</span>
                  </div>
                </div>

                {importStats.failed > 0 && (
                  <p className="text-micro text-neutral-500 dark:text-zinc-400">
                    Failed rows were rejected by the server. Re-upload them after correcting the
                    source data.
                  </p>
                )}

                <div className="pt-4">
                  <Button variant="primary" onClick={handleReset} className="w-full max-w-xs mx-auto">
                    Done &amp; Return to Inbox
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
