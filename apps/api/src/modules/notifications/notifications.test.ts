import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../config/database";
import {
  getNotificationPreferences,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
} from "./service";

const ORG_A = "org-notify-test-a";
const ORG_B = "org-notify-test-b";
const USER_A = "user-notify-test-a";
const USER_B = "user-notify-test-b";

async function seed() {
  await prisma.notification.deleteMany({
    where: { organizationId: { in: [ORG_A, ORG_B] } },
  });
  await prisma.auditLog.deleteMany({
    where: { organizationId: { in: [ORG_A, ORG_B] } },
  });
  await prisma.user.deleteMany({ where: { id: { in: [USER_A, USER_B] } } });
  await prisma.organization.deleteMany({ where: { id: { in: [ORG_A, ORG_B] } } });
  await prisma.organization.createMany({
    data: [
      { id: ORG_A, name: "Notify Test A", defaultCurrency: "INR", country: "IN" },
      { id: ORG_B, name: "Notify Test B", defaultCurrency: "INR", country: "IN" },
    ],
  });
  await prisma.user.createMany({
    data: [
      {
        id: USER_A,
        organizationId: ORG_A,
        email: "user-a@notify-test.example",
        passwordHash: "x",
        fullName: "Notify A",
        role: "FINANCE_MANAGER",
      },
      {
        id: USER_B,
        organizationId: ORG_B,
        email: "user-b@notify-test.example",
        passwordHash: "x",
        fullName: "Notify B",
        role: "FINANCE_MANAGER",
      },
    ],
  });
  await prisma.notification.createMany({
    data: [
      {
        organizationId: ORG_A,
        userId: USER_A,
        type: "APPROVAL_REQUEST",
        title: "Invoice awaiting your approval",
        message: "Invoice INV-1 needs review.",
        entityType: "invoice",
        entityId: "11111111-1111-1111-1111-111111111111",
        status: "UNREAD",
      },
      {
        organizationId: ORG_A,
        userId: USER_A,
        type: "EXCEPTION_RAISED",
        title: "Exception raised",
        message: "Price variance detected.",
        entityType: "exception",
        entityId: "22222222-2222-2222-2222-222222222222",
        status: "UNREAD",
      },
      {
        organizationId: ORG_B,
        userId: USER_B,
        type: "SYSTEM",
        title: "Other tenant notification",
        status: "UNREAD",
      },
    ],
  });
}

describe("Notifications", () => {
  beforeEach(seed);

  it("lists only the caller's notifications and derives action urls", async () => {
    const result = await listNotifications(ORG_A, USER_A, {});

    expect(result.meta.total).toBe(2);
    expect(result.data.every((n) => n.message !== undefined)).toBe(true);
    const approval = result.data.find((n) => n.type === "APPROVAL_REQUEST");
    expect(approval?.actionUrl).toBe(
      "/invoices/11111111-1111-1111-1111-111111111111"
    );
    expect(result.data.some((n) => n.title === "Other tenant notification")).toBe(
      false
    );
  });

  it("filters unread notifications", async () => {
    const unread = await listNotifications(ORG_A, USER_A, { status: "UNREAD" });
    expect(unread.meta.total).toBe(2);

    const items = await listNotifications(ORG_A, USER_A, {});
    await markNotificationRead(ORG_A, USER_A, items.data[0].id);

    const after = await listNotifications(ORG_A, USER_A, { status: "UNREAD" });
    expect(after.meta.total).toBe(1);
  });

  it("does not let another tenant mark a notification as read", async () => {
    const items = await listNotifications(ORG_A, USER_A, {});
    const result = await markNotificationRead(ORG_B, USER_B, items.data[0].id);
    expect(result).toBeNull();
  });

  it("marks every unread notification as read", async () => {
    const result = await markAllNotificationsRead(ORG_A, USER_A);
    expect(result.updated).toBe(2);

    const unread = await listNotifications(ORG_A, USER_A, { status: "UNREAD" });
    expect(unread.meta.total).toBe(0);
  });

  it("returns honest routing defaults", async () => {
    const prefs = await getNotificationPreferences(ORG_A);

    expect(prefs.slackWebhookUrlMasked).toBeNull();
    expect(prefs.slackEnabled).toBe(false);
    expect(prefs.digestEmail).toBeNull();
    expect(prefs.emailEnabled).toBe(true);
    expect(prefs.slaEscalationHours).toBe(48);
  });

  it("persists routing preferences in the organization settings JSON", async () => {
    const updated = await updateNotificationPreferences(
      ORG_A,
      {
        digestEmail: "ap-digest@notify-test.example",
        slaEscalationHours: 24,
        emailEnabled: false,
        slackEnabled: false,
      },
      USER_A
    );

    expect(updated.digestEmail).toBe("ap-digest@notify-test.example");
    expect(updated.slaEscalationHours).toBe(24);
    expect(updated.emailEnabled).toBe(false);

    const org = await prisma.organization.findUnique({ where: { id: ORG_A } });
    const settings = org?.settings as Record<string, unknown> | null;
    expect(settings?.notificationRouting).toMatchObject({
      digestEmail: "ap-digest@notify-test.example",
      emailEnabled: false,
    });

    const audit = await prisma.auditLog.findFirst({
      where: { organizationId: ORG_A, action: "NOTIFICATION_ROUTING_UPDATED" },
    });
    expect(audit).not.toBeNull();
  });
});
