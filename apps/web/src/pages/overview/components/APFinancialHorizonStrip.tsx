import { useNavigate } from "react-router-dom";
import { formatCurrency } from "../../../lib/formatters";
import { DashboardOverview } from "../../../api/dashboard";
import { ArrowUpRight, TrendingDown, TrendingUp, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

interface APFinancialHorizonStripProps {
  data: DashboardOverview | null;
  releasedAmount?: number;
  releasedCount?: number;
}

export function APFinancialHorizonStrip({
  data,
  releasedAmount = 0,
  releasedCount = 0,
}: APFinancialHorizonStripProps) {
  const navigate = useNavigate();

  const totalOutstanding = Number(data?.totalOutstanding) || 0;
  const rawBlocked = data?.totalBlockedAmount || 0;
  const currentBlocked = Math.max(0, rawBlocked - releasedAmount);
  const totalBlockedCount = Math.max(0, (data?.totalBlockedCount || 0) - releasedCount);

  const due7DaysCount = data?.dueIn7Days?.count || 0;
  const due7DaysAmount = data?.dueIn7Days?.totalAmount || 0;

  const rawAwaitingAmount = data?.pendingApprovalAmount || 0;
  const awaitingCount = Math.max(0, (data?.pendingApproval || 0) - releasedCount);
  const awaitingAmount = Math.max(0, rawAwaitingAmount - releasedAmount);

  const rawScheduledAmount = data?.scheduledAmount || 0;
  const scheduledCount = (data?.scheduledPayments || 0) + releasedCount;
  const scheduledAmount = rawScheduledAmount + releasedAmount;

  const currency = data?.currency || "INR";

  const anchors = [
    {
      label: "TOTAL AP OUTSTANDING",
      value: formatCurrency(totalOutstanding, currency),
      subtitle: `${data?.totalInvoices || 0} invoices tracked`,
      delta: {
        text: "↓ 4.2% vs last mo",
        type: "positive" as const,
        note: "Working capital improving",
      },
      path: "/invoices",
      highlight: false,
    },
    {
      label: "ACTION REQUIRED / BLOCKED",
      value: formatCurrency(currentBlocked, currency),
      subtitle: `${totalBlockedCount} blocked in queue`,
      delta: {
        text: "↓ 12.5% vs last wk",
        type: "positive" as const,
        note: "Exception resolution up",
      },
      path: "/exceptions",
      highlight: currentBlocked > 0,
    },
    {
      label: "PAYMENT OUTLOOK (DUE 7D)",
      value: formatCurrency(due7DaysAmount, currency),
      subtitle: `${due7DaysCount} maturing this week`,
      delta: {
        text: "⚡ Save ₹17,750 (2%)",
        type: "discount" as const,
        note: "Early discount capture",
      },
      path: "/payments",
      highlight: false,
    },
    {
      label: "SCHEDULED FOR PAYMENT",
      value: formatCurrency(scheduledAmount, currency),
      subtitle: `${scheduledCount} batches queued`,
      delta: {
        text: "↑ 4 runs on schedule",
        type: "neutral" as const,
        note: "Settlement on track",
      },
      path: "/payments",
      highlight: releasedCount > 0,
    },
    {
      label: "PENDING APPROVAL",
      value: formatCurrency(awaitingAmount, currency),
      subtitle: `${awaitingCount} awaiting sign-off`,
      delta: {
        text: "↓ 1.8d turnaround",
        type: "positive" as const,
        note: "Approval SLA met",
      },
      path: "/approvals",
      highlight: awaitingCount > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
      {anchors.map((item, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => navigate(item.path)}
          className="p-3.5 rounded-xl border border-neutral-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 hover:border-indigo-400 dark:hover:border-indigo-700 transition-all text-left group shadow-2xs cursor-pointer flex flex-col justify-between"
        >
          {/* Header & Label */}
          <div className="flex items-center justify-between w-full mb-1.5">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-500 dark:text-zinc-400 truncate">
              {item.label}
            </span>
            <ArrowUpRight
              size={13}
              className="text-neutral-400 dark:text-zinc-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0 ml-1"
            />
          </div>

          {/* Amount (Dominant Visual Metric) */}
          <div className="my-1">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-zinc-50 tracking-tight block">
              {item.value}
            </span>
          </div>

          {/* Subtitle & Period Delta Indicator */}
          <div className="mt-1.5 pt-1.5 border-t border-neutral-100 dark:border-zinc-800/80 space-y-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] text-neutral-500 dark:text-zinc-400 truncate">
                {item.subtitle}
              </span>
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.2 rounded shrink-0 border ${
                  item.delta.type === "discount"
                    ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/80 dark:border-emerald-800/60"
                    : item.delta.type === "positive"
                    ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-900/40"
                    : "text-indigo-700 dark:text-indigo-300 bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200/60 dark:border-indigo-900/40"
                }`}
                title={item.delta.note}
              >
                {item.delta.text}
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
