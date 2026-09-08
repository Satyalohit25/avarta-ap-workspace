import { Prisma } from "@prisma/client";

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
    supplier: invoice.supplier
      ? { id: invoice.supplier.id, name: invoice.supplier.displayName }
      : null,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    totalAmount: invoice.totalAmount.toString(),
    status: invoice.status,
    workflowState: invoice.workflowState,
    aiConfidence: invoice.aiConfidence ? Number(invoice.aiConfidence) : null,
    openExceptionCount: invoice.exceptions.filter((e) => e.status !== "RESOLVED" && e.status !== "REJECTED").length,
    source: invoice.source,
  };
}

export function toInvoiceDetail(invoice: InvoiceDetailPayload) {
  return {
    ...toInvoiceListItem(invoice),
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
    approvals: invoice.approvals?.map((a) => ({
      id: a.id,
      sequenceNumber: a.sequenceNumber,
      status: a.status,
      comment: a.comment,
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

