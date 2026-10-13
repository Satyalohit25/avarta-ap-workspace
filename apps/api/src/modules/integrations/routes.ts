import { Router, Request, Response, NextFunction } from "express";
import { requireAuth } from "../../middleware/auth";
import { IntegrationsService } from "./service";
import { ApiError } from "../../lib/errors";

export const integrationRoutes = Router();

integrationRoutes.use(requireAuth);

/**
 * GET /api/integrations/status
 * Returns current configuration status for BYOK, BYODB, and ERP
 */
integrationRoutes.get("/status", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.auth.organizationId;
    const summary = await IntegrationsService.getSummary(organizationId);
    return res.json({ data: summary });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/integrations/byok/test
 * Tests an AI key (Gemini, OpenAI, Textract) and optionally encrypts & saves it.
 */
integrationRoutes.post("/byok/test", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.auth.organizationId;
    const { provider, apiKey, save } = req.body;

    if (!provider || !apiKey) {
      throw ApiError.badRequest("Both 'provider' and 'apiKey' are required.");
    }

    const result = await IntegrationsService.testAndSaveByok(
      organizationId,
      provider.toUpperCase(),
      apiKey,
      save !== false
    );

    return res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/integrations/byodb/test
 * Tests a PostgreSQL connection string (latency, db name, table count) and optionally saves it.
 */
integrationRoutes.post("/byodb/test", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.auth.organizationId;
    const { connectionUrl, save } = req.body;

    if (!connectionUrl) {
      throw ApiError.badRequest("Field 'connectionUrl' is required.");
    }

    const result = await IntegrationsService.testAndSaveByodb(
      organizationId,
      connectionUrl,
      save !== false
    );

    return res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/integrations/erp/test
 * Tests an ERP adapter connection (Tally, QuickBooks, Xero, CSV) and optionally saves it.
 */
integrationRoutes.post("/erp/test", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.auth.organizationId;
    const { provider, config, save } = req.body;

    if (!provider) {
      throw ApiError.badRequest("Field 'provider' is required (tally, quickbooks, xero, csv).");
    }

    const result = await IntegrationsService.testAndSaveErp(
      organizationId,
      provider.toLowerCase(),
      config || {},
      save !== false
    );

    return res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/integrations/erp/sync-now
 * Dispatches all eligible invoices to the configured ERP
 */
integrationRoutes.post("/erp/sync-now", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.auth.organizationId;
    const userId = req.auth.userId;

    const result = await IntegrationsService.syncInvoicesToErp(organizationId, userId);
    return res.json({
      data: result,
      message: `Successfully queued ${result.syncedCount} invoices for ERP export.`,
    });
  } catch (err) {
    next(err);
  }
});
