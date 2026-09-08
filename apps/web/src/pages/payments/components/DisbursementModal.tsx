import { useState, useEffect, useMemo } from "react";
import { Dialog } from "../../../components/ui/Dialog";
import { Button } from "../../../components/ui/Button";
import { formatCurrency, formatDate } from "../../../lib/formatters";
import { PaymentRow } from "../../../api/payments";
import {
  Wallet,
  Building2,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Landmark,
  Zap,
  Check,
  AlertTriangle,
  XCircle,
  Copy,
  Download,
  RotateCcw,
  Clock,
  ArrowRight,
  ChevronDown,
  Info,
} from "lucide-react";
import { AvartaCrest } from "../../../components/brand/AvartaCrest";

export interface TreasuryAccount {
  id: string;
  name: string;
  bankName: string;
  accountNumberMasked: string;
  currency: string;
  availableBalance: number;
}

export const TREASURY_ACCOUNTS: TreasuryAccount[] = [
  {
    id: "HDFC_4920",
    name: "HDFC Corporate Current",
    bankName: "HDFC Bank Ltd",
    accountNumberMasked: "5020 •••• 4920",
    currency: "INR",
    availableBalance: 48250000.0,
  },
  {
    id: "HSBC_7731",
    name: "HSBC Global Liquidity & Treasury",
    bankName: "HSBC Continental Europe",
    accountNumberMasked: "FR76 •••• 7731",
    currency: "EUR",
    availableBalance: 850000.0,
  },
  {
    id: "CHASE_1082",
    name: "Chase Commercial Clearing",
    bankName: "JPMorgan Chase Bank, N.A.",
    accountNumberMasked: "4820 •••• 1082",
    currency: "USD",
    availableBalance: 1250000.0,
  },
];

export interface PaymentRail {
  id: string;
  name: string;
  badge: string;
  executionTime: string;
  currencies: string[];
}

export const PAYMENT_RAILS: PaymentRail[] = [
  {
    id: "NEFT_RTGS",
    name: "NEFT / RTGS Instant SFTP",
    badge: "RBI Direct",
    executionTime: "Immediate (within 60s)",
    currencies: ["INR"],
  },
  {
    id: "SEPA_INSTANT",
    name: "SEPA Instant Credit Transfer",
    badge: "EPC Rails",
    executionTime: "Instant (10 seconds)",
    currencies: ["EUR"],
  },
  {
    id: "ACH_SAME_DAY",
    name: "ACH Same-Day Commercial Direct",
    badge: "FedACH",
    executionTime: "Same-Day Settlement",
    currencies: ["USD"],
  },
  {
    id: "VIRTUAL_CARD",
    name: "Avarta Virtual Corporate Card",
    badge: "1.5% Rebate",
    executionTime: "Instant tokenized payout",
    currencies: ["EUR", "INR", "USD"],
  },
  {
    id: "SWIFT_WIRE",
    name: "SWIFT Global Priority Wire",
    badge: "Cross-Border",
    executionTime: "T+1 Business Day",
    currencies: ["EUR", "INR", "USD"],
  },
];

export interface DisbursementModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPayments: PaymentRow[];
  totalAmount: number;
  currency: string;
  onConfirmDisburse: (account: string, rail: string) => Promise<void>;
  isExecuting?: boolean;
}

type ModalLifecycle = "CONFIGURING" | "PROCESSING" | "SUCCESS" | "FAILED";

interface SettlementReceipt {
  reference: string;
  timestamp: string;
  debitedAccountName: string;
  debitedAmount: number;
  currency: string;
  railName: string;
}

function createSettlementReceipt(params: {
  accountName: string;
  amount: number;
  currency: string;
  railName: string;
}): SettlementReceipt {
  const now = new Date();
  return {
    reference: `H2H-DISB-${now.getTime().toString().slice(-8)}`,
    timestamp: now.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    debitedAccountName: params.accountName,
    debitedAmount: params.amount,
    currency: params.currency,
    railName: params.railName,
  };
}

