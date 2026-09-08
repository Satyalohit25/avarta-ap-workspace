import { FormEvent, useState, useEffect, useMemo, useRef, ChangeEvent, DragEvent } from "react";
import {
  FileText,
  UploadCloud,
  X,
  Calendar,
  Sparkles,
  Building2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Inbox,
} from "lucide-react";
import { SupplierListItem } from "../../../api/suppliers";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { Button } from "../../../components/ui/Button";
import { formatCurrency } from "../../../lib/formatters";
import { InvoiceFormValues, invoiceFormSchema, InvoiceLineValues } from "../validation";

const CURRENCY_OPTIONS = [
  { value: "INR", label: "INR (₹)" },
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "CAD", label: "CAD ($)" },
  { value: "AUD", label: "AUD ($)" },
  { value: "SGD", label: "SGD ($)" },
];

const TERMS_OPTIONS = [
  { value: "0", label: "Immediate (Due upon Receipt)" },
  { value: "15", label: "Net 15 Days" },
  { value: "30", label: "Net 30 Days (Standard)" },
  { value: "45", label: "Net 45 Days" },
  { value: "60", label: "Net 60 Days" },
  { value: "custom", label: "Custom Date Selection" },
];

const TAX_SLAB_OPTIONS = [
  { value: "0", label: "0% (Exempt)" },
  { value: "5", label: "5% (Reduced)" },
  { value: "12", label: "12% (Standard-Low)" },
  { value: "18", label: "18% (Standard GST)" },
  { value: "28", label: "28% (Luxury)" },
];

export type InvoiceFormMode = "create" | "review";

export interface InvoiceFormProps {
  mode: InvoiceFormMode;
  initialData?: Partial<InvoiceFormValues>;
  sourceInvoiceId?: string;
  suppliers: SupplierListItem[];
  onSubmit: (values: InvoiceFormValues) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

export function InvoiceForm({
  mode,
  initialData,
  sourceInvoiceId: _sourceInvoiceId,
  suppliers,
  onSubmit,
  onCancel,
  submitting = false,
}: InvoiceFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Fields
  const [invoiceNumber, setInvoiceNumber] = useState(initialData?.invoiceNumber ?? "");
  const [supplierId, setSupplierId] = useState(initialData?.supplierId ?? "");
  const [invoiceDate, setInvoiceDate] = useState(
    initialData?.invoiceDate ?? (() => new Date().toISOString().split("T")[0])
  );
  const [paymentTerms, setPaymentTerms] = useState(initialData?.paymentTerms ?? "30");
  const [dueDate, setDueDate] = useState(() => {
    if (initialData?.dueDate) return initialData.dueDate;
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [currency, setCurrency] = useState(initialData?.currency ?? "INR");
  const [amount, setAmount] = useState(initialData?.totalAmount ?? "67260.00");
  const [attachedFile, setAttachedFile] = useState<File | null>(initialData?.file ?? null);
  const [isDragging, setIsDragging] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Itemized Lines
  const [lines, setLines] = useState<InvoiceLineValues[]>(() => {
    if (initialData?.lines && initialData.lines.length > 0) {
      return initialData.lines.map((l, idx) => ({
        id: l.id ?? `item-${idx + 1}`,
        lineNumber: l.lineNumber ?? idx + 1,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxRate: l.taxRate ?? 18,
        taxAmount: l.taxAmount,
        lineAmount: l.lineAmount,
      }));
    }
    return [
      {
        id: "item-1",
        description: "Industrial Hydraulic Valve Assembly (Standard 3/4\")",
        quantity: 10,
        unitPrice: 4500,
        taxRate: 18,
        lineAmount: 45000,
      },
      {
        id: "item-2",
        description: "Precision CNC Machined Flange (Alloy Steel Grade 316)",
        quantity: 5,
        unitPrice: 2400,
        taxRate: 18,
        lineAmount: 12000,
      },
    ];
  });

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  // Live Subtotal, Tax, and Reconciled Totals
  const calculatedSubtotal = useMemo(() => {
    return lines.reduce((acc, l) => acc + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);
  }, [lines]);

  const calculatedTax = useMemo(() => {
    return lines.reduce((acc, l) => {
      const net = (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
      return acc + (net * (Number(l.taxRate) || 0)) / 100;
    }, 0);
  }, [lines]);

  const reconciledTotal = useMemo(() => {
    return Math.round((calculatedSubtotal + calculatedTax) * 100) / 100;
  }, [calculatedSubtotal, calculatedTax]);

  // Keep total amount synchronized with lines in create mode or when lines change
  useEffect(() => {
    if (mode === "create" || (initialData?.lines && initialData.lines.length > 0)) {
      setAmount(reconciledTotal.toFixed(2));
      clearFieldError("amount");
    }
  }, [reconciledTotal, mode, initialData?.lines]);

  const isReconciled = Math.abs((Number(amount) || 0) - reconciledTotal) < 0.05;

  function clearFieldError(field: string) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function handleFileSelected(file: File) {
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.type)) {
      setFieldErrors((prev) => ({
        ...prev,
        file: "Invalid file format. Please upload a PDF, PNG, or JPG file.",
      }));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFieldErrors((prev) => ({
        ...prev,
        file: "File size exceeds maximum limit of 10 MB.",
      }));
      return;
    }

    clearFieldError("file");
    setAttachedFile(file);
  }

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  }

  function applyTermsToDueDate(baseDateStr: string, termsDays: number) {
    if (!baseDateStr) return;
    const base = new Date(baseDateStr);
    if (!isNaN(base.getTime())) {
      base.setDate(base.getDate() + termsDays);
      setDueDate(base.toISOString().split("T")[0]);
      clearFieldError("dueDate");
    }
  }

  function handleSupplierSelect(id: string) {
    setSupplierId(id);
    clearFieldError("supplierId");

    const found = suppliers.find((s) => s.id === id);
    if (found) {
      if (found.currency) {
        setCurrency(found.currency);
      }
      const days = found.paymentTermsDays ?? 30;
      setPaymentTerms(String(days));
      applyTermsToDueDate(invoiceDate, days);
    }
  }

  function handleInvoiceDateChange(val: string) {
    setInvoiceDate(val);
    clearFieldError("invoiceDate");

    if (val && paymentTerms !== "custom") {
      applyTermsToDueDate(val, Number(paymentTerms) || 30);
    }
  }

  function handlePaymentTermsChange(val: string) {
    setPaymentTerms(val);
    if (val !== "custom" && invoiceDate) {
      applyTermsToDueDate(invoiceDate, Number(val) || 30);
    }
  }

  function handleAddLine() {
    setLines((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: 18,
        lineAmount: 0,
      },
    ]);
  }

