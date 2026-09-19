import { z } from "zod";

export const schedulePaymentSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID"),
  amount: z.union([z.string(), z.number()]).refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    { message: "Payment amount must be a positive number" }
  ),
  scheduledDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: "Scheduled date must be a valid date string" }
  ),
  paymentMethod: z
    .enum(["BANK_TRANSFER", "ACH", "CHECK", "WIRE", "CARD"])
    .optional()
    .default("BANK_TRANSFER"),
});

export const executePaymentSchema = z.object({
  utrNumber: z.string().max(100).optional(),
  clearingDocumentNumber: z.string().max(100).optional(),
});
