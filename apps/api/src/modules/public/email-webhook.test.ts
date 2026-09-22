import { describe, expect, it, vi } from "vitest";
import { processInboundEmail } from "./email-webhook";
import { prisma } from "../../config/database";
import * as workflowEngine from "../../workflow/engine";

describe("Inbound Email Intake Webhook (Step 12)", () => {
  it("ingests email with attachments and creates EMAIL source invoice", async () => {
    vi.spyOn(prisma.organization, "findUnique").mockResolvedValue({
      id: "org-1",
      name: "Acme Corp",
    } as any);

    vi.spyOn(prisma.supplier, "findFirst").mockResolvedValue({
      id: "sup-1",
      displayName: "Tata Chemicals",
      organizationId: "org-1",
    } as any);

    const invoiceCreateSpy = vi
      .spyOn(prisma.invoice, "create")
      .mockResolvedValue({
        id: "inv-eml-1",
        invoiceNumber: "INV-9901",

        organizationId: "org-1",
        source: "EMAIL",
      } as any);

    const workflowSpy = vi
      .spyOn(workflowEngine, "startWorkflow")
      .mockResolvedValue({} as any);
    const docCreateSpy = vi
      .spyOn(prisma.document, "create")
      .mockResolvedValue({} as any);

    const result = await processInboundEmail({
      from: "billing@tatachemicals.com",
      to: "invoices+org-1@clearops.io",
      subject: "Invoice #INV-9901 from Tata Chemicals",
      body: "Please find attached our monthly invoice.",
      attachments: [
        {
          fileName: "invoice-9901.pdf",
          mimeType: "application/pdf",
          contentBase64: Buffer.from("dummy-pdf-content").toString("base64"),
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.invoiceNumber).toBe("INV-9901");
    expect(result.attachmentCount).toBe(1);
    expect(invoiceCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: "EMAIL",
          invoiceNumber: "INV-9901",
        }),
      }),
    );
    expect(workflowSpy).toHaveBeenCalledWith("inv-eml-1");
    expect(docCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fileName: "invoice-9901.pdf",
        }),
      }),
    );
  });
});
