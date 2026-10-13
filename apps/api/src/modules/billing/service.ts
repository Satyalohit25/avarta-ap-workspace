import { prisma } from "../../config/database";
import { SAAS_PLANS, PlanTier, PlanDefinition } from "./plans";
import { ApiError } from "../../lib/errors";

// In-memory tenant plan cache / override store (can be backed by DB/Stripe)
const tenantPlanStore = new Map<string, { planId: PlanTier; status: "ACTIVE" | "PAST_DUE" | "CANCELED"; periodEnd: Date }>();

export interface TenantUsageSummary {
  plan: PlanDefinition;
  status: "ACTIVE" | "PAST_DUE" | "CANCELED";
  periodEnd: string;
  usage: {
    invoicesUsed: number;
    invoicesLimit: number;
    invoicesRemaining: number;
    invoiceQuotaPercentage: number;
    seatsUsed: number;
    seatsLimit: number;
    seatsRemaining: number;
  };
  features: PlanDefinition["features"];
}

export interface BillingInvoiceReceipt {
  id: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  currency: string;
  status: "PAID" | "PENDING" | "FAILED";
  pdfDownloadUrl: string;
}

export async function getTenantPlan(organizationId: string): Promise<{ planId: PlanTier; status: "ACTIVE" | "PAST_DUE" | "CANCELED"; periodEnd: Date }> {
  const existing = tenantPlanStore.get(organizationId);
  if (existing) return existing;

  // Default demo / new organization plan is GROWTH
  const defaultSub = {
    planId: "GROWTH" as PlanTier,
    status: "ACTIVE" as const,
    periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };
  tenantPlanStore.set(organizationId, defaultSub);
  return defaultSub;
}

export async function getTenantUsage(organizationId: string): Promise<TenantUsageSummary> {
  const sub = await getTenantPlan(organizationId);
  const plan = SAAS_PLANS[sub.planId] || SAAS_PLANS.GROWTH;

  // Calculate start of current billing month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Count invoices created this billing month
  const invoicesUsed = await prisma.invoice.count({
    where: {
      organizationId,
      createdAt: { gte: startOfMonth },
    },
  });

  // Count active users in this organization
  const seatsUsed = await prisma.user.count({
    where: {
      organizationId,
      status: "ACTIVE",
    },
  });

  const invoicesLimit = plan.monthlyInvoiceLimit;
  const invoicesRemaining = invoicesLimit === Infinity ? Infinity : Math.max(0, invoicesLimit - invoicesUsed);
  const invoiceQuotaPercentage = invoicesLimit === Infinity ? 0 : Math.min(100, Math.round((invoicesUsed / invoicesLimit) * 100));

  const seatsLimit = plan.seatLimit;
  const seatsRemaining = seatsLimit === Infinity ? Infinity : Math.max(0, seatsLimit - seatsUsed);

  return {
    plan,
    status: sub.status,
    periodEnd: sub.periodEnd.toISOString(),
    usage: {
      invoicesUsed,
      invoicesLimit,
      invoicesRemaining,
      invoiceQuotaPercentage,
      seatsUsed,
      seatsLimit,
      seatsRemaining,
    },
    features: plan.features,
  };
}

export async function checkCanCreateInvoice(organizationId: string): Promise<void> {
  const usage = await getTenantUsage(organizationId);
  if (usage.status === "PAST_DUE" || usage.status === "CANCELED") {
    throw ApiError.forbidden("Subscription is past due or inactive. Please update your payment method to process invoices.");
  }
  if (usage.usage.invoicesLimit !== Infinity && usage.usage.invoicesUsed >= usage.usage.invoicesLimit) {
    throw ApiError.badRequest(
      `Monthly invoice processing limit reached (${usage.usage.invoicesUsed}/${usage.usage.invoicesLimit} on ${usage.plan.name} plan). Please upgrade to Growth or Enterprise to continue.`
    );
  }
}

export async function checkCanInviteUser(organizationId: string): Promise<void> {
  const usage = await getTenantUsage(organizationId);
  if (usage.usage.seatsLimit !== Infinity && usage.usage.seatsUsed >= usage.usage.seatsLimit) {
    throw ApiError.badRequest(
      `Team seat limit reached (${usage.usage.seatsUsed}/${usage.usage.seatsLimit} on ${usage.plan.name} plan). Upgrade your subscription to add more team members.`
    );
  }
}

export async function upgradeTenantPlan(organizationId: string, newPlanId: PlanTier): Promise<TenantUsageSummary> {
  if (!SAAS_PLANS[newPlanId]) {
    throw ApiError.badRequest(`Invalid plan tier: ${newPlanId}`);
  }

  const updated = {
    planId: newPlanId,
    status: "ACTIVE" as const,
    periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  };
  tenantPlanStore.set(organizationId, updated);

  return getTenantUsage(organizationId);
}

export async function getBillingReceipts(organizationId: string): Promise<BillingInvoiceReceipt[]> {
  const sub = await getTenantPlan(organizationId);
  const plan = SAAS_PLANS[sub.planId] || SAAS_PLANS.GROWTH;

  // Return generated/historical SaaS receipts
  return [
    {
      id: `rcpt_${organizationId.slice(0, 8)}_01`,
      invoiceNumber: `AV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      amount: plan.priceMonthlyInr,
      currency: "INR",
      status: "PAID",
      pdfDownloadUrl: `/api/billing/receipts/latest.pdf`,
    },
    {
      id: `rcpt_${organizationId.slice(0, 8)}_02`,
      invoiceNumber: `AV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      amount: plan.priceMonthlyInr,
      currency: "INR",
      status: "PAID",
      pdfDownloadUrl: `/api/billing/receipts/previous.pdf`,
    },
  ];
}
