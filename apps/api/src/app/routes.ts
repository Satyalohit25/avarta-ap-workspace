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
import { auditRoutes } from "../modules/audit/routes";
import { reportRoutes } from "../modules/reports/routes";
import { demoRoutes } from "../modules/demo/routes";
import { integrationRoutes } from "../modules/integrations/routes";
import { billingRoutes } from "../modules/billing/routes";
import { itemRoutes } from "../modules/items/routes";
import { bankAccountRoutes } from "../modules/bank_accounts/routes";
import { organizationRoutes } from "../modules/organization/routes";
import { notificationRoutes } from "../modules/notifications/routes";
import { apiKeyRoutes } from "../modules/api_keys/routes";
import { dataExportRoutes } from "../modules/data_export/routes";

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
router.use("/audit", auditRoutes);
router.use("/reports", reportRoutes);
router.use("/demo", demoRoutes);
router.use("/integrations", integrationRoutes);
router.use("/settings/integrations", integrationRoutes);
router.use("/billing", billingRoutes);
router.use("/settings/billing", billingRoutes);
router.use("/items", itemRoutes);
router.use("/bank-accounts", bankAccountRoutes);
router.use("/organization", organizationRoutes);
router.use("/notifications", notificationRoutes);
router.use("/api-keys", apiKeyRoutes);
router.use("/data-export", dataExportRoutes);



