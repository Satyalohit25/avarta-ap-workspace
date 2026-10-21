import { describe, it, expect, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "../../config/database";
import {
  login,
  logout,
  resetPassword,
  rotateRefreshToken,
  computeLockoutHash,
} from "./service";
import {
  signAccessToken,
  verifyAccessTokenAsync,
  hashToken,
  clearTokenRevocationCaches,
} from "../../lib/jwt";
import { transitionInvoice, updateInvoice } from "../invoices/service";

// Mirror the frontend sanitizeReturnTo algorithm in backend test suite to verify protection
function sanitizeReturnTo(rawReturnTo: string | null | undefined): string {
  if (!rawReturnTo || typeof rawReturnTo !== "string") return "/overview";
  let decoded = rawReturnTo.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    return "/overview";
  }
  // eslint-disable-next-line no-control-regex
  decoded = decoded.replace(/[\x00-\x1F\x7F-\x9F\r\n\t]/g, "").trim();
  if (!decoded.startsWith("/")) return "/overview";
  if (decoded.startsWith("//") || decoded.startsWith("/\\") || decoded.startsWith("\\")) return "/overview";
  if (decoded.includes("..")) return "/overview";
  if (decoded.includes("\\")) return "/overview";
  const lower = decoded.toLowerCase();
  if (
    lower.includes("://") ||
    lower.includes("javascript:") ||
    lower.includes("data:") ||
    lower.includes("vbscript:")
  ) {
    return "/overview";
  }
  return decoded;
}