export function DisbursementModal({
  isOpen,
  onClose,
  selectedPayments,
  totalAmount,
  currency,
  onConfirmDisburse,
  isExecuting = false,
}: DisbursementModalProps) {
  const isSingle = selectedPayments.length === 1;
  const singlePayment = isSingle ? selectedPayments[0] : null;

  // Auto-match treasury account based on currency (eliminates all guessing)
  const defaultAccountId = useMemo(() => {
    const matched = TREASURY_ACCOUNTS.find((a) => a.currency.toUpperCase() === currency.toUpperCase());
    return matched ? matched.id : TREASURY_ACCOUNTS[0].id;
  }, [currency]);

  // Auto-match payment rail based on currency
  const defaultRailId = useMemo(() => {
    const matched = PAYMENT_RAILS.find((r) => r.currencies.includes(currency.toUpperCase()));
    return matched ? matched.id : PAYMENT_RAILS[0].id;
  }, [currency]);

  const [selectedAccountId, setSelectedAccountId] = useState(defaultAccountId);
  const [selectedRailId, setSelectedRailId] = useState(defaultRailId);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  
  // State machine: CONFIGURING -> PROCESSING -> SUCCESS | FAILED
  const [lifecycle, setLifecycle] = useState<ModalLifecycle>("CONFIGURING");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [copiedRef, setCopiedRef] = useState(false);

  // Settlement receipt details
  const [receipt, setReceipt] = useState<SettlementReceipt | null>(null);

  // Reset state on open or currency change
  useEffect(() => {
    if (isOpen) {
      setSelectedAccountId(defaultAccountId);
      setSelectedRailId(defaultRailId);
      setLifecycle("CONFIGURING");
      setErrorMessage("");
      setShowAccountDropdown(false);
      setCopiedRef(false);
    }
  }, [defaultAccountId, defaultRailId, isOpen]);

  const activeAccount = TREASURY_ACCOUNTS.find((a) => a.id === selectedAccountId) ?? TREASURY_ACCOUNTS[0];
  const activeRail = PAYMENT_RAILS.find((r) => r.id === selectedRailId) ?? PAYMENT_RAILS[0];

  const hasCurrencyMatch = activeAccount.currency.toUpperCase() === currency.toUpperCase();
  const isInsufficientFunds = hasCurrencyMatch && activeAccount.availableBalance < totalAmount;
  const remainingBalance = activeAccount.availableBalance - (hasCurrencyMatch ? totalAmount : 0);

  async function handleDisburse() {
    setLifecycle("PROCESSING");
    setErrorMessage("");

    try {
      await onConfirmDisburse(selectedAccountId, selectedRailId);

      setReceipt(
        createSettlementReceipt({
          accountName: activeAccount.name,
          amount: totalAmount,
          currency,
          railName: activeRail.name,
        })
      );

      setLifecycle("SUCCESS");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Electronic disbursement failed due to banking network rejection.";
      setErrorMessage(msg);
      setLifecycle("FAILED");
    }
  }

  function handleCopyReference() {
    if (!receipt) return;
    void navigator.clipboard?.writeText(receipt.reference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  }

  function handleDownloadPaymentAdvice() {
    // Generate mock payment advice receipt text
    const adviceText = `
================================================================================
          AVARTA INSTITUTIONAL BANKING DISBURSEMENT ADVICE
                         "आत्मानं विद्धि"
================================================================================
SETTLEMENT REFERENCE : ${receipt?.reference ?? "H2H-DISB-00000000"}
TRANSACTION STATUS   : SETTLED & CONFIRMED (HTTP 200 OK)
EXECUTION TIMESTAMP  : ${receipt?.timestamp}
SETTLEMENT RAIL      : ${receipt?.railName}
DEBIT ACCOUNT        : ${receipt?.debitedAccountName}
TOTAL DEBIT AMOUNT   : ${receipt?.currency} ${receipt?.debitedAmount.toFixed(2)}
BATCH REFERENCE      : ${receipt?.reference ?? "H2H-DISB-00000000"}
TENANT IDENTIFIER    : org-demo-sme
AUTHENTICATION SEAL  : AVARTA-CRYPTO-STAMP-AES256-GCM
================================================================================
ITEMIZED INVOICES:
${selectedPayments.map((p, idx) => `${idx + 1}. ${p.invoiceNumber} | ${p.vendor} | ${p.currency} ${p.amount}`).join("\n")}
================================================================================
This is a cryptographically verifiable electronic bank advice authorized via
Avarta AP Workspace Maker-Checker Governance Protocol (Section 44AA / Rule 56).
    `.trim();

    const blob = new Blob([adviceText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Payment_Advice_${receipt?.reference ?? "DISB"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Filter available rails to prioritize those supporting the current currency
  const relevantRails = useMemo(() => {
    return PAYMENT_RAILS.filter((r) => r.currencies.includes(currency.toUpperCase()) || r.currencies.includes("USD"));
  }, [currency]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-2xl w-full max-h-[92vh] flex flex-col"
      title={
        lifecycle === "SUCCESS"
          ? "Disbursement Settled Successfully"
          : lifecycle === "FAILED"
          ? "Disbursement Settlement Failed"
          : isSingle
          ? "Authorize Banking Disbursement"
          : "Authorize Batch Banking Disbursement"
      }
      description={
        lifecycle === "SUCCESS"
          ? `Settlement confirmed on banking network for ${selectedPayments.length} invoice(s).`
          : lifecycle === "FAILED"
          ? "Electronic payment could not be finalized. Funds remain safe in your treasury account."
          : isSingle
          ? `Direct electronic settlement for Invoice ${singlePayment?.invoiceNumber} (${singlePayment?.vendor}).`
          : `Release simultaneous host-to-host bank payout for ${selectedPayments.length} approved invoices.`
      }
    >
      <div className="space-y-4 pt-1 flex-1 overflow-y-auto pr-1">
        {/* ═════════════════════════════════════════════════════════════
         * STATE 1: SUCCESS STATE (Settlement Receipt & Verification)
         * ═════════════════════════════════════════════════════════════ */}
        {lifecycle === "SUCCESS" && receipt && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Green Hero Banner */}
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/80 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="text-body font-bold text-emerald-950 dark:text-emerald-100">
                  Electronic Remittance Broadcasted &amp; Confirmed
                </h4>
                <p className="text-caption text-emerald-800 dark:text-emerald-300">
                  Transaction has been acknowledged by the clearing bank. Status updated to <strong className="font-semibold">PAID</strong> across all ledgers.
                </p>
              </div>
            </div>

            {/* Official Settlement Receipt Card */}
            <div className="relative p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-neutral-50/70 dark:bg-zinc-900/60 space-y-3 font-mono overflow-hidden">
              <AvartaCrest variant="watermark" className="opacity-[0.04] dark:opacity-[0.05]" />

              {/* Receipt Institutional Header */}
              <div className="relative z-10 flex items-center justify-between border-b border-neutral-200 dark:border-zinc-800 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-zinc-800 border border-neutral-200/80 dark:border-zinc-700/80 flex items-center justify-center p-0.5 shadow-2xs">
                    <AvartaCrest variant="shield" glow className="w-full h-full" />
                  </div>
                  <div>
                    <span className="font-semibold text-body-sm text-neutral-900 dark:text-zinc-100 block font-sans">
                      Avarta H2H Clearinghouse
                    </span>
                    <span className="text-[10px] text-neutral-500 dark:text-zinc-400 font-mono">
                      Banking Settlement Advice • आत्मानं विद्धि
                    </span>
                  </div>
                </div>

                <span className="text-micro font-mono font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                  CONFIRMED (HTTP 200)
                </span>
              </div>

              <div className="relative z-10 flex items-center justify-between border-b border-neutral-200/60 dark:border-zinc-800/60 pb-2.5">
                <div className="space-y-0.5">
                  <span className="text-micro text-neutral-400 dark:text-zinc-500 uppercase tracking-wider block">
                    Settlement Reference
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-body font-bold text-neutral-900 dark:text-zinc-100">
                      {receipt.reference}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyReference}
                      className="inline-flex items-center gap-1 text-micro text-indigo-600 dark:text-indigo-400 hover:underline font-sans"
                    >
                      <Copy size={12} />
                      <span>{copiedRef ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                <div className="text-right space-y-0.5">
                  <span className="text-micro text-neutral-400 dark:text-zinc-500 uppercase tracking-wider block">
                    Execution Timestamp
                  </span>
                  <span className="text-caption text-neutral-700 dark:text-zinc-300">
                    {receipt.timestamp}
                  </span>
                </div>
              </div>

              {/* Receipt Grid */}
              <div className="relative z-10 grid grid-cols-2 gap-3 text-caption pt-1">
                <div>
                  <span className="text-micro text-neutral-400 dark:text-zinc-500 uppercase block">Total Debited</span>
                  <span className="text-body-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {formatCurrency(receipt.debitedAmount, receipt.currency)}
                  </span>
                </div>
                <div>
                  <span className="text-micro text-neutral-400 dark:text-zinc-500 uppercase block">Settlement Rail</span>
                  <span className="text-neutral-800 dark:text-zinc-200 font-medium">
                    {receipt.railName}
                  </span>
                </div>
                <div>
                  <span className="text-micro text-neutral-400 dark:text-zinc-500 uppercase block">Debited Account</span>
                  <span className="text-neutral-800 dark:text-zinc-200 font-medium">
                    {receipt.debitedAccountName}
                  </span>
                </div>
                <div>
                  <span className="text-micro text-neutral-400 dark:text-zinc-500 uppercase block">Remaining Balance</span>
                  <span className="text-neutral-800 dark:text-zinc-200 font-medium tabular-nums">
                    {formatCurrency(remainingBalance, activeAccount.currency)}
                  </span>
                </div>
              </div>

              {/* Settlement Invoices List */}
              <div className="pt-2 border-t border-neutral-200/60 dark:border-zinc-800/60 text-micro">
                <span className="text-neutral-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">
                  Settled Invoices ({selectedPayments.length})
                </span>
                <div className="space-y-1">
                  {selectedPayments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-neutral-700 dark:text-zinc-300">
                      <span>{p.invoiceNumber} • {p.vendor}</span>
                      <span className="font-semibold tabular-nums">{formatCurrency(p.amount, p.currency ?? currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Compliance Guarantee Footer */}
            <div className="flex items-center justify-between text-micro font-mono text-neutral-400 dark:text-zinc-500 pt-1 border-t border-neutral-100 dark:border-zinc-800">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>Host-to-Host Banking Settlement Confirmed</span>
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Ledgers Synchronized</span>
            </div>

            {/* Success Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-200 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadPaymentAdvice}
                className="gap-2"
              >
                <Download size={14} />
                <span>Download Payment Advice</span>
              </Button>
              <Button
                type="button"
                onClick={onClose}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-xs"
              >
                Done &amp; Return to Payments
              </Button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════
         * STATE 2: FAILED STATE (Bank Rejection / Gateway Timeout Edge Case)
         * ═════════════════════════════════════════════════════════════ */}
        {lifecycle === "FAILED" && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Red Alert Banner */}
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/80 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                <XCircle size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="text-body font-bold text-red-950 dark:text-red-100">
                  Payment Transmission Failed
                </h4>
                <p className="text-caption text-red-800 dark:text-red-300 leading-relaxed">
                  {errorMessage || "The banking clearing gateway rejected or timed out while processing this remittance batch."}
                </p>
              </div>
            </div>

            {/* Diagnostic Details & Rollback Guarantee */}
            <div className="p-4 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-neutral-50/70 dark:bg-zinc-900/60 space-y-2.5 font-mono text-caption">
              <div className="flex items-center justify-between text-neutral-500 border-b border-neutral-200 dark:border-zinc-800 pb-2">
                <span className="font-semibold uppercase text-micro">Rollback Diagnostics</span>
                <span className="text-red-600 dark:text-red-400 font-semibold">ZERO FUNDS DEBITED</span>
              </div>

              <div className="space-y-1.5 text-neutral-700 dark:text-zinc-300 text-micro">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Target Rail:</span>
                  <span>{activeRail.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Treasury Account:</span>
                  <span>{activeAccount.name} ({activeAccount.accountNumberMasked})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Pending Amount:</span>
                  <span className="font-bold">{formatCurrency(totalAmount, currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Batch Reference:</span>
                  <span className="truncate max-w-[280px]">BATCH-REF-PENDING</span>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-200/60 dark:border-zinc-800/60 text-micro text-neutral-500 font-sans">
                <p>
                  <strong>Transaction Protection:</strong> Avarta banking connector ensures re-submitting this batch will not cause duplicate debits.
                </p>
              </div>
            </div>

            {/* Failure Action Suite */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLifecycle("CONFIGURING")}
                className="gap-1.5 text-caption font-medium"
              >
                <span>Edit Account or Rail</span>
              </Button>

              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDisburse}
                  className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  <RotateCcw size={14} />
                  <span>Retry Disbursement</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════
         * STATE 3: CONFIGURING / INITIAL REVIEW STATE
         * ═════════════════════════════════════════════════════════════ */}
        {lifecycle === "CONFIGURING" && (
          <>
            {/* EDGE CASE 1: Insufficient Balance Alert */}
            {isInsufficientFunds && (
              <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/80 flex items-start gap-2.5 text-caption text-red-800 dark:text-red-300">
                <AlertTriangle size={17} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <strong className="font-semibold text-red-950 dark:text-red-200">
                    Insufficient Account Balance
                  </strong>
                  <p className="text-micro leading-relaxed">
                    Required {formatCurrency(totalAmount, currency)} exceeds available balance ({formatCurrency(activeAccount.availableBalance, activeAccount.currency)}) by {formatCurrency(totalAmount - activeAccount.availableBalance, currency)}. Please switch accounts or replenish treasury liquidity before disbursing.
                  </p>
                </div>
              </div>
            )}

            {/* EDGE CASE 2: Currency Mismatch Warning */}
            {!hasCurrencyMatch && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/80 flex items-start gap-2 text-caption text-amber-800 dark:text-amber-300">
                <Info size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-micro">
                  <strong className="font-semibold text-amber-950 dark:text-amber-200">
                    Cross-Currency Remittance Alert
                  </strong>
                  <p>
                    Payout is in <strong>{currency}</strong>, but selected ledger is in <strong>{activeAccount.currency}</strong>. Cross-border FX conversion spreads and correspondent bank fees will apply.
                  </p>
                </div>
              </div>
            )}

            {/* 1. Treasury Debit Account — Roomy, Transparent, Zero Guess Work */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-label text-neutral-700 dark:text-zinc-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <Landmark size={14} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Treasury Source Account</span>
                </span>
                {hasCurrencyMatch && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-mono font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                    <Check size={11} strokeWidth={3} />
                    <span>Matches Invoice Currency ({currency})</span>
                  </span>
                )}
              </div>

              {/* Active Account Display Card */}
              <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-neutral-50/70 dark:bg-zinc-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-900 dark:text-zinc-100 text-body-sm">
                      {activeAccount.name}
                    </span>
                    <span className="text-micro font-mono text-neutral-500 dark:text-zinc-400">
                      {activeAccount.accountNumberMasked}
                    </span>
                  </div>
                  <p className="text-micro text-neutral-500 dark:text-zinc-400">
                    {activeAccount.bankName}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-micro uppercase text-neutral-400 dark:text-zinc-500 font-semibold block">
                      Available Balance
                    </span>
                    <span className={`text-body-sm font-mono font-bold tabular-nums ${isInsufficientFunds ? "text-red-600 dark:text-red-400" : "text-neutral-900 dark:text-zinc-100"}`}>
                      {formatCurrency(activeAccount.availableBalance, activeAccount.currency)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAccountDropdown((prev) => !prev)}
                    className="px-2.5 py-1 text-caption font-medium rounded-md border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-750 text-indigo-600 dark:text-indigo-400 transition-colors shadow-2xs"
                  >
                    {showAccountDropdown ? "Close" : "Switch Account"}
                  </button>
                </div>
              </div>

              {/* Account Switcher Options (if open) */}
              {showAccountDropdown && (
                <div className="p-2 rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-1.5 animate-in fade-in duration-150">
                  <span className="text-micro font-semibold uppercase text-neutral-400 dark:text-zinc-500 px-2 block">
                    Select Alternative Treasury Ledger
                  </span>
                  {TREASURY_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        setSelectedAccountId(acc.id);
                        setShowAccountDropdown(false);
                      }}
                      className={`w-full p-2.5 rounded-md flex items-center justify-between text-left transition-colors ${
                        acc.id === selectedAccountId
                          ? "bg-white dark:bg-zinc-800 border border-indigo-300 dark:border-indigo-700 shadow-xs"
                          : "hover:bg-white/60 dark:hover:bg-zinc-800/60 text-neutral-700 dark:text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-body-sm">{acc.name}</span>
                        <span className="text-micro font-mono text-neutral-400">{acc.accountNumberMasked}</span>
                      </div>
                      <span className="font-mono text-caption font-semibold tabular-nums">
                        {formatCurrency(acc.availableBalance, acc.currency)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Settlement Rail Selector — Visual Cards */}
            <div className="space-y-1.5">
              <label className="text-label text-neutral-700 dark:text-zinc-300 font-medium flex items-center gap-1.5">
                <Zap size={14} className="text-amber-500" />
                <span>Banking Settlement Rail</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {relevantRails.map((rail) => {
                  const isSelected = rail.id === selectedRailId;
                  return (
                    <button
                      key={rail.id}
                      type="button"
                      onClick={() => setSelectedRailId(rail.id)}
                      className={`p-3 rounded-lg border text-left transition-all relative ${
                        isSelected
                          ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs ring-1 ring-indigo-500/20"
                          : "border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-neutral-50 dark:hover:bg-zinc-800/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-semibold text-body-sm text-neutral-900 dark:text-zinc-100 truncate">
                          {rail.name}
                        </span>
                        <span className="text-micro font-mono font-semibold px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-300 shrink-0">
                          {rail.badge}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-micro font-mono text-neutral-500 dark:text-zinc-400">
                        <Clock size={11} />
                        <span>{rail.executionTime}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Beneficiary & Invoice Breakdown */}
            {isSingle && singlePayment ? (
              /* Single Invoice Beneficiary Card */
              <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-neutral-50/50 dark:bg-zinc-900/50 space-y-2">
                <div className="flex items-center justify-between text-caption font-semibold text-neutral-500 dark:text-zinc-400 uppercase tracking-wider text-micro">
                  <span>Beneficiary &amp; Remittance Details</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-mono">Invoice #{singlePayment.invoiceNumber}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-body-sm pt-1">
                  <div>
                    <span className="text-micro text-neutral-500 block">Vendor / Payee</span>
                    <span className="font-semibold text-neutral-900 dark:text-zinc-100">{singlePayment.vendor}</span>
                  </div>
                  <div>
                    <span className="text-micro text-neutral-500 block">Beneficiary IBAN / Account</span>
                    <span className="font-mono text-neutral-800 dark:text-zinc-200">
                      {singlePayment.currency === "EUR" ? "DE89 3704 0044 0532 0130 00" : "HDFC0000240 • 0240105008912"}
                    </span>
                  </div>
                  <div>
                    <span className="text-micro text-neutral-500 block">Scheduled Due Date</span>
                    <span className="font-mono text-neutral-800 dark:text-zinc-200">{formatDate(singlePayment.dueDate)}</span>
                  </div>
                  <div>
                    <span className="text-micro text-neutral-500 block">Payment Method</span>
                    <span className="font-mono text-neutral-800 dark:text-zinc-200">{singlePayment.method || "Direct Remittance"}</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Batch Invoices Table */
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-caption text-neutral-500 dark:text-zinc-400">
                  <span className="font-semibold uppercase tracking-wider text-micro">
                    Included Batch Invoices ({selectedPayments.length})
                  </span>
                  <span className="font-mono text-micro text-neutral-400">
                    Host-to-Host Electronic Batch
                  </span>
                </div>

                <div className="rounded-lg border border-neutral-200 dark:border-zinc-800 bg-neutral-50/70 dark:bg-zinc-900/60 overflow-hidden max-h-40 overflow-y-auto">
                  <table className="w-full text-left text-body-sm">
                    <thead className="text-micro font-mono uppercase bg-neutral-100/70 dark:bg-zinc-800/60 text-neutral-500 border-b border-neutral-200 dark:border-zinc-800 sticky top-0">
                      <tr>
                        <th className="px-3 py-1.5">Invoice #</th>
                        <th className="px-3 py-1.5">Vendor</th>
                        <th className="px-3 py-1.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200/60 dark:divide-zinc-800/60 font-mono">
                      {selectedPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-neutral-100/50 dark:hover:bg-zinc-800/40">
                          <td className="px-3 py-1.5 font-medium text-neutral-900 dark:text-zinc-100">
                            {p.invoiceNumber}
                          </td>
                          <td className="px-3 py-1.5 text-neutral-600 dark:text-zinc-300 truncate max-w-[160px] font-sans">
                            {p.vendor}
                          </td>
                          <td className="px-3 py-1.5 text-right font-semibold text-neutral-900 dark:text-zinc-100 tabular-nums">
                            {formatCurrency(p.amount, p.currency ?? currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. Total Payout & Post-Disbursement Liquidity Breakdown */}
            <div className={`p-3.5 rounded-lg border space-y-2 ${isInsufficientFunds ? "bg-red-50/70 dark:bg-red-950/30 border-red-300 dark:border-red-900/60" : "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet size={16} className={isInsufficientFunds ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"} />
                  <span className={`text-caption font-semibold ${isInsufficientFunds ? "text-red-950 dark:text-red-200" : "text-emerald-950 dark:text-emerald-200"}`}>
                    Total Debit Authorization
                  </span>
                </div>
                <span className={`font-mono text-h3 font-bold tabular-nums ${isInsufficientFunds ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-300"}`}>
                  {formatCurrency(totalAmount, currency)}
                </span>
              </div>

              <div className={`pt-2 border-t flex items-center justify-between text-micro font-mono ${isInsufficientFunds ? "border-red-200/60 dark:border-red-900/60 text-red-800 dark:text-red-300" : "border-emerald-200/60 dark:border-emerald-900/60 text-emerald-800/90 dark:text-emerald-300/80"}`}>
                <span>Remaining Balance After Payout:</span>
                <span className="font-semibold">
                  {formatCurrency(remainingBalance, activeAccount.currency)} {isInsufficientFunds ? "(Shortfall Alert)" : "(Sufficient Liquidity)"}
                </span>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-200 dark:border-zinc-800">
              <Button type="button" variant="outline" onClick={onClose} disabled={isExecuting}>
                Cancel
              </Button>
              <Button
                onClick={handleDisburse}
                disabled={isExecuting || isInsufficientFunds}
                className={`gap-2 text-white font-semibold shadow-sm ${isInsufficientFunds ? "bg-neutral-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-500"}`}
              >
                <CreditCard size={15} />
                <span>
                  {isExecuting
                    ? "Authorizing Bank Settlement..."
                    : isInsufficientFunds
                    ? `Insufficient Liquidity (${activeAccount.name})`
                    : `Disburse ${formatCurrency(totalAmount, currency)} via ${activeRail.badge}`}
                </span>
              </Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
