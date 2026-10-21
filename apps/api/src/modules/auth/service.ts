import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../../config/database";
import { ApiError } from "../../lib/errors";
import {
  signAccessToken,
  revokeTokenAsync,
  revokeAllUserTokensAsync,
  revokeToken,
  revokeAllUserTokens,
} from "../../lib/jwt";
import { env } from "../../config/env";

export function computeLockoutHash(email: string, clientIp: string): string {
  const cleanEmail = email.toLowerCase().trim();
  const cleanIp = (clientIp || "127.0.0.1").trim();
  return crypto.createHash("sha256").update(`${cleanEmail}:${cleanIp}`).digest("hex");
}

export async function login(email: string, password: string, clientIp = "127.0.0.1") {
  const cleanEmail = email.toLowerCase().trim();
  const identifierHash = computeLockoutHash(cleanEmail, clientIp);

  // Check persistent DB login lockout keyed by Account + Client IP (Anti-DOS, Anti-Brute-Force)
  try {
    const lockout = await prisma.loginLockout.findUnique({
      where: { identifierHash },
    });
    if (lockout && lockout.lockedUntil && lockout.lockedUntil.getTime() > Date.now()) {
      const remainingMin = Math.ceil((lockout.lockedUntil.getTime() - Date.now()) / 60000);
      throw ApiError.tooManyRequests(
        `Too many failed login attempts from this network. Please wait ${remainingMin} minute(s) or reset your password.`
      );
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // If DB check fails, continue
  }

  // Support Master Dev Credentials strictly for development
  const isMasterDev =
    env.nodeEnv === "development" &&
    Boolean(env.masterDevEmail) &&
    Boolean(env.masterDevPassword) &&
    cleanEmail === env.masterDevEmail.toLowerCase().trim() &&
    password === env.masterDevPassword;

  if (isMasterDev) {
    let devUser:
      | (typeof prisma.user extends { findFirst: (...args: any[]) => Promise<infer U> }
          ? NonNullable<U> & { organization?: { name: string } | null }
          : any)
      | null = await prisma.user.findFirst({
      where: { role: "ADMINISTRATOR", status: "ACTIVE" },
      include: { organization: true },
    });

    if (!devUser) {
      devUser = await prisma.user.findFirst({
        where: { status: "ACTIVE" },
        include: { organization: true },
      });
    }

    if (!devUser) {
      // Auto-provision initial development organization and master administrator
      let org = await prisma.organization.findFirst();
      if (!org) {
        org = await prisma.organization.create({
          data: {
            name: "Avarta Development Workspace",
            defaultCurrency: "INR",
            country: "IN",
          },
        });
      }

      const defaultHash = await bcrypt.hash(env.masterDevPassword || "devpassword123", 10);
      devUser = await prisma.user.create({
        data: {
          organizationId: org.id,
          email: env.masterDevEmail || "dev@avarta.local",
          fullName: "Master Developer",
          passwordHash: defaultHash,
          role: "ADMINISTRATOR",
          status: "ACTIVE",
          tokenVersion: 0,
        },
        include: { organization: true },
      });
    }

    const accessToken = signAccessToken({
      userId: devUser.id,
      organizationId: devUser.organizationId,
      role: devUser.role,
      tokenVersion: devUser.tokenVersion ?? 0,
    });

    const rawRefreshToken = crypto.randomBytes(40).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");
    await prisma.refreshToken.create({
      data: {
        userId: devUser.id,
        organizationId: devUser.organizationId,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }).catch(() => {});

    return {
      user: {
        id: devUser.id,
        name: devUser.fullName,
        email: devUser.email,
        organizationId: devUser.organizationId,
        role: devUser.role,
        organizationName: (devUser as any).organization?.name,
      },
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: env.jwtExpiresIn,
    };
  }

  const alternateEmail = cleanEmail.endsWith("@avarta.dev")
    ? cleanEmail.replace("@avarta.dev", "@clearops.dev")
    : cleanEmail.endsWith("@clearops.dev")
    ? cleanEmail.replace("@clearops.dev", "@avarta.dev")
    : cleanEmail;

  const user = await prisma.user.findFirst({
    where: {
      email: { in: [cleanEmail, alternateEmail] },
      status: "ACTIVE",
    },
    include: { organization: true },
  });

  const recordFailedAttempt = async () => {
    try {
      const existing = await prisma.loginLockout.findUnique({
        where: { identifierHash },
      });
      const attempts = (existing?.failedAttempts || 0) + 1;
      let lockedUntil: Date | null = null;
      if (attempts >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
      }
      await prisma.loginLockout.upsert({
        where: { identifierHash },
        create: {
          identifierHash,
          failedAttempts: attempts,
          lockedUntil,
        },
        update: {
          failedAttempts: attempts,
          lockedUntil,
        },
      });

      if (attempts >= 5) {
        throw ApiError.tooManyRequests(
          "Too many failed login attempts from this network. Please wait 15 minutes or reset your password."
        );
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
    }
  };

  if (!user) {
    // Constant-time dummy hash compare to prevent timing side-channel attacks
    await bcrypt.compare(password, "$2a$10$abcdefghijklmnopqrstuuNOPQRSTUVWXYZabcdefghijklmnopqr");
    await recordFailedAttempt();
    throw ApiError.unauthorized("Invalid email or password");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await recordFailedAttempt();
    throw ApiError.unauthorized("Invalid email or password");
  }

  // Clear failed attempts upon successful login
  await prisma.loginLockout.deleteMany({
    where: { identifierHash },
  }).catch(() => {});

  const accessToken = signAccessToken({
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
    tokenVersion: user.tokenVersion ?? 0,
  });

  // Issue persistent refresh token (7 days TTL)
  const rawRefreshToken = crypto.randomBytes(40).toString("hex");
  const refreshTokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      organizationId: user.organizationId,
      tokenHash: refreshTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    user: {
      id: user.id,
      name: user.fullName,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      organizationName: user.organization?.name,
    },
    accessToken,
    refreshToken: rawRefreshToken,
    expiresIn: env.jwtExpiresIn,
  };
}

export async function rotateRefreshToken(rawRefreshToken: string) {
  if (!rawRefreshToken) {
    throw ApiError.badRequest("Refresh token is required");
  }
  const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { include: { organization: true } } },
  });

  if (!record || record.revokedAt || record.expiresAt.getTime() < Date.now()) {
    throw ApiError.unauthorized("Refresh token is invalid, expired, or has been revoked.");
  }
  if (record.user.status !== "ACTIVE") {
    throw ApiError.unauthorized("User account is inactive or disabled");
  }

  // Revoke the old refresh token (Strict rotation policy)
  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });

  // Issue brand-new refresh token
  const newRawRefreshToken = crypto.randomBytes(40).toString("hex");
  const newTokenHash = crypto.createHash("sha256").update(newRawRefreshToken).digest("hex");
  await prisma.refreshToken.create({
    data: {
      userId: record.userId,
      organizationId: record.organizationId,
      tokenHash: newTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const newAccessToken = signAccessToken({
    userId: record.userId,
    organizationId: record.organizationId,
    role: record.user.role,
    tokenVersion: record.user.tokenVersion ?? 0,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRawRefreshToken,
    expiresIn: env.jwtExpiresIn,
  };
}

export async function logout(accessToken: string, userId: string, refreshToken?: string) {
  // Revoke access token in DB and cache
  if (accessToken) {
    await revokeTokenAsync(accessToken);
  }

  // Revoke refresh token in DB if provided
  if (refreshToken) {
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "USER_LOGOUT",
        entityType: "User",
        entityId: user.id,
        result: "SUCCESS",
      },
    });
  }
  return { success: true, message: "Logged out successfully" };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.status !== "ACTIVE") {
    throw ApiError.unauthorized("User account is inactive or disabled");
  }
  return {
    id: user.id,
    name: user.fullName,
    email: user.email,
    organizationId: user.organizationId,
    role: user.role,
  };
}

