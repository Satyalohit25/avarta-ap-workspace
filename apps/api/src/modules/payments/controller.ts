import { NextFunction, Request, Response } from "express";
import { ApiError } from "../../lib/errors";
import * as paymentService from "./service";

function orgId(req: Request): string {
  if (!req.auth) throw ApiError.unauthorized();
  return req.auth.organizationId;
}

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await paymentService.listPayments({ organizationId: orgId(req), ...req.query }));
  } catch (err) {
    next(err);
  }
}

export async function scheduleHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json({ data: await paymentService.schedulePayment(orgId(req), req.body) });
  } catch (err) {
    next(err);
  }
}

export async function executeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({
      data: await paymentService.executePayment(
        orgId(req),
        req.params.paymentId,
        req.auth?.userId,
        req.body
      ),
    });
  } catch (err) {
    next(err);
  }
}
