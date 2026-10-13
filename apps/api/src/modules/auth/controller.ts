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

export async function listTeamHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    const users = await authService.listTeamMembers(req.auth.organizationId);
    res.json({ data: users });
  } catch (err) {
    next(err);
  }
}

export async function inviteTeamHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    const { email, fullName, role } = req.body;
    if (!email || !fullName || !role) {
      throw ApiError.badRequest("email, fullName, and role are required");
    }
    const result = await authService.inviteTeamMember(req.auth.organizationId, {
      email,
      fullName,
      role,
    });
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function deactivateTeamHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    const { userId } = req.params;
    const result = await authService.deactivateTeamMember(req.auth.organizationId, userId, req.auth.userId);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function forgotPasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    if (!email) throw ApiError.badRequest("Email is required");
    const result = await authService.requestPasswordReset(email);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function resetPasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, newPassword } = req.body;
    const result = await authService.resetPassword(token, newPassword);
    res.json(result);
  } catch (err) {
    next(err);
  }
}


