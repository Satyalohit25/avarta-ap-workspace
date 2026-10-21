import crypto from "crypto";
import { Router, Request, Response } from "express";
import { prisma } from "../../config/database";
import { publicTrackRateLimiter } from "../../middleware/rate-limiter";
import { hashTrackingToken } from "../../lib/crypto";
import { findInvoiceByPublicTrackingHash } from "../invoices/repository";

export const publicRoutes = Router();

// Public unauthenticated tracking endpoint for vendors with rate limiting
publicRoutes.get("/invoices/track/:token", publicTrackRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    // Security headers required by ACT-P0-01
    res.setHeader("Cache-Control", "no-store, private");
    res.setHeader("Referrer-Policy", "no-referrer");

    const { token } = req.params;

    if (!token || typeof token !== "string" || token.length < 16) {
      res.status(404).json({ error: "Invoice not found for tracking token" });
      return;
    }

    // Lookup invoice strictly by SHA-256 hash through named unscoped wrapper
    const tokenHash = hashTrackingToken(token);
    const invoice = await findInvoiceByPublicTrackingHash(tokenHash);

    if (!invoice) {
      res.status(404).json({ error: "Invoice not found for tracking token" });
      return;
    }

    // Expiry check: Return 410 Gone if tracking link has expired
    if (invoice.trackingTokenExpiresAt && new Date() > new Date(invoice.trackingTokenExpiresAt)) {
      res.status(410).json({
        error: "Tracking link expired. Please contact the accounts payable team for a refreshed link.",
      });
      return;
    }

    // Map internal workflow state to clean vendor-facing language
    let publicStatus = "Received";
    let publicStatusStage = 1;
    let notes = "Invoice received and logged into processing queue.";

    const latestPayment = invoice.payments?.[0];

    if (invoice.status === "PAID") {
      publicStatus = "Paid";
      publicStatusStage = 4;
      notes = `Remittance dispatched${latestPayment?.utrNumber ? ` under UTR ${latestPayment.utrNumber}` : ""}. Bank clearing confirmed.`;
    } else if (invoice.status === "APPROVED" || invoice.status === "SCHEDULED") {
      publicStatus = "Approved for Payment";
      publicStatusStage = 3;
      notes = `Payment scheduled for estimated release on ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-IN") : "due date"}.`;
    } else if (invoice.status === "PROCESSING" || invoice.status === "PENDING_APPROVAL") {
      publicStatus = "Under Review";
      publicStatusStage = 2;
      notes = "Under standard financial verification and 3-way matching.";
    } else if (invoice.status === "EXCEPTION") {
      publicStatus = "Under Review";
      publicStatusStage = 2;
      notes = "Verification in progress with internal commercial team.";
    }

    const supplierName = invoice.supplier?.displayName ?? invoice.supplier?.legalName ?? "Vendor Partner";

    res.json({
      data: {
        invoiceNumber: invoice.invoiceNumber,
        buyerInvoiceId: (invoice as unknown as { buyerInvoiceId?: string | null }).buyerInvoiceId ?? null,
        fiscalYear: (invoice as unknown as { fiscalYear?: string | null }).fiscalYear ?? null,
        supplierName,
        amount: Number(invoice.totalAmount),
        currency: invoice.currency,
        receivedDate: invoice.invoiceDate ?? invoice.createdAt,
        publicStatus,
        publicStatusStage,
        estimatedPaymentDate: invoice.dueDate,
        utrNumber: latestPayment?.utrNumber ?? null,
        clearingDate: latestPayment?.clearingDate ?? null,
        clearingDocumentNumber: latestPayment?.clearingDocumentNumber ?? null,
        notes,
      },
    });
  } catch (err) {
    console.error("Public track invoice error:", err);
    res.status(500).json({ error: "Failed to retrieve invoice status" });
  }
});

// Inbound email intake webhook (Step 12)
publicRoutes.post("/invoices/email-webhook", async (req: Request, res: Response): Promise<void> => {
  try {
    const webhookSecret = process.env.EMAIL_WEBHOOK_SECRET;
    const signature =
      (req.headers["x-webhook-signature"] as string) || (req.headers["x-postmark-signature"] as string);

    if (process.env.NODE_ENV === "production" || webhookSecret) {
      if (!signature || !webhookSecret) {
        res.status(401).json({ error: "Missing cryptographic email webhook signature or secret" });
        return;
      }
      const rawPayload = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      const expected = crypto.createHmac("sha256", webhookSecret).update(rawPayload).digest("hex");
      let isValid = false;
      try {
        isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
      } catch {
        isValid = false;
      }
      if (!isValid) {
        res.status(401).json({ error: "Cryptographic signature verification failed" });
        return;
      }
    }

    const { from, to, subject, body, attachments, organizationId } = req.body;
    if (!from || !to || !subject) {
      res.status(400).json({ error: "Missing required fields: from, to, subject" });
      return;
    }
    const { processInboundEmail } = await import("./email-webhook");
    const result = await processInboundEmail({
      from,
      to,
      subject,
      body,
      attachments,
      organizationId,
    });
    res.status(201).json({ data: result });
  } catch (err: unknown) {
    console.error("Email webhook processing error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to process inbound email",
    });
  }
});

