import { prisma } from "../../config/database";
import { SAAS_PLANS, PlanTier, PlanDefinition } from "./plans";
import { ApiError } from "../../lib/errors";

export interface TenantUsageSummary {
  plan: PlanDefinition;
  status: "ACTIVE" | "PAST_DUE" | "CANCELED";
  periodEnd: string;
  usage: {
    invoicesUsed: number;
    /** null means unlimited */
    invoicesLimit: number | null;
    invoicesRemaining: number | null;
    invoiceQuotaPercentage: number;
    seatsUsed: number;
    /** null means unlimited */
    seatsLimit: number | null;
    seatsRemaining: number | null;
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
  pdfDownloadUrl: string | null;
}

interface TenantPlanRecord {
  planId: PlanTier;
  status: "ACTIVE" | "PAST_DUE" | "CANCELED";
  periodEnd: Date;
}

function normalizePlanTier(value: string): PlanTier {
  return value === "STARTER" || value === "ENTERPRISE" ? value : "GROWTH";
}

function normalizeStatus(value: string): "ACTIVE" | "PAST_DUE" | "CANCELED" {
  return value === "PAST_DUE" || value === "CANCELED" ? value : "ACTIVE";
}

async function ensureSubscription(organizationId: string) {
  const existing = await prisma.subscription.findUnique({ where: { organizationId } });
  if (existing) return existing;

  return prisma.subscription.create({
    data: {
      organizationId,
      planTier: "GROWTH",
      status: "ACTIVE",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
}

export async function getTenantPlan(organizationId: string): Promise<TenantPlanRecord> {
  const subscription = await ensureSubscription(organizationId);
  return {
    planId: normalizePlanTier(subscription.planTier),
    status: normalizeStatus(subscription.status),
    periodEnd: subscription.currentPeriodEnd,
  };
}

export async function getTenantUsage(organizationId: string): Promise<TenantUsageSummary> {
  const sub = await getTenantPlan(organizationId);
  const plan = SAAS_PLANS[sub.planId] || SAAS_PLANS.GROWTH;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const invoicesUsed = await prisma.invoice.count({
    where: { organizationId, createdAt: { gte: startOfMonth } },
  });

  const seatsUsed = await prisma.user.count({
    where: { organizationId, status: "ACTIVE" },
  });

  const unlimitedInvoices = plan.monthlyInvoiceLimit === Infinity;
  const unlimitedSeats = plan.seatLimit === Infinity;

  return {
    plan,
    status: sub.status,
    periodEnd: sub.periodEnd.toISOString(),
    usage: {
      invoicesUsed,
      invoicesLimit: unlimitedInvoices ? null : plan.monthlyInvoiceLimit,
      invoicesRemaining: unlimitedInvoices
        ? null
        : Math.max(0, plan.monthlyInvoiceLimit - invoicesUsed),
      invoiceQuotaPercentage: unlimitedInvoices
        ? 0
        : Math.min(100, Math.round((invoicesUsed / plan.monthlyInvoiceLimit) * 100)),
      seatsUsed,
      seatsLimit: unlimitedSeats ? null : plan.seatLimit,
      seatsRemaining: unlimitedSeats ? null : Math.max(0, plan.seatLimit - seatsUsed),
    },
    features: plan.features,
  };
}

export async function checkCanCreateInvoice(organizationId: string): Promise<void> {
  const usage = await getTenantUsage(organizationId);
  if (usage.status === "PAST_DUE" || usage.status === "CANCELED") {
    throw ApiError.forbidden(
      "Subscription is past due or inactive. Please update your payment method to process invoices."
    );
  }
  if (
    usage.usage.invoicesLimit !== null &&
    usage.usage.invoicesUsed >= usage.usage.invoicesLimit
  ) {
    throw ApiError.badRequest(
      `Monthly invoice processing limit reached (${usage.usage.invoicesUsed}/${usage.usage.invoicesLimit} on ${usage.plan.name} plan). Please upgrade to Growth or Enterprise to continue.`
    );
  }
}

export async function checkCanInviteUser(organizationId: string): Promise<void> {
  const usage = await getTenantUsage(organizationId);
  if (
    usage.usage.seatsLimit !== null &&
    usage.usage.seatsUsed >= usage.usage.seatsLimit
  ) {
    throw ApiError.badRequest(
      `Team seat limit reached (${usage.usage.seatsUsed}/${usage.usage.seatsLimit} on ${usage.plan.name} plan). Upgrade your subscription to add more team members.`
    );
  }
}

export async function upgradeTenantPlan(
  organizationId: string,
  newPlanId: PlanTier,
  actorUserId?: string
): Promise<TenantUsageSummary> {
  if (!SAAS_PLANS[newPlanId]) {
    throw ApiError.badRequest(`Invalid plan tier: ${newPlanId}`);
  }

  const before = await getTenantPlan(organizationId);
  const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.subscription.upsert({
    where: { organizationId },
    create: {
      organizationId,
      planTier: newPlanId,
      status: "ACTIVE",
      currentPeriodEnd,
    },
    update: {
      planTier: newPlanId,
      status: "ACTIVE",
      currentPeriodStart: new Date(),
      currentPeriodEnd,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: actorUserId || null,
      action: "SUBSCRIPTION_PLAN_CHANGED",
      entityType: "subscription",
      entityId: organizationId,
      beforeData: { planTier: before.planId, status: before.status },
      afterData: { planTier: newPlanId, status: "ACTIVE" },
    },
  });

  return getTenantUsage(organizationId);
}

export async function getBillingReceipts(
  organizationId: string
): Promise<BillingInvoiceReceipt[]> {
  const receipts = await prisma.billingReceipt.findMany({
    where: { organizationId },
    orderBy: { issuedAt: "desc" },
    take: 50,
  });

  return receipts.map((receipt) => ({
    id: receipt.id,
    invoiceNumber: receipt.invoiceNumber,
    date: receipt.issuedAt.toISOString().split("T")[0],
    amount: Number(receipt.amount),
    currency: receipt.currency,
    status:
      receipt.status === "PENDING" || receipt.status === "FAILED"
        ? receipt.status
        : "PAID",
    pdfDownloadUrl: receipt.pdfUrl,
  }));
}
