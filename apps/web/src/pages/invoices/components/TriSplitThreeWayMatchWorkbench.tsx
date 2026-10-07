import { useState } from "react";
import {
  FileText,
  PackageCheck,
  Receipt,
  AlertTriangle,
  ArrowRight,
  FileCheck,
  Ban,
  Send,
  CheckCircle2,
  Layers,
  Info,
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { formatCurrency } from "../../../lib/formatters";

export interface TriSplitItemData {
  poLineRef: string;
  poQty: number;
  poUnitPrice: number;
  poTotal: number;
  poUnit: string;

  grnRef: string;
  grnAcceptedQty: number;
  grnDamagedQty: number;
  grnReturnDocRef?: string;
  grnNetQty: number;

  invoiceRef: string;
  invoiceBilledQty: number;
  invoiceUnitPrice: number;
  invoiceTotal: number;

  description: string;
}

interface TriSplitThreeWayMatchWorkbenchProps {
  item?: TriSplitItemData;
  currency?: string;
  onGenerateDebitNote?: (amount: number, reason: string) => void;
  onWithholdShortfall?: (shortfallQty: number, withholdAmount: number) => void;
  onRequestRevisedInvoice?: (discrepancySummary: string) => void;
  readOnly?: boolean;
}

export function TriSplitThreeWayMatchWorkbench({
  item = {
    poLineRef: "PO-FY26-0881 Line 1",
    poQty: 8,
    poUnitPrice: 4850,
    poTotal: 38800,
    poUnit: "Servers",
    grnRef: "GRN-FY26-0083",
    grnAcceptedQty: 7,
    grnDamagedQty: 1,
    grnReturnDocRef: "RET-881",
    grnNetQty: 7,
    invoiceRef: "INV-2026-1018",
    invoiceBilledQty: 8,
    invoiceUnitPrice: 5200,
    invoiceTotal: 41600,
    description: "Enterprise Rackmount Compute Nodes (High-Density)",
  },
  currency = "INR",
  onGenerateDebitNote,
  onWithholdShortfall,
  onRequestRevisedInvoice,
  readOnly = false,
}: TriSplitThreeWayMatchWorkbenchProps) {
  const [resolvedAction, setResolvedAction] = useState<string | null>(null);

  // Rate variance calculations
  const unitRateVariance = item.invoiceUnitPrice - item.poUnitPrice;
  const rateVariancePct = item.poUnitPrice > 0 ? (unitRateVariance / item.poUnitPrice) * 100 : 0;
  const totalRateDifference = unitRateVariance * item.grnNetQty;

  // Quantity shortfall calculations
  const quantityShortfall = item.invoiceBilledQty - item.grnNetQty;
  const shortfallAmount = quantityShortfall * item.poUnitPrice;

  // Net authorized payable amount
  const netAuthorizedPayable = item.grnNetQty * item.poUnitPrice;

  function handleAction(type: "DEBIT_NOTE" | "WITHHOLD_SHORTFALL" | "REQUEST_REVISED") {
    if (type === "DEBIT_NOTE") {
      setResolvedAction(`Debit Note Generated: ${formatCurrency(totalRateDifference, currency)} for unauthorized price variance (+${rateVariancePct.toFixed(1)}%).`);
      onGenerateDebitNote?.(totalRateDifference, `Unauthorized rate variance (+${rateVariancePct.toFixed(1)}%) vs contract PO ${item.poLineRef}`);
    } else if (type === "WITHHOLD_SHORTFALL") {
      setResolvedAction(`Shortfall Withheld: ${quantityShortfall} unit (${formatCurrency(shortfallAmount, currency)}) docked. Payable capped at ${formatCurrency(netAuthorizedPayable, currency)}.`);
      onWithholdShortfall?.(quantityShortfall, shortfallAmount);
    } else if (type === "REQUEST_REVISED") {
      setResolvedAction(`Vendor Query Dispatched: Supplier requested to revise bill to accepted quantity (7) and contract rate (${formatCurrency(item.poUnitPrice, currency)}).`);
      onRequestRevisedInvoice?.(`Billed quantity ${item.invoiceBilledQty} exceeds accepted GRN ${item.grnNetQty}, and billed rate ${formatCurrency(item.invoiceUnitPrice, currency)} exceeds contracted PO rate ${formatCurrency(item.poUnitPrice, currency)}.`);
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      {/* Header Bar */}
      <div className="bg-neutral-900 dark:bg-zinc-950 text-white px-5 py-3.5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <span className="p-1 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Layers size={14} />
          </span>
          <div>
            <h4 className="text-body-sm font-semibold tracking-wide flex items-center gap-2">
              <span>Tri-Split 3-Way Match Workbench</span>
              <span className="px-2 py-0.5 rounded-full text-micro font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Discrepancy Detected
              </span>
            </h4>
            <p className="text-micro text-neutral-400 font-sans mt-0.5">
              Line: {item.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-micro font-mono text-neutral-300">
          <span className="text-neutral-400">Net Variance:</span>
          <span className="font-bold text-amber-400">
            +{formatCurrency(item.invoiceTotal - item.poTotal, currency)}
          </span>
        </div>
      </div>

      {/* Tri-Split Grid (PO vs GRN vs Invoice Billed) */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-neutral-200 dark:divide-zinc-800">
        {/* Column 1: Purchase Order */}
        <div className="p-4 bg-neutral-50/50 dark:bg-zinc-900/40 space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-zinc-800 pb-2">
            <span className="text-micro uppercase font-bold tracking-wider text-neutral-500 dark:text-zinc-400 flex items-center gap-1.5">
              <FileText size={13} className="text-indigo-600 dark:text-indigo-400" />
              <span>Purchase Order</span>
            </span>
            <span className="text-micro font-mono font-semibold text-neutral-700 dark:text-zinc-300">
              {item.poLineRef}
            </span>
          </div>

          <div className="space-y-1.5 text-caption font-mono">
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-zinc-400">Ordered Qty:</span>
              <span className="font-semibold text-neutral-900 dark:text-zinc-100">
                {item.poQty} {item.poUnit}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-zinc-400">Contract Rate:</span>
              <span className="font-semibold text-neutral-900 dark:text-zinc-100">
                {formatCurrency(item.poUnitPrice, currency)}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-neutral-200/60 dark:border-zinc-800/80">
              <span className="text-neutral-500 dark:text-zinc-400">Authorized PO Total:</span>
              <span className="font-bold text-neutral-900 dark:text-zinc-100">
                {formatCurrency(item.poTotal, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Column 2: Goods Receipt (GRN) */}
        <div className="p-4 bg-neutral-50/50 dark:bg-zinc-900/40 space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-zinc-800 pb-2">
            <span className="text-micro uppercase font-bold tracking-wider text-neutral-500 dark:text-zinc-400 flex items-center gap-1.5">
              <PackageCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
              <span>Goods Receipt (GRN)</span>
            </span>
            <span className="text-micro font-mono font-semibold text-neutral-700 dark:text-zinc-300">
              {item.grnRef}
            </span>
          </div>

          <div className="space-y-1.5 text-caption font-mono">
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-zinc-400">Accepted Inbound:</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                {item.grnAcceptedQty} Accepted
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-zinc-400">Damaged / Rejected:</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                {item.grnDamagedQty} ({item.grnReturnDocRef ?? "RET"})
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-neutral-200/60 dark:border-zinc-800/80">
              <span className="text-neutral-500 dark:text-zinc-400">Net Certified Receipt:</span>
              <span className="font-bold text-neutral-900 dark:text-zinc-100">
                {item.grnNetQty} {item.poUnit}
              </span>
            </div>
          </div>
        </div>

        {/* Column 3: Invoice Billed */}
        <div className="p-4 bg-neutral-50/50 dark:bg-zinc-900/40 space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-zinc-800 pb-2">
            <span className="text-micro uppercase font-bold tracking-wider text-neutral-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Receipt size={13} className="text-indigo-600 dark:text-indigo-400" />
              <span>Invoice Billed</span>
            </span>
            <span className="text-micro font-mono font-semibold text-neutral-700 dark:text-zinc-300">
              {item.invoiceRef}
            </span>
          </div>

          <div className="space-y-1.5 text-caption font-mono">
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-zinc-400">Billed Quantity:</span>
              <span className="font-semibold text-neutral-900 dark:text-zinc-100">
                {item.invoiceBilledQty} {item.poUnit}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-zinc-400">Billed Unit Rate:</span>
              <span className="font-semibold text-amber-700 dark:text-amber-400">
                {formatCurrency(item.invoiceUnitPrice, currency)}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-neutral-200/60 dark:border-zinc-800/80">
              <span className="text-neutral-500 dark:text-zinc-400">Total Billed:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {formatCurrency(item.invoiceTotal, currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Variance & Shortfall Delta Callout Strip */}
      <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/40 border-t border-b border-amber-200/80 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-caption font-mono">
        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
          <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong>Rate Variance:</strong> +{formatCurrency(unitRateVariance, currency)}/unit (+{rateVariancePct.toFixed(1)}%)
          </span>
        </div>

        <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span>
            <strong>Transit Shortfall:</strong> {quantityShortfall} unit ({formatCurrency(shortfallAmount, currency)})
          </span>
        </div>
      </div>

      {/* Success Resolution Banner if action applied */}
      {resolvedAction && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-caption font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{resolvedAction}</span>
        </div>
      )}

      {/* 1-Click Statutory Resolution Action Suite */}
      {!readOnly && (
        <div className="p-4 bg-white dark:bg-zinc-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-micro text-neutral-500 dark:text-zinc-400">
            <Info size={13} />
            <span>Statutory Resolution Suite: Choose 1-click AP resolution</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Button 1: Generate Debit Note */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction("DEBIT_NOTE")}
              className="gap-1.5 h-8 text-caption border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/50 text-amber-800 dark:text-amber-300"
            >
              <FileCheck size={13} className="text-amber-600" />
              <span>Generate Debit Note ({formatCurrency(totalRateDifference, currency)})</span>
            </Button>

            {/* Button 2: Withhold Shortfall */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction("WITHHOLD_SHORTFALL")}
              className="gap-1.5 h-8 text-caption border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-800 dark:text-rose-300"
            >
              <Ban size={13} className="text-rose-600" />
              <span>Withhold Shortfall (Pay 7 Units)</span>
            </Button>

            {/* Button 3: Request Revised Tax Invoice */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleAction("REQUEST_REVISED")}
              className="gap-1.5 h-8 text-caption bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Send size={13} />
              <span>Request Revised Invoice</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
