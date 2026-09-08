# CODEMAP.md
<!-- Auto-maintained structural map. Agents: read this before exploring
     the codebase. Update the relevant section after structural changes. -->

## 1. Workspace Overview
- `apps/api` — Express + TypeScript + Prisma backend serving REST endpoints, workflow state engine, and PostgreSQL interactions.
- `apps/web` — React 18 + Vite + Tailwind CSS SPA with React Router v6 and Radix UI primitives.

## 2. apps/api — Route Groups
Mounted under `/api/v1` in `apps/api/src/app/routes.ts`:
- `/public`: `apps/api/src/modules/public/routes.ts` (`GET /invoices/track/:token` — public unauthenticated vendor tracking)

### /auth
- routes: `apps/api/src/modules/auth/routes.ts` (`POST /login`, `GET /me`)
- controller: `apps/api/src/modules/auth/controller.ts`
- service: `apps/api/src/modules/auth/service.ts`
- repository: Direct Prisma access (`prisma.user`)
- validation (zod): `apps/api/src/modules/auth/validation.ts` (`loginSchema`)
- prisma models touched: `User`, `Organization`

### /invoices
- routes: `apps/api/src/modules/invoices/routes.ts` (`GET /`, `GET /needs-attention`, `POST /`, `GET /:id`, `GET /:id/documents/:docId/file`, `POST /:id/process`, `POST /:id/transitions`, `POST /:id/erp-sync`)
- controller: `apps/api/src/modules/invoices/controller.ts`
- service: `apps/api/src/modules/invoices/service.ts`
- repository: `apps/api/src/modules/invoices/repository.ts`
- validation (zod): `apps/api/src/modules/invoices/validation.ts` (`createInvoiceSchema`, `transitionInvoiceSchema`, `erpSyncSchema`)
- mapper: `apps/api/src/modules/invoices/mapper.ts` (`toInvoiceListItem`, `toInvoiceDetail`)
- prisma models touched: `Invoice`, `InvoiceLine`, `Document`, `Validation`, `Exception`, `Supplier`, `WorkflowInstance`, `AuditLog`

### /suppliers
- routes: `apps/api/src/modules/suppliers/routes.ts` (`GET /`, `POST /`, `GET /:supplierId`)
- controller: `apps/api/src/modules/suppliers/controller.ts`
- service: `apps/api/src/modules/suppliers/service.ts`
- repository: `apps/api/src/modules/suppliers/repository.ts`
- validation (zod): `apps/api/src/modules/suppliers/validation.ts` (`createSupplierSchema`)
- prisma models touched: `Supplier`

### /exceptions
- routes: `apps/api/src/modules/exceptions/routes.ts` (`GET /`, `POST /:id/assign`, `POST /:id/resolve`)
- controller: `apps/api/src/modules/exceptions/controller.ts`
- service: `apps/api/src/modules/exceptions/service.ts`
- repository: Direct Prisma access (`prisma.exception`)
- prisma models touched: `Exception`, `Invoice`, `User`

### /approvals
- routes: `apps/api/src/modules/approvals/routes.ts` (`GET /`)
- controller: `apps/api/src/modules/approvals/controller.ts`
- service: `apps/api/src/modules/approvals/service.ts`
- repository: Direct Prisma access (`prisma.approval`, `prisma.invoice`)
- note: Approval transitions are processed via `/invoices/:id/transitions`
- prisma models touched: `Approval`, `Invoice`

### /payments
- routes: `apps/api/src/modules/payments/routes.ts` (`GET /`, `POST /`, `POST /:paymentId/execute`)
- controller: `apps/api/src/modules/payments/controller.ts`
- service: `apps/api/src/modules/payments/service.ts`
- repository: Direct Prisma access (`prisma.payment`)
- prisma models touched: `Payment`, `Invoice`

