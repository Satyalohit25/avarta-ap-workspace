import { useState } from "react";
import { CheckSquare, Zap, RefreshCw, X, ArrowRight, ArrowRightLeft, ArrowLeft, Link2, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { StatusBadge } from "../../../components/StatusBadge";
import { InvoiceWorkflowContext } from "../helpers/workflowContext";

interface InvoiceActionBarProps {
  context: InvoiceWorkflowContext;
  invoiceNumber: string;
  onAction: (actionKey: string) => void;
  isActionPending?: boolean;
}

export function InvoiceActionBar({
  context,
  invoiceNumber,
  onAction,
  isActionPending = false,
}: InvoiceActionBarProps) {
  const { status, primaryAction, secondaryActions, currentStage, stageNumber, totalStages } = context;
  const [copiedLink, setCopiedLink] = useState(false);

  function handleCopyTrackingLink() {
    const url = `${window.location.origin}/track/${encodeURIComponent(invoiceNumber)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  }

  function renderActionIcon(actionKey: string) {
    switch (actionKey) {
      case "RUN_CAPTURE":
        return <Zap size={17} strokeWidth={2.25} className="shrink-0" />;
      case "APPROVE":
        return <CheckSquare size={17} strokeWidth={2.25} className="shrink-0" />;
      case "REJECT":
        return <X size={17} strokeWidth={2.25} className="shrink-0" />;
      case "RETRY_VALIDATION":
        return <RefreshCw size={17} strokeWidth={2.25} className="shrink-0" />;
      case "SYNC_ERP":
        return <ArrowRightLeft size={17} strokeWidth={2.25} className="shrink-0" />;
      default:
        return <ArrowRight size={17} className="shrink-0" />;
    }
  }

  return (
    <aside
      aria-label="Invoice Workflow Controls"
      className="sticky bottom-4 z-30 p-3 sm:px-5 sm:py-3.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-xl border border-neutral-200 dark:border-zinc-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
    >
      {/* Left: Invoice status & stage quick indicator */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          to="/invoices"
          className="p-2 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-zinc-200 hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
          title="Back to All Invoices"
        >
          <ArrowLeft size={16} />
        </Link>

        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-mono font-bold text-body text-neutral-900 dark:text-zinc-100 truncate">
            {invoiceNumber}
          </span>
          <StatusBadge status={status} />
        </div>

        <div className="hidden md:flex items-center gap-2 pl-3 border-l border-neutral-200 dark:border-zinc-800 text-caption text-neutral-500 dark:text-zinc-400">
          <span>Stage {stageNumber}/{totalStages}: {currentStage}</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-end">
        {/* Vendor Tracking Link Button */}
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={handleCopyTrackingLink}
          className="h-11 px-3 text-body-sm font-medium gap-1.5 rounded-lg text-neutral-600 dark:text-zinc-300"
          title="Copy unauthenticated vendor status tracking link"
        >
          {copiedLink ? (
            <>
              <Check size={15} className="text-emerald-600 dark:text-emerald-400" />
              <span>Link Copied</span>
            </>
          ) : (
            <>
              <Link2 size={15} />
              <span>Vendor Status Link</span>
            </>
          )}
        </Button>
        {/* Secondary actions (e.g. Reject Invoice) */}
        {secondaryActions.map((sec) => (
          <Button
            key={sec.actionKey}
            type="button"
            variant={sec.variant === "destructive" ? "destructive" : "outline"}
            size="md"
            onClick={() => onAction(sec.actionKey)}
            disabled={isActionPending}
            className="h-11 px-5 text-body-sm font-semibold gap-2 rounded-lg"
          >
            {renderActionIcon(sec.actionKey)}
            <span>{sec.label}</span>
          </Button>
        ))}

        {/* Single Primary Action (e.g. Approve Invoice) */}
        {primaryAction && primaryAction.actionKey !== "VIEW_AUDIT" && (
          <Button
            type="button"
            variant={primaryAction.variant === "destructive" ? "destructive" : "primary"}
            size="lg"
            onClick={() => onAction(primaryAction.actionKey)}
            disabled={isActionPending}
            className="h-11 px-6 text-body font-semibold gap-2.5 shadow-md hover:shadow-lg rounded-lg transition-all"
          >
            {renderActionIcon(primaryAction.actionKey)}
            <span>{isActionPending ? "Executing..." : primaryAction.label}</span>
          </Button>
        )}
      </div>
    </aside>
  );
}
