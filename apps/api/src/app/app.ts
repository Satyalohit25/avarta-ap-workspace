import express from "express";
import { env } from "../config/env";
import { errorHandler, notFoundHandler } from "../middleware/error-handler";
import { requestId } from "../middleware/request-id";
import { apiRateLimiter } from "../middleware/rate-limiter";
import { router } from "./routes";
import { createCorsMiddleware } from "../security/cors";

import { prisma } from "../config/database";

export function createApp() {
  const app = express();

  // Do not advertise the framework/version to clients.
  app.disable("x-powered-by");

  // Only trust X-Forwarded-For when an operator explicitly confirms a proxy.
  if (process.env.TRUST_PROXY === "true") {
    app.set("trust proxy", 1);
  }

  // Strict CORS: exact origin matching, no wildcards in prod, credentialed protection
  app.use(createCorsMiddleware(env.webOrigin, process.env.NODE_ENV));

  // Standard OWASP Security Headers
  app.use((_req, res, next) => {
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    // The API only returns JSON and file bytes; nothing here should be able to
    // load remote resources, be framed, or submit forms.
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
    );
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    }
    next();
  });

  // JSON bodies are metadata only; file bytes use multipart with its own cap.
  app.use(express.json({ limit: "1mb" }));
  app.use(requestId);

  app.get("/", (_req, res) => {
    return res.json({
      workspace: "Avarta AP Workspace API",
      status: "operational",
      version: "1.0.0",
      healthCheck: "/health",
      apiBase: "/api/v1",
    });
  });

  app.get("/health", async (_req, res) => {
    try {
      await prisma.$queryRawUnsafe("SELECT 1");
      return res.json({
        status: "ok",
        database: "connected",
        workspace: "Avarta AP Workspace",
        uptimeSeconds: Math.floor(process.uptime()),
      });
    } catch {
      return res.status(503).json({
        status: "degraded",
        database: "disconnected",
        workspace: "Avarta AP Workspace",
        uptimeSeconds: Math.floor(process.uptime()),
      });
    }
  });

  app.use("/api", apiRateLimiter);
  app.use("/api/v1", router);
  app.use("/api", router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
