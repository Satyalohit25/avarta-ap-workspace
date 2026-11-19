import { prisma } from "../../config/database";
import { Prisma } from "@prisma/client";

export interface OrganizationSettings {
  priceTolerancePercent: number;
  priceToleranceCap: number;
  idempotencyExpiryHours: number;
  autoArchiveDays: number;
  taxToleranceMajor?: number; // Configurable tax tolerance in major currency units (e.g. 0.05 for USD/EUR, 0.50 for INR)
  taxTolerancePerLine?: number; // Configurable tolerance per invoice line (e.g. 0.01)
  taxToleranceCurrencyOverrides?: Record<string, number>; // Currency-specific tolerance overrides (e.g. { "USD": 0.02, "INR": 0.25 })
}

export const DEFAULT_ORGANIZATION_SETTINGS: OrganizationSettings = {
  priceTolerancePercent: 0.5,
  priceToleranceCap: 100,
  idempotencyExpiryHours: 24,
  autoArchiveDays: 90,
  taxToleranceMajor: 0.5,
  taxTolerancePerLine: 0.01,
  taxToleranceCurrencyOverrides: {},
};

export async function findOrganization(organizationId: string) {
  return prisma.organization.findUnique({ where: { id: organizationId } });
}

export async function updateOrganization(
  organizationId: string,
  data: Prisma.OrganizationUpdateInput
) {
  return prisma.organization.update({
    where: { id: organizationId },
    data,
  });
}
