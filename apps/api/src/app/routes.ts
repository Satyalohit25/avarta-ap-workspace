import { Router } from "express";
import { authRoutes } from "../modules/auth/routes";
import { invoiceRoutes } from "../modules/invoices/routes";
import { supplierRoutes } from "../modules/suppliers/routes";
import { exceptionRoutes } from "../modules/exceptions/routes";
import { approvalRoutes } from "../modules/approvals/routes";
import { paymentRoutes } from "../modules/payments/routes";
import { dashboardRoutes } from "../modules/dashboard/routes";
import { purchaseOrderRoutes } from "../modules/purchase_orders/routes";
import { publicRoutes } from "../modules/public/routes";

export const router = Router();

router.use("/public", publicRoutes);
router.use("/auth", authRoutes);
router.use("/invoices", invoiceRoutes);
router.use("/suppliers", supplierRoutes);
router.use("/exceptions", exceptionRoutes);
router.use("/approvals", approvalRoutes);
router.use("/payments", paymentRoutes);
router.use("/purchase-orders", purchaseOrderRoutes);
router.use("/dashboard", dashboardRoutes);

