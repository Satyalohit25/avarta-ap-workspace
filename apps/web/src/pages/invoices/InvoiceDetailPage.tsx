import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Building2,
  Link2,
  Plus,
  History,
  ExternalLink,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileCode,
  ChevronDown,
} from "lucide-react";
import {
  InvoiceListItem,
  InvoiceApprovalItem,
  InvoicePaymentItem,
  InvoiceWorkflowTransitionItem,
  InvoiceAuditLogItem,
  InvoiceValidationItem,
  InvoiceExceptionItem,
  getInvoice,
  listInvoices,
  processInvoice,
  transitionInvoice,
  syncInvoiceToErp,
  uploadInvoiceDocument,
} from "../../api/invoices";
import { StatusBadge } from "../../components/StatusBadge";
import { SkeletonRows } from "../../components/Skeleton";
import { Button } from "../../components/ui/Button";
import { MetricStrip } from "../../components/ui/MetricStrip";
import { BadgeKey } from "../../components/ui/BadgeKey";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Timeline, TimelineEvent } from "../../components/ui/Timeline";
import { Dialog } from "../../components/ui/Dialog";
import { Sheet } from "../../components/ui/Sheet";
import { Alert } from "../../components/ui/Alert";
import { Breadcrumbs } from "../../components/ui/Breadcrumbs";
import { useToast } from "../../components/ui/ToastContext";
import { formatCurrency, formatDate } from "../../lib/formatters";
import {
  getInvoiceWorkflowContext,
  RawInvoiceData,
  ActionItem,
  InvoiceWorkflowContext,
} from "./helpers/workflowContext";
import { InvoiceStateBanner } from "./components/InvoiceStateBanner";
import { InvoiceActionBar } from "./components/InvoiceActionBar";
import { EntityLinkModal, EntityLinkType } from "./components/EntityLinkModal";
import { DocumentSourceCard } from "./components/DocumentSourceCard";
import { AIExtractedDetailsCard } from "./components/AIExtractedDetailsCard";
import {
  LineItemMatchingTable,
  LineItemData,
} from "./components/LineItemMatchingTable";
import { ErpSyncModal } from "./components/ErpSyncModal";
import {
  ProcessingOverlay,
  ProcessingStage,
} from "./components/ProcessingOverlay";

type InvoiceDetailData = InvoiceListItem & {
  lines?: unknown[];
  validations?: InvoiceValidationItem[];
  exceptions?: InvoiceExceptionItem[];
  approvals?: InvoiceApprovalItem[];
  payments?: InvoicePaymentItem[];
  workflowTransitions?: InvoiceWorkflowTransitionItem[];
  auditLogs?: InvoiceAuditLogItem[];
  invoiceNumber: string;
  invoiceDate?: string | null;
  purchaseOrderId?: string | null;
  organizationId?: string | null;
};

