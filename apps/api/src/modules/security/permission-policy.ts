/**
 * Avarta AP Workspace — Canonical Role-by-Route Permission Policy
 * Traces to AGENTS.md §Canonical vocabulary:
 *   Roles (5): Administrator, Finance Manager, Finance Executive, Approver, Read Only.
 *
 * Invariants:
 *   1. READ_ONLY can NEVER call a mutating endpoint (POST, PUT, PATCH, DELETE).
 *   2. Every registered API route must have an entry in ROUTE_PERMISSION_POLICY.
 *   3. Frontend role checks (canApprove, isAdmin, payment role gate) derive from this same policy source.
 */

export const CANONICAL_ROLES = [
  "ADMINISTRATOR",
  "FINANCE_MANAGER",
  "FINANCE_EXECUTIVE",
  "APPROVER",
  "READ_ONLY",
] as const;

export type Role = (typeof CANONICAL_ROLES)[number];

export interface RoutePolicyEntry {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string; // e.g. "/api/v1/invoices" or with Express parameter "/api/v1/invoices/:invoiceId"
  allowedRoles: readonly Role[];
  isPublic?: boolean;
  description?: string;
}

export const MUTATING_METHODS = ["POST", "PUT", "PATCH", "DELETE"] as const;

export function isMutatingMethod(method: string): boolean {
  return MUTATING_METHODS.includes(method.toUpperCase() as (typeof MUTATING_METHODS)[number]);
}

/**
 * Universal Route Permission Policy Matrix for all API routes.
 * Every Express route must have an exact entry here.
 */
