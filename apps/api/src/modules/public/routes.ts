import crypto from "crypto";
import { Router, Request, Response } from "express";
import { prisma } from "../../config/database";
import { runWithEngineBypass } from "../../config/tenant-guard";

export const publicRoutes = Router();

// Public unauthenticated tracking endpoint for vendors
publicRoutes.get("/invoices/track/:token", async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    if (!token || token.length < 4) {
      res.status(400).json({ error: "Invalid tracking token format" });
      return;
    }

    // Lookup invoice by tracking token or fallback ID prefix within engine bypass context
    const invoice = await runWithEngineBypass(() =>
      prisma.invoice.findFirst({
        where: {
          OR: [
            { id: token },
            { invoiceNumber: token },
          ],
        },
        include: {
          supplier: {
            select: { displayName: true, legalName: true },
          },
          payments: {
            select: {
              status: true,
              scheduledDate: true,
              processedAt: true,
              utrNumber: true,
              clearingDate: true,
              clearingDocumentNumber: true,
            },
          },
        },
      })
    );

    if (!invoice) {
      res.status(404).json({ error: "Invoice not found for tracking token" });
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

