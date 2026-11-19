import { Prisma } from "@prisma/client";
import { supplierMsmeStore, evaluateMsmeCompliance } from "../suppliers/msme";

type InvoiceListPayload = Prisma.InvoiceGetPayload<{
  include: { supplier: true; exceptions: true };
}>;

type InvoiceDetailPayload = Prisma.InvoiceGetPayload<{
  include: {
    supplier: true;
    workflowInstance: {
      include: {
        transitions: true;
      };
    };
    exceptions: true;
    documents: true;
    lines: true;
    validations: true;
    approvals: { include: { approver: true } };
    payments: true;
  };
}> & {
  auditLogs?: Array<{
    id: string;
    action: string;
    userId: string | null;
    createdAt: Date;
    afterData?: unknown;
    result: string;
  }>;
};

// Doc 14 §14.10 response shape.
export function toInvoiceListItem(invoice: InvoiceListPayload) {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    buyerInvoiceId: (invoice as unknown as { buyerInvoiceId?: string | null }).buyerInvoiceId ?? null,
    fiscalYear: (invoice as unknown as { fiscalYear?: string | null }).fiscalYear ?? null,
    erpClearingNumber: (invoice as unknown as { erpClearingNumber?: string | null }).erpClearingNumber ?? null,
    supplier: invoice.supplier
      ? { id: invoice.supplier.id, name: invoice.supplier.displayName, gstin: invoice.supplier.gstNumber ?? null }
      : null,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    subtotalAmount: (invoice as unknown as { subtotalAmount?: { toString(): string } }).subtotalAmount?.toString() ?? null,
    taxAmount: (invoice as unknown as { taxAmount?: { toString(): string } }).taxAmount?.toString() ?? null,
    totalAmount: invoice.totalAmount.toString(),
    purchaseOrderId: (invoice as unknown as { purchaseOrderId?: string | null }).purchaseOrderId ?? null,
    status: invoice.status,
    workflowState: invoice.workflowState,
    aiConfidence: invoice.aiConfidence ? Number(invoice.aiConfidence) : null,
    openExceptionCount: invoice.exceptions.filter((e) => e.status !== "RESOLVED" && e.status !== "REJECTED").length,
    source: invoice.source,
    msmeCompliance: invoice.supplier
      ? evaluateMsmeCompliance({
          invoiceDate: invoice.invoiceDate
            ? invoice.invoiceDate.toISOString().split("T")[0]
            : invoice.createdAt.toISOString().split("T")[0],
          dueDate: invoice.dueDate ? invoice.dueDate.toISOString().split("T")[0] : null,
          paidDate: invoice.status === "PAID" ? invoice.updatedAt.toISOString().split("T")[0] : null,
          amount: Number(invoice.totalAmount),
          msmeCategory: supplierMsmeStore.getProfile(invoice.organizationId, invoice.supplier.id)?.msmeCategory || "NON_MSME",
          agreedTermsDays: invoice.supplier.paymentTermsDays,
        })
      : null,
  };
}

export function toInvoiceDetail(invoice: InvoiceDetailPayload) {
  return {
    ...toInvoiceListItem(invoice as unknown as InvoiceListPayload),
    workflowState: invoice.workflowInstance?.currentState ?? invoice.workflowState,
    documents: invoice.documents.map((d) => ({
      id: d.id,
      fileName: d.fileName,
      mimeType: d.mimeType,
      storageKey: d.storageKey,
      fileSize: d.fileSize,
      createdAt: d.createdAt,
    })),
    lines: invoice.lines ?? [],
    validations: invoice.validations ?? [],
    exceptions: invoice.exceptions,
    decisionChecklist: invoice.decisionChecklist
      ? typeof invoice.decisionChecklist === "string"
        ? JSON.parse(invoice.decisionChecklist)
        : invoice.decisionChecklist
      : null,
    approvals: invoice.approvals?.map((a) => ({
      id: a.id,
      sequenceNumber: a.sequenceNumber,
      status: a.status,
      comment: a.comment,
      confirmations: a.confirmations
        ? typeof a.confirmations === "string"
          ? JSON.parse(a.confirmations)
          : a.confirmations
        : null,
      requestedAt: a.requestedAt,
      respondedAt: a.respondedAt,
      user: a.approver ? { name: a.approver.fullName, role: a.approver.role } : null,
    })) ?? [],
    payments: invoice.payments?.map((p) => ({
      id: p.id,
      status: p.status,
      amount: p.amount.toString(),
      currency: p.currency,
      paymentMethod: p.paymentMethod,
      referenceNumber: p.paymentReference,
      utrNumber: p.utrNumber ?? null,
      settlementDate: p.settlementDate ?? null,
      clearingDocumentNumber: p.clearingDocumentNumber ?? null,
      scheduledDate: p.scheduledDate,
      processedAt: p.processedAt,
      createdAt: p.createdAt,
    })) ?? [],
    workflowTransitions: invoice.workflowInstance?.transitions?.map((t) => ({
      id: t.id,
      fromState: t.fromState,
      toState: t.toState,
      event: t.event,
      triggeredBy: t.triggeredBy,
      reason: t.reason,
      createdAt: t.createdAt,
    })) ?? [],
    auditLogs: invoice.auditLogs?.map((l) => ({
      id: l.id,
      action: l.action,
      userId: l.userId,
      createdAt: l.createdAt,
      afterData: l.afterData,
      result: l.result,
    })) ?? [],
  };
}