### /purchase-orders
- routes: `apps/api/src/modules/purchase_orders/routes.ts` (`GET /`, `GET /:poId`, `POST /`)
- controller: `apps/api/src/modules/purchase_orders/controller.ts`
- service: `apps/api/src/modules/purchase_orders/service.ts`
- repository: `apps/api/src/modules/purchase_orders/repository.ts`
- validation (zod): `apps/api/src/modules/purchase_orders/validation.ts` (`createPurchaseOrderSchema`)
- prisma models touched: `PurchaseOrder`, `Supplier`

### /dashboard
- routes: `apps/api/src/modules/dashboard/routes.ts` (`GET /`)
- controller: `apps/api/src/modules/dashboard/controller.ts` (`overviewHandler`)
- service / repository: Direct Prisma aggregations & counts
- prisma models touched: `Invoice`, `Exception`, `Payment`

## 3. Workflow Engine (apps/api/src/workflow/)
- states (14 canonical): `RECEIVED`, `CAPTURED`, `VALIDATING`, `VALIDATED`, `VALIDATION_FAILED`, `MATCHING`, `MATCHED`, `MATCHING_FAILED`, `WAITING_APPROVAL`, `SCHEDULED`, `PROCESSING_PAYMENT`, `PAID`, `ERP_SYNC`, `ARCHIVED`
- projections: Maps canonical states to UI `invoices.status` (`RECEIVED`, `PROCESSING`, `EXCEPTION`, `PENDING_APPROVAL`, `SCHEDULED`, `PAID`, `SYNCED`, `ARCHIVED`)
- files:
  - `states.ts`: State constants & projection map
  - `transitions.ts`: Transition rules matrix (`findTransition`, `availableEvents`)
  - `engine.ts`: `startWorkflow(invoiceId)`, `applyTransition({ invoiceId, event, triggeredBy, reason })`
- called by: `apps/api/src/modules/invoices/service.ts` exclusively

## 4. apps/web — Routes
All top-level routes are lazy-loaded in `apps/web/src/app/App.tsx` wrapped in `<Suspense>`:

### /login
- lazy component: `src/pages/login/LoginPage.tsx`
- key child components: `Button`, `Input`, `Card`
- API calls: `api/auth.ts:login`

### /overview
- lazy component: `src/pages/overview/OverviewPage.tsx`
- key child components: `StatsCard`, `NeedsAttentionHub`, `Card`, `table.tsx`, `SkeletonRows`
- radix/design-system deps: `tokens.ts`, `TableCard`
- API calls: `api/dashboard.ts:getDashboardOverview`, `api/invoices.ts:listInvoices`, `api/invoices.ts:getNeedsAttentionInvoices`

### /inbox
- lazy component: `src/pages/inbox/InboxPage.tsx`
- key child components: `BatchIngestPanel` (multi-file dropzone), `RecentInvoicesPanel` (live ingestion feed), `InvoiceFormDialog` (Radix Dialog overlay wrapping `InvoiceForm`), `InvoiceForm` (shared form component)
- layout: Two-column grid layout (`Batch Ingest` and `Recent Invoices` both visible by default; manual entry triggered via overlay)
- form call sites:
  1. `+ Quick manual entry` header button (`mode: 'create'`, blank form, writes new invoice)
  2. `Inspect & Process` feed item action (`mode: 'review'`, pre-filled with OCR/invoice data, processes/updates queued invoice)
- validation: `src/pages/inbox/validation.ts` (shared Zod schema `invoiceFormSchema` & `invoiceLineSchema`)
- API calls: `api/invoices.ts:createInvoice`, `getInvoice`, `processInvoice`, `listInvoices`, `api/suppliers.ts:listSuppliers`

### /invoices
- lazy component: `src/pages/invoices/InvoicesPage.tsx`
- key child components: `TableCard`, `Tabs`, `StatusBadge`, `SkeletonRows`, `EmptyState`
- radix/design-system deps: `tokens.ts`
- API calls: `api/invoices.ts:listInvoices`

