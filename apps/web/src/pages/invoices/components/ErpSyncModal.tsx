import { useState, useEffect, useMemo } from "react";
import { Dialog } from "../../../components/ui/Dialog";
import { Button } from "../../../components/ui/Button";
import { Select } from "../../../components/ui/Select";
import { formatCurrency } from "../../../lib/formatters";
import {
  CheckCircle2,
  ArrowRightLeft,
  Building2,
  Code2,
  BookOpen,
  Check,
  XCircle,
  RotateCcw,
  Copy,
} from "lucide-react";
import { AvartaCrest } from "../../../components/brand/AvartaCrest";

export const ERP_OPTIONS = [
  { value: "SAP", label: "SAP S/4HANA & Business One" },
  { value: "NetSuite", label: "Oracle NetSuite ERP" },
  { value: "QuickBooks", label: "QuickBooks Online (Intuit)" },
  { value: "Xero", label: "Xero Cloud Accounting" },
  { value: "Tally", label: "Tally Prime ERP" },
];

export interface ErpSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber: string;
  vendorName: string;
  totalAmount: number | string;
  currency: string;
  onConfirmSync: (targetErp: string) => Promise<void>;
  isPending?: boolean;
}

type SyncLifecycle = "PREVIEW" | "SUCCESS" | "FAILED";

