import { NextFunction, Request, Response } from "express";
import { ApiError } from "../../lib/errors";
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
      req.body?.notes
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
      req.body?.reason
    );
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

