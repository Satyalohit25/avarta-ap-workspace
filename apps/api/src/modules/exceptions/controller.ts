import { NextFunction, Request, Response } from "express";
import { ApiError } from "../../lib/errors";
import * as exceptionService from "./service";

function orgId(req: Request): string {
  if (!req.auth) throw ApiError.unauthorized();
  return req.auth.organizationId;
}

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await exceptionService.listExceptions({ organizationId: orgId(req), ...req.query }));
  } catch (err) {
    next(err);
  }
}

export async function assignHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req.body as { userId: string };
    res.json({ data: await exceptionService.assignException(orgId(req), req.params.exceptionId, userId) });
  } catch (err) {
    next(err);
  }
}

export async function resolveHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { resolution } = req.body as { resolution: string };
    const userId = req.auth?.userId;
    res.json({
      data: await exceptionService.resolveException(
        orgId(req),
        req.params.exceptionId,
        resolution,
        userId
      ),
    });
  } catch (err) {
    next(err);
  }
}

