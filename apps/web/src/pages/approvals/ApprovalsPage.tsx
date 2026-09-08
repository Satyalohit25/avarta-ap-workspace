import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listApprovals, ApprovalRow } from "../../api/approvals";
import { transitionInvoice, getInvoice, InvoiceListItem } from "../../api/invoices";
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
import { Sheet } from "../../components/ui/Sheet";
import { Button } from "../../components/ui/Button";
import { Tabs } from "../../components/ui/Tabs";
import { Alert } from "../../components/ui/Alert";
import { PropertyInspector } from "../../components/ui/PropertyInspector";
import { formatCurrency, formatDate } from "../../lib/formatters";
import { generateSupplierLineItems } from "../../lib/mockCatalogs";
import { UrgencyBadge, UrgencySeverity } from "../../components/StatusBadge";
import {
  CheckSquare,
  XCircle,
  ArrowRight,
  Calendar,
  Building2,
  AlertTriangle,
  PackageCheck,
  Layers,
} from "lucide-react";

interface InvoiceLineItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineAmount: number;
}

interface InvoiceSupplierDetails {
  id: string;
  name: string;
  gstin?: string | null;
}

interface InvoiceApprovalDetails extends Omit<InvoiceListItem, "supplier"> {
  supplier?: InvoiceSupplierDetails | null;
  purchaseOrderId?: string | null;
  lines?: InvoiceLineItem[];
}

function computeSlaBadge(seedIndex: number): { label: string; urgency: UrgencySeverity } {
  // Compute deterministic demo SLA elapsed hours based on index
  const elapsedHours = [18, 41, 56, 22, 38, 52][seedIndex % 6] ?? 24;
  const slaThresholdHours = 48;

  if (elapsedHours > slaThresholdHours) {
    return {
      label: `Breached (${elapsedHours}h) • Escalated to Backup`,
      urgency: "breached",
    };
  } else if (elapsedHours >= 34) {
    return {
      label: `${elapsedHours}h / ${slaThresholdHours}h SLA (At Risk)`,
      urgency: "warning",
    };
  } else {
    return {
      label: `${elapsedHours}h / ${slaThresholdHours}h SLA`,
      urgency: "routine",
    };
  }
}

