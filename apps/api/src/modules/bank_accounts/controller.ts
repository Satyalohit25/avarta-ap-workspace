import { NextFunction, Request, Response } from "express";
import { ApiError } from "../../lib/errors";
import { createBankAccountSchema, listBankAccountsQuerySchema } from "./validation";
import * as bankAccountService from "./service";

function orgId(req: Request): string {
  if (!req.auth) throw ApiError.unauthorized();
  return req.auth.organizationId;
}

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listBankAccountsQuerySchema.parse(req.query);
    res.json(await bankAccountService.listBankAccounts(orgId(req), query));
  } catch (err) {
    next(err);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createBankAccountSchema.parse(req.body);
    res.status(201).json(await bankAccountService.createBankAccount(orgId(req), body));
  } catch (err) {
    next(err);
  }
}

export async function verifyHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await bankAccountService.verifyBankAccount(orgId(req), req.params.accountId));
  } catch (err) {
    next(err);
  }
}

export async function setPrimaryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await bankAccountService.setPrimaryBankAccount(orgId(req), req.params.accountId));
  } catch (err) {
    next(err);
  }
}