export const ROUTE_PERMISSION_POLICY: RoutePolicyEntry[] = [
  // =========================================================================
  // 1. PUBLIC ROUTES (No JWT / Session required)
  // =========================================================================
  {
    method: "GET",
    path: "/api/v1/public/invoices/track/:token",
    allowedRoles: CANONICAL_ROLES,
    isPublic: true,
    description: "Public vendor invoice tracking",
  },
  {
    method: "POST",
    path: "/api/v1/public/invoices/email-webhook",
    allowedRoles: CANONICAL_ROLES,
    isPublic: true,
    description: "Public inbound invoice email webhook",
  },
  {
    method: "GET",
    path: "/api/v1/auth/config",
    allowedRoles: CANONICAL_ROLES,
    isPublic: true,
    description: "Auth public configuration",
  },
  {
    method: "POST",
    path: "/api/v1/auth/signup",
    allowedRoles: CANONICAL_ROLES,
    isPublic: true,
    description: "Public tenant signup",
  },
  {
    method: "POST",
    path: "/api/v1/auth/register",
    allowedRoles: CANONICAL_ROLES,
    isPublic: true,
    description: "Public tenant registration alias",
  },
  {
    method: "POST",
    path: "/api/v1/auth/login",
    allowedRoles: CANONICAL_ROLES,
    isPublic: true,
    description: "User authentication login",
  },
  {
    method: "POST",
    path: "/api/v1/auth/refresh",
    allowedRoles: CANONICAL_ROLES,
    isPublic: true,
    description: "Refresh access token",
  },
  {
    method: "POST",
    path: "/api/v1/auth/invite/accept",
    allowedRoles: CANONICAL_ROLES,
    isPublic: true,
    description: "Accept team invitation",
  },
  {
    method: "POST",
    path: "/api/v1/auth/forgot-password",
    allowedRoles: CANONICAL_ROLES,
    isPublic: true,
    description: "Request password reset",
  },
  {
    method: "POST",
    path: "/api/v1/auth/reset-password",
    allowedRoles: CANONICAL_ROLES,
    isPublic: true,
    description: "Complete password reset",
  },
  {
    method: "POST",
    path: "/api/v1/auth/mfa/challenge",
    allowedRoles: CANONICAL_ROLES,
    isPublic: true,
    description: "MFA challenge verification",
  },
  {
    method: "POST",
    path: "/api/v1/billing/webhook",
    allowedRoles: CANONICAL_ROLES,
    isPublic: true,
    description: "Billing provider webhook",
  },
  {
    method: "GET",
    path: "/api/v1/billing/plans",
    allowedRoles: CANONICAL_ROLES,
    isPublic: true,
    description: "Public billing plans catalog",
  },

  // =========================================================================
  // 2. AUTH & SESSION ROUTES
  // =========================================================================
  {
    method: "POST",
    path: "/api/v1/auth/logout",
    allowedRoles: CANONICAL_ROLES,
    description: "Session termination / logout",
  },
  {
    method: "GET",
    path: "/api/v1/auth/me",
    allowedRoles: CANONICAL_ROLES,
    description: "Get authenticated user profile",
  },
  {
    method: "PATCH",
    path: "/api/v1/auth/me",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE", "APPROVER"],
    description: "Update user profile",
  },
  {
    method: "GET",
    path: "/api/v1/auth/team",
    allowedRoles: CANONICAL_ROLES,
    description: "List organization team members",
  },
  {
    method: "POST",
    path: "/api/v1/auth/team/invite",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER"],
    description: "Invite new team member",
  },
  {
    method: "POST",
    path: "/api/v1/auth/team/:userId/deactivate",
    allowedRoles: ["ADMINISTRATOR"],
    description: "Deactivate team member",
  },
  {
    method: "POST",
    path: "/api/v1/auth/mfa/enroll",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE", "APPROVER"],
    description: "Enroll MFA secret",
  },
  {
    method: "POST",
    path: "/api/v1/auth/mfa/enable",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE", "APPROVER"],
    description: "Confirm and enable MFA",
  },
  {
    method: "POST",
    path: "/api/v1/auth/mfa/disable",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE", "APPROVER"],
    description: "Disable MFA",
  },
  {
    method: "POST",
    path: "/api/v1/auth/mfa/recovery-codes",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE", "APPROVER"],
    description: "Regenerate MFA recovery codes",
  },

  // =========================================================================
  // 3. DASHBOARD & OVERVIEW
  // =========================================================================
  {
    method: "GET",
    path: "/api/v1/dashboard",
    allowedRoles: CANONICAL_ROLES,
    description: "AP dashboard overview metrics",
  },

  // =========================================================================
  // 4. INVOICES
  // =========================================================================
  {
    method: "POST",
    path: "/api/v1/invoices/extract",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"],
    description: "OCR document extraction",
  },
  {
    method: "GET",
    path: "/api/v1/invoices/needs-attention",
    allowedRoles: CANONICAL_ROLES,
    description: "Queue of invoices needing attention",
  },
  {
    method: "GET",
    path: "/api/v1/invoices",
    allowedRoles: CANONICAL_ROLES,
    description: "List invoices with filters",
  },
  {
    method: "POST",
    path: "/api/v1/invoices",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"],
    description: "Create or upload new invoice",
  },
  {
    method: "GET",
    path: "/api/v1/invoices/:invoiceId",
    allowedRoles: CANONICAL_ROLES,
    description: "Get single invoice details",
  },
  {
    method: "PUT",
    path: "/api/v1/invoices/:invoiceId",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"],
    description: "Update invoice fields",
  },
  {
    method: "GET",
    path: "/api/v1/invoices/:invoiceId/audit",
    allowedRoles: CANONICAL_ROLES,
    description: "Invoice audit trail",
  },
  {
    method: "POST",
    path: "/api/v1/invoices/:invoiceId/documents",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"],
    description: "Attach supporting document",
  },
  {
    method: "GET",
    path: "/api/v1/invoices/:invoiceId/documents/:documentId/file",
    allowedRoles: CANONICAL_ROLES,
    description: "Download invoice document file",
  },
  {
    method: "POST",
    path: "/api/v1/invoices/:invoiceId/process",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"],
    description: "Trigger invoice workflow validation & matching",
  },
  {
    method: "POST",
    path: "/api/v1/invoices/:invoiceId/transitions",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "APPROVER", "FINANCE_EXECUTIVE"],
    description: "Execute manual workflow transition",
  },
  {
    method: "POST",
    path: "/api/v1/invoices/:invoiceId/erp-sync",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"],
    description: "Sync paid invoice to external ERP",
  },
  {
    method: "GET",
    path: "/api/v1/invoices/:invoiceId/tracking",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"],
    description: "Retrieve internal tracking link token",
  },
  {
    method: "POST",
    path: "/api/v1/invoices/:invoiceId/tracking/regenerate",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER"],
    description: "Regenerate invoice tracking token",
  },
  {
    method: "PATCH",
    path: "/api/v1/invoices/:invoiceId/lines/:lineId/override",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER"],
    description: "Override invoice line variance",
  },
  {
    method: "PATCH",
    path: "/api/v1/invoices/:invoiceId/lines/:lineId/match-status",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"],
    description: "Update invoice line match status",
  },
  {
    method: "PATCH",
    path: "/api/v1/invoices/:invoiceId/decision-hub",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "APPROVER", "FINANCE_EXECUTIVE"],
    description: "Persist decision hub checklist confirmations",
  },
  {
    method: "POST",
    path: "/api/v1/invoices/gstr2b/reconcile",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"],
    description: "Reconcile GSTR-2B data against invoices",
  },
  {
    method: "GET",
    path: "/api/v1/invoices/compliance/msme-43bh",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER"],
    description: "MSME 43B(h) compliance report",
  },
  {
    method: "GET",
    path: "/api/v1/invoices/compliance/tds-summary",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER"],
    description: "TDS summary statutory report",
  },
  {
    method: "POST",
    path: "/api/v1/invoices/:invoiceId/calculate-tds",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE", "APPROVER"],
    description: "Calculate invoice TDS deduction",
  },
  {
    method: "POST",
    path: "/api/v1/invoices/bulk-approve",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "APPROVER"],
    description: "Bulk approve eligible invoices",
  },
  {
    method: "POST",
    path: "/api/v1/invoices/:invoiceId/archive",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER"],
    description: "Archive invoice permanently",
  },
  {
    method: "POST",
    path: "/api/v1/invoices/:invoiceId/lines/:lineId/override",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER"],
    description: "Override invoice line variance via POST alias",
  },
  {
    method: "POST",
    path: "/api/v1/invoices/:invoiceId/validate-irn",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"],
    description: "Validate e-Invoice IRN & Signed QR code",
  },

  // =========================================================================
  // 5. SUPPLIERS
  // =========================================================================
  {
    method: "GET",
    path: "/api/v1/suppliers",
    allowedRoles: CANONICAL_ROLES,
    description: "List suppliers",
  },
  {
    method: "POST",
    path: "/api/v1/suppliers",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"],
    description: "Create new supplier",
  },
  {
    method: "GET",
    path: "/api/v1/suppliers/:supplierId",
    allowedRoles: CANONICAL_ROLES,
    description: "Get supplier profile",
  },

  // =========================================================================
  // 6. EXCEPTIONS
  // =========================================================================
  {
    method: "GET",
    path: "/api/v1/exceptions",
    allowedRoles: CANONICAL_ROLES,
    description: "List exceptions",
  },
  {
    method: "POST",
    path: "/api/v1/exceptions/:exceptionId/assign",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"],
    description: "Assign exception owner",
  },
  {
    method: "POST",
    path: "/api/v1/exceptions/:exceptionId/resolve",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"],
    description: "Resolve exception",
  },

  // =========================================================================
  // 7. APPROVALS
  // =========================================================================
  {
    method: "GET",
    path: "/api/v1/approvals",
    allowedRoles: CANONICAL_ROLES,
    description: "List pending approvals",
  },
  {
    method: "POST",
    path: "/api/v1/approvals/:approvalId/approve",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "APPROVER"],
    description: "Approve invoice voucher",
  },
  {
    method: "POST",
    path: "/api/v1/approvals/:approvalId/reject",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "APPROVER"],
    description: "Reject invoice voucher",
  },
  {
    method: "POST",
    path: "/api/v1/approvals/bulk-approve",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "APPROVER"],
    description: "Bulk approve pending approvals",
  },

  // =========================================================================
  // 8. PAYMENTS
  // =========================================================================
  {
    method: "GET",
    path: "/api/v1/payments",
    allowedRoles: CANONICAL_ROLES,
    description: "List payments",
  },
  {
    method: "GET",
    path: "/api/v1/payments/export-file",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER"],
    description: "Export bank disbursement NACHA/CSV file",
  },
  {
    method: "POST",
    path: "/api/v1/payments",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER"],
    description: "Schedule payment run",
  },
  {
    method: "POST",
    path: "/api/v1/payments/batch/run",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER"],
    description: "Execute batch disbursement run",
  },
  {
    method: "POST",
    path: "/api/v1/payments/:paymentId/execute",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER"],
    description: "Execute individual payment",
  },
  {
    method: "POST",
    path: "/api/v1/payments/:paymentId/retry",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER"],
    description: "Retry failed payment",
  },

  // =========================================================================
  // 9. PURCHASE ORDERS
  // =========================================================================
  {
    method: "GET",
    path: "/api/v1/purchase-orders",
    allowedRoles: CANONICAL_ROLES,
    description: "List purchase orders",
  },
  {
    method: "GET",
    path: "/api/v1/purchase-orders/:poId",
    allowedRoles: CANONICAL_ROLES,
    description: "Get purchase order details",
  },
  {
    method: "POST",
    path: "/api/v1/purchase-orders",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"],
    description: "Create purchase order",
  },
  {
    method: "POST",
    path: "/api/v1/purchase-orders/:poId/receiving",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"],
    description: "Toggle PO receiving status",
  },
  {
    method: "POST",
    path: "/api/v1/purchase-orders/:poId/grn",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"],
    description: "Record Goods Receipt Note against PO",
  },

  // =========================================================================
  // 10. AUDIT & REPORTS
  // =========================================================================
  {
    method: "GET",
    path: "/api/v1/audit",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER"],
    description: "Organization audit log trail",
  },
  {
    method: "GET",
    path: "/api/v1/reports/aging",
    allowedRoles: CANONICAL_ROLES,
    description: "AP aging report",
  },
  {
    method: "GET",
    path: "/api/v1/reports/cash-forecast",
    allowedRoles: CANONICAL_ROLES,
    description: "30-day cash outflow forecast report",
  },
  {
    method: "GET",
    path: "/api/v1/reports/operational",
    allowedRoles: CANONICAL_ROLES,
    description: "AP operational throughput report",
  },

  // =========================================================================
  // 11. DEMO CONTROLS (Non-production)
  // =========================================================================
  {
    method: "POST",
    path: "/api/v1/demo/reset",
    allowedRoles: ["ADMINISTRATOR"],
    description: "Reset demo workspace data",
  },

  // =========================================================================
  // 12. INTEGRATIONS & SETTINGS/INTEGRATIONS
  // =========================================================================
  {
    method: "GET",
    path: "/api/v1/integrations/status",
    allowedRoles: ["ADMINISTRATOR"],
    description: "Integrations configuration status",
  },
  {
    method: "POST",
    path: "/api/v1/integrations/byok/test",
    allowedRoles: ["ADMINISTRATOR"],
    description: "Test & configure BYOK AI credentials",
  },
  {
    method: "POST",
    path: "/api/v1/integrations/byodb/test",
    allowedRoles: ["ADMINISTRATOR"],
    description: "Test & configure BYODB database credentials",
  },
  {
    method: "POST",
    path: "/api/v1/integrations/erp/test",
    allowedRoles: ["ADMINISTRATOR"],
    description: "Test ERP connection",
  },
  {
    method: "POST",
    path: "/api/v1/integrations/erp/sync-now",
    allowedRoles: ["ADMINISTRATOR"],
    description: "Trigger immediate ERP batch synchronization",
  },
  {
    method: "POST",
    path: "/api/v1/integrations/payment-gateway/test",
    allowedRoles: ["ADMINISTRATOR"],
    description: "Test payment gateway connection",
  },
  {
    method: "POST",
    path: "/api/v1/integrations/email/test",
    allowedRoles: ["ADMINISTRATOR"],
    description: "Test inbound email parser configuration",
  },
  {
    method: "POST",
    path: "/api/v1/integrations/:type/disconnect",
    allowedRoles: ["ADMINISTRATOR"],
    description: "Disconnect external integration",
  },

  // Alias mount: /api/v1/settings/integrations
  {
    method: "GET",
    path: "/api/v1/settings/integrations/status",
    allowedRoles: ["ADMINISTRATOR"],
    description: "Integrations status (alias)",
  },
  {
    method: "POST",
    path: "/api/v1/settings/integrations/byok/test",
    allowedRoles: ["ADMINISTRATOR"],
    description: "Test BYOK (alias)",
  },
  {
    method: "POST",
    path: "/api/v1/settings/integrations/byodb/test",
    allowedRoles: ["ADMINISTRATOR"],
    description: "Test BYODB (alias)",
  },
  {
    method: "POST",
    path: "/api/v1/settings/integrations/erp/test",
    allowedRoles: ["ADMINISTRATOR"],
    description: "Test ERP (alias)",
  },
  {
    method: "POST",
    path: "/api/v1/settings/integrations/erp/sync-now",
    allowedRoles: ["ADMINISTRATOR"],
    description: "Sync ERP now (alias)",
  },
  {
    method: "POST",
    path: "/api/v1/settings/integrations/payment-gateway/test",
    allowedRoles: ["ADMINISTRATOR"],
    description: "Test payment gateway (alias)",
  },
  {
    method: "POST",
    path: "/api/v1/settings/integrations/email/test",
    allowedRoles: ["ADMINISTRATOR"],
    description: "Test email (alias)",
  },
  {
    method: "POST",
    path: "/api/v1/settings/integrations/:type/disconnect",
    allowedRoles: ["ADMINISTRATOR"],
    description: "Disconnect integration (alias)",
  },

  // =========================================================================
  // 13. BILLING & SETTINGS/BILLING
  // =========================================================================
  {
    method: "GET",
    path: "/api/v1/billing/usage",
    allowedRoles: CANONICAL_ROLES,
    description: "Tenant billing usage metrics",
  },
  {
    method: "GET",
    path: "/api/v1/billing/receipts",
    allowedRoles: CANONICAL_ROLES,
    description: "Tenant payment receipts history",
  },
  {
    method: "POST",
    path: "/api/v1/billing/upgrade",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER"],
    description: "Upgrade subscription plan tier",
  },

  // Alias mount: /api/v1/settings/billing
  {
    method: "POST",
    path: "/api/v1/settings/billing/webhook",
    allowedRoles: CANONICAL_ROLES,
    isPublic: true,
    description: "Billing webhook (alias)",
  },
  {
    method: "GET",
    path: "/api/v1/settings/billing/plans",
    allowedRoles: CANONICAL_ROLES,
    isPublic: true,
    description: "Billing plans (alias)",
  },
  {
    method: "GET",
    path: "/api/v1/settings/billing/usage",
    allowedRoles: CANONICAL_ROLES,
    description: "Billing usage (alias)",
  },
  {
    method: "GET",
    path: "/api/v1/settings/billing/receipts",
    allowedRoles: CANONICAL_ROLES,
    description: "Billing receipts (alias)",
  },
  {
    method: "POST",
    path: "/api/v1/settings/billing/upgrade",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER"],
    description: "Billing upgrade (alias)",
  },

  // =========================================================================
  // 14. ITEM CATALOG
  // =========================================================================
  {
    method: "GET",
    path: "/api/v1/items",
    allowedRoles: CANONICAL_ROLES,
    description: "List catalog items",
  },
  {
    method: "POST",
    path: "/api/v1/items",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"],
    description: "Create catalog item",
  },
  {
    method: "POST",
    path: "/api/v1/items/:itemId/toggle-status",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"],
    description: "Toggle item active status",
  },

  // =========================================================================
  // 15. BANK ACCOUNTS
  // =========================================================================
  {
    method: "GET",
    path: "/api/v1/bank-accounts",
    allowedRoles: CANONICAL_ROLES,
    description: "List verified bank accounts",
  },
  {
    method: "POST",
    path: "/api/v1/bank-accounts",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE"],
    description: "Add bank account",
  },
  {
    method: "POST",
    path: "/api/v1/bank-accounts/:accountId/verify",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER"],
    description: "Verify bank account with penny-drop",
  },
  {
    method: "POST",
    path: "/api/v1/bank-accounts/:accountId/primary",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER"],
    description: "Set primary disbursement bank account",
  },

  // =========================================================================
  // 16. ORGANIZATION SETTINGS
  // =========================================================================
  {
    method: "GET",
    path: "/api/v1/organization/settings",
    allowedRoles: CANONICAL_ROLES,
    description: "Get organization settings",
  },
  {
    method: "PATCH",
    path: "/api/v1/organization/settings",
    allowedRoles: ["ADMINISTRATOR"],
    description: "Update organization settings",
  },

  // =========================================================================
  // 17. NOTIFICATIONS
  // =========================================================================
  {
    method: "GET",
    path: "/api/v1/notifications",
    allowedRoles: CANONICAL_ROLES,
    description: "List user notifications",
  },
  {
    method: "POST",
    path: "/api/v1/notifications/read-all",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE", "APPROVER"],
    description: "Mark all notifications read",
  },
  {
    method: "POST",
    path: "/api/v1/notifications/:notificationId/read",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER", "FINANCE_EXECUTIVE", "APPROVER"],
    description: "Mark individual notification read",
  },
  {
    method: "GET",
    path: "/api/v1/notifications/preferences",
    allowedRoles: CANONICAL_ROLES,
    description: "Get notification preferences",
  },
  {
    method: "PATCH",
    path: "/api/v1/notifications/preferences",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER"],
    description: "Update notification channel preferences",
  },
  {
    method: "POST",
    path: "/api/v1/notifications/test-email",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER"],
    description: "Send test notification email",
  },
  {
    method: "POST",
    path: "/api/v1/notifications/test-webhook",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER"],
    description: "Send test notification webhook",
  },

  // =========================================================================
  // 18. API KEYS
  // =========================================================================
  {
    method: "GET",
    path: "/api/v1/api-keys",
    allowedRoles: ["ADMINISTRATOR"],
    description: "List workspace API keys",
  },
  {
    method: "POST",
    path: "/api/v1/api-keys",
    allowedRoles: ["ADMINISTRATOR"],
    description: "Create workspace API key",
  },
  {
    method: "POST",
    path: "/api/v1/api-keys/:apiKeyId/revoke",
    allowedRoles: ["ADMINISTRATOR"],
    description: "Revoke workspace API key",
  },

  // =========================================================================
  // 19. DATA EXPORT (Sovereignty)
  // =========================================================================
  {
    method: "GET",
    path: "/api/v1/data-export/:dataset",
    allowedRoles: ["ADMINISTRATOR", "FINANCE_MANAGER"],
    description: "Download CSV dataset export",
  },
];

