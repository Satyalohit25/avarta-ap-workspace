import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Ban,
  Send,
  Sparkles,
  Layers,
  FileText,
  History,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Receipt,
  RotateCcw,
} from "lucide-react";
import { formatCurrency } from "../../../lib/formatters";
import { Button } from "../../../components/ui/Button";

export type WorkspaceViewMode = "split" | "threeway" | "audit";

export interface ExecutiveDecisionHubProps {
  invoiceId: string;
  invoiceNumber: string;
  currency: string;
  totalAmount: number | string;
  supplierName?: string | null;
  purchaseOrderId?: string | null;
  status: string;
  openException?: {
    id: string;
    type?: string;
    title: string;
    description?: string;
    severity?: string;
  } | null;
  onResolveException?: (exceptionId: string, resolution: string) => Promise<void>;
  viewMode: WorkspaceViewMode;
  onChangeViewMode: (mode: WorkspaceViewMode) => void;
  isActionPending?: boolean;
}

export function ExecutiveDecisionHub({
  invoiceNumber,
  currency,
  totalAmount,
  supplierName,
  purchaseOrderId,
  status,
  openException,
  onResolveException,
  viewMode,
  onChangeViewMode,
  isActionPending = false,
}: ExecutiveDecisionHubProps) {
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);

  const numAmount = Number(totalAmount) || 0;
  const hasException = Boolean(openException);
  const isPostCapture = status !== "RECEIVED";

  // Pre-calculated financial parameters (demo-safe math)
  const isPriceVariance =
    openException?.type === "PRICE_DIFFERENCE" ||
    openException?.title?.toLowerCase().includes("rate") ||
    openException?.title?.toLowerCase().includes("price");

  const isQtyVariance =
    openException?.type === "QUANTITY_DIFFERENCE" ||
    openException?.title?.toLowerCase().includes("quantity");

  // Synthetic rate calculations matching the invoice
  const poContractRate = 4850;
  const billedRate = 5200;
  const rateDiff = billedRate - poContractRate; // ₹350
  const rateDiffPct = ((rateDiff / poContractRate) * 100).toFixed(1); // 7.2%
  const totalBilledQty = 8;
  const acceptedGrnQty = 7;
  const damagedQty = 1;
  const debitNoteAmount = rateDiff * acceptedGrnQty; // ₹2,450 (or ₹2,800 on 8)
  const shortfallAmount = damagedQty * billedRate; // ₹5,200

  async function handleApplyRemedy(remedyType: "DEBIT_NOTE" | "SHORTFALL" | "TOLERANCE" | "REVISE") {
    if (!openException || !onResolveException) return;
    setSubmittingAction(remedyType);

    try {
      let resolutionNote = "";
      if (remedyType === "DEBIT_NOTE") {
        resolutionNote = `[DEBIT NOTE APPLIED: ${formatCurrency(debitNoteAmount, currency)}] Statutory debit note generated for rate discrepancy (+${rateDiffPct}%). Net PO payable approved.`;
      } else if (remedyType === "SHORTFALL") {
        resolutionNote = `[SHORTFALL DOCKED: ${damagedQty} Unit (${formatCurrency(shortfallAmount, currency)})] Transit damage withheld. Net 7 certified accepted units passed for payment.`;
      } else if (remedyType === "TOLERANCE") {
        resolutionNote = `[MANAGER TOLERANCE APPLIED] Minor operational variance accepted per AP Finance policy guideline section 4.2.`;
      } else if (remedyType === "REVISE") {
        resolutionNote = `[REVISED TAX INVOICE REQUESTED] Dispatched formal supplier query to ${supplierName ?? "vendor"} requesting corrected bill matching PO #${purchaseOrderId ?? "PO-FY26-0881"}.`;
      }

      await onResolveException(openException.id, resolutionNote);
    } finally {
      setSubmittingAction(null);
    }
  }

  return (
    <div id="executive-decision-hub" className="space-y-3">
      {/* ── 1. The Executive Decision Hub: Verdict & 1-Click Remedies ── */}
      {hasException && isPostCapture ? (
        <div className="rounded-xl border border-amber-300 dark:border-amber-800/80 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/40 dark:via-amber-950/20 p-4 sm:p-5 shadow-xs transition-all">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left: Root Cause Diagnostic & Financial Exposure */}
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-micro font-mono font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                  <AlertTriangle size={13} className="shrink-0" />
                  <span>ACTION REQUIRED • {openException?.type ?? "MATCH_EXCEPTION"}</span>
                </span>
                <span className="text-micro font-mono text-neutral-500 dark:text-zinc-400">
                  Corporate Tolerance Limit: <strong>5.0%</strong>
                </span>
              </div>

              <h2 className="text-body font-bold text-neutral-900 dark:text-zinc-50 tracking-tight">
                {openException?.title ?? "Line Item Rate Discrepancy Exceeds Tolerance (+7.2%)"}
              </h2>

              <p className="text-caption text-neutral-600 dark:text-zinc-300 leading-relaxed font-sans">
                PO <span className="font-mono font-semibold">{purchaseOrderId ?? "PO-FY26-0881"}</span> contracted{" "}
                <strong className="font-mono">{formatCurrency(poContractRate, currency)}/unit</strong>; {supplierName ?? "Tata Steel"}{" "}
                billed <strong className="font-mono text-amber-700 dark:text-amber-300">{formatCurrency(billedRate, currency)}/unit</strong>{" "}
                (+{rateDiffPct}% variance). Goods Receipt confirmed {acceptedGrnQty} accepted units ({damagedQty} transit damaged).
              </p>

              {/* Exposure metric summary chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-micro font-mono">
                <span className="px-2 py-0.5 rounded bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-700 dark:text-zinc-300">
                  Net Variance Exposure: <strong className="text-amber-700 dark:text-amber-300">+{formatCurrency(debitNoteAmount, currency)}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-700 dark:text-zinc-300">
                  Transit Shortfall: <strong className="text-rose-700 dark:text-rose-300">{damagedQty} Unit ({formatCurrency(shortfallAmount, currency)})</strong>
                </span>
              </div>
            </div>

            {/* Right: 1-Click Policy Remedies (AI Suggests, Humans Decide) */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 justify-center">
              <span className="text-micro font-mono font-semibold text-neutral-500 dark:text-zinc-400 uppercase tracking-wider hidden lg:block">
                Authorized 1-Click Policy Remedies:
              </span>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleApplyRemedy("DEBIT_NOTE")}
                  disabled={isActionPending || submittingAction !== null}
                  className="h-8 text-micro font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs gap-1.5"
                  title="Generate statutory debit note for unauthorized variance and approve net amount"
                >
                  <FileCheck2 size={13} />
                  <span>
                    {submittingAction === "DEBIT_NOTE" ? "Applying..." : `Apply Debit Note (${formatCurrency(debitNoteAmount, currency)})`}
                  </span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleApplyRemedy("SHORTFALL")}
                  disabled={isActionPending || submittingAction !== null}
                  className="h-8 text-micro font-medium gap-1.5 border-neutral-300 dark:border-zinc-700"
                  title="Dock damaged item shortfall from payment"
                >
                  <Ban size={13} className="text-rose-600 dark:text-rose-400" />
                  <span>
                    {submittingAction === "SHORTFALL" ? "Withholding..." : `Withhold Shortfall (${formatCurrency(shortfallAmount, currency)})`}
                  </span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleApplyRemedy("TOLERANCE")}
                  disabled={isActionPending || submittingAction !== null}
                  className="h-8 text-micro font-medium text-neutral-700 dark:text-zinc-300 hover:bg-neutral-200/60 dark:hover:bg-zinc-800"
                  title="Sign off variance within executive discretion"
                >
                  <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Discretionary Sign-Off</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleApplyRemedy("REVISE")}
                  disabled={isActionPending || submittingAction !== null}
                  className="h-8 text-micro font-medium text-neutral-700 dark:text-zinc-300 hover:bg-neutral-200/60 dark:hover:bg-zinc-800"
                  title="Send vendor inquiry requesting updated invoice"
                >
                  <Send size={13} className="text-neutral-500" />
                  <span>Request Revision</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : status === "APPROVED" || status === "SCHEDULED" || status === "PAID" || status === "SYNCED" ? (
        <div className="rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/40 dark:via-emerald-950/20 px-4 py-3 flex items-center justify-between text-body-sm shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} strokeWidth={2.5} />
            </div>
            <div>
              <span className="font-bold text-neutral-900 dark:text-zinc-100 text-body-sm">
                3-Way Match Reconciled &amp; Certified
              </span>
              <p className="text-micro text-neutral-600 dark:text-zinc-400">
                All contract quantities and unit rates verified against PO {purchaseOrderId ?? "PO-FY26-0881"}. Ready for payment execution and ERP journal sync.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 text-micro font-mono font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck size={13} />
            <span>0.0% Variance</span>
          </span>
        </div>
      ) : null}

      {/* ── 2. Cognitive Chunking: Workspace View Modes (Segmented Control) ── */}
      <div className="flex items-center justify-between gap-3 bg-neutral-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-neutral-200/70 dark:border-zinc-700/60">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChangeViewMode("split")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-semibold transition-all cursor-pointer ${
              viewMode === "split"
                ? "bg-white dark:bg-zinc-900 text-indigo-700 dark:text-indigo-300 shadow-xs border border-neutral-200 dark:border-zinc-700"
                : "text-neutral-600 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-200"
            }`}
            title="Side-by-side: Document Scan + Extracted Fields (Shortcut: 1)"
          >
            <FileText size={14} className={viewMode === "split" ? "text-indigo-600 dark:text-indigo-400" : "text-neutral-400"} />
            <span>Split Verification</span>
            <kbd className="hidden sm:inline-block font-mono text-[9px] px-1 py-0.2 rounded bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-400">1</kbd>
          </button>

          <button
            type="button"
            onClick={() => onChangeViewMode("threeway")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-semibold transition-all cursor-pointer ${
              viewMode === "threeway"
                ? "bg-white dark:bg-zinc-900 text-indigo-700 dark:text-indigo-300 shadow-xs border border-neutral-200 dark:border-zinc-700"
                : "text-neutral-600 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-200"
            }`}
            title="Focused Full-Width 3-Way Reconciliation Workbench (Shortcut: 2)"
          >
            <Layers size={14} className={viewMode === "threeway" ? "text-indigo-600 dark:text-indigo-400" : "text-neutral-400"} />
            <span>3-Way Match Reconciler</span>
            {hasException && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
            <kbd className="hidden sm:inline-block font-mono text-[9px] px-1 py-0.2 rounded bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-400">2</kbd>
          </button>

          <button
            type="button"
            onClick={() => onChangeViewMode("audit")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-semibold transition-all cursor-pointer ${
              viewMode === "audit"
                ? "bg-white dark:bg-zinc-900 text-indigo-700 dark:text-indigo-300 shadow-xs border border-neutral-200 dark:border-zinc-700"
                : "text-neutral-600 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-200"
            }`}
            title="Chronological Audit History & Lifecycle Transitions (Shortcut: 3)"
          >
            <History size={14} className={viewMode === "audit" ? "text-indigo-600 dark:text-indigo-400" : "text-neutral-400"} />
            <span>Audit Trail &amp; Lifecycle</span>
            <kbd className="hidden sm:inline-block font-mono text-[9px] px-1 py-0.2 rounded bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-400">3</kbd>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 pr-2 text-micro text-neutral-500 font-mono">
          <span>Mode: <strong className="text-neutral-800 dark:text-zinc-200 capitalize">{viewMode}</strong></span>
        </div>
      </div>
    </div>
  );
}
