import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { agingHandler, cashForecastHandler, operationalReportHandler } from "./controller";

export const reportRoutes = Router();
reportRoutes.use(requireAuth);

reportRoutes.get("/aging", agingHandler);
reportRoutes.get("/cash-forecast", cashForecastHandler);
reportRoutes.get("/operational", operationalReportHandler);