export async function listTeamMembers(organizationId: string) {
  const users = await prisma.user.findMany({
    where: { organizationId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return users;
}

export async function inviteTeamMember(
  organizationId: string,
  input: { email: string; fullName: string; role: "ADMINISTRATOR" | "FINANCE_MANAGER" | "FINANCE_EXECUTIVE" | "APPROVER" | "READ_ONLY" }
) {
  const cleanEmail = input.email.toLowerCase().trim();

  // Check if user already exists in organization
  const existing = await prisma.user.findFirst({
    where: { organizationId, email: cleanEmail },
  });
  if (existing) {
    throw ApiError.conflict(`A user with email ${cleanEmail} already exists in this organization.`);
  }

  // Generate temporary password hash (invitation flow)
  const tempPassword = `Inv_${Math.random().toString(36).slice(-8)}!`;
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const newUser = await prisma.user.create({
    data: {
      organizationId,
      email: cleanEmail,
      fullName: input.fullName.trim(),
      passwordHash,
      role: input.role,
      status: "ACTIVE",
      tokenVersion: 0,
    },
  });

  return {
    id: newUser.id,
    email: newUser.email,
    fullName: newUser.fullName,
    role: newUser.role,
    status: newUser.status,
    temporaryPassword: tempPassword,
    message: "Team member invitation created. Temporary credentials generated.",
  };
}

export async function deactivateTeamMember(organizationId: string, userId: string, actorUserId: string) {
  if (userId === actorUserId) {
    throw ApiError.badRequest("You cannot deactivate your own account.");
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, organizationId },
  });
  if (!target) {
    throw ApiError.notFound("User not found in this organization.");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status: "DEACTIVATED", tokenVersion: { increment: 1 } },
  });

  // Invalidate all tokens for deactivated user
  await revokeAllUserTokensAsync(userId);

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: actorUserId,
      action: "USER_DEACTIVATED",
      entityType: "User",
      entityId: userId,
      result: "SUCCESS",
    },
  });

  return updated;
}

