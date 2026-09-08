import { useState, useMemo, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Check, Flag, Sparkles, Clock } from "lucide-react";
import { Card, CardHeader, CardContent } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../../../components/ui/table";
import { formatCurrency } from "../../../lib/formatters";

import { generateSupplierLineItems, GeneratedLineItem } from "../../../lib/mockCatalogs";

export type LineItemData = GeneratedLineItem;

interface InvoiceExceptionItem {
  id: string;
  type?: string;
  title: string;
  description?: string;
  status: string;
}

interface LineItemMatchingTableProps {
  invoiceId?: string;
  invoiceNumber?: string;
  supplierName?: string | null;
  totalAmount?: number | string;
  status: string;
  purchaseOrderId?: string | null;
  currency: string;
  exceptions?: InvoiceExceptionItem[];
  onAcceptOverride?: (line: LineItemData, reason: string) => void;
  onFlagException?: (line: LineItemData, reason: string) => void;
}

export function LineItemMatchingTable({
  invoiceId: _invoiceId = "inv",
  supplierName,
  totalAmount,
  status,
  purchaseOrderId,
  currency,
  exceptions = [],
  onAcceptOverride,
  onFlagException,
}: LineItemMatchingTableProps) {
  const isPreCapture = status === "RECEIVED";
  const numAmount = Number(totalAmount) || 0;

  // Dynamically generate initial lines tailored to this specific invoice
  const initialLines = useMemo(() => {
    return generateSupplierLineItems(
      supplierName,
      numAmount,
      currency,
      exceptions
    );
  }, [supplierName, numAmount, currency, exceptions]);

  const [lines, setLines] = useState<LineItemData[]>(initialLines);

  // Sync lines if parent invoice changes
  useEffect(() => {
    setLines(initialLines);
  }, [initialLines]);

  const [selectedLineForReason, setSelectedLineForReason] = useState<{
    line: LineItemData;
    action: "ACCEPT" | "FLAG";
  } | null>(null);
  const [reasonInput, setReasonInput] = useState("");

  function handleOpenReason(line: LineItemData, action: "ACCEPT" | "FLAG") {
    setSelectedLineForReason({ line, action });
    setReasonInput(
      action === "ACCEPT"
        ? "Authorized variance tolerance signed off per department AP policy."
        : "Line item discrepancy exceeds approved contract tolerance (+12.0%)."
    );
  }

  function handleConfirmReason() {
    if (!selectedLineForReason) return;
    const { line, action } = selectedLineForReason;

    if (action === "ACCEPT") {
      setLines((prev) =>
        prev.map((item) =>
          item.id === line.id
            ? { ...item, overrideAccepted: true, overrideReason: reasonInput }
            : item
        )
      );
      if (onAcceptOverride) {
        onAcceptOverride(line, reasonInput);
      }
    } else {
      if (onFlagException) {
        onFlagException(line, reasonInput);
      }
    }

    setSelectedLineForReason(null);
    setReasonInput("");
  }

  const hasVariance = lines.some((l) => l.status !== "MATCHED" && !l.overrideAccepted);

  /* ─────────────────────────────────────────────────────────────
   * State 1: PRE-CAPTURE (RECEIVED)
   * Render a clean placeholder. No fabricated rates, no variance badges.
   * ───────────────────────────────────────────────────────────── */
  if (isPreCapture) {
    return (
      <Card level="surface">
        <CardHeader
          title="3-WAY LINE-ITEM MATCHING &amp; VARIANCE INSPECTION"
          description="Automated reconciliation against Purchase Orders, GRNs, and contract rates"
        />
        <CardContent className="p-8 text-center bg-neutral-50/40 dark:bg-zinc-900/40">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50">
              <Clock size={22} strokeWidth={1.75} />
            </div>
            <div className="space-y-1">
              <h4 className="text-body font-semibold text-neutral-900 dark:text-zinc-100">
                Ready for OCR &amp; Line Item Extraction
              </h4>
              <p className="text-caption text-neutral-500 dark:text-zinc-400 leading-relaxed">
                Line items, contract rates, and 3-way PO reconciliation will populate automatically once automated capture is executed.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-micro font-mono text-neutral-400 dark:text-zinc-500 bg-white dark:bg-zinc-800 px-3 py-1 rounded-full border border-neutral-200 dark:border-zinc-700">
              <Sparkles size={12} className="text-indigo-500" />
              <span>Awaiting Capture Trigger</span>
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ─────────────────────────────────────────────────────────────
   * State 2+: POST-CAPTURE (PROCESSING / EXCEPTION / APPROVED / etc.)
   * Render populated 3-way matching table with explicit variances.
   * ───────────────────────────────────────────────────────────── */
  const varianceLines = lines.filter(
    (l) => l.poUnitPrice !== l.invUnitPrice || l.poQty !== l.invQty
  );

  return (
    <Card id="invoice-line-item-matching-section" level="surface">
      <CardHeader
        title="3-WAY LINE-ITEM MATCHING & VARIANCE INSPECTION"
        description={
          purchaseOrderId
            ? `Reconciling against Purchase Order ${purchaseOrderId} and Goods Receipt Notes (GRN)`
            : `Direct Expense (${supplierName ?? "General Vendor"}) — Reconciled against extracted invoice lines (No linked PO)`
        }
        action={
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-micro font-mono font-semibold border ${
                hasVariance
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-900/60"
                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-900/60"
              }`}
            >
              {hasVariance ? (
                <>
                  <AlertTriangle size={13} strokeWidth={2} />
                  <span>Price Discrepancy Flagged</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={13} strokeWidth={2} />
                  <span>3-Way Match Verified</span>
                </>
              )}
            </span>
          </div>
        }
      />
      <CardContent className="p-0">
        {/* ── Subframe Polish: 3-Way Reconciliation Diff Card (PO-Linked with Mismatch) ── */}
        {purchaseOrderId && varianceLines.length > 0 && (
          <div className="p-4 bg-amber-50/50 dark:bg-amber-950/30 border-b border-amber-200/80 dark:border-amber-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-micro font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <span>3-Way Reconciliation Variance Analysis ({varianceLines.length} Discrepant {varianceLines.length === 1 ? "Line" : "Lines"})</span>
              </span>
              <span className="text-micro font-mono text-amber-700 dark:text-amber-300">
                Org Tolerance Threshold: 5.0%
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {varianceLines.map((vl) => {
                const poTotal = vl.poQty * vl.poUnitPrice;
                const invTotal = vl.invQty * vl.invUnitPrice;
                const rateDiff = vl.invUnitPrice - vl.poUnitPrice;
                const rateDiffPct = vl.poUnitPrice > 0 ? (rateDiff / vl.poUnitPrice) * 100 : 0;
                const qtyDiff = vl.invQty - vl.poQty;
                const exceedsTolerance = Math.abs(rateDiffPct) > 5 || qtyDiff > 0;

                return (
                  <div
                    key={vl.id}
                    className={`p-3.5 rounded-lg border text-body-sm space-y-2.5 transition-colors ${
                      exceedsTolerance
                        ? "bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/80"
                        : "bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-neutral-900 dark:text-zinc-100 text-body-sm line-clamp-1">
                        Line {vl.lineNumber}: {vl.description}
                      </span>
                      <span
                        className={`text-micro font-mono font-semibold px-2 py-0.5 rounded-full shrink-0 border ${
                          exceedsTolerance
                            ? "bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800"
                            : "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800"
                        }`}
                      >
                        {rateDiffPct > 0 ? `+${rateDiffPct.toFixed(1)}%` : `${rateDiffPct.toFixed(1)}%`} Variance
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-caption font-mono bg-white/70 dark:bg-zinc-900/70 p-2.5 rounded border border-neutral-200/60 dark:border-zinc-800">
                      <div>
                        <span className="text-micro text-neutral-500 dark:text-zinc-400 block">
                          PO Ref ({purchaseOrderId})
                        </span>
                        <div className="mt-0.5 text-neutral-800 dark:text-zinc-200">
                          <span>{vl.poQty} units</span> @ <span>{formatCurrency(vl.poUnitPrice, currency)}</span>
                        </div>
                        <span className="text-micro text-neutral-400 block mt-0.5">
                          Total: {formatCurrency(poTotal, currency)}
                        </span>
                      </div>

                      <div className="border-l border-neutral-200 dark:border-zinc-800 pl-2.5">
                        <span className="text-micro text-neutral-500 dark:text-zinc-400 block">
                          Invoiced Line
                        </span>
                        <div className={`mt-0.5 font-semibold ${exceedsTolerance ? "text-rose-600 dark:text-rose-400" : "text-amber-700 dark:text-amber-300"}`}>
                          <span>{vl.invQty} units</span> @ <span>{formatCurrency(vl.invUnitPrice, currency)}</span>
                        </div>
                        <span className="text-micro text-neutral-400 block mt-0.5">
                          Total: {formatCurrency(invTotal, currency)}
                        </span>
                      </div>
                    </div>

                    <p className={`text-micro font-mono ${exceedsTolerance ? "text-rose-700 dark:text-rose-300 font-semibold" : "text-amber-800 dark:text-amber-200"}`}>
                      PO Rate: {formatCurrency(vl.poUnitPrice, currency)} vs Invoiced: {formatCurrency(vl.invUnitPrice, currency)} — {rateDiffPct > 0 ? `+${rateDiffPct.toFixed(1)}%` : `${rateDiffPct.toFixed(1)}%`} variance {exceedsTolerance ? "(Exceeds 5% tolerance)" : "(Within tolerance)"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Item Description</TableHead>
              <TableHead className="w-28">HSN / SAC</TableHead>
              {purchaseOrderId && <TableHead className="text-right">PO Qty</TableHead>}
              <TableHead className="text-right">{purchaseOrderId ? "Inv Qty" : "Qty"}</TableHead>
              {purchaseOrderId && <TableHead className="text-right">PO Rate</TableHead>}
              <TableHead className="text-right">{purchaseOrderId ? "Inv Rate" : "Unit Rate"}</TableHead>
              <TableHead className="text-right">Line Total</TableHead>
              <TableHead>Match Status</TableHead>
              <TableHead className="text-right">Decision</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l) => {
              const lineTotal = l.invQty * l.invUnitPrice;
              const unitDiff = l.invUnitPrice - l.poUnitPrice;
              const isVariance = l.status === "PRICE_VARIANCE" || l.status === "QTY_VARIANCE";
              const isAccepted = l.overrideAccepted;
              const displayHsn = l.hsnCode || "HSN 8471";

              return (
                <TableRow
                  key={l.id}
                  className={
                    isVariance && !isAccepted
                      ? "bg-amber-50/40 dark:bg-amber-950/20"
                      : undefined
                  }
                >
                  <TableCell className="font-mono text-micro text-neutral-400">
                    {l.lineNumber}
                  </TableCell>
                  <TableCell className="font-medium text-neutral-900 dark:text-zinc-100 max-w-xs">
                    <div className="space-y-0.5">
                      <p className="text-body-sm leading-snug">{l.description}</p>
                      {isVariance && !isAccepted && (
                        <p className="text-caption text-amber-700 dark:text-amber-400 font-mono">
                          Price variance: +{formatCurrency(unitDiff, currency)}/unit (+{((unitDiff / (l.poUnitPrice || 1)) * 100).toFixed(1)}%)
                        </p>
                      )}
                      {isAccepted && (
                        <p className="text-micro text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                          <Check size={11} strokeWidth={2.5} />
                          <span>Manager override accepted: {l.overrideReason || "Approved"}</span>
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-body-sm font-semibold text-neutral-800 dark:text-zinc-200">
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300 border border-neutral-200 dark:border-zinc-700 text-micro">
                      {displayHsn}
                    </span>
                  </TableCell>
                  {purchaseOrderId && (
                    <TableCell className="text-right font-mono text-body-sm text-neutral-600 dark:text-zinc-400">
                      {l.poQty}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-mono text-body-sm text-neutral-900 dark:text-zinc-100 font-semibold">
                    {l.invQty}
                  </TableCell>
                  {purchaseOrderId && (
                    <TableCell className="text-right font-mono text-body-sm text-neutral-600 dark:text-zinc-400">
                      {formatCurrency(l.poUnitPrice, currency)}
                    </TableCell>
                  )}
                  <TableCell
                    className={`text-right font-mono text-body-sm font-semibold ${
                      isVariance && !isAccepted
                        ? "text-amber-700 dark:text-amber-400 font-bold underline decoration-amber-500/50"
                        : "text-neutral-900 dark:text-zinc-100"
                    }`}
                  >
                    {formatCurrency(l.invUnitPrice, currency)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-body-sm font-semibold tabular-nums text-neutral-900 dark:text-zinc-100">
                    {formatCurrency(lineTotal, currency)}
                  </TableCell>
                  <TableCell>
                    {isVariance && !isAccepted ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-micro font-mono font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                        <AlertTriangle size={11} />
                        <span>PRICE VARIANCE</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-micro font-mono font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                        <Check size={11} strokeWidth={2.5} />
                        <span>MATCHED</span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isVariance && !isAccepted ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenReason(l, "ACCEPT")}
                          className="h-7 text-micro px-2.5 font-medium border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenReason(l, "FLAG")}
                          className="h-7 text-micro px-2.5 font-medium border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        >
                          <Flag size={11} className="mr-1" />
                          <span>Flag</span>
                        </Button>
                      </div>
                    ) : (
                      <span className="text-micro font-mono text-neutral-400">
                        {isAccepted ? "Overridden" : "Verified"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Modal for documenting override/flag decision reason */}
        {selectedLineForReason && (
          <div className="p-4 bg-neutral-50 dark:bg-zinc-800/60 border-t border-neutral-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="space-y-1 min-w-0 flex-1">
              <span className="text-micro font-semibold uppercase tracking-wider text-neutral-500 dark:text-zinc-400">
                Document {selectedLineForReason.action === "ACCEPT" ? "Override Reason" : "Exception Flag"}:
              </span>
              <input
                type="text"
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="Enter justification for audit log..."
                className="w-full h-8 px-3 rounded-md text-body-sm border border-neutral-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-neutral-900 dark:text-zinc-100"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedLineForReason(null)}
                className="h-8 text-body-sm"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant={selectedLineForReason.action === "ACCEPT" ? "primary" : "destructive"}
                onClick={handleConfirmReason}
                className="h-8 text-body-sm px-4 font-semibold"
              >
                {selectedLineForReason.action === "ACCEPT" ? "Confirm Override" : "Flag Exception"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
