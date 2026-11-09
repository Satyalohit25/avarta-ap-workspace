import { apiRequest } from "./client";

export interface BillingPlan {
  id: "STARTER" | "GROWTH" | "ENTERPRISE";
  name: string;
  tagline: string;
  priceMonthlyInr: number;
  priceMonthlyUsd: number;
  monthlyInvoiceLimit: number | null;
  seatLimit: number | null;
  features: Record<string, boolean>;
}

export interface TenantUsage {
  plan: BillingPlan;
  status: "ACTIVE" | "PAST_DUE" | "CANCELED";
  periodEnd: string;
  usage: {
    invoicesUsed: number;
    invoicesLimit: number | null;
    invoicesRemaining: number | null;
    invoiceQuotaPercentage: number;
    seatsUsed: number;
    seatsLimit: number | null;
    seatsRemaining: number | null;
  };
  features: Record<string, boolean>;
}

export interface BillingReceipt {
  id: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  currency: string;
  status: "PAID" | "PENDING" | "FAILED";
  pdfDownloadUrl: string | null;
}

export async function fetchBillingPlans(): Promise<BillingPlan[]> {
  const res = await apiRequest<{ data: BillingPlan[] }>("/billing/plans");
  return res.data;
}

export async function fetchTenantUsage(): Promise<TenantUsage> {
  const res = await apiRequest<{ data: TenantUsage }>("/billing/usage");
  return res.data;
}

export async function fetchBillingReceipts(): Promise<BillingReceipt[]> {
  const res = await apiRequest<{ data: BillingReceipt[] }>("/billing/receipts");
  return res.data;
}

export async function upgradeTenantPlan(planTier: "STARTER" | "GROWTH" | "ENTERPRISE"): Promise<TenantUsage> {
  const res = await apiRequest<{ data: TenantUsage }>("/billing/upgrade", {
    method: "POST",
    body: { planTier },
  });
  return res.data;
}