// In-memory token store with TTL for secure account recovery
const resetTokenStore = new Map<string, { userId: string; expiresAt: number }>();

export async function requestPasswordReset(email: string) {
  const cleanEmail = email.toLowerCase().trim();
  const user = await prisma.user.findFirst({
    where: { email: cleanEmail, status: "ACTIVE" },
  });

  // Security best practice: constant-time-like generic message to prevent account enumeration
  if (!user) {
    // Constant-time dummy hash compare to prevent timing side-channel attacks
    await bcrypt.compare("dummy_password_timing_pad", "$2a$10$abcdefghijklmnopqrstuuNOPQRSTUVWXYZabcdefghijklmnopqr");
    return {
      success: true,
      message: "If an active account exists for this email, password recovery instructions have been dispatched.",
    };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  resetTokenStore.set(resetToken, {
    userId: user.id,
    expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour TTL
  });

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      userId: user.id,
      action: "PASSWORD_RESET_REQUESTED",
      entityType: "User",
      entityId: user.id,
      result: "SUCCESS",
    },
  });

  // STRICTLY GATED on non-production environment: Never leak reset tokens to console in production
  if (env.nodeEnv !== "production") {
    console.info(`[DEV/TEST] Password recovery token for ${cleanEmail}: ${resetToken}`);
  }

  // Never return resetToken in API response body to prevent user enumeration
  return {
    success: true,
    message: "If an active account exists for this email, password recovery instructions have been dispatched.",
  };
}

export async function resetPassword(token: string, newPassword: string) {
  if (!token || !newPassword) {
    throw ApiError.badRequest("Token and new password are required");
  }
  if (newPassword.length < 8) {
    throw ApiError.badRequest("Password must be at least 8 characters long");
  }

  const record = resetTokenStore.get(token);
  if (!record || Date.now() > record.expiresAt) {
    if (record) resetTokenStore.delete(token);
    throw ApiError.badRequest("Password reset token is invalid or has expired");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const user = await prisma.user.update({
    where: { id: record.userId },
    data: {
      passwordHash,
      tokenVersion: { increment: 1 }, // Invalidate all previously issued tokens across all instances
    },
  });

  resetTokenStore.delete(token);

  // Revoke all existing sessions and refresh tokens on password change
  await revokeAllUserTokensAsync(user.id);
  revokeAllUserTokens(user.id);

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      userId: user.id,
      action: "PASSWORD_RESET_COMPLETED",
      entityType: "User",
      entityId: user.id,
      result: "SUCCESS",
    },
  });

  return { success: true, message: "Password updated successfully. You can now log in." };
}

export async function signup(data: {
  fullName: string;
  email: string;
  password: string;
  companyName: string;
  country?: string;
  termsAccepted: boolean;
}) {
  const cleanEmail = data.email.toLowerCase().trim();
  const country = (data.country || "IN").toUpperCase();
  const defaultCurrency = country === "IN" ? "INR" : country === "US" ? "USD" : country === "GB" ? "GBP" : "EUR";

  // Check if email already exists
  const existingUser = await prisma.user.findFirst({
    where: { email: cleanEmail },
  });

  if (existingUser) {
    throw ApiError.conflict("An account with this email already exists. Please log in.");
  }

  // Create new tenant organization (Organization ID is server-generated, never from request body)
  const organization = await prisma.organization.create({
    data: {
      name: data.companyName.trim(),
      legalName: data.companyName.trim(),
      country,
      defaultCurrency,
      timezone: country === "IN" ? "Asia/Kolkata" : "UTC",
    },
  });

  const passwordHash = await bcrypt.hash(data.password, 10);

  // Create Administrator user for this new workspace
  const user = await prisma.user.create({
    data: {
      organizationId: organization.id,
      email: cleanEmail,
      fullName: data.fullName.trim(),
      passwordHash,
      role: "ADMINISTRATOR",
      status: "ACTIVE",
      tokenVersion: 0,
    },
    include: { organization: true },
  });

  // Record Terms & Privacy consent with timestamp in unalterable AuditLog
  await prisma.auditLog.create({
    data: {
      organizationId: organization.id,
      userId: user.id,
      action: "USER_SIGNUP",
      entityType: "USER",
      entityId: user.id,
      afterData: {
        email: user.email,
        termsAccepted: data.termsAccepted,
        consentTimestamp: new Date().toISOString(),
        country,
        currency: defaultCurrency,
      },
      result: "SUCCESS",
    },
  });

  const accessToken = signAccessToken({
    userId: user.id,
    organizationId: organization.id,
    role: user.role,
    tokenVersion: 0,
  });

  const rawRefreshToken = crypto.randomBytes(40).toString("hex");
  const refreshTokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      organizationId: organization.id,
      tokenHash: refreshTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    user: {
      id: user.id,
      name: user.fullName,
      email: user.email,
      organizationId: organization.id,
      role: user.role,
      organizationName: organization.name,
    },
    accessToken,
    refreshToken: rawRefreshToken,
    expiresIn: env.jwtExpiresIn,
  };
}
