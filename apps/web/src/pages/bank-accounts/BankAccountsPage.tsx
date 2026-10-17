import { useState, useEffect, useMemo, FormEvent } from "react";
import {
  Landmark,
  Search,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  Star,
  ChevronRight,
  Eye,
  KeyRound,
  ExternalLink,
  RotateCw,
} from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Dialog } from "../../components/ui/Dialog";
import { Sheet } from "../../components/ui/Sheet";
import { EmptyState } from "../../components/EmptyState";
import { SkeletonRows } from "../../components/Skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "../../components/ui/table";
import { useToast } from "../../components/ui/ToastContext";
import { formatDate } from "../../lib/formatters";
import {
  BankAccount,
  listBankAccounts,
  createBankAccount,
  verifyBankAccount,
  togglePrimaryBankAccount,
  CreateBankAccountInput,
} from "../../api/bankAccounts";

export default function BankAccountsPage() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | "VERIFIED" | "PENDING" | "FAILED">("ALL");
  const [primaryOnly, setPrimaryOnly] = useState(false);

  // Drawer & Modal state
  const [activeAccount, setActiveAccount] = useState<BankAccount | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Form state
  const [formSupplier, setFormSupplier] = useState("");
  const [formAccNumber, setFormAccNumber] = useState("");
  const [formBankName, setFormBankName] = useState("");
  const [formIfsc, setFormIfsc] = useState("");
  const [formAccType, setFormAccType] = useState<"CURRENT" | "SAVINGS" | "ESCROW">("CURRENT");
  const [formBranch, setFormBranch] = useState("");
  const [formIsPrimary, setFormIsPrimary] = useState(true);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await listBankAccounts();
      setAccounts(res.data);
    } catch {
      toast({
        title: "Error Loading Accounts",
        description: "Failed to fetch master bank registry.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const matchesSearch =
        !searchQuery ||
        acc.supplierName.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        acc.bankName.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        acc.ifscSwift.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        acc.maskedAccountNumber.toLowerCase().includes(searchQuery.toLowerCase().trim());

      const matchesStatus =
        selectedStatus === "ALL" || acc.status === selectedStatus;

      const matchesPrimary = !primaryOnly || acc.isPrimary;

      return matchesSearch && matchesStatus && matchesPrimary;
    });
  }, [accounts, searchQuery, selectedStatus, primaryOnly]);

  const verifiedCount = accounts.filter((a) => a.status === "VERIFIED").length;
  const pendingCount = accounts.filter((a) => a.status === "PENDING").length;
  const failedCount = accounts.filter((a) => a.status === "FAILED").length;

  const handleOpenDrawer = (acc: BankAccount) => {
    setActiveAccount(acc);
    setDrawerOpen(true);
  };

  const handleVerify = async (acc: BankAccount) => {
    setVerifying(true);
    try {
      const verified = await verifyBankAccount(acc.id);
      setAccounts((prev) => prev.map((a) => (a.id === acc.id ? verified : a)));
      if (activeAccount?.id === acc.id) {
        setActiveAccount(verified);
      }
      toast({
        title: "Penny-Drop Verification Successful",
        description: `${verified.supplierName}'s account verified with Ref ${verified.pennyDropRef}.`,
        type: "success",
      });
    } catch {
      toast({
        title: "Verification Failed",
        description: "Penny-drop gateway returned an error.",
        type: "error",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleTogglePrimary = async (acc: BankAccount) => {
    try {
      const updated = await togglePrimaryBankAccount(acc.id);
      loadAccounts();
      if (activeAccount?.id === acc.id) {
        setActiveAccount(updated);
      }
      toast({
        title: "Primary Settlement Account Updated",
        description: `${updated.bankName} is now the primary disbursement route for ${updated.supplierName}.`,
        type: "info",
      });
    } catch {
      toast({
        title: "Update Failed",
        description: "Could not change primary account status.",
        type: "error",
      });
    }
  };

  const handleCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    if (!formSupplier.trim() || !formAccNumber.trim() || !formBankName.trim() || !formIfsc.trim()) {
      toast({
        title: "Required Fields Missing",
        description: "Supplier name, account number, bank name, and IFSC/SWIFT are mandatory.",
        type: "error",
      });
      return;
    }

    setSubmitting(true);
    try {
      const input: CreateBankAccountInput = {
        supplierName: formSupplier,
        accountNumber: formAccNumber,
        bankName: formBankName,
        ifscSwift: formIfsc,
        accountType: formAccType,
        branchName: formBranch,
        isPrimary: formIsPrimary,
      };

      const created = await createBankAccount(input);
      loadAccounts();
      setAddModalOpen(false);
      resetForm();
      toast({
        title: "Bank Account Registered",
        description: `${created.bankName} account logged for ${created.supplierName}. Verification pending.`,
        type: "success",
      });
    } catch {
      toast({
        title: "Registration Failed",
        description: "Could not register bank account details.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormSupplier("");
    setFormAccNumber("");
    setFormBankName("");
    setFormIfsc("");
    setFormAccType("CURRENT");
    setFormBranch("");
    setFormIsPrimary(true);
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Page Header */}
      <PageHeader
        title="Bank Accounts"
        subtitle="Verified supplier disbursement accounts, IFSC/SWIFT validation, and penny-drop fraud control registry."
        action={
          <Button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-1.5 shadow-2xs"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Add Bank Account</span>
          </Button>
        }
      />

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border border-neutral-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <span className="text-micro uppercase font-semibold text-neutral-400 dark:text-zinc-500">
            Total Accounts
          </span>
          <p className="text-h2 font-mono font-bold text-neutral-900 dark:text-zinc-100 mt-0.5">
            {accounts.length}
          </p>
        </div>
        <div className="p-3 rounded-xl border border-neutral-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <span className="text-micro uppercase font-semibold text-emerald-600 dark:text-emerald-400">
            Penny-Drop Verified
          </span>
          <p className="text-h2 font-mono font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
            {verifiedCount}
          </p>
        </div>
        <div className="p-3 rounded-xl border border-neutral-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <span className="text-micro uppercase font-semibold text-amber-600 dark:text-amber-400">
            Pending Validation
          </span>
          <p className="text-h2 font-mono font-bold text-amber-700 dark:text-amber-300 mt-0.5">
            {pendingCount}
          </p>
        </div>
        <div className="p-3 rounded-xl border border-neutral-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <span className="text-micro uppercase font-semibold text-rose-600 dark:text-rose-400">
            Verification Flagged
          </span>
          <p className="text-h2 font-mono font-bold text-rose-700 dark:text-rose-300 mt-0.5">
            {failedCount}
          </p>
        </div>
      </div>

      {/* Search, Filter Bar, and Master Table */}
      <Card level="surface" className="overflow-hidden">
        <div className="p-4 border-b border-neutral-100 dark:border-zinc-800/80 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex-1 max-w-md">
            <Input
              id="bank-account-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by supplier, bank, IFSC code, or masked account..."
              leftIcon={<Search size={14} className="text-neutral-400" />}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Primary Toggle Chip */}
            <button
              type="button"
              onClick={() => setPrimaryOnly(!primaryOnly)}
              className={`px-3 py-1.5 text-micro font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                primaryOnly
                  ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                  : "bg-neutral-50 dark:bg-zinc-800/60 border-neutral-200/80 dark:border-zinc-700 text-neutral-600 dark:text-zinc-400 hover:border-neutral-300"
              }`}
            >
              <Star size={12} className={primaryOnly ? "fill-indigo-600 text-indigo-600" : "text-neutral-400"} />
              <span>Primary Accounts Only</span>
            </button>

            {/* Status Filter Chips */}
            <div className="flex items-center rounded-lg border border-neutral-200/80 dark:border-zinc-700 p-0.5 bg-neutral-50 dark:bg-zinc-800/60">
              <button
                type="button"
                onClick={() => setSelectedStatus("ALL")}
                className={`px-2.5 py-1 text-micro font-medium rounded-md transition-colors ${
                  selectedStatus === "ALL"
                    ? "bg-white dark:bg-zinc-900 text-neutral-900 dark:text-zinc-100 shadow-2xs"
                    : "text-neutral-500 hover:text-neutral-800 dark:text-zinc-400"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus("VERIFIED")}
                className={`px-2.5 py-1 text-micro font-medium rounded-md transition-colors ${
                  selectedStatus === "VERIFIED"
                    ? "bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-2xs"
                    : "text-neutral-500 hover:text-neutral-800 dark:text-zinc-400"
                }`}
              >
                Verified
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus("PENDING")}
                className={`px-2.5 py-1 text-micro font-medium rounded-md transition-colors ${
                  selectedStatus === "PENDING"
                    ? "bg-white dark:bg-zinc-900 text-amber-700 dark:text-amber-400 shadow-2xs"
                    : "text-neutral-500 hover:text-neutral-800 dark:text-zinc-400"
                }`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus("FAILED")}
                className={`px-2.5 py-1 text-micro font-medium rounded-md transition-colors ${
                  selectedStatus === "FAILED"
                    ? "bg-white dark:bg-zinc-900 text-rose-700 dark:text-rose-400 shadow-2xs"
                    : "text-neutral-500 hover:text-neutral-800 dark:text-zinc-400"
                }`}
              >
                Flagged
              </button>
            </div>
          </div>
        </div>

        {/* Master Table */}
        {loading ? (
          <div className="p-4">
            <SkeletonRows count={5} />
          </div>
        ) : filteredAccounts.length === 0 ? (
          <EmptyState
            title={searchQuery ? "No bank accounts match your search" : "No bank accounts registered"}
            description={
              searchQuery
                ? `No accounts found matching "${searchQuery}". Clear query to restore view.`
                : "Add supplier banking details to enable automated batch payment disbursements."
            }
            action={
              searchQuery
                ? { label: "Clear Search", onClick: () => setSearchQuery("") }
                : { label: "Add Bank Account", onClick: () => setAddModalOpen(true) }
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier Name</TableHead>
                  <TableHead>Bank Name &amp; Branch</TableHead>
                  <TableHead className="font-mono">Account Number</TableHead>
                  <TableHead className="font-mono">IFSC / SWIFT</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Primary Route</TableHead>
                  <TableHead className="text-center w-32">Verification</TableHead>
                  <TableHead className="w-16 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map((acc) => (
                  <TableRow
                    key={acc.id}
                    className="hover:bg-neutral-50/80 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                    onClick={() => handleOpenDrawer(acc)}
                  >
                    <TableCell className="font-semibold text-neutral-900 dark:text-zinc-100">
                      <div className="flex items-center gap-2">
                        <Building2 size={15} className="text-neutral-400 shrink-0" />
                        <span>{acc.supplierName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-neutral-900 dark:text-zinc-100 block">
                        {acc.bankName}
                      </span>
                      {acc.branchName && (
                        <span className="text-caption text-neutral-500 dark:text-zinc-400 block mt-0.5 truncate max-w-xs">
                          {acc.branchName}
                        </span>
                      )}
                    </TableCell>
                    {/* Masked Account Number per Standard §5 money/banking law */}
                    <TableCell className="font-mono font-bold tabular-nums text-neutral-900 dark:text-zinc-100">
                      {acc.maskedAccountNumber}
                    </TableCell>
                    <TableCell className="font-mono text-neutral-600 dark:text-zinc-400 text-caption font-semibold">
                      {acc.ifscSwift}
                    </TableCell>
                    <TableCell className="text-caption font-medium text-neutral-700 dark:text-zinc-300">
                      {acc.accountType}
                    </TableCell>
                    <TableCell className="text-center">
                      {acc.isPrimary ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          <Star size={10} className="fill-indigo-600 text-indigo-600" />
                          <span>Primary</span>
                        </span>
                      ) : (
                        <span className="text-micro text-neutral-400 font-mono">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-micro font-semibold border ${
                          acc.status === "VERIFIED"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60"
                            : acc.status === "PENDING"
                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60"
                            : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60"
                        }`}
                      >
                        {acc.status === "VERIFIED" ? (
                          <>
                            <CheckCircle2 size={11} />
                            <span>Verified</span>
                          </>
                        ) : acc.status === "PENDING" ? (
                          <>
                            <Clock size={11} />
                            <span>Pending</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={11} />
                            <span>Failed</span>
                          </>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleOpenDrawer(acc)}
                        className="p-1.5 text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors"
                        title="View Account Details"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Row Drawer for Account Details & Verification Audit */}
      <Sheet
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={activeAccount?.supplierName ?? "Bank Account"}
        subtitle={`Masked Account: ${activeAccount?.maskedAccountNumber ?? ""}`}
        width="max-w-md"
      >
        {activeAccount && (
          <div className="p-6 space-y-6">
            {/* Status Strip & Penny-Drop Action */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-200/80 dark:border-zinc-800 bg-neutral-50/70 dark:bg-zinc-850">
              <div className="space-y-0.5">
                <span className="text-micro uppercase font-semibold text-neutral-400">
                  Verification Status
                </span>
                <p className="text-body-sm font-semibold text-neutral-900 dark:text-zinc-100">
                  {activeAccount.status === "VERIFIED"
                    ? "NPCI Penny-Drop Confirmed"
                    : activeAccount.status === "PENDING"
                    ? "Awaiting Micro-Deposit Match"
                    : "GSTIN Name Mismatch Flagged"}
                </p>
              </div>
              {activeAccount.status !== "VERIFIED" && (
                <Button
                  size="sm"
                  onClick={() => handleVerify(activeAccount)}
                  disabled={verifying}
                  className="gap-1.5 text-micro"
                >
                  <RotateCw size={12} className={verifying ? "animate-spin" : ""} />
                  <span>Verify Now</span>
                </Button>
              )}
            </div>

            {/* Account Details */}
            <div className="space-y-3">
              <h4 className="text-micro font-bold uppercase tracking-wider text-neutral-400">
                Banking Coordinates
              </h4>
              <div className="grid grid-cols-2 gap-3 text-caption">
                <div className="p-3 rounded-lg border border-neutral-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <span className="text-neutral-400 block text-micro">Bank Name</span>
                  <span className="font-semibold text-neutral-800 dark:text-zinc-200 mt-0.5 block">
                    {activeAccount.bankName}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-neutral-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <span className="text-neutral-400 block text-micro">IFSC / SWIFT</span>
                  <span className="font-mono font-semibold text-neutral-800 dark:text-zinc-200 mt-0.5 block">
                    {activeAccount.ifscSwift}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-neutral-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <span className="text-neutral-400 block text-micro">Account Type</span>
                  <span className="font-semibold text-neutral-800 dark:text-zinc-200 mt-0.5 block">
                    {activeAccount.accountType}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-neutral-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <span className="text-neutral-400 block text-micro">Primary Settlement</span>
                  <span className="font-semibold text-neutral-800 dark:text-zinc-200 mt-0.5 block">
                    {activeAccount.isPrimary ? "Yes (Default)" : "Secondary"}
                  </span>
                </div>
              </div>
            </div>

            {/* Verification Audit Trail */}
            <div className="space-y-2">
              <h4 className="text-micro font-bold uppercase tracking-wider text-neutral-400">
                Fraud Prevention &amp; Audit Trail
              </h4>
              <div className="p-3.5 rounded-lg border border-neutral-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2 text-caption">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Penny-Drop Ref:</span>
                  <span className="font-mono font-semibold text-neutral-800 dark:text-zinc-200">
                    {activeAccount.pennyDropRef || "Not executed"}
                  </span>
                </div>
                {activeAccount.verifiedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Verification Timestamp:</span>
                    <span className="font-mono text-neutral-800 dark:text-zinc-200">
                      {formatDate(activeAccount.verifiedAt)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Account Masking:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    PCI-DSS / RBI Compliant
                  </span>
                </div>
              </div>
            </div>

            {/* Primary Account Switch */}
            {!activeAccount.isPrimary && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  className="w-full justify-center gap-1.5"
                  onClick={() => handleTogglePrimary(activeAccount)}
                >
                  <Star size={14} />
                  <span>Set as Primary Disbursement Account</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </Sheet>

      {/* Add Bank Account Modal */}
      <Dialog
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Supplier Bank Account"
        description="Register and initiate penny-drop verification for automated payment releases."
        size="lg"
      >
        <form onSubmit={handleCreateAccount} className="space-y-4 pt-2">
          <Input
            id="bank-form-supplier"
            label="Supplier Legal / Display Name *"
            placeholder="e.g. Tata Steel Limited"
            value={formSupplier}
            onChange={(e) => setFormSupplier(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="bank-form-acc"
              label="Account Number *"
              placeholder="e.g. 0000003847291048"
              value={formAccNumber}
              onChange={(e) => setFormAccNumber(e.target.value)}
              required
            />
            <Input
              id="bank-form-bank"
              label="Bank Name *"
              placeholder="e.g. State Bank of India"
              value={formBankName}
              onChange={(e) => setFormBankName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="bank-form-ifsc"
              label="IFSC / SWIFT Code *"
              placeholder="e.g. SBIN0000691"
              value={formIfsc}
              onChange={(e) => setFormIfsc(e.target.value)}
              required
            />
            <div className="space-y-1">
              <label htmlFor="bank-form-type" className="text-caption font-semibold text-neutral-800 dark:text-zinc-200">
                Account Type *
              </label>
              <Select
                id="bank-form-type"
                value={formAccType}
                onChange={(e) => setFormAccType(e.target.value as "CURRENT" | "SAVINGS" | "ESCROW")}
                options={[
                  { value: "CURRENT", label: "Current Account" },
                  { value: "SAVINGS", label: "Savings Account" },
                  { value: "ESCROW", label: "Escrow Account" },
                ]}
              />
            </div>
          </div>

          <Input
            id="bank-form-branch"
            label="Branch Name / Address (Optional)"
            placeholder="e.g. Corporate Accounts Group, Mumbai"
            value={formBranch}
            onChange={(e) => setFormBranch(e.target.value)}
          />

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={formIsPrimary}
              onChange={(e) => setFormIsPrimary(e.target.checked)}
              className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-body-sm text-neutral-800 dark:text-zinc-200">
              Set as primary disbursement account for this supplier
            </span>
          </label>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAddModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Registering..." : "Register & Queue Verification"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
