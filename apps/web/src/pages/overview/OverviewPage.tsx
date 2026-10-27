import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Inbox, RefreshCw } from "lucide-react";
import { DashboardOverview, getDashboardOverview } from "../../api/dashboard";
import { SkeletonRows } from "../../components/Skeleton";
import { Button } from "../../components/ui/Button";
import { useToast } from "../../components/ui/ToastContext";
import { APFinancialHorizonStrip } from "./components/APFinancialHorizonStrip";
import { APWorkstationGrid } from "./components/APWorkstationGrid";
import { APRecentStreamCard } from "./components/APRecentStreamCard";


import { EmptyDashboardChecklist } from "./components/EmptyDashboardChecklist";
import { ProductTourModal } from "../../components/layout/ProductTourModal";

export default function OverviewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [tourOpen, setTourOpen] = useState(false);


  const fetchDashboard = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    getDashboardOverview()
      .then((res) => {
        setData(res.data);
        setLastRefreshed(new Date());
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const timeFormatted = lastRefreshed.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });

  // No demo data — honest start per Experience Standard v1.0 §7
  const streamItems = data?.recentStream ?? [];
  const hasZeroInvoices = (data?.totalInvoices ?? 0) === 0 && streamItems.length === 0;

  return (
    <div className="space-y-4 pb-0">
      {/* ── Compact Header Bar ── */}
      <div className="flex items-center justify-between pb-0.5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-zinc-100">
              Overview
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200/60 dark:border-indigo-900/60">
              Mission Control
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-zinc-400 mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span>Operational cash horizon, actionable work queue, and pipeline velocity</span>
            <span className="text-neutral-400 dark:text-zinc-500">·</span>
            <span className="whitespace-nowrap">Updated {timeFormatted}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchDashboard(true)}
            disabled={refreshing || loading}
            className="h-8 px-2.5 rounded-lg border border-neutral-200 dark:border-zinc-700 text-[11px] font-medium text-neutral-600 dark:text-zinc-400 hover:bg-neutral-50 dark:hover:bg-zinc-800 transition-colors duration-100 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh dashboard data"
            aria-label="Refresh dashboard"
          >
            <RefreshCw
              size={12}
              className={refreshing ? "animate-spin text-indigo-500" : "text-neutral-400"}
              aria-hidden="true"
            />
            <span>{refreshing ? "Refreshing…" : "Refresh"}</span>
          </button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/invoices")}
            className="h-8 text-[11px] font-medium"
          >
            Review Invoices
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => navigate("/inbox")}
            className="h-8 text-[11px] font-semibold gap-1.5 shadow-2xs"
          >
            <Inbox size={14} />
            <span>Receive Invoice</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <SkeletonRows count={4} />
      ) : hasZeroInvoices ? (
        /* C1-5 & B2: With no data, show setup guidance & interactive checklist instead of zeros */
        <EmptyDashboardChecklist onOpenTour={() => setTourOpen(true)} />
      ) : (
        <>
          {/* ── Band 1: Financial Horizon & Top Metric Anchors ── */}
          <APFinancialHorizonStrip data={data} />

          {/* ── Band 2: Dual-Panel Operational Workstation ── */}
          <APWorkstationGrid
            data={data}
            onInspectInvoice={(id) => navigate(`/invoices/${id}`)}
          />

          {/* ── Band 3: Real-Time Ingestion & Activity Stream ── */}
          <APRecentStreamCard items={streamItems} />

        </>
      )}

      <ProductTourModal isOpen={tourOpen} onClose={() => setTourOpen(false)} />
    </div>
  );
}
