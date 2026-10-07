import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Layers,
  FileText,
  History,
  ShieldCheck,
} from "lucide-react";
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
  const hasException = Boolean(openException);
  const isPostCapture = status !== "RECEIVED";

  return (
    <div id="executive-decision-hub" className="space-y-3">
      {/* ── 1. Exception Banner (only when real exception data exists) ── */}
      {hasException && isPostCapture ? (
        <div className="rounded-lg border border-amber-300 dark:border-amber-800/80 bg-amber-50/60 dark:bg-amber-950/30 p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left: Exception details from real data */}
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-micro font-mono font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                  <AlertTriangle size={13} className="shrink-0" />
                  <span>ACTION REQUIRED • {openException?.type ?? "EXCEPTION"}</span>
                </span>
              </div>

              <h2 className="text-body font-bold text-neutral-900 dark:text-zinc-50 tracking-tight">
                {openException?.title ?? "Exception requires resolution"}
              </h2>

              {openException?.description && (
                <p className="text-caption text-neutral-600 dark:text-zinc-300 leading-relaxed">
                  {openException.description}
                </p>
              )}
            </div>

            {/* Right: Navigate to resolve */}
            <div className="shrink-0">
              <span className="text-micro font-mono text-neutral-500 dark:text-zinc-400">
                Resolve this exception from the Exceptions workbench or the detail view.
              </span>
            </div>
          </div>
        </div>
      ) : status === "APPROVED" || status === "SCHEDULED" || status === "PAID" || status === "SYNCED" ? (
        <div className="rounded-lg border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/30 px-4 py-3 flex items-center justify-between text-body-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} strokeWidth={2.5} />
            </div>
            <div>
              <span className="font-bold text-neutral-900 dark:text-zinc-100 text-body-sm">
                Validation Passed
              </span>
              <p className="text-micro text-neutral-600 dark:text-zinc-400">
                Invoice {invoiceNumber} cleared all validation checks.{purchaseOrderId ? ` Matched against PO ${purchaseOrderId}.` : ""}
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 text-micro font-mono font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck size={13} />
            <span>Verified</span>
          </span>
        </div>
      ) : null}

      {/* ── 2. Workspace View Modes (Segmented Control) ── */}
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
            title="Full-Width 3-Way Reconciliation View (Shortcut: 2)"
          >
            <Layers size={14} className={viewMode === "threeway" ? "text-indigo-600 dark:text-indigo-400" : "text-neutral-400"} />
            <span>3-Way Match</span>
            {hasException && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
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
            <span>Audit Trail</span>
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
