import { z } from "zod";

export const listBankAccountsQuerySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  primaryOnly: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => value === true || value === "true"),
});

export const createBankAccountSchema = z.object({
  supplierName: z.string().min(1, "Supplier name is required").max(200),
  supplierId: z.string().optional(),
  accountNumber: z
    .string()
    .min(6, "Account number is too short")
    .max(34, "Account number is too long")
    .regex(/^[A-Za-z0-9]+$/, "Account number must be alphanumeric"),
  bankName: z.string().min(1, "Bank name is required").max(200),
  ifscSwift: z
    .string()
    .min(8, "IFSC/SWIFT is too short")
    .max(11, "IFSC/SWIFT is too long")
    .transform((value) => value.toUpperCase().trim()),
  accountType: z.enum(["CURRENT", "SAVINGS", "ESCROW"]).optional().default("CURRENT"),
  branchName: z.string().max(200).optional(),
  isPrimary: z.boolean().optional().default(false),
});
