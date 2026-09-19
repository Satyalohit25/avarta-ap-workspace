import { NextFunction, Request, Response } from "express";
import { ApiError } from "../../lib/errors";
import * as paymentService from "./service";
import { runBatchPayments } from "./batch-runner";
import { executePaymentSchema, schedulePaymentSchema } from "./validation";

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
    const input = schedulePaymentSchema.parse(req.body);
    res.status(201).json({ data: await paymentService.schedulePayment(orgId(req), input) });
  } catch (err) {
    next(err);
  }
}

export async function executeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const details = req.body && Object.keys(req.body).length > 0 ? executePaymentSchema.parse(req.body) : undefined;
    res.json({
      data: await paymentService.executePayment(
        orgId(req),
        req.params.paymentId,
        req.auth?.userId,
        details
      ),
    });
  } catch (err) {
    next(err);
  }
}

export async function batchRunHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const paymentIds = Array.isArray(req.body?.paymentIds) ? req.body.paymentIds : undefined;
    const cutoffDate = req.body?.cutoffDate ? new Date(req.body.cutoffDate) : undefined;
    const result = await runBatchPayments({
      organizationId: orgId(req),
      userId: req.auth?.userId,
      paymentIds,
      cutoffDate,
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

