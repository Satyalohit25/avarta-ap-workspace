import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  rotateRefreshToken,
  login,
  _setRotationGraceWindowForTest,
  _resetRotationGraceWindowForTest,
  _clearTokenRotationSuccessorsForTest,
} from "./service";
import { prisma } from "../../config/database";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { authRateLimiter, refreshRateLimiter } from "../../middleware/rate-limiter";
import type { Request, Response, NextFunction } from "express";

describe("T-103 & T-104: Auth Refresh Rotation, Grace Window & Rate Limiter Suite", () => {
  const testEmail = "grace-test@avarta.local";
  const testPassword = "ValidPassword123!";
  let testUserId = "";
  let testOrgId = "";

  beforeEach(async () => {
    _clearTokenRotationSuccessorsForTest();
    _resetRotationGraceWindowForTest();

    // Clean up or ensure test user exists
    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: "Grace Test Org",
          defaultCurrency: "INR",
          country: "IN",
        },
      });
    }
    testOrgId = org.id;

    let user = await prisma.user.findFirst({ where: { email: testEmail } });
    if (!user) {
      const passwordHash = await bcrypt.hash(testPassword, 10);
      user = await prisma.user.create({
        data: {
          email: testEmail,
          fullName: "Grace Test User",
          passwordHash,
          organizationId: testOrgId,
          role: "FINANCE_EXECUTIVE",
          status: "ACTIVE",
          tokenVersion: 0,
        },
      });
    }
    testUserId = user.id;
  });

  describe("T-103: Concurrent Refresh & Token Rotation Grace Window", () => {
    it("allows 5 parallel refresh calls with the same token to all succeed and return the valid session", async () => {
      const loginRes = await login(testEmail, testPassword, "127.0.0.1");
      const initialRefreshToken = loginRes.refreshToken;
      expect(initialRefreshToken).toBeDefined();

      // Fire 5 concurrent refresh calls with the same token
      const results = await Promise.all([
        rotateRefreshToken(initialRefreshToken),
        rotateRefreshToken(initialRefreshToken),
        rotateRefreshToken(initialRefreshToken),
        rotateRefreshToken(initialRefreshToken),
        rotateRefreshToken(initialRefreshToken),
      ]);

      // All 5 calls must succeed
      for (const res of results) {
        expect(res.accessToken).toBeDefined();
        expect(res.refreshToken).toBeDefined();
        // They must return the exact same rotated token session
        expect(res.accessToken).toBe(results[0].accessToken);
        expect(res.refreshToken).toBe(results[0].refreshToken);
      }
    });

    it("rejects replay of a rotated token after the grace window expires and revokes the token family with an audit log", async () => {
      // Set grace window to 50ms for testing expiration
      _setRotationGraceWindowForTest(50);

      const loginRes = await login(testEmail, testPassword, "127.0.0.1");
      const initialRefreshToken = loginRes.refreshToken;

      // First rotation succeeds
      const firstRotation = await rotateRefreshToken(initialRefreshToken);
      expect(firstRotation.accessToken).toBeDefined();

      // Wait 100ms for grace window to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Replay of initialRefreshToken after grace window must throw unauthorized and revoke family
      await expect(rotateRefreshToken(initialRefreshToken)).rejects.toThrow(
        /Refresh token reuse detected\. Token family has been revoked/
      );

      // Verify that successor token was also revoked as part of the family revocation
      await expect(rotateRefreshToken(firstRotation.refreshToken)).rejects.toThrow(
        /Refresh token is invalid, expired, or has been revoked/
      );

      // Verify audit log entry written
      const auditEntry = await prisma.auditLog.findFirst({
        where: {
          organizationId: testOrgId,
          userId: testUserId,
          action: "TOKEN_FAMILY_REVOCATION",
        },
      });
      expect(auditEntry).toBeDefined();
      expect(auditEntry?.action).toBe("TOKEN_FAMILY_REVOCATION");

      _resetRotationGraceWindowForTest();
    });
  });

  describe("T-104: Rate Limiter Isolation", () => {
    it("ensures 20 refresh requests do not exhaust authRateLimiter (login / signup limiter)", () => {
      const mockReq = (ip: string, token: string) =>
        ({
          ip,
          headers: {
            "x-forwarded-for": ip,
            cookie: `avarta_refresh=${token}`,
          },
          socket: { remoteAddress: ip },
          body: {},
        } as unknown as Request);

      const makeRes = () => {
        let statusCode = 200;
        let responseJson: any = null;
        const resObj: any = {
          status: (code: number) => {
            statusCode = code;
            return resObj;
          },
          json: (data: any) => {
            responseJson = data;
            return resObj;
          },
          setHeader: () => resObj,
        };
        return { res: resObj as Response, getStatus: () => statusCode, getJson: () => responseJson };
      };

      const ip = "192.168.1.100";
      const token = "mock-refresh-token-123";
      let authLimiterPasses = 0;
      let refreshLimiterPasses = 0;

      // 20 refresh requests through refreshRateLimiter
      for (let i = 0; i < 20; i++) {
        const req = mockReq(ip, `${token}-${i}`);
        const { res } = makeRes();
        const next: NextFunction = () => {
          refreshLimiterPasses++;
        };
        refreshRateLimiter(req, res, next);
      }
      expect(refreshLimiterPasses).toBe(20);

      // Verify that authRateLimiter (which has a limit of 15) is completely unaffected and still has all quota
      for (let i = 0; i < 15; i++) {
        const req = mockReq(ip, "");
        const { res } = makeRes();
        const next: NextFunction = () => {
          authLimiterPasses++;
        };
        authRateLimiter(req, res, next);
      }
      expect(authLimiterPasses).toBe(15);

      // 16th login attempt on authRateLimiter triggers 429
      const overflowReq = mockReq(ip, "");
      const { res: overflowRes, getStatus } = makeRes();
      authRateLimiter(overflowReq, overflowRes, () => {});
      expect(getStatus()).toBe(429);
    });
  });
});
