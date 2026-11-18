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
 * Enforces buffer length check before timing-safe comparison to avoid runtime throwing (T-210 / BILL-HMAC-01).
 */
export function verifyWebhookSignature(rawPayload: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  try {
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(rawPayload)
      .digest("hex");
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(sigBuf, expectedBuf);
  } catch {
    return false;
  }
}

export async function handleBillingWebhook(req: Request, res: Response): Promise<void> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || process.env.BILLING_WEBHOOK_SECRET;
  const signature =
    (req.headers["stripe-signature"] as string) || (req.headers["x-billing-signature"] as string);

  if (process.env.NODE_ENV === "production" || webhookSecret) {
    if (!signature || !webhookSecret) {
      res.status(401).json({ error: "Missing cryptographic webhook signature or configured secret" });
      return;
    }

    // Verify timestamp freshness if timestamp header or payload created timestamp is provided (max 5 minutes)
    const timestampHeader =
      (req.headers["stripe-signature-timestamp"] as string) ||
      (req.headers["x-webhook-timestamp"] as string) ||
      (req.body?.created ? String(req.body.created) : undefined);

    if (timestampHeader) {
      const tsNum = Number(timestampHeader);
      // Determine if seconds or ms
      const timestampMs = tsNum < 1e11 ? tsNum * 1000 : tsNum;
      const ageMs = Math.abs(Date.now() - timestampMs);
      if (ageMs > 5 * 60 * 1000) {
        res.status(401).json({ error: "Webhook timestamp expired (older than 5 minutes)" });
        return;
      }
    }

    const rawPayload = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    const isValid = verifyWebhookSignature(rawPayload, signature, webhookSecret);
    if (!isValid) {
      res.status(401).json({ error: "Cryptographic signature verification failed" });
      return;
    }
  }

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
