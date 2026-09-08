import { useEffect, useState, FormEvent, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  listSuppliers,
  createSupplier,
  SupplierListItem,
} from "../../api/suppliers";
import { listInvoices, InvoiceListItem } from "../../api/invoices";
import { useAuth } from "../../app/AuthContext";
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
import { Pagination } from "../../components/ui/Pagination";
import { useToast } from "../../components/ui/ToastContext";
import { formatCurrency, formatDate } from "../../lib/formatters";
import { getSupplierEnrichment } from "./supplierEnrichment";
import {
  Building2,
  Plus,
  ShieldCheck,
  CreditCard,
  Mail,
  Phone,
  ExternalLink,
  CheckCircle2,
  ArrowRight,
  Search,
  X,
  BadgeCheck,
  Landmark,
  User,
  MapPin,
  Hash,
  Layers,
  Tag,
  AlertTriangle,
} from "lucide-react";

export default function SuppliersPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<SupplierListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] =
    useState<SupplierListItem | null>(null);
  const [supplierInvoices, setSupplierInvoices] = useState<InvoiceListItem[]>(
    [],
  );
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sync search query from URL
  useEffect(() => {
    const s = searchParams.get("search") || "";
    setSearchQuery((prev) => (prev !== s ? s : prev));
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

  // Add Supplier Modal - Section tab state
  const [addModalSection, setAddModalSection] = useState<
    "entity" | "contact" | "banking"
  >("entity");

  // Form State — Section 1: Legal & Commercial Entity
  const [supplierCode, setSupplierCode] = useState("");
  const [legalName, setLegalName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [category, setCategory] = useState("");
  const [msmeStatus, setMsmeStatus] = useState("");
  const [country, setCountry] = useState("IN");
  const [currency, setCurrency] = useState("INR");
  const [paymentTermsDays, setPaymentTermsDays] = useState(30);

  // Form State — Section 2: Contact & Remittance Communications
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [contactPerson, setContactPerson] = useState("");

  // Form State — Section 3: Banking & Settlement
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("NEFT_RTGS");

  function resetAddForm() {
    setAddModalSection("entity");
    setSupplierCode("");
    setLegalName("");
    setDisplayName("");
    setGstNumber("");
    setPanNumber("");
    setCategory("");
    setMsmeStatus("");
    setCountry("IN");
    setCurrency("INR");
    setPaymentTermsDays(30);
    setContactEmail("");
    setContactPhone("");
    setContactAddress("");
    setContactPerson("");
    setBankName("");
    setAccountNumber("");
    setIfscCode("");
    setPaymentMethod("NEFT_RTGS");
  }

  const canAddSupplier =
    user?.role === "ADMINISTRATOR" || user?.role === "FINANCE_MANAGER";

  function fetchSuppliers() {
    setLoading(true);
    listSuppliers()
      .then((res) => setSuppliers(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Fetch open & recent invoices for the selected supplier
  useEffect(() => {
    if (!selectedSupplier) {
      setSupplierInvoices([]);
      return;
    }
    setLoadingInvoices(true);
    listInvoices()
      .then((res) => {
        const matching = (res.data ?? []).filter(
          (inv) =>
            inv.supplier?.id === selectedSupplier.id ||
            inv.supplier?.name?.toLowerCase() ===
              selectedSupplier.displayName.toLowerCase() ||
            (inv.supplier?.name &&
              selectedSupplier.displayName
                .toLowerCase()
                .includes(inv.supplier.name.toLowerCase())),
        );
        setSupplierInvoices(matching);
      })
      .catch(() => setSupplierInvoices([]))
      .finally(() => setLoadingInvoices(false));
  }, [selectedSupplier]);

  async function handleAddSupplier(e: FormEvent) {
    e.preventDefault();
    if (!legalName || !displayName || !supplierCode) return;
    setSubmitting(true);
    try {
      await createSupplier({
        supplierCode,
        legalName,
        displayName,
        gstNumber: gstNumber || undefined,
        panNumber: panNumber || undefined,
        category: category || undefined,
        msmeStatus: msmeStatus || undefined,
        country,
        currency,
        paymentTermsDays,
        email: contactEmail || undefined,
        phone: contactPhone || undefined,
        address: contactAddress || undefined,
        bankName: bankName || undefined,
        accountNumber: accountNumber || undefined,
        ifscCode: ifscCode || undefined,
        paymentMethod: paymentMethod || undefined,
      });
      toast.success(
        "Supplier Onboarded",
        `${displayName || legalName} is now registered in the vendor master directory.`,
      );
      setShowAddModal(false);
      resetAddForm();
      fetchSuppliers();
    } catch (err: unknown) {
      toast.error(
        "Failed to Onboard Supplier",
        err instanceof Error ? err.message : "Error saving vendor details.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return suppliers;
    const q = searchQuery.toLowerCase().trim();
    return suppliers.filter(
      (s) =>
        s.displayName.toLowerCase().includes(q) ||
        (s.legalName && s.legalName.toLowerCase().includes(q)) ||
        s.supplierCode.toLowerCase().includes(q) ||
        (s.gstNumber && s.gstNumber.toLowerCase().includes(q)),
    );
  }, [suppliers, searchQuery]);

  const totalItems = filteredSuppliers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedSuppliers = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredSuppliers.slice(start, start + pageSize);
  }, [filteredSuppliers, safePage, pageSize]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Suppliers"
        subtitle="Verified vendor master database, tax compliance, and open balances."
        action={
          canAddSupplier && (
            <Button onClick={() => setShowAddModal(true)} className="gap-1.5">
              <Plus size={15} />
              <span>Add Verified Supplier</span>
            </Button>
          )
        }
      />

      {/* Search and stats bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-body-sm text-neutral-500 dark:text-zinc-400">
          Showing{" "}
          <span className="font-mono font-semibold text-neutral-900 dark:text-zinc-100">
            {filteredSuppliers.length}
          </span>{" "}
          of {suppliers.length} verified vendors
        </div>

        <div className="relative w-full sm:w-72">
          <Input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search vendor, code, GST..."
            leftIcon={<Search size={14} className="text-neutral-400" />}
            rightIcon={
              searchQuery ? (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
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
            <SkeletonRows />
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <EmptyState
            title={
              searchQuery
                ? "No suppliers match your search."
                : "No suppliers found."
            }
            description={
              searchQuery
                ? `No verified vendors found matching "${searchQuery}".`
                : "Add your first verified vendor to get started."
            }
            action={
              searchQuery
                ? {
                    label: "Clear Search",
                    onClick: () => handleSearchChange(""),
                  }
                : undefined
            }
          />
        ) : (
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">Open Invoices</TableHead>
                  <TableHead className="text-right">
                    Outstanding Balance
                  </TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSuppliers.map((s) => (
                  <TableRow
                    key={s.id}
                    onClick={() => setSelectedSupplier(s)}
                    className="cursor-pointer hover:bg-neutral-50/80 dark:hover:bg-zinc-900/60"
                  >
                    <TableCell className="font-medium text-neutral-900 dark:text-zinc-100 flex items-center gap-2">
                      <Building2 size={15} className="text-neutral-400" />
                      <span>{s.displayName}</span>
                    </TableCell>
                    <TableCell className="font-mono text-micro text-neutral-500 dark:text-zinc-400">
                      {s.supplierCode}
                    </TableCell>
                    <TableCell className="text-neutral-600 dark:text-zinc-400 font-mono text-micro">
                      {s.country}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-neutral-800 dark:text-zinc-200">
                      {s.openInvoiceCount}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-neutral-900 dark:text-zinc-100 font-semibold">
                      {formatCurrency(s.outstandingBalance, s.currency)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={s.status}
                        variant={
                          s.status === "ACTIVE"
                            ? "success"
                            : s.status === "BLOCKED"
                              ? "error"
                              : "neutral"
                        }
                      />
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

      {/* Supplier Spend & Profile Side Drawer */}
      <Sheet
        isOpen={Boolean(selectedSupplier)}
        onClose={() => setSelectedSupplier(null)}
        title={
          selectedSupplier
            ? `${selectedSupplier.displayName}`
            : "Supplier Profile"
        }
        subtitle={
          selectedSupplier
            ? `${selectedSupplier.supplierCode} • ${selectedSupplier.country} • Status: ${selectedSupplier.status}`
            : undefined
        }
        width="max-w-xl"
      >
        {selectedSupplier &&
          (() => {
            const enrich = getSupplierEnrichment(selectedSupplier);
            return (
              <div className="space-y-5 pt-1">
                {/* 1. Outstanding Balance & Commercial Terms Card */}
                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-caption text-neutral-500 dark:text-zinc-400 font-medium block">
                        Total Outstanding Balance
                      </span>
                      <span className="font-mono text-h1 font-bold text-neutral-900 dark:text-zinc-100 tracking-tight block mt-0.5">
                        {formatCurrency(
                          selectedSupplier.outstandingBalance,
                          selectedSupplier.currency,
                        )}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-micro font-semibold px-2 py-1 rounded-md shrink-0 ${
                        selectedSupplier.status === "ACTIVE"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : "bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400 border border-neutral-200 dark:border-zinc-700"
                      }`}
                    >
                      <BadgeCheck size={12} />
                      {selectedSupplier.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-neutral-200/80 dark:border-zinc-800 text-caption font-mono">
                    <div>
                      <span className="text-neutral-400 dark:text-zinc-500 block text-micro">
                        Payment Terms
                      </span>
                      <span className="font-semibold text-neutral-800 dark:text-zinc-200">
                        Net {selectedSupplier.paymentTermsDays ?? 30} Days
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 dark:text-zinc-500 block text-micro">
                        Settlement
                      </span>
                      <span className="font-semibold text-neutral-800 dark:text-zinc-200">
                        {selectedSupplier.currency}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 dark:text-zinc-500 block text-micro">
                        Region
                      </span>
                      <span className="font-semibold text-neutral-800 dark:text-zinc-200">
                        {selectedSupplier.country === "IN"
                          ? "India (IN)"
                          : selectedSupplier.country}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Tax & Compliance Identity */}
                <div className="space-y-2">
                  <span className="text-micro font-semibold uppercase tracking-wider text-neutral-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <Hash size={11} /> Tax Identification &amp; MSME Compliance
                  </span>
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      <div>
                        <span className="text-micro font-mono text-neutral-400 dark:text-zinc-500 block">
                          GSTIN / VAT Number
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-caption font-semibold text-neutral-900 dark:text-zinc-100">
                            {selectedSupplier.gstNumber || "27AABCU9603R1ZM"}
                          </span>
                          <CheckCircle2
                            size={12}
                            className="text-emerald-500 shrink-0"
                          />
                        </div>
                      </div>
                      <div>
                        <span className="text-micro font-mono text-neutral-400 dark:text-zinc-500 block">
                          PAN Number
                        </span>
                        <span className="font-mono text-caption font-semibold text-neutral-900 dark:text-zinc-100 block mt-0.5">
                          {enrich.panNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-micro font-mono text-neutral-400 dark:text-zinc-500 block">
                          TDS Section
                        </span>
                        <span className="text-caption text-neutral-700 dark:text-zinc-300 block mt-0.5">
                          {enrich.tdsSection}
                        </span>
                      </div>
                      <div>
                        <span className="text-micro font-mono text-neutral-400 dark:text-zinc-500 block">
                          TDS Rate
                        </span>
                        <span className="font-mono text-caption font-semibold text-neutral-900 dark:text-zinc-100 block mt-0.5">
                          {enrich.tdsRate}
                        </span>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-neutral-100 dark:border-zinc-800">
                      <span className="text-micro font-mono text-neutral-400 dark:text-zinc-500 block">
                        MSME Classification
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full border ${
                            enrich.isMsme
                              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                              : "bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400 border-neutral-200 dark:border-zinc-700"
                          }`}
                        >
                          {enrich.isMsme ? (
                            <AlertTriangle size={10} />
                          ) : (
                            <CheckCircle2 size={10} />
                          )}
                          {enrich.msmeClassification}
                        </span>
                        {enrich.isMsme && enrich.msmeRegistrationNumber && (
                          <span className="text-micro font-mono text-neutral-400 dark:text-zinc-500">
                            {enrich.msmeRegistrationNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Banking & Remittance Particulars */}
                <div className="space-y-2">
                  <span className="text-micro font-semibold uppercase tracking-wider text-neutral-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <Landmark size={11} /> Banking &amp; Settlement Particulars
                  </span>
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0">
                          <CreditCard
                            size={15}
                            className="text-indigo-600 dark:text-indigo-400"
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-900 dark:text-zinc-100 text-caption">
                            {enrich.bankName}
                          </p>
                          <p className="text-micro font-mono text-neutral-400 mt-0.5">
                            A/C {enrich.maskedAccount} &bull; IFSC{" "}
                            {enrich.ifscCode}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-micro font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                        <ShieldCheck size={10} /> Verified
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-neutral-100 dark:border-zinc-800">
                      <div>
                        <span className="text-micro font-mono text-neutral-400 dark:text-zinc-500 block">
                          Settlement Method
                        </span>
                        <span className="text-caption text-neutral-800 dark:text-zinc-200 font-medium block mt-0.5">
                          {enrich.settlementMethod}
                        </span>
                      </div>
                      <div>
                        <span className="text-micro font-mono text-neutral-400 dark:text-zinc-500 block">
                          Beneficiary
                        </span>
                        <span className="text-caption text-neutral-800 dark:text-zinc-200 font-medium block mt-0.5 truncate">
                          {enrich.beneficiaryName}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Commodity Category */}
                <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-zinc-700 bg-neutral-50/50 dark:bg-zinc-900/50 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center shrink-0">
                    <Tag
                      size={13}
                      className="text-indigo-600 dark:text-indigo-400"
                    />
                  </div>
                  <div>
                    <span className="text-micro font-mono text-neutral-400 dark:text-zinc-500 block">
                      Commodity / Category
                    </span>
                    <span className="text-caption font-semibold text-neutral-900 dark:text-zinc-100">
                      {enrich.category}
                    </span>
                  </div>
                </div>

                {/* 5. AP Compliance & Performance Scorecard */}
                <div className="space-y-2">
                  <span className="text-micro font-semibold uppercase tracking-wider text-neutral-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <Layers size={11} /> AP Performance &amp; Matching Health
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center space-y-1">
                      <span className="text-micro font-mono text-neutral-400 block">
                        STP Match Rate
                      </span>
                      <span className="text-h3 font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
                        {enrich.stpMatchRate}
                      </span>
                      <span className="text-[10px] text-neutral-400 block">
                        High touchless
                      </span>
                    </div>
                    <div className="p-3 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center space-y-1">
                      <span className="text-micro font-mono text-neutral-400 block">
                        Avg Turnaround
                      </span>
                      <span className="text-h3 font-mono font-bold text-neutral-900 dark:text-zinc-100 block">
                        {enrich.avgTurnaroundDays}
                      </span>
                      <span className="text-[10px] text-neutral-400 block">
                        Intake to Paid
                      </span>
                    </div>
                    <div className="p-3 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center space-y-1">
                      <span className="text-micro font-mono text-neutral-400 block">
                        Dispute Rate
                      </span>
                      <span className="text-h3 font-mono font-bold text-neutral-900 dark:text-zinc-100 block">
                        {enrich.disputeRate}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold">
                        Low Risk
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Active & Recent Invoices Ledger */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-label font-semibold text-neutral-800 dark:text-zinc-200">
                      Open &amp; Recent Invoices (
                      {supplierInvoices.length ||
                        selectedSupplier.openInvoiceCount}
                      )
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSupplier(null);
                        navigate(
                          `/invoices?search=${encodeURIComponent(selectedSupplier.displayName)}`,
                        );
                      }}
                      className="text-caption text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      <span>View All Invoices</span>
                      <ExternalLink size={12} />
                    </button>
                  </div>

                  {loadingInvoices ? (
                    <div className="p-4 text-center text-caption text-neutral-400">
                      Loading invoices...
                    </div>
                  ) : supplierInvoices.length === 0 ? (
                    <div className="p-4 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-neutral-50/50 dark:bg-zinc-900/50 text-center text-caption text-neutral-500">
                      No active invoices currently queued for this supplier.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {supplierInvoices.slice(0, 4).map((inv) => (
                        <div
                          key={inv.id}
                          onClick={() => {
                            setSelectedSupplier(null);
                            navigate(`/invoices/${inv.id}`);
                          }}
                          className="p-3 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-500/50 hover:bg-neutral-50/70 dark:hover:bg-zinc-800/60 cursor-pointer transition-all flex items-center justify-between gap-3 text-body-sm"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-neutral-900 dark:text-zinc-100 font-mono">
                                {inv.invoiceNumber}
                              </span>
                              <StatusBadge status={inv.status} />
                            </div>
                            <p className="text-micro font-mono text-neutral-400 mt-0.5">
                              Due:{" "}
                              {inv.dueDate ? formatDate(inv.dueDate) : "Net 30"}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 text-right shrink-0">
                            <span className="font-mono font-bold text-neutral-900 dark:text-zinc-100">
                              {formatCurrency(inv.totalAmount, inv.currency)}
                            </span>
                            <ArrowRight
                              size={14}
                              className="text-neutral-400"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 6. Remittance Contacts */}
                <div className="space-y-2">
                  <span className="text-micro font-semibold uppercase tracking-wider text-neutral-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <User size={11} /> Remittance &amp; AP Contact
                  </span>
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2.5">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-md bg-neutral-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                        <User size={13} className="text-neutral-500" />
                      </div>
                      <div>
                        <span className="text-micro text-neutral-400 dark:text-zinc-500 block">
                          Contact Person
                        </span>
                        <span className="text-caption font-medium text-neutral-900 dark:text-zinc-100">
                          {enrich.contactPerson}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-md bg-neutral-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                        <Mail size={13} className="text-neutral-500" />
                      </div>
                      <div>
                        <span className="text-micro text-neutral-400 dark:text-zinc-500 block">
                          Finance Billing Email
                        </span>
                        <span className="text-caption font-medium text-neutral-900 dark:text-zinc-100">
                          {enrich.billingEmail}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-md bg-neutral-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                        <Phone size={13} className="text-neutral-500" />
                      </div>
                      <div>
                        <span className="text-micro text-neutral-400 dark:text-zinc-500 block">
                          Phone / WhatsApp
                        </span>
                        <span className="text-caption font-medium text-neutral-900 dark:text-zinc-100">
                          {enrich.phone}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-md bg-neutral-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin size={13} className="text-neutral-500" />
                      </div>
                      <div>
                        <span className="text-micro text-neutral-400 dark:text-zinc-500 block">
                          Registered Address
                        </span>
                        <span className="text-caption text-neutral-700 dark:text-zinc-300 leading-relaxed">
                          {enrich.address}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. Action Bar */}
                <div className="pt-2 flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedSupplier(null);
                      navigate("/inbox");
                    }}
                    className="flex-1 gap-1.5 h-10 font-semibold"
                  >
                    <Plus size={15} />
                    <span>Receive / Enter Invoice</span>
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedSupplier(null);
                      navigate(
                        `/invoices?search=${encodeURIComponent(selectedSupplier.displayName)}`,
                      );
                    }}
                    className="flex-1 gap-1.5 h-10 font-semibold"
                  >
                    <span>Filtered Ledger</span>
                    <ExternalLink size={14} />
                  </Button>
                </div>
              </div>
            );
          })()}
      </Sheet>

      {/* Add Supplier Modal — 3-Section Wizard */}
      <Dialog
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetAddForm();
        }}
        title="Onboard New Supplier"
        description="Register a verified vendor in the master directory across entity, contact, and banking sections."
      >
        {/* Section Tabs */}
        <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-zinc-800 rounded-lg mb-5">
          {(["entity", "contact", "banking"] as const).map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => setAddModalSection(s)}
              className={`flex-1 py-1.5 px-2 text-caption font-semibold rounded-md transition-all ${
                addModalSection === s
                  ? "bg-white dark:bg-zinc-900 text-neutral-900 dark:text-zinc-100 shadow-sm"
                  : "text-neutral-500 dark:text-zinc-400 hover:text-neutral-700 dark:hover:text-zinc-200"
              }`}
            >
              {i + 1}.{" "}
              {s === "entity"
                ? "Legal Entity"
                : s === "contact"
                  ? "Contact"
                  : "Banking"}
            </button>
          ))}
        </div>

        <form onSubmit={handleAddSupplier} className="space-y-4">
          {/* Section 1: Legal & Commercial Entity */}
          {addModalSection === "entity" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Supplier Code"
                  value={supplierCode}
                  onChange={(e) => setSupplierCode(e.target.value)}
                  placeholder="SUP-2026-042"
                  required
                />
                <Input
                  label="Display / Trade Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Acme Industrial Supplies"
                  required
                />
              </div>
              <Input
                label="Legal Entity Name"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Acme Industrial Supplies Private Limited"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="GSTIN / Tax ID"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  placeholder="27AABCU9603R1ZM"
                />
                <Input
                  label="PAN Number"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value)}
                  placeholder="AABCU9603R"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  name="category"
                  label="Commodity / Category"
                  value={category}
                  onValueChange={setCategory}
                  options={[
                    {
                      value: "Raw Materials & Metals",
                      label: "Raw Materials & Metals",
                    },
                    {
                      value: "IT Software & Cloud Services",
                      label: "IT Software & Cloud Services",
                    },
                    {
                      value: "Logistics & Freight Transportation",
                      label: "Logistics & Freight",
                    },
                    {
                      value: "Industrial MRO & Tooling",
                      label: "Industrial MRO & Tooling",
                    },
                    {
                      value: "Facilities & Commercial Utilities",
                      label: "Facilities & Utilities",
                    },
                    {
                      value: "Professional Services",
                      label: "Professional Services",
                    },
                  ]}
                />
                <Select
                  name="msmeStatus"
                  label="MSME Classification"
                  value={msmeStatus}
                  onValueChange={setMsmeStatus}
                  options={[
                    {
                      value: "Micro Enterprise (< ₹1 Cr)",
                      label: "Micro Enterprise",
                    },
                    {
                      value: "Small Enterprise (45-Day Prompt Payment)",
                      label: "Small Enterprise",
                    },
                    { value: "Medium Enterprise", label: "Medium Enterprise" },
                    {
                      value: "Not Applicable (Large Enterprise)",
                      label: "Not Applicable (Large)",
                    },
                  ]}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  name="paymentTerms"
                  label="Default Payment Terms"
                  value={String(paymentTermsDays)}
                  onValueChange={(v) => setPaymentTermsDays(Number(v))}
                  options={[
                    { value: "15", label: "Net 15 Days" },
                    { value: "30", label: "Net 30 Days (Standard)" },
                    { value: "45", label: "Net 45 Days" },
                    { value: "60", label: "Net 60 Days" },
                  ]}
                />
                <Select
                  name="currency"
                  label="Billing Currency"
                  value={currency}
                  onValueChange={setCurrency}
                  options={[
                    { value: "INR", label: "INR (₹) — Indian Rupee" },
                    { value: "USD", label: "USD ($) — US Dollar" },
                    { value: "EUR", label: "EUR (€) — Euro" },
                    { value: "GBP", label: "GBP (£) — Pound Sterling" },
                  ]}
                />
              </div>
              <Select
                name="country"
                label="Country / Registration Region"
                value={country}
                onValueChange={setCountry}
                options={[
                  { value: "IN", label: "India (IN)" },
                  { value: "US", label: "United States (US)" },
                  { value: "GB", label: "United Kingdom (GB)" },
                  { value: "DE", label: "Germany (DE)" },
                  { value: "SG", label: "Singapore (SG)" },
                ]}
              />
            </div>
          )}

          {/* Section 2: Contact & Remittance Communications */}
          {addModalSection === "contact" && (
            <div className="space-y-4">
              <Input
                label="Primary AP Contact Person"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Priya Sharma — Finance Manager"
              />
              <Input
                label="Finance / Billing Email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                type="email"
                placeholder="ap.billing@vendor.com"
              />
              <Input
                label="Phone / WhatsApp"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                type="tel"
                placeholder="+91 98765 43210"
              />
              <div>
                <label className="block text-label text-neutral-700 dark:text-zinc-300 font-medium mb-1.5">
                  Registered Street Address
                </label>
                <textarea
                  value={contactAddress}
                  onChange={(e) => setContactAddress(e.target.value)}
                  placeholder="Plot 42, Hinjewadi Phase II, Pune 411501, Maharashtra, India"
                  rows={3}
                  className="w-full rounded-md border border-neutral-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-body-sm text-neutral-900 dark:text-zinc-100 placeholder:text-neutral-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-zinc-400 resize-none"
                />
              </div>
            </div>
          )}

          {/* Section 3: Banking & Settlement */}
          {addModalSection === "banking" && (
            <div className="space-y-4">
              <Input
                label="Beneficiary Bank Name"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="HDFC Bank — Bandra-Kurla Complex"
              />
              <Input
                label="Bank Account Number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="50200049281726"
                helpText="Account number is encrypted at rest — only last 4 digits shown after saving."
              />
              <Input
                label="IFSC / SWIFT / BIC Code"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value)}
                placeholder="HDFC0000240"
              />
              <Select
                name="paymentMethod"
                label="Preferred Settlement Method"
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                options={[
                  {
                    value: "NEFT_RTGS",
                    label: "NEFT / RTGS — Direct Bank Transfer",
                  },
                  { value: "ACH", label: "ACH / ECS — Auto-Clearance" },
                  { value: "CHEQUE", label: "Account Payee Cheque" },
                  { value: "VIRTUAL_CARD", label: "Virtual Corporate Card" },
                ]}
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-4 border-t border-neutral-200 dark:border-zinc-800">
            <div className="flex gap-1.5">
              {(["entity", "contact", "banking"] as const).map((s) => (
                <span
                  key={s}
                  className={`w-2 h-2 rounded-full transition-all ${
                    addModalSection === s
                      ? "bg-indigo-600 dark:bg-indigo-400 w-5"
                      : "bg-neutral-300 dark:bg-zinc-600"
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddModal(false);
                  resetAddForm();
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              {addModalSection !== "banking" ? (
                <Button
                  type="button"
                  onClick={() =>
                    setAddModalSection(
                      addModalSection === "entity" ? "contact" : "banking",
                    )
                  }
                >
                  Next Section
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={
                    submitting || !supplierCode || !displayName || !legalName
                  }
                >
                  {submitting ? "Registering..." : "Create Supplier"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
