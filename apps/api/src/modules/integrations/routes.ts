import { Router, Request, Response, NextFunction } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/permissions";
import { IntegrationsService } from "./service";
import { ApiError } from "../../lib/errors";
import { PaymentGatewayProvider } from "../payments/adapter";

export const integrationRoutes = Router();

integrationRoutes.use(requireAuth);

/**
 * GET /api/integrations/status
 * Returns current configuration status for BYOK, BYODB, and ERP
 */
integrationRoutes.get("/status", requireRole("ADMINISTRATOR"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.auth!.organizationId;
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
integrationRoutes.post("/byok/test", requireRole("ADMINISTRATOR"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.auth!.organizationId;
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
integrationRoutes.post("/byodb/test", requireRole("ADMINISTRATOR"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.auth!.organizationId;
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
integrationRoutes.post("/erp/test", requireRole("ADMINISTRATOR"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.auth!.organizationId;
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
integrationRoutes.post("/erp/sync-now", requireRole("ADMINISTRATOR"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.auth!.organizationId;
    const userId = req.auth!.userId;

    const result = await IntegrationsService.syncInvoicesToErp(organizationId, userId);
    return res.json({
      data: result,
      message: `Successfully queued ${result.syncedCount} invoices for ERP export.`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/integrations/payment-gateway/test
 * Tests a Payment Gateway (RazorpayX, Cashfree, Stripe, Manual) and optionally saves it.
 */
integrationRoutes.post("/payment-gateway/test", requireRole("ADMINISTRATOR"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.auth!.organizationId;
    const { provider, config, save } = req.body;

    if (!provider) {
      throw ApiError.badRequest("Field 'provider' is required (RAZORPAYX, CASHFREE, STRIPE, MANUAL_BANK_TRANSFER).");
    }

    const result = await IntegrationsService.testAndSavePaymentGateway(
      organizationId,
      provider.toUpperCase() as PaymentGatewayProvider,
      config || { provider: provider.toUpperCase() as PaymentGatewayProvider },
      save !== false
    );

    return res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

