import { z } from "zod";

const organizationSettingsSchema = z.object({
  priceTolerancePercent: z.number().min(0).max(100).optional(),
  priceToleranceCap: z.number().min(0).optional(),
  idempotencyExpiryHours: z.number().int().min(1).max(168).optional(),
  autoArchiveDays: z.number().int().min(1).max(3650).optional(),
});

export const updateOrganizationSchema = z
  .object({
    name: z.string().trim().min(2).max(160).optional(),
    legalName: z.string().trim().max(200).nullable().optional(),
    gstin: z
      .string()
      .trim()
      .regex(/^[0-9A-Z]{15}$/i, "GSTIN must be a 15-character alphanumeric value")
      .nullable()
      .optional(),
    country: z.string().trim().length(2).optional(),
    defaultCurrency: z.string().trim().length(3).optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
    dateFormat: z.string().trim().min(1).max(32).optional(),
    settings: organizationSettingsSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one organization setting must be provided",
  });

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
