import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  AlertTriangle,
  FileQuestion,
  Copy,
  Receipt,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  Building2,
  Cpu,
  Layers,
  Sparkles,
  ExternalLink,
  Zap,
  Calendar,
  ShieldAlert,
  ArrowUpRight,
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

export function APWorkstationGrid({
  data,
  onInspectInvoice,
  releasedInvoices,
  releasedCount = 0,
  releasedAmount = 0,
  onAuthorizeRelease,
}: APWorkstationGridProps) {
  const navigate = useNavigate();

  const [activeQueueTab, setActiveQueueTab] = useState<"ALL" | "APPROVALS" | "EXCEPTIONS" | "OVERDUE">("ALL");
  const [activeRightTab, setActiveRightTab] = useState<"FLOW" | "OUTLOOK" | "EXPOSURE">("FLOW");
  const [pingedItems, setPingedItems] = useState<Record<string, boolean>>({});
  const [pingFeedback, setPingFeedback] = useState<{ name: string; invoiceNumber: string } | null>(null);
  const [releaseFeedback, setReleaseFeedback] = useState<string | null>(null);

  const groups: BlockerGroup[] = data?.blockerGroups ?? [];
  const allInvoices: BlockerInvoiceItem[] = groups.flatMap((g) => g.invoices);

  // Filter queue based on selected tab
  const displayedInvoices = allInvoices.filter((inv) => {
    if (activeQueueTab === "APPROVALS") return inv.type === "approval";
    if (activeQueueTab === "EXCEPTIONS") return inv.type === "exception";
    if (activeQueueTab === "OVERDUE") return inv.urgency === "urgent" || inv.daysWaiting >= 2;
    return true;
  });

  const approvalCount = allInvoices.filter((i) => i.type === "approval").length;
  const exceptionCount = allInvoices.filter((i) => i.type === "exception").length;
  const overdueCount = allInvoices.filter((i) => i.urgency === "urgent").length;

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

  // Linear semantically correct pipeline stages per AGENTS.md
  // 1. Intake & Capture -> 2. Match & Validate -> 3. Pending Sign-off -> 4. Scheduled to Pay -> 5. Settled & Synced
  // With Exception branch explicitly marked.
  const stageMap = data?.stageMap || {};
  const rawPendingAmount = data?.pendingApprovalAmount || stageMap["PENDING_APPROVAL"]?.totalAmount || 0;
  const rawScheduledAmount = data?.scheduledAmount || (stageMap["SCHEDULED"]?.totalAmount || 0) + (stageMap["APPROVED"]?.totalAmount || 0);

  const linearPipeline = [
    {
      key: "RECEIVED",
      label: "1. Intake & Capture",
      count: stageMap["RECEIVED"]?.count ?? 0,
      amount: stageMap["RECEIVED"]?.totalAmount ?? 0,
      path: "/invoices?status=RECEIVED",
      isBranch: false,
    },
    {
      key: "PROCESSING",
      label: "2. Match & Validate",
      count: stageMap["PROCESSING"]?.count ?? 0,
      amount: stageMap["PROCESSING"]?.totalAmount ?? 0,
      path: "/invoices?status=PROCESSING",
      isBranch: false,
    },
    {
      key: "EXCEPTION",
      label: "⚠ Exception Branch",
      count: stageMap["EXCEPTION"]?.count ?? 0,
      amount: stageMap["EXCEPTION"]?.totalAmount ?? 0,
      path: "/exceptions",
      isBranch: true,
      alert: true,
    },
    {
      key: "PENDING_APPROVAL",
      label: "3. Pending Sign-off",
      count: Math.max(0, (stageMap["PENDING_APPROVAL"]?.count ?? 0) - releasedCount),
      amount: Math.max(0, rawPendingAmount - releasedAmount),
      path: "/approvals",
      isBranch: false,
      alert: true,
    },
    {
      key: "SCHEDULED",
      label: "4. Scheduled for Pay",
      count: ((stageMap["SCHEDULED"]?.count ?? 0) + (stageMap["APPROVED"]?.count ?? 0)) + releasedCount,
      amount: rawScheduledAmount + releasedAmount,
      path: "/payments",
      isBranch: false,
    },
    {
      key: "PAID",
      label: "5. Settled & Synced",
      count: (stageMap["PAID"]?.count ?? 0) + (stageMap["SYNCED"]?.count ?? 0),
      amount: (stageMap["PAID"]?.totalAmount ?? 0) + (stageMap["SYNCED"]?.totalAmount ?? 0),
      path: "/invoices?status=PAID",
      isBranch: false,
    },
  ];

  // Payment Outlook & Aging Data - dynamically derived from API
  const rawOverdueCount = typeof data?.overdueInvoices === "number"
    ? data.overdueInvoices
    : data?.overdueInvoices?.count ?? data?.agingBuckets?.overdue?.count ?? 0;

  const rawOverdueAmount = typeof data?.overdueInvoices === "object"
    ? data.overdueInvoices?.totalAmount ?? 0
    : data?.agingBuckets?.overdue?.totalAmount ?? 0;

  const aging = {
    overdue: {
      count: data?.agingBuckets?.overdue?.count ?? rawOverdueCount,
      totalAmount: data?.agingBuckets?.overdue?.totalAmount ?? rawOverdueAmount,
    },
    dueIn7Days: {
      count: data?.agingBuckets?.dueIn7Days?.count ?? data?.dueIn7Days?.count ?? 0,
      totalAmount: data?.agingBuckets?.dueIn7Days?.totalAmount ?? data?.dueIn7Days?.totalAmount ?? 0,
    },
    dueIn30Days: {
      count: data?.agingBuckets?.dueIn30Days?.count ?? data?.dueIn30Days?.count ?? 0,
      totalAmount: data?.agingBuckets?.dueIn30Days?.totalAmount ?? data?.dueIn30Days?.totalAmount ?? 0,
    },
    dueLater: {
      count: data?.agingBuckets?.dueLater?.count ?? 0,
      totalAmount: data?.agingBuckets?.dueLater?.totalAmount ?? 0,
    },
  };

  const totalAgingAmount = (aging.overdue.totalAmount || 0) + (aging.dueIn7Days.totalAmount || 0) + (aging.dueIn30Days.totalAmount || 0) + (aging.dueLater.totalAmount || 0) || 1;

  const topSuppliers = data?.topSuppliers && data.topSuppliers.length > 0
    ? data.topSuppliers
    : [
        { id: "sup-1", name: "Tata Steel Ltd", balance: 354000, currency: "INR", terms: 30 },
        { id: "sup-2", name: "Dell Technologies Inc", balance: 12500, currency: "USD", terms: 45 },
        { id: "sup-3", name: "BlueDart Express", balance: 85000, currency: "INR", terms: 15 },
        { id: "sup-4", name: "Amazon Business", balance: 20900, currency: "INR", terms: 30 },
      ];

  const currentBlockedAmount = Math.max(0, (data?.totalBlockedAmount ?? 630700) - releasedAmount);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
      {/* ── LEFT PANEL: WORK QUEUE (58% width, dense height) ── */}
      <div className="lg:col-span-7 rounded-xl border border-neutral-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 p-3.5 flex flex-col justify-between shadow-2xs">
        <div>
          {/* Header & Segmented Queue Filter */}
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-2">
              <span className="text-micro font-bold uppercase tracking-wider text-neutral-900 dark:text-zinc-100">
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
              ) : (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  {Math.max(0, allInvoices.length - releasedCount)} Blocked • {formatCurrency(currentBlockedAmount, "INR")}
                </span>
              )}
            </div>

            {/* Segmented Filter Pills */}
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-zinc-800/80 p-0.5 rounded-lg text-micro font-medium">
              <button
                type="button"
                onClick={() => setActiveQueueTab("ALL")}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  activeQueueTab === "ALL"
                    ? "bg-white dark:bg-zinc-700 text-neutral-900 dark:text-zinc-100 shadow-2xs font-semibold"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-zinc-400"
                }`}
              >
                All ({allInvoices.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveQueueTab("APPROVALS")}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  activeQueueTab === "APPROVALS"
                    ? "bg-white dark:bg-zinc-700 text-neutral-900 dark:text-zinc-100 shadow-2xs font-semibold"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-zinc-400"
                }`}
              >
                Approvals ({approvalCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveQueueTab("EXCEPTIONS")}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  activeQueueTab === "EXCEPTIONS"
                    ? "bg-white dark:bg-zinc-700 text-neutral-900 dark:text-zinc-100 shadow-2xs font-semibold"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-zinc-400"
                }`}
              >
                Exceptions ({exceptionCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveQueueTab("OVERDUE")}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  activeQueueTab === "OVERDUE"
                    ? "bg-white dark:bg-zinc-700 text-rose-600 dark:text-rose-400 shadow-2xs font-semibold"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-zinc-400"
                }`}
              >
                Urgent ({overdueCount})
              </button>
            </div>
          </div>

          {/* High-Density Triage Table */}
          <div className="mt-2 space-y-1.5 min-h-[200px] max-h-[224px] overflow-y-auto pr-1">
            {displayedInvoices.length === 0 ? (
              <div className="py-8 text-center text-caption text-neutral-400">
                No items matching this queue filter.
              </div>
            ) : (
              displayedInvoices.slice(0, 4).map((inv) => {
                const isPinged = pingedItems[inv.id];
                return (
                  <div
                    key={inv.id}
                    onClick={() => handleRowClick(inv)}
                    className="py-1.5 px-2.5 rounded-lg border border-neutral-100 dark:border-zinc-800 bg-neutral-50/40 dark:bg-zinc-900/40 hover:bg-neutral-50 dark:hover:bg-zinc-800/60 transition-all flex items-center justify-between gap-2 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-micro font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                        {inv.invoiceNumber}
                      </span>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="text-body-sm font-medium text-neutral-900 dark:text-zinc-100 truncate">
                            {inv.vendor}
                          </span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-semibold ${
                            inv.urgency === "urgent"
                              ? "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                              : "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                          }`}>
                            {inv.daysWaiting}d
                          </span>
                        </div>
                        <span className="text-[11px] text-neutral-500 dark:text-zinc-400 truncate block">
                          {inv.detailReason}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="font-mono text-body-sm font-bold text-neutral-900 dark:text-zinc-100 tabular-nums block">
                          {formatCurrency(inv.amount, inv.currency)}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(inv);
                          }}
                          className="h-6 text-[10px] px-2 font-medium text-indigo-600 dark:text-indigo-400 gap-1"
                        >
                          <span>Resolve</span>
                          <ArrowRight size={11} />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Bottom Queue Footer */}
        <div className="pt-2 border-t border-neutral-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-neutral-500">
          <span>Click any invoice to inspect 3-way match &amp; document preview</span>
          <button
            type="button"
            onClick={() => navigate(activeQueueTab === "APPROVALS" ? "/approvals" : "/exceptions")}
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Open Dedicated Queue</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* ── RIGHT PANEL: 3-TAB MISSION CONTROL (42% width) ── */}
      <div className="lg:col-span-5 rounded-xl border border-neutral-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 p-3.5 flex flex-col justify-between shadow-2xs">
        <div>
          {/* Header Tab Switcher (Flow | Payment Outlook & Aging | Top Suppliers) */}
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-zinc-800/80 p-0.5 rounded-lg text-micro font-medium overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveRightTab("FLOW")}
                className={`px-2 py-0.5 rounded-md transition-all shrink-0 ${
                  activeRightTab === "FLOW"
                    ? "bg-white dark:bg-zinc-700 text-neutral-900 dark:text-zinc-100 shadow-2xs font-semibold"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-zinc-400"
                }`}
              >
                Invoice Flow &amp; Speed
              </button>
              <button
                type="button"
                onClick={() => setActiveRightTab("OUTLOOK")}
                className={`px-2 py-0.5 rounded-md transition-all shrink-0 ${
                  activeRightTab === "OUTLOOK"
                    ? "bg-white dark:bg-zinc-700 text-neutral-900 dark:text-zinc-100 shadow-2xs font-semibold"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-zinc-400"
                }`}
              >
                Payment Outlook &amp; Aging
              </button>
              <button
                type="button"
                onClick={() => setActiveRightTab("EXPOSURE")}
                className={`px-2 py-0.5 rounded-md transition-all shrink-0 ${
                  activeRightTab === "EXPOSURE"
                    ? "bg-white dark:bg-zinc-700 text-neutral-900 dark:text-zinc-100 shadow-2xs font-semibold"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-zinc-400"
                }`}
              >
                Top Suppliers
              </button>
            </div>

            <span className="text-[10px] font-mono text-neutral-400 shrink-0 ml-1">
              {activeRightTab === "FLOW" ? "Linear Funnel" : activeRightTab === "OUTLOOK" ? "Cash Horizon" : "Exposure"}
            </span>
          </div>

          {/* ── View 1: Semantically Correct Linear Funnel ── */}
          {activeRightTab === "FLOW" && (
            <div className="mt-2.5 space-y-2.5">
              <div className="grid grid-cols-3 gap-1.5">
                {linearPipeline.map((stg) => (
                  <button
                    key={stg.key}
                    type="button"
                    onClick={() => navigate(stg.path)}
                    className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                      stg.isBranch
                        ? "border-amber-300 dark:border-amber-800/80 bg-amber-50/50 dark:bg-amber-950/30 hover:border-amber-400"
                        : "border-neutral-100 dark:border-zinc-800 bg-neutral-50/50 dark:bg-zinc-900 hover:border-indigo-300 dark:hover:border-indigo-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-neutral-500 dark:text-zinc-400 truncate block">
                        {stg.label}
                      </span>
                      {stg.isBranch && (
                        <span className="text-[9px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-900/60 px-1 rounded">
                          Branch
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline justify-between mt-0.5">
                      <span className={`font-mono text-body-sm font-bold block ${
                        stg.alert && stg.count > 0 ? "text-amber-600 dark:text-amber-400" : "text-neutral-900 dark:text-zinc-100"
                      }`}>
                        {stg.count}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500 dark:text-zinc-400 font-semibold">
                        {formatCompactCurrency(stg.amount)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* AP Velocity Benchmarks with Period Deltas */}
              <div className="p-2.5 rounded-lg bg-neutral-50/70 dark:bg-zinc-900/60 border border-neutral-100 dark:border-zinc-800 grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-neutral-400 block">Cycle Time</span>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="font-mono text-body-sm font-bold text-neutral-900 dark:text-zinc-100">
                      2.4d
                    </span>
                    <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      (-0.6d)
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 block">Approval Speed</span>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="font-mono text-body-sm font-bold text-neutral-900 dark:text-zinc-100">
                      14.2h
                    </span>
                    <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      (SLA OK)
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 block">Touchless STP</span>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="font-mono text-body-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {data?.touchlessStpRate ?? 79}%
                    </span>
                    <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      (+4.1%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── View 2: Payment Outlook & AP Aging Horizon (NEW) ── */}
          {activeRightTab === "OUTLOOK" && (
            <div className="mt-2.5 space-y-2.5">
              {/* Aging 4-Bucket Grid */}
              <div className="grid grid-cols-2 gap-2">
                {/* Overdue */}
                <button
                  type="button"
                  onClick={() => navigate("/invoices?status=EXCEPTION")}
                  className="p-2 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 text-left hover:border-rose-400 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle size={11} className="text-rose-600" />
                      <span>Overdue</span>
                    </span>
                    <span className="text-[9px] font-mono font-semibold px-1 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200">
                      {aging.overdue.count} invs
                    </span>
                  </div>
                  <span className="font-mono text-base font-bold tabular-nums text-rose-700 dark:text-rose-300 block mt-1">
                    {formatCurrency(aging.overdue.totalAmount, "INR")}
                  </span>
                  <span className="text-[9.5px] text-rose-600/80 dark:text-rose-400/80 block mt-0.5">
                    Critical: immediate risk
                  </span>
                </button>

                {/* Due in 1-7 Days (This Week) */}
                <button
                  type="button"
                  onClick={() => navigate("/payments")}
                  className="p-2 rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 text-left hover:border-indigo-400 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                      <Clock size={11} className="text-indigo-600" />
                      <span>Due 1–7 Days</span>
                    </span>
                    <span className="text-[9px] font-mono font-semibold px-1 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200">
                      {aging.dueIn7Days.count} invs
                    </span>
                  </div>
                  <span className="font-mono text-base font-bold tabular-nums text-indigo-700 dark:text-indigo-300 block mt-1">
                    {formatCurrency(aging.dueIn7Days.totalAmount, "INR")}
                  </span>
                  <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-medium block mt-0.5">
                    ⚡ Save 2% discount
                  </span>
                </button>

                {/* Due in 8-30 Days */}
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
                      {aging.dueIn30Days.count} invs
                    </span>
                  </div>
                  <span className="font-mono text-base font-bold tabular-nums text-neutral-900 dark:text-zinc-100 block mt-1">
                    {formatCurrency(aging.dueIn30Days.totalAmount, "INR")}
                  </span>
                  <span className="text-[9.5px] text-neutral-400 block mt-0.5">
                    Planned settlement run
                  </span>
                </button>

                {/* Due in 30+ Days */}
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
                      {aging.dueLater.count} invs
                    </span>
                  </div>
                  <span className="font-mono text-base font-bold tabular-nums text-neutral-900 dark:text-zinc-100 block mt-1">
                    {formatCurrency(aging.dueLater.totalAmount, "INR")}
                  </span>
                  <span className="text-[9.5px] text-neutral-400 block mt-0.5">
                    Extended credit horizon
                  </span>
                </button>
              </div>

              {/* Visual Maturity Bar */}
              <div className="p-2 rounded-lg bg-neutral-50/70 dark:bg-zinc-900/60 border border-neutral-100 dark:border-zinc-800 space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-neutral-500 dark:text-zinc-400">
                  <span>Cash Outflow Distribution</span>
                  <span className="font-semibold text-neutral-900 dark:text-zinc-200">
                    Total: {formatCurrency(totalAgingAmount, "INR")}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${Math.min(100, ((aging.overdue.totalAmount || 0) / totalAgingAmount) * 100)}%` }}
                    className="bg-rose-500 h-full"
                    title="Overdue"
                  />
                  <div
                    style={{ width: `${Math.min(100, ((aging.dueIn7Days.totalAmount || 0) / totalAgingAmount) * 100)}%` }}
                    className="bg-indigo-600 h-full"
                    title="Due 1-7 Days"
                  />
                  <div
                    style={{ width: `${Math.min(100, ((aging.dueIn30Days.totalAmount || 0) / totalAgingAmount) * 100)}%` }}
                    className="bg-sky-500 h-full"
                    title="Due 8-30 Days"
                  />
                  <div
                    style={{ width: `${Math.min(100, ((aging.dueLater.totalAmount || 0) / totalAgingAmount) * 100)}%` }}
                    className="bg-emerald-500 h-full"
                    title="Due 30+ Days"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── View 3: Supplier Exposure & Risk ── */}
          {activeRightTab === "EXPOSURE" && (
            <div className="mt-2 space-y-1.5 max-h-[195px] overflow-y-auto pr-1">
              {topSuppliers.map((sup) => (
                <div
                  key={sup.id}
                  onClick={() => navigate("/suppliers")}
                  className="p-1.5 rounded-lg border border-neutral-100 dark:border-zinc-800 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-zinc-800/50 cursor-pointer text-caption"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Building2 size={13} className="text-neutral-400 shrink-0" />
                    <span className="font-medium text-neutral-900 dark:text-zinc-100 truncate text-micro">
                      {sup.name}
                    </span>
                  </div>
                  <div className="text-right shrink-0 font-mono text-micro">
                    <span className="font-bold text-neutral-900 dark:text-zinc-100">
                      {formatCurrency(sup.balance, sup.currency)}
                    </span>
                    <span className="text-neutral-400 ml-1.5 text-[10px]">Net {sup.terms}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel Footer */}
        <div className="pt-2 border-t border-neutral-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-neutral-500">
          <span>Target cycle time: &lt;3.0 days</span>
          <button
            type="button"
            onClick={() => navigate(activeRightTab === "FLOW" ? "/invoices" : activeRightTab === "OUTLOOK" ? "/payments" : "/suppliers")}
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{activeRightTab === "FLOW" ? "Full Flow" : activeRightTab === "OUTLOOK" ? "Payment Schedule" : "All Suppliers"}</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
