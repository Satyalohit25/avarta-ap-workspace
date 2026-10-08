import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  Check,
  Zap,
  Bell,
  AlertTriangle,
  Clock,
  ChevronRight,
  Info,
} from "lucide-react";
import { formatCurrency, formatCompactCurrency } from "../../../lib/formatters";
import { DashboardOverview, BlockerGroup, BlockerInvoiceItem } from "../../../api/dashboard";
import { Button } from "../../../components/ui/Button";

interface APWorkstationGridProps {
  data: DashboardOverview | null;
  onInspectInvoice?: (id: string) => void;
  releasedInvoices?: Record<string, boolean>;
  releasedCount?: number;
  releasedAmount?: number;
  onAuthorizeRelease?: (invoiceId: string, amount: number) => void;
}

/**
 * Derive a short, scannable reason tag from the full detailReason string.
 * This is intentionally lossy — the full reason is available in the detail drawer.
 */
function toReasonTag(detailReason: string): string {
  const lower = detailReason.toLowerCase();
  if (lower.includes("hsn") || lower.includes("gst") || lower.includes("tax")) return "GST / Tax mismatch";
  if (lower.includes("damaged") || lower.includes("qty") || lower.includes("quantity")) return "Qty / damage discrepancy";
  if (lower.includes("price") || lower.includes("unit") || lower.includes("exceed")) return "Price variance";
  if (lower.includes("iban") || lower.includes("bank") || lower.includes("vendor master")) return "Bank detail mismatch";
  if (lower.includes("po") || lower.includes("purchase order")) return "Missing / unlinked PO";
  if (lower.includes("duplicate")) return "Duplicate invoice";
  if (lower.includes("signatur")) return "Missing signature";
  if (lower.includes("currency")) return "Currency mismatch";
  if (lower.includes("confidence") || lower.includes("ocr")) return "Low OCR confidence";
  return detailReason.slice(0, 38) + (detailReason.length > 38 ? "…" : "");
}

/** Exception type badge colors — aligned to design system */
function ExceptionTag({ reason }: { reason: string }) {
  const tag = toReasonTag(reason);
  const isHigh =
    tag.toLowerCase().includes("bank") ||
    tag.toLowerCase().includes("duplicate") ||
    tag.toLowerCase().includes("fraud");
  const isMed =
    tag.toLowerCase().includes("price") ||
    tag.toLowerCase().includes("qty") ||
    tag.toLowerCase().includes("gst");

  const cls = isHigh
    ? "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60"
    : isMed
    ? "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60"
    : "text-neutral-600 dark:text-zinc-400 bg-neutral-100 dark:bg-zinc-800 border-neutral-200 dark:border-zinc-700";

  return (
    <span
      className={`inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cls}`}
      title={reason}
    >
      {tag}
    </span>
  );
}

