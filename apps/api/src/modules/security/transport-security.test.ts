import http from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../app/app";
import { signAccessToken } from "../../lib/jwt";

/**
 * Regression tests for transport-level hardening:
 * - credentials are only accepted from the Authorization header
 * - defensive headers are present and the framework is not advertised
 * - oversized/malformed JSON is a client error, not a server fault
 */
describe("Transport & Credential Hardening", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = http.createServer(createApp());
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as { port: number };
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("rejects access tokens supplied in the query string", async () => {
    const token = signAccessToken({
      userId: "transport-test-user",
      organizationId: "transport-test-org",
      role: "ADMINISTRATOR",
    });

    const res = await fetch(
      `${baseUrl}/api/v1/organization/settings?token=${encodeURIComponent(token)}`
    );

    expect(res.status).toBe(401);
  });

  it("sets defensive transport headers and hides the framework", async () => {
    const res = await fetch(`${baseUrl}/health`);

    expect(res.headers.get("x-powered-by")).toBeNull();
    expect(res.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(res.headers.get("cross-origin-opener-policy")).toBe("same-origin");
    expect(res.headers.get("cross-origin-resource-policy")).toBe("same-origin");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
  });

  it("rejects oversized JSON bodies with 413", async () => {
    const oversized = JSON.stringify({ padding: "a".repeat(1_200_000) });

    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: oversized,
    });

    expect(res.status).toBe(413);
    const payload = (await res.json()) as { error?: { code?: string } };
    expect(payload.error?.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("rejects malformed JSON with 400", async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ not-json",
    });

    expect(res.status).toBe(400);
    const payload = (await res.json()) as { error?: { code?: string } };
    expect(payload.error?.code).toBe("INVALID_JSON");
  });
});
