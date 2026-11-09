import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../config/database";
import {
  getOrganizationSettings,
  updateOrganizationSettings,
} from "./service";
import { DEFAULT_ORGANIZATION_SETTINGS } from "./repository";

const ORG_A = "org-settings-test-a";
const ORG_B = "org-settings-test-b";
const USER_A = "user-settings-test-a";

describe("Organization settings", () => {
  beforeEach(async () => {
    await prisma.auditLog.deleteMany({
      where: { organizationId: { in: [ORG_A, ORG_B] } },
    });
    await prisma.user.deleteMany({
      where: { organizationId: { in: [ORG_A, ORG_B] } },
    });
    await prisma.organization.deleteMany({ where: { id: { in: [ORG_A, ORG_B] } } });
    await prisma.organization.createMany({
      data: [
        { id: ORG_A, name: "Settings Test A", defaultCurrency: "INR", country: "IN" },
        { id: ORG_B, name: "Settings Test B", defaultCurrency: "INR", country: "IN" },
      ],
    });
    await prisma.user.create({
      data: {
        id: USER_A,
        organizationId: ORG_A,
        email: "admin@settings-test.example",
        passwordHash: "x",
        fullName: "Settings Admin",
        role: "ADMINISTRATOR",
      },
    });
  });

  it("returns the documented defaults before any settings are saved", async () => {
    const settings = await getOrganizationSettings(ORG_A);

    expect(settings.settings).toEqual(DEFAULT_ORGANIZATION_SETTINGS);
    expect(settings.gstin).toBeNull();
    expect(settings.defaultCurrency).toBe("INR");
  });

  it("persists profile fields and financial controls with an audit event", async () => {
    const updated = await updateOrganizationSettings(
      ORG_A,
      {
        name: "Renamed Tenant",
        gstin: "27AAACA1234F1Z5",
        defaultCurrency: "USD",
        settings: {
          priceTolerancePercent: 1.25,
          idempotencyExpiryHours: 48,
        },
      },
      USER_A
    );

    expect(updated.name).toBe("Renamed Tenant");
    expect(updated.gstin).toBe("27AAACA1234F1Z5");
    expect(updated.defaultCurrency).toBe("USD");
    expect(updated.settings.priceTolerancePercent).toBe(1.25);
    expect(updated.settings.idempotencyExpiryHours).toBe(48);
    // Untouched keys retain their defaults.
    expect(updated.settings.priceToleranceCap).toBe(
      DEFAULT_ORGANIZATION_SETTINGS.priceToleranceCap
    );

    const audit = await prisma.auditLog.findFirst({
      where: { organizationId: ORG_A, action: "ORGANIZATION_SETTINGS_UPDATED" },
    });
    expect(audit).not.toBeNull();
    expect(audit?.userId).toBe(USER_A);
  });

  it("merges partial settings updates instead of replacing the object", async () => {
    await updateOrganizationSettings(ORG_A, {
      settings: { priceTolerancePercent: 2, autoArchiveDays: 30 },
    });
    await updateOrganizationSettings(ORG_A, {
      settings: { priceToleranceCap: 250 },
    });

    const settings = await getOrganizationSettings(ORG_A);
    expect(settings.settings.priceTolerancePercent).toBe(2);
    expect(settings.settings.autoArchiveDays).toBe(30);
    expect(settings.settings.priceToleranceCap).toBe(250);
  });

  it("keeps tenant settings isolated", async () => {
    await updateOrganizationSettings(ORG_A, { name: "Tenant A Renamed" });

    const other = await getOrganizationSettings(ORG_B);
    expect(other.name).toBe("Settings Test B");
    expect(other.settings).toEqual(DEFAULT_ORGANIZATION_SETTINGS);
  });
});
