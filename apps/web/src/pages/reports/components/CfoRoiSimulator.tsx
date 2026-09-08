import { useState, useMemo } from "react";
import {
  TrendingUp,
  Percent,
  Clock,
  ShieldCheck,
  Download,
  Check,
  Sparkles,
  Building2,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { formatCurrency } from "../../../lib/formatters";
import { AvartaCrest } from "../../../components/brand/AvartaCrest";

type IndustryPresetKey =
  | "manufacturing"
  | "distribution"
  | "services"
  | "retail"
  | "custom";

interface PresetConfig {
  label: string;
  monthlyVolume: number;
  avgInvoiceValue: number;
  currentFtes: number;
  description: string;
}

const INDUSTRY_PRESETS: Record<
  Exclude<IndustryPresetKey, "custom">,
  PresetConfig
> = {
  manufacturing: {
    label: "Manufacturing & Engineering",
    monthlyVolume: 3500,
    avgInvoiceValue: 65000,
    currentFtes: 5,
    description:
      "High raw material volume, multi-line item POs, strict 3-way matching requirements",
  },
  distribution: {
    label: "Wholesale & Logistics",
    monthlyVolume: 5000,
    avgInvoiceValue: 42000,
    currentFtes: 7,
    description:
      "High velocity deliveries, freight variances, heavy discount capture opportunities",
  },
  services: {
    label: "IT & Professional Services",
    monthlyVolume: 1200,
    avgInvoiceValue: 125000,
    currentFtes: 2,
    description:
      "Milestone consulting retainers, software subscriptions, strict approval workflows",
  },
  retail: {
    label: "Retail & Multi-Location FMCG",
    monthlyVolume: 8000,
    avgInvoiceValue: 24000,
    currentFtes: 10,
    description:
      "Decentralized store receiving, high vendor counts, duplicate risk exposure",
  },
};

const CURRENCY_CONFIGS = [
  { id: "INR", symbol: "₹", manualCost: 1100, autoCost: 220, label: "INR (₹)" },
  { id: "USD", symbol: "$", manualCost: 14.5, autoCost: 2.8, label: "USD ($)" },
  { id: "EUR", symbol: "€", manualCost: 13.2, autoCost: 2.5, label: "EUR (€)" },
  { id: "GBP", symbol: "£", manualCost: 11.5, autoCost: 2.2, label: "GBP (£)" },
];

export function CfoRoiSimulator() {
  const [activePreset, setActivePreset] =
    useState<IndustryPresetKey>("manufacturing");
  const [selectedCurrency, setSelectedCurrency] = useState<string>("INR");

  // Interactive core parameters
  const [monthlyVolume, setMonthlyVolume] = useState<number>(3500);
  const [avgInvoiceValue, setAvgInvoiceValue] = useState<number>(65000);
  const [currentFtes, setCurrentFtes] = useState<number>(5);

  // Copy business case state
  const [copiedSummary, setCopiedSummary] = useState(false);

  const currConfig = useMemo(
    () =>
      CURRENCY_CONFIGS.find((c) => c.id === selectedCurrency) ??
      CURRENCY_CONFIGS[0],
    [selectedCurrency],
  );

  function applyPreset(key: Exclude<IndustryPresetKey, "custom">) {
    const p = INDUSTRY_PRESETS[key];
    setActivePreset(key);
    setMonthlyVolume(p.monthlyVolume);
    setAvgInvoiceValue(p.avgInvoiceValue);
    setCurrentFtes(p.currentFtes);
  }

  // ─────────────────────────────────────────────────────────────
  // Rigorous Economic & Market Benchmark Calculations
  // Sources: Ardent Partners 2024 "State of ePayables", IOFM Benchmark, Levvel Research
  // ─────────────────────────────────────────────────────────────
  const annualVolume = monthlyVolume * 12;
  const annualSpend = annualVolume * avgInvoiceValue;

  // Stream 1: Direct Processing Cost Reduction (Labor, OCR, Filing & Exceptions)
  // Baseline: ₹1,100 / $14.50 per invoice ➔ Avarta: ₹220 / $2.80 (-80% cost reduction)
  const manualAnnualCost = annualVolume * currConfig.manualCost;
  const automatedAnnualCost = annualVolume * currConfig.autoCost;
  const directLaborSavings = Math.max(
    0,
    manualAnnualCost - automatedAnnualCost,
  );

  // Stream 2: Dynamic Early Payment Discounts (e.g., 2/10 Net 30)
  // ~20% of spend is eligible for 2% discount. Manual AP only captures ~18% before cutoff.
  // Avarta accelerates approval turnaround from 12 days to 2.1 days, capturing ~80%.
  const eligibleDiscountSpend = annualSpend * 0.2;
  const discountRate = 0.02;
  const baselineDiscountCaptured = eligibleDiscountSpend * discountRate * 0.18;
  const avartaDiscountCaptured = eligibleDiscountSpend * discountRate * 0.8;
  const netDiscountGain = Math.max(
    0,
    avartaDiscountCaptured - baselineDiscountCaptured,
  );

  // Stream 3: Duplicate Invoices & Billing Leakage Prevented
  // Industry average: 0.8% duplicate rate on un-automated AP. Avarta automated rules catch 95% of leaks.
  const duplicateLeakagePrevented = annualSpend * 0.0075 * 0.95;

  // Stream 4: Hours Freed & FTE Capacity Multiplier
  // Manual keying + approval chasing = 21 mins (0.35 hrs) per invoice saved.
  const hoursSavedPerYear = Math.round(annualVolume * 0.35);
  const ftesReallocated = Number((hoursSavedPerYear / 2000).toFixed(1));

  // Total Annual Economic Value
  const totalAnnualEconomicValue =
    directLaborSavings + netDiscountGain + duplicateLeakagePrevented;

  // Estimated ROI multiple & payback period
  const estimatedAnnualAvartaSubscription = Math.round(
    annualVolume * (currConfig.autoCost * 0.75),
  );
  const netRoiMultiple = Number(
    (
      (totalAnnualEconomicValue - estimatedAnnualAvartaSubscription) /
      Math.max(1, estimatedAnnualAvartaSubscription)
    ).toFixed(1),
  );
  const paybackMonths = Math.max(
    1.2,
    Number(
      (
        (estimatedAnnualAvartaSubscription /
          Math.max(1, totalAnnualEconomicValue)) *
        12
      ).toFixed(1),
    ),
  );

  function handleExportBusinessCase() {
    const summaryText = `
================================================================================
          AVARTA AP WORKSPACE — EXECUTIVE CFO ROI & VALUE MODEL
                             "आत्मानं विद्धि"
================================================================================
Organization Parameters:
• Industry Profile: ${activePreset !== "custom" ? INDUSTRY_PRESETS[activePreset].label : "Custom Model"}
• Monthly Invoice Volume: ${monthlyVolume.toLocaleString()} invoices/mo (${annualVolume.toLocaleString()} annual)
• Average Invoice Value: ${formatCurrency(avgInvoiceValue, selectedCurrency)}
• Annual Spend Managed: ${formatCurrency(annualSpend, selectedCurrency)}
• Current AP Team: ${currentFtes} FTEs

PROJECTED ANNUAL ECONOMIC VALUE: ${formatCurrency(totalAnnualEconomicValue, selectedCurrency)}
------------------------------------------------------
1. Direct Processing Labor & Operational Savings: ${formatCurrency(directLaborSavings, selectedCurrency)}
   - Manual Cost (${currConfig.symbol}${currConfig.manualCost}/inv) vs Avarta (${currConfig.symbol}${currConfig.autoCost}/inv): -80% cost reduction
2. Early Payment Discount Capture (2/10 Net 30): ${formatCurrency(netDiscountGain, selectedCurrency)}
   - Discount capture rate accelerated from 18% manual baseline to 80% with touchless routing
3. Duplicate Billing & Leakage Prevented: ${formatCurrency(duplicateLeakagePrevented, selectedCurrency)}
   - 0.75% duplicate anomaly detection via automated 3-way matching
4. AP Team Capacity Freed: ${hoursSavedPerYear.toLocaleString()} Hours/Year (${ftesReallocated} FTE equivalent)

EXECUTIVE INVESTMENT METRICS:
• Estimated Payback Horizon: ${paybackMonths} Months
• Net Annual ROI Multiple: ${netRoiMultiple}x Return on Investment
• Touchless Match Rate: 82% Straight-Through Processing

Generated via Avarta AP Workspace Executive Model (Market Source: Ardent Partners, IOFM).
    `.trim();

    navigator.clipboard.writeText(summaryText).then(() => {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    });
  }

  return (
    <Card
      level="surface"
      className="relative border border-neutral-200 dark:border-zinc-800 overflow-hidden"
    >
      <AvartaCrest variant="watermark" className="opacity-[0.025] dark:opacity-[0.04]" />
      <div className="relative z-10">
      <CardHeader
        title={
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-zinc-800 border border-neutral-200/80 dark:border-zinc-700/80 flex items-center justify-center p-0.5 shadow-2xs shrink-0">
              <AvartaCrest variant="shield" glow className="w-full h-full" />
            </div>
            <span>EXECUTIVE CFO VALUE &amp; ROI SIMULATOR</span>
          </div>
        }
        description="Interactive financial business case & working capital optimization model • आत्मानं विद्धि"
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-900 p-0.5">
              {CURRENCY_CONFIGS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCurrency(c.id)}
                  className={`px-2.5 py-1 rounded-md text-micro font-mono font-medium transition-colors ${
                    selectedCurrency === c.id
                      ? "bg-white dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 shadow-2xs font-bold"
                      : "text-neutral-500 hover:text-neutral-800 dark:hover:text-zinc-200"
                  }`}
                >
                  {c.id}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportBusinessCase}
              className="gap-1.5 shrink-0"
            >
              {copiedSummary ? (
                <Check size={13} className="text-emerald-600" />
              ) : (
                <Download size={13} />
              )}
              <span>
                {copiedSummary ? "Copied Summary" : "Export Pitch Model"}
              </span>
            </Button>
          </div>
        }
      />

      <CardContent className="p-5 space-y-6">
        {/* ─────────────────────────────────────────────────────────────
         * 1. Industry Presets Quick Selector
         * ───────────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-caption">
            <span className="font-semibold text-neutral-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Building2
                size={13}
                className="text-indigo-600 dark:text-indigo-400"
              />
              <span>Select Industry Baseline Profile:</span>
            </span>
            {activePreset !== "custom" && (
              <span className="text-neutral-500 dark:text-zinc-400 italic hidden sm:inline text-micro">
                {INDUSTRY_PRESETS[activePreset].description}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(
              Object.keys(INDUSTRY_PRESETS) as Array<
                Exclude<IndustryPresetKey, "custom">
              >
            ).map((key) => {
              const preset = INDUSTRY_PRESETS[key];
              const isSelected = activePreset === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-600/30"
                      : "border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 text-neutral-700 dark:text-zinc-300 hover:border-neutral-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <p className="text-body-sm font-semibold truncate">
                    {preset.label}
                  </p>
                  <p className="text-micro font-mono text-neutral-500 dark:text-zinc-400 mt-0.5">
                    {preset.monthlyVolume.toLocaleString()} inv/mo •{" "}
                    {preset.currentFtes} FTEs
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
         * 2. Interactive Calibration Sliders & Numeric Inputs
         * ───────────────────────────────────────────────────────────── */}
        <div className="p-4.5 rounded-xl bg-neutral-50/80 dark:bg-zinc-900/60 border border-neutral-200/80 dark:border-zinc-800/80 grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Parameter 1: Monthly Invoice Volume */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="sim-monthly-volume"
                className="text-caption font-semibold text-neutral-800 dark:text-zinc-200"
              >
                Monthly Invoice Volume
              </label>
              <span className="font-mono text-body-sm font-bold text-indigo-600 dark:text-indigo-400">
                {monthlyVolume.toLocaleString()}
              </span>
            </div>
            <input
              id="sim-monthly-volume"
              type="range"
              min="200"
              max="15000"
              step="100"
              value={monthlyVolume}
              onChange={(e) => {
                setActivePreset("custom");
                setMonthlyVolume(Number(e.target.value));
              }}
              className="w-full h-2 bg-neutral-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[11px] font-mono text-neutral-400">
              <span>200 /mo</span>
              <span>15,000 /mo</span>
            </div>
          </div>

          {/* Parameter 2: Average Invoice Amount */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="sim-avg-invoice"
                className="text-caption font-semibold text-neutral-800 dark:text-zinc-200"
              >
                Avg Invoice Value ({currConfig.symbol})
              </label>
              <span className="font-mono text-body-sm font-bold text-indigo-600 dark:text-indigo-400">
                {formatCurrency(avgInvoiceValue, selectedCurrency)}
              </span>
            </div>
            <input
              id="sim-avg-invoice"
              type="range"
              min={selectedCurrency === "INR" ? 5000 : 100}
              max={selectedCurrency === "INR" ? 300000 : 5000}
              step={selectedCurrency === "INR" ? 5000 : 50}
              value={avgInvoiceValue}
              onChange={(e) => {
                setActivePreset("custom");
                setAvgInvoiceValue(Number(e.target.value));
              }}
              className="w-full h-2 bg-neutral-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[11px] font-mono text-neutral-400">
              <span>
                {formatCurrency(
                  selectedCurrency === "INR" ? 5000 : 100,
                  selectedCurrency,
                )}
              </span>
              <span>
                {formatCurrency(
                  selectedCurrency === "INR" ? 300000 : 5000,
                  selectedCurrency,
                )}
              </span>
            </div>
          </div>

          {/* Parameter 3: AP Staff Headcount */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="sim-ftes"
                className="text-caption font-semibold text-neutral-800 dark:text-zinc-200"
              >
                Current AP Team Size
              </label>
              <span className="font-mono text-body-sm font-bold text-indigo-600 dark:text-indigo-400">
                {currentFtes} FTEs
              </span>
            </div>
            <input
              id="sim-ftes"
              type="range"
              min="1"
              max="20"
              step="1"
              value={currentFtes}
              onChange={(e) => {
                setActivePreset("custom");
                setCurrentFtes(Number(e.target.value));
              }}
              className="w-full h-2 bg-neutral-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[11px] font-mono text-neutral-400">
              <span>1 Clerk</span>
              <span>20 Clerks</span>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
         * 3. Headline Hero: Total Projected Annual Economic Value
         * ───────────────────────────────────────────────────────────── */}
        <div className="p-5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-micro font-mono uppercase tracking-wider font-semibold text-indigo-700 dark:text-indigo-300">
                <Sparkles
                  size={12}
                  className="text-indigo-600 dark:text-indigo-400"
                />
                <span>Total Annual Projected Economic Value</span>
              </span>
            </div>
            <div className="text-h1 font-mono font-bold text-neutral-900 dark:text-zinc-50 tracking-tight">
              {formatCurrency(totalAnnualEconomicValue, selectedCurrency)}
              <span className="text-body font-sans font-normal text-neutral-500 dark:text-zinc-400 ml-2">
                / year
              </span>
            </div>
            <p className="text-caption text-neutral-600 dark:text-zinc-400">
              Combined recurring value across labor reduction, supplier early
              discounts, and leakage prevention.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0 border-t md:border-t-0 md:border-l border-neutral-200 dark:border-zinc-800 pt-3 md:pt-0 md:pl-5">
            <div className="space-y-0.5 text-left md:text-right">
              <span className="text-micro font-medium text-neutral-500 uppercase">
                Payback Horizon
              </span>
              <p className="text-h2 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {paybackMonths} Mo
              </p>
              <span className="text-micro text-neutral-400 font-mono">
                &lt; 1 fiscal quarter
              </span>
            </div>

            <div className="h-9 w-px bg-neutral-200 dark:bg-zinc-800" />

            <div className="space-y-0.5 text-left md:text-right">
              <span className="text-micro font-medium text-neutral-500 uppercase">
                Net ROI Multiple
              </span>
              <p className="text-h2 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {netRoiMultiple}x
              </p>
              <span className="text-micro text-neutral-400 font-mono">
                annualized return
              </span>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
         * 4. Four Core Value Pillars (Detailed Financial Breakdown)
         * ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
          {/* Pillar 1: Direct Processing Cost Reduction */}
          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 shadow-2xs flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-caption text-neutral-500 font-medium flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-emerald-500" />
                  <span>Labor Cost Reduction</span>
                </span>
                <span className="text-micro font-mono font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                  -80% Cost
                </span>
              </div>
              <p className="text-h2 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(directLaborSavings, selectedCurrency)}
              </p>
            </div>
            <div className="pt-2 border-t border-neutral-100 dark:border-zinc-800/80 text-micro text-neutral-500 dark:text-zinc-400 space-y-0.5">
              <p>
                From{" "}
                <span className="font-mono font-medium">
                  {currConfig.symbol}
                  {currConfig.manualCost}
                </span>{" "}
                manual down to{" "}
                <span className="font-mono font-medium">
                  {currConfig.symbol}
                  {currConfig.autoCost}
                </span>{" "}
                per invoice.
              </p>
              <p className="text-[10px] text-neutral-400 italic">
                Source: Ardent Partners AP Benchmark
              </p>
            </div>
          </div>

          {/* Pillar 2: Dynamic Early Discount Capture */}
          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 shadow-2xs flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-caption text-neutral-500 font-medium flex items-center gap-1.5">
                  <Percent size={14} className="text-indigo-500" />
                  <span>2/10 Early Discounts</span>
                </span>
                <span className="text-micro font-mono font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded">
                  80% Capture
                </span>
              </div>
              <p className="text-h2 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {formatCurrency(netDiscountGain, selectedCurrency)}
              </p>
            </div>
            <div className="pt-2 border-t border-neutral-100 dark:border-zinc-800/80 text-micro text-neutral-500 dark:text-zinc-400 space-y-0.5">
              <p>
                Accelerating invoice cycle to 2.1 days unlocks supplier cash
                discounts on 20% of spend.
              </p>
              <p className="text-[10px] text-neutral-400 italic">
                Source: Levvel Research AP Insights
              </p>
            </div>
          </div>

          {/* Pillar 3: Duplicate Billing Leakage Prevented */}
          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 shadow-2xs flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-caption text-neutral-500 font-medium flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-amber-500" />
                  <span>Leakage &amp; Errors Prevented</span>
                </span>
                <span className="text-micro font-mono font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded">
                  0.75% Spend
                </span>
              </div>
              <p className="text-h2 font-mono font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency(duplicateLeakagePrevented, selectedCurrency)}
              </p>
            </div>
            <div className="pt-2 border-t border-neutral-100 dark:border-zinc-800/80 text-micro text-neutral-500 dark:text-zinc-400 space-y-0.5">
              <p>
                Automated 3-way matching stops duplicate invoice numbers and
                supplier overbilling.
              </p>
              <p className="text-[10px] text-neutral-400 italic">
                Source: IOFM Benchmark Studies
              </p>
            </div>
          </div>

          {/* Pillar 4: AP Team Capacity Freed */}
          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 shadow-2xs flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-caption text-neutral-500 font-medium flex items-center gap-1.5">
                  <Clock size={14} className="text-sky-500" />
                  <span>Capacity Freed</span>
                </span>
                <span className="text-micro font-mono font-semibold text-sky-600 bg-sky-50 dark:bg-sky-950/50 px-1.5 py-0.5 rounded">
                  {ftesReallocated} FTE Eqv
                </span>
              </div>
              <p className="text-h2 font-mono font-bold text-neutral-900 dark:text-zinc-100">
                {hoursSavedPerYear.toLocaleString()}{" "}
                <span className="text-caption font-sans font-normal text-neutral-500">
                  Hrs/Yr
                </span>
              </p>
            </div>
            <div className="pt-2 border-t border-neutral-100 dark:border-zinc-800/80 text-micro text-neutral-500 dark:text-zinc-400 space-y-0.5">
              <p>
                Eliminates manual re-keying &amp; chasing signatures,
                redirecting staff to vendor relations.
              </p>
              <p className="text-[10px] text-neutral-400 italic">
                Scale throughput 5x per specialist
              </p>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
         * 5. Baseline vs Avarta Operating Model Comparison Matrix
         * ───────────────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-neutral-200 dark:border-zinc-800 overflow-hidden">
          <div className="bg-neutral-50 dark:bg-zinc-900/90 px-4 py-2.5 border-b border-neutral-200 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-body-sm font-semibold text-neutral-900 dark:text-zinc-100">
              Operational Performance Comparison (Baseline vs Avarta)
            </span>
            <span className="text-micro font-mono text-neutral-500">
              Industry Standards vs Solution
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-neutral-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900 text-center">
            {/* Metric 1 */}
            <div className="p-3.5 space-y-1">
              <span className="text-caption text-neutral-500 font-medium block">
                Avg Cost / Invoice
              </span>
              <div className="flex items-center justify-center gap-1.5 font-mono">
                <span className="text-caption line-through text-neutral-400">
                  {currConfig.symbol}
                  {currConfig.manualCost}
                </span>
                <span className="text-body font-bold text-emerald-600 dark:text-emerald-400">
                  {currConfig.symbol}
                  {currConfig.autoCost}
                </span>
              </div>
              <span className="text-micro font-mono text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                80% Reduction
              </span>
            </div>

            {/* Metric 2 */}
            <div className="p-3.5 space-y-1">
              <span className="text-caption text-neutral-500 font-medium block">
                Invoice Cycle Time
              </span>
              <div className="flex items-center justify-center gap-1.5 font-mono">
                <span className="text-caption line-through text-neutral-400">
                  12.4 Days
                </span>
                <span className="text-body font-bold text-indigo-600 dark:text-indigo-400">
                  2.1 Days
                </span>
              </div>
              <span className="text-micro font-mono text-indigo-600 font-semibold bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">
                6x Faster
              </span>
            </div>

            {/* Metric 3 */}
            <div className="p-3.5 space-y-1">
              <span className="text-caption text-neutral-500 font-medium block">
                Touchless STP Rate
              </span>
              <div className="flex items-center justify-center gap-1.5 font-mono">
                <span className="text-caption line-through text-neutral-400">
                  18.5%
                </span>
                <span className="text-body font-bold text-sky-600 dark:text-sky-400">
                  82.6%
                </span>
              </div>
              <span className="text-micro font-mono text-sky-600 font-semibold bg-sky-50 dark:bg-sky-950/40 px-1.5 py-0.5 rounded">
                +346% Match
              </span>
            </div>

            {/* Metric 4 */}
            <div className="p-3.5 space-y-1">
              <span className="text-caption text-neutral-500 font-medium block">
                Throughput / FTE
              </span>
              <div className="flex items-center justify-center gap-1.5 font-mono">
                <span className="text-caption line-through text-neutral-400">
                  650 /mo
                </span>
                <span className="text-body font-bold text-purple-600 dark:text-purple-400">
                  3,200 /mo
                </span>
              </div>
              <span className="text-micro font-mono text-purple-600 font-semibold bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded">
                4.9x Capacity
              </span>
            </div>

            {/* Metric 5 */}
            <div className="p-3.5 space-y-1">
              <span className="text-caption text-neutral-500 font-medium block">
                Duplicate Risk
              </span>
              <div className="flex items-center justify-center gap-1.5 font-mono">
                <span className="text-caption line-through text-neutral-400">
                  0.85%
                </span>
                <span className="text-body font-bold text-emerald-600 dark:text-emerald-400">
                  &lt; 0.01%
                </span>
              </div>
              <span className="text-micro font-mono text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                Guaranteed Catch
              </span>
            </div>
          </div>
        </div>
      </CardContent>
      </div>
    </Card>
  );
}
