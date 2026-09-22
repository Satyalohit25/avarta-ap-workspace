import { apiRequest } from "./client";

export interface DemoResetResponse {
  data: {
    success: boolean;
    organization: string;
    seededAt: string;
    counts: {
      organizations: number;
      users: number;
      suppliers: number;
      purchaseOrders: number;
      goodsReceipts: number;
      invoices: number;
      exceptions: number;
      approvals: number;
      payments: number;
    };
    scenarios: string[];
  };
  message: string;
}

export async function resetDemoEnvironment(): Promise<DemoResetResponse> {
  return apiRequest<DemoResetResponse>("/demo/reset", {
    method: "POST",
  });
}
