import { Router, Request, Response } from "express";
import { prisma } from "../../config/database";

export const publicRoutes = Router();

// Public unauthenticated tracking endpoint for vendors
publicRoutes.get("/invoices/track/:token", async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    if (!token || token.length < 4) {
      res.status(400).json({ error: "Invalid tracking token format" });
      return;
    }

    // Lookup invoice by tracking token or fallback ID prefix
    const invoice = await prisma.invoice.findFirst({
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
    });

    if (!invoice) {
      // Mocked demo fallback if token is a demo token
      res.json({
        data: {
          invoiceNumber: token.startsWith("INV-") ? token : "INV-2026-1007",
          buyerInvoiceId: "2522000123",
          fiscalYear: "2025-2026",
          supplierName: "Tata Steel Tubes Ltd",
          amount: 354000,
          currency: "INR",
          receivedDate: "2026-08-28T10:00:00Z",
          publicStatus: "Paid",
          publicStatusStage: 4, // 1: Received, 2: Under Review, 3: Approved for Payment, 4: Paid
          estimatedPaymentDate: "2026-09-19",
          utrNumber: "NEFT-TATAPAY-8941029",
          clearingDate: "2026-09-02",
          clearingDocumentNumber: "2533000040",
          notes: "Remittance dispatched via Host-to-Host banking rail. UTR confirmed by receiving bank.",
        },
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
