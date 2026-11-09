import { apiRequest } from "./client";

export interface NotificationRecord {
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

export interface NotificationListResponse {
  data: NotificationRecord[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface NotificationPreferences {
  slackWebhookUrlMasked: string | null;
  slackEnabled: boolean;
  digestEmail: string | null;
  emailEnabled: boolean;
  slaEscalationHours: number;
}

export async function fetchNotifications(params?: {
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<NotificationListResponse> {
  return apiRequest<NotificationListResponse>("/notifications", {
    query: params as Record<string, string | number | undefined>,
  });
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiRequest(`/notifications/${id}/read`, { method: "POST" });
}

export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  const res = await apiRequest<{ data: { updated: number } }>("/notifications/read-all", {
    method: "POST",
  });
  return res.data;
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  const res = await apiRequest<{ data: NotificationPreferences }>("/notifications/preferences");
  return res.data;
}

export async function updateNotificationPreferences(payload: {
  slackWebhookUrl?: string;
  digestEmail?: string;
  slaEscalationHours?: number;
  emailEnabled?: boolean;
  slackEnabled?: boolean;
}): Promise<NotificationPreferences> {
  const res = await apiRequest<{ data: NotificationPreferences }>("/notifications/preferences", {
    method: "PATCH",
    body: payload,
  });
  return res.data;
}

export async function sendTestNotificationEmail(recipient: string): Promise<{
  sent: boolean;
  message: string;
}> {
  const res = await apiRequest<{ data: { sent: boolean; message: string } }>(
    "/notifications/test-email",
    { method: "POST", body: { recipient } }
  );
  return res.data;
}

export async function sendTestSlackWebhook(): Promise<{ sent: boolean; message: string }> {
  const res = await apiRequest<{ data: { sent: boolean; message: string } }>(
    "/notifications/test-webhook",
    { method: "POST" }
  );
  return res.data;
}