### /invoices/:invoiceId
- lazy component: `src/pages/invoices/InvoiceDetailPage.tsx`
- key child components: `InvoiceStateBanner`, `InvoiceActionBar`, `DocumentSourceCard`, `AIExtractedDetailsCard`, `LineItemMatchingTable`, `Timeline`, `EntityLinkModal`, `ErpSyncModal`, `ProcessingOverlay`, `Dialog`
- radix/design-system deps: Radix `Dialog`, `tokens.ts`
- API calls: `api/invoices.ts:getInvoice`, `processInvoice`, `transitionInvoice`, `syncInvoiceToErp`, `uploadInvoiceDocument`

### /exceptions
- lazy component: `src/pages/exceptions/ExceptionsPage.tsx`
- key child components: `TableCard`, `Tabs`, `Button`, `Dialog`
- API calls: `api/exceptions.ts:listExceptions`, `assignException`, `resolveException`

### /approvals
- lazy component: `src/pages/approvals/ApprovalsPage.tsx`
- key child components: `TableCard`, `Button`, `Dialog`
- API calls: `api/approvals.ts:listApprovals`, `api/invoices.ts:transitionInvoice`

### /payments
- lazy component: `src/pages/payments/PaymentsPage.tsx`
- key child components: `TableCard`, `Button`, `Dialog`
- API calls: `api/payments.ts:listPayments`, `schedulePayment`, `executePayment`

### /suppliers
- lazy component: `src/pages/suppliers/SuppliersPage.tsx`
- key child components: `TableCard`, `Dialog`, `Button`, `Input`
- API calls: `api/suppliers.ts:listSuppliers`, `createSupplier`

### /purchase-orders
- lazy component: `src/pages/purchase-orders/PurchaseOrdersPage.tsx`
- key child components: `TableCard`, `Button`
- API calls: `api/purchaseOrders.ts:listPurchaseOrders`

### /reports, /archive, /settings, /notifications, /profile
- lazy components in `src/pages/[feature]/`
- shared layouts: `src/components/layout/AppLayout.tsx`, `Sidebar.tsx`, `TopNav.tsx`, `DemoRoleSwitcher.tsx`

## 5. Shared / Cross-Cutting
- auth flow: JWT saved in `localStorage` under `clearops_token`. Attached via `Authorization: Bearer` by `apps/web/src/api/client.ts`. Validated by `apps/api/src/middleware/auth.ts`, establishing `req.auth = { userId, organizationId, role }`.
- centralized constants: `apps/web/src/lib/constants.ts` defines single-source `DEMO_ACCOUNTS` and `DEMO_USERS` across auth and role switcher.
- deterministic catalogs: `apps/web/src/lib/mockCatalogs.ts` exports `VENDOR_CATALOGS` and `generateSupplierLineItems` ensuring line-item parity across Approvals drawer and LineItemMatchingTable.
- unified badges: `apps/web/src/components/StatusBadge.tsx` exports `<StatusBadge>`, `<UrgencyBadge>`, and `getVendorFacingStatus`.
- property inspector: `apps/web/src/components/ui/PropertyInspector.tsx` structured key-value compliance rail with 1-click GSTIN copying.
- command palette: `apps/web/src/components/ui/Command.tsx` global `Cmd + K` fuzzy search for invoices, suppliers, and demo persona switching (no destructive actions).
- activity stream: `apps/web/src/components/ui/Timeline.tsx` Subframe-style chronological audit trail with actor pills.
- reconciliation diff: `apps/web/src/pages/invoices/components/LineItemMatchingTable.tsx` side-by-side PO vs Invoice variance cards.
- tenant isolation: Strict multi-tenant isolation via `organization_id` on every query, derived from `req.auth.organizationId`.
- idempotency: `Idempotency-Key` generated on all mutating requests in `client.ts` and enforced by `middleware/idempotency.ts`.
- design system: Strict token adherence in `apps/web/src/design-system/tokens.ts` (4px grid, Inter font, HSL color tokens).

## 6. Dependency & Architectural Constraints
- AGENTS.md compliance: The workflow engine (`apps/api/src/workflow/`) is the sole entity allowed to advance `workflow_instances.current_state` and project `invoices.status`.
- Zero deletion policy: Soft deactivations/archival only.
- No direct cross-app imports: `apps/api` and `apps/web` run independent TypeScript builds.
