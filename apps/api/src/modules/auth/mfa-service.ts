import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/database";
import { env } from "../../config/env";
import { ApiError } from "../../lib/errors";
import { encryptSecret, decryptSecret } from "../../lib/crypto";
import {
  generateTotpSecret,
  generateOtpAuthUri,
  verifyTotpCode,
  generateRecoveryCodes,
  verifyAndConsumeRecoveryCode,
} from "../../lib/totp";
import { signAccessToken } from "../../lib/jwt";

interface MfaChallengePayload {
  sub: string;
  orgId: string;
  purpose: string;
}

export async function startMfaEnrollment(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { organization: true },
  });

  if (!user || user.status !== "ACTIVE") {
    throw ApiError.unauthorized("User account is inactive or disabled");
  }

  const secret = generateTotpSecret(20);
  const orgName = user.organization?.name || "Avarta AP";
  const otpauthUri = generateOtpAuthUri(user.email, orgName, secret);

  return {
    secret,
    otpauthUri,
  };
}

export async function enableMfa(
  userId: string,
  organizationId: string,
  secret: string,
  code: string
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.status !== "ACTIVE") {
    throw ApiError.unauthorized("User account is inactive or disabled");
  }

  // Verify TOTP code against provided secret
  const isValid = verifyTotpCode(secret, code);
  if (!isValid) {
    throw ApiError.badRequest("Invalid verification code. Please check your authenticator app and try again.");
  }

  // Generate 8 single-use recovery codes
  const { plainCodes, hashedCodes } = generateRecoveryCodes(8);
  const encryptedSecret = encryptSecret(secret);

  await prisma.$transaction(async (tx) => {
    // Increment tokenVersion to invalidate existing session tokens
    await tx.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecret: encryptedSecret,
        mfaRecoveryCodes: JSON.stringify(hashedCodes),
        mfaEnrolledAt: new Date(),
        tokenVersion: { increment: 1 },
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId,
        userId,
        action: "MFA_ENABLED",
        entityType: "USER",
        entityId: userId,
        afterData: { mfaEnabled: true },
      },
    });
  });

  return {
    recoveryCodes: plainCodes,
  };
}

export async function disableMfa(
  userId: string,
  organizationId: string,
  password: string,
  code: string
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.status !== "ACTIVE") {
    throw ApiError.unauthorized("User account is inactive or disabled");
  }

  if (!user.mfaEnabled) {
    throw ApiError.badRequest("MFA is not enabled for this account");
  }

  // Verify user password
  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    throw ApiError.unauthorized("Invalid password.");
  }

  // Verify TOTP code or recovery code
  let codeValid = false;
  if (user.mfaSecret) {
    const plainSecret = decryptSecret(user.mfaSecret);
    codeValid = verifyTotpCode(plainSecret, code);
  }

  if (!codeValid && user.mfaRecoveryCodes) {
    const recoveryResult = verifyAndConsumeRecoveryCode(user.mfaRecoveryCodes, code);
    codeValid = recoveryResult.valid;
  }

  if (!codeValid) {
    throw ApiError.unauthorized("Invalid verification code or recovery code.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaRecoveryCodes: null,
        mfaEnrolledAt: null,
        tokenVersion: { increment: 1 },
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId,
        userId,
        action: "MFA_DISABLED",
        entityType: "USER",
        entityId: userId,
        afterData: { mfaEnabled: false },
      },
    });
  });

  return { success: true };
}

export async function regenerateRecoveryCodes(
  userId: string,
  organizationId: string,
  password: string,
  code: string
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.status !== "ACTIVE") {
    throw ApiError.unauthorized("User account is inactive or disabled");
  }

  if (!user.mfaEnabled || !user.mfaSecret) {
    throw ApiError.badRequest("MFA must be enabled to regenerate recovery codes");
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    throw ApiError.unauthorized("Invalid password.");
  }

  const plainSecret = decryptSecret(user.mfaSecret);
  const isValid = verifyTotpCode(plainSecret, code);
  if (!isValid) {
    throw ApiError.unauthorized("Invalid verification code.");
  }

  const { plainCodes, hashedCodes } = generateRecoveryCodes(8);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        mfaRecoveryCodes: JSON.stringify(hashedCodes),
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId,
        userId,
        action: "MFA_RECOVERY_CODES_REGENERATED",
        entityType: "USER",
        entityId: userId,
        afterData: { recoveryCodesCount: plainCodes.length },
      },
    });
  });

  return { recoveryCodes: plainCodes };
}

