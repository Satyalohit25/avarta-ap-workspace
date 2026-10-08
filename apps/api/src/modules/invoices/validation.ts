import { z } from "zod";

const amountSchema = z.coerce.number().refine(
  (val) => !isNaN(val) && val >= 0,
  { message: "Amount must be a valid non-negative number" }
);

const lineItemSchema = z.object({
  lineNumber: z.number().optional(),
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  taxAmount: z.number().optional(),
  lineAmount: z.number(),
});

const linesArraySchema = z.preprocess((val) => {
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}, z.array(lineItemSchema).optional());

export const createInvoiceSchema = z.object({
  supplierId: z.string().uuid().optional().nullable().or(z.literal("")),
  invoiceNumber: z.string().optional().default(""),
  invoiceDate: z.string().optional().nullable().or(z.literal("")),
  dueDate: z.string().optional().nullable().or(z.literal("")),
  currency: z.string().length(3).optional().default("INR"),
  subtotalAmount: amountSchema.optional(),
  taxAmount: amountSchema.optional(),
  totalAmount: amountSchema.optional().default(0),
  purchaseOrderId: z.string().uuid().optional().nullable().or(z.literal("")),
  source: z.enum(["UPLOAD", "EMAIL", "PORTAL", "SCANNER", "MOBILE", "API", "EDI", "ERP"]).optional(),
  lines: linesArraySchema,
});

export const updateInvoiceSchema = z.object({
  supplierId: z.string().uuid().optional().nullable().or(z.literal("")),
  invoiceNumber: z.string().min(1).optional(),
  invoiceDate: z.string().optional().nullable().or(z.literal("")),
  dueDate: z.string().optional().nullable().or(z.literal("")),
  currency: z.string().length(3).optional(),
  subtotalAmount: amountSchema.optional(),
  taxAmount: amountSchema.optional(),
  totalAmount: amountSchema.optional(),
  purchaseOrderId: z.string().uuid().optional().nullable().or(z.literal("")),
  lines: linesArraySchema,
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
export const transitionSchema = z
  .object({
    action: z.enum([
      "APPROVE",
      "REJECT",
      "RETRY_VALIDATION",
      "RUN_MATCHING",
      "SUBMIT_APPROVAL",
      "HOLD_REQUEST_CORRECTION",
    ]),
    comment: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action === "REJECT" && (!data.comment || data.comment.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["comment"],
        message: "A comment or reason is required when rejecting an invoice",
      });
    }
  });
