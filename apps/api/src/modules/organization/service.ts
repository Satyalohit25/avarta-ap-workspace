import { ApiError } from "../../lib/errors";
import { UpdateOrganizationInput } from "./validation";
import { toOrganizationDto } from "./mapper";
import {
  DEFAULT_ORGANIZATION_SETTINGS,
  findOrganization,
  updateOrganization,
} from "./repository";
import { prisma } from "../../config/database";
import { Prisma } from "@prisma/client";

export async function getOrganizationSettings(organizationId: string) {
  const organization = await findOrganization(organizationId);
  if (!organization) throw ApiError.notFound("Organization not found");
  return toOrganizationDto(organization);
}

export async function updateOrganizationSettings(
  organizationId: string,
  input: UpdateOrganizationInput,
  actorUserId?: string
) {
  const existing = await findOrganization(organizationId);
  if (!existing) throw ApiError.notFound("Organization not found");

  const currentSettings =
    existing.settings && typeof existing.settings === "object"
      ? (existing.settings as Record<string, unknown>)
      : {};

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.legalName !== undefined) data.legalName = input.legalName;
  if (input.gstin !== undefined) data.gstin = input.gstin;
  if (input.country !== undefined) data.country = input.country.toUpperCase();
  if (input.defaultCurrency !== undefined) {
    data.defaultCurrency = input.defaultCurrency.toUpperCase();
  }
  if (input.timezone !== undefined) data.timezone = input.timezone;
  if (input.dateFormat !== undefined) data.dateFormat = input.dateFormat;
  if (input.settings !== undefined) {
    data.settings = {
      ...DEFAULT_ORGANIZATION_SETTINGS,
      ...currentSettings,
      ...input.settings,
    };
  }

  const updated = await updateOrganization(organizationId, data);

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: actorUserId || null,
      action: "ORGANIZATION_SETTINGS_UPDATED",
      entityType: "organization",
      entityId: organizationId,
      beforeData: {
        name: existing.name,
        gstin: existing.gstin,
        defaultCurrency: existing.defaultCurrency,
        settings: currentSettings,
      } as Prisma.InputJsonValue,
      afterData: {
        name: updated.name,
        gstin: updated.gstin,
        defaultCurrency: updated.defaultCurrency,
        settings: updated.settings as object | null,
      } as Prisma.InputJsonValue,
    },
  });

  return toOrganizationDto(updated);
}
