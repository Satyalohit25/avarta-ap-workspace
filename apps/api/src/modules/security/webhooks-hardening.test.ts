import { describe, it, expect, beforeEach, vi } from "vitest";
import express, { Request, Response, NextFunction } from "express";
import http from "http";
import crypto from "crypto";
import { publicRoutes } from "../public/routes";
import { demoRoutes } from "../demo/routes";
import { processInboundEmail } from "../public/email-webhook";
import { verifyWebhookSignature } from "../billing/webhooks";
import { prisma } from "../../config/database";
import * as workflowEngine from "../../workflow/engine";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/public", publicRoutes);
  app.use("/api/v1/demo", demoRoutes);
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    res.status(err.status || err.statusCode || 500).json({ error: err.message, status: err.status || err.statusCode });
  });
  return app;
}

function makeRequest(
  app: express.Express,
  options: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: any;
  }
): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const addr = server.address() as any;
      const port = addr.port;
      const payload = options.body ? JSON.stringify(options.body) : undefined;
      const reqHeaders: Record<string, string> = {
        ...(options.headers || {}),
      };
      if (payload) {
        reqHeaders["Content-Type"] = "application/json";
        reqHeaders["Content-Length"] = Buffer.byteLength(payload).toString();
      }

      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: options.path,
          method: options.method,
          headers: reqHeaders,
        },
        (res: any) => {
          let data = "";
          res.on("data", (chunk: any) => (data += chunk));
          res.on("end", () => {
            server.close(() => {
              try {
                resolve({ status: res.statusCode, body: JSON.parse(data) });
              } catch {
                resolve({ status: res.statusCode, body: data });
              }
            });
          });
        }
      );

      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  });
}

describe("T-210 & T-212 Security Hardening Suite", () => {
  const testOrgId = "org_sec_test_001";
  const app = createTestApp();
  const testSecret = "test-email-webhook-secret-32-chars-long";

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.EMAIL_WEBHOOK_SECRET = testSecret;
  });

  describe("T-210: Inbound Webhook Hardening", () => {
    it("should return 401 when email webhook signature length is invalid (timingSafeEqual safety)", async () => {
      const payload = { from: "vendor@example.com", to: "invoices@company.com", subject: "Invoice 123" };
      const wrongLengthSignature = "short_invalid_signature";

      const res = await makeRequest(app, {
        method: "POST",
        path: "/api/public/invoices/email-webhook",
        headers: { "x-webhook-signature": wrongLengthSignature },
        body: payload,
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Cryptographic signature verification failed/i);
    });

    it("should return 401 when email webhook signature has correct length but invalid hash", async () => {
      const payload = { from: "vendor@example.com", to: "invoices@company.com", subject: "Invoice 123" };
      const badSignature = crypto.randomBytes(32).toString("hex");

      const res = await makeRequest(app, {
        method: "POST",
        path: "/api/public/invoices/email-webhook",
        headers: { "x-webhook-signature": badSignature },
        body: payload,
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Cryptographic signature verification failed/i);
    });

    it("should return 401 when email webhook timestamp is older than 5 minutes", async () => {
      const payload = { from: "vendor@example.com", to: "invoices@company.com", subject: "Invoice 123" };
      const rawPayload = JSON.stringify(payload);
      const signature = crypto.createHmac("sha256", testSecret).update(rawPayload).digest("hex");
      const staleTimestamp = new Date(Date.now() - 6 * 60 * 1000).toISOString();

      const res = await makeRequest(app, {
        method: "POST",
        path: "/api/public/invoices/email-webhook",
        headers: {
          "x-webhook-signature": signature,
          "x-webhook-timestamp": staleTimestamp,
        },
        body: payload,
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/timestamp expired/i);
    });

    it("should verify webhook signature safely handles mismatched lengths in verifyWebhookSignature", () => {
      const payload = JSON.stringify({ event: "test" });
      const secret = "secret_key_12345";
      // Bad length signature should return false, NOT throw RangeError
      expect(verifyWebhookSignature(payload, "short_sig", secret)).toBe(false);
      expect(verifyWebhookSignature(payload, "invalid_len_123", secret)).toBe(false);
    });

    it("should reject billing webhook when timestamp is older than 5 minutes", () => {
      const payload = JSON.stringify({ event: "test" });
      const secret = "secret_key_12345";
      const staleTime = Math.floor((Date.now() - 6 * 60 * 1000) / 1000);
      const sig = crypto.createHmac("sha256", secret).update(`${staleTime}.${payload}`).digest("hex");
      const header = `t=${staleTime},v1=${sig}`;

      expect(verifyWebhookSignature(payload, header, secret)).toBe(false);
    });

    it("should enforce message-id idempotency on email processing without duplicating invoice", async () => {
      vi.spyOn(prisma.organization, "findUnique").mockResolvedValue({
        id: testOrgId,
        name: "Test Org",
      } as any);

      vi.spyOn(prisma.supplier, "findFirst").mockResolvedValue({
        id: "sup-test",
        displayName: "Vendor Inc",
        organizationId: testOrgId,
      } as any);

      vi.spyOn(prisma.invoice, "create").mockResolvedValue({
        id: "inv-dedup-1",
        invoiceNumber: "INV-DEDUP-001",
        organizationId: testOrgId,
        source: "EMAIL",
      } as any);

      vi.spyOn(workflowEngine, "startWorkflow").mockResolvedValue({} as any);
      vi.spyOn(prisma.document, "create").mockResolvedValue({} as any);

      const idempotencyKeyMap = new Map<string, any>();
      vi.spyOn(prisma.idempotencyKey, "findFirst").mockImplementation(async (args: any) => {
        const key = args?.where?.key;
        return idempotencyKeyMap.get(key) || null;
      });

      vi.spyOn(prisma.idempotencyKey, "create").mockImplementation(async (args: any) => {
        idempotencyKeyMap.set(args.data.key, args.data);
        return args.data;
      });

      const emailInput = {
        from: "billing@vendor.com",
        to: `invoices+${testOrgId}@clearops.io`,
        subject: "Invoice INV-DEDUP-001",
        body: "Attached invoice",
        messageId: "msg-guid-12345678",
      };

      // 1st delivery
      const firstResult = await processInboundEmail(emailInput);
      expect(firstResult.success).toBe(true);
      expect(firstResult.deduplicated).toBeUndefined();
      expect(prisma.invoice.create).toHaveBeenCalledTimes(1);

      // 2nd delivery (redelivery of identical messageId)
      const secondResult = await processInboundEmail(emailInput);
      expect(secondResult.success).toBe(true);
      expect(secondResult.deduplicated).toBe(true);
      // Invoice create must NOT have been called a second time
      expect(prisma.invoice.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("T-212: Security Hardening Bundle", () => {
    describe("Demo Endpoints Gating", () => {
      it("should return 403 when ENABLE_DEMO is not 'true'", async () => {
        const originalEnv = process.env.ENABLE_DEMO;
        process.env.ENABLE_DEMO = "false";

        try {
          const res = await makeRequest(app, {
            method: "POST",
            path: "/api/v1/demo/reset",
            body: {},
          });

          expect(res.status).toBe(403);
          expect(res.body.error).toBe("Forbidden");
          expect(res.body.message).toMatch(/Demo endpoints and dataset manipulation are disabled/i);
        } finally {
          process.env.ENABLE_DEMO = originalEnv;
        }
      });
    });
  });
});
