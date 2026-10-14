import { NextFunction, Request, Response } from "express";
import { ApiError } from "../../lib/errors";
import * as reportService from "./service";

export async function agingHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    const result = await reportService.getApAgingReport(req.auth.organizationId);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function cashForecastHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    const result = await reportService.getCashForecastReport(req.auth.organizationId);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function operationalReportHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    const timeRange = typeof req.query.timeRange === "string" ? req.query.timeRange : "30d";
    const result = await reportService.getOperationalReport(req.auth.organizationId, timeRange);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

