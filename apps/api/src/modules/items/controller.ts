import { NextFunction, Request, Response } from "express";
import { ApiError } from "../../lib/errors";
import { createItemSchema, listItemsQuerySchema } from "./validation";
import * as itemService from "./service";

function orgId(req: Request): string {
  if (!req.auth) throw ApiError.unauthorized();
  return req.auth.organizationId;
}

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listItemsQuerySchema.parse(req.query);
    res.json(await itemService.listItems(orgId(req), query));
  } catch (err) {
    next(err);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createItemSchema.parse(req.body);
    res.status(201).json(await itemService.createItem(orgId(req), body));
  } catch (err) {
    next(err);
  }
}

export async function toggleStatusHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await itemService.toggleItemStatus(orgId(req), req.params.itemId));
  } catch (err) {
    next(err);
  }
}
