import { apiRequest } from "./client";

export interface IntegrationsStatusData {
  byok: {
    provider: string;
    maskedKey?: string;
    status: string;
    lastTestedAt?: string;
    modelsAvailable?: string[];
  };
  byodb: {
    mode: "MANAGED" | "CUSTOM";
    maskedUrl?: string;
    status: string;
    latencyMs?: number;
    lastTestedAt?: string;
    databaseName?: string;
  };
  erp: {
    provider: string;
    name: string;
    status: string;
    lastSyncAt?: string;
    config?: Record<string, string>;
  };
  paymentGateway?: {
    provider: string;
    name: string;
    status: string;
    accountName?: string;
    maskedKey?: string;
    lastTestedAt?: string;
  };
}

export interface ByokTestResponse {
  success: boolean;
  provider: string;
  latencyMs: number;
  modelsAvailable?: string[];
  message: string;
}

export interface ByodbTestResponse {
  success: boolean;
  latencyMs: number;
  databaseName?: string;
  serverVersion?: string;
  tableCount?: number;
  message: string;
}

export interface ErpTestResponse {
  success: boolean;
  latencyMs: number;
  message: string;
}

export interface ErpSyncResponse {
  syncedCount: number;
  batchReference: string;
  format: string;
}

export async function fetchIntegrationsStatus(): Promise<IntegrationsStatusData> {
  const res = await apiRequest<{ data: IntegrationsStatusData }>("/integrations/status");
  return res.data;
}

export async function testByokKey(payload: {
  provider: "GEMINI" | "OPENAI" | "TEXTRACT";
  apiKey: string;
  save?: boolean;
}): Promise<ByokTestResponse> {
  const res = await apiRequest<{ data: ByokTestResponse }>("/integrations/byok/test", {
    method: "POST",
    body: payload,
  });
  return res.data;
}

export async function testByodbConnection(payload: {
  connectionUrl: string;
  save?: boolean;
}): Promise<ByodbTestResponse> {
  const res = await apiRequest<{ data: ByodbTestResponse }>("/integrations/byodb/test", {
    method: "POST",
    body: payload,
  });
  return res.data;
}

export async function testErpConnection(payload: {
  provider: string;
  config: Record<string, string>;
  save?: boolean;
}): Promise<ErpTestResponse> {
  const res = await apiRequest<{ data: ErpTestResponse }>("/integrations/erp/test", {
    method: "POST",
    body: payload,
  });
  return res.data;
}

export async function triggerErpSync(): Promise<ErpSyncResponse> {
  const res = await apiRequest<{ data: ErpSyncResponse }>("/integrations/erp/sync-now", {
    method: "POST",
  });
  return res.data;
}

export interface PaymentGatewayTestResponse {
  success: boolean;
  provider: string;
  message: string;
  accountName?: string;
  balanceCurrency?: string;
  availableBalance?: number;
  latencyMs: number;
}

export async function testPaymentGatewayConnection(payload: {
  provider: "RAZORPAYX" | "CASHFREE" | "STRIPE" | "MANUAL_BANK_TRANSFER";
  config?: Record<string, string>;
  save?: boolean;
}): Promise<PaymentGatewayTestResponse> {
  const res = await apiRequest<{ data: PaymentGatewayTestResponse }>("/integrations/payment-gateway/test", {
    method: "POST",
    body: payload,
  });
  return res.data;
}

