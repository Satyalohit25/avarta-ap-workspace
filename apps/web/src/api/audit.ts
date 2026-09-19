import { apiRequest } from "./client";

export interface AuditLogItem {
  id: string;
  organizationId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  result: string;
  createdAt: string;
}

export interface AuditListResponse {
  data: AuditLogItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchInvoiceAudit(invoiceId: string): Promise<AuditListResponse> {
  return apiRequest<AuditListResponse>(`/invoices/${invoiceId}/audit`);
}

export async function fetchAuditLogs(params?: {
  entityType?: string;
  entityId?: string;
  action?: string;
  page?: number;
  pageSize?: number;
}): Promise<AuditListResponse> {
  return apiRequest<AuditListResponse>("/audit", {
    query: params as Record<string, string | number | undefined>,
  });
}
