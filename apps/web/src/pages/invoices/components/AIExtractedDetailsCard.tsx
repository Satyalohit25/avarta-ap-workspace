import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  ShieldCheck,
  Shield,
  Check,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "../../../components/ui/Card";
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
}

export function AIExtractedDetailsCard({
  invoiceNumber,
  invoiceDate,
  dueDate,
  totalAmount,
  currency,
  supplierName,
  purchaseOrderId,
  linesCount = 0,
  extractedAtDate,
  status,
  aiConfidence,
  validations = [],
  activeFieldId,
  hoveredFieldId,
  onSelectField,
  onHoverField,
}: AIExtractedDetailsCardProps) {
  const isPreCapture = status === "RECEIVED";
  const [showTechnical, setShowTechnical] = useState(false);
  const [showValidations, setShowValidations] = useState(false);

  // Only use actual AI confidence — no fabricated defaults
  const confidenceScore = aiConfidence != null ? Number(aiConfidence) : null;

  function renderConfidenceBadge(score: number | null) {
    if (score == null) {
      return (
        <span className="text-micro font-mono text-neutral-400 dark:text-zinc-500">
          Pending
        </span>
      );
    }
    const color =
      score >= 95
        ? "bg-emerald-500 ring-emerald-500/20"
        : score >= 80
        ? "bg-amber-500 ring-amber-500/20"
        : "bg-rose-500 ring-rose-500/20";
    return (
      <span
        title={`Extracted with ${score}% confidence`}
        aria-label={`${score}% confidence`}
        className="inline-flex items-center justify-center p-0.5"
      >
        <span className={`w-2 h-2 rounded-full ${color} ring-2`} />
      </span>
    );
  }

  const passedValidationCount = validations.filter((v) => v.status === "PASSED").length;
  const flaggedValidationCount = validations.filter((v) => v.status !== "PASSED").length;

  // Helper for interactive field rows
  function FieldRow({
    fieldKey,
    label,
    children,
    highlighted,
  }: {
    fieldKey: string;
    label: string;
    children: React.ReactNode;
    highlighted?: boolean;
  }) {
    const isActive = activeFieldId === fieldKey || hoveredFieldId === fieldKey;
    return (
      <div
        id={`extracted-field-${fieldKey}`}
        onMouseEnter={() => onHoverField?.(fieldKey)}
        onMouseLeave={() => onHoverField?.(null)}
        onClick={() => onSelectField?.(fieldKey)}
        className={`flex items-center justify-between px-5 cursor-pointer transition-all duration-150 ${
          highlighted ? "py-3" : "py-2.5"
        } ${
          isActive
            ? "bg-indigo-50/80 dark:bg-indigo-950/50 border-l-4 border-indigo-600 dark:border-indigo-400 shadow-2xs"
            : highlighted
            ? "bg-neutral-50/40 dark:bg-zinc-900/40 hover:bg-neutral-100/70 dark:hover:bg-zinc-800/50"
            : "hover:bg-neutral-50/60 dark:hover:bg-zinc-800/40"
        }`}
      >
        <span className={`text-caption ${highlighted ? "font-semibold text-neutral-900 dark:text-zinc-100" : "font-medium text-neutral-600 dark:text-zinc-300"}`}>
          {label}
        </span>
        <div className="flex items-center gap-3">
          {children}
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
        description="Key financial fields & confidence scoring"
        action={
          <div className="flex items-center gap-2">
            {confidenceScore != null ? (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-micro font-mono font-semibold ${
                  confidenceScore >= 95
                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : confidenceScore >= 80
                    ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                    : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                }`}
              >
                <ShieldCheck size={12} className="shrink-0" />
                <span>Confidence: {confidenceScore}%</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-micro font-mono bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400 px-2 py-0.5 rounded-full">
                <Clock size={11} />
                <span>Waiting capture</span>
              </span>
            )}
          </div>
        }
      />

      <CardContent className="p-0 flex-1 flex flex-col justify-between">
        {/* Core Extracted Fields */}
        <div className="divide-y divide-neutral-100 dark:divide-zinc-800/80">
          {/* Invoice Number */}
          <FieldRow fieldKey="invoiceNumber" label="Invoice Number">
            <span className="text-body-sm font-mono font-semibold text-neutral-900 dark:text-zinc-100">
              {invoiceNumber || "—"}
            </span>
            {renderConfidenceBadge(confidenceScore)}
          </FieldRow>

          {/* Supplier */}
          <FieldRow fieldKey="supplierName" label="Supplier">
            <span className="text-body-sm font-sans font-medium text-neutral-900 dark:text-zinc-100 truncate max-w-[180px]">
              {supplierName || "—"}
            </span>
            {renderConfidenceBadge(confidenceScore)}
          </FieldRow>

          {/* Invoice Date */}
          <FieldRow fieldKey="invoiceDate" label="Invoice Date">
            <span className="text-body-sm font-mono text-neutral-900 dark:text-zinc-100">
              {invoiceDate ? formatDate(invoiceDate) : "—"}
            </span>
            {renderConfidenceBadge(confidenceScore)}
          </FieldRow>

          {/* Due Date */}
          <FieldRow fieldKey="dueDate" label="Payment Due Date">
            <span className="text-body-sm font-mono text-neutral-900 dark:text-zinc-100">
              {dueDate ? formatDate(dueDate) : "—"}
            </span>
            {renderConfidenceBadge(confidenceScore)}
          </FieldRow>

          {/* PO Reference */}
          <FieldRow fieldKey="purchaseOrderNumber" label="PO Reference">
            <span className="text-body-sm font-mono font-semibold text-neutral-900 dark:text-zinc-100">
              {purchaseOrderId || "Not linked"}
            </span>
            {renderConfidenceBadge(purchaseOrderId ? confidenceScore : null)}
          </FieldRow>

          {/* Line Items */}
          <FieldRow fieldKey="lineItems" label="Line Items">
            <span className="text-body-sm font-mono text-neutral-900 dark:text-zinc-100">
              {linesCount > 0 ? `${linesCount} line item${linesCount > 1 ? "s" : ""}` : "—"}
            </span>
            {renderConfidenceBadge(linesCount > 0 ? confidenceScore : null)}
          </FieldRow>

          {/* Total Amount */}
          <FieldRow fieldKey="totalAmount" label="Invoice Total Amount" highlighted>
            <span className="text-body font-mono font-bold text-indigo-700 dark:text-indigo-300">
              {formatCurrency(totalAmount, currency)}
            </span>
            {renderConfidenceBadge(confidenceScore)}
          </FieldRow>
        </div>

        {/* Validation Checks & Technical Details */}
        <div className="p-4 bg-neutral-50/70 dark:bg-zinc-900/60 border-t border-neutral-200/80 dark:border-zinc-800 space-y-2 mt-auto">
          {/* Validation Status Strip */}
          {validations.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-caption">
                <Shield size={14} className="text-neutral-500 dark:text-zinc-400" />
                <span className="font-semibold text-neutral-700 dark:text-zinc-300">
                  Validation Checks:
                </span>
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                  {passedValidationCount} Passed
                </span>
                {flaggedValidationCount > 0 && (
                  <span className="text-amber-700 dark:text-amber-400 font-medium">
                    • {flaggedValidationCount} Flagged
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowValidations(!showValidations)}
                className="text-micro font-medium text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
              >
                <span>{showValidations ? "Hide rules" : "View rules"}</span>
                {showValidations ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>
          )}

          {/* Collapsible Validation Rules */}
          {showValidations && validations.length > 0 && (
            <div className="pt-2 pb-1 space-y-1.5">
              {validations.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-2 rounded-md bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 text-caption"
                >
                  <div className="flex items-center gap-2">
                    {v.status === "PASSED" ? (
                      <Check size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={2.5} />
                    ) : (
                      <AlertCircle size={13} className="text-amber-600 dark:text-amber-400 shrink-0" strokeWidth={2} />
                    )}
                    <span className="text-neutral-800 dark:text-zinc-200 font-medium font-mono">
                      {v.ruleName}
                    </span>
                  </div>
                  <span
                    className={`text-micro font-semibold ${
                      v.status === "PASSED"
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-amber-700 dark:text-amber-400"
                    }`}
                  >
                    {v.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Technical Extraction Details */}
          <div className="pt-1 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowTechnical(!showTechnical)}
              className="text-micro text-neutral-500 dark:text-zinc-400 hover:text-neutral-800 dark:hover:text-zinc-200 flex items-center gap-1 font-mono transition-colors"
            >
              <ShieldCheck size={12} />
              <span>Technical extraction details</span>
              {showTechnical ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            <span className="text-micro font-mono text-neutral-400 dark:text-zinc-500">
              {linesCount > 0 ? `${linesCount} line item${linesCount > 1 ? "s" : ""}` : "0 lines"}
            </span>
          </div>

          {showTechnical && (
            <div className="pt-2 pb-1 grid grid-cols-2 gap-2 text-micro font-mono text-neutral-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-neutral-200 dark:border-zinc-800">
              <div>
                <span className="text-neutral-400 block">Extracted At</span>
                <span className="text-neutral-800 dark:text-zinc-200">
                  {extractedAtDate ? formatDate(extractedAtDate) : "Pending"}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block">Confidence Band</span>
                <span className="text-neutral-800 dark:text-zinc-200">
                  {confidenceScore != null && confidenceScore >= 95 ? "High (≥95%)" : confidenceScore != null && confidenceScore >= 80 ? "Medium (80–94%)" : confidenceScore != null ? "Low (<80%)" : "Pending"}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block">Source Channel</span>
                <span className="text-neutral-800 dark:text-zinc-200">Digital Ingest</span>
              </div>
              <div>
                <span className="text-neutral-400 block">Line Items</span>
                <span className="text-neutral-800 dark:text-zinc-200">
                  {linesCount > 0 ? `${linesCount} extracted` : "Pending"}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
