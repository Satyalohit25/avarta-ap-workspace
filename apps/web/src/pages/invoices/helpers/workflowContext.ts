export type InvoiceStatus =
  | "RECEIVED"
  | "PROCESSING"
  | "EXCEPTION"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "SCHEDULED"
  | "PAID"
  | "SYNCED"
  | "ARCHIVED";

export interface WorkflowAction {
  label: string;
  actionKey: string;
  variant?: "primary" | "destructive" | "outline";
  description?: string;
}

export interface ActionItem {
  id: string;
  type: "doc" | "vendor" | "po" | "variance" | "confidence" | "duplicate" | "generic";
  title: string;
  description: string;
  actionHint: string;
  isMandatory: boolean;
}

export interface InvoiceWorkflowContext {
  status: InvoiceStatus;
  workflowState: string;
  currentStage: string;
  stageNumber: number;
  totalStages: number;
  primaryAction: WorkflowAction | null;
  secondaryActions: WorkflowAction[];
  canUploadDocument: boolean;
  canLinkVendor: boolean;
  canLinkPO: boolean;
  showExtraction: boolean;
  showMatching: boolean;
  showApproval: boolean;
  showPayment: boolean;
  showErpSync: boolean;
  actionItems: ActionItem[];
  bannerTitle: string;
  bannerDescription: string;
  bannerType: "info" | "warning" | "error" | "success";
  nextStepPrompt: string;
  isComplete: boolean;
}

export interface RawInvoiceData {
  id: string;
  invoiceNumber: string;
  status: string;
  workflowState: string;
  supplier?: { id: string; name: string } | null;
  purchaseOrderId?: string | null;
  documents?: Array<{ id: string; fileName: string; mimeType: string; fileSize: number }>;
  exceptions?: Array<{ id: string; title: string; description: string; status: string }>;
  validations?: Array<{ id: string; ruleName: string; status: string }>;
  aiConfidence?: number | null;
  totalAmount: string | number;
  currency: string;
}

