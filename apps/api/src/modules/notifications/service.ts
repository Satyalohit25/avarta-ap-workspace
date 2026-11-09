import { prisma } from "../../config/database";
import { Prisma } from "@prisma/client";
import { decryptSecret, encryptSecret } from "../../lib/crypto";
import { IntegrationRepository } from "../integrations/repository";
import { IntegrationsService } from "../integrations/service";
import { UpdateNotificationPreferencesInput } from "./validation";

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  read: boolean;
  status: string;
  createdAt: string;
  actionUrl?: string;
}

export interface NotificationPreferencesDto {
  slackWebhookUrlMasked: string | null;
  slackEnabled: boolean;
  digestEmail: string | null;
  emailEnabled: boolean;
  slaEscalationHours: number;
}

const DEFAULT_ROUTING = {
  digestEmail: "",
  emailEnabled: true,
  slackEnabled: false,
  slaEscalationHours: 48,
};

function actionUrlFor(entityType: string | null, entityId: string | null): string | undefined {
  if (!entityType || !entityId) return undefined;
  if (entityType.toLowerCase() === "invoice") return `/invoices/${entityId}`;
  if (entityType.toLowerCase() === "exception") return `/exceptions`;
  if (entityType.toLowerCase() === "payment") return `/payments`;
  if (entityType.toLowerCase() === "approval") return `/approvals`;
  return undefined;
}

function toDto(record: {
  id: string;
  type: string;
  title: string;
  message: string | null;
  entityType: string | null;
  entityId: string | null;
  status: string;
  createdAt: Date;
}): NotificationDto {
  return {
    id: record.id,
    type: record.type,
    title: record.title,
    message: record.message || "",
    entityType: record.entityType,
    entityId: record.entityId,
    read: record.status === "READ",
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    actionUrl: actionUrlFor(record.entityType, record.entityId),
  };
}

export async function listNotifications(
  organizationId: string,
  userId: string,
  filters: { status?: string; page?: number; pageSize?: number }
) {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 50));
  const where: Prisma.NotificationWhereInput = {
    organizationId,
    userId,
    ...(filters.status ? { status: filters.status.toUpperCase() } : {}),
  };

  const [records, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    data: records.map(toDto),
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export async function markNotificationRead(
  organizationId: string,
  userId: string,
  notificationId: string
) {
  const updated = await prisma.notification.updateMany({
    where: { id: notificationId, organizationId, userId },
    data: { status: "READ", readAt: new Date() },
  });
  if (updated.count !== 1) {
    return null;
  }
  return { id: notificationId, status: "READ" };
}

export async function markAllNotificationsRead(organizationId: string, userId: string) {
  const result = await prisma.notification.updateMany({
    where: { organizationId, userId, status: "UNREAD" },
    data: { status: "READ", readAt: new Date() },
  });
  return { updated: result.count };
}

async function readRouting(organizationId: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });
  const settings =
    organization?.settings && typeof organization.settings === "object"
      ? (organization.settings as Record<string, unknown>)
      : {};
  const routing =
    settings.notificationRouting && typeof settings.notificationRouting === "object"
      ? (settings.notificationRouting as Record<string, unknown>)
      : {};
  return {
    settings,
    routing: {
      digestEmail:
        typeof routing.digestEmail === "string"
          ? routing.digestEmail
          : DEFAULT_ROUTING.digestEmail,
      emailEnabled:
        typeof routing.emailEnabled === "boolean"
          ? routing.emailEnabled
          : DEFAULT_ROUTING.emailEnabled,
      slackEnabled:
        typeof routing.slackEnabled === "boolean"
          ? routing.slackEnabled
          : DEFAULT_ROUTING.slackEnabled,
      slaEscalationHours:
        typeof routing.slaEscalationHours === "number"
          ? routing.slaEscalationHours
          : DEFAULT_ROUTING.slaEscalationHours,
    },
  };
}