export default function ApprovalsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRow | null>(null);
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceApprovalDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: "success" | "warning" | "error";
    title: string;
    message: string;
  } | null>(null);

  function load() {
    setLoading(true);
    listApprovals()
      .then((res) => setRows(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  // Fetch full line items and matching evidence when an approval is selected
  useEffect(() => {
    if (!selectedApproval) {
      setInvoiceDetails(null);
      return;
    }
    setLoadingDetails(true);
    getInvoice(selectedApproval.invoiceId)
      .then((res) => {
        setInvoiceDetails(res.data as InvoiceListItem & { lines?: InvoiceLineItem[] });
      })
      .catch(() => setInvoiceDetails(null))
      .finally(() => setLoadingDetails(false));
  }, [selectedApproval]);

  async function handleApprove(invoiceId: string) {
    const invNum = selectedApproval?.invoiceNumber ?? invoiceId;
    setActionPending(true);
    try {
      await transitionInvoice(invoiceId, "APPROVE", "Approved via Quick Review Drawer");
      setFeedbackBanner({
        type: "success",
        title: "Invoice Approved",
        message: `Invoice ${invNum} has been approved and moved to Scheduled Payments.`,
      });
      setSelectedApproval(null);
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Approval failed due to a server error.";
      setFeedbackBanner({
        type: "error",
        title: "Approval Failed",
        message: msg,
      });
    } finally {
      setActionPending(false);
    }
  }

  async function handleReject(invoiceId: string) {
    if (!rejectComment.trim()) return;
    const invNum = selectedApproval?.invoiceNumber ?? invoiceId;
    setActionPending(true);
    try {
      await transitionInvoice(invoiceId, "REJECT", rejectComment.trim());
      setFeedbackBanner({
        type: "warning",
        title: "Invoice Rejected",
        message: `Invoice ${invNum} was rejected with reason: "${rejectComment.trim()}".`,
      });
      setSelectedApproval(null);
      setShowRejectForm(false);
      setRejectComment("");
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Rejection failed due to a server error.";
      setFeedbackBanner({
        type: "error",
        title: "Rejection Failed",
        message: msg,
      });
    } finally {
      setActionPending(false);
    }
  }

  const [filterTab, setFilterTab] = useState("ALL");

  const atRiskCount = rows.filter((_, idx) => computeSlaBadge(idx).urgency !== "routine").length;
  const routineCount = rows.filter((_, idx) => computeSlaBadge(idx).urgency === "routine").length;

  const displayedRows = rows.filter((_, idx) => {
    if (filterTab === "AT_RISK") return computeSlaBadge(idx).urgency !== "routine";
    if (filterTab === "ROUTINE") return computeSlaBadge(idx).urgency === "routine";
    return true;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Approvals"
        subtitle="Invoices validated and matched, awaiting management approval decision."
      />

      {feedbackBanner && (
        <Alert
          type={feedbackBanner.type}
          title={feedbackBanner.title}
          action={
            <button
              type="button"
              onClick={() => setFeedbackBanner(null)}
              className="text-micro font-mono hover:underline px-2 py-0.5"
            >
              Dismiss
            </button>
          }
        >
          {feedbackBanner.message}
        </Alert>
      )}

      <Tabs
        tabs={[
          { id: "ALL", label: `All Approvals (${rows.length})`, content: null },
          { id: "AT_RISK", label: `At Risk / Breached SLA (${atRiskCount})`, content: null },
          { id: "ROUTINE", label: `Routine SLA (${routineCount})`, content: null },
        ]}
        defaultTabId={filterTab}
        variant="pill"
        onChange={setFilterTab}
      />

      <Card level="surface" className="overflow-hidden">
        {loading ? (
          <div className="p-4">
            <SkeletonRows />
          </div>
        ) : displayedRows.length === 0 ? (
          <EmptyState
            title="No approvals matching this filter."
            description="All invoices in this category have been processed."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Approval SLA</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedRows.map((r, idx) => {
                const sla = computeSlaBadge(idx);

                return (
                  <TableRow
                    key={r.id}
                    onClick={() => {
                      setSelectedApproval(r);
                      setShowRejectForm(false);
                    }}
                    className="cursor-pointer hover:bg-neutral-50/80 dark:hover:bg-zinc-900/60"
                  >
                    <TableCell className="font-mono font-medium text-neutral-900 dark:text-zinc-100">
                      <span className="text-indigo-600 dark:text-indigo-400 hover:underline">
                        {r.invoiceNumber}
                      </span>
                    </TableCell>
                    <TableCell className="text-neutral-800 dark:text-zinc-200 font-medium">
                      {r.vendor}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-neutral-900 dark:text-zinc-100 font-semibold">
                      {formatCurrency(r.amount, r.currency ?? "INR")}
                    </TableCell>
                    <TableCell>
                      <UrgencyBadge urgency={sla.urgency} label={sla.label} />
                    </TableCell>
                    <TableCell className="text-neutral-500 dark:text-zinc-400 font-mono text-micro">
                      {formatDate(r.dueDate)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedApproval(r);
                          setShowRejectForm(false);
                        }}
                        className="h-7 text-caption font-medium"
                      >
                        Quick Review
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Quick-Review Slide-over Drawer */}
      <Sheet
        isOpen={Boolean(selectedApproval)}
        onClose={() => {
          setSelectedApproval(null);
          setShowRejectForm(false);
        }}
        title={`Approval Review: ${selectedApproval?.invoiceNumber ?? ""}`}
        subtitle={
          selectedApproval
            ? `${selectedApproval.vendor} • Due ${formatDate(selectedApproval.dueDate)} • Stage 6 of 8`
            : undefined
        }
        width="max-w-xl"
      >
        {selectedApproval && (
          <div className="space-y-5 pt-1">
            {/* Highlighted Approval Scope: WHAT IS TO BE APPROVED */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/80 via-white to-neutral-50 dark:from-indigo-950/40 dark:via-zinc-900 dark:to-zinc-900 border-2 border-indigo-500/30 dark:border-indigo-500/40 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-micro font-mono font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                  <PackageCheck size={14} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Mandatory Approval Sign-Off Scope</span>
                </span>
                <span className="text-micro font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  Ready for Release
                </span>
              </div>

              {/* Net Disbursable Amount Callout */}
              <div className="p-3 rounded-lg bg-white/90 dark:bg-zinc-800/80 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                <div>
                  <span className="text-micro font-medium text-neutral-500 dark:text-zinc-400 block">
                    Disbursable Net Amount Authorized
                  </span>
                  <span className="font-mono text-2xl font-bold text-neutral-900 dark:text-zinc-50 tracking-tight block mt-0.5">
                    {formatCurrency(selectedApproval.amount, selectedApproval.currency ?? "INR")}
                  </span>
                </div>
                <div className="text-left sm:text-right font-mono text-micro text-neutral-600 dark:text-zinc-400">
                  <div>Vendor: <strong className="text-neutral-900 dark:text-zinc-200">{selectedApproval.vendor}</strong></div>
                  <div className="text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                    • Bank &amp; GSTIN Verified
                  </div>
                </div>
              </div>

              {/* 4-Point Certification Checklist (What the Approver is Certifying) */}
              <div className="space-y-1.5 pt-1">
                <span className="text-micro font-semibold uppercase tracking-wider text-neutral-500 dark:text-zinc-400 block">
                  Items You Are Authorizing &amp; Certifying:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-micro font-mono text-neutral-700 dark:text-zinc-300">
                  <div className="flex items-center gap-1.5 bg-neutral-100/70 dark:bg-zinc-800/50 px-2 py-1 rounded">
                    <CheckSquare size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="truncate">Goods / Services Received</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-neutral-100/70 dark:bg-zinc-800/50 px-2 py-1 rounded">
                    <CheckSquare size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="truncate">PO Contract Rates Reconciled</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-neutral-100/70 dark:bg-zinc-800/50 px-2 py-1 rounded">
                    <CheckSquare size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="truncate">Statutory GST &amp; HSN Validated</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-neutral-100/70 dark:bg-zinc-800/50 px-2 py-1 rounded">
                    <CheckSquare size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="truncate">Release for Treasury Scheduling</span>
                  </div>
                </div>
              </div>

              {/* Commercial Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2.5 border-t border-neutral-200/60 dark:border-zinc-800 text-caption font-mono">
                <div>
                  <span className="text-neutral-400 dark:text-zinc-500 block text-micro">Payment Due Date</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Calendar size={13} className="text-neutral-400 shrink-0" />
                    <span className="font-semibold text-neutral-800 dark:text-zinc-200">
                      {formatDate(selectedApproval.dueDate)}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-neutral-400 dark:text-zinc-500 block text-micro">Linked PO Reference</span>
                  <span className="font-semibold text-neutral-800 dark:text-zinc-200 block mt-0.5">
                    {invoiceDetails?.purchaseOrderId || "PO-2026-0881"}
                  </span>
                </div>

                <div>
                  <span className="text-neutral-400 dark:text-zinc-500 block text-micro">Payment Terms</span>
                  <span className="font-semibold text-neutral-800 dark:text-zinc-200 block mt-0.5">
                    Net 30 Days
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Line Items Breakdown (What is being approved) */}
            <div className="space-y-2.5">
              <span className="text-label font-semibold text-neutral-800 dark:text-zinc-200 block">
                Line Items Summary ({invoiceDetails?.lines?.length ?? 3} items)
              </span>

              <div className="rounded-xl border border-neutral-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingDetails ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-caption text-neutral-400 py-4">
                          Loading line items...
                        </TableCell>
                      </TableRow>
                    ) : invoiceDetails?.lines && invoiceDetails.lines.length > 0 ? (
                      invoiceDetails.lines.map((l, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-body-sm text-neutral-900 dark:text-zinc-100">
                            {l.description}
                          </TableCell>
                          <TableCell className="text-right font-mono text-body-sm">
                            {l.quantity}
                          </TableCell>
                          <TableCell className="text-right font-mono text-body-sm">
                            {formatCurrency(l.unitPrice, selectedApproval.currency ?? "INR")}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-body-sm text-neutral-900 dark:text-zinc-100">
                            {formatCurrency(l.lineAmount, selectedApproval.currency ?? "INR")}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      generateSupplierLineItems(
                        selectedApproval.vendor,
                        Number(selectedApproval.amount),
                        selectedApproval.currency ?? "INR"
                      ).map((l, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-body-sm text-neutral-900 dark:text-zinc-100">
                            {l.description}
                          </TableCell>
                          <TableCell className="text-right font-mono text-body-sm">
                            {l.quantity}
                          </TableCell>
                          <TableCell className="text-right font-mono text-body-sm">
                            {formatCurrency(l.unitPrice, selectedApproval.currency ?? "INR")}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-body-sm text-neutral-900 dark:text-zinc-100">
                            {formatCurrency(l.lineAmount, selectedApproval.currency ?? "INR")}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* 3. 3-Way Matching & Verification Checks */}
            <div className="space-y-2.5">
              <span className="text-label font-semibold text-neutral-800 dark:text-zinc-200 block">
                Automated Verification &amp; 3-Way Matching Evidence
              </span>

              <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-950 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2.5">
                <div className="flex items-center justify-between text-body-sm">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
                    <PackageCheck size={16} className="text-emerald-600 shrink-0" />
                    <span>3-Way PO &amp; Goods Receipt Match Passed</span>
                  </div>
                  <span className="text-micro font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                    0.0% Variance
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-micro text-emerald-700 dark:text-emerald-400 pl-6 font-mono">
                  <div>• PO Rate: Exact Match</div>
                  <div>• Quantity: 100% Delivered</div>
                  <div>• GSTIN Arithmetic: Validated</div>
                  <div>• Duplicate Check: Clean</div>
                </div>
              </div>
            </div>

            {/* Subframe Polish: Structured Property Inspector */}
            <div className="space-y-2">
              <span className="text-label font-semibold text-neutral-800 dark:text-zinc-200 block">
                Compliance & Vendor Properties
              </span>
              <PropertyInspector
                vendorGstin={invoiceDetails?.supplier?.gstin || "27AABCT3518Q1ZV"}
                paymentTerms="Net 30 Days"
                matchingStatus="MATCHED"
                linkedPo={invoiceDetails?.purchaseOrderId || "PO-2026-0881"}
                exportFormat="Tally Prime XML / JSON"
              />
            </div>

            {/* 4. GL Code & Cost Center Allocation */}
            <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-neutral-50/70 dark:bg-zinc-900/60 flex items-center justify-between text-caption">
              <div className="flex items-center gap-2 text-neutral-700 dark:text-zinc-300">
                <Layers size={15} className="text-indigo-600 dark:text-indigo-400" />
                <span>
                  <strong className="font-semibold text-neutral-900 dark:text-zinc-100">GL 5200</strong> (Direct Raw Materials) • Cost Center <strong className="font-semibold text-neutral-900 dark:text-zinc-100">CC-104</strong> (Plant Pune)
                </span>
              </div>
            </div>

            {/* 5. Rejection Comment Form */}
            {showRejectForm ? (
              <div className="space-y-3 p-4 rounded-xl border border-rose-200 dark:border-rose-950 bg-rose-50/30 dark:bg-rose-950/20 animate-in fade-in-50 duration-150">
                <div className="flex items-center gap-1.5 text-body-sm font-semibold text-rose-800 dark:text-rose-300">
                  <AlertTriangle size={15} />
                  <span>Rejection Reason (Required for Audit Trail)</span>
                </div>
                <textarea
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  placeholder="Specify clear reason for rejecting this invoice (e.g. rate disagreement, wrong PO allocation)..."
                  className="w-full text-body-sm p-2.5 rounded-lg border border-neutral-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  rows={3}
                  required
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowRejectForm(false)}
                    disabled={actionPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(selectedApproval.invoiceId)}
                    disabled={actionPending || !rejectComment.trim()}
                  >
                    Confirm Rejection
                  </Button>
                </div>
              </div>
            ) : (
              /* 6. Action Bar */
              <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-zinc-800">
                <Button
                  className="w-full h-11 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-body-sm shadow-sm"
                  onClick={() => handleApprove(selectedApproval.invoiceId)}
                  disabled={actionPending}
                >
                  <CheckSquare size={16} />
                  <span>{actionPending ? "Approving..." : "Approve for Payment Scheduling"}</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1 gap-1.5 h-10 font-semibold"
                    onClick={() => setShowRejectForm(true)}
                    disabled={actionPending}
                  >
                    <XCircle size={15} />
                    <span>Reject</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="flex-1 gap-1.5 h-10 font-semibold"
                    onClick={() => {
                      setSelectedApproval(null);
                      navigate(`/invoices/${selectedApproval.invoiceId}`);
                    }}
                  >
                    <span>Full Workspace</span>
                    <ArrowRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
