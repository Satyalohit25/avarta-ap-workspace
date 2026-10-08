import { useNavigate } from "react-router-dom";
import { formatCurrency } from "../../../lib/formatters";
import { DashboardOverview } from "../../../api/dashboard";
import { ArrowUpRight, TrendingDown, TrendingUp, Minus, AlertCircle } from "lucide-react";

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

  const anchors: KpiAnchor[] = [
    {
      id: "action-required",
      label: "Action Required",
      value: formatCurrency(currentBlocked, currency),
      subtitle: `${totalBlockedCount} invoice${totalBlockedCount !== 1 ? "s" : ""} blocked`,
      trend: {
        direction: "positive",
        label: "↓ 12.5% vs last wk",
        tooltip: "Fewer invoices blocked than last week — exception resolution rate improving",
      },
      path: "/exceptions",
      isHero: true,
      sparkPoints: [68, 74, 71, 79, 62, 55, 44],
    },
    {
      id: "total-outstanding",
      label: "Total Outstanding",
      value: formatCurrency(totalOutstanding, currency),
      subtitle: `${data?.totalInvoices || 0} invoices tracked`,
      trend: {
        direction: "positive",
        label: "↓ 4.2% vs last mo",
        tooltip: "Outstanding balance is decreasing — working capital position improving",
      },
      path: "/invoices",
      sparkPoints: [82, 79, 75, 78, 71, 68, 65],
    },
    {
      id: "due-this-week",
      label: "Due This Week",
      value: formatCurrency(due7DaysAmount, currency),
      subtitle: `${due7DaysCount} maturing soon`,
      trend: {
        direction: "neutral",
        label: "⚡ Save ₹17,750",
        tooltip: "Early payment discount available if settled before due date (2% on qualifying invoices)",
      },
      path: "/payments",
      sparkPoints: [30, 40, 55, 45, 60, 70, 75],
    },
    {
      id: "scheduled",
      label: "Scheduled",
      value: formatCurrency(scheduledAmount, currency),
      subtitle: `${scheduledCount} batch${scheduledCount !== 1 ? "es" : ""} queued`,
      trend: {
        direction: "neutral",
        label: "4 runs on track",
        tooltip: "All scheduled payment runs are progressing on time",
      },
      path: "/payments",
      sparkPoints: [20, 25, 30, 28, 35, 40, 38],
    },
    {
      id: "pending-approval",
      label: "Pending Approval",
      value: formatCurrency(awaitingAmount, currency),
      subtitle: `${awaitingCount} awaiting sign-off`,
      trend: {
        direction: "positive",
        label: "↓ 1.8d avg wait",
        tooltip: "Average approval turnaround is decreasing — Approval SLA met",
      },
      path: "/approvals",
      sparkPoints: [60, 55, 50, 48, 42, 38, 35],
    },
  ];

  const [hero, ...secondary] = anchors;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
      {/* ── HERO CARD: Action Required — single focal point ── */}
      <button
        type="button"
        id="kpi-action-required"
        onClick={() => navigate(hero.path)}
        className="lg:col-span-3 p-4 rounded-xl border-2 border-indigo-400/70 dark:border-indigo-600/60 bg-indigo-50/40 dark:bg-indigo-950/25 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all text-left group shadow-sm cursor-pointer flex flex-col justify-between relative overflow-hidden"
        aria-label={`${hero.label}: ${hero.value}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" aria-hidden="true" />

        <div className="flex items-center justify-between w-full mb-2 relative">
          <div className="flex items-center gap-1.5">
            <AlertCircle size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              {hero.label}
            </span>
          </div>
          <ArrowUpRight
            size={13}
            className="text-indigo-400 dark:text-indigo-500 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors shrink-0"
            aria-hidden="true"
          />
        </div>

        <div className="my-1.5 relative">
          <span className="text-[1.65rem] font-bold font-mono tabular-nums text-neutral-900 dark:text-zinc-50 tracking-tight leading-tight block">
            {hero.value}
          </span>
        </div>

        <div className="mt-2 pt-2 border-t border-indigo-200/50 dark:border-indigo-800/40 flex items-end justify-between gap-2 relative">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-indigo-700/70 dark:text-indigo-300/70 font-medium">
              {hero.subtitle}
            </span>
            <TrendPill trend={hero.trend} />
          </div>
          <Sparkline points={hero.sparkPoints} color="#4F46E5" />
        </div>
      </button>

      {/* ── SECONDARY CARDS: quieter, equal visual weight ── */}
      <div className="lg:col-span-9 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {secondary.map((item) => (
          <button
            key={item.id}
            type="button"
            id={`kpi-${item.id}`}
            onClick={() => navigate(item.path)}
            className="p-3.5 rounded-xl border border-neutral-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 hover:border-neutral-300 dark:hover:border-zinc-700 transition-all text-left group shadow-2xs cursor-pointer flex flex-col justify-between"
            aria-label={`${item.label}: ${item.value}`}
          >
            <div className="flex items-center justify-between w-full mb-1.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-zinc-400 truncate">
                {item.label}
              </span>
              <ArrowUpRight
                size={12}
                className="text-neutral-300 dark:text-zinc-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors shrink-0 ml-1"
                aria-hidden="true"
              />
            </div>

            <div className="my-1">
              <span className="text-[1.15rem] font-bold font-mono tabular-nums text-neutral-900 dark:text-zinc-50 tracking-tight leading-snug block">
                {item.value}
              </span>
            </div>

            <div className="mt-1.5 pt-1.5 border-t border-neutral-100 dark:border-zinc-800/80 flex items-center justify-between gap-1.5">
              <span className="text-[11px] text-neutral-500 dark:text-zinc-400 truncate">
                {item.subtitle}
              </span>
              <Sparkline
                points={item.sparkPoints}
                color={
                  item.trend.direction === "positive"
                    ? "#16A34A"
                    : item.trend.direction === "negative"
                    ? "#DC2626"
                    : "#6B7280"
                }
              />
            </div>

            <div className="mt-1.5">
              <TrendPill trend={item.trend} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
