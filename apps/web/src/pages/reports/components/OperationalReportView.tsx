import { useState } from "react";
import {
  Zap,
  Clock,
  AlertTriangle,
  Wallet,
  CheckCircle2,
  Building2,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "../../../components/ui/Card";
import { StatsCard } from "../../../components/ui/StatsCard";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../../../components/ui/table";
import { formatCurrency } from "../../../lib/formatters";
import { REPORTS_DATA_BY_TIMERANGE, OperationalReportDataset, ThroughputDataPoint } from "../helpers/reportsData";

interface OperationalReportViewProps {
  timeRange: string;
}

export function OperationalReportView({ timeRange }: OperationalReportViewProps) {
  const [hoveredBar, setHoveredBar] = useState<ThroughputDataPoint | null>(null);

  const data: OperationalReportDataset =
    REPORTS_DATA_BY_TIMERANGE[timeRange] ?? REPORTS_DATA_BY_TIMERANGE["30d"];

  const maxThroughput = Math.max(
    ...data.throughputSeries.map((d) => d.processed + d.exceptions),
    1
  );

  const totalProcessedPeriod = data.throughputSeries.reduce((acc, curr) => acc + curr.processed, 0);
  const totalExceptionsPeriod = data.throughputSeries.reduce((acc, curr) => acc + curr.exceptions, 0);

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
       * 1. Primary Analytics KPI Strip
       * ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        <StatsCard
          title={data.kpis.straightThroughRate.title}
          value={data.kpis.straightThroughRate.value}
          change={data.kpis.straightThroughRate.trend?.value}
          changeType="positive"
          subtitle={data.kpis.straightThroughRate.subtitle}
          icon={<Zap size={16} className="text-emerald-600 dark:text-emerald-400" />}
        />
        <StatsCard
          title={data.kpis.avgCycleTime.title}
          value={data.kpis.avgCycleTime.value}
          change={data.kpis.avgCycleTime.trend?.value}
          changeType="positive"
          subtitle={data.kpis.avgCycleTime.subtitle}
          icon={<Clock size={16} className="text-indigo-600 dark:text-indigo-400" />}
        />
        <StatsCard
          title={data.kpis.exceptionResolutionTime.title}
          value={data.kpis.exceptionResolutionTime.value}
          change={data.kpis.exceptionResolutionTime.trend?.value}
          changeType="positive"
          subtitle={data.kpis.exceptionResolutionTime.subtitle}
          icon={<AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />}
        />
        <StatsCard
          title={data.kpis.totalSpendVolume.title}
          value={data.kpis.totalSpendVolume.value}
          subtitle={data.kpis.totalSpendVolume.subtitle}
          icon={<Wallet size={16} className="text-sky-600 dark:text-sky-400" />}
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
       * 2. Volume & Exception Throughput Chart
       * ───────────────────────────────────────────────────────────── */}
      <Card level="surface">
        <CardHeader
          title="Processing Throughput & Exception Distribution"
          description={`Volume processed vs exception discrepancy rate (${totalProcessedPeriod} touchless, ${totalExceptionsPeriod} exceptions flagged)`}
          action={
            <div className="flex items-center gap-4 text-micro font-mono font-medium text-neutral-500 dark:text-zinc-400">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-indigo-600 rounded-full inline-block" />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 inline-block -ml-2" />
                <span>Touchless Throughput</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-amber-500 rounded-full inline-block border-b border-dashed border-amber-500" />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block -ml-2" />
                <span>Exceptions Flagged</span>
              </div>
            </div>
          }
        />
        <CardContent className="space-y-4">
          {/* Sparkline Area Trend Visualization */}
          <div className="relative h-44 w-full pt-3 pb-1 border-b border-neutral-200 dark:border-zinc-800 flex flex-col justify-between">
            {/* Tooltip Overlay */}
            {hoveredBar && (
              <div className="absolute top-1 left-1/2 -translate-x-1/2 z-20 bg-neutral-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-micro font-mono px-3 py-1.5 rounded-md shadow-xl pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 flex items-center gap-3">
                <span className="font-bold text-indigo-300 dark:text-indigo-700">{hoveredBar.dateStr || hoveredBar.label}</span>
                <span className="text-neutral-300 dark:text-zinc-600">•</span>
                <span>{hoveredBar.processed} touchless</span>
                <span className="text-amber-400 dark:text-amber-600 font-semibold">• {hoveredBar.exceptions} exceptions</span>
                <span className="text-emerald-400 dark:text-emerald-600 font-bold">
                  ({Math.round((hoveredBar.processed / (hoveredBar.processed + hoveredBar.exceptions)) * 100)}% STP)
                </span>
              </div>
            )}

            {/* SVG Sparkline Canvas */}
            <div className="w-full flex-1 relative">
              {(() => {
                const items = data.throughputSeries;
                const width = 600;
                const height = 110;
                const padX = 40;
                const padTop = 15;
                const padBottom = 20;
                const plotH = height - padTop - padBottom;
                const stepX = items.length > 1 ? (width - padX * 2) / (items.length - 1) : width / 2;

                const processedCoords = items.map((item, i) => ({
                  x: padX + i * stepX,
                  y: padTop + plotH - (item.processed / maxThroughput) * plotH,
                  item,
                }));

                const exceptionCoords = items.map((item, i) => ({
                  x: padX + i * stepX,
                  y: padTop + plotH - (item.exceptions / maxThroughput) * plotH,
                  item,
                }));

                // Build smooth cubic bezier path for processed curve
                const buildSmoothPath = (coords: { x: number; y: number }[]) => {
                  if (coords.length === 0) return "";
                  let d = `M ${coords[0].x} ${coords[0].y}`;
                  for (let i = 0; i < coords.length - 1; i++) {
                    const p0 = coords[i];
                    const p1 = coords[i + 1];
                    const cp1x = p0.x + (p1.x - p0.x) / 2;
                    const cp1y = p0.y;
                    const cp2x = p0.x + (p1.x - p0.x) / 2;
                    const cp2y = p1.y;
                    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
                  }
                  return d;
                };

                const processedLinePath = buildSmoothPath(processedCoords);
                const exceptionLinePath = buildSmoothPath(exceptionCoords);

                const lastProcessed = processedCoords[processedCoords.length - 1];
                const firstProcessed = processedCoords[0];
                const areaPath = `${processedLinePath} L ${lastProcessed.x} ${height - padBottom} L ${firstProcessed.x} ${height - padBottom} Z`;

                return (
                  <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-full overflow-visible"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="processed-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                        <stop offset="60%" stopColor="#6366f1" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="grid-fade" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.05" />
                        <stop offset="50%" stopColor="currentColor" stopOpacity="0.12" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>

                    {/* Subtle horizontal baseline & midlines */}
                    <line
                      x1={padX}
                      y1={height - padBottom}
                      x2={width - padX}
                      y2={height - padBottom}
                      stroke="currentColor"
                      strokeOpacity="0.1"
                      strokeWidth="1"
                    />
                    <line
                      x1={padX}
                      y1={padTop + plotH * 0.5}
                      x2={width - padX}
                      y2={padTop + plotH * 0.5}
                      stroke="currentColor"
                      strokeOpacity="0.05"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />

                    {/* Processed Area Gradient Fill */}
                    <path d={areaPath} fill="url(#processed-gradient)" />

                    {/* Exceptions Trend Line (Amber Dashed) */}
                    <path
                      d={exceptionLinePath}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="1.75"
                      strokeDasharray="4 3"
                      strokeLinecap="round"
                    />

                    {/* Touchless Throughput Main Trend Curve (Indigo) */}
                    <path
                      d={processedLinePath}
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Exception Data Points */}
                    {exceptionCoords.map((pt, idx) => (
                      <circle
                        key={`ex-${idx}`}
                        cx={pt.x}
                        cy={pt.y}
                        r="3.5"
                        className="fill-amber-500 stroke-white dark:stroke-zinc-900 transition-all hover:r-5 cursor-pointer"
                        strokeWidth="1.5"
                        onMouseEnter={() => setHoveredBar(pt.item)}
                        onMouseLeave={() => setHoveredBar(null)}
                      />
                    ))}

                    {/* Processed Data Points */}
                    {processedCoords.map((pt, idx) => {
                      const isHovered = hoveredBar?.label === pt.item.label;
                      return (
                        <g
                          key={`proc-${idx}`}
                          className="cursor-pointer group"
                          onMouseEnter={() => setHoveredBar(pt.item)}
                          onMouseLeave={() => setHoveredBar(null)}
                        >
                          {/* Invisible hover target */}
                          <rect
                            x={pt.x - 20}
                            y={0}
                            width={40}
                            height={height}
                            fill="transparent"
                          />
                          {/* Glowing halo when active/hovered */}
                          {isHovered && (
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r="8"
                              className="fill-indigo-500/30 animate-ping"
                            />
                          )}
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? "5.5" : "4.5"}
                            className="fill-indigo-600 stroke-white dark:stroke-zinc-900 transition-all shadow-md"
                            strokeWidth="2"
                          />
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}
            </div>

            {/* X-Axis Labels */}
            <div className="flex justify-between px-8 text-micro font-mono font-medium text-neutral-600 dark:text-zinc-400 pt-1">
              {data.throughputSeries.map((item, i) => (
                <div
                  key={i}
                  className={`text-center cursor-pointer transition-colors ${
                    hoveredBar?.label === item.label ? "text-indigo-600 dark:text-indigo-400 font-bold" : ""
                  }`}
                  onMouseEnter={() => setHoveredBar(item)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  <div>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─────────────────────────────────────────────────────────────
       * 3. Secondary Breakdown Grid: Exceptions by Type & Stage SLAs
       * ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* Exception Frequency & Resolution Speed */}
        <Card level="surface" className="h-full flex flex-col">
          <CardHeader
            title="Top Exception Categories & Resolution Speed"
            description="Categorical breakdown with resolution velocity benchmarks"
          />
          <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
            {data.exceptionBreakdown.map((exc) => (
              <div key={exc.type} className="space-y-1.5">
                <div className="flex items-center justify-between text-body-sm">
                  <span className="font-medium text-neutral-800 dark:text-zinc-200">
                    {exc.label}
                  </span>
                  <div className="flex items-center gap-3 font-mono text-micro text-neutral-500">
                    <span>{exc.count} occurrences</span>
                    <span className="font-semibold text-neutral-800 dark:text-zinc-200">{exc.percentage}%</span>
                    <span className="text-neutral-400">Avg {exc.avgResolutionTime}</span>
                  </div>
                </div>
                <div className="h-2 w-full bg-neutral-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${exc.colorClass} rounded-full transition-all duration-300`}
                    style={{ width: `${exc.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Workflow Stage SLA Durations & Bottlenecks */}
        <Card level="surface" className="h-full flex flex-col">
          <CardHeader
            title="Workflow Stage SLA & Bottlenecks"
            description="Linear stage duration tracking against operating benchmarks"
          />
          <CardContent className="p-5 space-y-3">
            {data.stageSlas.map((sla, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-zinc-800 last:border-b-0 text-body-sm"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-neutral-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                    {sla.automated ? (
                      <Zap size={13} className="text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <Clock size={13} className="text-amber-600 dark:text-amber-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-900 dark:text-zinc-100 truncate">
                      {sla.stage}
                    </p>
                    <p className="text-micro font-mono text-neutral-400">
                      Target SLA: {sla.targetSla} • {sla.automated ? "Touchless Automated" : "Human Decision"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono font-semibold text-neutral-900 dark:text-zinc-100">
                    {sla.avgDuration}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                    <CheckCircle2 size={11} />
                    <span>On Track</span>
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ─────────────────────────────────────────────────────────────
       * 4. Top Supplier Velocity & Match Health
       * ───────────────────────────────────────────────────────────── */}
      <Card level="surface">
        <CardHeader
          title="Top Supplier Processing Velocity & Match Quality"
          description="High-volume vendor straight-through rates and turnaround efficiency"
        />
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Volume</TableHead>
                <TableHead className="text-right">Total Spend</TableHead>
                <TableHead className="text-right">Touchless Match %</TableHead>
                <TableHead className="text-right">Avg Cycle Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topVendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-semibold text-neutral-900 dark:text-zinc-100">
                    <div className="flex items-center gap-2">
                      <Building2 size={15} className="text-neutral-400" />
                      <span>{vendor.vendorName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-neutral-600 dark:text-zinc-400 text-caption">
                    {vendor.category}
                  </TableCell>
                  <TableCell className="text-right font-mono text-body-sm font-semibold text-neutral-900 dark:text-zinc-100">
                    {vendor.invoiceCount} invoices
                  </TableCell>
                  <TableCell className="text-right font-mono text-body-sm text-neutral-900 dark:text-zinc-100">
                    {formatCurrency(vendor.totalSpend, "INR")}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span
                      className={`inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full ${
                        vendor.touchlessRate >= 85
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60"
                          : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60"
                      }`}
                    >
                      {vendor.touchlessRate}% STP
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-body-sm font-medium text-neutral-700 dark:text-zinc-300">
                    {vendor.avgCycleHours} hrs
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
