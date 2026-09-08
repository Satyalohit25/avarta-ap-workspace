import { z } from "zod";

export const createPoSchema = z.object({
  supplierId: z.string().uuid("Invalid supplier ID"),
  poNumber: z.string().min(1, "PO number is required"),
  currency: z.string().default("INR"),
  issueDate: z.string().optional(),
  totalAmount: z.union([z.string(), z.number()]).refine((val) => Number(val) > 0, {
    message: "Total amount must be greater than 0",
  }),
  expectedDeliveryDate: z.string().optional(),
  poType: z.string().optional(),
  costCenter: z.string().optional(),
  deliveryLocation: z.string().optional(),
  matchingTolerance: z.string().optional(),
  lineItems: z.array(z.any()).optional(),
  notes: z.string().optional(),
});
