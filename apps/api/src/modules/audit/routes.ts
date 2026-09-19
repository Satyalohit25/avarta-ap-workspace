import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { listHandler } from "./controller";

export const auditRoutes = Router();
auditRoutes.use(requireAuth);

auditRoutes.get("/", listHandler);
