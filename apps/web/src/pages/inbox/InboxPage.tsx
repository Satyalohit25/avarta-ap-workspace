import { useState, useEffect } from "react";
import { Mail, Copy, Check, Plus } from "lucide-react";
import {
  createInvoice,
  updateInvoice,
  listInvoices,
  getInvoice,
  processInvoice,
  InvoiceListItem,
} from "../../api/invoices";
import { listSuppliers, SupplierListItem } from "../../api/suppliers";
import { ApiRequestError } from "../../api/client";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { PageHeader } from "../../components/layout/PageHeader";
import { useToast } from "../../components/ui/ToastContext";
import { BatchIngestPanel } from "./components/BatchIngestPanel";
import { RecentInvoicesPanel } from "./components/RecentInvoicesPanel";
import { InvoiceFormDialog } from "./components/InvoiceFormDialog";
import { InvoiceFormMode } from "./components/InvoiceForm";
import { InvoiceFormValues } from "./validation";

const INBOUND_EMAIL = "ap-inbox@acme.avarta.dev";

export default function InboxPage() {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<SupplierListItem[]>([]);
  const [recentReceived, setRecentReceived] = useState<InvoiceListItem[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Dialog & Shared Form State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<InvoiceFormMode>("create");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<
    string | undefined
  >(undefined);
  const [initialFormData, setInitialFormData] = useState<
    Partial<InvoiceFormValues> | undefined
  >(undefined);
  const [formSubmitting, setFormSubmitting] = useState(false);

  function loadData() {
    listSuppliers()
      .then((res) => setSuppliers(res.data))
      .catch(() => {});

    setLoadingRecent(true);
    listInvoices({ status: "RECEIVED" })
      .then((res) => setRecentReceived(res.data))
      .catch(() => {})
      .finally(() => setLoadingRecent(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleCopyEmail() {
    navigator.clipboard.writeText(INBOUND_EMAIL);
    setCopiedEmail(true);
    toast.success("Inbound Email Copied", INBOUND_EMAIL);
    setTimeout(() => setCopiedEmail(false), 2500);
  }

  function handleOpenCreate() {
    setFormMode("create");
    setSelectedInvoiceId(undefined);
    setInitialFormData(undefined);
    setApiError(null);
    setDialogOpen(true);
  }

  async function handleInspectInvoice(invoice: InvoiceListItem) {
    setApiError(null);
    setSelectedInvoiceId(invoice.id);
    setFormMode("review");

    try {
      // Fetch complete invoice data to get line items and extracted fields
      const detailRes = await getInvoice(invoice.id);
      const detail = detailRes.data;

      setInitialFormData({
        invoiceNumber: detail.invoiceNumber,
        supplierId: detail.supplier?.id,
        invoiceDate: detail.invoiceDate ?? undefined,
        dueDate: detail.dueDate ?? undefined,
        currency: detail.currency ?? "INR",
        totalAmount: detail.totalAmount,
        lines:
          Array.isArray(detail.lines) && detail.lines.length > 0
            ? (detail.lines as Record<string, unknown>[]).map((l, idx) => ({
                id: (l.id as string) ?? `line-${idx + 1}`,
                lineNumber: (l.lineNumber as number) ?? idx + 1,
                description:
                  (l.description as string) || `Line Item #${idx + 1}`,
                quantity: Number(l.quantity) || 1,
                unitPrice: Number(l.unitPrice) || 0,
                taxRate: l.taxRate ? Number(l.taxRate) : 18,
                taxAmount: l.taxAmount ? Number(l.taxAmount) : undefined,
                lineAmount:
                  Number(l.lineAmount) ||
                  (Number(l.quantity) || 1) * (Number(l.unitPrice) || 0),
              }))
            : undefined,
      });
    } catch {
      // Fallback to list item data if detail fetch fails
      setInitialFormData({
        invoiceNumber: invoice.invoiceNumber,
        supplierId: invoice.supplier?.id,
        invoiceDate: invoice.invoiceDate ?? undefined,
        dueDate: invoice.dueDate ?? undefined,
        currency: invoice.currency ?? "INR",
        totalAmount: invoice.totalAmount,
      });
    }

    setDialogOpen(true);
  }

  async function handleFormSubmit(values: InvoiceFormValues) {
    setApiError(null);
    setFormSubmitting(true);

    try {
      if (formMode === "create") {
        await createInvoice({
          invoiceNumber: values.invoiceNumber.trim(),
          supplierId: values.supplierId || undefined,
          invoiceDate: values.invoiceDate || undefined,
          dueDate: values.dueDate || undefined,
          currency: values.currency,
          subtotalAmount: values.subtotalAmount,
          taxAmount: values.taxAmount,
          totalAmount: values.totalAmount,
          lines: values.lines,
          file: values.file,
        });
      } else if (formMode === "review" && selectedInvoiceId) {
        // Persist human corrections first before running pipeline
        await updateInvoice(selectedInvoiceId, {
          invoiceNumber: values.invoiceNumber.trim(),
          supplierId: values.supplierId || undefined,
          invoiceDate: values.invoiceDate || undefined,
          dueDate: values.dueDate || undefined,
          currency: values.currency,
          subtotalAmount: values.subtotalAmount,
          taxAmount: values.taxAmount,
          totalAmount: values.totalAmount,
          lines: values.lines,
        });

        // Run OCR, validation & 3-way matching pipeline on reviewed invoice
        await processInvoice(selectedInvoiceId);
        toast.success(
          "Invoice Reviewed & Processed",
          `Invoice ${values.invoiceNumber.trim()} validated and pipeline executed.`,
        );
      } else {
        toast.success(
          "Invoice Ingested",
          `Invoice ${values.invoiceNumber.trim()} uploaded and queued for validation.`,
        );
      }

      window.dispatchEvent(new CustomEvent("avarta-update-counts"));
      setDialogOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof ApiRequestError ? err.message : "An unexpected error occurred. Please try again.";
      setApiError(msg);
      toast.error("Invoice Ingestion Failed", msg);
    } finally {
      setFormSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header Row: Title on Left, "+ Quick manual entry" Ghost-style Button on Right */}
      <PageHeader
        title="Inbox"
        subtitle="Multi-channel ingestion hub & document triage (Workflow Stage 1: Receive)."
        action={
          <Button
            type="button"
            variant="ghost"
            onClick={handleOpenCreate}
            className="gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-semibold border border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs"
          >
            <Plus size={16} />
            <span>Quick manual entry</span>
          </Button>
        }
      />

      {/* Inbound Email Forwarding Banner (Full-Width) */}
      <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200/60 dark:border-indigo-800/60">
            <Mail size={18} strokeWidth={1.85} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-body-sm font-semibold text-neutral-900 dark:text-zinc-100">
                Inbound Ingestion Mailbox
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/60">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>
            <p className="text-caption text-neutral-500 dark:text-zinc-400 mt-0.5">
              Forward invoices to:{" "}
              <span className="font-mono font-medium text-neutral-800 dark:text-zinc-200 select-all">
                {INBOUND_EMAIL}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyEmail}
            className="gap-1.5 text-body-sm font-medium h-8"
          >
            {copiedEmail ? (
              <>
                <Check
                  size={14}
                  className="text-emerald-600 dark:text-emerald-400"
                />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy Address</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {apiError && (
        <Alert type="error" title="Submission Failed">
          {apiError}
        </Alert>
      )}

      {/* Two-Column Responsive Grid (1.1fr : 1fr) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Panel — Batch Ingest: Dropzone always visible */}
        <div className="lg:col-span-7 flex flex-col">
          <BatchIngestPanel onBatchComplete={loadData} />
        </div>

        {/* Right Panel — Recent Invoices: Ingestion feed always visible */}
        <div className="lg:col-span-5 flex flex-col">
          <RecentInvoicesPanel
            invoices={recentReceived}
            loading={loadingRecent}
            onInspect={handleInspectInvoice}
          />
        </div>
      </div>

      {/* Shared Invoice Form Dialog (Serves both '+ Quick manual entry' & 'Inspect & Process') */}
      <InvoiceFormDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        mode={formMode}
        initialData={initialFormData}
        sourceInvoiceId={selectedInvoiceId}
        suppliers={suppliers}
        onSubmit={handleFormSubmit}
        submitting={formSubmitting}
      />
    </div>
  );
}
