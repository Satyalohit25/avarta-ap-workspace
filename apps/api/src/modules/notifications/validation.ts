import { z } from "zod";

export const updateNotificationPreferencesSchema = z.object({
  slackWebhookUrl: z.string().url().optional().or(z.literal("")),
  digestEmail: z.string().email().optional().or(z.literal("")),
  slaEscalationHours: z.number().int().min(1).max(720).optional(),
  emailEnabled: z.boolean().optional(),
  slackEnabled: z.boolean().optional(),
});

export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;
