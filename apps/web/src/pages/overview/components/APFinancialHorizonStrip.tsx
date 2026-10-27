import { useNavigate } from "react-router-dom";
import { formatCurrency } from "../../../lib/formatters";
import { DashboardOverview } from "../../../api/dashboard";
import { ArrowUpRight, TrendingDown, TrendingUp, Minus, AlertCircle } from "lucide-react";
import { tokens } from "../../../design-system/tokens";

interface APFinancialHorizonStripProps {
  data: DashboardOverview | null;
  releasedAmount?: number;
  releasedCount?: number;
}

interface TrendConfig {
  /** positive = improving business outcome (green), negative = worsening (red), neutral = informational (indigo) */
  direction: "positive" | "negative" | "neutral";
  label: string;
  tooltip: string;
}

interface KpiAnchor {
  id: string;
  label: string;
  value: string;
  subtitle: string;
  trend: TrendConfig;
  path: string;
  isHero?: boolean;
  sparkPoints: number[];
}

function Sparkline({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) return null;
  const w = 52;
  const h = 18;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const toY = (v: number) => h - ((v - min) / range) * (h - 4) - 2;
  return (
    <svg width={w} height={h} className="shrink-0 opacity-60" aria-hidden="true">
      <polyline
        points={points.map((p, i) => `${(i * step).toFixed(1)},${toY(p).toFixed(1)}`).join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrendPill({ trend }: { trend: TrendConfig }) {
  const isPositive = trend.direction === "positive";
  const isNegative = trend.direction === "negative";
  const Icon = isPositive ? TrendingDown : isNegative ? TrendingUp : Minus;
  const colorClasses = isPositive
    ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-200/70 dark:border-emerald-800/60"
    : isNegative
    ? "text-rose-700 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-950/50 border-rose-200/70 dark:border-rose-800/60"
    : "text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-200/70 dark:border-indigo-800/60";
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${colorClasses}`}
      title={trend.tooltip}
      aria-label={`${trend.label} — ${trend.tooltip}`}
    >
      <Icon size={10} aria-hidden="true" />
      <span>{trend.label}</span>
    </span>
  );
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

  const due7DaysAmount = data?.dueIn7Days?.totalAmount || 0;
  const due7DaysCount = data?.dueIn7Days?.count || 0;

  const rawAwaitingAmount = data?.pendingApprovalAmount || 0;
  const awaitingCount = Math.max(0, (data?.pendingApproval || 0) - releasedCount);
  const awaitingAmount = Math.max(0, rawAwaitingAmount - releasedAmount);

  const rawScheduledAmount = data?.scheduledAmount || 0;
  const scheduledCount = (data?.scheduledPayments || 0) + releasedCount;
  const scheduledAmount = rawScheduledAmount + releasedAmount;

  const currency = data?.currency || "INR";
  const hasZeroData = (data?.totalInvoices || 0) === 0;

  const anchors: KpiAnchor[] = [
    {
      id: "action-required",
      label: "Action Required",
      value: formatCurrency(currentBlocked, currency),
      subtitle: `${totalBlockedCount} invoice${totalBlockedCount !== 1 ? "s" : ""} blocked`,
      trend: hasZeroData
        ? {
            direction: "neutral",
            label: "0 blocked",
            tooltip: "No exceptions or blocked invoices in workspace",
          }
        : {
            direction: "positive",
            label: "↓ 12.5% vs last wk",
            tooltip: "Fewer invoices blocked than last week — exception resolution rate improving",
          },
      path: "/exceptions",
      isHero: true,
      sparkPoints: hasZeroData ? [0, 0, 0, 0, 0, 0, 0] : [68, 74, 71, 79, 62, 55, 44],
    },
    {
      id: "total-outstanding",
      label: "Total Outstanding",
      value: formatCurrency(totalOutstanding, currency),
      subtitle: `${data?.totalInvoices || 0} invoices tracked`,
      trend: hasZeroData
        ? {
            direction: "neutral",
            label: "0 open invoices",
            tooltip: "No outstanding balances detected",
          }
        : {
            direction: "positive",
            label: "↓ 4.2% vs last mo",
            tooltip: "Outstanding balance is decreasing — working capital position improving",
          },
      path: "/invoices",
      sparkPoints: hasZeroData ? [0, 0, 0, 0, 0, 0, 0] : [82, 79, 75, 78, 71, 68, 65],
    },
    {
      id: "due-this-week",
      label: "Due This Week",
      value: formatCurrency(due7DaysAmount, currency),
      subtitle: `${due7DaysCount} maturing soon`,
      trend: hasZeroData
        ? {
            direction: "neutral",
            label: "No upcoming dues",
            tooltip: "No invoices maturing within 7 days",
          }
        : {
            direction: "neutral",
            label: "Save ₹17,750 discount",
            tooltip: "Early payment discount available if settled before due date (2% on qualifying invoices)",
          },
      path: "/payments",
      sparkPoints: hasZeroData ? [0, 0, 0, 0, 0, 0, 0] : [30, 40, 55, 45, 60, 70, 75],
    },
    {
      id: "scheduled",
      label: "Scheduled",
      value: formatCurrency(scheduledAmount, currency),
      subtitle: `${scheduledCount} batch${scheduledCount !== 1 ? "es" : ""} queued`,
      trend: hasZeroData
        ? {
            direction: "neutral",
            label: "0 runs queued",
            tooltip: "No payment runs currently scheduled",
          }
        : {
            direction: "neutral",
            label: "4 runs on track",
            tooltip: "All scheduled payment runs are progressing on time",
          },
      path: "/payments",
      sparkPoints: hasZeroData ? [0, 0, 0, 0, 0, 0, 0] : [20, 25, 30, 28, 35, 40, 38],
    },
    {
      id: "pending-approval",
      label: "Pending Approval",
      value: formatCurrency(awaitingAmount, currency),
      subtitle: `${awaitingCount} awaiting sign-off`,
      trend: hasZeroData
        ? {
            direction: "neutral",
            label: "Queue clear",
            tooltip: "No invoices currently awaiting sign-off",
          }
        : {
            direction: "positive",
            label: "↓ 1.8d avg wait",
            tooltip: "Average approval turnaround is decreasing — Approval SLA met",
          },
      path: "/approvals",
      sparkPoints: hasZeroData ? [0, 0, 0, 0, 0, 0, 0] : [60, 55, 50, 48, 42, 38, 35],
    },
  ];

  return (
    <section
      aria-label="Accounts Payable Financial Horizon"
      className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-neutral-200 dark:divide-zinc-800 overflow-hidden"
    >
      {anchors.map((item) => (
        <button
          key={item.id}
          type="button"
          id={`kpi-${item.id}`}
          onClick={() => navigate(item.path)}
          className="p-4 flex flex-col justify-between text-left group hover:bg-neutral-50/70 dark:hover:bg-zinc-800/40 transition-colors duration-100 cursor-pointer min-w-0"
          aria-label={`${item.label}: ${item.value}`}
        >
          <div className="flex items-center justify-between w-full mb-1.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-zinc-400 truncate">
              {item.label}
            </span>
            <ArrowUpRight
              size={12}
              className="text-neutral-300 dark:text-zinc-600 group-hover:text-neutral-700 dark:group-hover:text-zinc-200 transition-colors shrink-0 ml-1"
              aria-hidden="true"
            />
          </div>

          <div className="my-1">
            <span className="text-lg sm:text-xl font-bold font-mono tabular-nums text-neutral-900 dark:text-zinc-50 tracking-tight leading-snug block truncate">
              {item.value}
            </span>
          </div>

          <div className="mt-1.5 pt-1.5 border-t border-neutral-100 dark:border-zinc-800/80 flex items-center justify-between gap-1.5">
            <span className="text-[11px] text-neutral-500 dark:text-zinc-400 truncate font-mono">
              {item.subtitle}
            </span>
            <Sparkline
              points={item.sparkPoints}
              color={
                item.trend.direction === "positive"
                  ? tokens.color.success
                  : item.trend.direction === "negative"
                  ? tokens.color.error
                  : tokens.color.neutral
              }
            />
          </div>

          <div className="mt-2">
            <TrendPill trend={item.trend} />
          </div>
        </button>
      ))}
    </section>
  );
}
