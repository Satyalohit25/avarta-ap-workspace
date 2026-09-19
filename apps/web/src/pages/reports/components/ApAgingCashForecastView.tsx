import { useState, useEffect } from "react";
import {
  Clock,
  AlertTriangle,
  Calendar,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "../../../components/ui/Card";
import { StatsCard } from "../../../components/ui/StatsCard";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../../../components/ui/table";
import { formatCurrency } from "../../../lib/formatters";
import { apiRequest } from "../../../api/client";

interface AgingSummary {
  totalOutstanding: number;
  current: number;
  days31_60: number;
  days61_90: number;
  days91_plus: number;
}

interface VendorAging {
  vendorId: string;
  vendorName: string;
  current: number;
  days31_60: number;
  days61_90: number;
  days91_plus: number;
  total: number;
}

interface CashForecastWeek {
  weekNumber: number;
  startDate: string;
  endDate: string;
  projectedAmount: number;
  paymentCount: number;
}

export function ApAgingCashForecastView() {
  const [aging, setAging] = useState<{
    summary: AgingSummary;
    byVendor: VendorAging[];
    currency: string;
  }>({
    summary: {
      totalOutstanding: 2854000,
      current: 1845000,
      days31_60: 620000,
      days61_90: 245000,
      days91_plus: 144000,
    },
    byVendor: [
      {
        vendorId: "v1",
        vendorName: "Tata Chemicals Industrial Solutions",
        current: 850000,
        days31_60: 120000,
        days61_90: 0,
        days91_plus: 0,
        total: 970000,
      },
      {
        vendorId: "v2",
        vendorName: "Reliance Logistics & Freight Corp",
        current: 420000,
        days31_60: 250000,
        days61_90: 85000,
        days91_plus: 0,
        total: 755000,
      },
      {
        vendorId: "v3",
        vendorName: "Acme Industrial Supplies Pvt Ltd",
        current: 310000,
        days31_60: 150000,
        days61_90: 90000,
        days91_plus: 70000,
        total: 620000,
      },
      {
        vendorId: "v4",
        vendorName: "CloudScale Hosting & Compute",
        current: 265000,
        days31_60: 100000,
        days61_90: 70000,
        days91_plus: 74000,
        total: 509000,
      },
    ],
    currency: "INR",
  });

  const [forecast, setForecast] = useState<{
    totalNext30Days: number;
    weeks: CashForecastWeek[];
    currency: string;
  }>({
    totalNext30Days: 1945000,
    weeks: [
      { weekNumber: 1, startDate: "2026-09-20", endDate: "2026-09-26", projectedAmount: 650000, paymentCount: 5 },
      { weekNumber: 2, startDate: "2026-09-27", endDate: "2026-10-03", projectedAmount: 520000, paymentCount: 4 },
      { weekNumber: 3, startDate: "2026-10-04", endDate: "2026-10-10", projectedAmount: 440000, paymentCount: 3 },
      { weekNumber: 4, startDate: "2026-10-11", endDate: "2026-10-17", projectedAmount: 335000, paymentCount: 2 },
    ],
    currency: "INR",
  });

  useEffect(() => {
    apiRequest<{ data: typeof aging }>("/reports/aging")
      .then((res) => {
        if (res.data) setAging(res.data);
      })
      .catch(() => {});

    apiRequest<{ data: typeof forecast }>("/reports/cash-forecast")
      .then((res) => {
        if (res.data) setForecast(res.data);
      })
      .catch(() => {});
  }, []);

  const total = aging.summary.totalOutstanding || 1;
  const currentPct = Math.round((aging.summary.current / total) * 100);
  const overdue31_60Pct = Math.round((aging.summary.days31_60 / total) * 100);
  const overdue61_90Pct = Math.round((aging.summary.days61_90 / total) * 100);
  const overdue91PlusPct = Math.round((aging.summary.days91_plus / total) * 100);

  const maxWeekly = Math.max(...forecast.weeks.map((w) => w.projectedAmount), 1);

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
       * 1. High-Level Liquidity & AP Aging Metrics
       * ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        <StatsCard
          title="Total Outstanding AP"
          value={formatCurrency(aging.summary.totalOutstanding, aging.currency)}
          subtitle="Across all open and approved invoices"
          icon={<Clock className="text-indigo-600 dark:text-indigo-400" size={20} />}
        />
        <StatsCard
          title="Current (0–30 Days)"
          value={formatCurrency(aging.summary.current, aging.currency)}
          subtitle={`${currentPct}% within standard payment terms`}
          change={`${currentPct}%`}
          changeType="positive"
          icon={<ShieldCheck className="text-emerald-600 dark:text-emerald-400" size={20} />}
        />
        <StatsCard
          title="Critical Overdue (91+ Days)"
          value={formatCurrency(aging.summary.days91_plus, aging.currency)}
          subtitle={`${overdue91PlusPct}% severely aged liabilities`}
          change={`${overdue91PlusPct}%`}
          changeType="negative"
          icon={<AlertTriangle className="text-rose-600 dark:text-rose-400" size={20} />}
        />
        <StatsCard
          title="Next 30D Cash Demand"
          value={formatCurrency(forecast.totalNext30Days, forecast.currency)}
          subtitle="Approved + Scheduled disbursements"
          icon={<Calendar className="text-blue-600 dark:text-blue-400" size={20} />}
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
       * 2. Aging Distribution & 4-Week Cash Forecast
       * ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Aging Buckets Distribution */}
        <Card className="lg:col-span-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-body-sm font-semibold text-neutral-900 dark:text-zinc-100">
                  AP Aging Buckets Distribution
                </h3>
                <p className="text-caption text-neutral-500">
                  Proportion of liabilities by aging bracket relative to due date
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Multi-segment progress bar */}
            <div className="h-4 w-full rounded-full bg-neutral-100 dark:bg-zinc-800 flex overflow-hidden">
              <div
                style={{ width: `${currentPct}%` }}
                className="bg-emerald-500 hover:opacity-90 transition-all"
                title={`Current (0-30D): ${currentPct}%`}
              />
              <div
                style={{ width: `${overdue31_60Pct}%` }}
                className="bg-amber-400 hover:opacity-90 transition-all"
                title={`31-60D: ${overdue31_60Pct}%`}
              />
              <div
                style={{ width: `${overdue61_90Pct}%` }}
                className="bg-orange-500 hover:opacity-90 transition-all"
                title={`61-90D: ${overdue61_90Pct}%`}
              />
              <div
                style={{ width: `${overdue91PlusPct}%` }}
                className="bg-rose-500 hover:opacity-90 transition-all"
                title={`91+D: ${overdue91PlusPct}%`}
              />
            </div>

            {/* Legend & Details */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-micro font-medium text-neutral-600 dark:text-zinc-400">Current (0–30 Days)</span>
                </div>
                <div className="text-body font-semibold text-neutral-900 dark:text-zinc-100 mt-1 font-mono">
                  {formatCurrency(aging.summary.current, aging.currency)}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="text-micro font-medium text-neutral-600 dark:text-zinc-400">31–60 Days</span>
                </div>
                <div className="text-body font-semibold text-neutral-900 dark:text-zinc-100 mt-1 font-mono">
                  {formatCurrency(aging.summary.days31_60, aging.currency)}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <span className="text-micro font-medium text-neutral-600 dark:text-zinc-400">61–90 Days</span>
                </div>
                <div className="text-body font-semibold text-neutral-900 dark:text-zinc-100 mt-1 font-mono">
                  {formatCurrency(aging.summary.days61_90, aging.currency)}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-micro font-medium text-neutral-600 dark:text-zinc-400">91+ Days Critical</span>
                </div>
                <div className="text-body font-semibold text-neutral-900 dark:text-zinc-100 mt-1 font-mono">
                  {formatCurrency(aging.summary.days91_plus, aging.currency)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4-Week Rolling Cash Requirements Forecast */}
        <Card className="lg:col-span-6">
          <CardHeader>
            <div>
              <h3 className="text-body-sm font-semibold text-neutral-900 dark:text-zinc-100">
                Rolling 4-Week Cash Requirements
              </h3>
              <p className="text-caption text-neutral-500">
                Projected cash disbursements required to honor due dates
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {forecast.weeks.map((week) => {
                const heightPct = Math.round((week.projectedAmount / maxWeekly) * 100);
                return (
                  <div key={week.weekNumber} className="space-y-1">
                    <div className="flex items-center justify-between text-caption font-medium">
                      <span className="text-neutral-700 dark:text-zinc-300">
                        Week {week.weekNumber} ({week.startDate} to {week.endDate})
                      </span>
                      <span className="font-mono font-semibold text-neutral-900 dark:text-zinc-100">
                        {formatCurrency(week.projectedAmount, forecast.currency)}
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-neutral-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        style={{ width: `${heightPct}%` }}
                        className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-neutral-100 dark:border-zinc-800 flex items-center justify-between text-caption text-neutral-500">
              <span>Total 30-Day Cash Demand</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono text-body-sm">
                {formatCurrency(forecast.totalNext30Days, forecast.currency)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─────────────────────────────────────────────────────────────
       * 3. Vendor Aging Table
       * ───────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div>
            <h3 className="text-body-sm font-semibold text-neutral-900 dark:text-zinc-100">
              Vendor Aging Breakdown
            </h3>
            <p className="text-caption text-neutral-500">
              Aged payables organized by vendor partner to assist treasury settlement scheduling
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Current (0–30D)</TableHead>
                <TableHead className="text-right">31–60 Days</TableHead>
                <TableHead className="text-right">61–90 Days</TableHead>
                <TableHead className="text-right">91+ Days</TableHead>
                <TableHead className="text-right font-semibold">Total Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aging.byVendor.map((vendor) => (
                <TableRow key={vendor.vendorId}>
                  <TableCell className="font-medium text-neutral-900 dark:text-zinc-100 flex items-center gap-2">
                    <Building2 size={15} className="text-neutral-400" />
                    <span>{vendor.vendorName}</span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(vendor.current, aging.currency)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-amber-600 dark:text-amber-400">
                    {formatCurrency(vendor.days31_60, aging.currency)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-orange-600 dark:text-orange-400">
                    {formatCurrency(vendor.days61_90, aging.currency)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-rose-600 dark:text-rose-400 font-semibold">
                    {formatCurrency(vendor.days91_plus, aging.currency)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-neutral-900 dark:text-zinc-100">
                    {formatCurrency(vendor.total, aging.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
