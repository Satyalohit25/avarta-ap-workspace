import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Inbox, RefreshCw } from "lucide-react";
import { DashboardOverview, getDashboardOverview, StreamItem } from "../../api/dashboard";
import { transitionInvoice } from "../../api/invoices";
import { SkeletonRows } from "../../components/Skeleton";
import { Button } from "../../components/ui/Button";
import { useToast } from "../../components/ui/ToastContext";
import { APFinancialHorizonStrip } from "./components/APFinancialHorizonStrip";
import { APWorkstationGrid } from "./components/APWorkstationGrid";
import { APRecentStreamCard } from "./components/APRecentStreamCard";

const FALLBACK_PIPELINE_FEED: StreamItem[] = [
  {
    id: "demo-inv-1",
    invoiceNumber: "INV-2026-8801",
    vendor: "Acme Industrial Supplies",
    channel: "EMAIL",
    stage: "Pending Approval",
    statusVariant: "warning",
    amount: 12450.0,
    currency: "INR",
    confidence: 98,
  },
  {
    id: "demo-inv-2",
    invoiceNumber: "INV-2026-9022",
    vendor: "Delta Heavy Electricals",
    channel: "UPLOAD",
    stage: "Exception Flagged",
    statusVariant: "error",
    amount: 48900.0,
    currency: "INR",
    confidence: 76,
  },
  {
    id: "demo-inv-3",
    invoiceNumber: "INV-2026-7409",
    vendor: "Zenith Fluid Power Ltd",
    channel: "PORTAL",
    stage: "Payment Scheduled",
    statusVariant: "info",
    amount: 83400.0,
    currency: "INR",
    confidence: 96,
  },
  {
    id: "demo-inv-4",
    invoiceNumber: "INV-2026-6102",
    vendor: "Apex Precision Tools",
    channel: "EMAIL",
    stage: "3-Way Match Verified",
    statusVariant: "success",
    amount: 23100.0,
    currency: "INR",
    confidence: 99,
  },
];

export default function OverviewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [releasedInvoices, setReleasedInvoices] = useState<Record<string, boolean>>({});
  const [releasedCount, setReleasedCount] = useState<number>(0);
  const [releasedAmount, setReleasedAmount] = useState<number>(0);

  const handleAuthorizeRelease = async (invoiceId: string, amount: number) => {
    try {
      await transitionInvoice(invoiceId, "APPROVE", "Authorized and released via Overview Mission Control");
      setReleasedInvoices((prev) => ({ ...prev, [invoiceId]: true }));
      setReleasedCount((prev) => prev + 1);
      setReleasedAmount((prev) => prev + amount);
      toast.success(
        "Invoice Approved & Released",
        "Disbursable release authorized. Moved to Scheduled Payments."
      );
      getDashboardOverview().then((res) => setData(res.data)).catch(() => {});
    } catch (err: unknown) {
      toast.error(
        "Authorization Failed",
        err instanceof Error ? err.message : "Failed to authorize invoice release."
      );
    }
  };

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

  const streamItems =
    data?.recentStream && data.recentStream.length > 0
      ? data.recentStream
      : FALLBACK_PIPELINE_FEED;

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
          <p className="text-[11px] text-neutral-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1.5">
            <span>Operational cash horizon, actionable work queue, and pipeline velocity</span>
            <span className="text-neutral-400 dark:text-zinc-500">·</span>
            <span>Updated {timeFormatted}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchDashboard(true)}
            disabled={refreshing || loading}
            className="h-8 px-2.5 rounded-lg border border-neutral-200 dark:border-zinc-700 text-[11px] font-medium text-neutral-600 dark:text-zinc-400 hover:bg-neutral-50 dark:hover:bg-zinc-800 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
      ) : (
        <>
          {/* ── Band 1: Financial Horizon & Top Metric Anchors ── */}
          <APFinancialHorizonStrip
            data={data}
            releasedAmount={releasedAmount}
            releasedCount={releasedCount}
          />

          {/* ── Band 2: Dual-Panel Operational Workstation ── */}
          <APWorkstationGrid
            data={data}
            onInspectInvoice={(id) => navigate(`/invoices/${id}`)}
            releasedInvoices={releasedInvoices}
            releasedCount={releasedCount}
            releasedAmount={releasedAmount}
            onAuthorizeRelease={handleAuthorizeRelease}
          />

          {/* ── Band 3: Real-Time Ingestion & Activity Stream ── */}
          <APRecentStreamCard items={streamItems} />
        </>
      )}
    </div>
  );
}