/**
 * Normalizes an Express route path for policy lookup.
 */
export function normalizePath(path: string): string {
  // Strip trailing slashes, ensure single leading slash
  const clean = path.replace(/\/+$/, "");
  return clean || "/";
}

/**
 * Finds policy entry for a given HTTP method and route pattern.
 */
export function findRoutePolicy(method: string, path: string): RoutePolicyEntry | undefined {
  const normMethod = method.toUpperCase();
  const normPath = normalizePath(path);
  return ROUTE_PERMISSION_POLICY.find(
    (p) => p.method === normMethod && normalizePath(p.path) === normPath
  );
}

/**
 * Checks whether a given role is allowed to access an endpoint.
 */
export function isRouteAllowed(role: Role, method: string, path: string): boolean {
  const policy = findRoutePolicy(method, path);
  if (!policy) return false;

  // READ_ONLY invariant: CAN NEVER call a mutating endpoint
  if (role === "READ_ONLY" && isMutatingMethod(method) && !policy.isPublic) {
    if (path !== "/api/v1/auth/logout") {
      return false;
    }
  }

  return policy.allowedRoles.includes(role);
}

// =========================================================================
// 20. FRONTEND ROLE CHECKS (Derived from policy authority)
// =========================================================================

export function canApprove(role?: string | null): boolean {
  return role === "ADMINISTRATOR" || role === "FINANCE_MANAGER" || role === "APPROVER";
}

export function isAdmin(role?: string | null): boolean {
  return role === "ADMINISTRATOR";
}

export function canExecutePayments(role?: string | null): boolean {
  return role === "ADMINISTRATOR" || role === "FINANCE_MANAGER";
}

export function canManageBilling(role?: string | null): boolean {
  return role === "ADMINISTRATOR" || role === "FINANCE_MANAGER";
}

export function canViewAudit(role?: string | null): boolean {
  return role === "ADMINISTRATOR" || role === "FINANCE_MANAGER";
}

export function canCreateInvoices(role?: string | null): boolean {
  return role === "ADMINISTRATOR" || role === "FINANCE_MANAGER" || role === "FINANCE_EXECUTIVE";
}

export function canResolveExceptions(role?: string | null): boolean {
  return role === "ADMINISTRATOR" || role === "FINANCE_MANAGER" || role === "FINANCE_EXECUTIVE";
}
