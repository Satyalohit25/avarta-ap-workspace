import { useEffect, useState, FormEvent, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  Search,
  X,
  Plus,
  Minus,
  Building2,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Layers,
  ArrowRight,
  Clock,
  BarChart3,
} from "lucide-react";
import {
  createPurchaseOrder,
  listPurchaseOrders,
  getPurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderDetail,
  PoLineItem,
} from "../../api/purchaseOrders";
import { listSuppliers, SupplierListItem } from "../../api/suppliers";
import { getPoEnrichment } from "./poEnrichment";
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
import { Dialog } from "../../components/ui/Dialog";
import { Sheet } from "../../components/ui/Sheet";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Tabs } from "../../components/ui/Tabs";
import { Alert } from "../../components/ui/Alert";
import { Pagination } from "../../components/ui/Pagination";
import { useToast } from "../../components/ui/ToastContext";
import { MetricStrip, MetricItem } from "../../components/ui/MetricStrip";
import { formatCurrency, formatDate } from "../../lib/formatters";

const INITIAL_LINE_ITEMS: PoLineItem[] = [
  {
    id: "po-line-1",
    itemNumber: 1,
    description: "",
    hsnSac: "",
    quantity: 1,
    unitOfMeasure: "Pcs",
    unitPrice: 0,
    lineTotal: 0,
  },
];

