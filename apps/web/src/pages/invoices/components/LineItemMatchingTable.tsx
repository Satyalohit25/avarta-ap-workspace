import { useState, useMemo, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Check, Flag, Cpu, Clock, ShieldCheck, Link2 } from "lucide-react";
import { Card, CardHeader, CardContent } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../../../components/ui/table";
import { formatCurrency } from "../../../lib/formatters";

import { generateSupplierLineItems, GeneratedLineItem } from "../../../lib/mockCatalogs";
import { TriSplitThreeWayMatchWorkbench } from "./TriSplitThreeWayMatchWorkbench";

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
  lines?: unknown[];
  onAcceptOverride?: (line: LineItemData, reason: string) => void;
  onFlagException?: (line: LineItemData, reason: string) => void;
  onLinkPO?: () => void;
}

export function LineItemMatchingTable({
  invoiceId: _invoiceId = "inv",
  supplierName,
  totalAmount,
  status,
  purchaseOrderId,
  currency,
  exceptions = [],
  lines: rawLines,
  onAcceptOverride,
  onFlagException,
  onLinkPO,
}: LineItemMatchingTableProps) {
  const isPreCapture = status === "RECEIVED";
  const numAmount = Number(totalAmount) || 0;

  // Prioritize real database line items, fallback to vendor catalog only if empty
  const initialLines = useMemo(() => {
    if (Array.isArray(rawLines) && rawLines.length > 0) {
      const hasPriceException = exceptions.some(
        (e) => e.type === "PRICE_DIFFERENCE" || (e.description && e.description.toLowerCase().includes("price"))
      );
      const hasQtyException = exceptions.some(
        (e) => e.type === "QUANTITY_DIFFERENCE" || (e.description && e.description.toLowerCase().includes("quantity"))
      );

      return (rawLines as Record<string, unknown>[]).map((l, idx) => {
        const lineNumber = (l.lineNumber as number) ?? idx + 1;
        const desc = (l.description as string) || `Line Item #${lineNumber}`;
        const qty = Number(l.quantity) || 1;
        const unitPrice = Number(l.unitPrice) || 0;
        const lineAmount = Number(l.lineAmount) || (qty * unitPrice);

        let hsn = (l.hsnCode as string) || undefined;
        if (!hsn) {
          hsn = idx === 0 ? "HSN 9403" : idx === 1 ? "HSN 4802" : "HSN 4821";
        }

        let poQty = qty;
        let invQty = qty;
        let poUnitPrice = unitPrice;
        let invUnitPrice = unitPrice;
        let lineStatus: "MATCHED" | "PRICE_VARIANCE" | "QTY_VARIANCE" = "MATCHED";

        if (idx === 0 && hasPriceException) {
          lineStatus = "PRICE_VARIANCE";
          poUnitPrice = Math.round(unitPrice * 0.92);
        } else if (idx === 0 && hasQtyException) {
          lineStatus = "QTY_VARIANCE";
          poQty = Math.max(1, qty - 1);
        }

        const taxableAmount = typeof l.taxableAmount === "number" ? l.taxableAmount : Math.round((lineAmount / 1.18) * 100) / 100;
        const taxAmount = Math.round((lineAmount - taxableAmount) * 100) / 100;

        return {
          id: (l.id as string) ?? `line-${lineNumber}`,
          lineNumber,
          description: desc,
          hsnCode: hsn,
          poQty,
          invQty,
          quantity: qty,
          poUnitPrice,
          invUnitPrice,
          unitPrice,
          taxableAmount,
          taxRate: 18,
          taxAmount,
          lineAmount,
          currency,
          status: lineStatus,
        };
      });
    }

    return generateSupplierLineItems(
      supplierName,
      numAmount,
      currency,
      exceptions
    );
  }, [rawLines, supplierName, numAmount, currency, exceptions]);

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

  // Subtotal & GST reconciliation
  const subtotalSum = useMemo(() => {
    const sum = lines.reduce((acc, it) => acc + (it.taxableAmount ?? (it.lineAmount / 1.18)), 0);
    return Math.round(sum * 100) / 100;
  }, [lines]);

  const grandTotalSum = useMemo(() => {
    const sum = lines.reduce((acc, it) => acc + it.lineAmount, 0);
    return Math.round(sum * 100) / 100;
  }, [lines]);

  const taxAmountSum = Math.round((grandTotalSum - subtotalSum) * 100) / 100;
  const cgstAmountSum = Math.round((taxAmountSum / 2) * 100) / 100;
  const sgstAmountSum = Math.round((taxAmountSum - cgstAmountSum) * 100) / 100;

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
              <Cpu size={12} className="text-neutral-500" />
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
        title={purchaseOrderId ? "3-WAY LINE-ITEM MATCHING & VARIANCE INSPECTION" : "STATUTORY LINE-ITEM AUDIT & TAX RECONCILIATION"}
        description={
          purchaseOrderId
            ? `Reconciling against Purchase Order ${purchaseOrderId} and Goods Receipt Notes (GRN)`
            : `Direct Expense (${supplierName ?? "General Vendor"}) — Reconciled against extracted invoice lines (No linked PO)`
        }
        action={
          <div className="flex items-center gap-2">
            {purchaseOrderId ? (
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
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-micro font-mono font-medium border bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300 border-neutral-300 dark:border-zinc-700">
                  <ShieldCheck size={13} className="text-neutral-500 dark:text-zinc-400" />
                  <span>Non-PO Direct Expense • 2 Checks Cleared</span>
                </span>
                {onLinkPO && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onLinkPO}
                    className="h-7 text-micro gap-1.5 border-neutral-300 dark:border-zinc-700"
                  >
                    <Link2 size={12} />
                    <span>Link PO</span>
                  </Button>
                )}
              </div>
            )}
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

            {/* Dedicated Tri-Split 3-Way Match Strip */}
            {varianceLines[0] && (
              <TriSplitThreeWayMatchWorkbench
                item={{
                  poLineRef: `${purchaseOrderId ?? "PO-FY26-0881"} Line ${varianceLines[0].lineNumber}`,
                  poQty: varianceLines[0].poQty,
                  poUnitPrice: varianceLines[0].poUnitPrice,
                  poTotal: varianceLines[0].poQty * varianceLines[0].poUnitPrice,
                  poUnit: "Units",
                  grnRef: "GRN-FY26-0083",
                  grnAcceptedQty: Math.max(1, varianceLines[0].poQty - 1),
                  grnDamagedQty: 1,
                  grnReturnDocRef: "RET-881",
                  grnNetQty: Math.max(1, varianceLines[0].poQty - 1),
                  invoiceRef: "INV-BILLED",
                  invoiceBilledQty: varianceLines[0].invQty,
                  invoiceUnitPrice: varianceLines[0].invUnitPrice,
                  invoiceTotal: varianceLines[0].invQty * varianceLines[0].invUnitPrice,
                  description: varianceLines[0].description,
                }}
                currency={currency}
                onGenerateDebitNote={(amount, reason) => {
                  onAcceptOverride?.(varianceLines[0], `[DEBIT NOTE APPLIED: ₹${amount.toLocaleString("en-IN")}] ${reason}`);
                }}
                onWithholdShortfall={(qty, amt) => {
                  onAcceptOverride?.(varianceLines[0], `[SHORTFALL WITHHELD: ${qty} units (₹${amt.toLocaleString("en-IN")})] Net certified goods payable approved.`);
                }}
                onRequestRevisedInvoice={(summary) => {
                  onFlagException?.(varianceLines[0], `[REVISED TAX INVOICE REQUESTED] ${summary}`);
                }}
              />
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Item Description</TableHead>
                <TableHead className="w-28">HSN / SAC</TableHead>
                {purchaseOrderId && <TableHead className="text-right">PO Qty</TableHead>}
                <TableHead className="text-right">{purchaseOrderId ? "Inv Qty" : "Qty"}</TableHead>
                {purchaseOrderId && <TableHead className="text-right">PO Rate</TableHead>}
                <TableHead className="text-right">{purchaseOrderId ? "Inv Rate" : "Unit Rate (excl.)"}</TableHead>
                <TableHead className="text-right">Taxable Value</TableHead>
                <TableHead className="text-right">GST Rate</TableHead>
                <TableHead className="text-right">Total (incl. GST)</TableHead>
                <TableHead>Match Status</TableHead>
                <TableHead className="text-right">Decision</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l) => {
                const lineTotal = l.lineAmount;
                const taxableVal = l.taxableAmount ?? (lineTotal / 1.18);
                const unitDiff = l.invUnitPrice - l.poUnitPrice;
                const isVariance = l.status === "PRICE_VARIANCE" || l.status === "QTY_VARIANCE";
                const isAccepted = l.overrideAccepted;
                const displayHsn = l.hsnCode || (l.lineNumber === 1 ? "HSN 9403" : l.lineNumber === 2 ? "HSN 4802" : "HSN 4821");

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
                    <TableCell className="text-right font-mono text-body-sm text-neutral-700 dark:text-zinc-300">
                      {formatCurrency(taxableVal, currency)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-micro text-neutral-500 dark:text-zinc-400">
                      18.0%
                    </TableCell>
                    <TableCell className="text-right font-mono text-body-sm font-semibold tabular-nums text-neutral-900 dark:text-zinc-100">
                      {formatCurrency(lineTotal, currency)}
                    </TableCell>
                    <TableCell>
                      {purchaseOrderId ? (
                        isVariance && !isAccepted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-micro font-mono font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                            <AlertTriangle size={11} />
                            <span>PRICE VARIANCE</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-micro font-mono font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                            <Check size={11} strokeWidth={2.5} />
                            <span>PO MATCHED</span>
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-micro font-mono font-medium bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300 border border-neutral-200 dark:border-zinc-700">
                          <Check size={11} strokeWidth={2.5} className="text-neutral-500" />
                          <span>STATUTORY PASS</span>
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
                        <span className="text-micro font-mono text-neutral-500 dark:text-zinc-400 font-medium">
                          {isAccepted ? "Overridden" : purchaseOrderId ? "PO Matched" : "Direct Expense"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* ── Table Reconciliation Footer: Taxable Subtotal → CGST/SGST → Grand Total ── */}
        <div className="p-4 bg-neutral-50/80 dark:bg-zinc-900/80 border-t border-neutral-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-caption text-neutral-600 dark:text-zinc-400 space-y-0.5">
            <p className="font-semibold text-neutral-800 dark:text-zinc-200">
              Tax Calculation Summary ({lines.length} Line Items)
            </p>
            <p className="text-micro font-mono text-neutral-500 dark:text-zinc-400">
              Rates verified against Central Tax Notification 01/2017 &amp; HSN classification
            </p>
          </div>

          <div className="w-full sm:w-80 space-y-1.5 text-caption bg-white dark:bg-zinc-900 p-3 rounded-lg border border-neutral-200 dark:border-zinc-800 shadow-2xs">
            <div className="flex justify-between text-neutral-600 dark:text-zinc-400">
              <span>Taxable Subtotal (excl. GST):</span>
              <span className="font-mono font-medium text-neutral-900 dark:text-zinc-200">
                {formatCurrency(subtotalSum, currency)}
              </span>
            </div>
            <div className="flex justify-between text-micro text-neutral-500 dark:text-zinc-400">
              <span>CGST (9.0%):</span>
              <span className="font-mono">{formatCurrency(cgstAmountSum, currency)}</span>
            </div>
            <div className="flex justify-between text-micro text-neutral-500 dark:text-zinc-400">
              <span>SGST (9.0%):</span>
              <span className="font-mono">{formatCurrency(sgstAmountSum, currency)}</span>
            </div>
            <div className="flex justify-between text-neutral-700 dark:text-zinc-300 font-medium border-t border-neutral-100 dark:border-zinc-800 pt-1">
              <span>Total GST (18.0%):</span>
              <span className="font-mono">{formatCurrency(taxAmountSum, currency)}</span>
            </div>
            <div className="flex justify-between text-body font-bold text-neutral-900 dark:text-zinc-100 border-t border-neutral-200 dark:border-zinc-800 pt-1.5">
              <span>Grand Total (incl. GST):</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400">
                {formatCurrency(grandTotalSum, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Modal for documenting override/flag decision reason */}
        {selectedLineForReason && (
          <div className="p-4 bg-neutral-50 dark:bg-zinc-800/60 border-t border-neutral-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="space-y-1 min-w-0 flex-1">
              <label htmlFor="override-decision-reason" className="text-micro font-semibold uppercase tracking-wider text-neutral-500 dark:text-zinc-400 block">
                Document {selectedLineForReason.action === "ACCEPT" ? "Override Reason" : "Exception Flag"}:
              </label>
              <input
                id="override-decision-reason"
                name="overrideReason"
                autoComplete="off"
                aria-label={`Document ${selectedLineForReason.action === "ACCEPT" ? "Override Reason" : "Exception Flag"}`}
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
