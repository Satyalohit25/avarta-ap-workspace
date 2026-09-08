import { z } from "zod";

export const createSupplierSchema = z.object({
  supplierCode: z.string().min(1),
  legalName: z.string().min(1),
  displayName: z.string().min(1),
  gstNumber: z.string().optional(),
  country: z.string().default("IN"),
  currency: z.string().length(3).default("INR"),
  paymentTermsDays: z.number().int().default(30),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  panNumber: z.string().optional(),
  msmeStatus: z.string().optional(),
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