export function ErpSyncModal({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
  vendorName,
  totalAmount,
  currency,
  onConfirmSync,
  isPending,
}: ErpSyncModalProps) {
  const [targetErp, setTargetErp] = useState("SAP");
  const [lifecycle, setLifecycle] = useState<SyncLifecycle>("PREVIEW");
  const [errorMessage, setErrorMessage] = useState("");
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [activeTab, setActiveTab] = useState<"voucher" | "payload">("voucher");
  const [copiedVoucher, setCopiedVoucher] = useState(false);

  // Stable idempotency key and posting date: stored in state, generated once per modal open inside an effect
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [postingDate, setPostingDate] = useState("");

  useEffect(() => {
    if (isOpen) {
      // Generate a stable key and date when the modal opens — never during render
      setIdempotencyKey(`idemp-sync-${invoiceId}-${performance.now().toFixed(0)}`);
      setPostingDate(new Date().toISOString().split("T")[0]);
      setLifecycle("PREVIEW");
      setErrorMessage("");
      setCopiedVoucher(false);
    }
  }, [isOpen, invoiceId]);

  const numTotal = Number(totalAmount) || 0;
  const taxAmount = Math.round(numTotal * 0.18 * 100) / 100; // Standard 18% GST/VAT
  const netAmount = Math.round((numTotal - taxAmount) * 100) / 100;

  const voucherRef = useMemo(() => {
    const cleanNum = invoiceNumber.replace(/[^A-Z0-9]/gi, "");
    return `GL-SYNC-${targetErp}-${cleanNum}`;
  }, [targetErp, invoiceNumber]);

  async function handleSync() {
    setErrorMessage("");

    try {
      if (simulateFailure) {
        await new Promise((res) => setTimeout(res, 800));
        throw new Error(
          `ERP RFC Gateway Timeout (Code 502): The ${targetErp} connector endpoint failed to acknowledge voucher ${voucherRef}. General ledger state was rolled back.`
        );
      }

      await onConfirmSync(targetErp);
      setLifecycle("SUCCESS");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to post double-entry voucher to ${targetErp}.`;
      setErrorMessage(msg);
      setLifecycle("FAILED");
    }
  }

  function handleCopyVoucher() {
    void navigator.clipboard?.writeText(voucherRef);
    setCopiedVoucher(true);
    setTimeout(() => setCopiedVoucher(false), 2000);
  }

  const selectedErpLabel = ERP_OPTIONS.find((e) => e.value === targetErp)?.label ?? targetErp;

  const simulatedPayload = useMemo(() => ({
    destination_erp: targetErp,
    voucher_type: "PURCHASE_INVOICE_JOURNAL",
    posting_date: postingDate,
    reference_number: invoiceNumber,
    vendor_entity: {
      name: vendorName,
      subsidiary_code: "SUB-IND-01",
      tax_id: "27AABCT3518Q1Z4",
    },
    currency: currency,
    exchange_rate: 1.0,
    journal_lines: [
      {
        line_no: 1,
        account_code: "5010-COGS",
        account_name: "Cost of Goods & Production Materials",
        type: "DEBIT",
        amount: netAmount,
        cost_center: "CC-OPS-MUMBAI",
      },
      {
        line_no: 2,
        account_code: "2210-GST-ITC",
        account_name: "Input GST / VAT Recoverable Tax Credit",
        type: "DEBIT",
        amount: taxAmount,
        tax_rate: "18.00%",
      },
      {
        line_no: 3,
        account_code: "2010-AP-TRADE",
        account_name: "Trade Accounts Payable Control Liability",
        type: "CREDIT",
        amount: numTotal,
        payment_terms: "NET30",
      },
    ],
    idempotency_key: idempotencyKey,
  }), [targetErp, invoiceNumber, vendorName, currency, netAmount, taxAmount, numTotal, idempotencyKey, postingDate]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-2xl w-full"
      title={
        lifecycle === "SUCCESS"
          ? "General Ledger Voucher Confirmed"
          : lifecycle === "FAILED"
          ? "ERP Synchronization Failed"
          : `Post to ERP (${selectedErpLabel.split(" ")[0]} & Others)`
      }
      description={
        lifecycle === "SUCCESS"
          ? `Journal voucher posted to ${selectedErpLabel}.`
          : lifecycle === "FAILED"
          ? `Could not transmit journal entry to ${selectedErpLabel}.`
          : `Post balanced double-entry accounting journal entries for Invoice ${invoiceNumber}.`
      }
    >
      <div className="space-y-4 pt-1">
        {/* ═════════════════════════════════════════════════════════════
         * STATE 1: SUCCESS STATE (Voucher Confirmation & Receipt)
         * ═════════════════════════════════════════════════════════════ */}
        {lifecycle === "SUCCESS" && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/80 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="text-body font-bold text-emerald-950 dark:text-emerald-100">
                  Double-Entry Journal Successfully Posted &amp; Balanced
                </h4>
                <p className="text-caption text-emerald-800 dark:text-emerald-300">
                  Transmitted to <strong className="font-semibold">{selectedErpLabel}</strong>. Invoice state transitioned to <strong className="font-semibold font-mono">SYNCED</strong>.
                </p>
              </div>
            </div>

            {/* Voucher Confirmation Receipt */}
            <div className="relative p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-neutral-50/70 dark:bg-zinc-900/60 space-y-3 font-mono text-caption overflow-hidden">
              <AvartaCrest variant="watermark" className="opacity-[0.04] dark:opacity-[0.05]" />
              
              {/* Institutional Voucher Proof Header */}
              <div className="relative z-10 flex items-center justify-between border-b border-neutral-200 dark:border-zinc-800 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-zinc-800 border border-neutral-200/80 dark:border-zinc-700/80 flex items-center justify-center p-0.5 shadow-2xs">
                    <AvartaCrest variant="shield" glow className="w-full h-full" />
                  </div>
                  <div>
                    <span className="font-semibold text-body-sm text-neutral-900 dark:text-zinc-100 block font-sans">
                      Certified Ledger Voucher Proof
                    </span>
                    <span className="text-[10px] text-neutral-500 dark:text-zinc-400 font-mono">
                      Avarta ERP Gateway • आत्मानं विद्धि
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-micro text-neutral-400 dark:text-zinc-500 uppercase block">Posting Status</span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-micro">
                    <Check size={12} strokeWidth={3} />
                    <span>POSTED (DR = CR)</span>
                  </span>
                </div>
              </div>

              <div className="relative z-10 flex items-center justify-between border-b border-neutral-200/60 dark:border-zinc-800/60 pb-2">
                <div>
                  <span className="text-micro text-neutral-400 dark:text-zinc-500 uppercase block">Voucher Reference</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-body-sm text-neutral-900 dark:text-zinc-100">{voucherRef}</span>
                    <button
                      type="button"
                      onClick={handleCopyVoucher}
                      className="inline-flex items-center gap-1 text-micro text-indigo-600 dark:text-indigo-400 hover:underline font-sans"
                    >
                      <Copy size={12} />
                      <span>{copiedVoucher ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                <span className="text-micro font-mono bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 font-semibold">
                  IMMUTABLE
                </span>
              </div>

              <div className="relative z-10 grid grid-cols-2 gap-2 text-micro">
                <div>
                  <span className="text-neutral-400 block">Total Invoiced:</span>
                  <span className="font-bold text-neutral-900 dark:text-zinc-100">{formatCurrency(numTotal, currency)}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block">Claimable Tax (ITC):</span>
                  <span className="font-bold text-neutral-900 dark:text-zinc-100">{formatCurrency(taxAmount, currency)}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block">Vendor Entity:</span>
                  <span className="text-neutral-800 dark:text-zinc-200">{vendorName}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block">Destination Ledger:</span>
                  <span className="text-neutral-800 dark:text-zinc-200">{targetErp} Main Ledger</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-neutral-200 dark:border-zinc-800">
              <Button
                type="button"
                onClick={onClose}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                Done &amp; Return to Invoice
              </Button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════
         * STATE 2: FAILED STATE (ERP Connection Error / Locked Account)
         * ═════════════════════════════════════════════════════════════ */}
        {lifecycle === "FAILED" && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/80 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                <XCircle size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="text-body font-bold text-red-950 dark:text-red-100">
                  ERP Voucher Transmission Failed
                </h4>
                <p className="text-caption text-red-800 dark:text-red-300 leading-relaxed">
                  {errorMessage || "The external accounting gateway rejected or failed to process the double-entry voucher."}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-neutral-50/70 dark:bg-zinc-900/60 font-mono text-micro space-y-1.5 text-neutral-600 dark:text-zinc-400">
              <div className="flex items-center justify-between font-semibold text-neutral-800 dark:text-zinc-200">
                <span>Attempted Destination:</span>
                <span>{selectedErpLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Voucher Identifier:</span>
                <span>{voucherRef}</span>
              </div>
              <p className="pt-1.5 border-t border-neutral-200/60 dark:border-zinc-800/60 text-neutral-500 font-sans">
                <strong>Safety Notice:</strong> No journal entries were committed. You can safely modify destination options or retry the synchronization.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLifecycle("PREVIEW")}
              >
                Back to Voucher Setup
              </Button>

              <div className="flex items-center gap-2.5">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSync}
                  className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  <RotateCcw size={14} />
                  <span>Retry Posting Voucher</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════
         * STATE 3: PREVIEW STATE (Balanced Voucher / Payload Inspection)
         * ═════════════════════════════════════════════════════════════ */}
        {lifecycle === "PREVIEW" && (
          <>
            {/* ERP Target Selector */}
            <div className="space-y-1.5">
              <label className="text-label text-neutral-700 dark:text-zinc-300 block">
                Destination Accounting / ERP Gateway
              </label>
              <Select
                id="erp-select-input"
                name="targetErp"
                value={targetErp}
                onValueChange={setTargetErp}
                options={ERP_OPTIONS}
              />
            </div>

            {/* View switcher: Voucher Table vs JSON Payload */}
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("voucher")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-caption font-medium transition-colors ${
                    activeTab === "voucher"
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                      : "text-neutral-500 hover:text-neutral-700 dark:hover:text-zinc-300"
                  }`}
                >
                  <BookOpen size={13} />
                  <span>General Ledger Voucher</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("payload")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-caption font-medium transition-colors ${
                    activeTab === "payload"
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                      : "text-neutral-500 hover:text-neutral-700 dark:hover:text-zinc-300"
                  }`}
                >
                  <Code2 size={13} />
                  <span>REST API Payload Preview</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-micro font-mono font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                <Check size={11} strokeWidth={3} />
                <span>DR = CR BALANCED</span>
              </div>
            </div>

            {activeTab === "voucher" ? (
              /* General Ledger Journal Entry Preview */
              <div className="rounded-lg border border-neutral-200 dark:border-zinc-800 bg-neutral-50/70 dark:bg-zinc-900/60 p-3.5 space-y-3">
                <div className="flex items-center justify-between text-caption font-medium border-b border-neutral-200/80 dark:border-zinc-800 pb-2">
                  <span className="flex items-center gap-1.5 text-neutral-800 dark:text-zinc-200">
                    <Building2 size={13} className="text-neutral-500" />
                    <span>Vendor: <strong className="font-semibold">{vendorName}</strong></span>
                  </span>
                  <span className="font-mono text-neutral-500 text-micro">
                    Voucher Ref: GL-INV-{invoiceNumber}
                  </span>
                </div>

                <div className="text-caption space-y-1">
                  <div className="grid grid-cols-12 font-semibold text-neutral-400 dark:text-zinc-500 pb-1.5 border-b border-neutral-200/60 dark:border-zinc-800/60 text-micro uppercase tracking-wider">
                    <span className="col-span-7">GL Account &amp; Cost Category</span>
                    <span className="col-span-2 text-right">Debit (DR)</span>
                    <span className="col-span-3 text-right">Credit (CR)</span>
                  </div>

                  {/* Line 1: Operating Expense (Debit) */}
                  <div className="grid grid-cols-12 text-body-sm py-1.5 items-center">
                    <div className="col-span-7">
                      <p className="font-mono text-neutral-900 dark:text-zinc-100 font-medium">
                        5010 • Production Materials Expense
                      </p>
                      <p className="text-micro text-neutral-500">Cost of Goods Invoiced (Tax-Exclusive)</p>
                    </div>
                    <span className="col-span-2 text-right font-mono font-semibold text-neutral-900 dark:text-zinc-100 tabular-nums">
                      {formatCurrency(netAmount, currency)}
                    </span>
                    <span className="col-span-3 text-right font-mono text-neutral-400">—</span>
                  </div>

                  {/* Line 2: Input GST Tax Credit (Debit) */}
                  <div className="grid grid-cols-12 text-body-sm py-1.5 items-center">
                    <div className="col-span-7">
                      <p className="font-mono text-neutral-900 dark:text-zinc-100 font-medium">
                        2210 • Input GST/VAT Recoverable Credit
                      </p>
                      <p className="text-micro text-neutral-500">Claimable ITC @ 18% Rate</p>
                    </div>
                    <span className="col-span-2 text-right font-mono font-semibold text-neutral-900 dark:text-zinc-100 tabular-nums">
                      {formatCurrency(taxAmount, currency)}
                    </span>
                    <span className="col-span-3 text-right font-mono text-neutral-400">—</span>
                  </div>

                  {/* Line 3: Accounts Payable (Credit) */}
                  <div className="grid grid-cols-12 text-body-sm py-1.5 items-center border-t border-neutral-200/80 dark:border-zinc-800">
                    <div className="col-span-7">
                      <p className="font-mono text-neutral-900 dark:text-zinc-100 font-medium">
                        2010 • Accounts Payable Control
                      </p>
                      <p className="text-micro text-neutral-500">Net Liability Payable to {vendorName}</p>
                    </div>
                    <span className="col-span-2 text-right font-mono text-neutral-400">—</span>
                    <span className="col-span-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {formatCurrency(numTotal, currency)}
                    </span>
                  </div>

                  {/* Summary Balance Line */}
                  <div className="grid grid-cols-12 text-micro pt-2 border-t border-neutral-300 dark:border-zinc-700 font-semibold font-mono text-neutral-700 dark:text-zinc-300">
                    <span className="col-span-7 uppercase">Total Double-Entry Verification</span>
                    <span className="col-span-2 text-right text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(numTotal, currency)}
                    </span>
                    <span className="col-span-3 text-right text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(numTotal, currency)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* REST API Payload Preview */
              <div className="rounded-lg border border-neutral-200 dark:border-zinc-800 bg-neutral-900 text-neutral-100 p-3 font-mono text-micro overflow-x-auto max-h-56">
                <pre>{JSON.stringify(simulatedPayload, null, 2)}</pre>
              </div>
            )}

            {/* Edge Case Simulation Toggle */}
            <div className="pt-1 text-micro font-mono text-neutral-400 dark:text-zinc-500 flex items-center justify-between border-t border-neutral-100 dark:border-zinc-800">
              <span className="truncate max-w-[320px]">Ref: {voucherRef}</span>

              <label className="flex items-center gap-1.5 cursor-pointer select-none text-neutral-500 dark:text-zinc-400 hover:text-neutral-800 dark:hover:text-zinc-200">
                <input
                  type="checkbox"
                  checked={simulateFailure}
                  onChange={(e) => setSimulateFailure(e.target.checked)}
                  className="rounded border-neutral-300 dark:border-zinc-700 text-red-600 focus:ring-red-500"
                />
                <span>Simulate ERP Gateway Timeout</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-200 dark:border-zinc-800">
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button
                onClick={handleSync}
                disabled={isPending}
                className={`gap-2 text-white font-semibold ${simulateFailure ? "bg-amber-600 hover:bg-amber-500" : "bg-indigo-600 hover:bg-indigo-500"}`}
              >
                <ArrowRightLeft size={15} />
                <span>
                  {isPending
                    ? "Posting Voucher..."
                    : simulateFailure
                    ? `Post to ${targetErp} (Trigger Timeout)`
                    : `Post to ${targetErp}`}
                </span>
              </Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
