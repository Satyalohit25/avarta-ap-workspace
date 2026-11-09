import { NextFunction, Request, Response } from "express";
import { loginSchema, signupSchema, acceptInviteSchema } from "./validation";
import * as authService from "./service";
import { ApiError } from "../../lib/errors";
import { prisma } from "../../config/database";
import { getClientIp } from "../../lib/client-ip";
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from "../../lib/refresh-cookie";

export async function isSignupAllowed(): Promise<{ allowed: boolean; reason?: string; currentCount: number; maxCount: number }> {
  // Gate 1 Fail-closed: Must be explicitly enabled via ENABLE_PUBLIC_SIGNUP === "true" (or legacy ALLOW_PUBLIC_SIGNUP === "true").
  // Any legacy ALLOW_PUBLIC_SIGNUP="false" or absence of explicit true fails closed.
  if (
    process.env.ALLOW_PUBLIC_SIGNUP === "false" ||
    (process.env.ENABLE_PUBLIC_SIGNUP !== "true" && process.env.ALLOW_PUBLIC_SIGNUP !== "true")
  ) {
    return {
      allowed: false,
      reason: "Public registration is disabled. Please contact your organization administrator.",
      currentCount: 0,
      maxCount: 0,
    };
  }

  const maxCount = parseInt(process.env.MAX_PUBLIC_SIGNUPS || "2", 10);
  const currentCount = await prisma.organization.count();

  if (currentCount >= maxCount) {
    return {
      allowed: false,
      reason: `Public signup limit reached (maximum ${maxCount} workspaces). Self-service registration is now closed.`,
      currentCount,
      maxCount,
    };
  }

  return {
    allowed: true,
    currentCount,
    maxCount,
  };
}

export async function signupHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const check = await isSignupAllowed();
    if (!check.allowed) {
      throw ApiError.forbidden(check.reason!);
    }
    const body = signupSchema.parse(req.body);
    const result = await authService.signup(body);
    setRefreshCookie(res, result.refreshToken);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = loginSchema.parse(req.body);
    const clientIp = getClientIp(req);
    const result = await authService.login(body.email, body.password, clientIp);
    setRefreshCookie(res, result.refreshToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function refreshHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = readRefreshCookie(req) || req.body?.refreshToken;
    const result = await authService.rotateRefreshToken(refreshToken);
    setRefreshCookie(res, result.refreshToken);
    res.json(result);
  } catch (err) {
    clearRefreshCookie(res);
    next(err);
  }
}

export async function logoutHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const refreshToken = readRefreshCookie(req) || req.body?.refreshToken;
    const result = await authService.logout(token, req.auth.userId, refreshToken);
    clearRefreshCookie(res);
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
    const result = await authService.inviteTeamMember(
      req.auth.organizationId,
      {
        email,
        fullName,
        role,
      },
      req.auth.userId
    );
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

export async function acceptInviteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = acceptInviteSchema.parse(req.body);
    const result = await authService.acceptInvitation(body);
    res.json(result);
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

export async function authConfigHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const check = await isSignupAllowed();
    res.json({
      signupEnabled: check.allowed,
      currentWorkspaces: check.currentCount,
      maxWorkspaces: check.maxCount,
    });
  } catch (err) {
    next(err);
  }
}