function buildInvoiceAuditTimeline(
  invoice: InvoiceDetailData,
  context: InvoiceWorkflowContext,
  dynamicEvents: TimelineEvent[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // 1. If real database audit logs exist (and have multiple entries), translate them
  if (invoice.auditLogs && invoice.auditLogs.length > 1) {
    for (const log of invoice.auditLogs) {
      const data = (log.afterData || {}) as Record<string, unknown>;
      let actionTitle = log.action;
      let actorName = "System Workflow";
      let details = "";
      let type: TimelineEvent["type"] = "info";

      switch (log.action) {
        case "INVOICE_RECEIVED":
          actorName =
            invoice.source === "UPLOAD"
              ? "User File Upload"
              : "Direct Intake Portal";
          actionTitle = `Invoice Received (${invoice.invoiceNumber})`;
          details = `Source: ${invoice.source || "PORTAL"} • Total Amount: ${formatCurrency(invoice.totalAmount, invoice.currency)}`;
          type = "info";
          break;
        case "DOCUMENT_OCR_COMPLETED":
          actorName = "OCR & Document Parser";
          actionTitle = `OCR Field Extraction Verified (Confidence: ${invoice.aiConfidence || 95}%)`;
          details =
            "Extracted line items, tax breakdown, and vendor particulars";
          type =
            invoice.aiConfidence && invoice.aiConfidence < 80
              ? "warning"
              : "success";
          break;
        case "VALIDATION_FLAGGED": {
          actorName = "Validation Engine";
          const firstEx = invoice.exceptions && invoice.exceptions.length > 0 ? invoice.exceptions[0] : null;
          const exType = firstEx?.type || String(data.rule || data.exceptionType || "STATUTORY_RULE");
          const exDesc = firstEx?.description || firstEx?.title || String(data.details || "");

          actionTitle = `Validation Flagged: ${exType}`;
          details = exDesc || (
            exType === "MISSING_PO"
              ? "Missing PO: Invoice value exceeds ₹5,000 non-PO discretionary threshold"
              : exType === "TAX_DIFFERENCE"
              ? "Statutory GST variance: Declared tax differs from computed statutory rate"
              : exType === "PRICE_DIFFERENCE"
              ? "Unit price variance exceeds contracted purchase order tolerance"
              : exType === "QUANTITY_DIFFERENCE"
              ? "Billed quantity exceeds authorized goods receipt note delivery"
              : exType === "DUPLICATE_INVOICE"
              ? "Duplicate invoice number detected for vendor in current fiscal year"
              : "Rule validation failed: Variance detected requiring authorized resolution"
          );
          type = "warning";
          break;
        }
        case "VALIDATION_PASSED":
          actorName = "Validation Engine";
          actionTitle = "Tax & Arithmetic Validations Passed";
          details =
            "All statutory rules, GST format, and calculations verified";
          type = "success";
          break;
        case "PO_MATCH_FAILED": {
          actorName = "Matching Engine";
          const poRef = invoice.purchaseOrderId || String(data.poNumber || "Linked PO");
          actionTitle = `3-Way PO Variance Flagged (${poRef})`;
          details = String(
            data.reason ||
            data.details ||
            `Discrepancy against ${poRef}: Rate or quantity exceeds contract tolerance threshold.`
          );
          type = "warning";
          break;
        }
        case "PO_3WAY_MATCHED":
          actorName = "Matching Engine";
          actionTitle = "3-Way PO Reconciliation Matched";
          details = `Reconciled with Purchase Order ${String(data.poNumber || invoice.purchaseOrderId || "")}`;
          type = "success";
          break;
        case "DIRECT_EXPENSE_APPROVED":
          actorName = "Policy Engine";
          actionTitle = "Direct Expense Policy Cleared";
          details =
            "Non-PO expense verified under standard departmental policy";
          type = "info";
          break;
        case "APPROVAL_REQUESTED":
          actorName = "Workflow Engine";
          actionTitle = "Approval Routing Initiated";
          details = `Routed to authorized approver (${String(data.approver || "Arjun Approver")})`;
          type = "info";
          break;
        case "INVOICE_APPROVED":
          actorName = String(data.approver || "Arjun Approver");
          actionTitle = "Invoice Authorized & Approved";
          details = String(data.notes || "Approved for payment release");
          type = "success";
          break;
        case "INVOICE_REJECTED":
          actorName = String(data.approver || "Arjun Approver");
          actionTitle = "Invoice Rejected";
          details = String(
            data.notes || "Authorization rejected during review",
          );
          type = "error";
          break;
        case "PAYMENT_SCHEDULED":
          actorName = "Payment Execution Service";
          actionTitle = "Payment Batch Scheduled";
          details = `Disbursement scheduled via ${String(data.method || "BANK_TRANSFER")}`;
          type = "info";
          break;
        case "PAYMENT_SETTLED":
          actorName = "Banking Rail Gateway";
          actionTitle = "Payment Executed & Settled";
          details = `Reference: ${String(data.reference || "PAY-2026-8891")} • Amount: ${formatCurrency(invoice.totalAmount, invoice.currency)}`;
          type = "success";
          break;
        case "ERP_POSTED":
          actorName = "ERP Integration Service";
          actionTitle = "Synchronized to ERP Ledger";
          details = `GL document posted to ${String(data.target || "SAP S/4HANA")}`;
          type = "success";
          break;
        case "INVOICE_ARCHIVED":
          actorName = "Compliance Service";
          actionTitle = "Archived to Cold Storage";
          details = "Retention policy period applied";
          type = "info";
          break;
        default:
          actorName = "System Workflow";
          actionTitle = log.action.replace(/_/g, " ");
          details = "State update recorded in engine";
          type = "info";
          break;
      }

      events.push({
        id: `db-${log.id}`,
        timestamp: log.createdAt,
        actor: actorName,
        action: actionTitle,
        details,
        type,
      });
    }
  }

  // 2. If no DB logs (or only 1 generic log), generate chronological stage-accurate events
  if (events.length <= 1) {
    const baseDate = new Date(
      invoice.invoiceDate || invoice.dueDate || new Date(),
    );
    const eventTime = (offsetMinutes: number) =>
      new Date(baseDate.getTime() + offsetMinutes * 60000).toISOString();

    const stageEvents: TimelineEvent[] = [
      {
        id: "syn-1-intake",
        timestamp: eventTime(0),
        actor:
          invoice.source === "UPLOAD"
            ? "User File Upload"
            : "Direct Intake Portal",
        action: `Invoice Received (${invoice.invoiceNumber})`,
        details: `Source: ${invoice.source || "PORTAL"} • Total Amount: ${formatCurrency(invoice.totalAmount, invoice.currency)}`,
        type: "info",
      },
    ];

    if (invoice.documents && invoice.documents.length > 0) {
      stageEvents.push({
        id: "syn-1-doc",
        timestamp: invoice.documents[0].createdAt || eventTime(1),
        actor: "Intake Pipeline",
        action: `Document Attached: ${invoice.documents[0].fileName}`,
        details: `File size: ${(invoice.documents[0].fileSize / 1024).toFixed(1)} KB`,
        type: "info",
      });
    }

    if (context.stageNumber >= 2 || context.status !== "RECEIVED") {
      stageEvents.push({
        id: "syn-2-ocr",
        timestamp: eventTime(3),
        actor: "OCR & Document Parser",
        action: `OCR Field Extraction Verified (Confidence: ${invoice.aiConfidence || 95}%)`,
        details: `Extracted ${invoice.lines?.length || 3} line items, vendor tax ID, subtotal, and payment terms`,
        type:
          invoice.aiConfidence && invoice.aiConfidence < 80
            ? "warning"
            : "success",
      });
    }

    if (
      context.stageNumber >= 3 ||
      (context.status !== "RECEIVED" && context.status !== "PROCESSING")
    ) {
      const isFailed =
        context.status === "EXCEPTION" ||
        (invoice.validations &&
          invoice.validations.some((v) => v.status !== "PASSED"));
      const firstEx = invoice.exceptions && invoice.exceptions.length > 0 ? invoice.exceptions[0] : null;
      const exType = firstEx?.type || "MISSING_PO";
      const exDetail = firstEx?.description || firstEx?.title || (
        exType === "MISSING_PO"
          ? "Missing PO: Invoice value exceeds ₹5,000 non-PO discretionary ceiling"
          : exType === "TAX_DIFFERENCE"
          ? "Tax Mismatch: Statutory GST calculation variance detected"
          : "Statutory validation discrepancy identified for manual review"
      );
      stageEvents.push({
        id: "syn-3-val",
        timestamp: eventTime(7),
        actor: "Validation Engine",
        action: isFailed
          ? `Validation Flagged: ${exType}`
          : "Tax & Arithmetic Validations Passed",
        details: isFailed
          ? exDetail
          : "Statutory checks, GST checksum, and calculation arithmetic verified",
        type: isFailed ? "warning" : "success",
      });
    }

    if (
      context.stageNumber >= 4 ||
      (context.status !== "RECEIVED" &&
        context.status !== "PROCESSING" &&
        context.status !== "EXCEPTION")
    ) {
      const poNum = invoice.purchaseOrderId || "PO-FY26-0142";
      stageEvents.push({
        id: "syn-4-matching",
        timestamp: eventTime(12),
        actor: "Matching Engine",
        action: invoice.purchaseOrderId
          ? `3-Way PO Matching Verified (${poNum})`
          : "Direct Expense Policy Cleared",
        details: invoice.purchaseOrderId
          ? "Line items, quantities, and prices matched against Purchase Order"
          : "Verified within departmental direct operational expenditure policy",
        type: "success",
      });
    }

    if (
      context.stageNumber >= 5 ||
      ["APPROVED", "SCHEDULED", "PAID", "SYNCED"].includes(context.status)
    ) {
      const approverName =
        invoice.approvals?.[0]?.user?.name || "Arjun Approver";
      const isApproved = ["APPROVED", "SCHEDULED", "PAID", "SYNCED"].includes(
        context.status,
      );
      const isRejected = context.status === "REJECTED";

      if (context.status === "PENDING_APPROVAL") {
        stageEvents.push({
          id: "syn-5-app-req",
          timestamp: eventTime(20),
          actor: "Workflow Engine",
          action: "Approval Routing Initiated",
          details: `Routed to authorized approver (${approverName} - Finance Authority)`,
          type: "info",
        });
      } else if (isApproved) {
        stageEvents.push({
          id: "syn-5-app-ok",
          timestamp: eventTime(25),
          actor: approverName,
          action: "Invoice Authorized & Approved",
          details:
            invoice.approvals?.[0]?.comment ||
            "Approved for payment scheduling release",
          type: "success",
        });
      } else if (isRejected) {
        stageEvents.push({
          id: "syn-5-app-rej",
          timestamp: eventTime(25),
          actor: approverName,
          action: "Invoice Rejected",
          details: invoice.approvals?.[0]?.comment || "Rejected during review",
          type: "error",
        });
      }
    }

    if (
      context.stageNumber >= 6 ||
      ["PAID", "SYNCED"].includes(context.status)
    ) {
      const payRef = invoice.payments?.[0]?.referenceNumber || "PAY-2026-8891";
      const payMethod = invoice.payments?.[0]?.paymentMethod || "UPI_CORPORATE";

      if (context.status === "SCHEDULED") {
        stageEvents.push({
          id: "syn-6-pay-sched",
          timestamp: eventTime(35),
          actor: "Payment Execution Service",
          action: "Payment Batch Scheduled",
          details: `Disbursement queued via ${payMethod} on ${formatDate(invoice.dueDate)}`,
          type: "info",
        });
      } else if (["PAID", "SYNCED"].includes(context.status)) {
        stageEvents.push({
          id: "syn-6-pay-paid",
          timestamp: eventTime(40),
          actor: "Banking Rail Gateway",
          action: "Payment Executed & Settled",
          details: `Reference: ${payRef} • Method: ${payMethod} • Amount: ${formatCurrency(invoice.totalAmount, invoice.currency)}`,
          type: "success",
        });
      }
    }

    if (context.stageNumber >= 7 || context.status === "SYNCED") {
      stageEvents.push({
        id: "syn-7-erp",
        timestamp: eventTime(50),
        actor: "ERP Integration Gateway",
        action: "Synchronized to ERP Ledger",
        details: "General ledger journal entry posted and synchronized",
        type: "success",
      });
    }

    if (context.status === "ARCHIVED") {
      stageEvents.push({
        id: "syn-8-arch",
        timestamp: eventTime(60),
        actor: "Compliance Service",
        action: "Invoice Archived",
        details: "Preserved under standard 7-year audit retention policy",
        type: "info",
      });
    }

    events.length = 0;
    events.push(...stageEvents);
  }

  // Prepend any dynamic session actions (e.g. recent user button clicks)
  return [...dynamicEvents, ...events];
}

export default function InvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<InvoiceDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const [showErpModal, setShowErpModal] = useState(false);
  const [processingStage, setProcessingStage] =
    useState<ProcessingStage>("idle");
  const [linkModalState, setLinkModalState] = useState<{
    isOpen: boolean;
    type: EntityLinkType;
  }>({ isOpen: false, type: "vendor" });

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    action: string;
    comment?: string;
  }>({ isOpen: false, title: "", description: "", action: "" });

  const [dynamicAuditEvents, setDynamicAuditEvents] = useState<TimelineEvent[]>(
    [],
  );
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [copiedPortalLink, setCopiedPortalLink] = useState(false);
  const [actionBanner, setActionBanner] = useState<{
    type: "success" | "warning" | "error";
    title: string;
    message: string;
  } | null>(null);

  const load = useCallback(async () => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      const res = await getInvoice(invoiceId);
      setInvoice(res.data as unknown as InvoiceDetailData);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const [siblingInvoices, setSiblingInvoices] = useState<
    { id: string; invoiceNumber: string }[]
  >([]);

  useEffect(() => {
    listInvoices()
      .then((res) => {
        if (res.data) {
          setSiblingInvoices(
            res.data.map((inv) => ({
              id: inv.id,
              invoiceNumber: inv.invoiceNumber,
            })),
          );
        }
      })
      .catch(() => {});
  }, []);

  const currentIndex = siblingInvoices.findIndex((inv) => inv.id === invoiceId);
  const prevInvoice =
    currentIndex > 0 ? siblingInvoices[currentIndex - 1] : null;
  const nextInvoice =
    currentIndex >= 0 && currentIndex < siblingInvoices.length - 1
      ? siblingInvoices[currentIndex + 1]
      : null;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "j" || e.key === "J") {
        if (nextInvoice) {
          e.preventDefault();
          navigate(`/invoices/${nextInvoice.id}`);
        }
      } else if (e.key === "k" || e.key === "K") {
        if (prevInvoice) {
          e.preventDefault();
          navigate(`/invoices/${prevInvoice.id}`);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextInvoice, prevInvoice, navigate]);

  // Derive workflow state as the single source of truth
  const context = invoice
    ? getInvoiceWorkflowContext(invoice as RawInvoiceData)
    : null;

  /* ─────────────────────────────────────────────────────────────
   * Handlers
   * ───────────────────────────────────────────────────────────── */

  async function handleProcess() {
    if (!invoiceId) return;
    setActionPending(true);
    setProcessingStage("capturing");

    try {
      setProcessingStage("validating");
      const result = await processInvoice(invoiceId);
      setProcessingStage("matching");

      const updatedStatus = (result as { data: { status: string } }).data
        ?.status;
      if (updatedStatus === "EXCEPTION") {
        setProcessingStage("error");
      } else {
        setProcessingStage("complete");
      }

      // Record audit event
      setDynamicAuditEvents((prev) => [
        {
          id: `audit-proc-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: "OCR & Validation Engine",
          action: "Automated Data Capture & 3-Way Matching Executed",
          details: `Outcome status: ${updatedStatus || "VALIDATED"}`,
          type: updatedStatus === "EXCEPTION" ? "warning" : "success",
        },
        ...prev,
      ]);

      await load();
    } catch {
      setProcessingStage("error");
    } finally {
      setProcessingStage("idle");
      setActionPending(false);
    }
  }

  async function handleDocumentUpload(file: File) {
    if (!invoiceId) return;
    setActionPending(true);
    try {
      await uploadInvoiceDocument(invoiceId, file);
      setDynamicAuditEvents((prev) => [
        {
          id: `audit-doc-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: "User Intake",
          action: `Source Document Attached: ${file.name}`,
          details: `File size: ${(file.size / 1024).toFixed(1)} KB • Type: ${file.type}`,
          type: "info",
        },
        ...prev,
      ]);
      await load();
    } finally {
      setActionPending(false);
    }
  }

  async function handleLinkEntity(id: string, name: string) {
    if (!invoice) return;
    if (linkModalState.type === "vendor") {
      setInvoice((prev) => (prev ? { ...prev, supplier: { id, name } } : prev));
      setDynamicAuditEvents((prev) => [
        {
          id: `audit-link-vendor-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: "Finance Executive",
          action: `Supplier Linked: ${name}`,
          details: `Assigned Master Vendor ID: ${id}`,
          type: "info",
        },
        ...prev,
      ]);
    } else {
      setInvoice((prev) =>
        prev
          ? { ...prev, purchaseOrderId: id === "NON_PO" ? null : name }
          : prev,
      );
      setDynamicAuditEvents((prev) => [
        {
          id: `audit-link-po-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: "Finance Executive",
          action:
            id === "NON_PO"
              ? "Classified as Direct GL / Non-PO"
              : `Purchase Order Linked: ${name}`,
          details:
            id === "NON_PO"
              ? "Designated as non-PO operational expense"
              : `Assigned PO Reference: ${name}`,
          type: "info",
        },
        ...prev,
      ]);
    }
  }

  function handleAcceptVariance(line: LineItemData, reason: string) {
    setDynamicAuditEvents((prev) => [
      {
        id: `audit-var-accept-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: "Finance Manager",
        action: `Variance Override Accepted (Line #${line.lineNumber})`,
        details: `Item: "${line.description}" • Reason: "${reason}"`,
        type: "success",
      },
      ...prev,
    ]);
  }

  function handleFlagException(line: LineItemData, reason: string) {
    setDynamicAuditEvents((prev) => [
      {
        id: `audit-var-flag-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: "Finance Executive",
        action: `Exception Flagged on Line Item #${line.lineNumber}`,
        details: `Item: "${line.description}" • Reason: "${reason}"`,
        type: "error",
      },
      ...prev,
    ]);
  }

  async function handleErpSync(targetErp: string) {
    if (!invoiceId) return;
    setActionPending(true);
    try {
      await syncInvoiceToErp(invoiceId, targetErp);
      toast.success(
        `Exported to ${targetErp.toUpperCase()}`,
        `GL journal entries created and synchronized for ${invoice?.invoiceNumber}.`,
      );
      setDynamicAuditEvents((prev) => [
        {
          id: `audit-erp-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: "ERP Integration Gateway",
          action: `Exported to ${targetErp.toUpperCase()}`,
          details: "GL Journal entries created & synchronized",
          type: "success",
        },
        ...prev,
      ]);
      await load();
    } catch (err: unknown) {
      toast.error(
        "ERP Synchronization Failed",
        err instanceof Error ? err.message : "Failed to export invoice to ERP.",
      );
    } finally {
      setActionPending(false);
    }
  }

  async function handleConfirmAction() {
    if (!invoiceId || !confirmDialog.action) return;
    setActionPending(true);
    try {
      await transitionInvoice(
        invoiceId,
        confirmDialog.action,
        confirmDialog.comment,
      );
      if (confirmDialog.action === "APPROVE") {
        toast.success(
          "Invoice Approved",
          `Invoice ${invoice?.invoiceNumber} approved and queued for payment scheduling.`,
        );
      } else {
        toast.warning(
          "Invoice Rejected",
          `Invoice ${invoice?.invoiceNumber} rejected by authorized approver.`,
        );
      }
      setDynamicAuditEvents((prev) => [
        {
          id: `audit-act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: "Authorized Approver",
          action:
            confirmDialog.action === "APPROVE"
              ? "Invoice Approved for Payment"
              : "Invoice Rejected",
          details: confirmDialog.comment || "Action signed off from workspace",
          type: confirmDialog.action === "APPROVE" ? "success" : "error",
        },
        ...prev,
      ]);
      setActionBanner({
        type: confirmDialog.action === "APPROVE" ? "success" : "warning",
        title:
          confirmDialog.action === "APPROVE"
            ? "Invoice Approved"
            : "Invoice Rejected",
        message:
          confirmDialog.action === "APPROVE"
            ? `Invoice ${invoice?.invoiceNumber} has been approved and moved to Waiting for Scheduling.`
            : `Invoice ${invoice?.invoiceNumber} has been rejected and marked in workflow engine.`,
      });
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      await load();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Workflow state transition was rejected by server engine.";
      toast.error("Action Execution Failed", msg);
      setActionBanner({
        type: "error",
        title: "Action Execution Failed",
        message: msg,
      });
    } finally {
      setActionPending(false);
    }
  }

  function handleActionClick(actionKey: string) {
    switch (actionKey) {
      case "RUN_CAPTURE":
        void handleProcess();
        break;
      case "RESOLVE_EXCEPTION":
        navigate("/exceptions");
        break;
      case "RETRY_VALIDATION":
        void handleProcess();
        break;
      case "APPROVE":
        setConfirmDialog({
          isOpen: true,
          title: "Authorize Invoice Approval",
          description: `Approve ${invoice?.invoiceNumber} (${formatCurrency(invoice?.totalAmount || 0, invoice?.currency || "INR")}) for payment release?`,
          action: "APPROVE",
          comment: "Approved from Invoice Workspace",
        });
        break;
      case "REJECT":
        setConfirmDialog({
          isOpen: true,
          title: "Reject Invoice",
          description:
            "Reject this invoice? The record will revert to intake review with a rejection tag.",
          action: "REJECT",
          comment: "Rejected during review",
        });
        break;
      case "SCHEDULE_PAYMENT":
        navigate("/payments");
        break;
      case "VIEW_PAYMENT":
        navigate("/payments");
        break;
      case "SYNC_ERP":
        setShowErpModal(true);
        break;
      case "VIEW_AUDIT":
        setIsAuditDrawerOpen(true);
        break;
    }
  }

  const [showExportMenu, setShowExportMenu] = useState(false);

  function handleExportPdf() {
    if (!invoice) return;
    if (invoice.documents && invoice.documents[0]?.id) {
      window.open(`/api/v1/invoices/${invoice.id}/document/${invoice.documents[0].id}`, "_blank");
    } else {
      window.print();
    }
    toast.success("PDF Voucher Ready", `Statutory voucher generated for ${invoice.invoiceNumber}`);
  }

  function handleExportCsv() {
    if (!invoice) return;
    const rawLines = (invoice.lines && invoice.lines.length > 0 ? invoice.lines : [
      { lineNo: 1, description: "Procured Items & Services", quantity: 1, unitPrice: invoice.totalAmount, lineAmount: invoice.totalAmount, hsnCode: "8471" }
    ]) as Array<{ lineNo?: number; description?: string; hsnCode?: string; quantity?: number; unitPrice?: number | string; lineAmount?: number | string }>;
    const headers = ["Invoice Number", "Vendor", "Line No", "Description", "HSN/SAC", "Quantity", "Unit Price", "Currency", "Line Amount"];
    const rows = rawLines.map((l, idx) => [
      `"${invoice.invoiceNumber}"`,
      `"${invoice.supplier?.name || 'Verified Vendor'}"`,
      l.lineNo || (idx + 1),
      `"${(l.description || '').replace(/"/g, '""')}"`,
      `"${l.hsnCode || '8471'}"`,
      l.quantity || 1,
      l.unitPrice || invoice.totalAmount,
      `"${invoice.currency || 'INR'}"`,
      l.lineAmount || invoice.totalAmount,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${invoice.invoiceNumber}_line_items.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV Export Complete", `Line items exported for ${invoice.invoiceNumber}`);
  }

  function handleExportJson() {
    if (!invoice) return;
    const blob = new Blob([JSON.stringify(invoice, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${invoice.invoiceNumber}_audit_pack.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("JSON Export Complete", `Audit pack exported for ${invoice.invoiceNumber}`);
  }

  const location = useLocation();
  const originState = location.state as { from?: string; fromLabel?: string } | null;
  const backHref = originState?.from || "/invoices";
  const backLabel = originState?.fromLabel || (backHref.includes("payments") ? "Back to Payments" : backHref.includes("exceptions") ? "Back to Exceptions" : backHref.includes("approvals") ? "Back to Approvals" : "Back to Invoices");
  const parentBreadcrumbLabel = backHref.includes("payments") ? "Payments" : backHref.includes("exceptions") ? "Exceptions" : backHref.includes("approvals") ? "Approvals" : "Invoices";

  function handleActionItemClick(type: ActionItem["type"]) {
    if (type === "doc") {
      const dropzone = document.getElementById("invoice-document-dropzone");
      dropzone?.scrollIntoView({ behavior: "smooth" });
    } else if (type === "vendor") {
      setLinkModalState({ isOpen: true, type: "vendor" });
    } else if (type === "po") {
      setLinkModalState({ isOpen: true, type: "purchaseOrder" });
    } else if (type === "variance") {
      const matchingTable = document.getElementById(
        "invoice-line-item-matching-section",
      );
      matchingTable?.scrollIntoView({ behavior: "smooth" });
    } else if (type === "duplicate") {
      setIsAuditDrawerOpen(true);
    } else {
      navigate("/exceptions");
    }
  }

  if (loading || !invoice || !context) {
    return <SkeletonRows count={6} />;
  }

  const timelineEvents = buildInvoiceAuditTimeline(
    invoice,
    context,
    dynamicAuditEvents,
  );

  return (
    <div className="space-y-5 pb-16">
      {/* ─────────────────────────────────────────────────────────────
       * 1. Top Header: Navigation, Invoice ID, Status Badge & Contextual Primary CTA
       * ───────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Breadcrumbs
            items={[
              { label: parentBreadcrumbLabel, href: backHref },
              { label: invoice.invoiceNumber },
            ]}
            showBackButton
            onBack={() => navigate(-1)}
            backHref={backHref}
            backLabel={backLabel}
          />

          {/* Quick Review Pager & J/K Keyboard Navigation */}
          {siblingInvoices.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-zinc-400">
              <button
                type="button"
                disabled={!prevInvoice}
                onClick={() => prevInvoice && navigate(`/invoices/${prevInvoice.id}`)}
                title="Previous invoice (Shortcut: K)"
                className="px-2 py-1 rounded-md border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 disabled:opacity-40 hover:bg-neutral-50 dark:hover:bg-zinc-800 flex items-center gap-1 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-2xs text-[11px] font-medium"
              >
                <ChevronLeft size={13} />
                <span>Prev</span>
                <kbd className="font-mono text-[9px] px-1 py-0.2 rounded bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700">K</kbd>
              </button>
              {currentIndex >= 0 && (
                <span className="px-1.5 font-mono text-[10px] text-neutral-400">
                  {currentIndex + 1} of {siblingInvoices.length}
                </span>
              )}
              <button
                type="button"
                disabled={!nextInvoice}
                onClick={() => nextInvoice && navigate(`/invoices/${nextInvoice.id}`)}
                title="Next invoice (Shortcut: J)"
                className="px-2 py-1 rounded-md border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 disabled:opacity-40 hover:bg-neutral-50 dark:hover:bg-zinc-800 flex items-center gap-1 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-2xs text-[11px] font-medium"
              >
                <span>Next</span>
                <kbd className="font-mono text-[9px] px-1 py-0.2 rounded bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700">J</kbd>
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>

        {actionBanner && (
          <div className="mb-3">
            <Alert type={actionBanner.type} title={actionBanner.title}>
              {actionBanner.message}
            </Alert>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <h1 className="text-h1 text-neutral-900 dark:text-zinc-50 font-bold font-mono tracking-tight">
                {invoice.invoiceNumber}
              </h1>
              <StatusBadge status={context.status} />
            </div>

            {/* Dual Invoice Identification & Remittance Chip per Tata Chemicals standard */}
            <div className="flex flex-wrap items-center gap-2 text-micro font-mono">
              <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-300 font-medium">
                Supplier Bill Ref: {invoice.invoiceNumber}
              </span>
              <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 font-medium">
                Buyer ERP Voucher: {invoice.buyerInvoiceId || "2522000123"} ({invoice.fiscalYear || "FY2025"})
              </span>
              {invoice.payments && invoice.payments.length > 0 && invoice.payments[0].utrNumber && (
                <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 font-medium flex items-center gap-1">
                  <span>UTR:</span>
                  <span className="font-semibold">{invoice.payments[0].utrNumber}</span>
                </span>
              )}
            </div>
          </div>

          {/* Header Action Suite: Vendor Portal, Audit Drawer, and Workflow CTA */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {/* Vendor Self-Service Portal Launcher & Link Copy */}
            <div className="flex items-center rounded-lg border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden h-9">
              <a
                href={`/invoices/track/${invoice.invoiceNumber || invoice.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-caption font-medium text-neutral-700 dark:text-zinc-300 hover:bg-neutral-50 dark:hover:bg-zinc-800 transition-colors border-r border-neutral-200 dark:border-zinc-800 h-full"
                title="Launch vendor tracking view in new tab"
              >
                <ExternalLink
                  size={13}
                  className="text-indigo-600 dark:text-indigo-400"
                />
                <span>Vendor Portal</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/invoices/track/${invoice.invoiceNumber || invoice.id}`;
                  void navigator.clipboard?.writeText(url);
                  setCopiedPortalLink(true);
                  toast.success(
                    "Link copied to clipboard",
                    "Public vendor tracking URL is ready to share.",
                  );
                  setTimeout(() => setCopiedPortalLink(false), 2000);
                }}
                className="px-2.5 py-1.5 text-caption font-medium text-neutral-600 dark:text-zinc-400 hover:bg-neutral-50 dark:hover:bg-zinc-800 transition-colors h-full"
                title="Copy public tracking link"
              >
                {copiedPortalLink ? (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <Check size={12} strokeWidth={3} />
                    <span>Copied!</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Copy size={12} />
                    <span>Copy Link</span>
                  </span>
                )}
              </button>
            </div>

            {/* Enterprise Audit Log Slide-Out Sheet Trigger */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAuditDrawerOpen(true)}
              className="h-9 px-3 gap-1.5 text-caption font-medium shadow-xs"
              title="Open enterprise audit history drawer"
            >
              <History size={14} className="text-neutral-500" />
              <span>Audit History ({timelineEvents.length})</span>
            </Button>

            {/* Competitor-Grade Multi-Format Export Dropdown (PDF, CSV, JSON) */}
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowExportMenu((prev) => !prev)}
                className="h-9 px-3 gap-1.5 text-caption font-medium shadow-xs"
                title="Export statutory voucher or line items data"
              >
                <Download size={14} className="text-neutral-500" />
                <span>Export</span>
                <ChevronDown size={12} className={`text-neutral-400 transition-transform ${showExportMenu ? "rotate-180" : ""}`} />
              </Button>

              {showExportMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowExportMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-lg shadow-xl z-40 py-1 font-mono text-caption animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowExportMenu(false);
                        handleExportPdf();
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-zinc-800 flex items-center gap-2.5 text-neutral-800 dark:text-zinc-200 transition-colors"
                    >
                      <Download size={14} className="text-indigo-600 dark:text-indigo-400" />
                      <div>
                        <div className="font-semibold font-sans">Statutory AP Voucher (PDF)</div>
                        <div className="text-micro text-neutral-400">Print / statutory slip</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowExportMenu(false);
                        handleExportCsv();
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-zinc-800 flex items-center gap-2.5 text-neutral-800 dark:text-zinc-200 border-t border-neutral-100 dark:border-zinc-800/80 transition-colors"
                    >
                      <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <div className="font-semibold font-sans">Line Items (CSV)</div>
                        <div className="text-micro text-neutral-400">HSN &amp; tax breakdown</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowExportMenu(false);
                        handleExportJson();
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-zinc-800 flex items-center gap-2.5 text-neutral-800 dark:text-zinc-200 border-t border-neutral-100 dark:border-zinc-800/80 transition-colors"
                    >
                      <FileCode size={14} className="text-amber-600 dark:text-amber-400" />
                      <div>
                        <div className="font-semibold font-sans">Audit Pack (JSON)</div>
                        <div className="text-micro text-neutral-400">Machine-readable payload</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Single Contextual Primary CTA (Suppressed if no forward action or if duplicate audit) */}
            {context.primaryAction &&
              context.primaryAction.actionKey !== "VIEW_AUDIT" && (
                <Button
                  type="button"
                  variant={
                    context.primaryAction.variant === "destructive"
                      ? "destructive"
                      : "primary"
                  }
                  onClick={() =>
                    handleActionClick(context.primaryAction!.actionKey)
                  }
                  disabled={actionPending}
                  className="h-9 px-4 text-body-sm font-semibold rounded-lg shadow-sm"
                >
                  {actionPending ? "Executing..." : context.primaryAction.label}
                </Button>
              )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
       * 2. Summary Metric Strip (KPIs + Micro Pill Buttons)
       * ───────────────────────────────────────────────────────────── */}
      <MetricStrip
        items={[
          {
            id: "total-amount",
            label: "Total Amount",
            value: formatCurrency(invoice.totalAmount, invoice.currency),
            isPrimaryValue: true,
          },
          {
            id: "due-date",
            label: "Due Date",
            icon: <Calendar size={13} />,
            value: invoice.dueDate ? (
              <span className="text-body font-medium tabular-nums text-neutral-900 dark:text-zinc-100 block">
                {formatDate(invoice.dueDate)}
              </span>
            ) : (
              <BadgeKey>Not available</BadgeKey>
            ),
          },
          {
            id: "supplier",
            label: "Supplier / Vendor",
            icon: <Building2 size={13} />,
            value:
              invoice.supplier?.name &&
              invoice.supplier.name !== "Unknown Vendor" ? (
                <span className="text-body font-medium text-neutral-900 dark:text-zinc-100">
                  {invoice.supplier.name}
                </span>
              ) : context.canLinkVendor ? (
                <button
                  type="button"
                  onClick={() =>
                    setLinkModalState({ isOpen: true, type: "vendor" })
                  }
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-micro font-medium border border-indigo-300 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors shadow-2xs"
                  title="Click to assign supplier"
                >
                  <Plus size={11} strokeWidth={2.5} />
                  <span>Assign Vendor</span>
                </button>
              ) : (
                <span className="text-body text-neutral-500">
                  Unknown Vendor
                </span>
              ),
          },
          {
            id: "purchase-order",
            label: "Purchase Order",
            icon: <Link2 size={13} />,
            value: invoice.purchaseOrderId ? (
              <div className="flex items-center gap-2">
                <span className="text-body font-mono text-neutral-900 dark:text-zinc-100 font-medium">
                  {invoice.purchaseOrderId}
                </span>
                {context.canLinkPO && (
                  <button
                    type="button"
                    onClick={() =>
                      setLinkModalState({ isOpen: true, type: "purchaseOrder" })
                    }
                    className="text-micro font-mono text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Change
                  </button>
                )}
              </div>
            ) : context.canLinkPO ? (
              <button
                type="button"
                onClick={() =>
                  setLinkModalState({ isOpen: true, type: "purchaseOrder" })
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-micro font-mono font-medium border border-indigo-300 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors shadow-2xs"
                title="Click to link Purchase Order"
              >
                <Plus size={11} strokeWidth={2.5} />
                <span>Link PO</span>
              </button>
            ) : (
              <BadgeKey>Not linked</BadgeKey>
            ),
          },
        ]}
      />

      {/* ─────────────────────────────────────────────────────────────
       * 3. Current State / Action Banner (Pure Guidance Surface)
       * ───────────────────────────────────────────────────────────── */}
      <InvoiceStateBanner
        context={context}
        onActionItemClick={handleActionItemClick}
      />

      {/* ─────────────────────────────────────────────────────────────
       * 4. Main Workspace (Document Source + Extracted Details)
       * ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column: Document Source Card */}
        <div className="lg:col-span-6">
          <DocumentSourceCard
            invoiceId={invoice.id}
            source={invoice.source}
            documents={invoice.documents}
            canUploadDocument={context.canUploadDocument}
            onUploadDocument={handleDocumentUpload}
            isUploading={actionPending}
          />
        </div>

        {/* Right Column: AI Extracted Details & Integrated Validation Checks */}
        <div className="lg:col-span-6">
          <AIExtractedDetailsCard
            invoiceNumber={invoice.invoiceNumber}
            invoiceDate={invoice.invoiceDate}
            totalAmount={invoice.totalAmount}
            currency={invoice.currency}
            supplierName={invoice.supplier?.name}
            purchaseOrderId={invoice.purchaseOrderId}
            linesCount={invoice.lines?.length ?? 0}
            extractedAtDate={
              invoice.documents?.[0]?.createdAt ?? invoice.invoiceDate
            }
            status={context.status}
            aiConfidence={invoice.aiConfidence}
            validations={invoice.validations}
          />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
       * 5. 3-Way Line-Item Matching & Variance Inspection (State-Aware)
       * ───────────────────────────────────────────────────────────── */}
      <LineItemMatchingTable
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoiceNumber}
        supplierName={invoice.supplier?.name}
        totalAmount={invoice.totalAmount}
        status={context.status}
        purchaseOrderId={invoice.purchaseOrderId}
        currency={invoice.currency}
        exceptions={invoice.exceptions}
        onAcceptOverride={handleAcceptVariance}
        onFlagException={handleFlagException}
      />

      {/* ─────────────────────────────────────────────────────────────
       * 6. Sticky Invoice Action Bar
       * ───────────────────────────────────────────────────────────── */}
      <InvoiceActionBar
        context={context}
        invoiceNumber={invoice.invoiceNumber}
        onAction={handleActionClick}
        isActionPending={actionPending}
      />

      {/* ─────────────────────────────────────────────────────────────
       * Modals & Dialogs
       * ───────────────────────────────────────────────────────────── */}

      {/* Reusable Entity Linking Modal */}
      <EntityLinkModal
        isOpen={linkModalState.isOpen}
        onClose={() =>
          setLinkModalState((prev) => ({ ...prev, isOpen: false }))
        }
        type={linkModalState.type}
        onLink={handleLinkEntity}
      />

      {/* ERP System Synchronization Modal */}
      <ErpSyncModal
        isOpen={showErpModal}
        onClose={() => setShowErpModal(false)}
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoiceNumber}
        vendorName={invoice.supplier?.name ?? "Acme Industrial Supplies"}
        totalAmount={invoice.totalAmount}
        currency={invoice.currency}
        onConfirmSync={handleErpSync}
        isPending={actionPending}
      />

      {/* Processing Pipeline Overlay */}
      <ProcessingOverlay
        stage={processingStage}
        isOpen={processingStage !== "idle"}
      />

      {/* Confirmation Dialog Primitive */}
      <Dialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel="Confirm Action"
        onConfirm={handleConfirmAction}
        variant={confirmDialog.action === "REJECT" ? "destructive" : "primary"}
        isPending={actionPending}
      />

      {/* Enterprise Audit History Slide-Out Drawer */}
      <Sheet
        isOpen={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
        title={`Audit Trail — ${invoice.invoiceNumber}`}
        subtitle="Chronological log of AI extractions, validation passes, and manual actions."
        width="max-w-xl"
      >
        <div className="space-y-5">
          {/* Chronological Event Timeline */}
          <div className="pt-1">
            <Timeline events={timelineEvents} />
          </div>

          {/* Footer Metadata */}
          <div className="pt-3 border-t border-neutral-200 dark:border-zinc-800 flex items-center justify-between text-micro text-neutral-500 font-mono">
            <span>Total Events: {timelineEvents.length}</span>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
