import { useState } from "react";
import { Building2, Calendar, FileCheck, Copy, Check, Hash, FileSpreadsheet, ShieldCheck } from "lucide-react";

export interface PropertyInspectorProps {
  vendorGstin?: string | null;
  paymentTerms?: string | null;
  matchingStatus?: "MATCHED" | "VARIANCE" | "DIRECT_EXPENSE" | "PENDING";
  linkedPo?: string | null;
  exportFormat?: string;
}

export function PropertyInspector({
  vendorGstin = "27AABCT3518Q1ZV",
  paymentTerms = "Net 30 Days",
  matchingStatus = "MATCHED",
  linkedPo,
  exportFormat = "Tally Prime XML / JSON",
}: PropertyInspectorProps) {
  const [copied, setCopied] = useState(false);

  function handleCopyGstin() {
    if (!vendorGstin) return;
    navigator.clipboard.writeText(vendorGstin).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-zinc-800 bg-neutral-50/50 dark:bg-zinc-900/50 divide-y divide-neutral-200/80 dark:divide-zinc-800/80 text-body-sm font-sans overflow-hidden">
      {/* 1. Vendor GSTIN */}
      <div className="p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-caption text-neutral-500 dark:text-zinc-400">
          <Hash size={14} className="text-neutral-400 shrink-0" />
          <span className="font-medium">Vendor GSTIN</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-caption font-semibold text-neutral-900 dark:text-zinc-100">
            {vendorGstin || "27AABCT3518Q1ZV"}
          </span>
          <button
            type="button"
            onClick={handleCopyGstin}
            className="p-1 rounded hover:bg-neutral-200/60 dark:hover:bg-zinc-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-zinc-200 transition-colors"
            title="Copy GSTIN"
          >
            {copied ? (
              <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy size={12} />
            )}
          </button>
        </div>
      </div>

      {/* 2. Payment Terms */}
      <div className="p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-caption text-neutral-500 dark:text-zinc-400">
          <Calendar size={14} className="text-neutral-400 shrink-0" />
          <span className="font-medium">Payment Terms</span>
        </div>
        <span className="font-medium text-caption text-neutral-800 dark:text-zinc-200">
          {paymentTerms || "Net 30 Days"}
        </span>
      </div>

      {/* 3. Matching Engine Status */}
      <div className="p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-caption text-neutral-500 dark:text-zinc-400">
          <ShieldCheck size={14} className="text-neutral-400 shrink-0" />
          <span className="font-medium">Engine Match</span>
        </div>
        <div>
          {matchingStatus === "MATCHED" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-micro font-mono font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <Check size={10} strokeWidth={2.5} />
              <span>3-Way Matched</span>
            </span>
          )}
          {matchingStatus === "VARIANCE" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-micro font-mono font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <span>Variance Flagged</span>
            </span>
          )}
          {matchingStatus === "DIRECT_EXPENSE" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-micro font-mono font-semibold bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-300 border border-neutral-200 dark:border-zinc-700">
              <span>Direct Expense</span>
            </span>
          )}
          {matchingStatus === "PENDING" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-micro font-mono font-semibold bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-300">
              <span>Pending Match</span>
            </span>
          )}
        </div>
      </div>

      {/* 4. Linked PO Reference (if applicable) */}
      {linkedPo && (
        <div className="p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-caption text-neutral-500 dark:text-zinc-400">
            <FileCheck size={14} className="text-neutral-400 shrink-0" />
            <span className="font-medium">Linked PO</span>
          </div>
          <span className="font-mono text-caption font-semibold text-neutral-800 dark:text-zinc-200">
            {linkedPo}
          </span>
        </div>
      )}

      {/* 5. Export Format (Static & factual) */}
      <div className="p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-caption text-neutral-500 dark:text-zinc-400">
          <FileSpreadsheet size={14} className="text-neutral-400 shrink-0" />
          <span className="font-medium">Export format</span>
        </div>
        <span className="text-micro font-mono text-neutral-600 dark:text-zinc-400">
          {exportFormat}
        </span>
      </div>
    </div>
  );
}
