import { z } from "zod";

export const invoiceLineSchema = z.object({
  id: z.string().optional(),
  lineNumber: z.number().int().positive().optional(),
  description: z.string().min(1, "Item description is required"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  unitPrice: z.number().nonnegative("Unit price must be positive or zero"),
  taxRate: z.number().min(0).max(100).optional().default(18),
  taxAmount: z.number().nonnegative().optional(),
  lineAmount: z.number().nonnegative(),
});

export const invoiceFormSchema = z
  .object({
    invoiceNumber: z
      .string()
      .trim()
      .min(1, "Invoice number is required")
      .max(100, "Invoice number cannot exceed 100 characters"),
    supplierId: z.string().optional(),
    purchaseOrderId: z.string().optional(),
    invoiceDate: z.string().optional(),
    dueDate: z.string().optional(),
    paymentTerms: z.string().optional(),
    currency: z.string().length(3, "Currency must be a 3-letter ISO code").default("INR"),
    subtotalAmount: z.number().nonnegative().optional(),
    taxAmount: z.number().nonnegative().optional(),
    totalAmount: z
      .string()
      .min(1, "Total amount is required")
      .refine(
        (val) => {
          const num = Number(val);
          return !isNaN(num) && num > 0;
        },
        { message: "Enter a valid positive total amount" }
      ),
    lines: z.array(invoiceLineSchema).optional(),
    file: z.any().optional(),
    aiConfidence: z.number().optional(),
    source: z.string().optional(),
    documents: z.any().optional(),
  })
  .refine(
    (data) => {
      if (data.invoiceDate && data.dueDate) {
        const invD = new Date(data.invoiceDate);
        const dueD = new Date(data.dueDate);
        if (!isNaN(invD.getTime()) && !isNaN(dueD.getTime())) {
          return dueD >= invD;
        }
      }
      return true;
    },
    {
      message: "Due date cannot be before invoice date",
      path: ["dueDate"],
    }
  )
  .refine(
    (data) => {
      if (data.subtotalAmount !== undefined && data.taxAmount !== undefined && data.totalAmount) {
        const totalNum = Number(data.totalAmount);
        const expected = data.subtotalAmount + data.taxAmount;
        if (!isNaN(totalNum) && Math.abs(expected - totalNum) > 1.0) {
          return false;
        }
      }
      return true;
    },
    {
      message: "Subtotal + Tax must balance with Total Amount (discrepancy exceeds ₹1.00 tolerance)",
      path: ["totalAmount"],
    }
  )
  .refine(
    (data) => {
      if (data.lines && data.lines.length > 0 && data.subtotalAmount !== undefined && data.subtotalAmount > 0) {
        const linesSum = data.lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);
        if (Math.abs(linesSum - data.subtotalAmount) > 1.0) {
          return false;
        }
      }
      return true;
    },
    {
      message: "Line item subtotals (Quantity × Unit Price) do not sum to the specified Subtotal",
      path: ["subtotalAmount"],
    }
  );

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
export type InvoiceLineValues = z.infer<typeof invoiceLineSchema>;
