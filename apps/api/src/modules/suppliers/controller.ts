import { NextFunction, Request, Response } from "express";
import { ApiError } from "../../lib/errors";
import { createSupplierSchema, listSuppliersQuerySchema } from "./validation";
import * as supplierService from "./service";

function orgId(req: Request): string {
  if (!req.auth) throw ApiError.unauthorized();
  return req.auth.organizationId;
}

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listSuppliersQuerySchema.parse(req.query);
    res.json(await supplierService.listSuppliers({ organizationId: orgId(req), ...query }));
  } catch (err) {
    next(err);
  }
}

export async function getHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ data: await supplierService.getSupplier(orgId(req), req.params.supplierId) });
  } catch (err) {
    next(err);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createSupplierSchema.parse(req.body);
    res.status(201).json({ data: await supplierService.createSupplier(orgId(req), body) });
  } catch (err) {
    next(err);
  }
}
