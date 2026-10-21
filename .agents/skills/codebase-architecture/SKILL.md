---
name: codebase-architecture
description: >-
  Systematic architectural design, deep module boundaries, refactoring patterns,
  cohesion, and CODEMAP navigation discipline for Avarta AP Workspace.
  Activate when refactoring, adding new features, resolving structural friction,
  or designing component and module boundaries across apps/api and apps/web.
---

# Codebase Architecture & Deep Module Design

Architectural craft standard for maintaining a clean, deep, and easily navigable modular monolith in Avarta AP Workspace.

---

## 1. Deep vs. Shallow Modules (Philosophy of Software Design)

* **Deep Modules (High Leverage)**:
  * Simple, focused interface that hides significant underlying complexity.
  * Examples: The Workflow Engine (`apps/api/src/workflow/`), `<StatusBadge />` (maps dozens of states to accessible colors and icons), `demo-seeder.ts` (seeds interconnected multi-tenant scenarios through one entrypoint).
* **Shallow Modules (Low Leverage / Avoid)**:
  * An interface almost as complex as the implementation it hides.
  * *Anti-Pattern*: Creating micro-wrappers like `<TableCard>` that merely wraps `<Card>` with a border, or writing a service method that just executes `return this.repo.findById(id)` with zero orchestration.
* **The Deletion Test**:
  * Before introducing a new abstraction, ask: *If this module were deleted, would complexity concentrate into fewer clear locations, or would it simply remove an unnecessary layer?*
  * If deleting it eliminates boilerplate without increasing complexity elsewhere, do not create the abstraction.

---

## 2. Layer Boundaries & Locality

In this modular monolith, maintain strict separation of concerns across the 4 primary architectural planes:

```
[ HTTP Layer: routes.ts + controller.ts + validation.ts ]
                       ↓
[ Business / Orchestration Layer: service.ts ]
                       ↓
[ State Machine: apps/api/src/workflow/ ]  ← (Sole state authority)
                       ↓
[ Persistence Layer: repository.ts + Prisma ]
```

1. **HTTP Controllers Contain No Business Logic**:
   * Parse `req.params`, `req.query`, and validated `req.body`.
   * Extract `req.user.organizationId` and pass plain arguments to `service.ts`.
   * Send HTTP responses with appropriate status codes (`200 OK`, `201 Created`, `400 Bad Request`, `404 Not Found`).
2. **Services Contain No HTTP Dependencies**:
   * Never import Express `Request` or `Response` in `service.ts`.
   * Services must remain testable using pure TypeScript unit tests with mocked repositories.
3. **Repositories Contain No Workflow Decisions**:
   * Repositories strictly run Prisma queries scoped by `organization_id`.
   * They never decide whether an invoice is valid, matched, or approved.
4. **Workflow Engine is the Sole State Authority**:
   * Application code must never write `workflow_instances.current_state` or `invoices.status` directly.
   * Dispatch transition events through the Workflow Engine.

---

## 3. Frontend Component Layering (`apps/web`)

1. **Canonical Primitives Over Ad-Hoc Wrappers**:
   * Always compose layouts using existing design-system components from `components/ui/` (`Button`, `Card`, `Dialog`, `Sheet`, `StatsCard`, `MetricStrip`, `FilterTokenBar`).
2. **Container & Scroll Safety**:
   * Avoid hardcoded viewport calculations (`h-[calc(100vh-140px)]`) that cause nested double-scrollbars.
   * Prefer natural vertical flow (`space-y-6`) or cleanly bounded flex containers (`flex-1 min-h-0 overflow-y-auto`).
3. **Single Source of Truth for Entity Mutations**:
   * Keep stateful actions and modals close to the entity's canonical view (e.g. `/invoices/:id` or `/suppliers/:id`).

---

## 4. CODEMAP Navigation & Synchronization

* **Read First**: Always read `CODEMAP.md` before exploring unfamiliar parts of the codebase.
* **Update Together**: When introducing a new route, controller, service, Prisma model, or page component, update `CODEMAP.md` within the same change to maintain an accurate structural index.
