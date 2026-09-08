import { z } from "zod";

export const createInvoiceSchema = z.object({
  supplierId: z.string().uuid().optional().nullable().or(z.literal("")),
  invoiceNumber: z.string().min(1),
  invoiceDate: z.string().optional().nullable().or(z.literal("")),
  dueDate: z.string().optional().nullable().or(z.literal("")),
  currency: z.string().length(3).default("INR"),
  subtotalAmount: z.string().or(z.number()).optional(),
  taxAmount: z.string().or(z.number()).optional(),
  totalAmount: z.string().or(z.number()),
  purchaseOrderId: z.string().uuid().optional().nullable().or(z.literal("")),
  source: z.enum(["UPLOAD", "EMAIL", "PORTAL", "SCANNER", "MOBILE", "API", "EDI", "ERP"]).optional(),
  lines: z
    .array(
      z.object({
        lineNumber: z.number().optional(),
        description: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
        taxAmount: z.number().optional(),
        lineAmount: z.number(),
      })
    )
    .optional(),
});

export const updateInvoiceSchema = z.object({
  supplierId: z.string().uuid().optional().nullable().or(z.literal("")),
  invoiceNumber: z.string().min(1).optional(),
  invoiceDate: z.string().optional().nullable().or(z.literal("")),
  dueDate: z.string().optional().nullable().or(z.literal("")),
  currency: z.string().length(3).optional(),
  subtotalAmount: z.string().or(z.number()).optional(),
  taxAmount: z.string().or(z.number()).optional(),
  totalAmount: z.string().or(z.number()).optional(),
  purchaseOrderId: z.string().uuid().optional().nullable().or(z.literal("")),
  lines: z
    .array(
      z.object({
        lineNumber: z.number().optional(),
        description: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
        taxAmount: z.number().optional(),
        lineAmount: z.number(),
      })
    )
    .optional(),
});

export const listInvoicesQuerySchema = z.object({
  status: z.string().optional(),
  supplierId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
});

// Doc 18 §18.6 — action verbs only; the API never accepts an arbitrary
// target state (Doc 14 §14.11).
export const transitionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "RETRY_VALIDATION", "RUN_MATCHING"]),
  comment: z.string().optional(),
});
