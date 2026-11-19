import { NextFunction, Request, Response } from "express";
import { ApiError } from "../../lib/errors";
import { Role } from "../../middleware/permissions";
import * as approvalService from "./service";

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    res.json(await approvalService.listApprovals({ organizationId: req.auth.organizationId, ...req.query }));
  } catch (err) {
    next(err);
  }
}

export async function approveHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    const result = await approvalService.approveApproval(
      req.auth.organizationId,
      req.params.approvalId,
      req.auth.userId,
      req.auth.role as Role,
      req.body?.notes ?? req.body?.comment,
      req.body?.overrideSoloAdmin,
      req.body?.overrideReason,
      req.body?.confirmations
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function bulkApproveHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    const { bulkApproveSchema } = await import("../invoices/validation");
    const { bulkApproveInvoices } = await import("../invoices/service");
    const body = bulkApproveSchema.parse(req.body);
    const result = await bulkApproveInvoices(
      req.auth.organizationId,
      body.invoiceIds,
      req.auth.userId,
      req.auth.role,
      body.notes
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function rejectHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    const result = await approvalService.rejectApproval(
      req.auth.organizationId,
      req.params.approvalId,
      req.auth.userId,
      req.body?.reason,
      req.body?.closePermanently
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

