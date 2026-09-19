import { NextFunction, Request, Response } from "express";
import { ApiError } from "../../lib/errors";
import * as auditService from "./service";

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    const result = await auditService.listAuditLogs({
      organizationId: req.auth.organizationId,
      entityType: typeof req.query.entityType === "string" ? req.query.entityType : undefined,
      entityId: typeof req.query.entityId === "string" ? req.query.entityId : undefined,
      userId: typeof req.query.userId === "string" ? req.query.userId : undefined,
      action: typeof req.query.action === "string" ? req.query.action : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
