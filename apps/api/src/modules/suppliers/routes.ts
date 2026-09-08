import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { createHandler, getHandler, listHandler } from "./controller";

export const supplierRoutes = Router();
supplierRoutes.use(requireAuth);

supplierRoutes.get("/", listHandler);
supplierRoutes.post("/", createHandler);
supplierRoutes.get("/:supplierId", getHandler);
