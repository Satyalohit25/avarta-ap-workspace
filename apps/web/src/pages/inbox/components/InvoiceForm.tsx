import { FormEvent, useState, useEffect, useMemo, useRef, ChangeEvent, DragEvent } from "react";
import {
  FileText,
  UploadCloud,
  X,
  Calendar,
  CheckCircle2,
  FileCheck,
  AlertTriangle,
  ArrowRight,
  Inbox,
  Building2,
  Plus,
  Eye,
  EyeOff,
  Link2,
  FileSpreadsheet,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { SupplierListItem } from "../../../api/suppliers";
import { listPurchaseOrders, PurchaseOrderItem } from "../../../api/purchaseOrders";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { Button } from "../../../components/ui/Button";
import { formatCurrency, formatDate } from "../../../lib/formatters";
import { InvoiceFormValues, invoiceFormSchema, InvoiceLineValues } from "../validation";

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

const CURRENCY_OPTIONS = [
  { value: "CAD", label: "CAD ($) — Canadian Dollar" },
  { value: "USD", label: "USD ($) — US Dollar" },
  { value: "INR", label: "INR (₹) — Indian Rupee" },
  { value: "EUR", label: "EUR (€) — Euro" },
  { value: "GBP", label: "GBP (£) — British Pound" },
  { value: "AUD", label: "AUD ($) — Australian Dollar" },
  { value: "SGD", label: "SGD ($) — Singapore Dollar" },
];

const TERMS_OPTIONS = [
  { value: "0", label: "Immediate (Due upon Receipt)" },
  { value: "15", label: "Net 15 Days" },
  { value: "30", label: "Net 30 Days (Standard)" },
  { value: "45", label: "Net 45 Days" },
  { value: "60", label: "Net 60 Days" },
  { value: "custom", label: "Custom Date" },
];

interface TaxRateConfig {
  taxIdLabel: string;
  defaultRate: number;
  rates: Array<{ value: string; label: string; cellDisplay: string }>;
}

const TAX_CONFIG_BY_CURRENCY: Record<string, TaxRateConfig> = {
  CAD: {
    taxIdLabel: "Business Number (BN / GST)",
    defaultRate: 5,
    rates: [
      { value: "0", label: "0% (Exempt / Zero-Rated)", cellDisplay: "0%" },
      { value: "5", label: "5% (Federal GST)", cellDisplay: "5%" },
      { value: "13", label: "13% (Ontario HST)", cellDisplay: "13%" },
      { value: "15", label: "15% (Atlantic HST)", cellDisplay: "15%" },
    ],
  },
  USD: {
    taxIdLabel: "Tax ID (EIN / SSN)",
    defaultRate: 0,
    rates: [
      { value: "0", label: "0% (Tax-Exempt / Wholesale)", cellDisplay: "0%" },
      { value: "5", label: "5% (State Sales Tax)", cellDisplay: "5%" },
      { value: "7", label: "7% (Combined State/Local)", cellDisplay: "7%" },
      { value: "8.25", label: "8.25% (Standard Sales Tax)", cellDisplay: "8.25%" },
      { value: "10", label: "10% (Local / Municipal Tax)", cellDisplay: "10%" },
    ],
  },
  INR: {
    taxIdLabel: "GSTIN",
    defaultRate: 18,
    rates: [
      { value: "0", label: "0% (Exempt / Nil-Rated)", cellDisplay: "0%" },
      { value: "5", label: "5% (Reduced GST)", cellDisplay: "5%" },
      { value: "12", label: "12% (Standard-Low GST)", cellDisplay: "12%" },
      { value: "18", label: "18% (Standard GST)", cellDisplay: "18%" },
      { value: "28", label: "28% (Luxury / Cess)", cellDisplay: "28%" },
    ],
  },
  EUR: {
    taxIdLabel: "VAT Reg No.",
    defaultRate: 20,
    rates: [
      { value: "0", label: "0% (Zero-Rated / Reverse Charge)", cellDisplay: "0%" },
      { value: "5", label: "5% (Reduced VAT)", cellDisplay: "5%" },
      { value: "10", label: "10% (Intermediate VAT)", cellDisplay: "10%" },
      { value: "20", label: "20% (Standard VAT)", cellDisplay: "20%" },
      { value: "21", label: "21% (Standard VAT — NL/ES)", cellDisplay: "21%" },
    ],
  },
  GBP: {
    taxIdLabel: "VAT Reg No. (HMRC)",
    defaultRate: 20,
    rates: [
      { value: "0", label: "0% (Zero-Rated / Exempt)", cellDisplay: "0%" },
      { value: "5", label: "5% (Reduced VAT)", cellDisplay: "5%" },
      { value: "20", label: "20% (Standard VAT)", cellDisplay: "20%" },
    ],
  },
  AUD: {
    taxIdLabel: "ABN (Australian Business No.)",
    defaultRate: 10,
    rates: [
      { value: "0", label: "0% (GST-Free)", cellDisplay: "0%" },
      { value: "10", label: "10% (Standard GST)", cellDisplay: "10%" },
    ],
  },
  SGD: {
    taxIdLabel: "UEN / GST Reg No.",
    defaultRate: 9,
    rates: [
      { value: "0", label: "0% (Zero-Rated)", cellDisplay: "0%" },
      { value: "9", label: "9% (Standard GST)", cellDisplay: "9%" },
    ],
  },
};

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
  const [purchaseOrderId, setPurchaseOrderId] = useState(initialData?.purchaseOrderId ?? "none");
  const [currency, setCurrency] = useState(initialData?.currency ?? "CAD");
  const [paymentTerms, setPaymentTerms] = useState(initialData?.paymentTerms ?? "30");
  const [isDueDateOverridden, setIsDueDateOverridden] = useState(false);

  // Dates: Ensure valid initial dates (fallback to today if missing)
  const [invoiceDate, setInvoiceDate] = useState(() => {
    if (initialData?.invoiceDate) return initialData.invoiceDate;
    return new Date().toISOString().split("T")[0];
  });

  const [dueDate, setDueDate] = useState(() => {
    if (initialData?.dueDate) return initialData.dueDate;
    const base = initialData?.invoiceDate ? new Date(initialData.invoiceDate) : new Date();
    base.setDate(base.getDate() + 30);
    return base.toISOString().split("T")[0];
  });

  const [amount, setAmount] = useState(initialData?.totalAmount ?? "3127.00");
  const [attachedFile, setAttachedFile] = useState<File | null>(initialData?.file ?? null);
  const [isDragging, setIsDragging] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Document Inspection Preview State
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const [showReplaceUpload, setShowReplaceUpload] = useState(false);

  // Purchase Orders List
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderItem[]>([]);
  const [loadingPos, setLoadingPos] = useState(false);

  // Load Purchase Orders
  useEffect(() => {
    let isMounted = true;
    async function loadPos() {
      try {
        setLoadingPos(true);
        const res = await listPurchaseOrders();
        if (isMounted && res?.data) {
          setPurchaseOrders(res.data);
        }
      } catch {
        // Fallback silently if PO service unreachable
      } finally {
        if (isMounted) setLoadingPos(false);
      }
    }
    void loadPos();
    return () => {
      isMounted = false;
    };
  }, []);

  // Itemized Lines
  const [lines, setLines] = useState<InvoiceLineValues[]>(() => {
    if (initialData?.lines && initialData.lines.length > 0) {
      return initialData.lines.map((l, idx) => ({
        id: l.id ?? `item-${idx + 1}`,
        lineNumber: l.lineNumber ?? idx + 1,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxRate: l.taxRate ?? (initialData?.currency === "CAD" ? 5 : 18),
        taxAmount: l.taxAmount,
        lineAmount: l.lineAmount,
      }));
    }
    return [
      {
        id: "item-1",
        description: "Salesforce Sales Cloud — Enterprise (annual)",
        quantity: 25,
        unitPrice: 75,
        taxRate: 5,
        lineAmount: 1875,
      },
      {
        id: "item-2",
        description: "Salesforce Service Cloud — Professional",
        quantity: 10,
        unitPrice: 55,
        taxRate: 5,
        lineAmount: 550,
      },
      {
        id: "item-3",
        description: "Implementation Support Package",
        quantity: 1,
        unitPrice: 225,
        taxRate: 5,
        lineAmount: 225,
      },
    ];
  });

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  // Tax Configuration based on active currency
  const taxConfig = useMemo(() => {
    return TAX_CONFIG_BY_CURRENCY[currency] ?? TAX_CONFIG_BY_CURRENCY.CAD;
  }, [currency]);

  // Tax Slab Options with graceful fallback for custom extracted rates
  const taxSlabOptions = useMemo(() => {
    const baseOptions = taxConfig.rates.map((r) => ({
      value: r.value,
      label: r.label,
    }));

    // Check if any existing line has a rate not in the base options (e.g. 18% on a CAD invoice)
    const existingRates = new Set(lines.map((l) => String(l.taxRate ?? taxConfig.defaultRate)));
    existingRates.forEach((rateVal) => {
      if (!baseOptions.some((opt) => opt.value === rateVal)) {
        baseOptions.push({
          value: rateVal,
          label: `${rateVal}% (Non-standard / Extracted)`,
        });
      }
    });

    return baseOptions;
  }, [taxConfig, lines]);

  // Tax Mismatch Advisory
  const hasTaxMismatch = useMemo(() => {
    if (currency === "CAD") {
      return lines.some((l) => Number(l.taxRate) === 18);
    }
    return false;
  }, [currency, lines]);

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

  // Variance between printed invoice amount and calculated sum
  const variance = useMemo(() => {
    const printedNum = Number(amount) || 0;
    return Math.round((printedNum - reconciledTotal) * 100) / 100;
  }, [amount, reconciledTotal]);

  const isMathReconciled = Math.abs(variance) < 0.05;

  // Form Completeness Checklist
  const missingRequiredFields = useMemo(() => {
    const list: string[] = [];
    if (!invoiceNumber.trim()) list.push("Invoice Number");
    if (!supplierId) list.push("Supplier");
    if (!invoiceDate) list.push("Invoice Date");
    if (!dueDate) list.push("Due Date");
    return list;
  }, [invoiceNumber, supplierId, invoiceDate, dueDate]);

  const isFormComplete = missingRequiredFields.length === 0;

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
    setShowReplaceUpload(false);
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

  function calculateDueDate(baseDateStr: string, termsDays: number): string {
    if (!baseDateStr) return "";
    const base = new Date(baseDateStr);
    if (isNaN(base.getTime())) return "";
    base.setDate(base.getDate() + termsDays);
    return base.toISOString().split("T")[0];
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

      if (!isDueDateOverridden && invoiceDate) {
        setDueDate(calculateDueDate(invoiceDate, days));
      }

      // Check if there is an active PO for this supplier
      const matchingPo = purchaseOrders.find((p) => p.supplierId === id || p.vendor.includes(found.displayName));
      if (matchingPo) {
        setPurchaseOrderId(matchingPo.id);
      } else {
        setPurchaseOrderId("none");
      }
    }
  }

  function handleInvoiceDateChange(val: string) {
    setInvoiceDate(val);
    clearFieldError("invoiceDate");

    if (val && !isDueDateOverridden && paymentTerms !== "custom") {
      const days = Number(paymentTerms) || 30;
      setDueDate(calculateDueDate(val, days));
      clearFieldError("dueDate");
    }
  }

  function handlePaymentTermsChange(val: string) {
    setPaymentTerms(val);
    if (val !== "custom") {
      setIsDueDateOverridden(false);
      if (invoiceDate) {
        const days = Number(val) || 30;
        setDueDate(calculateDueDate(invoiceDate, days));
        clearFieldError("dueDate");
      }
    } else {
      setIsDueDateOverridden(true);
    }
  }

  function handleDueDateChange(val: string) {
    setDueDate(val);
    setIsDueDateOverridden(true);
    setPaymentTerms("custom");
    clearFieldError("dueDate");
  }

  function handleResetDueDateToAuto() {
    setIsDueDateOverridden(false);
    setPaymentTerms("30");
    if (invoiceDate) {
      setDueDate(calculateDueDate(invoiceDate, 30));
      clearFieldError("dueDate");
    }
  }

  function handleAddLine() {
    const defaultRate = taxConfig.defaultRate;
    setLines((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: defaultRate,
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

    // Trigger validation
    const formattedLines = lines.map((l, idx) => ({
      lineNumber: idx + 1,
      description: l.description.trim() || `Line Item #${idx + 1}`,
      quantity: Number(l.quantity) || 1,
      unitPrice: Number(l.unitPrice) || 0,
      taxRate: Number(l.taxRate) || taxConfig.defaultRate,
      taxAmount: ((Number(l.quantity) || 1) * (Number(l.unitPrice) || 0) * (Number(l.taxRate) || 0)) / 100,
      lineAmount: (Number(l.quantity) || 1) * (Number(l.unitPrice) || 0),
    }));

    const formPayload: InvoiceFormValues = {
      invoiceNumber: invoiceNumber.trim(),
      supplierId: supplierId || undefined,
      purchaseOrderId: purchaseOrderId !== "none" ? purchaseOrderId : undefined,
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

    if (!supplierId) {
      setFieldErrors((prev) => ({ ...prev, supplierId: "Supplier selection is mandatory" }));
      return;
    }
    if (!invoiceDate) {
      setFieldErrors((prev) => ({ ...prev, invoiceDate: "Invoice date is mandatory" }));
      return;
    }
    if (!dueDate) {
      setFieldErrors((prev) => ({ ...prev, dueDate: "Due date is mandatory" }));
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
    { value: "", label: "Select a supplier master..." },
    ...suppliers.map((s) => ({ value: s.id, label: `${s.displayName} (${s.supplierCode})` })),
  ];

  // PO Options for selected supplier
  const poOptions = useMemo(() => {
    const list = [{ value: "none", label: "None — Non-PO Invoice (Direct GL Routing)" }];
    const supplierPos = purchaseOrders.filter((po) => {
      if (!selectedSupplier) return true;
      return po.supplierId === selectedSupplier.id || po.vendor.includes(selectedSupplier.displayName);
    });

    supplierPos.forEach((po) => {
      list.push({
        value: po.id,
        label: `${po.poNumber} — ${po.currency} ${po.totalAmount} (Remaining: ${po.remainingAmount})`,
      });
    });

    return list;
  }, [purchaseOrders, selectedSupplier]);

  const selectedPo = purchaseOrders.find((p) => p.id === purchaseOrderId);

  // Supplier Tax ID display helper
  const supplierTaxIdDisplay = useMemo(() => {
    if (!selectedSupplier) return null;
    if (selectedSupplier.gstNumber) return selectedSupplier.gstNumber;
    if (selectedSupplier.country === "CA") return "BN 849204812RT0001 (Verified)";
    if (selectedSupplier.country === "US") return "EIN 94-2781940 (Verified)";
    return "Verified on File";
  }, [selectedSupplier]);

  return (
    <form onSubmit={handleFormSubmit} onKeyDown={handleKeyDown} className="space-y-5" noValidate>
      {/* Verification Notice Banner (Review Mode) */}
      {mode === "review" && (
        <div className="p-3.5 rounded-lg border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 flex items-center justify-between gap-3 text-caption">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileCheck size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold text-neutral-900 dark:text-zinc-100">
                OCR Verification Stage:
              </span>{" "}
              <span className="text-neutral-600 dark:text-zinc-300">
                Inspect extracted fields against the source intake document before pushing the invoice through validation &amp; matching.
              </span>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/60">
              <ShieldCheck size={12} />
              <span>96% AI Confidence</span>
            </span>
          </div>
        </div>
      )}

      {/* Tax Mismatch Warning Advisory */}
      {hasTaxMismatch && (
        <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 flex items-center gap-2 text-caption text-amber-800 dark:text-amber-300">
          <AlertCircle size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>Tax Rate Advisory:</strong> 18% is an Indian GST rate. Canadian standard rates are 5% GST or 13%/15% HST. Check the tax column if this invoice was issued in Canada.
          </span>
        </div>
      )}

      {/* Source Document Inspection & Verification Area */}
      {mode === "review" ? (
        <div className="rounded-xl border border-neutral-200 dark:border-zinc-800 bg-neutral-50/60 dark:bg-zinc-900/50 p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <FileText size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-body-sm font-semibold text-neutral-900 dark:text-zinc-100 truncate">
                    {attachedFile?.name || `${invoiceNumber || "INV-2026-1016"}_Intake_Document`}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-200/80 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300 font-medium">
                    {initialData?.source || "PORTAL"} INGESTION
                  </span>
                </div>
                <p className="text-caption text-neutral-500 dark:text-zinc-400">
                  {attachedFile ? `${formatFileSize(attachedFile.size)} • Verified Attachment` : "Electronic B2B digital voucher recorded in AP ingestion feed"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPreviewOpen((prev) => !prev)}
                className="h-8 text-caption gap-1.5 px-3 font-medium text-neutral-700 dark:text-zinc-300"
              >
                {isPreviewOpen ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{isPreviewOpen ? "Collapse Document Preview" : "Compare Source Document"}</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowReplaceUpload((prev) => !prev)}
                className="h-8 text-caption gap-1 text-neutral-500 hover:text-neutral-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                <UploadCloud size={13} />
                <span>{showReplaceUpload ? "Cancel Upload" : "Replace File"}</span>
              </Button>
            </div>
          </div>

          {/* Collapsible Source Voucher Preview */}
          {isPreviewOpen && (
            <div className="rounded-lg border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3 shadow-inner">
              <div className="flex items-start justify-between border-b border-neutral-100 dark:border-zinc-800/80 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                    Original Source Document (OCR Reference)
                  </span>
                  <h4 className="text-body font-bold text-neutral-900 dark:text-zinc-100 mt-1">
                    {selectedSupplier?.displayName || "Salesforce Inc"}
                  </h4>
                  <p className="text-caption text-neutral-500 dark:text-zinc-400 font-mono">
                    {taxConfig.taxIdLabel}: {supplierTaxIdDisplay}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-caption font-mono font-bold text-neutral-900 dark:text-zinc-100">
                    {invoiceNumber || "INV-2026-1016"}
                  </span>
                  <p className="text-micro text-neutral-400 font-mono">
                    Date: {invoiceDate || "2026-10-08"} • Due: {dueDate || "2026-11-07"}
                  </p>
                </div>
              </div>

              {/* Mini Itemized Preview */}
              <div className="text-caption space-y-1.5 font-mono">
                <div className="flex items-center justify-between text-neutral-400 text-micro border-b border-neutral-100 dark:border-zinc-900 pb-1">
                  <span>Extracted Item Line</span>
                  <div className="flex gap-4">
                    <span>Qty</span>
                    <span>Rate</span>
                    <span>Line Total</span>
                  </div>
                </div>
                {lines.map((l, i) => (
                  <div key={i} className="flex items-center justify-between text-neutral-700 dark:text-zinc-300">
                    <span className="truncate max-w-[280px] sm:max-w-[360px] font-sans">
                      {l.description || `Line Item #${i + 1}`}
                    </span>
                    <div className="flex gap-4 tabular-nums">
                      <span className="w-8 text-right">{l.quantity}</span>
                      <span className="w-14 text-right">{Number(l.unitPrice).toFixed(2)}</span>
                      <span className="w-20 text-right font-semibold text-neutral-900 dark:text-zinc-100">
                        {formatCurrency((Number(l.quantity) || 1) * (Number(l.unitPrice) || 0), currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-neutral-100 dark:border-zinc-800/80 flex items-center justify-between text-caption font-mono">
                <span className="text-neutral-500">Document Total Printed:</span>
                <span className="font-bold text-body text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {formatCurrency(amount, currency)}
                </span>
              </div>
            </div>
          )}

          {/* Optional File Replacement Dropzone */}
          {showReplaceUpload && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-indigo-400/80 rounded-lg p-4 text-center cursor-pointer bg-indigo-50/20 dark:bg-indigo-950/20"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileInputChange}
                className="hidden"
                aria-label="Upload replacement invoice file"
              />
              <UploadCloud size={20} className="mx-auto text-indigo-500 mb-1" />
              <p className="text-caption font-medium text-neutral-700 dark:text-zinc-300">
                Drop new scan or <span className="text-indigo-600 underline">browse</span> to attach (PDF, PNG, JPG ≤ 10MB)
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Create Mode: Clean File Upload Zone */
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-label">
            <label className="text-neutral-700 dark:text-zinc-300 font-medium">
              Source Document <span className="text-neutral-400 font-normal">(Optional)</span>
            </label>
            <span className="text-micro text-neutral-500 dark:text-zinc-400 font-mono">
              PDF, PNG, JPG ≤ 10 MB
            </span>
          </div>

          {!attachedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded-lg py-3.5 px-4 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20"
                  : "border-neutral-200 dark:border-zinc-800 hover:border-neutral-300 dark:hover:border-zinc-700 bg-neutral-50/50 dark:bg-zinc-900/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileInputChange}
                className="hidden"
                aria-label="Upload invoice source document"
              />
              <div className="flex items-center justify-center gap-2">
                <UploadCloud size={18} className="text-neutral-400 dark:text-zinc-500 shrink-0" strokeWidth={1.75} />
                <p className="text-body-sm text-neutral-600 dark:text-zinc-300 font-medium">
                  Drag &amp; drop invoice document or <span className="text-indigo-600 dark:text-indigo-400 font-semibold underline underline-offset-2">browse</span>
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
            <p className="text-caption text-rose-600 dark:text-rose-400 font-medium">
              {fieldErrors.file}
            </p>
          )}
        </div>
      )}

      {/* Supplier Section (Standardized Label & Rich Context Strip) */}
      <div className="space-y-2">
        <Select
          id="shared-invoice-supplier"
          name="supplierId"
          label="Supplier *"
          value={supplierId}
          onValueChange={handleSupplierSelect}
          options={supplierOptions}
          placeholder="Select a supplier..."
          error={fieldErrors.supplierId}
        />

        {selectedSupplier && (
          <div className="p-3 rounded-lg bg-neutral-50 dark:bg-zinc-800/60 border border-neutral-200 dark:border-zinc-700/80 flex items-center justify-between text-caption flex-wrap gap-2.5 animate-in fade-in duration-150">
            <div className="flex items-center gap-3.5 flex-wrap">
              <span className="text-neutral-600 dark:text-zinc-300 font-medium flex items-center gap-1.5">
                <Building2 size={13} className="text-indigo-600 dark:text-indigo-400" />
                <span className="font-semibold text-neutral-900 dark:text-zinc-100">
                  {selectedSupplier.displayName} ({selectedSupplier.supplierCode})
                </span>
              </span>

              <span className="text-neutral-500 dark:text-zinc-400">
                {taxConfig.taxIdLabel}:{" "}
                <strong className="font-mono text-neutral-800 dark:text-zinc-200 font-semibold">
                  {supplierTaxIdDisplay}
                </strong>
              </span>

              <span className="text-neutral-500 dark:text-zinc-400">
                Master Terms:{" "}
                <strong className="font-mono text-neutral-800 dark:text-zinc-200 font-semibold">
                  Net {selectedSupplier.paymentTermsDays ?? 30} Days
                </strong>
              </span>
            </div>

            <span className="text-neutral-600 dark:text-zinc-300 font-mono text-caption">
              Current AP Balance:{" "}
              <span className="font-bold text-neutral-900 dark:text-zinc-100">
                {formatCurrency(selectedSupplier.outstandingBalance, selectedSupplier.currency)}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Invoice Number, Purchase Order & Currency Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Input
          id="shared-invoice-number"
          label="Invoice Number *"
          value={invoiceNumber}
          onChange={(e) => {
            setInvoiceNumber(e.target.value);
            clearFieldError("invoiceNumber");
          }}
          required
          placeholder="e.g. INV-2026-1016"
          leftIcon={<FileText size={15} strokeWidth={1.75} />}
          error={fieldErrors.invoiceNumber}
        />

        <div className="space-y-1">
          <Select
            id="shared-invoice-po"
            name="purchaseOrderId"
            label="Purchase Order"
            value={purchaseOrderId}
            onValueChange={(val) => setPurchaseOrderId(val)}
            options={poOptions}
            disabled={loadingPos}
          />
          <span className="text-[11px] text-neutral-500 dark:text-zinc-400 block truncate">
            {purchaseOrderId !== "none" && selectedPo
              ? `✓ 3-Way line matching against ${selectedPo.poNumber}`
              : "Direct GL routing (Non-PO 2-way approval)"}
          </span>
        </div>

        <Select
          id="shared-invoice-currency"
          name="currency"
          label="Currency"
          value={currency}
          onValueChange={(val) => setCurrency(val)}
          options={CURRENCY_OPTIONS}
        />
      </div>

      {/* Invoice Date, Payment Terms & Calculated Due Date Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Input
          id="shared-invoice-date"
          label="Invoice Date *"
          type="date"
          value={invoiceDate}
          onChange={(e) => handleInvoiceDateChange(e.target.value)}
          leftIcon={<Calendar size={15} strokeWidth={1.75} />}
          error={fieldErrors.invoiceDate}
          required
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
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="shared-invoice-due-date" className="text-label text-neutral-700 dark:text-zinc-300 font-medium">
              Due Date *
            </label>
            {isDueDateOverridden ? (
              <button
                type="button"
                onClick={handleResetDueDateToAuto}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw size={10} />
                <span>Reset to auto</span>
              </button>
            ) : (
              <span className="text-[11px] font-mono text-neutral-500 dark:text-zinc-400">
                Auto: +{paymentTerms} days
              </span>
            )}
          </div>
          <Input
            id="shared-invoice-due-date"
            type="date"
            value={dueDate}
            onChange={(e) => handleDueDateChange(e.target.value)}
            leftIcon={<Calendar size={15} strokeWidth={1.75} />}
            error={fieldErrors.dueDate}
            required
          />
        </div>
      </div>

      {/* Itemized Line Items Table */}
      <div className="space-y-2.5 pt-2 border-t border-neutral-200/80 dark:border-zinc-800/80">
        <div className="flex items-center justify-between">
          <label className="text-body-sm font-semibold text-neutral-900 dark:text-zinc-100 flex items-center gap-1.5">
            <span>Itemized Invoice Lines</span>
            <span className="text-micro font-mono bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400 px-2 py-0.5 rounded-full font-medium">
              {lines.length} {lines.length === 1 ? "line" : "lines"}
            </span>
          </label>
        </div>

        <div className="rounded-lg border border-neutral-200 dark:border-zinc-800 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-sm">
              <thead className="bg-neutral-50 dark:bg-zinc-900/90 border-b border-neutral-200 dark:border-zinc-800 text-caption font-semibold text-neutral-600 dark:text-zinc-400">
                <tr>
                  <th className="py-2.5 px-3 w-8 text-center font-mono">#</th>
                  <th className="py-2.5 px-3 min-w-[220px]">Description *</th>
                  <th className="py-2.5 px-3 w-20 text-right">Qty</th>
                  <th className="py-2.5 px-3 w-28 text-right">Unit Rate ({currency})</th>
                  <th className="py-2.5 px-3 w-36 text-right">{taxConfig.taxIdLabel.split(" ")[0]} / Tax</th>
                  <th className="py-2.5 px-3 w-32 text-right">Total ({currency})</th>
                  <th className="py-2.5 px-2 w-10 text-center" aria-label="Actions" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                {lines.map((l, index) => {
                  const lineNet = (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
                  const lineTax = (lineNet * (Number(l.taxRate) || 0)) / 100;
                  const lineTotal = lineNet + lineTax;

                  return (
                    <tr key={l.id ?? index} className="hover:bg-neutral-50/50 dark:hover:bg-zinc-800/40">
                      <td className="py-2 px-3 text-center font-mono text-micro text-neutral-500">
                        {index + 1}
                      </td>
                      <td className="py-2 px-2">
                        <input
                          id={`invoice-line-${l.id ?? index}-desc`}
                          name={`line_${l.id ?? index}_desc`}
                          autoComplete="off"
                          aria-label={`Line ${index + 1} item description`}
                          type="text"
                          value={l.description}
                          onChange={(e) => handleUpdateLine(l.id ?? String(index), "description", e.target.value)}
                          placeholder="Item description or service..."
                          className="w-full h-8 px-2.5 rounded text-body-sm border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-neutral-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <input
                          id={`invoice-line-${l.id ?? index}-qty`}
                          name={`line_${l.id ?? index}_qty`}
                          autoComplete="off"
                          aria-label={`Line ${index + 1} quantity`}
                          type="number"
                          min="1"
                          value={l.quantity}
                          onChange={(e) => handleUpdateLine(l.id ?? String(index), "quantity", Number(e.target.value))}
                          className="w-16 h-8 px-2 rounded text-body-sm font-mono text-right border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-neutral-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none tabular-nums"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <input
                          id={`invoice-line-${l.id ?? index}-rate`}
                          name={`line_${l.id ?? index}_rate`}
                          autoComplete="off"
                          aria-label={`Line ${index + 1} unit price`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={l.unitPrice}
                          onChange={(e) => handleUpdateLine(l.id ?? String(index), "unitPrice", Number(e.target.value))}
                          className="w-24 h-8 px-2 rounded text-body-sm font-mono text-right border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-neutral-900 dark:text-zinc-100 focus:border-indigo-500 focus:outline-none tabular-nums"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <Select
                          id={`invoice-line-${l.id ?? index}-tax`}
                          name={`line_${l.id ?? index}_tax`}
                          aria-label={`Line ${index + 1} tax rate`}
                          value={String(l.taxRate ?? taxConfig.defaultRate)}
                          onValueChange={(val) => handleUpdateLine(l.id ?? String(index), "taxRate", Number(val))}
                          options={taxSlabOptions}
                          size="sm"
                          containerClassName="w-36 ml-auto"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-neutral-900 dark:text-zinc-100 tabular-nums">
                        {formatCurrency(lineTotal, currency)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          disabled={lines.length <= 1}
                          onClick={() => handleRemoveLine(l.id ?? String(index))}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-neutral-100 dark:hover:bg-zinc-800 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          aria-label={`Remove line ${index + 1}`}
                          title="Remove line item"
                        >
                          <X size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Line Item Button (Placed Naturally Below Table) */}
        <div className="flex items-center justify-between pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddLine}
            className="h-8 text-caption gap-1.5 px-3 font-medium text-neutral-700 dark:text-zinc-300"
          >
            <Plus size={13} />
            <span>Add Line Item</span>
          </Button>

          <span className="text-micro font-mono text-neutral-500 dark:text-zinc-400">
            {lines.length} item {lines.length === 1 ? "row" : "rows"} in schedule
          </span>
        </div>
      </div>

      {/* Live Financial Summary & Accounting Reconciliation Banner */}
      <div className="p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-neutral-50/70 dark:bg-zinc-900/60 space-y-3.5">
        <div className="grid grid-cols-3 gap-3 text-center border-b border-neutral-200/80 dark:border-zinc-800/80 pb-3">
          <div>
            <span className="text-micro font-medium text-neutral-500 uppercase tracking-wider">Subtotal</span>
            <p className="text-body font-mono font-semibold text-neutral-900 dark:text-zinc-100 tabular-nums">
              {formatCurrency(calculatedSubtotal, currency)}
            </p>
          </div>
          <div>
            <span className="text-micro font-medium text-neutral-500 uppercase tracking-wider">Tax Total</span>
            <p className="text-body font-mono font-semibold text-neutral-900 dark:text-zinc-100 tabular-nums">
              {formatCurrency(calculatedTax, currency)}
            </p>
          </div>
          <div>
            <span className="text-micro font-medium text-neutral-500 uppercase tracking-wider">Calculated Total</span>
            <p className="text-body font-mono font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
              {formatCurrency(reconciledTotal, currency)}
            </p>
          </div>
        </div>

        {/* Arithmetic Reconciliation Status & Document Stated Amount */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {isMathReconciled ? (
              <span className="inline-flex items-center gap-1.5 text-caption font-mono font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-900/60">
                <CheckCircle2 size={14} strokeWidth={2.2} />
                <span>Totals Reconcile: Line items match invoice total</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-caption font-mono font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-3 py-1 rounded-full border border-amber-300 dark:border-amber-900/60">
                <AlertTriangle size={14} strokeWidth={2.2} />
                <span>Variance: Differs by {formatCurrency(Math.abs(variance), currency)}</span>
              </span>
            )}
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <span className="text-caption text-neutral-600 dark:text-zinc-400 font-medium">
                Amount printed on invoice:
              </span>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    clearFieldError("totalAmount");
                  }}
                  className="w-32 h-8 px-2 font-mono text-body-sm font-bold text-right border border-neutral-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-neutral-900 dark:text-zinc-100 rounded-md focus:border-indigo-500 focus:outline-none tabular-nums"
                  aria-label="Amount printed on invoice"
                />
              </div>
            </div>
            {fieldErrors.totalAmount && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium text-right">
                {fieldErrors.totalAmount}
              </p>
            )}
          </div>
        </div>

        {/* Form Validation Readiness Status (Separate from Math Reconciled) */}
        <div className="pt-2 border-t border-neutral-200/60 dark:border-zinc-800/60 text-micro">
          {!isFormComplete ? (
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium">
              <AlertTriangle size={13} className="shrink-0" />
              <span>
                Required fields incomplete: Please provide {missingRequiredFields.join(", ")} before verifying.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-neutral-500 dark:text-zinc-400 font-medium">
              <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>All mandatory invoice header fields and accounting line items completed.</span>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Actions Row */}
      <div className="pt-3 border-t border-neutral-200/60 dark:border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-caption text-neutral-600 dark:text-zinc-400">
          <span>
            {mode === "create"
              ? "Automated capture and validation pipeline executes upon receipt."
              : purchaseOrderId !== "none" && selectedPo
              ? `Submitting records verified invoice data and initiates 3-way matching against ${selectedPo.poNumber}.`
              : "Submitting records verified invoice data and initiates 2-way matching for non-PO approval."}
          </span>
        </div>

        <div className="flex items-center justify-end gap-3">
          <span className="text-micro font-mono text-neutral-500 dark:text-zinc-400 hidden sm:inline">
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
            disabled={submitting || !isFormComplete}
            title={!isFormComplete ? `Please complete: ${missingRequiredFields.join(", ")}` : undefined}
            className="h-10 px-6 font-semibold text-body-sm gap-2 shadow-sm"
          >
            {mode === "create" ? (
              <>
                <Inbox size={16} />
                <span>{submitting ? "Receiving Invoice..." : "Receive Invoice"}</span>
              </>
            ) : (
              <>
                <span>{submitting ? "Processing..." : "Verify & Start Matching"}</span>
                <ArrowRight size={15} />
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
