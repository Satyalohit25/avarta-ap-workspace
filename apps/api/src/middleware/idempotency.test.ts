import { describe, expect, it, vi } from "vitest";
import { requireIdempotencyKey } from "./idempotency";
import { Request, Response } from "express";

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
});
