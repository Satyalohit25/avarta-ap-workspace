import { z } from "zod";

export const listItemsQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
});

export const createItemSchema = z.object({
  itemCode: z.string().min(1, "Item code is required").max(64),
  name: z.string().min(1, "Item name is required").max(200),
  category: z.string().min(1).max(100),
  hsnSac: z.string().max(20).optional().default(""),
  unitOfMeasure: z.string().min(1).max(30),
  standardPrice: z.coerce.number().min(0, "Price cannot be negative"),
  currency: z.string().length(3).optional().default("INR"),
  description: z.string().max(500).optional(),
});
