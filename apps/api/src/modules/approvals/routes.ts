import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { listHandler } from "./controller";

export const approvalRoutes = Router();
approvalRoutes.use(requireAuth);
approvalRoutes.get("/", listHandler);
// Approve/Reject are exposed through invoices/:id/transitions (Doc 14
// §14.11) since the Workflow Engine, not this module, owns the decision.
