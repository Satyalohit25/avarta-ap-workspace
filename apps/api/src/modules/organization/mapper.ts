import { Organization } from "@prisma/client";
import {
  DEFAULT_ORGANIZATION_SETTINGS,
  OrganizationSettings,
} from "./repository";

export interface OrganizationDto {
  id: string;
  name: string;
  legalName: string | null;
  gstin: string | null;
  country: string;
  defaultCurrency: string;
  timezone: string;
  dateFormat: string;
  settings: OrganizationSettings;
  createdAt: string;
  updatedAt: string;
}

function mergeSettings(raw: unknown): OrganizationSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_ORGANIZATION_SETTINGS };
  const parsed = raw as Partial<Record<keyof OrganizationSettings, unknown>>;
  return {
    priceTolerancePercent:
      typeof parsed.priceTolerancePercent === "number"
        ? parsed.priceTolerancePercent
        : DEFAULT_ORGANIZATION_SETTINGS.priceTolerancePercent,
    priceToleranceCap:
      typeof parsed.priceToleranceCap === "number"
        ? parsed.priceToleranceCap
        : DEFAULT_ORGANIZATION_SETTINGS.priceToleranceCap,
    idempotencyExpiryHours:
      typeof parsed.idempotencyExpiryHours === "number"
        ? parsed.idempotencyExpiryHours
        : DEFAULT_ORGANIZATION_SETTINGS.idempotencyExpiryHours,
    autoArchiveDays:
      typeof parsed.autoArchiveDays === "number"
        ? parsed.autoArchiveDays
        : DEFAULT_ORGANIZATION_SETTINGS.autoArchiveDays,
  };
}

export function toOrganizationDto(organization: Organization): OrganizationDto {
  return {
    id: organization.id,
    name: organization.name,
    legalName: organization.legalName,
    gstin: organization.gstin,
    country: organization.country,
    defaultCurrency: organization.defaultCurrency,
    timezone: organization.timezone,
    dateFormat: organization.dateFormat,
    settings: mergeSettings(organization.settings),
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
  };
}
