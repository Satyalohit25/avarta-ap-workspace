import { NextFunction, Request, Response } from "express";
import { ApiError } from "../../lib/errors";
import { updateNotificationPreferencesSchema } from "./validation";
import {
  getNotificationPreferences,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  sendTestEmail,
  sendTestSlackWebhook,
  updateNotificationPreferences,
} from "./service";

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    const result = await listNotifications(req.auth.organizationId, req.auth.userId, {
      status: typeof req.query.status === "string" ? req.query.status : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function markReadHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    const result = await markNotificationRead(
      req.auth.organizationId,
      req.auth.userId,
      req.params.notificationId
    );
    if (!result) throw ApiError.notFound("Notification not found");
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function markAllReadHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    const result = await markAllNotificationsRead(req.auth.organizationId, req.auth.userId);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getPreferencesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    const result = await getNotificationPreferences(req.auth.organizationId);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function updatePreferencesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    const input = updateNotificationPreferencesSchema.parse(req.body);
    const result = await updateNotificationPreferences(
      req.auth.organizationId,
      input,
      req.auth.userId
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function testEmailHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    const recipient = typeof req.body?.recipient === "string" ? req.body.recipient : undefined;
    if (!recipient) throw ApiError.badRequest("Field 'recipient' is required.");
    const result = await sendTestEmail(req.auth.organizationId, recipient);
    res.status(result.sent ? 200 : 400).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function testSlackHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    const result = await sendTestSlackWebhook(req.auth.organizationId);
    res.status(result.sent ? 200 : 400).json({ data: result });
  } catch (err) {
    next(err);
  }
}