export function getInvoiceWorkflowContext(invoice: RawInvoiceData): InvoiceWorkflowContext {
  const status = (invoice.status || "RECEIVED") as InvoiceStatus;
  const workflowState = invoice.workflowState || status;
  const hasDocuments = Boolean(invoice.documents && invoice.documents.length > 0);
  const hasSupplier = Boolean(invoice.supplier && invoice.supplier.name && invoice.supplier.name !== "Unknown Vendor");
  const hasPO = Boolean(invoice.purchaseOrderId);

  const openExceptions = (invoice.exceptions?.filter(
    (e) => e.status !== "RESOLVED" && e.status !== "REJECTED"
  ) ?? []);

  const failedValidations = (invoice.validations?.filter(
    (v) => v.status !== "PASSED"
  ) ?? []);

  // Compute smart deduplicated action items (No duplicate twin errors!)
  const actionItems: ActionItem[] = [];
  const seenCategories = new Set<string>();

  if (status === "RECEIVED") {
    if (!hasDocuments) {
      actionItems.push({
        id: "intake-doc",
        type: "doc",
        title: "Source Document",
        description: "Attach original invoice file (PDF / PNG / JPG) for automated OCR capture.",
        actionHint: "Attach file below",
        isMandatory: false,
      });
    }
    if (!hasSupplier) {
      actionItems.push({
        id: "intake-vendor",
        type: "vendor",
        title: "Supplier Assignment",
        description: "Link invoice to verified vendor master record.",
        actionHint: "Assign vendor",
        isMandatory: false,
      });
    }
    if (!hasPO) {
      actionItems.push({
        id: "intake-po",
        type: "po",
        title: "Purchase Order",
        description: "Link Purchase Order for 3-way matching or designate as Direct GL expense.",
        actionHint: "Link PO",
        isMandatory: false,
      });
    }
  }

  if (status === "EXCEPTION") {
    // 1. Check for Vendor Discrepancy
    const hasVendorIssue =
      !hasSupplier ||
      openExceptions.some((e) => e.title.toLowerCase().includes("vendor") || e.description.toLowerCase().includes("vendor")) ||
      failedValidations.some((v) => v.ruleName.toLowerCase().includes("vendor"));

    if (hasVendorIssue && !seenCategories.has("vendor")) {
      seenCategories.add("vendor");
      actionItems.push({
        id: "exc-vendor",
        type: "vendor",
        title: "Unlinked Vendor Master",
        description: "No registered supplier is linked to this invoice intake record.",
        actionHint: "Assign Vendor",
        isMandatory: true,
      });
    }

    // 2. Check for AI Confidence Discrepancy
    const hasConfidenceIssue =
      (invoice.aiConfidence != null && Number(invoice.aiConfidence) < 95) ||
      openExceptions.some((e) => e.title.toLowerCase().includes("confidence")) ||
      failedValidations.some((v) => v.ruleName.toLowerCase().includes("confidence"));

    if (hasConfidenceIssue && !seenCategories.has("confidence")) {
      seenCategories.add("confidence");
      const score = invoice.aiConfidence != null ? `${invoice.aiConfidence}%` : "below 95%";
      actionItems.push({
        id: "exc-confidence",
        type: "confidence",
        title: `AI Extraction Confidence (${score})`,
        description: "OCR extracted fields require human confirmation before approval.",
        actionHint: "Review Fields",
        isMandatory: false,
      });
    }

    // 3. Check for Price / Quantity / Matching Discrepancies
    const hasVarianceIssue =
      openExceptions.some((e) => e.title.toLowerCase().includes("price") || e.title.toLowerCase().includes("quantity") || e.title.toLowerCase().includes("difference")) ||
      failedValidations.some((v) => v.ruleName.toLowerCase().includes("price") || v.ruleName.toLowerCase().includes("match"));

    if (hasVarianceIssue && !seenCategories.has("variance")) {
      seenCategories.add("variance");
      actionItems.push({
        id: "exc-variance",
        type: "variance",
        title: "Line-Item Price Variance",
        description: "Discrepancy detected between invoice unit rate and PO/contract rate.",
        actionHint: "Inspect Table Below",
        isMandatory: true,
      });
    }

    // 4. Check for Duplicate Warnings
    const hasDuplicateIssue =
      openExceptions.some((e) => e.title.toLowerCase().includes("duplicate")) ||
      failedValidations.some((v) => v.ruleName.toLowerCase().includes("duplicate"));

    if (hasDuplicateIssue && !seenCategories.has("duplicate")) {
      seenCategories.add("duplicate");
      actionItems.push({
        id: "exc-duplicate",
        type: "duplicate",
        title: "Potential Duplicate Invoice",
        description: "Invoice amount or number matches a previously processed invoice.",
        actionHint: "Verify History",
        isMandatory: true,
      });
    }

    // 5. Fallback for any other unique unmapped exception
    openExceptions.forEach((e) => {
      const key = e.title.toLowerCase();
      if (!seenCategories.has(key) && !key.includes("vendor") && !key.includes("confidence") && !key.includes("price") && !key.includes("duplicate")) {
        seenCategories.add(key);
        actionItems.push({
          id: `exc-generic-${e.id}`,
          type: "generic",
          title: e.title,
          description: e.description,
          actionHint: "Resolve",
          isMandatory: true,
        });
      }
    });
  }

  // Derive stage mapping
  let currentStage = "Intake & Receive";
  let stageNumber = 1;
  const totalStages = 8;

  switch (status) {
    case "RECEIVED":
      currentStage = "Intake & Receive";
      stageNumber = 1;
      break;
    case "PROCESSING":
      currentStage = hasDocuments ? "OCR Capture & Parsing" : "3-Way Matching";
      stageNumber = hasDocuments ? 2 : 4;
      break;
    case "EXCEPTION":
      currentStage = "Exception Resolution";
      stageNumber = 3;
      break;
    case "PENDING_APPROVAL":
      currentStage = "Approval Sign-Off";
      stageNumber = 5;
      break;
    case "APPROVED":
      currentStage = "Payment Scheduling";
      stageNumber = 6;
      break;
    case "SCHEDULED":
      currentStage = "Payment Scheduled";
      stageNumber = 6;
      break;
    case "PAID":
      currentStage = "Payment Settled";
      stageNumber = 6;
      break;
    case "SYNCED":
      currentStage = "ERP General Ledger Synced";
      stageNumber = 7;
      break;
    case "ARCHIVED":
      currentStage = "Compliance Archive Vault";
      stageNumber = 8;
      break;
  }

  // Derive actions & banners
  let primaryAction: WorkflowAction | null = null;
  const secondaryActions: WorkflowAction[] = [];
  let bannerTitle = "";
  let bannerDescription = "";
  let bannerType: "info" | "warning" | "error" | "success" = "info";
  let nextStepPrompt = "";
  let isComplete = false;

  switch (status) {
    case "RECEIVED":
      primaryAction = {
        label: "Run Capture & Validation",
        actionKey: "RUN_CAPTURE",
        variant: "primary",
        description: "Execute OCR data capture, rule validation, and 3-way matching",
      };
      bannerTitle = "Invoice Received (Stage 1: Intake)";
      bannerDescription = hasDocuments
        ? "Source document attached. Run OCR capture and validation checks to proceed."
        : "Direct intake record. You may attach an invoice source file or run automated capture directly.";
      bannerType = "info";
      nextStepPrompt = "Click 'Run Capture & Validation' to extract line items and initiate automated matching.";
      break;

    case "PROCESSING":
      primaryAction = null;
      bannerTitle = "Processing In Progress (Stage 2: Pipeline)";
      bannerDescription = "OCR extraction, rule evaluation, and 3-way PO reconciliation are currently executing.";
      bannerType = "info";
      nextStepPrompt = "Please wait while the workflow engine verifies invoice data against ERP records.";
      break;

    case "EXCEPTION":
      primaryAction = {
        label: "Resolve Exceptions",
        actionKey: "RESOLVE_EXCEPTION",
        variant: "primary",
        description: "Open the exceptions drawer to apply manager tolerance or resolve PO mismatch",
      };
      secondaryActions.push({
        label: "Re-run Validation",
        actionKey: "RETRY_VALIDATION",
        variant: "outline",
      });
      bannerTitle = `${actionItems.length || 1} Exception Item(s) Require Review`;
      bannerDescription = "Automated processing paused due to rule discrepancies. Review the itemized issues below to resolve or override.";
      bannerType = "warning"; // Calibrated warm amber instead of harsh high-contrast red
      nextStepPrompt = "Accept line item variance overrides below or click 'Resolve Exceptions' to document sign-off.";
      break;

    case "PENDING_APPROVAL":
      primaryAction = {
        label: "Approve Invoice",
        actionKey: "APPROVE",
        variant: "primary",
        description: "Authorize invoice for scheduled payment release",
      };
      secondaryActions.push({
        label: "Reject Invoice",
        actionKey: "REJECT",
        variant: "destructive",
      });
      bannerTitle = "Ready for Management Approval (Stage 5)";
      bannerDescription = "All automated validation and 3-way matching rules have passed. Awaiting explicit human sign-off.";
      bannerType = "info";
      nextStepPrompt = "Review extracted line items and authorize invoice to queue for payment scheduling.";
      break;

    case "APPROVED":
      primaryAction = {
        label: "Schedule Payment",
        actionKey: "SCHEDULE_PAYMENT",
        variant: "primary",
        description: "Queue this approved invoice into the payment release batch",
      };
      bannerTitle = "Invoice Approved & Authorized";
      bannerDescription = "Management sign-off recorded. Ready for treasury and batch payment release.";
      bannerType = "success";
      nextStepPrompt = "Click 'Schedule Payment' to assign release date and bank disbursement batch.";
      break;

    case "SCHEDULED":
      primaryAction = {
        label: "View Payment Batch",
        actionKey: "VIEW_PAYMENT",
        variant: "outline",
      };
      bannerTitle = "Payment Scheduled";
      bannerDescription = "Queued in upcoming bank disbursement batch.";
      bannerType = "info";
      nextStepPrompt = "Disbursement scheduled. Monitor execution in Payments workspace.";
      break;

    case "PAID":
      primaryAction = {
        label: "Sync to ERP (GL Export)",
        actionKey: "SYNC_ERP",
        variant: "primary",
        description: "Export general ledger entries to accounting software",
      };
      bannerTitle = "Payment Executed & Settled";
      bannerDescription = "Disbursement confirmed. Ready for general ledger handoff and ERP synchronization.";
      bannerType = "success";
      nextStepPrompt = "Click 'Sync to ERP' to push journal vouchers and payment records into your financial system.";
      break;

    case "SYNCED":
      primaryAction = null;
      bannerTitle = "ERP Synchronized & Reconciled";
      bannerDescription = "Invoice record and GL vouchers successfully synced to enterprise ERP.";
      bannerType = "success";
      nextStepPrompt = "Workflow complete. All ledger entries are synchronized.";
      isComplete = true;
      break;

    case "REJECTED":
      primaryAction = null;
      bannerTitle = "Invoice Rejected";
      bannerDescription = "This invoice was rejected during approval or validation and returned to intake review.";
      bannerType = "error";
      nextStepPrompt = "Invoice has been rejected. Check rejection details in audit history.";
      break;

    case "ARCHIVED":
      primaryAction = null;
      bannerTitle = "Archived Record";
      bannerDescription = "This invoice has reached terminal archived status.";
      bannerType = "info";
      nextStepPrompt = "Read-only archive record.";
      isComplete = true;
      break;
  }

  return {
    status,
    workflowState,
    currentStage,
    stageNumber,
    totalStages,
    primaryAction,
    secondaryActions,
    canUploadDocument: status === "RECEIVED",
    canLinkVendor: status === "RECEIVED" || status === "EXCEPTION",
    canLinkPO: status === "RECEIVED" || status === "EXCEPTION",
    showExtraction: status !== "RECEIVED" || hasDocuments,
    showMatching: status !== "RECEIVED",
    showApproval: status === "PENDING_APPROVAL",
    showPayment: status === "APPROVED" || status === "SCHEDULED" || status === "PAID",
    showErpSync: status === "PAID" || status === "SYNCED",
    actionItems,
    bannerTitle,
    bannerDescription,
    bannerType,
    nextStepPrompt,
    isComplete,
  };
}
