import fs from "fs";
import path from "path";
import { prisma } from "../../config/database";
import { startWorkflow } from "../../workflow/engine";
import { processInvoice } from "../invoices/service";

export interface EmailAttachment {
  fileName: string;
  mimeType: string;
  contentBase64: string;
}

export interface InboundEmailInput {
  from: string;
  to: string;
  subject: string;
  body?: string;
  attachments?: EmailAttachment[];
  organizationId?: string;
}

export interface InboundEmailResult {
  success: boolean;
  invoiceId: string;
  invoiceNumber: string;
  organizationId: string;
  attachmentCount: number;
}

/**
 * Resolves organization ID from destination email address, supplier email,
 * explicit payload org ID, or demo organization.
 */
async function resolveOrganizationId(to: string, from: string, explicitOrgId?: string): Promise<string> {
  if (explicitOrgId) {
    const org = await prisma.organization.findUnique({ where: { id: explicitOrgId } });
    if (org) return org.id;
  }

  // Check email routing address: e.g. invoices+org-id@domain or invoices-org-id@domain
  const plusMatch = to.match(/invoices\+([a-zA-Z0-9_-]+)@/i);
  if (plusMatch) {
    const org = await prisma.organization.findUnique({ where: { id: plusMatch[1] } });
    if (org) return org.id;
  }

  const dashMatch = to.match(/invoices-([a-zA-Z0-9_-]+)@/i);
  if (dashMatch) {
    const org = await prisma.organization.findUnique({ where: { id: dashMatch[1] } });
    if (org) return org.id;
  }

  // Lookup supplier by sender email
  const supplier = await prisma.supplier.findFirst({
    where: { email: { equals: from, mode: "insensitive" } },
  });
  if (supplier) return supplier.organizationId;

  // Demo fallback: default to first available organization
  const defaultOrg = await prisma.organization.findFirst();
  if (defaultOrg) return defaultOrg.id;

  throw new Error("Cannot resolve organization for incoming invoice email.");
}

/**
 * Ingests inbound email, creates an invoice with source "EMAIL", attaches documents,
 * and starts automated capture and validation pipeline.
 */
export async function processInboundEmail(input: InboundEmailInput): Promise<InboundEmailResult> {
  const { from, to, subject, body: _body, attachments = [], organizationId: explicitOrgId } = input;

  const organizationId = await resolveOrganizationId(to, from, explicitOrgId);

  // Match supplier if known
  const supplier = await prisma.supplier.findFirst({
    where: {
      organizationId,
      email: { equals: from, mode: "insensitive" },
    },
  });

  // Extract or generate invoice number from subject
  const subjectMatch = subject.match(/(?:INVOICE|BILL|INV)\b[#:\s-]*([A-Z0-9-]+)/i);
  const invoiceNumber = subjectMatch
    ? subjectMatch[1].toUpperCase()
    : `INV-EML-${Date.now().toString().slice(-6)}`;

  const invoice = await prisma.invoice.create({
    data: {
      organizationId,
      invoiceNumber,
      supplierId: supplier?.id ?? null,
      source: "EMAIL",
      status: "RECEIVED",
      workflowState: "RECEIVED",
      currency: "INR",
      totalAmount: 0, // Updated during extraction
    },
  });

  await startWorkflow(invoice.id);

  // Save attachments to storage directory
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  for (let i = 0; i < attachments.length; i++) {
    const att = attachments[i];
    const storageKey = `email_${invoice.id}_${Date.now()}_${path.basename(att.fileName)}`;
    const filePath = path.resolve(uploadsDir, storageKey);

    const buffer = Buffer.from(att.contentBase64, "base64");
    fs.writeFileSync(filePath, buffer);

    await prisma.document.create({
      data: {
        invoiceId: invoice.id,
        fileName: att.fileName,
        mimeType: att.mimeType,
        storageKey,
        fileSize: buffer.length,
      },
    });
  }

  // Trigger processing pipeline asynchronously (OCR + 3-way matching)
  processInvoice(organizationId, invoice.id).catch((err) => {
    console.warn(`[EMAIL INTAKE] Async processInvoice error for ${invoice.id}:`, err);
  });

  return {
    success: true,
    invoiceId: invoice.id,
    invoiceNumber,
    organizationId,
    attachmentCount: attachments.length,
  };
}
