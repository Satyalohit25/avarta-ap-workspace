import { describe, expect, it, vi } from "vitest";
import { requireIdempotencyKey, idempotent } from "./idempotency";
import { Request, Response } from "express";
import { prisma } from "../config/database";

describe("Idempotency Security & Replay Correctness", () => {
  it("blocks mutation requests missing Idempotency-Key header", () => {
    const req = { method: "POST", headers: {} } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    requireIdempotencyKey(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Idempotency-Key header is required"),
      })
    );
  });

  it("allows mutation requests with valid Idempotency-Key header", () => {
    const req = {
      method: "POST",
      headers: { "idempotency-key": "uuid-v4-payment-req-12345" },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    requireIdempotencyKey(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("allows mutation requests with valid X-Idempotency-Key header", () => {
    const req = {
      method: "POST",
      headers: { "x-idempotency-key": "uuid-v4-custom-key-67890" },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    requireIdempotencyKey(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("rejects empty string Idempotency-Key header", () => {
    const req = {
      method: "POST",
      headers: { "idempotency-key": "   " },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    requireIdempotencyKey(req, res, next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Idempotency-Key header is required"),
      })
    );
  });

  describe("DB-backed idempotent middleware", () => {
    it("rejects request if not authenticated", async () => {
      const req = {
        headers: { "idempotency-key": "test-key" },
        auth: undefined,
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      idempotent(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 401,
        })
      );
    });

    it("replays cached response when key exists with response", async () => {
      vi.spyOn(prisma.idempotencyKey, "deleteMany").mockResolvedValue({ count: 0 });
      vi.spyOn(prisma.idempotencyKey, "findUnique").mockResolvedValue({
        id: "key-1",
        key: "test-key",
        organizationId: "org-1",
        method: "POST",
        path: "/api/payments",
        statusCode: 201,
        responseBody: { success: true, paymentId: "p-123" },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10000),
      });

      const jsonMock = vi.fn();
      const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
      const req = {
        headers: { "idempotency-key": "test-key" },
        auth: { organizationId: "org-1", userId: "u-1" },
      } as unknown as Request;
      const res = {
        status: statusMock,
      } as unknown as Response;
      const next = vi.fn();

      idempotent(req, res, next);

      // Give async tick for promise resolution
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, paymentId: "p-123" });
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 409 conflict when request is currently in-flight", async () => {
      vi.spyOn(prisma.idempotencyKey, "deleteMany").mockResolvedValue({ count: 0 });
      vi.spyOn(prisma.idempotencyKey, "findUnique").mockResolvedValue({
        id: "key-2",
        key: "in-flight-key",
        organizationId: "org-1",
        method: "POST",
        path: "/api/payments",
        statusCode: null,
        responseBody: null,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10000),
      });

      const req = {
        headers: { "idempotency-key": "in-flight-key" },
        auth: { organizationId: "org-1", userId: "u-1" },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      idempotent(req, res, next);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 409,
        })
      );
    });
  });
});

