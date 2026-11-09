import { Router } from "express";
import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/permissions";
import { ApiError } from "../../lib/errors";
import { createApiKey, listApiKeys, revokeApiKey } from "./service";

export const apiKeyRoutes = Router();

apiKeyRoutes.use(requireAuth, requireRole("ADMINISTRATOR"));

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  scopes: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
});

apiKeyRoutes.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    const keys = await listApiKeys(req.auth.organizationId);
    res.json({ data: keys });
  } catch (err) {
    next(err);
  }
});

apiKeyRoutes.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    const input = createSchema.parse(req.body);
    const created = await createApiKey(req.auth.organizationId, req.auth.userId, input);
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

apiKeyRoutes.post(
  "/:apiKeyId/revoke",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.auth) throw ApiError.unauthorized();
      const revoked = await revokeApiKey(
        req.auth.organizationId,
        req.auth.userId,
        req.params.apiKeyId
      );
      res.json({ data: revoked });
    } catch (err) {
      next(err);
    }
  }
);
