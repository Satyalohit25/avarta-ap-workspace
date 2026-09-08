import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Search,
  X,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CalendarCheck,
  Archive,
  CheckSquare,
  Loader2,
} from "lucide-react";
import { InvoiceListItem, listInvoices, transitionInvoice } from "../../api/invoices";
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
import { Tabs } from "../../components/ui/Tabs";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Checkbox } from "../../components/ui/Checkbox";
import { Pagination } from "../../components/ui/Pagination";
import { useToast } from "../../components/ui/ToastContext";
import { FilterTokenBar, FilterToken } from "../../components/ui/FilterTokenBar";
import { formatCurrency, formatDate } from "../../lib/formatters";

type SortField = "invoiceNumber" | "vendor" | "amount" | "dueDate" | "invoiceDate";
type SortOrder = "asc" | "desc";

export default function InvoicesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") ?? undefined;
  const initialSearch = searchParams.get("search") ?? "";
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [allInvoices, setAllInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sortField, setSortField] = useState<SortField>("dueDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Selection & Pagination State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [isBulkOperating, setIsBulkOperating] = useState<boolean>(false);

  // Keep search query synced with URL search param
  useEffect(() => {
    const s = searchParams.get("search") ?? "";
    if (s !== searchQuery) {
      setSearchQuery(s);
    }
  }, [searchParams]);

  function handleSearchChange(q: string) {
    setSearchQuery(q);
    setCurrentPage(1);
    const nextParams = new URLSearchParams(searchParams);
    if (q.trim()) {
      nextParams.set("search", q.trim());
    } else {
      nextParams.delete("search");
    }
    setSearchParams(nextParams, { replace: true });
  }

  function handleTabChange(tabId: string) {
    setCurrentPage(1);
    setSelectedIds(new Set());
    const nextParams = new URLSearchParams(searchParams);
    if (tabId) {
      nextParams.set("status", tabId);
    } else {
      nextParams.delete("status");
    }
    setSearchParams(nextParams);
  }

  const loadData = () => {
    setLoading(true);
    listInvoices({ status })
      .then((res) => setInvoices(res.data))
      .finally(() => setLoading(false));

    listInvoices()
      .then((res) => setAllInvoices(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, [status]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  }

  function renderSortIcon(field: SortField) {
    if (sortField !== field) {
      return <ArrowUpDown size={12} className="opacity-40 ml-1 inline" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp size={12} className="text-indigo-600 dark:text-indigo-400 ml-1 inline" />
    ) : (
      <ArrowDown size={12} className="text-indigo-600 dark:text-indigo-400 ml-1 inline" />
    );
  }

  const counts = useMemo(() => {
    return {
      all: allInvoices.length,
      processing: allInvoices.filter((i) => i.status === "PROCESSING" || i.status === "RECEIVED").length,
      exception: allInvoices.filter((i) => i.status === "EXCEPTION" || i.openExceptionCount > 0).length,
      pending_approval: allInvoices.filter((i) => i.status === "PENDING_APPROVAL" || i.status === "WAITING_APPROVAL").length,
      scheduled: allInvoices.filter((i) => i.status === "SCHEDULED" || i.status === "APPROVED").length,
      paid: allInvoices.filter((i) => i.status === "PAID" || i.status === "SYNCED").length,
    };
  }, [allInvoices]);

  const filteredAndSortedInvoices = useMemo(() => {
    let list = invoices;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (i) =>
          i.invoiceNumber.toLowerCase().includes(q) ||
          (i.supplier?.name && i.supplier.name.toLowerCase().includes(q)) ||
          ((i as unknown as { purchaseOrderId?: string }).purchaseOrderId &&
            (i as unknown as { purchaseOrderId?: string }).purchaseOrderId?.toLowerCase().includes(q)),
      );
    }

    return [...list].sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";

      if (sortField === "amount") {
        valA = Number(a.totalAmount) || 0;
        valB = Number(b.totalAmount) || 0;
      } else if (sortField === "vendor") {
        valA = a.supplier?.name ?? "";
        valB = b.supplier?.name ?? "";
      } else if (sortField === "invoiceNumber") {
        valA = a.invoiceNumber ?? "";
        valB = b.invoiceNumber ?? "";
      } else if (sortField === "dueDate") {
        valA = a.dueDate ?? "";
        valB = b.dueDate ?? "";
      } else if (sortField === "invoiceDate") {
        valA = a.invoiceDate ?? "";
        valB = b.invoiceDate ?? "";
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [invoices, searchQuery, sortField, sortOrder]);

  // Pagination slicing
  const totalItems = filteredAndSortedInvoices.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedInvoices = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredAndSortedInvoices.slice(start, start + pageSize);
  }, [filteredAndSortedInvoices, safePage, pageSize]);

  // Selection helpers
  const currentPageIds = paginatedInvoices.map((inv) => inv.id);
  const isAllCurrentPageSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.has(id));
  const isSomeCurrentPageSelected =
    currentPageIds.some((id) => selectedIds.has(id));

  function handleSelectAllCurrentPage(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        currentPageIds.forEach((id) => next.add(id));
      } else {
        currentPageIds.forEach((id) => next.delete(id));
      }
      return next;
    });
  }

  function handleToggleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function handleClearSelection() {
    setSelectedIds(new Set());
  }

  function handleExportCsv(subset?: InvoiceListItem[]) {
    const listToExport = subset ?? (selectedIds.size > 0
      ? filteredAndSortedInvoices.filter((i) => selectedIds.has(i.id))
      : filteredAndSortedInvoices);

    if (listToExport.length === 0) return;

    const headers = ["Invoice Number", "Vendor", "Invoice Date", "Due Date", "Amount", "Currency", "Status", "Exceptions"];
    const rows = listToExport.map((i) => [
      i.invoiceNumber,
      `"${i.supplier?.name ?? "Unknown"}"`,
      i.invoiceDate ?? "",
      i.dueDate ?? "",
      i.totalAmount,
      i.currency,
      i.status,
      i.openExceptionCount,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Avarta_Invoices_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(
      "CSV Export Downloaded",
      `Exported ${listToExport.length} invoice${listToExport.length === 1 ? "" : "s"} successfully.`,
    );
  }

  // Bulk Operations
  async function handleBulkSchedule() {
    const selectedList = filteredAndSortedInvoices.filter((i) => selectedIds.has(i.id));
    if (selectedList.length === 0) return;

    setIsBulkOperating(true);
    let successCount = 0;
    let failCount = 0;

    for (const inv of selectedList) {
      try {
        await transitionInvoice(inv.id, "SCHEDULE");
        successCount++;
      } catch {
        failCount++;
      }
    }

    setIsBulkOperating(false);
    handleClearSelection();
    loadData();

    if (successCount > 0) {
      toast.success(
        "Bulk Scheduling Executed",
        `${successCount} invoice${successCount === 1 ? "" : "s"} transitioned to Scheduled.${failCount > 0 ? ` (${failCount} skipped due to workflow rules)` : ""}`,
      );
    } else {
      toast.warning(
        "No Invoices Scheduled",
        "Selected invoices may not be in an approved state ready for scheduling.",
      );
    }
  }

  async function handleBulkArchive() {
    const selectedList = filteredAndSortedInvoices.filter((i) => selectedIds.has(i.id));
    if (selectedList.length === 0) return;

    setIsBulkOperating(true);
    let successCount = 0;
    let failCount = 0;

    for (const inv of selectedList) {
      try {
        await transitionInvoice(inv.id, "ARCHIVE");
        successCount++;
      } catch {
        failCount++;
      }
    }

    setIsBulkOperating(false);
    handleClearSelection();
    loadData();

    if (successCount > 0) {
      toast.success(
        "Bulk Archive Executed",
        `${successCount} invoice${successCount === 1 ? "" : "s"} archived to historical records.`,
      );
    } else {
      toast.warning(
        "No Invoices Archived",
        "Selected invoices cannot be archived in their current workflow state.",
      );
    }
  }

  const tabs = [
    { id: "", label: `All Invoices (${counts.all || allInvoices.length})`, content: null },
    { id: "PROCESSING", label: `Processing (${counts.processing})`, content: null },
    { id: "EXCEPTION", label: `Exceptions (${counts.exception})`, content: null },
    { id: "PENDING_APPROVAL", label: `Waiting Approval (${counts.pending_approval})`, content: null },
    { id: "SCHEDULED", label: `Scheduled (${counts.scheduled})`, content: null },
    { id: "PAID", label: `Paid (${counts.paid})`, content: null },
  ];

  const activeFilterTokens = useMemo<FilterToken[]>(() => {
    const tokens: FilterToken[] = [];
    if (status) {
      const activeTab = tabs.find((t) => t.id === status);
      tokens.push({
        id: "filter-status",
        category: "Status",
        label: activeTab?.label.split(" (")[0] ?? status,
        onRemove: () => handleTabChange(""),
      });
    }
    if (searchQuery.trim()) {
      tokens.push({
        id: "filter-search",
        category: "Search",
        label: `"${searchQuery.trim()}"`,
        onRemove: () => handleSearchChange(""),
      });
    }
    return tokens;
  }, [status, searchQuery, tabs]);

  const handleClearAllFilters = () => {
    handleTabChange("");
    handleSearchChange("");
  };

  return (
    <main className="space-y-6 relative pb-16">
      <PageHeader
        title="Invoices"
        subtitle="All active, processing, and settled accounts payable invoices."
        action={
          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-300 text-micro border border-neutral-200/80 dark:border-zinc-700/80 font-medium">
              <span>Review hotkeys:</span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white dark:bg-zinc-700 border border-neutral-200 dark:border-zinc-600 font-semibold shadow-2xs">J</kbd>
              <span>Next</span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white dark:bg-zinc-700 border border-neutral-200 dark:border-zinc-600 font-semibold shadow-2xs">K</kbd>
              <span>Prev</span>
            </span>
            <Button
              variant="outline"
              onClick={() => handleExportCsv()}
              disabled={filteredAndSortedInvoices.length === 0}
              className="gap-2"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </Button>
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs
          tabs={tabs}
          defaultTabId={status ?? ""}
          variant="pill"
          onChange={handleTabChange}
        />

        <div className="relative w-full sm:w-72">
          <Input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Filter by invoice # or vendor..."
            leftIcon={<Search size={14} className="text-neutral-400" />}
            rightIcon={
              searchQuery ? (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-200"
                >
                  <X size={14} />
                </button>
              ) : undefined
            }
          />
        </div>
      </div>

      {/* Astryx-inspired Filter Token Bar */}
      <FilterTokenBar
        tokens={activeFilterTokens}
        onClearAll={handleClearAllFilters}
        count={filteredAndSortedInvoices.length}
      />

      {/* Floating Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div
          role="region"
          aria-label="Bulk actions toolbar"
          className="sticky top-4 z-30 flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-neutral-900 dark:bg-zinc-800 text-white shadow-xl border border-neutral-800 dark:border-zinc-700 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-600 text-white font-mono text-caption font-semibold">
              <CheckSquare size={13} />
              <span>{selectedIds.size} selected</span>
            </span>
            <span className="text-caption text-neutral-300 hidden sm:inline">
              Apply actions across selected invoices
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleBulkSchedule}
              disabled={isBulkOperating}
              isLoading={isBulkOperating}
              className="gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700"
            >
              <CalendarCheck size={13} className="text-emerald-400" />
              <span>Bulk Schedule</span>
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={handleBulkArchive}
              disabled={isBulkOperating}
              isLoading={isBulkOperating}
              className="gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700"
            >
              <Archive size={13} className="text-amber-400" />
              <span>Bulk Archive</span>
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleExportCsv()}
              disabled={isBulkOperating}
              className="gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </Button>

            <button
              type="button"
              onClick={handleClearSelection}
              disabled={isBulkOperating}
              className="px-2.5 py-1 text-caption text-neutral-400 hover:text-white transition-colors"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      <Card level="surface" className="overflow-hidden">
        {loading ? (
          <div className="p-4">
            <SkeletonRows />
          </div>
        ) : filteredAndSortedInvoices.length === 0 ? (
          <EmptyState
            title="No invoices match your criteria."
            description={
              searchQuery
                ? `No invoices found matching "${searchQuery}".`
                : "Upload your first invoice to get started."
            }
            action={
              searchQuery || status
                ? {
                    label: "Clear Filters",
                    onClick: () => {
                      handleSearchChange("");
                      handleTabChange("");
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
                        onCheckedChange={handleSelectAllCurrentPage}
                        aria-label="Select all invoices on this page"
                      />
                    </div>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort("invoiceNumber")}
                    className="cursor-pointer select-none"
                  >
                    <span>Invoice #</span>
                    {renderSortIcon("invoiceNumber")}
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort("vendor")}
                    className="cursor-pointer select-none"
                  >
                    <span>Vendor</span>
                    {renderSortIcon("vendor")}
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort("invoiceDate")}
                    className="cursor-pointer select-none"
                  >
                    <span>Invoice Date</span>
                    {renderSortIcon("invoiceDate")}
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort("dueDate")}
                    className="cursor-pointer select-none"
                  >
                    <span>Due Date</span>
                    {renderSortIcon("dueDate")}
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort("amount")}
                    className="text-right cursor-pointer select-none"
                  >
                    <span>Amount</span>
                    {renderSortIcon("amount")}
                  </TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInvoices.map((inv) => {
                  const isSelected = selectedIds.has(inv.id);

                  return (
                    <TableRow
                      key={inv.id}
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                      className={`cursor-pointer transition-colors group ${
                        isSelected
                          ? "bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40"
                          : "hover:bg-neutral-50/80 dark:hover:bg-zinc-800/60"
                      }`}
                    >
                      <TableCell
                        className="w-10 px-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleToggleSelect(inv.id, checked)}
                            aria-label={`Select invoice ${inv.invoiceNumber}`}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        <Link
                          to={`/invoices/${inv.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-indigo-600 dark:text-indigo-400 group-hover:underline"
                        >
                          {inv.invoiceNumber}
                        </Link>
                        {inv.openExceptionCount > 0 && (
                          <span className="ml-2 inline-flex items-center gap-1 text-micro text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded-full border border-rose-500/20 font-sans font-medium">
                            <AlertTriangle
                              size={12}
                              strokeWidth={1.75}
                              className="shrink-0"
                            />
                            <span>
                              {inv.openExceptionCount} exception
                              {inv.openExceptionCount > 1 ? "s" : ""}
                            </span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-neutral-800 dark:text-zinc-200 font-medium">
                        {inv.supplier?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-neutral-500 dark:text-zinc-400 font-mono text-micro">
                        {formatDate(inv.invoiceDate)}
                      </TableCell>
                      <TableCell className="text-neutral-500 dark:text-zinc-400 font-mono text-micro">
                        {formatDate(inv.dueDate)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-neutral-900 dark:text-zinc-100 font-semibold">
                        {formatCurrency(inv.totalAmount, inv.currency)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={inv.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Accessible Pagination Footer */}
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
    </main>
  );
}
