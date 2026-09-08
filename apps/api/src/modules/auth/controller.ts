import { NextFunction, Request, Response } from "express";
import { loginSchema } from "./validation";
import * as authService from "./service";
import { ApiError } from "../../lib/errors";

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = loginSchema.parse(req.body);
    const result = await authService.login(body.email, body.password);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function meHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    const user = await authService.getCurrentUser(req.auth.userId);
    res.json(user);
  } catch (err) {
    next(err);
  }
}
