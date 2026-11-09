import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { ApiError } from "../../lib/errors";
import { exportDataset, ExportDataset } from "./service";

const datasetSchema = z.enum(["invoices", "suppliers", "payments"]);

export async function exportDatasetHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    const parsed = datasetSchema.safeParse(req.params.dataset);
    if (!parsed.success) {
      throw ApiError.badRequest(
        "Unsupported export dataset. Use invoices, suppliers, or payments."
      );
    }

    const result = await exportDataset(
      req.auth.organizationId,
      req.auth.userId,
      parsed.data as ExportDataset
    );

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    res.setHeader("X-Export-Row-Count", String(result.rowCount));
    res.setHeader("X-Export-Truncated", String(result.truncated));
    res.send(result.csv);
  } catch (err) {
    next(err);
  }
}
