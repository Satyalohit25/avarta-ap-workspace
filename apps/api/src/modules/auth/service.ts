import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../../config/database";
import { ApiError } from "../../lib/errors";
import {
  signAccessToken,
  revokeTokenAsync,
  revokeAllUserTokensAsync,
  revokeAllUserTokens,
} from "../../lib/jwt";
import { env } from "../../config/env";
import { IntegrationsService } from "../integrations/service";

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
    cleanEmail === (env.masterDevEmail as string).toLowerCase().trim() &&
    password === env.masterDevPassword;

  if (isMasterDev) {
    let devUser = await prisma.user.findFirst({
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
        organizationName: devUser.organization?.name,
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

  const activeAdminCount = await prisma.user.count({
    where: {
      organizationId: user.organizationId,
      role: "ADMINISTRATOR",
      status: "ACTIVE",
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
      activeAdminCount,
      isSoloAdmin: user.role === "ADMINISTRATOR" && activeAdminCount === 1,
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
  const activeAdminCount = await prisma.user.count({
    where: {
      organizationId: user.organizationId,
      role: "ADMINISTRATOR",
      status: "ACTIVE",
    },
  });
  return {
    id: user.id,
    name: user.fullName,
    email: user.email,
    organizationId: user.organizationId,
    role: user.role,
    activeAdminCount,
    isSoloAdmin: user.role === "ADMINISTRATOR" && activeAdminCount === 1,
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
  input: { email: string; fullName: string; role: "ADMINISTRATOR" | "FINANCE_MANAGER" | "FINANCE_EXECUTIVE" | "APPROVER" | "READ_ONLY" },
  invitedById?: string
) {
  const cleanEmail = input.email.toLowerCase().trim();

  // A user may only belong to one workspace today (login is email-based), so
  // reject invitations for emails that already have an account anywhere.
  const existing = await prisma.user.findFirst({
    where: { email: cleanEmail },
  });
  if (existing) {
    throw ApiError.conflict(`An account with email ${cleanEmail} already exists.`);
  }

  // Determine inviter user ID
  let inviterId = invitedById;
  if (!inviterId) {
    const admin = await prisma.user.findFirst({
      where: { organizationId, role: "ADMINISTRATOR" },
      select: { id: true },
    });
    inviterId = admin?.id;
  }
  if (!inviterId) {
    const anyUser = await prisma.user.findFirst({
      where: { organizationId },
      select: { id: true },
    });
    inviterId = anyUser?.id;
  }
  if (!inviterId) {
    throw ApiError.badRequest("Cannot invite team member without an existing organization user.");
  }

  // Generate secure single-use invitation token
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7-day expiry

  const invitation = await prisma.$transaction(async (tx) => {
    // Revoke previous pending invites for this email in this organization
    await tx.organizationInvitation.updateMany({
      where: {
        organizationId,
        email: cleanEmail,
        usedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    // The user row is created only when the invitation is accepted, so no
    // temporary password or inactive account is ever generated.
    return tx.organizationInvitation.create({
      data: {
        organizationId,
        invitedById: inviterId as string,
        email: cleanEmail,
        role: input.role,
        tokenHash,
        expiresAt,
      },
    });
  });

  const inviteUrl = `${env.webOrigin.replace(/\/$/, "")}/accept-invite?token=${rawToken}`;

  // Deliver through the tenant's own email connector. When none is
  // configured we return the link so the administrator can share it and
  // never claim an email was sent.
  const delivery = await IntegrationsService.sendTransactionalEmail(organizationId, {
    to: cleanEmail,
    subject: "You have been invited to Avarta AP Workspace",
    text: [
      `Hello ${input.fullName},`,
      "",
      `You have been invited to join the Avarta AP Workspace as ${input.role.replace(/_/g, " ")}.`,
      `Accept your invitation: ${inviteUrl}`,
      "",
      "This single-use link expires in 7 days. If you were not expecting this invitation, you can ignore this email.",
    ].join("\n"),
    html: `<p>Hello ${input.fullName},</p><p>You have been invited to join the Avarta AP Workspace as <strong>${input.role.replace(/_/g, " ")}</strong>.</p><p><a href="${inviteUrl}">Accept your invitation</a></p><p>This single-use link expires in 7 days.</p>`,
  });

  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    invitationId: invitation.id,
    token: delivery.sent ? undefined : rawToken,
    inviteUrl: delivery.sent ? undefined : inviteUrl,
    emailSent: delivery.sent,
    emailDeliveryError: delivery.sent ? undefined : delivery.reason,
    expiresAt: invitation.expiresAt,
    message: delivery.sent
      ? `Invitation email sent to ${cleanEmail}.`
      : "Invitation created. No email connector is configured, so share the single-use invitation link securely.",
  };
}

export async function acceptInvitation(input: {
  token: string;
  fullName: string;
  password: string;
}) {
  if (input.password.length < 12) {
    throw ApiError.badRequest("Password must be at least 12 characters long");
  }

  const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex");
  const invitation = await prisma.organizationInvitation.findUnique({
    where: { tokenHash },
  });

  if (
    !invitation ||
    invitation.usedAt ||
    invitation.revokedAt ||
    invitation.expiresAt.getTime() <= Date.now()
  ) {
    throw ApiError.badRequest("Invitation is invalid, revoked, or has expired");
  }

  const existing = await prisma.user.findFirst({ where: { email: invitation.email } });
  if (existing) {
    throw ApiError.conflict("An account with this email already exists. Please log in.");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await prisma.$transaction(async (tx) => {
    // Single-use claim: only the first concurrent request can consume this token.
    const claimed = await tx.organizationInvitation.updateMany({
      where: {
        id: invitation.id,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw ApiError.badRequest("Invitation is invalid, revoked, or has expired");
    }

    return tx.user.create({
      data: {
        organizationId: invitation.organizationId,
        email: invitation.email,
        fullName: input.fullName.trim(),
        passwordHash,
        role: invitation.role,
        status: "ACTIVE",
        tokenVersion: 0,
      },
      include: { organization: true },
    });
  });

  await prisma.auditLog.create({
    data: {
      organizationId: invitation.organizationId,
      userId: user.id,
      action: "INVITATION_ACCEPTED",
      entityType: "User",
      entityId: user.id,
      result: "SUCCESS",
    },
  });

  return {
    success: true,
    message: "Invitation accepted. You can now log in.",
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      organizationId: user.organizationId,
    },
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

// Password reset tokens are persisted (hashed) in `password_reset_tokens`
// so resets survive process restarts and work across multiple instances.
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
  const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour TTL

  await prisma.$transaction(async (tx) => {
    // Revoke any outstanding tokens before issuing a new one.
    await tx.passwordResetToken.updateMany({
      where: { userId: user.id, organizationId: user.organizationId, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        organizationId: user.organizationId,
        expiresAt,
      },
    });
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

  const resetUrl = `${env.webOrigin.replace(/\/$/, "")}/reset-password?token=${resetToken}`;
  await IntegrationsService.sendTransactionalEmail(user.organizationId, {
    to: cleanEmail,
    subject: "Reset your Avarta AP Workspace password",
    text: [
      `Hello ${user.fullName || "there"},`,
      "",
      "A password reset was requested for your account.",
      `Reset your password: ${resetUrl}`,
      "",
      "This link expires in 1 hour and can only be used once. If you did not request this, no action is needed.",
    ].join("\n"),
    html: `<p>Hello ${user.fullName || "there"},</p><p>A password reset was requested for your account.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 1 hour and can only be used once.</p>`,
  });

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
  if (newPassword.length < 12) {
    throw ApiError.badRequest("Password must be at least 12 characters long");
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
    throw ApiError.badRequest("Password reset token is invalid or has expired");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const user = await prisma.$transaction(async (tx) => {
    // Single-use claim: only the first concurrent request can consume this token.
    const claimed = await tx.passwordResetToken.updateMany({
      where: {
        id: record.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw ApiError.badRequest("Password reset token is invalid or has expired");
    }

    return tx.user.update({
      where: { id: record.userId },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 }, // Invalidate all previously issued tokens across all instances
      },
    });
  });

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

export async function isSignupAllowed(): Promise<{
  allowed: boolean;
  reason?: string;
  currentCount: number;
  maxCount: number;
}> {
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
