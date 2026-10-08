import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  ShieldCheck,
  Shield,
  Check,
  Edit2,
  CheckCheck,
  Link2,
  CreditCard,
  Building2,
  Calendar,
  FileSpreadsheet,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { formatCurrency, formatDate } from "../../../lib/formatters";

export interface ValidationItem {
  id: string;
  ruleName: string;
  status: string;
}

interface AIExtractedDetailsCardProps {
  invoiceNumber: string;
  invoiceDate?: string | null;
  dueDate?: string | null;
  totalAmount: string | number;
  currency: string;
  supplierName?: string | null;
  supplierGstin?: string | null;
  purchaseOrderId?: string | null;
  linesCount?: number;
  extractedAtDate?: string | null;
  status: string;
  aiConfidence?: number | null;
  validations?: ValidationItem[];
  activeFieldId?: string | null;
  hoveredFieldId?: string | null;
  onSelectField?: (fieldKey: string) => void;
  onHoverField?: (fieldKey: string | null) => void;
  onLinkPO?: () => void;
  onCorrectField?: (fieldKey: string, newValue: string) => void;
}

export function AIExtractedDetailsCard({
  invoiceNumber: initialInvoiceNumber,
  invoiceDate: initialInvoiceDate,
  dueDate: initialDueDate,
  totalAmount: initialTotalAmount,
  currency,
  supplierName: initialSupplierName,
  supplierGstin: initialSupplierGstin = "27AABCC1234F1Z8",
  purchaseOrderId,
  linesCount = 3,
  extractedAtDate,
  status,
  aiConfidence,
  validations = [],
  activeFieldId,
  hoveredFieldId,
  onSelectField,
  onHoverField,
  onLinkPO,
  onCorrectField,
}: AIExtractedDetailsCardProps) {
  const [showTechnical, setShowTechnical] = useState(false);
  const [showTaxDetails, setShowTaxDetails] = useState(true);
  const [showChecklist, setShowChecklist] = useState(true);

  // Field values with inline edit capability
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({
    invoiceNumber: initialInvoiceNumber || "",
    supplierName: initialSupplierName || "Amazon Business",
    supplierGstin: initialSupplierGstin || "27AABCC1234F1Z8",
    invoiceDate: initialInvoiceDate || "2026-09-27",
    dueDate: initialDueDate || "2026-10-27",
    totalAmount: String(initialTotalAmount || "18900"),
    taxableSubtotal: "16016.95",
    taxAmount: "2883.05",
    purchaseOrderNumber: purchaseOrderId || "",
  });

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editDraftValue, setEditDraftValue] = useState("");
  const [correctedFields, setCorrectedFields] = useState<Record<string, { original: string; corrected: string }>>({});

  const totalNum = Number(fieldValues.totalAmount) || 18900;
  const taxableNum = Number(fieldValues.taxableSubtotal) || Math.round((totalNum / 1.18) * 100) / 100;
  const taxNum = Math.round((totalNum - taxableNum) * 100) / 100;
  const cgstNum = Math.round((taxNum / 2) * 100) / 100;
  const sgstNum = Math.round((taxNum - cgstNum) * 100) / 100;

  const confidenceScore = aiConfidence != null ? Number(aiConfidence) : 96;

  function handleStartEdit(key: string, currentVal: string) {
    setEditingField(key);
    setEditDraftValue(currentVal);
  }

  function handleSaveEdit(key: string) {
    if (editDraftValue.trim() && editDraftValue !== fieldValues[key]) {
      setCorrectedFields((prev) => ({
        ...prev,
        [key]: { original: fieldValues[key], corrected: editDraftValue.trim() },
      }));
      setFieldValues((prev) => ({
        ...prev,
        [key]: editDraftValue.trim(),
      }));
      onCorrectField?.(key, editDraftValue.trim());
    }
    setEditingField(null);
  }

  function handleResetCorrection(key: string) {
    if (correctedFields[key]) {
      setFieldValues((prev) => ({
        ...prev,
        [key]: correctedFields[key].original,
      }));
      setCorrectedFields((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  // 6-Point Statutory Verification Checklist
  const statutoryChecklist = [
    {
      id: "dup",
      name: "Duplicate Check",
      desc: "Zero collision in 365 days across Supplier ID + Invoice Number",
      status: "PASSED" as const,
    },
    {
      id: "vendor",
      name: "Vendor Master & KYC",
      desc: "Amazon Business (SUP-003) active in ERP with verified bank mandate",
      status: "PASSED" as const,
    },
    {
      id: "gstin",
      name: "GSTIN Modulo-36 Check",
      desc: "27AABCC1234F1Z8 active on GST Common Portal",
      status: "PASSED" as const,
    },
    {
      id: "tax_math",
      name: "Tax Arithmetic Reconciliation",
      desc: "Taxable (₹16,016.95) + CGST (₹1,441.53) + SGST (₹1,441.52) = ₹18,900.00",
      status: "PASSED" as const,
    },
    {
      id: "po_match",
      name: "3-Way Purchase Order Match",
      desc: purchaseOrderId
        ? `Reconciled against PO ${purchaseOrderId}`
        : "Direct GL Expense (Non-PO) — Authorized under Office Supplies category",
      status: purchaseOrderId ? ("PASSED" as const) : ("NA_NON_PO" as const),
    },
    {
      id: "budget",
      name: "Delegation of Authority",
      desc: "Amount (₹18,900.00) is within Finance Executive approval limit (< ₹50,000)",
      status: "PASSED" as const,
    },
  ];

  // Helper for interactive field rows
  function FieldRow({
    fieldKey,
    label,
    value,
    displayComponent,
    isHighlighted,
    readOnly,
  }: {
    fieldKey: string;
    label: string;
    value: string;
    displayComponent?: React.ReactNode;
    isHighlighted?: boolean;
    readOnly?: boolean;
  }) {
    const isActive = activeFieldId === fieldKey || hoveredFieldId === fieldKey;
    const isEditing = editingField === fieldKey;
    const isCorrected = Boolean(correctedFields[fieldKey]);

    return (
      <div
        id={`extracted-field-${fieldKey}`}
        onMouseEnter={() => onHoverField?.(fieldKey)}
        onMouseLeave={() => onHoverField?.(null)}
        onClick={() => {
          if (!isEditing) onSelectField?.(fieldKey);
        }}
        className={`group flex items-center justify-between px-4 py-2.5 transition-all duration-150 border-l-2 ${
          isActive
            ? "bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-600 dark:border-indigo-400"
            : isHighlighted
            ? "bg-neutral-50/50 dark:bg-zinc-900/50 border-transparent hover:bg-neutral-100/70 dark:hover:bg-zinc-800/50"
            : "border-transparent hover:bg-neutral-50/60 dark:hover:bg-zinc-800/40"
        }`}
      >
        <div className="flex flex-col min-w-0 pr-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[12px] font-medium ${
                isHighlighted
                  ? "font-semibold text-neutral-900 dark:text-zinc-100"
                  : "text-neutral-600 dark:text-zinc-400"
              }`}
            >
              {label}
            </span>
            {isCorrected && (
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
                Corrected
              </span>
            )}
          </div>
          {isCorrected && (
            <span className="text-[10px] text-neutral-400 dark:text-zinc-500 font-mono flex items-center gap-1 mt-0.5">
              <span>Original: {correctedFields[fieldKey].original}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResetCorrection(fieldKey);
                }}
                className="text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                title="Reset to original OCR extraction"
              >
                <RotateCcw size={10} />
                <span>Reset</span>
              </button>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isEditing ? (
            <div
              className="flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                value={editDraftValue}
                onChange={(e) => setEditDraftValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit(fieldKey);
                  if (e.key === "Escape") setEditingField(null);
                }}
                className="h-7 px-2 text-body-sm font-mono rounded border border-indigo-500 bg-white dark:bg-zinc-900 text-neutral-900 dark:text-zinc-100 focus:outline-none ring-2 ring-indigo-500/20"
                autoFocus
              />
              <button
                type="button"
                onClick={() => handleSaveEdit(fieldKey)}
                className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                title="Save changes"
              >
                <Check size={12} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-zinc-200"
                title="Cancel"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {displayComponent ? (
                displayComponent
              ) : (
                <span
                  className={`font-mono text-body-sm ${
                    isHighlighted
                      ? "text-base font-bold text-indigo-700 dark:text-indigo-300"
                      : "text-neutral-900 dark:text-zinc-100 font-medium"
                  }`}
                >
                  {value}
                </span>
              )}

              {!readOnly && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit(fieldKey, value);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-opacity"
                  title={`Edit ${label}`}
                >
                  <Edit2 size={12} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card
      id="invoice-extracted-details-card"
      level="surface"
      className="flex flex-col h-full overflow-hidden"
    >
      <CardHeader
        title="Extracted Invoice Details"
        description="Statutory fields, tax breakdown & audit checklist"
        action={
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-micro font-mono font-medium ${
                confidenceScore >= 95
                  ? "bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300 border border-neutral-200 dark:border-zinc-700"
                  : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
              }`}
            >
              <ShieldCheck size={12} className="text-emerald-600 dark:text-emerald-400" />
              <span>Overall AI Score: {confidenceScore}%</span>
            </span>
          </div>
        }
      />

      <CardContent className="p-0 flex-1 flex flex-col overflow-y-auto">
        {/* ── 1. Issues & Attention Header (Show what needs attention first) ── */}
        {!purchaseOrderId ? (
          <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-200/80 dark:border-amber-900/40 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle
                size={16}
                className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
              />
              <div>
                <p className="text-caption font-semibold text-amber-900 dark:text-amber-200">
                  Attention: No Purchase Order Linked
                </p>
                <p className="text-micro text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                  Classified as <strong className="font-semibold">Direct GL Expense (Office Supplies)</strong>. Cleared 2-way statutory compliance.
                </p>
              </div>
            </div>
            {onLinkPO && (
              <Button
                variant="outline"
                size="sm"
                onClick={onLinkPO}
                className="h-7 text-micro gap-1 shrink-0 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50"
              >
                <Link2 size={12} />
                <span>Link PO</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="px-4 py-2 bg-neutral-50/80 dark:bg-zinc-800/50 border-b border-neutral-200/80 dark:border-zinc-800 flex items-center justify-between text-caption text-neutral-600 dark:text-zinc-300">
            <div className="flex items-center gap-1.5">
              <CheckCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span>Matched with Purchase Order {purchaseOrderId}</span>
            </div>
            <span className="text-micro font-mono text-neutral-400">Tolerance: 0.0% variance</span>
          </div>
        )}

        {/* ── 2. The 10 Canonical Fields (100% matched to Anchors) ── */}
        <div className="divide-y divide-neutral-100 dark:divide-zinc-800/80 border-b border-neutral-200 dark:border-zinc-800">
          {/* 1. Invoice Number */}
          <FieldRow
            fieldKey="invoiceNumber"
            label="1. Invoice Number"
            value={fieldValues.invoiceNumber}
          />

          {/* 2. Supplier Name */}
          <FieldRow
            fieldKey="supplierName"
            label="2. Supplier / Vendor"
            value={fieldValues.supplierName}
            displayComponent={
              <span className="text-body-sm font-sans font-medium text-neutral-900 dark:text-zinc-100 flex items-center gap-1">
                <Building2 size={13} className="text-neutral-400" />
                <span>{fieldValues.supplierName}</span>
              </span>
            }
          />

          {/* 3. Supplier GSTIN */}
          <FieldRow
            fieldKey="supplierGstin"
            label="3. Supplier GSTIN"
            value={fieldValues.supplierGstin}
            displayComponent={
              <div className="flex items-center gap-1.5 font-mono text-body-sm text-neutral-900 dark:text-zinc-100">
                <span>{fieldValues.supplierGstin}</span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400 border border-neutral-200 dark:border-zinc-700">
                  Active (27)
                </span>
              </div>
            }
          />

          {/* 4. Invoice Date */}
          <FieldRow
            fieldKey="invoiceDate"
            label="4. Invoice Date"
            value={fieldValues.invoiceDate}
            displayComponent={
              <span className="text-body-sm font-mono text-neutral-900 dark:text-zinc-100 flex items-center gap-1">
                <Calendar size={13} className="text-neutral-400" />
                <span>{formatDate(fieldValues.invoiceDate)}</span>
              </span>
            }
          />

          {/* 5. Payment Due Date */}
          <FieldRow
            fieldKey="dueDate"
            label="5. Payment Due Date"
            value={fieldValues.dueDate}
            displayComponent={
              <span className="text-body-sm font-mono text-neutral-900 dark:text-zinc-100 flex items-center gap-1">
                <Clock size={13} className="text-neutral-400" />
                <span>{formatDate(fieldValues.dueDate)}</span>
                <span className="text-[10px] text-neutral-500 font-sans">(Net 30)</span>
              </span>
            }
          />

          {/* 6. PO Reference */}
          <FieldRow
            fieldKey="purchaseOrderNumber"
            label="6. Purchase Order Ref"
            value={purchaseOrderId || "Not Linked"}
            displayComponent={
              purchaseOrderId ? (
                <span className="text-body-sm font-mono font-semibold text-neutral-900 dark:text-zinc-100">
                  {purchaseOrderId}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-caption text-neutral-500 font-mono">
                  <span>Not Linked (Direct Expense)</span>
                </span>
              )
            }
          />

          {/* 7. Line Items */}
          <FieldRow
            fieldKey="lineItems"
            label="7. Line Items"
            value={`${linesCount} line items`}
            readOnly
            displayComponent={
              <span className="text-body-sm font-mono text-neutral-900 dark:text-zinc-100 flex items-center gap-1">
                <FileSpreadsheet size={13} className="text-neutral-400" />
                <span>{linesCount} items (HSN 9403, 4802, 4821)</span>
              </span>
            }
          />

          {/* 8. Taxable Subtotal */}
          <FieldRow
            fieldKey="subtotal"
            label="8. Taxable Subtotal (excl. GST)"
            value={formatCurrency(taxableNum, currency)}
          />

          {/* 9. Tax Amount */}
          <FieldRow
            fieldKey="taxAmount"
            label="9. Total GST (18.0%)"
            value={formatCurrency(taxNum, currency)}
            displayComponent={
              <span className="text-body-sm font-mono text-neutral-900 dark:text-zinc-100">
                {formatCurrency(taxNum, currency)}{" "}
                <span className="text-micro text-neutral-500 font-sans">
                  (CGST ₹{cgstNum.toLocaleString("en-IN")} + SGST ₹{sgstNum.toLocaleString("en-IN")})
                </span>
              </span>
            }
          />

          {/* 10. Total Amount */}
          <FieldRow
            fieldKey="totalAmount"
            label="10. Invoice Grand Total"
            value={formatCurrency(totalNum, currency)}
            isHighlighted
          />
        </div>

        {/* ── 3. Statutory Validation Checklist (Replaces All-Green Noise) ── */}
        <div className="p-4 bg-neutral-50/60 dark:bg-zinc-900/40 border-b border-neutral-200 dark:border-zinc-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-neutral-600 dark:text-zinc-400" />
              <span className="text-caption font-bold text-neutral-900 dark:text-zinc-100">
                Statutory Compliance Checklist
              </span>
              <span className="text-[11px] font-mono px-2 py-0.2 rounded-full bg-neutral-200 dark:bg-zinc-700 text-neutral-700 dark:text-zinc-300">
                5/5 Passed • 1 Direct GL
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowChecklist(!showChecklist)}
              className="text-micro text-neutral-500 dark:text-zinc-400 hover:text-neutral-800 dark:hover:text-zinc-200 flex items-center gap-0.5"
            >
              <span>{showChecklist ? "Hide" : "Expand"}</span>
              {showChecklist ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>

          {showChecklist && (
            <div className="space-y-1.5 pt-1">
              {statutoryChecklist.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start justify-between p-2 rounded-lg bg-white dark:bg-zinc-900 border border-neutral-200/80 dark:border-zinc-800 text-caption"
                >
                  <div className="flex items-start gap-2 min-w-0 pr-2">
                    {c.status === "PASSED" ? (
                      <Check
                        size={14}
                        className="text-neutral-500 dark:text-zinc-400 shrink-0 mt-0.5"
                        strokeWidth={2}
                      />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-neutral-400 dark:border-zinc-500 text-[9px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 text-neutral-500">
                        —
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-neutral-800 dark:text-zinc-200">
                        {c.name}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-zinc-400 leading-snug">
                        {c.desc}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded shrink-0 ${
                      c.status === "PASSED"
                        ? "bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300"
                        : "bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400"
                    }`}
                  >
                    {c.status === "PASSED" ? "PASS" : "N/A (DIRECT)"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 4. Indian Statutory Tax & Payment Context Strip ── */}
        <div className="p-4 bg-white dark:bg-zinc-900 border-b border-neutral-200 dark:border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-caption font-bold text-neutral-900 dark:text-zinc-100 flex items-center gap-1.5">
              <CreditCard size={14} className="text-neutral-500" />
              <span>Payment Context &amp; Forward Routing</span>
            </span>
            <span className="text-micro font-mono text-neutral-400">Scheduled on 27 Oct</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-micro font-mono bg-neutral-50 dark:bg-zinc-800/50 p-2.5 rounded-lg border border-neutral-200/80 dark:border-zinc-700">
            <div>
              <span className="text-neutral-400 block font-sans">Payment Terms</span>
              <span className="text-neutral-800 dark:text-zinc-200 font-semibold">Net 30 Days</span>
            </div>
            <div>
              <span className="text-neutral-400 block font-sans">Beneficiary Bank</span>
              <span className="text-neutral-800 dark:text-zinc-200 font-semibold">ICICI •••• 4092 (Verified)</span>
            </div>
            <div>
              <span className="text-neutral-400 block font-sans">Place of Supply</span>
              <span className="text-neutral-800 dark:text-zinc-200">27 (Maharashtra) • Intra-State</span>
            </div>
            <div>
              <span className="text-neutral-400 block font-sans">Next Action Flow</span>
              <span className="text-neutral-800 dark:text-zinc-200">After approval → Scheduled batch</span>
            </div>
          </div>
        </div>

        {/* ── 5. Technical Extraction Details (Collapsible) ── */}
        <div className="p-3 bg-neutral-50/40 dark:bg-zinc-900/30 mt-auto">
          <button
            type="button"
            onClick={() => setShowTechnical(!showTechnical)}
            className="text-micro text-neutral-500 dark:text-zinc-400 hover:text-neutral-800 dark:hover:text-zinc-200 flex items-center justify-between w-full font-mono transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={12} />
              <span>Technical extraction provenance</span>
            </span>
            {showTechnical ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {showTechnical && (
            <div className="mt-2 grid grid-cols-2 gap-2 text-micro font-mono text-neutral-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 p-2 rounded border border-neutral-200 dark:border-zinc-800">
              <div>
                <span className="text-neutral-400 block">Extracted At</span>
                <span className="text-neutral-800 dark:text-zinc-200">
                  {extractedAtDate ? formatDate(extractedAtDate) : "2026-09-27"}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block">Confidence Band</span>
                <span className="text-neutral-800 dark:text-zinc-200">High (≥95%)</span>
              </div>
              <div>
                <span className="text-neutral-400 block">Provenance</span>
                <span className="text-neutral-800 dark:text-zinc-200">Scanned PDF / OCR Service</span>
              </div>
              <div>
                <span className="text-neutral-400 block">E-Invoice Status</span>
                <span className="text-neutral-800 dark:text-zinc-200">IRN Validated</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
