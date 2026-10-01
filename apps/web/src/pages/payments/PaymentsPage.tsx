import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { listPayments, executePayment, PaymentRow } from "../../api/payments";
import { StatusBadge } from "../../components/StatusBadge";
import { SkeletonRows } from "../../components/Skeleton";
import { EmptyState } from "../../components/EmptyState";
import { PageHeader } from "../../components/layout/PageHeader";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "../../components/ui/table";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Checkbox } from "../../components/ui/Checkbox";
import { Pagination } from "../../components/ui/Pagination";
import { Tabs } from "../../components/ui/Tabs";
import { Input } from "../../components/ui/Input";
import { useToast } from "../../components/ui/ToastContext";
import { formatCurrency, formatDate } from "../../lib/formatters";
import { Wallet, CheckCircle2, ArrowRight, Search, X, Download } from "lucide-react";
import { DisbursementModal } from "./components/DisbursementModal";

export default function PaymentsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchExecuting, setBatchExecuting] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentBanner, setPaymentBanner] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);
  const [disbursementModalState, setDisbursementModalState] = useState<{
    isOpen: boolean;
    payments: PaymentRow[];
  }>({
    isOpen: false,
    payments: [],
  });

  async function load() {
    setLoading(true);
    const res = await listPayments();
    setRows(res.data);
    setSelectedIds([]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function toggleSelectRow(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  const scheduledCount = rows.filter((r) => r.status === "SCHEDULED" || r.status === "AWAITING_SCHEDULE").length;
  const paidCount = rows.filter((r) => r.status === "PAID").length;

  const filteredRows = useMemo(() => {
    let list = rows;
    if (statusFilter === "SCHEDULED") {
      list = list.filter((r) => r.status === "SCHEDULED" || r.status === "AWAITING_SCHEDULE");
    } else if (statusFilter === "PAID") {
      list = list.filter((r) => r.status === "PAID");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return list.filter(
        (r) =>
          r.invoiceNumber.toLowerCase().includes(q) ||
          r.vendor.toLowerCase().includes(q) ||
          (r.utrNumber && r.utrNumber.toLowerCase().includes(q))
      );
    }
    return list;
  }, [rows, statusFilter, searchQuery]);

  // Pagination calculation
  const totalItems = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safePage, pageSize]);

  const schedulableOnCurrentPage = paginatedRows.filter(
    (r) => r.status === "SCHEDULED" || r.status === "AWAITING_SCHEDULE"
  );
  const isAllCurrentPageSelected =
    schedulableOnCurrentPage.length > 0 &&
    schedulableOnCurrentPage.every((r) => selectedIds.includes(r.id));
  const isSomeCurrentPageSelected =
    schedulableOnCurrentPage.some((r) => selectedIds.includes(r.id));

  // Keyboard navigation for power users (J/K to move, Space to toggle checkbox, Enter to execute)
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "j" || e.key === "J" || e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedRowIndex((prev) => {
          if (paginatedRows.length === 0) return -1;
          return prev < paginatedRows.length - 1 ? prev + 1 : prev;
        });
      } else if (e.key === "k" || e.key === "K" || e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedRowIndex((prev) => {
          if (paginatedRows.length === 0) return -1;
          return prev > 0 ? prev - 1 : 0;
        });
      } else if (e.key === " ") {
        if (focusedRowIndex >= 0 && focusedRowIndex < paginatedRows.length) {
          const row = paginatedRows[focusedRowIndex];
          if (row.status === "SCHEDULED" || row.status === "AWAITING_SCHEDULE") {
            e.preventDefault();
            toggleSelectRow(row.id);
          }
        }
      } else if (e.key === "Enter") {
        if (focusedRowIndex >= 0 && focusedRowIndex < paginatedRows.length) {
          const row = paginatedRows[focusedRowIndex];
          if (row.status === "SCHEDULED") {
            e.preventDefault();
            setDisbursementModalState({ isOpen: true, payments: [row] });
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [paginatedRows, focusedRowIndex]);

  useEffect(() => {
    setFocusedRowIndex(-1);
  }, [currentPage, searchQuery, statusFilter]);

  function toggleSelectAllCurrentPage(checked: boolean) {
    const ids = schedulableOnCurrentPage.map((r) => r.id);
    setSelectedIds((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, ...ids]));
      } else {
        return prev.filter((id) => !ids.includes(id));
      }
    });
  }

  function handleExportBankFile(format: "CSV" | "NACHA" = "CSV") {
    const listToExport = selectedIds.length > 0
      ? rows.filter((r) => selectedIds.includes(r.id))
      : filteredRows;

    if (listToExport.length === 0) {
      toast.warning("No Payments to Export", "There are no payments matching the current view to export.");
      return;
    }

    if (format === "CSV") {
      const headers = [
        "Payment ID",
        "Invoice Number",
        "Beneficiary Name",
        "Payment Amount",
        "Currency",
        "Status",
        "Due Date",
        "Clearing Date",
        "Settlement UTR",
        "Corporate Account",
      ];
      const csvRows = listToExport.map((p) => [
        `"${p.id}"`,
        `"${p.invoiceNumber}"`,
        `"${p.vendor.replace(/"/g, '""')}"`,
        p.amount,
        `"${p.currency ?? "INR"}"`,
        `"${p.status}"`,
        `"${p.dueDate ?? ""}"`,
        `"${p.clearingDate ?? ""}"`,
        `"${p.utrNumber ?? ""}"`,
        `"HDFC-CORP-98124001"`,
      ]);
      const csvContent = [headers.join(","), ...csvRows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bank_disbursement_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(
        "Bank File Exported",
        `Disbursement file for ${listToExport.length} record(s) downloaded for host-to-host corporate banking.`
      );
    }
  }

  const selectedRows = rows.filter((r) => selectedIds.includes(r.id));
  const totalBatchAmount = selectedRows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const primaryCurrency = selectedRows[0]?.currency ?? "INR";

  const activeDisbursementPayments = disbursementModalState.payments;
  const activeDisbursementAmount = activeDisbursementPayments.reduce(
    (acc, r) => acc + (Number(r.amount) || 0),
    0
  );
  const activeDisbursementCurrency = activeDisbursementPayments[0]?.currency ?? primaryCurrency;

  async function handleConfirmDisburse(_account: string, _rail: string) {
    setBatchExecuting(true);
    try {
      for (const p of disbursementModalState.payments) {
        await executePayment(p.id);
      }
      const executedIds = new Set(disbursementModalState.payments.map((p) => p.id));
      setSelectedIds((prev) => prev.filter((id) => !executedIds.has(id)));
      await load();
      toast.success(
        "Disbursement Settled",
        `Direct banking disbursement completed for ${disbursementModalState.payments.length} invoice(s). Ledgers updated to PAID.`
      );
      setPaymentBanner({
        type: "success",
        title: "Disbursement Finalized & Settled",
        message: `Direct banking disbursement completed for ${disbursementModalState.payments.length} invoice(s). Ledgers updated to PAID.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Electronic disbursement failed.";
      toast.error("Disbursement Failed", msg);
      setPaymentBanner({
        type: "error",
        title: "Disbursement Execution Failed",
        message: msg,
      });
    } finally {
      setBatchExecuting(false);
    }
  }

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Payments & Disbursements"
        subtitle="Schedule batches, monitor payment horizons, and execute electronic bank disbursements."
        action={
          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-300 text-micro border border-neutral-200/80 dark:border-zinc-700/80 font-medium">
              <span>Navigate:</span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white dark:bg-zinc-700 border border-neutral-200 dark:border-zinc-600 font-semibold shadow-2xs">
                J
              </kbd>
              <span>/</span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white dark:bg-zinc-700 border border-neutral-200 dark:border-zinc-600 font-semibold shadow-2xs">
                K
              </kbd>
              <span>•</span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white dark:bg-zinc-700 border border-neutral-200 dark:border-zinc-600 font-semibold shadow-2xs">
                Space
              </kbd>
              <span>select</span>
            </span>
            <Button
              variant="outline"
              onClick={() => handleExportBankFile("CSV")}
              disabled={filteredRows.length === 0}
              className="gap-2"
            >
              <Download size={14} />
              <span>Export Bank File</span>
            </Button>
          </div>
        }
      />

      {paymentBanner && (
        <div className="mb-4">
          <div
            className={`p-4 rounded-lg border ${
              paymentBanner.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100"
                : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100"
            }`}
          >
            <h4 className="font-semibold text-body-sm">{paymentBanner.title}</h4>
            <p className="text-caption mt-0.5">{paymentBanner.message}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs
          tabs={[
            { id: "ALL", label: `All Payments (${rows.length})`, content: null },
            { id: "SCHEDULED", label: `Scheduled (${scheduledCount})`, content: null },
            { id: "PAID", label: `Paid / Cleared (${paidCount})`, content: null },
          ]}
          defaultTabId={statusFilter}
          variant="pill"
          onChange={(tabId) => {
            setStatusFilter(tabId);
            setCurrentPage(1);
          }}
        />

        <div className="relative w-full sm:w-72">
          <Input
            id="payments-search-filter"
            name="searchQuery"
            autoComplete="off"
            aria-label="Filter payments by invoice number, vendor, or UTR"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Filter payments by #, vendor, UTR..."
            leftIcon={<Search size={14} className="text-neutral-400" />}
            rightIcon={
              searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-200"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              ) : undefined
            }
          />
        </div>
      </div>

      <Card level="surface" className="overflow-hidden">
        {loading ? (
          <div className="p-4">
            <SkeletonRows count={5} />
          </div>
        ) : filteredRows.length === 0 ? (
          <EmptyState
            title={
              searchQuery || statusFilter !== "ALL"
                ? "No payments match your criteria."
                : "No payments pending."
            }
            description={
              searchQuery
                ? `No payments found matching "${searchQuery}".`
                : statusFilter !== "ALL"
                  ? "No payments found in this category."
                  : "All approved invoices have been processed and disbursed."
            }
            action={
              searchQuery || statusFilter !== "ALL"
                ? {
                    label: "Clear Filters",
                    onClick: () => {
                      setSearchQuery("");
                      setStatusFilter("ALL");
                      setCurrentPage(1);
                    },
                  }
                : undefined
            }
          />
        ) : (
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 px-3">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={isAllCurrentPageSelected}
                        indeterminate={isSomeCurrentPageSelected && !isAllCurrentPageSelected}
                        onCheckedChange={toggleSelectAllCurrentPage}
                        disabled={schedulableOnCurrentPage.length === 0}
                        aria-label="Select all scheduled payments on this page"
                      />
                    </div>
                  </TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scheduled Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.map((p, idx) => {
                  const canSelect = p.status === "SCHEDULED" || p.status === "AWAITING_SCHEDULE";
                  const isSelected = selectedIds.includes(p.id);
                  const isFocused = focusedRowIndex === idx;

                  return (
                    <TableRow
                      key={p.id}
                      onClick={() => setFocusedRowIndex(idx)}
                      className={`${isSelected ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""} ${
                        isFocused ? "ring-2 ring-indigo-500/50 ring-inset" : ""
                      }`}
                    >
                      <TableCell className="w-10 px-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center">
                          {canSelect ? (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectRow(p.id)}
                              aria-label={`Select payment for invoice ${p.invoiceNumber}`}
                            />
                          ) : (
                            <span className="text-neutral-300 dark:text-zinc-700 select-none">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        <Link
                          to={`/invoices/${p.invoiceId}`}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {p.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-neutral-800 dark:text-zinc-200 font-medium">
                        {p.vendor}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-neutral-900 dark:text-zinc-100 font-semibold">
                        {formatCurrency(p.amount, p.currency ?? "INR")}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <StatusBadge status={p.status} />
                          {p.utrNumber && (
                            <div className="flex items-center gap-1 text-micro font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/60 w-fit">
                              <span>UTR:</span>
                              <span className="font-semibold">{p.utrNumber}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-neutral-500 dark:text-zinc-400 font-mono text-micro">
                        {p.clearingDate ? (
                          <div>
                            <span>{formatDate(p.clearingDate)}</span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-sans font-medium">Cleared</span>
                          </div>
                        ) : (
                          formatDate(p.dueDate)
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.status === "SCHEDULED" ? (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => setDisbursementModalState({ isOpen: true, payments: [p] })}
                            disabled={batchExecuting}
                            className="h-7 text-caption shadow-xs"
                          >
                            Execute
                          </Button>
                        ) : p.status === "PAID" ? (
                          <span className="inline-flex items-center gap-1 text-micro text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 size={13} />
                            <span>Disbursed</span>
                          </span>
                        ) : (
                          <span className="text-micro text-neutral-400 font-mono">
                            {p.status}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              pageSizeOptions={[10, 25, 50]}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </Card>

      {/* Sticky Bottom Batch Calculation Strip */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-neutral-900/95 dark:bg-zinc-800/95 text-white backdrop-blur-md px-5 py-3 rounded-xl shadow-2xl border border-neutral-700/60 dark:border-zinc-700 flex items-center gap-6 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-emerald-400" />
            <span className="text-body-sm font-medium">
              Selected: <span className="font-bold text-white">{selectedIds.length} invoices</span>
            </span>
          </div>

          <div className="h-4 w-px bg-neutral-700 dark:bg-zinc-600" />

          <div className="text-body-sm">
            <span className="text-neutral-400 mr-1.5">Total Batch Disbursement:</span>
            <span className="font-mono font-bold text-emerald-400 tabular-nums">
              {formatCurrency(totalBatchAmount, primaryCurrency)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExportBankFile("CSV")}
              className="border-neutral-600 bg-neutral-800 hover:bg-neutral-700 text-white gap-1.5"
            >
              <Download size={13} />
              <span>Export Batch</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setDisbursementModalState({ isOpen: true, payments: selectedRows })}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1.5 ml-1"
            >
              <span>Release Batch Disbursement</span>
              <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Banking Disbursement Modal — Handles both Single & Batch Releases */}
      <DisbursementModal
        isOpen={disbursementModalState.isOpen}
        onClose={() => setDisbursementModalState({ isOpen: false, payments: [] })}
        selectedPayments={activeDisbursementPayments}
        totalAmount={activeDisbursementAmount}
        currency={activeDisbursementCurrency}
        onConfirmDisburse={handleConfirmDisburse}
        isExecuting={batchExecuting}
      />
    </div>
  );
}
