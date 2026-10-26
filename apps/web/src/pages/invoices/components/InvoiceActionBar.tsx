import { useState, useEffect } from "react";
import {
  CheckSquare,
  Zap,
  RefreshCw,
  X,
  ArrowRight,
  ArrowRightLeft,
  ArrowLeft,
  Link2,
  Check,
  PauseCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  MoreHorizontal,
  History,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { formatCurrency } from "../../../lib/formatters";
import { InvoiceWorkflowContext } from "../helpers/workflowContext";

interface InvoiceActionBarProps {
  context: InvoiceWorkflowContext;
  invoiceNumber: string;
  totalAmount?: number | string;
  currency?: string;
  onAction: (actionKey: string) => void;
  isActionPending?: boolean;
  trackingUrl?: string;
}

export function InvoiceActionBar({
  context,
  totalAmount,
  currency = "INR",
  onAction,
  isActionPending = false,
  trackingUrl,
}: InvoiceActionBarProps) {
  const { status, primaryAction, secondaryActions } = context;
  const [copiedLink, setCopiedLink] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const navigate = useNavigate();

  function handleCopyTrackingLink() {
    if (!trackingUrl) return;
    navigator.clipboard.writeText(trackingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  }

  // Keyboard shortcut for primary action (Enter)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "Enter" && primaryAction && !isActionPending) {
        e.preventDefault();
        onAction(primaryAction.actionKey);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [primaryAction, isActionPending, onAction]);

  function renderActionIcon(actionKey: string) {
    switch (actionKey) {
      case "SUBMIT_APPROVAL":
        return <Send size={15} strokeWidth={2.25} className="shrink-0" />;
      case "RUN_CAPTURE":
        return <Zap size={15} strokeWidth={2.25} className="shrink-0" />;
      case "APPROVE":
        return <CheckSquare size={15} strokeWidth={2.25} className="shrink-0" />;
      case "REJECT":
        return <X size={15} strokeWidth={2.25} className="shrink-0" />;
      case "HOLD_REQUEST_CORRECTION":
        return <PauseCircle size={15} strokeWidth={2} className="shrink-0 text-amber-500" />;
      case "RETRY_VALIDATION":
        return <RefreshCw size={15} strokeWidth={2.25} className="shrink-0" />;
      case "SYNC_ERP":
        return <ArrowRightLeft size={15} strokeWidth={2.25} className="shrink-0" />;
      default:
        return <ArrowRight size={15} className="shrink-0" />;
    }
  }

  const isCleanForApproval = status === "PROCESSING";

  return (
    <aside
      aria-label="Invoice Workflow Controls"
      className="sticky bottom-4 z-30 p-2.5 sm:px-4 sm:py-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-xl border border-neutral-200 dark:border-zinc-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
    >
      {/* Left: Queue Triage & Quick Navigation (Replaces repeating the ID/status/stage) */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Link
          to="/invoices"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-body-sm font-medium text-neutral-600 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-100 hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
          title="Back to All Invoices Queue"
        >
          <ArrowLeft size={14} />
          <span className="hidden md:inline">Queue</span>
        </Link>

        {/* Prev / Next Triage */}
        <div className="flex items-center gap-1 pl-2 border-l border-neutral-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => navigate("/invoices")}
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-zinc-100 hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors"
            title="Previous invoice in queue (Shortcut: P)"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-[11px] font-mono font-medium text-neutral-500 dark:text-zinc-400 px-1">
            1 of 25
          </span>
          <button
            type="button"
            onClick={() => navigate("/invoices")}
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-zinc-100 hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors"
            title="Next invoice in queue (Shortcut: N)"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* State Summary Chip */}
        <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-neutral-200 dark:border-zinc-800">
          {isCleanForApproval ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              <Check size={11} strokeWidth={2.5} />
              <span>Ready for Approval • {formatCurrency(Number(totalAmount) || 0, currency)}</span>
            </span>
          ) : status === "EXCEPTION" ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
              <span>Exception Requires Resolution</span>
            </span>
          ) : (
            <span className="text-[11px] font-mono text-neutral-500 dark:text-zinc-400">
              Workflow active
            </span>
          )}
        </div>
      </div>

      {/* Right: Explicit Primary and Secondary Actions */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end relative">
        {/* Main Secondary Actions (Outline or Destructive — e.g. Reject, Hold) */}
        {secondaryActions.slice(0, 2).map((sec) => (
          <Button
            key={sec.actionKey}
            type="button"
            variant={sec.variant === "destructive" ? "destructive" : "outline"}
            size="sm"
            onClick={() => onAction(sec.actionKey)}
            disabled={isActionPending}
            className={`h-9 px-3.5 text-body-sm font-semibold gap-1.5 rounded-lg ${
              sec.actionKey === "HOLD_REQUEST_CORRECTION"
                ? "border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                : ""
            }`}
          >
            {renderActionIcon(sec.actionKey)}
            <span>{sec.label}</span>
          </Button>
        ))}

        {/* ••• More Actions Overflow Menu */}
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowMoreMenu((prev) => !prev)}
            className="h-9 px-2 text-caption font-medium gap-1 rounded-lg text-neutral-600 dark:text-zinc-400 border-neutral-200 dark:border-zinc-700"
            title="More actions"
          >
            <MoreHorizontal size={16} />
          </Button>

          {showMoreMenu && (
            <div className="absolute right-0 bottom-full mb-2 w-52 py-1 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-neutral-200 dark:border-zinc-700 z-50 text-caption animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                disabled={!trackingUrl}
                onClick={() => {
                  handleCopyTrackingLink();
                  setShowMoreMenu(false);
                }}
                className={`w-full text-left px-3 py-2 flex items-center gap-2 text-neutral-700 dark:text-zinc-300 transition-colors ${
                  trackingUrl
                    ? "hover:bg-neutral-100 dark:hover:bg-zinc-700 cursor-pointer"
                    : "opacity-50 cursor-not-allowed"
                }`}
              >
                <Link2 size={14} className="text-neutral-400" />
                <span>
                  {copiedLink
                    ? "Link Copied!"
                    : trackingUrl
                      ? "Copy Vendor Link"
                      : "Tracking Link Unavailable"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onAction("VIEW_AUDIT");
                  setShowMoreMenu(false);
                }}
                className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-zinc-700 text-neutral-700 dark:text-zinc-300 transition-colors"
              >
                <History size={14} className="text-neutral-400" />
                <span>View Full Audit Log</span>
              </button>

              {secondaryActions.slice(2).map((sec) => (
                <button
                  key={sec.actionKey}
                  type="button"
                  onClick={() => {
                    onAction(sec.actionKey);
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-zinc-700 text-neutral-700 dark:text-zinc-300 transition-colors"
                >
                  {renderActionIcon(sec.actionKey)}
                  <span>{sec.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Primary State-Aware Action (Exactly 1 solid primary button per AGENTS.md / Zero-Learning-Curve spec) */}
        {primaryAction && primaryAction.actionKey !== "VIEW_AUDIT" && (
          <Button
            type="button"
            variant={primaryAction.variant === "destructive" ? "destructive" : "primary"}
            size="md"
            onClick={() => onAction(primaryAction.actionKey)}
            disabled={isActionPending}
            className="h-9 px-5 text-body-sm font-bold gap-2 shadow-sm hover:shadow-md rounded-lg transition-all"
          >
            {renderActionIcon(primaryAction.actionKey)}
            <span>{isActionPending ? "Executing..." : primaryAction.label}</span>
            <kbd className="hidden sm:inline-block font-mono text-[10px] px-1 py-0.2 rounded bg-indigo-700/60 text-white/90">
              ↵
            </kbd>
          </Button>
        )}
      </div>
    </aside>
  );
}