describe("P0 Security & Invariant Hardening Suite", () => {
  let testOrgId: string;
  let testUserId: string;
  const testEmail = "security-audit@avarta.dev";
  const testPassword = "SecurePassword123!";

  beforeEach(async () => {
    // Setup clean test tenant and user
    let org = await prisma.organization.findFirst({
      where: { name: "Security Audit Test Org" },
    });
    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: "Security Audit Test Org",
          country: "IN",
          defaultCurrency: "INR",
        },
      });
    }
    testOrgId = org.id;

    // Clean up test lockouts and tokens
    await prisma.loginLockout.deleteMany({});
    await prisma.revokedToken.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    clearTokenRevocationCaches();

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
        tokenVersion: 0,
        status: "ACTIVE",
        role: "FINANCE_EXECUTIVE",
      },
      create: {
        organizationId: testOrgId,
        email: testEmail,
        fullName: "Security Test User",
        passwordHash,
        role: "FINANCE_EXECUTIVE",
        status: "ACTIVE",
        tokenVersion: 0,
      },
    });
    testUserId = user.id;
  });

  // ── 1. Lockout Anti-DOS & Anti-Enumeration (Item 1 & 2) ──
  describe("Account + IP Keyed Lockout", () => {
    it("locks out an IP after 5 consecutive failed attempts with generic message", async () => {
      const clientIp = "192.168.1.100";
      for (let i = 0; i < 4; i++) {
        await expect(login(testEmail, "WrongPassword!", clientIp)).rejects.toThrow(
          "Invalid email or password"
        );
      }

      // 5th failed attempt triggers account lockout
      await expect(login(testEmail, "WrongPassword!", clientIp)).rejects.toThrow(
        /Too many failed login attempts from this network/
      );

      // Verify persistent record in DB
      const lockoutHash = computeLockoutHash(testEmail, clientIp);
      const lockoutRecord = await prisma.loginLockout.findUnique({
        where: { identifierHash: lockoutHash },
      });
      expect(lockoutRecord).not.toBeNull();
      expect(lockoutRecord?.failedAttempts).toBeGreaterThanOrEqual(5);
      expect(lockoutRecord?.lockedUntil).not.toBeNull();
    }, 15000);

    it("does not leak account existence on lockout of nonexistent email", async () => {
      const nonExistentEmail = "ghost-user-unknown@random-domain.xyz";
      const clientIp = "10.0.0.99";

      for (let i = 0; i < 4; i++) {
        await expect(login(nonExistentEmail, "WrongPassword!", clientIp)).rejects.toThrow(
          "Invalid email or password"
        );
      }

      // 5th failed attempt throws identical generic lockout error
      await expect(login(nonExistentEmail, "WrongPassword!", clientIp)).rejects.toThrow(
        /Too many failed login attempts from this network/
      );
    }, 15000);

    it("prevents external attacker IP from locking out legitimate user IP (Anti-DOS)", async () => {
      const attackerIp = "203.0.113.66";
      const legitimateIp = "198.51.100.22";

      // Attacker exhausts 5 attempts from attackerIp
      for (let i = 0; i < 5; i++) {
        try {
          await login(testEmail, "AttackerGuess!", attackerIp);
        } catch {
          // Expected rejection
        }
      }

      // Attacker IP is locked out
      await expect(login(testEmail, testPassword, attackerIp)).rejects.toThrow(
        /Too many failed login attempts from this network/
      );

      // Legitimate user from legitimateIp can log in immediately with correct password
      const result = await login(testEmail, testPassword, legitimateIp);
      expect(result.user.email).toBe(testEmail);
      expect(result.accessToken).toBeDefined();
    }, 15000);
  });

  // ── 2. Refresh Token Rotation & DB Revocation (Item 1 & 3) ──
  describe("Token Rotation and Logout Revocation", () => {
    it("rotates refresh token on refresh and revokes the old one", async () => {
      const loginRes = await login(testEmail, testPassword, "127.0.0.1");
      const oldRefreshToken = loginRes.refreshToken;
      expect(oldRefreshToken).toBeDefined();

      // Rotate token
      const rotateRes = await rotateRefreshToken(oldRefreshToken);
      expect(rotateRes.accessToken).toBeDefined();
      expect(rotateRes.refreshToken).toBeDefined();
      expect(rotateRes.refreshToken).not.toBe(oldRefreshToken);

      // Old refresh token must be revoked in DB and rejected
      await expect(rotateRefreshToken(oldRefreshToken)).rejects.toThrow(
        "Refresh token is invalid, expired, or has been revoked."
      );
    });

    it("revokes both access token and refresh token on logout", async () => {
      const loginRes = await login(testEmail, testPassword, "127.0.0.1");
      const accessToken = loginRes.accessToken;
      const refreshToken = loginRes.refreshToken;

      // Prior to logout, access token is valid
      const verified = await verifyAccessTokenAsync(accessToken);
      expect(verified.userId).toBe(testUserId);

      // Execute logout
      await logout(accessToken, testUserId, refreshToken);

      // Access token must be rejected in DB
      await expect(verifyAccessTokenAsync(accessToken)).rejects.toThrow(
        "Token has been revoked or invalidated"
      );

      // Refresh token must be rejected in DB
      await expect(rotateRefreshToken(refreshToken)).rejects.toThrow(
        "Refresh token is invalid, expired, or has been revoked."
      );
    });
  });

  // ── 3. Password Change Revocation via DB tokenVersion (Item 1 & 3) ──
  describe("Password Reset Token Version Invalidation", () => {
    it("invalidates all active sessions across multiple instances by incrementing tokenVersion", async () => {
      // 1. Issue token under version 0
      const tokenV0 = signAccessToken({
        userId: testUserId,
        organizationId: testOrgId,
        role: "FINANCE_EXECUTIVE",
        tokenVersion: 0,
      });

      // Token is valid
      const verified = await verifyAccessTokenAsync(tokenV0);
      expect(verified.tokenVersion).toBe(0);

      // 2. Simulate password reset / tokenVersion increment
      await prisma.user.update({
        where: { id: testUserId },
        data: { tokenVersion: { increment: 1 } },
      });

      // 3. Any token issued prior to password reset must now be rejected against DB
      await expect(verifyAccessTokenAsync(tokenV0)).rejects.toThrow(
        "Token has been revoked or invalidated"
      );
    });
  });

  // ── 4. Open Redirect Hardening (Item 7) ──
  describe("returnTo Sanitization against Encoded & Control Payloads", () => {
    it("rejects protocol-relative and scheme-relative URLs", () => {
      expect(sanitizeReturnTo("//evil.com")).toBe("/overview");
      expect(sanitizeReturnTo("/\\evil.com")).toBe("/overview");
      expect(sanitizeReturnTo("\\\\evil.com")).toBe("/overview");
      expect(sanitizeReturnTo("https://evil.com")).toBe("/overview");
      expect(sanitizeReturnTo("javascript:alert(document.cookie)")).toBe("/overview");
      expect(sanitizeReturnTo("data:text/html,<script>alert(1)</script>")).toBe("/overview");
    });

    it("rejects URL-encoded malicious variants", () => {
      expect(sanitizeReturnTo("%2f%2fevil.com")).toBe("/overview");
      expect(sanitizeReturnTo("%2f%5cevil.com")).toBe("/overview");
      expect(sanitizeReturnTo("/%2e%2e/%2e%2e/evil.com")).toBe("/overview");
      expect(sanitizeReturnTo("%2F%2Fattacker.com%2Fpath")).toBe("/overview");
    });

    it("rejects CRLF, newlines, tabs, and control characters", () => {
      expect(sanitizeReturnTo("/\t/evil.com")).toBe("/overview");
      expect(sanitizeReturnTo("/\r\n//evil.com")).toBe("/overview");
      expect(sanitizeReturnTo("/\x00//evil.com")).toBe("/overview");
    });

    it("allows valid relative in-app paths", () => {
      expect(sanitizeReturnTo("/invoices")).toBe("/invoices");
      expect(sanitizeReturnTo("/approvals?invoiceId=INV-2026-001")).toBe(
        "/approvals?invoiceId=INV-2026-001"
      );
      expect(sanitizeReturnTo("/settings")).toBe("/settings");
    });
  });

  // ── 5. Terminal State Immutability & Transition Role Enforcement ──
  describe("Terminal State Immutability & Server Role Enforcement", () => {
    it("rejects edits on terminal state invoices (PAID, ARCHIVED, SYNCED, REJECTED)", async () => {
      const invoice = await prisma.invoice.create({
        data: {
          organizationId: testOrgId,
          invoiceNumber: `INV-TERM-${Date.now()}`,
          totalAmount: 50000,
          currency: "INR",
          status: "PAID",
          workflowState: "PAID",
        },
      });

      await expect(
        updateInvoice({
          organizationId: testOrgId,
          invoiceId: invoice.id,
          totalAmount: 60000,
        })
      ).rejects.toThrow(/immutable and cannot be edited/);
    });

    it("forbids FINANCE_EXECUTIVE from approving an invoice on the server", async () => {
      const invoice = await prisma.invoice.create({
        data: {
          organizationId: testOrgId,
          invoiceNumber: `INV-APPR-GUARD-${Date.now()}`,
          totalAmount: 50000,
          currency: "INR",
          status: "PENDING_APPROVAL",
          workflowState: "WAITING_APPROVAL",
        },
      });

      await expect(
        transitionInvoice(
          testOrgId,
          invoice.id,
          "APPROVE",
          testUserId,
          "Attempted exec approval",
          "FINANCE_EXECUTIVE"
        )
      ).rejects.toThrow(/is not authorized to approve or reject invoices/);
    });

    it("rejects approval if invoice has unresolved blocking exceptions", async () => {
      const invoice = await prisma.invoice.create({
        data: {
          organizationId: testOrgId,
          invoiceNumber: `INV-EXC-GUARD-${Date.now()}`,
          totalAmount: 50000,
          currency: "INR",
          status: "PENDING_APPROVAL",
          workflowState: "WAITING_APPROVAL",
        },
      });

      // Create open exception
      await prisma.exception.create({
        data: {
          organizationId: testOrgId,
          invoiceId: invoice.id,
          type: "PRICE_DIFFERENCE",
          severity: "HIGH",
          title: "Unit price mismatch against PO line",
          status: "OPEN",
        },
      });

      // Even an ADMINISTRATOR cannot approve with an open exception
      await expect(
        transitionInvoice(
          testOrgId,
          invoice.id,
          "APPROVE",
          testUserId,
          "Admin bypass attempt",
          "ADMINISTRATOR"
        )
      ).rejects.toThrow(/Invoice has an unresolved blocking exception/);
    });
  });
});
