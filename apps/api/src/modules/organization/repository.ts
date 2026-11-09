import { prisma } from "../../config/database";
import { Prisma } from "@prisma/client";

export interface OrganizationSettings {
  priceTolerancePercent: number;
  priceToleranceCap: number;
  idempotencyExpiryHours: number;
  autoArchiveDays: number;
}

export const DEFAULT_ORGANIZATION_SETTINGS: OrganizationSettings = {
  priceTolerancePercent: 0.5,
  priceToleranceCap: 100,
  idempotencyExpiryHours: 24,
  autoArchiveDays: 90,
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
