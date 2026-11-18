import { describe, it, expect, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "../../config/database";
import { login } from "./service";
import {
  startMfaEnrollment,
  enableMfa,
  disableMfa,
  regenerateRecoveryCodes,
  challengeMfa,
} from "./mfa-service";
import { generateTotpCode } from "../../lib/totp";
import { decryptSecret } from "../../lib/crypto";

describe("T-105: Multi-Factor Authentication (MFA / TOTP) Suite", () => {
  let testOrgId: string;
  let testUserId: string;
  const testEmail = "mfa-test-user@avarta.dev";
  const testPassword = "ValidMfaPassword123!";
  const clientIp = "127.0.0.1";

  beforeEach(async () => {
    let org = await prisma.organization.findFirst({
      where: { name: "MFA Test Org" },
    });
    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: "MFA Test Org",
          country: "IN",
          defaultCurrency: "INR",
        },
      });
    }
    testOrgId = org.id;

    await prisma.loginLockout.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.auditLog.deleteMany({
      where: { organizationId: testOrgId },
    });

    const passwordHash = await bcrypt.hash(testPassword, 10);
    const user = await prisma.user.upsert({
      where: {
        organizationId_email: {
          organizationId: testOrgId,
          email: testEmail,
        },
      },
      update: {
        passwordHash,
        tokenVersion: 1,
        status: "ACTIVE",
        role: "FINANCE_EXECUTIVE",
        mfaEnabled: false,
        mfaSecret: null,
        mfaRecoveryCodes: null,
        mfaEnrolledAt: null,
      },
      create: {
        organizationId: testOrgId,
        email: testEmail,
        fullName: "MFA Test User",
        passwordHash,
        role: "FINANCE_EXECUTIVE",
        status: "ACTIVE",
        tokenVersion: 1,
        mfaEnabled: false,
      },
    });
    testUserId = user.id;
  });

  it("1. starts MFA enrollment and provides secret and otpauth URI", async () => {
    const enrollment = await startMfaEnrollment(testUserId);
    expect(enrollment.secret).toBeDefined();
    expect(enrollment.secret.length).toBeGreaterThanOrEqual(16);
    expect(enrollment.otpauthUri).toContain("otpauth://totp/");
    expect(enrollment.otpauthUri).toContain(encodeURIComponent(testEmail));
  });

  it("2. fails enabling MFA with invalid code", async () => {
    const enrollment = await startMfaEnrollment(testUserId);
    await expect(
      enableMfa(testUserId, testOrgId, enrollment.secret, "000000")
    ).rejects.toThrow("Invalid verification code");
  });

  it("3. enables MFA with valid code, encrypts secret, hashes recovery codes, increments tokenVersion and logs audit event", async () => {
    const userBefore = await prisma.user.findUnique({ where: { id: testUserId } });
    const initialTokenVersion = userBefore!.tokenVersion;

    const enrollment = await startMfaEnrollment(testUserId);
    const validCode = generateTotpCode(enrollment.secret);

    const enableResult = await enableMfa(testUserId, testOrgId, enrollment.secret, validCode);
    expect(enableResult.recoveryCodes).toHaveLength(8);

    const userAfter = await prisma.user.findUnique({ where: { id: testUserId } });
    expect(userAfter?.mfaEnabled).toBe(true);
    expect(userAfter?.mfaSecret).toBeDefined();
    expect(userAfter?.mfaSecret).not.toBe(enrollment.secret); // AES-256-GCM encrypted
    expect(decryptSecret(userAfter!.mfaSecret!)).toBe(enrollment.secret);
    expect(userAfter?.mfaEnrolledAt).toBeInstanceOf(Date);
    expect(userAfter?.tokenVersion).toBe(initialTokenVersion + 1);

    // Verify recovery codes are stored hashed
    const parsedCodes = JSON.parse(userAfter!.mfaRecoveryCodes!);
    expect(parsedCodes).toHaveLength(8);
    expect(parsedCodes[0].used).toBe(false);
    expect(parsedCodes[0].hash).toBeDefined();

    // Verify AuditLog
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        organizationId: testOrgId,
        userId: testUserId,
        action: "MFA_ENABLED",
      },
    });
    expect(auditLog).toBeDefined();
  });

  it("4. requires MFA challenge during login when user has MFA enabled", async () => {
    // Enable MFA first
    const enrollment = await startMfaEnrollment(testUserId);
    const validCode = generateTotpCode(enrollment.secret);
    await enableMfa(testUserId, testOrgId, enrollment.secret, validCode);

    // Attempt login with valid password
    const loginResult = await login(testEmail, testPassword, clientIp);
    expect(loginResult.mfaRequired).toBe(true);
    expect(loginResult.challengeToken).toBeDefined();
    expect(loginResult.accessToken).toBeUndefined();
    expect(loginResult.refreshToken).toBeUndefined();
  });

  it("5. verifies MFA challenge with valid TOTP code and returns session tokens", async () => {
    const enrollment = await startMfaEnrollment(testUserId);
    const validCode = generateTotpCode(enrollment.secret);
    await enableMfa(testUserId, testOrgId, enrollment.secret, validCode);

    const loginResult = await login(testEmail, testPassword, clientIp);
    expect(loginResult.challengeToken).toBeDefined();

    // Complete challenge
    const challengeCode = generateTotpCode(enrollment.secret);
    const challengeResult = await challengeMfa(loginResult.challengeToken!, challengeCode, clientIp);

    expect(challengeResult.accessToken).toBeDefined();
    expect(challengeResult.refreshToken).toBeDefined();
    expect(challengeResult.user.id).toBe(testUserId);
    expect(challengeResult.user.mfaEnabled).toBe(true);

    // Verify AuditLog for successful login
    const loginAudit = await prisma.auditLog.findFirst({
      where: {
        organizationId: testOrgId,
        userId: testUserId,
        action: "MFA_LOGIN_SUCCESS",
      },
    });
    expect(loginAudit).toBeDefined();
  });

  it("6. completes MFA challenge with single-use recovery code and blocks reuse", async () => {
    const enrollment = await startMfaEnrollment(testUserId);
    const validCode = generateTotpCode(enrollment.secret);
    const { recoveryCodes } = await enableMfa(testUserId, testOrgId, enrollment.secret, validCode);
    const singleUseCode = recoveryCodes[0];

    const loginResult1 = await login(testEmail, testPassword, clientIp);
    const challengeResult1 = await challengeMfa(loginResult1.challengeToken!, singleUseCode, clientIp);
    expect(challengeResult1.accessToken).toBeDefined();

    // Reusing the same recovery code should fail
    const loginResult2 = await login(testEmail, testPassword, clientIp);
    await expect(
      challengeMfa(loginResult2.challengeToken!, singleUseCode, clientIp)
    ).rejects.toThrow("Invalid verification code or recovery code");
  });

  it("7. regenerates recovery codes when provided valid password and TOTP code", async () => {
    const enrollment = await startMfaEnrollment(testUserId);
    const validCode = generateTotpCode(enrollment.secret);
    const { recoveryCodes: originalCodes } = await enableMfa(testUserId, testOrgId, enrollment.secret, validCode);

    // Wrong password should fail
    await expect(
      regenerateRecoveryCodes(testUserId, testOrgId, "WrongPassword!", validCode)
    ).rejects.toThrow("Invalid password");

    // Valid password & code should regenerate
    const currentCode = generateTotpCode(enrollment.secret);
    const { recoveryCodes: newCodes } = await regenerateRecoveryCodes(
      testUserId,
      testOrgId,
      testPassword,
      currentCode
    );

    expect(newCodes).toHaveLength(8);
    expect(newCodes).not.toEqual(originalCodes);

    // Original recovery code should now be invalid
    const loginResult = await login(testEmail, testPassword, clientIp);
    await expect(
      challengeMfa(loginResult.challengeToken!, originalCodes[0], clientIp)
    ).rejects.toThrow("Invalid verification code or recovery code");

    // New recovery code works
    const challengeResult = await challengeMfa(loginResult.challengeToken!, newCodes[0], clientIp);
    expect(challengeResult.accessToken).toBeDefined();
  });

  it("8. disables MFA when provided valid password and code, incrementing tokenVersion", async () => {
    const enrollment = await startMfaEnrollment(testUserId);
    const validCode = generateTotpCode(enrollment.secret);
    await enableMfa(testUserId, testOrgId, enrollment.secret, validCode);

    const userBeforeDisable = await prisma.user.findUnique({ where: { id: testUserId } });
    const versionBefore = userBeforeDisable!.tokenVersion;

    const currentCode = generateTotpCode(enrollment.secret);
    await disableMfa(testUserId, testOrgId, testPassword, currentCode);

    const userAfterDisable = await prisma.user.findUnique({ where: { id: testUserId } });
    expect(userAfterDisable?.mfaEnabled).toBe(false);
    expect(userAfterDisable?.mfaSecret).toBeNull();
    expect(userAfterDisable?.mfaRecoveryCodes).toBeNull();
    expect(userAfterDisable?.mfaEnrolledAt).toBeNull();
    expect(userAfterDisable?.tokenVersion).toBe(versionBefore + 1);

    // Login no longer requires MFA
    const loginResult = await login(testEmail, testPassword, clientIp);
    expect(loginResult.mfaRequired).toBe(false);
    expect(loginResult.accessToken).toBeDefined();
  });
});
