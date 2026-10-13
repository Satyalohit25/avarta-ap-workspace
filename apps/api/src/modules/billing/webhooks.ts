import crypto from "crypto";
import { Request, Response } from "express";
import { prisma } from "../../config/database";
import { upgradeTenantPlan, getTenantPlan } from "./service";
import { PlanTier } from "./plans";

export interface WebhookResult {
  received: boolean;
  event: string;
  processed: boolean;
  reason?: string;
}

/**
 * Validates Stripe/Razorpay HMAC signature.
 */
export function verifyWebhookSignature(rawPayload: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  try {
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(rawPayload)
      .digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

/**
 * Processes incoming billing webhook idempotently.
 */
export async function handleBillingWebhook(req: Request, res: Response): Promise<void> {
  const eventId = (req.headers["stripe-event-id"] as string) || (req.body?.id as string) || `evt_${Date.now()}`;
  const eventType = req.body?.type || req.body?.event || "unknown";
  const orgId = req.body?.data?.object?.metadata?.organizationId || req.body?.payload?.organizationId;

  // Check idempotency key in DB to prevent duplicate processing on retries
  if (orgId && eventId) {
    const existing = await prisma.idempotencyKey.findFirst({
      where: {
        organizationId: orgId,
        key: `webhook_${eventId}`,
      },
    });

    if (existing) {
      res.status(200).json({ received: true, deduplicated: true, event: eventType });
      return;
    }
  }

  // Handle billing lifecycle events
  switch (eventType) {
    case "invoice.paid":
    case "subscription.activated": {
      if (orgId) {
        const planTier = (req.body?.data?.object?.metadata?.planTier as PlanTier) || "GROWTH";
        await upgradeTenantPlan(orgId, planTier);
      }
      break;
    }

    case "invoice.payment_failed": {
      if (orgId) {
        const current = await getTenantPlan(orgId);
        current.status = "PAST_DUE";
        // Log to audit log
        await prisma.auditLog.create({
          data: {
            organizationId: orgId,
            action: "BILLING_PAYMENT_FAILED",
            entityType: "Subscription",
            entityId: orgId,
            result: "WARNING",
            afterData: { status: "PAST_DUE", eventId },
          },
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      if (orgId) {
        const current = await getTenantPlan(orgId);
        current.status = "CANCELED";
        await prisma.auditLog.create({
          data: {
            organizationId: orgId,
            action: "BILLING_SUBSCRIPTION_CANCELED",
            entityType: "Subscription",
            entityId: orgId,
            result: "NOTICE",
            afterData: { status: "CANCELED", eventId },
          },
        });
      }
      break;
    }

    default:
      break;
  }

  // Record idempotency key if orgId is available
  if (orgId && eventId) {
    await prisma.idempotencyKey.create({
      data: {
        organizationId: orgId,
        key: `webhook_${eventId}`,
        method: "POST",
        path: "/api/billing/webhook",
        statusCode: 200,
        responseBody: { event: eventType, processed: true },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  }

  res.status(200).json({ received: true, processed: true, event: eventType });
}
