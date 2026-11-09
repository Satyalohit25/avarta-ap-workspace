import { apiRequest } from "./client";

export interface OrganizationSettings {
  priceTolerancePercent: number;
  priceToleranceCap: number;
  idempotencyExpiryHours: number;
  autoArchiveDays: number;
}

export interface OrganizationProfile {
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

export interface UpdateOrganizationPayload {
  name?: string;
  legalName?: string | null;
  gstin?: string | null;
  country?: string;
  defaultCurrency?: string;
  timezone?: string;
  dateFormat?: string;
  settings?: Partial<OrganizationSettings>;
}

export async function fetchOrganizationSettings(): Promise<OrganizationProfile> {
  const res = await apiRequest<{ data: OrganizationProfile }>("/organization/settings");
  return res.data;
}

export async function updateOrganizationSettings(
  payload: UpdateOrganizationPayload
): Promise<OrganizationProfile> {
  const res = await apiRequest<{ data: OrganizationProfile }>("/organization/settings", {
    method: "PATCH",
    body: payload,
  });
  return res.data;
}
