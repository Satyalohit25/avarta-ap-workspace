import { NextFunction, Request, Response } from "express";
import { ApiError } from "../../lib/errors";
import * as poService from "./service";
import { createPoSchema } from "./validation";

function orgId(req: Request): string {
  if (!req.auth) throw ApiError.unauthorized();
  return req.auth.organizationId;
}

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await poService.listPurchaseOrders({ organizationId: orgId(req), ...req.query }));
  } catch (err) {
    next(err);
  }
}

export async function getHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ data: await poService.getPurchaseOrder(orgId(req), req.params.poId) });
  } catch (err) {
    next(err);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createPoSchema.parse(req.body);
    const po = await poService.createPurchaseOrder(orgId(req), {
      ...input,
      issueDate: input.issueDate ? new Date(input.issueDate) : undefined,
    });
    res.status(201).json({ data: po });
  } catch (err) {
    next(err);
  }
}

export async function toggleReceivingHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { closed } = req.body;
    const po = await poService.togglePoReceivingStatus(orgId(req), req.params.poId, Boolean(closed));
    res.json({ data: po });
  } catch (err) {
    next(err);
  }
}

export async function recordGrnHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const grn = await poService.recordGoodsReceipt(orgId(req), req.params.poId, req.body);
    res.status(201).json({ data: grn });
  } catch (err) {
    next(err);
  }
}