export async function challengeMfa(challengeToken: string, code: string, clientIp: string) {
  let decoded: MfaChallengePayload;
  try {
    decoded = jwt.verify(challengeToken, env.jwtSecret) as MfaChallengePayload;
    if (decoded.purpose !== "mfa_challenge" || !decoded.sub) {
      throw new Error("Invalid token purpose");
    }
  } catch {
    throw ApiError.unauthorized("MFA challenge token has expired or is invalid. Please sign in again.");
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.sub },
    include: { organization: true },
  });

  if (!user || user.status !== "ACTIVE" || !user.mfaEnabled || !user.mfaSecret) {
    throw ApiError.unauthorized("User account or MFA configuration is invalid");
  }

  // Rate limiting / Lockout tracking keyed by identifierHash
  const identifierHash = crypto
    .createHash("sha256")
    .update(`mfa:${user.email.toLowerCase()}:${clientIp}`)
    .digest("hex");

  const lockout = await prisma.loginLockout.findUnique({
    where: { identifierHash },
  });

  if (lockout?.lockedUntil && lockout.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((lockout.lockedUntil.getTime() - Date.now()) / (1000 * 60));
    throw ApiError.tooManyRequests(
      `Too many failed MFA attempts. Please wait ${minutesLeft} minute(s) before trying again.`
    );
  }

  const recordFailedMfa = async () => {
    const attempts = (lockout?.failedAttempts || 0) + 1;
    let lockedUntil: Date | null = null;
    if (attempts >= 5) {
      lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
    await prisma.loginLockout.upsert({
      where: { identifierHash },
      create: { identifierHash, failedAttempts: attempts, lockedUntil },
      update: { failedAttempts: attempts, lockedUntil },
    });
    if (attempts >= 5) {
      throw ApiError.tooManyRequests(
        "Too many failed verification attempts. Please wait 15 minutes before trying again."
      );
    }
  };

  // Verify code: Check TOTP first
  let codeValid = false;
  let usedRecovery = false;
  let updatedRecoveryCodes: string | undefined;

  const plainSecret = decryptSecret(user.mfaSecret);
  codeValid = verifyTotpCode(plainSecret, code);

  // If not valid TOTP, check recovery codes
  if (!codeValid && user.mfaRecoveryCodes) {
    const recoveryResult = verifyAndConsumeRecoveryCode(user.mfaRecoveryCodes, code);
    if (recoveryResult.valid) {
      codeValid = true;
      usedRecovery = true;
      updatedRecoveryCodes = recoveryResult.updatedCodesJson;
    }
  }

  if (!codeValid) {
    await recordFailedMfa();
    throw ApiError.unauthorized("Invalid verification code or recovery code");
  }

  // Clear failed attempt record on success
  await prisma.loginLockout.deleteMany({ where: { identifierHash } }).catch(() => {});

  // If recovery code was consumed, persist the used state
  if (usedRecovery && updatedRecoveryCodes) {
    await prisma.user.update({
      where: { id: user.id },
      data: { mfaRecoveryCodes: updatedRecoveryCodes },
    });
  }

  // Issue real session tokens
  const accessToken = signAccessToken({
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
    tokenVersion: user.tokenVersion ?? 0,
  });

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

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      userId: user.id,
      action: usedRecovery ? "MFA_RECOVERY_CODE_LOGIN" : "MFA_LOGIN_SUCCESS",
      entityType: "USER",
      entityId: user.id,
      afterData: { method: usedRecovery ? "RECOVERY_CODE" : "TOTP" },
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
      mfaEnabled: true,
    },
    accessToken,
    refreshToken: rawRefreshToken,
    expiresIn: env.jwtExpiresIn,
  };
}
