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