/** Age badge — colour-coded by urgency, always paired with a label */
function AgeBadge({ days, urgency }: { days: number; urgency: "urgent" | "routine" }) {
  const cls =
    urgency === "urgent"
      ? "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60"
      : "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60";
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[9.5px] font-mono font-semibold px-1.5 py-0.5 rounded border ${cls}`}
      title={`Waiting ${days} day${days !== 1 ? "s" : ""}`}
      aria-label={`${days} day${days !== 1 ? "s" : ""} waiting`}
    >
      <Clock size={9} aria-hidden="true" />
      {days}d
    </span>
  );
}

export function APWorkstationGrid({
  data,
  onInspectInvoice,
  releasedInvoices,
  releasedCount = 0,
  releasedAmount = 0,
  onAuthorizeRelease,
}: APWorkstationGridProps) {
  const navigate = useNavigate();

  /**
   * Tabs are now mutually-exclusive categories (Exceptions / Approvals), plus
   * a separate "Urgent" priority filter that can overlay either.
   * "All" shows everything. "Urgent" is visually separated to signal it is a
   * cross-cutting priority view, not a third category.
   */
  const [activeQueueTab, setActiveQueueTab] = useState<"ALL" | "APPROVALS" | "EXCEPTIONS" | "URGENT">("URGENT");
  const [activeRightTab, setActiveRightTab] = useState<"FLOW" | "OUTLOOK" | "EXPOSURE">("FLOW");
  const [pingedItems, setPingedItems] = useState<Record<string, boolean>>({});
  const [pingFeedback, setPingFeedback] = useState<{ name: string; invoiceNumber: string } | null>(null);
  const [releaseFeedback, setReleaseFeedback] = useState<string | null>(null);

  const groups: BlockerGroup[] = data?.blockerGroups ?? [];
  const allInvoices: BlockerInvoiceItem[] = groups.flatMap((g) => g.invoices);

  const approvalCount = allInvoices.filter((i) => i.type === "approval").length;
  const exceptionCount = allInvoices.filter((i) => i.type === "exception").length;
  const urgentCount = allInvoices.filter((i) => i.urgency === "urgent").length;

  /**
   * "Exceptions" and "Approvals" tabs are mutually exclusive (3 + 9 = 12 = All).
   * "Urgent" is a priority filter that cuts across both — it is visually distinguished.
   */
  const displayedInvoices = allInvoices.filter((inv) => {
    if (activeQueueTab === "APPROVALS") return inv.type === "approval";
    if (activeQueueTab === "EXCEPTIONS") return inv.type === "exception";
    if (activeQueueTab === "URGENT") return inv.urgency === "urgent";
    return true;
  });

  function handlePing(inv: BlockerInvoiceItem, e: React.MouseEvent) {
    e.stopPropagation();
    setPingedItems((prev) => ({ ...prev, [inv.id]: true }));
    setPingFeedback({ name: inv.assignedTo, invoiceNumber: inv.invoiceNumber });
    setTimeout(() => {
      setPingedItems((prev) => ({ ...prev, [inv.id]: false }));
      setPingFeedback(null);
    }, 2800);
  }

  function handleAuthorize(inv: BlockerInvoiceItem, e: React.MouseEvent) {
    e.stopPropagation();
    onAuthorizeRelease?.(inv.id, inv.amount);
    setReleaseFeedback(`✔ Released ${formatCurrency(inv.amount, inv.currency)} → Ready to Pay`);
    setTimeout(() => setReleaseFeedback(null), 3500);
  }

  function handleRowClick(inv: BlockerInvoiceItem) {
    if (onInspectInvoice) {
      onInspectInvoice(inv.id);
    } else {
      navigate(`/invoices/${inv.id}`);
    }
  }

  // ── Pipeline stages (semantic linear flow, Exception is an explicit branch) ──
  const stageMap = data?.stageMap || {};
  const rawPendingAmount = data?.pendingApprovalAmount || stageMap["PENDING_APPROVAL"]?.totalAmount || 0;
  const rawScheduledAmount =
    data?.scheduledAmount ||
    (stageMap["SCHEDULED"]?.totalAmount || 0) + (stageMap["APPROVED"]?.totalAmount || 0);

  const exceptionStageCount = stageMap["EXCEPTION"]?.count ?? 0;
  const pendingSignOffCount = Math.max(0, (stageMap["PENDING_APPROVAL"]?.count ?? 0) - releasedCount);

  /**
   * Reconciled explanation:
   * Blocked = exceptions in queue + approvals awaiting sign-off.
   * The funnel shows exception STAGE count (may include items not yet in the queue).
   */
  const currentBlockedAmount = Math.max(0, (data?.totalBlockedAmount ?? 630700) - releasedAmount);

  const linearPipeline = [
    {
      key: "RECEIVED",
      label: "1. Intake & Capture",
      count: stageMap["RECEIVED"]?.count ?? 0,
      amount: stageMap["RECEIVED"]?.totalAmount ?? 0,
      path: "/invoices?status=RECEIVED",
      isBranch: false,
      isAlert: false,
    },
    {
      key: "PROCESSING",
      label: "2. Match & Validate",
      count: stageMap["PROCESSING"]?.count ?? 0,
      amount: stageMap["PROCESSING"]?.totalAmount ?? 0,
      path: "/invoices?status=PROCESSING",
      isBranch: false,
      isAlert: false,
    },
    {
      key: "EXCEPTION",
      label: "Exception Branch",
      count: exceptionStageCount,
      amount: stageMap["EXCEPTION"]?.totalAmount ?? 0,
      path: "/exceptions",
      isBranch: true,
      isAlert: true,
    },
    {
      key: "PENDING_APPROVAL",
      label: "3. Pending Sign-off",
      count: pendingSignOffCount,
      amount: Math.max(0, rawPendingAmount - releasedAmount),
      path: "/approvals",
      isBranch: false,
      isAlert: pendingSignOffCount > 0,
    },
    {
      key: "SCHEDULED",
      label: "4. Scheduled for Pay",
      count:
        (stageMap["SCHEDULED"]?.count ?? 0) +
        (stageMap["APPROVED"]?.count ?? 0) +
        releasedCount,
      amount: rawScheduledAmount + releasedAmount,
      path: "/payments",
      isBranch: false,
      isAlert: false,
    },
    {
      key: "PAID",
      label: "5. Settled & Synced",
      count: (stageMap["PAID"]?.count ?? 0) + (stageMap["SYNCED"]?.count ?? 0),
      amount:
        (stageMap["PAID"]?.totalAmount ?? 0) + (stageMap["SYNCED"]?.totalAmount ?? 0),
      path: "/invoices?status=PAID",
      isBranch: false,
      isAlert: false,
    },
  ];

  // ── Aging ──
  const rawOverdueCount =
    typeof data?.overdueInvoices === "number"
      ? data.overdueInvoices
      : data?.overdueInvoices?.count ?? data?.agingBuckets?.overdue?.count ?? 0;
  const rawOverdueAmount =
    typeof data?.overdueInvoices === "object"
      ? data.overdueInvoices?.totalAmount ?? 0
      : data?.agingBuckets?.overdue?.totalAmount ?? 0;

  const aging = {
    overdue: {
      count: data?.agingBuckets?.overdue?.count ?? rawOverdueCount,
      totalAmount: data?.agingBuckets?.overdue?.totalAmount ?? rawOverdueAmount,
    },
    dueIn7Days: {
      count: data?.agingBuckets?.dueIn7Days?.count ?? data?.dueIn7Days?.count ?? 0,
      totalAmount:
        data?.agingBuckets?.dueIn7Days?.totalAmount ?? data?.dueIn7Days?.totalAmount ?? 0,
    },
    dueIn30Days: {
      count: data?.agingBuckets?.dueIn30Days?.count ?? data?.dueIn30Days?.count ?? 0,
      totalAmount:
        data?.agingBuckets?.dueIn30Days?.totalAmount ?? data?.dueIn30Days?.totalAmount ?? 0,
    },
    dueLater: {
      count: data?.agingBuckets?.dueLater?.count ?? 0,
      totalAmount: data?.agingBuckets?.dueLater?.totalAmount ?? 0,
    },
  };

  const totalAgingAmount =
    (aging.overdue.totalAmount || 0) +
    (aging.dueIn7Days.totalAmount || 0) +
    (aging.dueIn30Days.totalAmount || 0) +
    (aging.dueLater.totalAmount || 0) || 1;

  const topSuppliers =
    data?.topSuppliers && data.topSuppliers.length > 0
      ? data.topSuppliers
      : [
          { id: "sup-1", name: "Tata Steel Ltd", balance: 354000, currency: "INR", terms: 30 },
          { id: "sup-2", name: "Dell Technologies Inc", balance: 12500, currency: "USD", terms: 45 },
          { id: "sup-3", name: "BlueDart Express", balance: 85000, currency: "INR", terms: 15 },
          { id: "sup-4", name: "Amazon Business", balance: 20900, currency: "INR", terms: 30 },
        ];

  // Reconciled label: blocked = exceptions-in-queue + approvals-awaiting
  const reconciledNote =
    exceptionStageCount !== exceptionCount
      ? `${exceptionCount} in queue · ${exceptionStageCount - exceptionCount} in validation`
      : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
      {/* ── LEFT PANEL: WORK QUEUE ── */}
      <div className="lg:col-span-7 rounded-xl border border-neutral-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 p-3.5 flex flex-col justify-between shadow-2xs">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-900 dark:text-zinc-100 shrink-0">
                Actionable Work Queue
              </span>
              {releaseFeedback ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 animate-fade-in">
                  <Check size={11} className="text-emerald-600 dark:text-emerald-400" />
                  <span>{releaseFeedback}</span>
                </span>
              ) : pingFeedback ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 animate-fade-in">
                  <Check size={11} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Ping sent to {pingFeedback.name}</span>
                </span>
              ) : null}
            </div>

            {/* ── Tab strip: category tabs + separated Urgent priority filter ── */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Category tabs (mutually exclusive) */}
              <div className="flex items-center gap-0.5 bg-neutral-100 dark:bg-zinc-800/80 p-0.5 rounded-lg text-[10.5px] font-medium">
                {(
                  [
                    { key: "ALL", label: `All (${allInvoices.length})` },
                    { key: "EXCEPTIONS", label: `Exceptions (${exceptionCount})` },
                    { key: "APPROVALS", label: `Approvals (${approvalCount})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveQueueTab(tab.key)}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      activeQueueTab === tab.key
                        ? "bg-white dark:bg-zinc-700 text-neutral-900 dark:text-zinc-100 shadow-2xs font-semibold"
                        : "text-neutral-500 hover:text-neutral-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                    aria-pressed={activeQueueTab === tab.key}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Urgent filter — separated by a divider to signal it's a priority lens */}
              <div className="w-px h-4 bg-neutral-200 dark:bg-zinc-700" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setActiveQueueTab("URGENT")}
                className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold transition-all border ${
                  activeQueueTab === "URGENT"
                    ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800"
                    : "text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                }`}
                title="Priority filter — urgent items across both exceptions and approvals"
                aria-pressed={activeQueueTab === "URGENT"}
              >
                ⚡ Urgent ({urgentCount})
              </button>
            </div>
          </div>

          {/* Reconciled count note (only shown when staging counts differ) */}
          {reconciledNote && (
            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-neutral-400 dark:text-zinc-500">
              <Info size={10} aria-hidden="true" />
              <span>{reconciledNote}</span>
            </div>
          )}

          {/* Queue rows */}
          <div className="mt-2 space-y-1.5 min-h-[200px] max-h-[224px] overflow-y-auto pr-1">
            {displayedInvoices.length === 0 ? (
              <div className="py-10 text-center">
                <Check size={20} className="text-emerald-500 mx-auto mb-1.5" />
                <p className="text-[11px] font-semibold text-neutral-600 dark:text-zinc-400">All caught up!</p>
                <p className="text-[10px] text-neutral-400 dark:text-zinc-500 mt-0.5">
                  No items matching this filter.
                </p>
              </div>
            ) : (
              displayedInvoices.slice(0, 4).map((inv) => {
                const isPinged = pingedItems[inv.id];
                return (
                  <div
                    key={inv.id}
                    onClick={() => handleRowClick(inv)}
                    className="py-2 px-2.5 rounded-lg border border-neutral-100 dark:border-zinc-800 bg-neutral-50/40 dark:bg-zinc-900/40 hover:bg-neutral-50 dark:hover:bg-zinc-800/60 hover:border-neutral-200 dark:hover:border-zinc-700 transition-all flex items-center justify-between gap-2 cursor-pointer group"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && handleRowClick(inv)}
                    aria-label={`Invoice ${inv.invoiceNumber} from ${inv.vendor}`}
                  >
                    {/* Left: invoice ID + vendor + reason tag */}
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                            {inv.invoiceNumber}
                          </span>
                          <span className="text-[11px] font-medium text-neutral-900 dark:text-zinc-100 truncate">
                            {inv.vendor}
                          </span>
                          <AgeBadge days={inv.daysWaiting} urgency={inv.urgency} />
                        </div>
                        {/* Reason tag replaces truncated free-text */}
                        <ExceptionTag reason={inv.detailReason} />
                      </div>
                    </div>

                    {/* Right: amount + owner + contextual action */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="font-mono text-[12px] font-bold text-neutral-900 dark:text-zinc-100 tabular-nums block">
                          {formatCurrency(inv.amount, inv.currency)}
                        </span>
                        <span className="text-[9.5px] text-neutral-400 dark:text-zinc-500 font-mono">
                          {inv.assignedTo}
                        </span>
                      </div>

                      {inv.type === "approval" ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {releasedInvoices?.[inv.id] ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200/80 dark:border-emerald-800/80">
                              <Check size={11} className="text-emerald-600" />
                              <span>Ready to Pay</span>
                            </span>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => handleAuthorize(inv, e)}
                                className="h-6 text-[10px] px-2 font-semibold text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 gap-1 cursor-pointer shadow-2xs"
                                title="Authorize and move to Ready to Pay"
                              >
                                <Zap size={11} className="text-emerald-600" />
                                <span>Release</span>
                              </Button>
                              <Button
                                size="sm"
                                variant={isPinged ? "secondary" : "outline"}
                                onClick={(e) => handlePing(inv, e)}
                                className="h-6 text-[10px] px-1.5 font-medium gap-1"
                                title="Ping approver"
                              >
                                {isPinged ? (
                                  <>
                                    <Check size={11} className="text-emerald-600" />
                                    <span>Pinged</span>
                                  </>
                                ) : (
                                  <>
                                    <Bell size={11} className="text-amber-600" />
                                    <span>Ping</span>
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      ) : (
                        // Ghost "Resolve →" button — appears on hover so not every row shouts the same CTA
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(inv);
                          }}
                          className="h-6 px-2 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 border border-transparent group-hover:border-indigo-300 dark:group-hover:border-indigo-700 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/40 rounded transition-all flex items-center gap-1"
                          aria-label={`Resolve ${inv.invoiceNumber}`}
                        >
                          <span>Resolve</span>
                          <ChevronRight size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Queue footer */}
        <div className="pt-2 border-t border-neutral-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-neutral-500">
          <span className="hidden sm:inline">Click any row to inspect 3-way match &amp; document preview</span>
          <button
            type="button"
            onClick={() =>
              navigate(activeQueueTab === "APPROVALS" ? "/approvals" : "/exceptions")
            }
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer ml-auto"
          >
            <span>Open Dedicated Queue</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* ── RIGHT PANEL: 3-TAB ANALYTICS ── */}
      <div className="lg:col-span-5 rounded-xl border border-neutral-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 p-3.5 flex flex-col justify-between shadow-2xs">
        <div>
          {/* Header Tab Switcher */}
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-0.5 bg-neutral-100 dark:bg-zinc-800/80 p-0.5 rounded-lg text-[10.5px] font-medium overflow-x-auto">
              {(
                [
                  { key: "FLOW", label: "Invoice Flow" },
                  { key: "OUTLOOK", label: "Payment Aging" },
                  { key: "EXPOSURE", label: "Top Suppliers" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveRightTab(tab.key)}
                  className={`px-2.5 py-0.5 rounded-md transition-all shrink-0 ${
                    activeRightTab === tab.key
                      ? "bg-white dark:bg-zinc-700 text-neutral-900 dark:text-zinc-100 shadow-2xs font-semibold"
                      : "text-neutral-500 hover:text-neutral-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                  aria-pressed={activeRightTab === tab.key}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── View 1: Linear Pipeline Flow ── */}
          {activeRightTab === "FLOW" && (
            <div className="mt-2.5 space-y-2">
              {/* True linear flow: main stages stacked with exception branch clearly labeled */}
              <div className="space-y-1">
                {linearPipeline
                  .filter((s) => !s.isBranch)
                  .map((stg, idx) => {
                    // Insert exception branch after stage index 1 (Match & Validate)
                    const exBranch = linearPipeline.find((s) => s.isBranch);
                    const showBranch = idx === 1 && exBranch;
                    return (
                      <div key={stg.key}>
                        <button
                          type="button"
                          onClick={() => navigate(stg.path)}
                          className={`w-full p-2 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            stg.isAlert && stg.count > 0
                              ? "border-amber-200 dark:border-amber-800/60 hover:border-amber-300"
                              : "border-neutral-100 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-800"
                          } bg-neutral-50/50 dark:bg-zinc-900`}
                        >
                          <span
                            className={`text-[10.5px] font-medium truncate ${
                              stg.isAlert && stg.count > 0
                                ? "text-amber-700 dark:text-amber-300"
                                : "text-neutral-600 dark:text-zinc-400"
                            }`}
                          >
                            {stg.label}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`font-mono text-[13px] font-bold ${
                                stg.isAlert && stg.count > 0
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-neutral-900 dark:text-zinc-100"
                              }`}
                            >
                              {stg.count}
                            </span>
                            <span className="text-[10px] font-mono text-neutral-400 dark:text-zinc-500">
                              {formatCompactCurrency(stg.amount)}
                            </span>
                            <ChevronRight size={11} className="text-neutral-300 dark:text-zinc-600" />
                          </div>
                        </button>

                        {/* Exception branch inlined after Match & Validate */}
                        {showBranch && exBranch && (
                          <div className="ml-4 mt-1 mb-1 flex items-center gap-1.5">
                            <div className="w-3 h-px bg-amber-300 dark:bg-amber-700" aria-hidden="true" />
                            <button
                              type="button"
                              onClick={() => navigate(exBranch.path)}
                              className="flex-1 p-1.5 rounded-lg border border-amber-300 dark:border-amber-800/80 bg-amber-50/50 dark:bg-amber-950/30 hover:border-amber-400 transition-all cursor-pointer flex items-center justify-between gap-2 text-left"
                              title="Exception branch — rejoins main flow after resolution"
                            >
                              <div className="flex items-center gap-1">
                                <AlertTriangle size={11} className="text-amber-600 dark:text-amber-400 shrink-0" />
                                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                                  Exception Branch
                                </span>
                                <span className="text-[9px] text-amber-600/70 dark:text-amber-400/70">
                                  — rejoins flow after resolution
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="font-mono text-[13px] font-bold text-amber-700 dark:text-amber-300">
                                  {exBranch.count}
                                </span>
                                <span className="text-[10px] font-mono text-amber-500 dark:text-amber-500">
                                  {formatCompactCurrency(exBranch.amount)}
                                </span>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* AP Velocity benchmarks */}
              <div className="p-2.5 rounded-lg bg-neutral-50/70 dark:bg-zinc-900/60 border border-neutral-100 dark:border-zinc-800 grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-neutral-400 block" title="Average end-to-end invoice processing time">
                    Cycle Time
                  </span>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="font-mono text-[13px] font-bold text-neutral-900 dark:text-zinc-100">
                      2.4d
                    </span>
                    <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold" title="Improved by 0.6 days vs last period">
                      (better)
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 block" title="Average time from approval request to sign-off">
                    Approval Speed
                  </span>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="font-mono text-[13px] font-bold text-neutral-900 dark:text-zinc-100">
                      14.2h
                    </span>
                    <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold" title="Within SLA target of 24h">
                      SLA ✓
                    </span>
                  </div>
                </div>
                <div>
                  <span
                    className="text-[10px] text-neutral-400 block"
                    title="Straight-Through Processing — invoices processed without manual intervention. Target: ≥ 80%"
                  >
                    STP Rate
                  </span>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="font-mono text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                      {data?.touchlessStpRate ?? 79}%
                    </span>
                    <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold" title="Improved by 4.1% vs last period">
                      (better)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── View 2: Payment Outlook & AP Aging ── */}
          {activeRightTab === "OUTLOOK" && (
            <div className="mt-2.5 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/invoices?status=EXCEPTION")}
                  className="p-2 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 text-left hover:border-rose-400 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle size={11} className="text-rose-600" aria-hidden="true" />
                      <span>Overdue</span>
                    </span>
                    <span className="text-[9px] font-mono font-semibold px-1 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200">
                      {aging.overdue.count} inv
                    </span>
                  </div>
                  <span className="font-mono text-[15px] font-bold tabular-nums text-rose-700 dark:text-rose-300 block mt-1">
                    {formatCurrency(aging.overdue.totalAmount, "INR")}
                  </span>
                  <span className="text-[9.5px] text-rose-600/80 dark:text-rose-400/80 block mt-0.5">
                    Immediate risk — act now
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/payments")}
                  className="p-2 rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 text-left hover:border-indigo-400 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                      <Clock size={11} className="text-indigo-600" aria-hidden="true" />
                      <span>Due 1–7 Days</span>
                    </span>
                    <span className="text-[9px] font-mono font-semibold px-1 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200">
                      {aging.dueIn7Days.count} inv
                    </span>
                  </div>
                  <span className="font-mono text-[15px] font-bold tabular-nums text-indigo-700 dark:text-indigo-300 block mt-1">
                    {formatCurrency(aging.dueIn7Days.totalAmount, "INR")}
                  </span>
                  <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-medium block mt-0.5">
                    ⚡ Early discount available
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/payments")}
                  className="p-2 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-neutral-50/60 dark:bg-zinc-900 text-left hover:border-neutral-300 dark:hover:border-zinc-700 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-neutral-600 dark:text-zinc-300 uppercase tracking-wider">
                      Due 8–30 Days
                    </span>
                    <span className="text-[9px] font-mono font-semibold px-1 rounded bg-neutral-200/80 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300">
                      {aging.dueIn30Days.count} inv
                    </span>
                  </div>
                  <span className="font-mono text-[15px] font-bold tabular-nums text-neutral-900 dark:text-zinc-100 block mt-1">
                    {formatCurrency(aging.dueIn30Days.totalAmount, "INR")}
                  </span>
                  <span className="text-[9.5px] text-neutral-400 block mt-0.5">Planned settlement run</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/invoices")}
                  className="p-2 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-neutral-50/60 dark:bg-zinc-900 text-left hover:border-neutral-300 dark:hover:border-zinc-700 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-neutral-600 dark:text-zinc-300 uppercase tracking-wider">
                      Due 30+ Days
                    </span>
                    <span className="text-[9px] font-mono font-semibold px-1 rounded bg-neutral-200/80 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300">
                      {aging.dueLater.count} inv
                    </span>
                  </div>
                  <span className="font-mono text-[15px] font-bold tabular-nums text-neutral-900 dark:text-zinc-100 block mt-1">
                    {formatCurrency(aging.dueLater.totalAmount, "INR")}
                  </span>
                  <span className="text-[9.5px] text-neutral-400 block mt-0.5">Extended credit horizon</span>
                </button>
              </div>

              {/* Stacked aging bar */}
              <div className="p-2 rounded-lg bg-neutral-50/70 dark:bg-zinc-900/60 border border-neutral-100 dark:border-zinc-800 space-y-1.5">
                <div className="flex justify-between text-[10px] font-mono text-neutral-500 dark:text-zinc-400">
                  <span>Cash Outflow Distribution</span>
                  <span className="font-semibold text-neutral-900 dark:text-zinc-200">
                    {formatCurrency(totalAgingAmount, "INR")}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden flex" role="img" aria-label="Aging distribution bar">
                  <div
                    style={{ width: `${Math.min(100, ((aging.overdue.totalAmount || 0) / totalAgingAmount) * 100)}%` }}
                    className="bg-rose-500 h-full"
                    title="Overdue"
                  />
                  <div
                    style={{ width: `${Math.min(100, ((aging.dueIn7Days.totalAmount || 0) / totalAgingAmount) * 100)}%` }}
                    className="bg-indigo-600 h-full"
                    title="Due 1–7 Days"
                  />
                  <div
                    style={{ width: `${Math.min(100, ((aging.dueIn30Days.totalAmount || 0) / totalAgingAmount) * 100)}%` }}
                    className="bg-sky-400 h-full"
                    title="Due 8–30 Days"
                  />
                  <div
                    style={{ width: `${Math.min(100, ((aging.dueLater.totalAmount || 0) / totalAgingAmount) * 100)}%` }}
                    className="bg-emerald-400 h-full"
                    title="Due 30+ Days"
                  />
                </div>
                <div className="flex items-center gap-3 text-[9.5px] text-neutral-400 dark:text-zinc-500 flex-wrap">
                  {[
                    { color: "bg-rose-500", label: "Overdue" },
                    { color: "bg-indigo-600", label: "1–7d" },
                    { color: "bg-sky-400", label: "8–30d" },
                    { color: "bg-emerald-400", label: "30+d" },
                  ].map((l) => (
                    <span key={l.label} className="flex items-center gap-1">
                      <span className={`inline-block w-2 h-2 rounded-sm ${l.color}`} aria-hidden="true" />
                      {l.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── View 3: Supplier Exposure ── */}
          {activeRightTab === "EXPOSURE" && (
            <div className="mt-2 space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
              {topSuppliers.map((sup) => (
                <div
                  key={sup.id}
                  onClick={() => navigate("/suppliers")}
                  className="p-2 rounded-lg border border-neutral-100 dark:border-zinc-800 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-zinc-800/50 cursor-pointer text-[11px]"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && navigate("/suppliers")}
                  aria-label={`${sup.name} — ${formatCurrency(sup.balance, sup.currency)}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 size={13} className="text-neutral-400 shrink-0" aria-hidden="true" />
                    <span className="font-medium text-neutral-900 dark:text-zinc-100 truncate">
                      {sup.name}
                    </span>
                  </div>
                  <div className="text-right shrink-0 font-mono">
                    <span className="font-bold text-neutral-900 dark:text-zinc-100">
                      {formatCurrency(sup.balance, sup.currency)}
                    </span>
                    <span className="text-neutral-400 ml-2 text-[10px]">Net {sup.terms}d</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right panel footer */}
        <div className="pt-2 border-t border-neutral-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-neutral-500">
          <span>
            {activeRightTab === "FLOW"
              ? "Target cycle: <3.0 days"
              : activeRightTab === "OUTLOOK"
              ? "Aging as of today"
              : "Open payables by supplier"}
          </span>
          <button
            type="button"
            onClick={() =>
              navigate(
                activeRightTab === "FLOW"
                  ? "/invoices"
                  : activeRightTab === "OUTLOOK"
                  ? "/payments"
                  : "/suppliers"
              )
            }
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>
              {activeRightTab === "FLOW"
                ? "Full Flow"
                : activeRightTab === "OUTLOOK"
                ? "Payment Schedule"
                : "All Suppliers"}
            </span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
