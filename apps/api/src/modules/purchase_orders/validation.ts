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

export const recordGrnSchema = z.object({
  grnNumber: z.string().min(1, "GRN number is required"),
  vendorDeliveryNote: z.string().optional(),
  comments: z.string().optional(),
  status: z.enum(["RECEIVED", "ACCEPTED", "INSPECTED", "REJECTED"]).optional().default("ACCEPTED"),
  lines: z
    .array(
      z.object({
        lineNumber: z.number().int().min(1),
        description: z.string().min(1),
        itemCode: z.string().optional(),
        receivedQuantity: z.coerce.number().min(0, "Received quantity cannot be negative"),
        unitOfMeasure: z.string().optional().default("UNIT"),
        status: z.string().optional().default("ACCEPTED"),
        inspectionNotes: z.string().optional(),
      })
    )
    .min(1, "At least one GRN line item is required"),
});
