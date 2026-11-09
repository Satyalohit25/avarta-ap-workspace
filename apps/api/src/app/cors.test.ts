import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { createApp } from "./app";
import { buildAllowedOrigins, isOriginAllowed } from "../security/cors";

describe("CORS Exact Origin Matcher & Negative Rejection Suite", () => {
  describe("Unit: Origin Matcher Logic", () => {
    it("allows explicitly configured exact origins", () => {
      const allowed = buildAllowedOrigins(
        "https://app.avarta.dev,https://workspace.example.com",
        "production"
      );
      expect(isOriginAllowed("https://app.avarta.dev", allowed, "production")).toBe(true);
      expect(isOriginAllowed("https://workspace.example.com", allowed, "production")).toBe(true);
    });

    it("rejects unauthorized .vercel.app subdomains", () => {
      const allowed = buildAllowedOrigins("https://app.avarta.dev", "production");
      expect(isOriginAllowed("https://evil.vercel.app", allowed, "production")).toBe(false);
      expect(isOriginAllowed("https://preview.vercel.app", allowed, "production")).toBe(false);
    });

    it("rejects localhost substring spoofing", () => {
      const allowed = buildAllowedOrigins("http://localhost:5173", "development");
      expect(isOriginAllowed("http://localhost.evil.com", allowed, "development")).toBe(false);
      expect(isOriginAllowed("https://attacker-localhost.org", allowed, "development")).toBe(false);
      expect(isOriginAllowed("http://127.0.0.1.evil.com", allowed, "development")).toBe(false);
    });

    it("strictly rejects opaque 'null' origin", () => {
      const allowed = buildAllowedOrigins("http://localhost:5173", "development");
      expect(isOriginAllowed("null", allowed, "development")).toBe(false);
    });

    it("strips wildcard '*' in production mode", () => {
      const allowed = buildAllowedOrigins("*", "production");
      expect(allowed.has("*")).toBe(false);
      expect(isOriginAllowed("https://evil.com", allowed, "production")).toBe(false);
    });
  });

  describe("Integration: Live HTTP Preflight & Header Probes", () => {
    let server: http.Server;
    let baseUrl: string;

    beforeAll(async () => {
      const app = createApp();
      await new Promise<void>((resolve) => {
        server = app.listen(0, () => {
          const addr = server.address() as any;
          baseUrl = `http://127.0.0.1:${addr.port}`;
          resolve();
        });
      });
    });

    afterAll(async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    it("permits allowed dev origin http://localhost:5173 with credentials header", async () => {
      const res = await fetch(`${baseUrl}/health`, {
        headers: { Origin: "http://localhost:5173" },
      });
      expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
      expect(res.headers.get("access-control-allow-credentials")).toBe("true");
    });

    it("NEGATIVE TEST: rejects https://evil.vercel.app (no allow-origin header)", async () => {
      const res = await fetch(`${baseUrl}/health`, {
        headers: { Origin: "https://evil.vercel.app" },
      });
      expect(res.headers.get("access-control-allow-origin")).toBeNull();
    });

    it("NEGATIVE TEST: rejects http://localhost.evil.com (no allow-origin header)", async () => {
      const res = await fetch(`${baseUrl}/health`, {
        headers: { Origin: "http://localhost.evil.com" },
      });
      expect(res.headers.get("access-control-allow-origin")).toBeNull();
    });

    it("NEGATIVE TEST: rejects Origin 'null' (no allow-origin header)", async () => {
      const res = await fetch(`${baseUrl}/health`, {
        headers: { Origin: "null" },
      });
      expect(res.headers.get("access-control-allow-origin")).toBeNull();
    });

    it("NEGATIVE TEST: rejects preflight OPTIONS for https://evil.vercel.app", async () => {
      const res = await fetch(`${baseUrl}/api/v1/invoices`, {
        method: "OPTIONS",
        headers: {
          Origin: "https://evil.vercel.app",
          "Access-Control-Request-Method": "POST",
        },
      });
      expect(res.headers.get("access-control-allow-origin")).toBeNull();
    });
  });
});
