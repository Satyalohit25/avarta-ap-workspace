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
  );

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
export type InvoiceLineValues = z.infer<typeof invoiceLineSchema>;
