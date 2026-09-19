import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { agingHandler, cashForecastHandler } from "./controller";

export const reportRoutes = Router();
reportRoutes.use(requireAuth);

reportRoutes.get("/aging", agingHandler);
reportRoutes.get("/cash-forecast", cashForecastHandler);
