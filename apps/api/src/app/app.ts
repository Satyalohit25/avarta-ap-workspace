import cors from "cors";
import express from "express";
import { env } from "../config/env";
import { errorHandler } from "../middleware/error-handler";
import { requestId } from "../middleware/request-id";
import { router } from "./routes";

import { prisma } from "../config/database";

export function createApp() {
  const app = express();

  // Dynamic CORS: support localhost, custom WEB_ORIGIN, and any *.vercel.app deployment
  const customOrigins = (env.webOrigin || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          customOrigins.includes("*") ||
          customOrigins.includes(origin) ||
          origin.endsWith(".vercel.app") ||
          origin.includes("localhost") ||
          origin.includes("127.0.0.1")
        ) {
          return callback(null, true);
        }
        return callback(null, true); // Permissive for client showcase / demo API
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(requestId);

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

  app.use("/api/v1", router);

  app.use(errorHandler);

  return app;
}
