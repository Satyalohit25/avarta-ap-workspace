import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { overviewHandler } from "./controller";

export const dashboardRoutes = Router();
dashboardRoutes.use(requireAuth);
dashboardRoutes.get("/", overviewHandler);
