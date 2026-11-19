import { z } from "zod";

export const createSupplierSchema = z.object({
  supplierCode: z.string().min(1),
  legalName: z.string().min(1),
  displayName: z.string().min(1),
  gstNumber: z.string().optional(),
  country: z.string().default("IN"),
  currency: z.string().length(3).default("INR"),
  paymentTermsDays: z.number().int().min(0, "Payment terms cannot be negative").max(365, "Payment terms cannot exceed 365 days").default(30),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  panNumber: z.string().optional(),
  msmeStatus: z.string().optional(),
  msmeCategory: z.enum(["MICRO", "SMALL", "MEDIUM", "NON_MSME"]).optional(),
  udyamNumber: z.string().regex(/^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$/, "Invalid Udyam format. Must follow UDYAM-XX-00-0000000").optional().or(z.literal("")),
  category: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  paymentMethod: z.string().optional(),
});

export const listSuppliersQuerySchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
});
