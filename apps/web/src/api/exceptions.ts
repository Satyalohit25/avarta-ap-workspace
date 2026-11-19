import { apiRequest } from "./client";
import { notifyMutation } from "../lib/events";

export interface ExceptionItem {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  vendor: string;
  type: string;
  title: string;
  severity: string;
  status: string;
  owner: string | null;
  createdAt: string;
}

export function listExceptions(params: { status?: string; severity?: string } = {}) {
  return apiRequest<{ data: ExceptionItem[]; meta: unknown }>("/exceptions", { query: params });
}

export async function resolveException(exceptionId: string, resolution: string) {
  const result = await apiRequest<{ data: ExceptionItem }>(`/exceptions/${exceptionId}/resolve`, {
    method: "POST",
    body: { resolution },
  });
  notifyMutation("exceptions");
  return result;
}