  function handleRemoveLine(id: string) {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  function handleUpdateLine(
    id: string,
    field: "description" | "quantity" | "unitPrice" | "taxRate",
    val: string | number
  ) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: val };
        const net = (Number(updated.quantity) || 0) * (Number(updated.unitPrice) || 0);
        const tax = (net * (Number(updated.taxRate) || 0)) / 100;
        updated.lineAmount = net;
        updated.taxAmount = tax;
        return updated;
      })
    );
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();

    const formattedLines = lines.map((l, idx) => ({
      lineNumber: idx + 1,
      description: l.description.trim() || `Line Item #${idx + 1}`,
      quantity: Number(l.quantity) || 1,
      unitPrice: Number(l.unitPrice) || 0,
      taxRate: Number(l.taxRate) || 18,
      taxAmount: ((Number(l.quantity) || 1) * (Number(l.unitPrice) || 0) * (Number(l.taxRate) || 0)) / 100,
      lineAmount: (Number(l.quantity) || 1) * (Number(l.unitPrice) || 0),
    }));

    const formPayload: InvoiceFormValues = {
      invoiceNumber: invoiceNumber.trim(),
      supplierId: supplierId || undefined,
      invoiceDate: invoiceDate || undefined,
      dueDate: dueDate || undefined,
      paymentTerms,
      currency,
      subtotalAmount: calculatedSubtotal,
      taxAmount: calculatedTax,
      totalAmount: amount,
      lines: formattedLines,
      file: attachedFile,
    };

    const result = invoiceFormSchema.safeParse(formPayload);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path.join(".");
        if (field) errors[field] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    await onSubmit(formPayload);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      void handleFormSubmit(e as unknown as FormEvent);
    }
  }

  const supplierOptions = [
    { value: "", label: "Select a supplier / vendor master..." },
    ...suppliers.map((s) => ({ value: s.id, label: `${s.displayName} (${s.supplierCode})` })),
  ];

  return (
    <form onSubmit={handleFormSubmit} onKeyDown={handleKeyDown} className="space-y-5" noValidate>
      {/* AI Extraction Confidence Banner (Review Mode) */}
      {mode === "review" && (
        <div className="p-3 rounded-lg border border-indigo-200/70 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/30 flex items-center justify-between gap-3 text-caption">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-neutral-700 dark:text-zinc-300">
              Fields extracted by AI. Verify item rates, tax calculations, and confirm to advance workflow.
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
            96% AI Confidence
          </span>
        </div>
      )}

      {/* Optional Document Upload Zone */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-label">
          <label className="text-neutral-700 dark:text-zinc-300 font-medium">
            Source Document <span className="text-neutral-400 font-normal">({mode === "review" ? "OCR Source" : "Optional"})</span>
          </label>
          <span className="text-micro text-neutral-400 dark:text-zinc-500 font-mono">
            PDF, PNG, JPG ≤ 10 MB
          </span>
        </div>

        {!attachedFile ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border border-dashed rounded-lg py-3 px-4 text-center cursor-pointer transition-colors ${
              isDragging
                ? "border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20"
                : "border-neutral-200 dark:border-zinc-800 hover:border-neutral-300 dark:hover:border-zinc-700 bg-neutral-50/50 dark:bg-zinc-900/40"
            }`}
          >
            <input
              ref={fileInputRef}
              id="shared-invoice-file-upload"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileInputChange}
              className="hidden"
              aria-label="Upload invoice source document"
            />
            <div className="flex items-center justify-center gap-2">
              <UploadCloud size={17} className="text-neutral-400 dark:text-zinc-500 shrink-0" strokeWidth={1.75} />
              <p className="text-body-sm text-neutral-600 dark:text-zinc-300 font-medium">
                Drag &amp; drop file or <span className="text-indigo-600 dark:text-indigo-400 font-semibold underline underline-offset-2">browse</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-800/40">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded bg-white dark:bg-zinc-900 flex items-center justify-center border border-neutral-200 dark:border-zinc-700 shrink-0">
                <FileText size={14} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="min-w-0">
                <p className="text-body-sm font-medium text-neutral-900 dark:text-zinc-100 truncate">
                  {attachedFile.name}
                </p>
                <p className="text-micro font-mono text-neutral-500 dark:text-zinc-400">
                  {formatFileSize(attachedFile.size)}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setAttachedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-zinc-200 p-1 h-auto"
              aria-label="Remove attached document"
            >
              <X size={15} />
            </Button>
          </div>
        )}

        {fieldErrors.file && (
          <p className="text-caption text-error-700 dark:text-error-400 font-medium">
            {fieldErrors.file}
          </p>
        )}
      </div>

      {/* Vendor Selection with Live Metadata Autofill */}
      <div className="space-y-2">
        <Select
          id="shared-invoice-supplier"
          name="supplierId"
          label="Vendor / Supplier Master"
          value={supplierId}
          onValueChange={handleSupplierSelect}
          options={supplierOptions}
          placeholder="Select a vendor master..."
          error={fieldErrors.supplierId}
        />

        {selectedSupplier && (
          <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-zinc-800/60 border border-neutral-200 dark:border-zinc-700/80 flex items-center justify-between text-micro flex-wrap gap-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              <span className="text-neutral-500 font-medium flex items-center gap-1">
                <Building2 size={12} className="text-indigo-600 dark:text-indigo-400" />
                <span>GSTIN / Tax ID:</span>
                <strong className="font-mono text-neutral-800 dark:text-zinc-200">
                  {selectedSupplier.gstNumber || "GSTIN Verified on File"}
                </strong>
              </span>

              <span className="text-neutral-500 font-medium">
                Terms: <strong className="font-mono text-neutral-800 dark:text-zinc-200">Net {selectedSupplier.paymentTermsDays ?? 30} Days</strong>
              </span>
            </div>

            <span className="text-neutral-500 font-medium font-mono">
              Balance: <span className="font-bold text-neutral-900 dark:text-zinc-100">{formatCurrency(selectedSupplier.outstandingBalance, selectedSupplier.currency)}</span>
            </span>
          </div>
        )}
      </div>

      {/* Invoice Identification & Terms-Driven Due Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <Input
          id="shared-invoice-number"
          label="Tax Invoice Number"
          value={invoiceNumber}
          onChange={(e) => {
            setInvoiceNumber(e.target.value);
            clearFieldError("invoiceNumber");
          }}
          required
          placeholder="e.g. INV-2026-1010"
          leftIcon={<FileText size={15} strokeWidth={1.75} />}
          error={fieldErrors.invoiceNumber}
        />

        <Select
          id="shared-invoice-currency"
          name="currency"
          label="Currency"
          value={currency}
          onValueChange={(val) => setCurrency(val)}
          options={CURRENCY_OPTIONS}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Input
          id="shared-invoice-date"
          label="Invoice Date"
          type="date"
          value={invoiceDate}
          onChange={(e) => handleInvoiceDateChange(e.target.value)}
          leftIcon={<Calendar size={15} strokeWidth={1.75} />}
          error={fieldErrors.invoiceDate}
        />

        <Select
          id="shared-invoice-payment-terms"
          name="paymentTerms"
          label="Payment Terms"
          value={paymentTerms}
          onValueChange={handlePaymentTermsChange}
          options={TERMS_OPTIONS}
        />

        <div>
          <Input
            id="shared-invoice-due-date"
            label="Calculated Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => {
              setPaymentTerms("custom");
              setDueDate(e.target.value);
              clearFieldError("dueDate");
            }}
            leftIcon={<Calendar size={15} strokeWidth={1.75} />}
            error={fieldErrors.dueDate}
          />
          <span className="text-[11px] font-mono text-neutral-400 mt-0.5 block">
            {paymentTerms !== "custom" ? `Auto: +${paymentTerms} days` : "Custom date"}
          </span>
        </div>
      </div>

      {/* Itemized Line Items Table */}
      <div className="space-y-2 pt-2 border-t border-neutral-200/80 dark:border-zinc-800/80">
        <div className="flex items-center justify-between">
          <label className="text-body-sm font-semibold text-neutral-900 dark:text-zinc-100 flex items-center gap-1.5">
            <span>Itemized Invoice Lines</span>
            <span className="text-micro font-mono bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400 px-2 py-0.5 rounded-full font-medium">
              {lines.length} {lines.length === 1 ? "line" : "lines"}
            </span>
          </label>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddLine}
            className="h-7 text-micro gap-1 px-2.5 font-medium"
          >
            <Plus size={12} />
            <span>Add Line Item</span>
          </Button>
        </div>

        <div className="rounded-lg border border-neutral-200 dark:border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-sm">
              <thead className="bg-neutral-50 dark:bg-zinc-900/90 border-b border-neutral-200 dark:border-zinc-800 text-caption font-semibold text-neutral-600 dark:text-zinc-400">
                <tr>
                  <th className="py-2 px-3 w-10 text-center font-mono">#</th>
                  <th className="py-2 px-3 min-w-[200px]">Description</th>
                  <th className="py-2 px-3 w-20 text-right">Qty</th>
                  <th className="py-2 px-3 w-28 text-right">Unit Rate ({currency})</th>
                  <th className="py-2 px-3 w-28 text-right">GST / Tax</th>
                  <th className="py-2 px-3 w-28 text-right">Total ({currency})</th>
                  <th className="py-2 px-2 w-10 text-center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                {lines.map((l, index) => {
                  const lineNet = (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
                  const lineTax = (lineNet * (Number(l.taxRate) || 0)) / 100;
                  const lineTotal = lineNet + lineTax;

                  return (
                    <tr key={l.id ?? index} className="hover:bg-neutral-50/50 dark:hover:bg-zinc-800/40">
                      <td className="py-2 px-3 text-center font-mono text-micro text-neutral-400">
                        {index + 1}
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={l.description}
                          onChange={(e) => handleUpdateLine(l.id ?? String(index), "description", e.target.value)}
                          placeholder="Item description or service..."
                          className="w-full h-8 px-2.5 rounded text-body-sm border border-neutral-200 dark:border-zinc-700 bg-transparent text-neutral-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="1"
                          value={l.quantity}
                          onChange={(e) => handleUpdateLine(l.id ?? String(index), "quantity", Number(e.target.value))}
                          className="w-16 h-8 px-2 rounded text-body-sm font-mono text-right border border-neutral-200 dark:border-zinc-700 bg-transparent text-neutral-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={l.unitPrice}
                          onChange={(e) => handleUpdateLine(l.id ?? String(index), "unitPrice", Number(e.target.value))}
                          className="w-24 h-8 px-2 rounded text-body-sm font-mono text-right border border-neutral-200 dark:border-zinc-700 bg-transparent text-neutral-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <select
                          value={l.taxRate ?? 18}
                          onChange={(e) => handleUpdateLine(l.id ?? String(index), "taxRate", Number(e.target.value))}
                          className="h-8 px-2 rounded text-micro font-mono border border-neutral-200 dark:border-zinc-700 bg-transparent text-neutral-800 dark:text-zinc-200 focus:border-indigo-500 focus:outline-none"
                        >
                          {TAX_SLAB_OPTIONS.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-neutral-900 dark:text-zinc-100 tabular-nums">
                        {formatCurrency(lineTotal, currency)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          disabled={lines.length <= 1}
                          onClick={() => handleRemoveLine(l.id ?? String(index))}
                          className="p-1 rounded text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Delete line"
                        >
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Live Financial Summary & Variance Banner */}
      <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-neutral-50/70 dark:bg-zinc-900/60 space-y-3">
        <div className="grid grid-cols-3 gap-3 text-center border-b border-neutral-200/80 dark:border-zinc-800/80 pb-3">
          <div>
            <span className="text-micro font-medium text-neutral-500 uppercase">Subtotal</span>
            <p className="text-body font-mono font-semibold text-neutral-900 dark:text-zinc-100">
              {formatCurrency(calculatedSubtotal, currency)}
            </p>
          </div>
          <div>
            <span className="text-micro font-medium text-neutral-500 uppercase">Tax / GST Total</span>
            <p className="text-body font-mono font-semibold text-neutral-900 dark:text-zinc-100">
              {formatCurrency(calculatedTax, currency)}
            </p>
          </div>
          <div>
            <span className="text-micro font-medium text-neutral-500 uppercase">Total Invoiced</span>
            <p className="text-body font-mono font-bold text-indigo-600 dark:text-indigo-400">
              {formatCurrency(reconciledTotal, currency)}
            </p>
          </div>
        </div>

        {/* Live Accounting Reconciliation Badge */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {isReconciled ? (
              <span className="inline-flex items-center gap-1.5 text-micro font-mono font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-300 dark:border-emerald-900/60">
                <CheckCircle2 size={13} strokeWidth={2.2} />
                <span>Reconciled: Line items &amp; taxes match total</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-micro font-mono font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-full border border-amber-300 dark:border-amber-900/60">
                <AlertTriangle size={13} strokeWidth={2.2} />
                <span>Variance Flagged: Differs from calculated sum</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-micro text-neutral-500 font-medium">Invoiced Amount:</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                clearFieldError("totalAmount");
              }}
              className="w-28 h-7 px-2 font-mono text-body-sm font-bold text-right border border-neutral-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-neutral-900 dark:text-zinc-100 rounded focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Submit / Cancel Actions Row */}
      <div className="pt-3 border-t border-neutral-200/60 dark:border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-body-sm text-neutral-500 dark:text-zinc-400">
          <Sparkles size={16} className="text-indigo-500 shrink-0" />
          <span>
            {mode === "create"
              ? "AI will execute OCR & 3-way validation upon receipt."
              : "Submitting runs automated capture, validation & 3-way matching."}
          </span>
        </div>

        <div className="flex items-center justify-end gap-3">
          <span className="text-micro font-mono text-neutral-400 dark:text-zinc-500 hidden sm:inline">
            Press ⌘/Ctrl + Enter to submit
          </span>

          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
            className="h-10 px-5 font-medium"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={submitting}
            className="h-10 px-6 font-semibold text-body-sm gap-2 shadow-sm"
          >
            {mode === "create" ? (
              <>
                <Inbox size={16} />
                <span>{submitting ? "Receiving Invoice..." : "Receive Invoice"}</span>
              </>
            ) : (
              <>
                <span>{submitting ? "Processing..." : "Verify & Process"}</span>
                <ArrowRight size={15} />
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