export default function PurchaseOrdersPage() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const initialStatus = searchParams.get("status") || "";

  const [orders, setOrders] = useState<PurchaseOrderItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [matchingFilter, setMatchingFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Detail Sheet State
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [selectedPoDetail, setSelectedPoDetail] = useState<PurchaseOrderDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [poNumber, setPoNumber] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [issueDate, setIssueDate] = useState("");
  // Extended PO fields
  const [poType, setPoType] = useState("Standard Purchase Order");
  const [costCenter, setCostCenter] = useState("CC-104 Plant Operations Pune");
  const [deliveryLocation, setDeliveryLocation] = useState("Warehouse WH-1 (Chakan Industrial Zone, Pune)");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [matchingTolerance, setMatchingTolerance] = useState("Standard Commercial (2.5% Tolerance)");
  const [paymentTerms, setPaymentTerms] = useState("Net 30 Days");
  const [poNotes, setPoNotes] = useState("");

  // PO Line Items state
  const [lineItems, setLineItems] = useState<PoLineItem[]>(INITIAL_LINE_ITEMS);

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      {
        id: `po-line-${prev.length + 1}-${Date.now()}`,
        itemNumber: prev.length + 1,
        description: "",
        hsnSac: "",
        quantity: 1,
        unitOfMeasure: "Pcs",
        unitPrice: 0,
        lineTotal: 0,
      },
    ]);
  }

  function removeLineItem(id: string) {
    setLineItems((prev) => prev.filter((l) => l.id !== id).map((l, i) => ({ ...l, itemNumber: i + 1 })));
  }

  function updateLineItem(id: string, field: keyof PoLineItem, value: string | number) {
    setLineItems((prev) => prev.map((l) => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        updated.lineTotal = Math.round(Number(updated.quantity) * Number(updated.unitPrice) * 100) / 100;
      }
      return updated;
    }));
  }

  const poSubtotal = useMemo(() => lineItems.reduce((acc, l) => acc + (Number(l.lineTotal) || 0), 0), [lineItems]);
  const poTaxAmount = useMemo(() => Math.round(poSubtotal * 0.18 * 100) / 100, [poSubtotal]);
  const poTotalAmount = useMemo(() => Math.round((poSubtotal + poTaxAmount) * 100) / 100, [poSubtotal, poTaxAmount]);

  function resetPoForm() {
    setPoNumber(""); setSupplierId(""); setCurrency("INR");
    setIssueDate(new Date().toISOString().slice(0, 10));
    setPoType("Standard Purchase Order"); setCostCenter("CC-104 Plant Operations Pune");
    setDeliveryLocation("Warehouse WH-1 (Chakan Industrial Zone, Pune)");
    setExpectedDeliveryDate(""); setMatchingTolerance("Standard Commercial (2.5% Tolerance)");
    setPaymentTerms("Net 30 Days"); setPoNotes("");
    setLineItems(INITIAL_LINE_ITEMS);
    setFormError(null);
  }

  function fetchOrders() {
    setLoading(true);
    listPurchaseOrders()
      .then((res) => setOrders(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchOrders();
    listSuppliers().then((res) => setSuppliers(res.data));
    setIssueDate(new Date().toISOString().slice(0, 10));
  }, []);

  // Sync search query from URL if user navigates or opens link directly
  useEffect(() => {
    const urlQuery = searchParams.get("search") || "";
    setSearchQuery((prev) => (prev !== urlQuery ? urlQuery : prev));
    const urlStat = searchParams.get("status") || "";
    setStatusFilter((prev) => (prev !== urlStat ? urlStat : prev));
  }, [searchParams]);

  // Load PO Detail when selected
  useEffect(() => {
    if (!selectedPoId) {
      setSelectedPoDetail(null);
      return;
    }
    setLoadingDetail(true);
    getPurchaseOrder(selectedPoId)
      .then((res) => setSelectedPoDetail(res.data))
      .catch(() => setSelectedPoDetail(null))
      .finally(() => setLoadingDetail(false));
  }, [selectedPoId]);


  function handleSearchChange(query: string) {
    setSearchQuery(query);
    setCurrentPage(1);
    const nextParams = new URLSearchParams(searchParams);
    if (query.trim()) {
      nextParams.set("search", query.trim());
    } else {
      nextParams.delete("search");
    }
    setSearchParams(nextParams, { replace: true });
  }

  function handleStatusTabChange(tabId: string) {
    setStatusFilter(tabId);
    setCurrentPage(1);
    const nextParams = new URLSearchParams(searchParams);
    if (tabId) {
      nextParams.set("status", tabId);
    } else {
      nextParams.delete("status");
    }
    setSearchParams(nextParams, { replace: true });
  }

  async function handleCreatePo(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!supplierId || !poNumber.trim()) {
      setFormError("Supplier and PO Number are required.");
      return;
    }
    const hasValidLines = lineItems.some((l) => l.description.trim() && Number(l.quantity) > 0 && Number(l.unitPrice) > 0);
    if (!hasValidLines) {
      setFormError("Add at least one valid line item with description, quantity, and unit price.");
      return;
    }

    const finalTotal = poTotalAmount;
    if (finalTotal <= 0) {
      setFormError("Total commitment amount must be greater than zero.");
      return;
    }

    setSubmitting(true);
    try {
      await createPurchaseOrder({
        supplierId,
        poNumber: poNumber.trim(),
        totalAmount: finalTotal,
        currency,
        issueDate,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        poType,
        costCenter,
        deliveryLocation,
        matchingTolerance,
        paymentTerms,
        lineItems,
        notes: poNotes || undefined,
      });
      toast.success(
        "Purchase Order Created",
        `${poNumber.trim()} committed for ${formatCurrency(finalTotal, currency)} across ${lineItems.length} line items.`,
      );
      setShowCreateModal(false);
      resetPoForm();
      fetchOrders();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to create Purchase Order.";
      toast.error("PO Creation Failed", errMsg);
      setFormError(errMsg);
    } finally {
      setSubmitting(false);
    }
  }

  // Macro AP Metrics calculation
  const metrics = useMemo(() => {
    let totalCommitted = 0;
    let totalUtilized = 0;
    let totalRemaining = 0;
    let openCount = 0;
    let discrepancyCount = 0;

    for (const po of orders) {
      const tot = Number(po.totalAmount) || 0;
      const uti = Number(po.utilizedAmount) || 0;
      const rem = Number(po.remainingAmount) || 0;
      totalCommitted += tot;
      totalUtilized += uti;
      totalRemaining += rem;

      if (po.status === "OPEN") openCount++;
      if (po.matchingStatus === "PARTIAL" || po.matchingStatus === "UNMATCHED") {
        discrepancyCount++;
      }
    }

    const utilPct = totalCommitted > 0 ? (totalUtilized / totalCommitted) * 100 : 0;
    const defaultCurrency = orders[0]?.currency || "INR";

    return {
      totalCommitted,
      totalUtilized,
      totalRemaining,
      utilPct,
      openCount,
      discrepancyCount,
      defaultCurrency,
    };
  }, [orders]);

  const metricStripItems: MetricItem[] = [
    {
      id: "po-committed",
      label: "Total Committed",
      value: formatCurrency(metrics.totalCommitted, metrics.defaultCurrency),
      icon: <CreditCard size={15} />,
      isPrimaryValue: true,
    },
    {
      id: "po-utilized",
      label: "Invoiced & Utilized",
      value: (
        <div className="space-y-0.5">
          <span className="text-xl font-semibold font-mono tabular-nums text-neutral-900 dark:text-zinc-50 block">
            {formatCurrency(metrics.totalUtilized, metrics.defaultCurrency)}
          </span>
          <span className="text-micro font-mono text-neutral-500 dark:text-zinc-400">
            {metrics.utilPct.toFixed(1)}% drawn down
          </span>
        </div>
      ),
      icon: <Layers size={15} />,
    },
    {
      id: "po-remaining",
      label: "Remaining Available",
      value: (
        <div className="space-y-0.5">
          <span className="text-xl font-semibold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 block">
            {formatCurrency(metrics.totalRemaining, metrics.defaultCurrency)}
          </span>
          <span className="text-micro font-mono text-neutral-500 dark:text-zinc-400">
            Available for matching
          </span>
        </div>
      ),
      icon: <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />,
    },
    {
      id: "po-open",
      label: "Active Commitments",
      value: (
        <div className="space-y-0.5">
          <span className="text-xl font-semibold font-mono tabular-nums text-neutral-900 dark:text-zinc-50 block">
            {metrics.openCount} Open POs
          </span>
          <span className="text-micro font-mono text-amber-700 dark:text-amber-400">
            {metrics.discrepancyCount} with line variances
          </span>
        </div>
      ),
      icon: <FileText size={15} />,
    },
  ];

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((po) => {
      // Status filter
      if (statusFilter && po.status !== statusFilter) {
        return false;
      }
      // Matching status filter
      if (matchingFilter !== "ALL" && po.matchingStatus !== matchingFilter) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchPo = po.poNumber.toLowerCase().includes(q);
        const matchVendor = po.vendor.toLowerCase().includes(q);
        if (!matchPo && !matchVendor) return false;
      }
      return true;
    });
  }, [orders, statusFilter, matchingFilter, searchQuery]);

  const tabs = [
    { id: "", label: `All Orders (${orders.length})`, content: null },
    {
      id: "OPEN",
      label: `Open (${orders.filter((o) => o.status === "OPEN").length})`,
      content: null,
    },
    {
      id: "CLOSED",
      label: `Closed (${orders.filter((o) => o.status === "CLOSED").length})`,
      content: null,
    },
  ];

  const totalItems = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedOrders = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, safePage, pageSize]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Purchase Orders"
        subtitle="Manage committed purchase orders, 2-way/3-way invoice matching tolerances, and drawdown balances."
        action={
          <Button onClick={() => setShowCreateModal(true)} className="gap-1.5">
            <Plus size={15} />
            <span>Create Purchase Order</span>
          </Button>
        }
      />

      {/* KPI Overview */}
      <MetricStrip items={metricStripItems} />

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs
          tabs={tabs}
          defaultTabId={statusFilter}
          variant="pill"
          onChange={handleStatusTabChange}
        />

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Matching Status Dropdown */}
          <div className="w-40 shrink-0">
            <Select
              name="matchingStatusFilter"
              value={matchingFilter}
              onValueChange={setMatchingFilter}
              options={[
                { value: "ALL", label: "All Matching" },
                { value: "MATCHED", label: "Matched" },
                { value: "PARTIAL", label: "Partial" },
                { value: "UNMATCHED", label: "Unmatched" },
              ]}
            />
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search PO # or supplier..."
              className="pr-8"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-200"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            ) : (
              <Search
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
              />
            )}
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <Card level="surface" className="overflow-hidden">
        {loading ? (
          <div className="p-4">
            <SkeletonRows count={5} />
          </div>
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            title={searchQuery || statusFilter ? "No matching purchase orders found." : "No purchase orders found."}
            description={
              searchQuery || statusFilter
                ? "Try clearing your search query or adjusting your filters."
                : "Create your first PO to start matching incoming invoices."
            }
            action={
              searchQuery || statusFilter
                ? {
                    label: "Clear Filters",
                    onClick: () => {
                      handleSearchChange("");
                      handleStatusTabChange("");
                      setMatchingFilter("ALL");
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
                <TableHead>PO Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Utilized</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead>Matching</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Invoices</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.map((po) => (
                <TableRow
                  key={po.id}
                  onClick={() => setSelectedPoId(po.id)}
                  className="cursor-pointer hover:bg-neutral-50/80 dark:hover:bg-zinc-800/60 transition-colors"
                >
                  <TableCell className="font-mono font-medium text-neutral-900 dark:text-zinc-100">
                    <span className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-semibold">
                      <span>{po.poNumber}</span>
                      <ArrowUpRight size={12} className="text-neutral-400" />
                    </span>
                  </TableCell>
                  <TableCell className="text-neutral-700 dark:text-zinc-200 font-medium">
                    <Link
                      to={`/suppliers?search=${encodeURIComponent(po.vendor)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                      title={`View ${po.vendor} in supplier directory`}
                    >
                      {po.vendor}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-mono text-neutral-800 dark:text-zinc-200">
                    {formatCurrency(po.totalAmount, po.currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-mono text-neutral-600 dark:text-zinc-400">
                    {formatCurrency(po.utilizedAmount, po.currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-mono text-neutral-900 dark:text-zinc-100 font-semibold">
                    {formatCurrency(po.remainingAmount, po.currency)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={po.matchingStatus} size="sm" />
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={po.status}
                      variant={po.status === "OPEN" ? "info" : po.status === "CLOSED" ? "success" : "neutral"}
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono text-micro tabular-nums text-neutral-500 dark:text-zinc-400">
                    {po.linkedInvoicesCount} {po.linkedInvoicesCount === 1 ? "inv" : "invs"}
                  </TableCell>
                </TableRow>
              ))}
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

      {/* PO Detail Inspection Slide-over Sheet */}
      <Sheet
        isOpen={!!selectedPoId}
        onClose={() => setSelectedPoId(null)}
        title={selectedPoDetail?.poNumber ?? "Purchase Order"}
        subtitle="Purchase order commitments, drawdown utilization, and reconciled invoices"
        width="w-full sm:max-w-xl"
      >
        {loadingDetail ? (
          <div className="p-6">
            <SkeletonRows count={4} />
          </div>
        ) : selectedPoDetail ? (
          <div className="p-6 space-y-6">
            {/* Header badges */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-neutral-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedPoDetail.status} />
                <StatusBadge status={selectedPoDetail.matchingStatus} size="sm" />
              </div>
              <span className="text-micro font-mono text-neutral-500 dark:text-zinc-400">
                Created {formatDate(selectedPoDetail.createdAt)}
              </span>
            </div>

            {/* Vendor info card */}
            <div className="p-4 rounded-lg bg-neutral-50 dark:bg-zinc-800/60 border border-neutral-200 dark:border-zinc-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-micro font-semibold uppercase tracking-wider text-neutral-500 dark:text-zinc-400">
                  Vendor Particulars
                </span>
                <Link
                  to={`/suppliers?search=${encodeURIComponent(selectedPoDetail.vendor)}`}
                  className="text-micro text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-medium"
                >
                  <span>Open Supplier</span>
                  <ExternalLink size={11} />
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-neutral-400" />
                <span className="font-semibold text-neutral-900 dark:text-zinc-100 text-body">
                  {selectedPoDetail.vendor}
                </span>
              </div>
            </div>

            {/* Budget & Drawdown Utilization */}
            <div className="space-y-3">
              <span className="text-micro font-semibold uppercase tracking-wider text-neutral-500 dark:text-zinc-400 block">
                Financial Drawdown Progress
              </span>
              <div className="p-4 rounded-lg border border-neutral-200 dark:border-zinc-800 space-y-3 bg-white dark:bg-zinc-900">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-micro text-neutral-500 dark:text-zinc-400 block">Total Committed</span>
                    <span className="text-body font-mono font-semibold tabular-nums text-neutral-900 dark:text-zinc-100 mt-1 block">
                      {formatCurrency(selectedPoDetail.totalAmount, selectedPoDetail.currency)}
                    </span>
                  </div>
                  <div className="border-x border-neutral-200 dark:border-zinc-800 px-2">
                    <span className="text-micro text-neutral-500 dark:text-zinc-400 block">Utilized (Invoiced)</span>
                    <span className="text-body font-mono font-semibold tabular-nums text-neutral-900 dark:text-zinc-100 mt-1 block">
                      {formatCurrency(selectedPoDetail.utilizedAmount, selectedPoDetail.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-micro text-neutral-500 dark:text-zinc-400 block">Available Balance</span>
                    <span className="text-body font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1 block">
                      {formatCurrency(selectedPoDetail.remainingAmount, selectedPoDetail.currency)}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                {(() => {
                  const tot = Number(selectedPoDetail.totalAmount) || 1;
                  const uti = Number(selectedPoDetail.utilizedAmount) || 0;
                  const pct = Math.min(100, Math.max(0, (uti / tot) * 100));
                  return (
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-micro font-mono text-neutral-500 dark:text-zinc-400">
                        <span>Utilization</span>
                        <span>{pct.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-neutral-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            pct >= 100
                              ? "bg-rose-500"
                              : pct > 80
                              ? "bg-amber-500"
                              : "bg-indigo-600"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 3-Way Match & Discrepancy Diagnostics */}
            <div className="space-y-2">
              <span className="text-micro font-semibold uppercase tracking-wider text-neutral-500 dark:text-zinc-400 block">
                Reconciliation &amp; Discrepancy Diagnostics
              </span>
              <div
                className={`p-3.5 rounded-lg border text-caption space-y-1.5 ${
                  selectedPoDetail.matchingStatus === "MATCHED"
                    ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                    : selectedPoDetail.matchingStatus === "UNMATCHED"
                    ? "bg-neutral-50 dark:bg-zinc-800/60 border-neutral-200 dark:border-zinc-700 text-neutral-700 dark:text-zinc-300"
                    : "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200"
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <div className="flex items-center gap-1.5">
                    {selectedPoDetail.matchingStatus === "MATCHED" ? (
                      <CheckCircle2 size={15} className="text-emerald-600" />
                    ) : selectedPoDetail.matchingStatus === "UNMATCHED" ? (
                      <Clock size={15} className="text-neutral-500" />
                    ) : (
                      <AlertTriangle size={15} className="text-amber-600" />
                    )}
                    <span>
                      {selectedPoDetail.matchingStatus === "MATCHED"
                        ? "3-Way Reconciliation Fully Matched"
                        : selectedPoDetail.matchingStatus === "UNMATCHED"
                        ? "Awaiting Invoice Drawdown Intake"
                        : "Matching Variance Flagged (Tolerances Exceeded)"}
                    </span>
                  </div>
                  <span className="text-micro font-mono">
                    {selectedPoDetail.matchingStatus === "MATCHED"
                      ? "0.0% Variance"
                      : selectedPoDetail.matchingStatus === "UNMATCHED"
                      ? "Standby"
                      : "Action Required"}
                  </span>
                </div>
                <p className="text-micro leading-relaxed">
                  {selectedPoDetail.matchingStatus === "MATCHED"
                    ? "All invoiced line items, unit rates, and quantities align with authorized purchase order commitments."
                    : selectedPoDetail.matchingStatus === "UNMATCHED"
                    ? "No vendor tax invoices have been matched or drawn down against this purchase order yet. Line item matching will trigger automatically once an invoice citing this PO is processed."
                    : "Unit price or quantity discrepancy detected across reconciled line items exceeding the 2.5% tolerance threshold. Requires buyer exception approval or vendor credit note."}
                </p>
              </div>
            </div>

            {/* Itemized Line Items Breakdown */}
            {(() => {
              const enrich = getPoEnrichment(selectedPoDetail);
              return (
                <>
                  <div className="space-y-2">
                    <span className="text-micro font-semibold uppercase tracking-wider text-neutral-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <FileText size={11} /> Commercial Terms &amp; Delivery
                    </span>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-caption">
                      <div>
                        <span className="text-micro text-neutral-400 dark:text-zinc-500 block">PO Type</span>
                        <span className="font-semibold text-neutral-900 dark:text-zinc-100">{enrich.poType}</span>
                      </div>
                      <div>
                        <span className="text-micro text-neutral-400 dark:text-zinc-500 block">Payment Terms</span>
                        <span className="font-semibold text-neutral-900 dark:text-zinc-100">{enrich.paymentTerms}</span>
                      </div>
                      <div>
                        <span className="text-micro text-neutral-400 dark:text-zinc-500 block">Cost Centre</span>
                        <span className="font-semibold text-neutral-900 dark:text-zinc-100 font-mono">{enrich.costCenter}</span>
                      </div>
                      <div>
                        <span className="text-micro text-neutral-400 dark:text-zinc-500 block">Matching Tolerance</span>
                        <span className="font-semibold text-neutral-900 dark:text-zinc-100">{enrich.matchingTolerance}</span>
                      </div>
                      <div>
                        <span className="text-micro text-neutral-400 dark:text-zinc-500 block">Expected Delivery</span>
                        <span className="font-semibold text-neutral-900 dark:text-zinc-100">{formatDate(enrich.expectedDeliveryDate)}</span>
                      </div>
                      <div>
                        <span className="text-micro text-neutral-400 dark:text-zinc-500 block">Incoterms</span>
                        <span className="font-semibold text-neutral-900 dark:text-zinc-100">{enrich.incoterms}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-micro text-neutral-400 dark:text-zinc-500 block">Delivery Location</span>
                        <span className="font-semibold text-neutral-900 dark:text-zinc-100">{enrich.deliveryLocation}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-micro font-semibold uppercase tracking-wider text-neutral-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <BarChart3 size={11} /> Itemized Commitment Lines
                    </span>
                    <div className="rounded-xl border border-neutral-200 dark:border-zinc-800 overflow-hidden">
                      <table className="w-full text-micro">
                        <thead>
                          <tr className="bg-neutral-50 dark:bg-zinc-800/60">
                            <th className="text-left px-3 py-2 text-neutral-500 dark:text-zinc-400 font-semibold">#</th>
                            <th className="text-left px-3 py-2 text-neutral-500 dark:text-zinc-400 font-semibold">Description</th>
                            <th className="text-right px-3 py-2 text-neutral-500 dark:text-zinc-400 font-semibold">HSN</th>
                            <th className="text-right px-3 py-2 text-neutral-500 dark:text-zinc-400 font-semibold">Qty</th>
                            <th className="text-right px-3 py-2 text-neutral-500 dark:text-zinc-400 font-semibold">Rate</th>
                            <th className="text-right px-3 py-2 text-neutral-500 dark:text-zinc-400 font-semibold">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-zinc-800">
                          {enrich.lineItems.map((item) => (
                            <tr key={item.id} className="bg-white dark:bg-zinc-900">
                              <td className="px-3 py-2 font-mono text-neutral-400">{item.itemNumber}</td>
                              <td className="px-3 py-2 text-neutral-800 dark:text-zinc-200 max-w-[160px]">{item.description}</td>
                              <td className="px-3 py-2 text-right font-mono text-neutral-400">{item.hsnSac}</td>
                              <td className="px-3 py-2 text-right font-mono text-neutral-700 dark:text-zinc-300">{item.quantity} {item.unitOfMeasure}</td>
                              <td className="px-3 py-2 text-right font-mono text-neutral-700 dark:text-zinc-300">{formatCurrency(item.unitPrice, selectedPoDetail.currency)}</td>
                              <td className="px-3 py-2 text-right font-mono font-semibold text-neutral-900 dark:text-zinc-100">{formatCurrency(item.lineTotal, selectedPoDetail.currency)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-neutral-50 dark:bg-zinc-800/60 border-t border-neutral-200 dark:border-zinc-700">
                          <tr>
                            <td colSpan={5} className="px-3 py-2 text-right text-micro text-neutral-500 dark:text-zinc-400 font-semibold">Subtotal (excl. tax)</td>
                            <td className="px-3 py-2 text-right font-mono font-semibold text-neutral-900 dark:text-zinc-100">{formatCurrency(enrich.subtotal, selectedPoDetail.currency)}</td>
                          </tr>
                          <tr>
                            <td colSpan={5} className="px-3 py-2 text-right text-micro text-neutral-500 dark:text-zinc-400 font-semibold">GST @ 18%</td>
                            <td className="px-3 py-2 text-right font-mono text-neutral-700 dark:text-zinc-300">{formatCurrency(enrich.taxAmount, selectedPoDetail.currency)}</td>
                          </tr>
                          <tr>
                            <td colSpan={5} className="px-3 py-2 text-right text-caption font-bold text-neutral-900 dark:text-zinc-100">Total Committed</td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-indigo-700 dark:text-indigo-300">{formatCurrency(selectedPoDetail.totalAmount, selectedPoDetail.currency)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {enrich.notes && (
                    <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-micro text-amber-800 dark:text-amber-200 flex gap-2">
                      <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                      <span>{enrich.notes}</span>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Linked Invoices Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-micro font-semibold uppercase tracking-wider text-neutral-500 dark:text-zinc-400">
                  Reconciled Invoices ({selectedPoDetail.invoices?.length || 0})
                </span>
                <Link
                  to={`/invoices?search=${encodeURIComponent(selectedPoDetail.poNumber)}`}
                  className="text-micro text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-medium"
                >
                  <span>View All in Ledger</span>
                  <ArrowRight size={11} />
                </Link>
              </div>

              {!selectedPoDetail.invoices || selectedPoDetail.invoices.length === 0 ? (
                <div className="p-4 rounded-lg bg-neutral-50 dark:bg-zinc-800/40 text-center text-caption text-neutral-500 dark:text-zinc-400 border border-dashed border-neutral-200 dark:border-zinc-700">
                  No invoices drawn down against this purchase order yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedPoDetail.invoices.map((inv) => (
                    <Link
                      key={inv.id}
                      to={`/invoices/${inv.id}`}
                      className="p-3 rounded-lg border border-neutral-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors flex items-center justify-between group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-neutral-900 dark:text-zinc-100 text-body-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {inv.invoiceNumber}
                          </span>
                          <StatusBadge status={inv.status} size="sm" />
                        </div>
                        <span className="text-micro text-neutral-500 dark:text-zinc-400 font-mono">
                          Inspect 3-way match &amp; line variance &rarr;
                        </span>
                      </div>
                      <span className="font-mono tabular-nums font-semibold text-neutral-900 dark:text-zinc-100 text-body-sm">
                        {formatCurrency(inv.totalAmount, selectedPoDetail.currency)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Sheet>

      {/* Modal for Creating New PO — Competitor-Grade */}
      <Dialog
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetPoForm(); }}
        size="2xl"
        title="Create Purchase Order"
        description="Register a committed purchase order with itemized line items and cost allocation."
      >
        <form onSubmit={handleCreatePo} className="space-y-5">
          {formError && (
            <Alert type="error" title="Failed to create Purchase Order">{formError}</Alert>
          )}

          {/* Row 1: PO Header */}
          <div className="grid grid-cols-2 gap-3">
            <Input label="PO Number *" value={poNumber} onChange={(e) => { setPoNumber(e.target.value); setFormError(null); }} required placeholder="PO-2026-001" />
            <Select name="supplierId" label="Supplier *" value={supplierId} onValueChange={(v) => { setSupplierId(v); const s = suppliers.find((x) => x.id === v); if (s?.currency) setCurrency(s.currency); }} required placeholder="Select supplier..."
              options={suppliers.map((s) => ({ value: s.id, label: s.displayName }))}
            />
          </div>

          {/* Row 2: Dates & PO Type */}
          <div className="grid grid-cols-3 gap-3">
            <Input label="Issue Date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            <Input label="Expected Delivery" type="date" value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} />
            <Select name="poType" label="PO Type" value={poType} onValueChange={setPoType}
              options={[
                { value: "Standard Purchase Order", label: "Standard PO" },
                { value: "Blanket / Standing Contract", label: "Blanket PO" },
                { value: "Service Work Order", label: "Service WO" },
              ]}
            />
          </div>

          {/* Row 3: Cost Center & Logistics */}
          <div className="grid grid-cols-2 gap-3">
            <Select name="costCenter" label="Cost Center" value={costCenter} onValueChange={setCostCenter}
              options={[
                { value: "CC-104 Plant Operations Pune", label: "CC-104 Plant Pune" },
                { value: "CC-201 IT & Digital", label: "CC-201 IT & Digital" },
                { value: "CC-302 Supply Chain", label: "CC-302 Supply Chain" },
                { value: "CC-405 Corporate Admin", label: "CC-405 Corporate Admin" },
              ]}
            />
            <Select name="matchingTolerance" label="Matching Tolerance" value={matchingTolerance} onValueChange={setMatchingTolerance}
              options={[
                { value: "Strict (0% Tolerance)", label: "Strict 0%" },
                { value: "Standard Commercial (2.5% Tolerance)", label: "Standard 2.5%" },
                { value: "Discretionary (5% Tolerance)", label: "Discretionary 5%" },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select name="paymentTerms" label="Payment Terms" value={paymentTerms} onValueChange={setPaymentTerms}
              options={[
                { value: "Net 15 Days", label: "Net 15 Days" },
                { value: "Net 30 Days", label: "Net 30 Days" },
                { value: "Net 45 Days", label: "Net 45 Days" },
                { value: "Net 60 Days", label: "Net 60 Days" },
              ]}
            />
            <Input label="Delivery Location" value={deliveryLocation} onChange={(e) => setDeliveryLocation(e.target.value)} placeholder="Warehouse WH-1, Pune" />
          </div>

          {/* Itemized PO Lines */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-label font-semibold text-neutral-800 dark:text-zinc-200">Itemized Line Items</span>
              <button type="button" onClick={addLineItem} className="text-caption text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1">
                <Plus size={13} /> Add Line
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
              {lineItems.map((line, idx) => (
                <div key={line.id} className="p-3 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-neutral-50/50 dark:bg-zinc-900/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-micro font-mono text-neutral-400 dark:text-zinc-500 font-semibold">Line {idx + 1}</span>
                    {lineItems.length > 1 && (
                      <button type="button" onClick={() => removeLineItem(line.id)} className="text-rose-500 hover:text-rose-700 transition-colors">
                        <Minus size={13} />
                      </button>
                    )}
                  </div>
                  <Input
                    placeholder="Item description (e.g. Cold Rolled Steel Coils IS 2062)"
                    value={line.description}
                    onChange={(e) => updateLineItem(line.id, "description", e.target.value)}
                  />
                  <div className="grid grid-cols-4 gap-2">
                    <Input placeholder="HSN/SAC" value={line.hsnSac} onChange={(e) => updateLineItem(line.id, "hsnSac", e.target.value)} />
                    <Input type="number" placeholder="Qty" min="0" step="0.01" value={line.quantity || ""} onChange={(e) => updateLineItem(line.id, "quantity", Number(e.target.value))} />
                    <select
                      className="h-9 w-full rounded-md border border-neutral-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 text-body-sm text-neutral-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                      value={line.unitOfMeasure}
                      onChange={(e) => updateLineItem(line.id, "unitOfMeasure", e.target.value)}
                    >
                      {["Pcs", "Kg", "MT", "Hours", "Lots", "Box", "Ltr"].map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                    <Input type="number" placeholder="Unit Rate" min="0" step="0.01" value={line.unitPrice || ""} onChange={(e) => updateLineItem(line.id, "unitPrice", Number(e.target.value))} />
                  </div>
                  {Number(line.lineTotal) > 0 && (
                    <div className="text-right text-caption font-mono font-semibold text-neutral-700 dark:text-zinc-300">
                      Line Total: {formatCurrency(line.lineTotal, currency)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            {poSubtotal > 0 && (
              <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 space-y-1.5">
                <div className="flex justify-between text-micro font-mono text-neutral-600 dark:text-zinc-400">
                  <span>Subtotal (excl. GST)</span>
                  <span>{formatCurrency(poSubtotal, currency)}</span>
                </div>
                <div className="flex justify-between text-micro font-mono text-neutral-600 dark:text-zinc-400">
                  <span>Estimated GST @ 18%</span>
                  <span>{formatCurrency(poTaxAmount, currency)}</span>
                </div>
                <div className="flex justify-between text-caption font-mono font-bold text-indigo-800 dark:text-indigo-200 pt-1 border-t border-indigo-200 dark:border-indigo-800">
                  <span>Total Committed Amount</span>
                  <span>{formatCurrency(poTotalAmount, currency)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-200 dark:border-zinc-800">
            <Button type="button" variant="outline" onClick={() => { setShowCreateModal(false); resetPoForm(); }}>Cancel</Button>
            <Button type="submit" disabled={submitting || !supplierId || !poNumber}>
              {submitting ? "Creating..." : "Create Purchase Order"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
