import fs from "fs";
import path from "path";
import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/database";
import { ApiError } from "../../lib/errors";
import { createInvoiceSchema, updateInvoiceSchema, listInvoicesQuerySchema, transitionSchema } from "./validation";
import * as invoiceService from "./service";
import { generateInvoicePdfBuffer } from "./pdfGenerator";

function orgId(req: Request): string {
  if (!req.auth) throw ApiError.unauthorized();
  return req.auth.organizationId;
}

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listInvoicesQuerySchema.parse(req.query);
    const result = await invoiceService.listInvoices({ organizationId: orgId(req), ...query });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const invoice = await invoiceService.getInvoice(orgId(req), req.params.invoiceId);
    res.json({ data: invoice });
  } catch (err) {
    next(err);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createInvoiceSchema.parse(req.body);
    const fileInfo = req.file
      ? {
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          storageKey: req.file.filename,
          fileSize: req.file.size,
        }
      : undefined;

    const invoice = await invoiceService.createInvoice({
      organizationId: orgId(req),
      ...body,
      file: fileInfo,
    });
    res.status(201).json({ data: invoice });
  } catch (err) {
    next(err);
  }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = updateInvoiceSchema.parse(req.body);
    const invoice = await invoiceService.updateInvoice({
      organizationId: orgId(req),
      invoiceId: req.params.invoiceId,
      ...body,
    });
    res.json({ data: invoice });
  } catch (err) {
    next(err);
  }
}

export async function getDocumentFileHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.documentId },
      include: { invoice: { include: { supplier: true } } },
    });

    if (!document || document.invoice.organizationId !== orgId(req)) {
      throw ApiError.notFound("Document not found");
    }

    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, document.storageKey);
    if (!fs.existsSync(filePath)) {
      // Auto-generate statutory PDF voucher if seeded storage file is missing
      const pdfBuffer = generateInvoicePdfBuffer({
        invoiceNumber: document.invoice.invoiceNumber,
        vendorName:
          document.invoice.supplier?.displayName ||
          document.invoice.supplier?.legalName ||
          "Verified AP Supplier",
        totalAmount: Number(document.invoice.totalAmount) || 0,
        currency: document.invoice.currency || "INR",
        date: document.invoice.invoiceDate
          ? new Date(document.invoice.invoiceDate).toLocaleDateString("en-IN")
          : undefined,
      });
      fs.writeFileSync(filePath, pdfBuffer);
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${document.fileName || `${document.invoice.invoiceNumber}.pdf`}"`);
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
}

export async function processHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const invoice = await invoiceService.processInvoice(orgId(req), req.params.invoiceId, req.auth?.userId);
    res.json({ data: invoice });
  } catch (err) {
    next(err);
  }
}

export async function transitionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = transitionSchema.parse(req.body);
    const invoice = await invoiceService.transitionInvoice(
      orgId(req),
      req.params.invoiceId,
      body.action,
      req.auth?.userId,
      body.comment
    );
    res.json({ data: invoice });
  } catch (err) {
    next(err);
  }
}

export async function erpSyncHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const invoice = await invoiceService.syncInvoiceToErp(
      orgId(req),
      req.params.invoiceId,
      req.body.targetErp,
      req.auth?.userId
    );
    res.json({ data: invoice });
  } catch (err) {
    next(err);
  }
}

