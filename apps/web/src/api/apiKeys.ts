import { apiRequest } from "./client";

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  status: "ACTIVE" | "REVOKED";
  lastUsedAt: string | null;
  createdAt: string;
  key?: string;
}

export async function fetchApiKeys(): Promise<ApiKeyRecord[]> {
  const res = await apiRequest<{ data: ApiKeyRecord[] }>("/api-keys");
  return res.data;
}

export async function createApiKey(payload: {
  name: string;
  scopes?: string[];
}): Promise<ApiKeyRecord> {
  const res = await apiRequest<{ data: ApiKeyRecord }>("/api-keys", {
    method: "POST",
    body: payload,
  });
  return res.data;
}

export async function revokeApiKey(id: string): Promise<ApiKeyRecord> {
  const res = await apiRequest<{ data: ApiKeyRecord }>(`/api-keys/${id}/revoke`, {
    method: "POST",
  });
  return res.data;
}