export async function getNotificationPreferences(
  organizationId: string
): Promise<NotificationPreferencesDto> {
  const { routing } = await readRouting(organizationId);
  const slack = await IntegrationRepository.find(organizationId, "NOTIFICATION", "SLACK");

  let slackWebhookUrlMasked: string | null = null;
  if (slack?.encryptedConfig) {
    try {
      const url = decryptSecret(slack.encryptedConfig);
      const parsed = new URL(url);
      slackWebhookUrlMasked = `${parsed.origin}/…/${url.slice(-6)}`;
    } catch {
      slackWebhookUrlMasked = "••••••••";
    }
  }

  return {
    slackWebhookUrlMasked,
    slackEnabled: routing.slackEnabled && Boolean(slack),
    digestEmail: routing.digestEmail || null,
    emailEnabled: routing.emailEnabled,
    slaEscalationHours: routing.slaEscalationHours,
  };
}

export async function updateNotificationPreferences(
  organizationId: string,
  input: UpdateNotificationPreferencesInput,
  actorUserId?: string
) {
  const { settings, routing } = await readRouting(organizationId);

  const nextRouting = {
    ...routing,
    ...(input.digestEmail !== undefined ? { digestEmail: input.digestEmail } : {}),
    ...(input.emailEnabled !== undefined ? { emailEnabled: input.emailEnabled } : {}),
    ...(input.slackEnabled !== undefined ? { slackEnabled: input.slackEnabled } : {}),
    ...(input.slaEscalationHours !== undefined
      ? { slaEscalationHours: input.slaEscalationHours }
      : {}),
  };

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      settings: {
        ...settings,
        notificationRouting: nextRouting,
      } as Prisma.InputJsonValue,
    },
  });

  if (input.slackWebhookUrl !== undefined) {
    if (input.slackWebhookUrl === "") {
      await IntegrationRepository.remove(organizationId, "NOTIFICATION", "SLACK");
    } else {
      await IntegrationRepository.upsert({
        organizationId,
        type: "NOTIFICATION",
        provider: "SLACK",
        encryptedConfig: encryptSecret(input.slackWebhookUrl),
        status: "CONNECTED",
        lastTestedAt: new Date(),
        settings: {},
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: actorUserId || null,
      action: "NOTIFICATION_ROUTING_UPDATED",
      entityType: "organization",
      entityId: organizationId,
      afterData: nextRouting as Prisma.InputJsonValue,
    },
  });

  return getNotificationPreferences(organizationId);
}

export async function sendTestEmail(
  organizationId: string,
  recipient: string
): Promise<{ sent: boolean; message: string }> {
  const result = await IntegrationsService.sendTransactionalEmail(organizationId, {
    to: recipient,
    subject: "Avarta AP Workspace — notification test",
    text: "This is a test notification from your Avarta AP Workspace.",
    html: "<p>This is a test notification from your Avarta AP Workspace.</p>",
  });
  return {
    sent: result.sent,
    message: result.sent
      ? `Test email delivered to ${recipient}.`
      : result.reason || "Email could not be delivered.",
  };
}

export async function sendTestSlackWebhook(
  organizationId: string
): Promise<{ sent: boolean; message: string }> {
  const slack = await IntegrationRepository.find(organizationId, "NOTIFICATION", "SLACK");
  if (!slack?.encryptedConfig) {
    return { sent: false, message: "No Slack webhook is configured." };
  }

  let url: string;
  try {
    url = decryptSecret(slack.encryptedConfig);
  } catch {
    return { sent: false, message: "Slack webhook could not be decrypted." };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Avarta AP Workspace test notification — routing is configured correctly.",
      }),
    });
    if (!response.ok) {
      return {
        sent: false,
        message: `Slack webhook returned HTTP ${response.status}.`,
      };
    }
    return { sent: true, message: "Test payload delivered to Slack." };
  } catch (err) {
    return {
      sent: false,
      message: err instanceof Error ? err.message : "Slack webhook delivery failed.",
    };
  }
}
