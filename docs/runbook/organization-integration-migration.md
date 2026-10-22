# Architectural Analysis & Migration Runbook: OrganizationIntegration

## Document Metadata
- **Status:** Scheduled as **Item 1 of Phase 2B**
- **Topic:** Runtime Dynamic DDL vs. Declarative Prisma Migration Deployment
- **Target Schema Model:** `OrganizationIntegration`

---

## 1. Current State & Problem Statement

In `apps/api/src/modules/integrations/repository.ts`, table creation was implemented using dynamic runtime SQL execution via `prisma.$executeRawUnsafe()`:

```typescript
private static async ensureTable() {
  if (this.tableEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "OrganizationIntegration" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "organizationId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "provider" TEXT NOT NULL,
        "encryptedConfig" TEXT NOT NULL,
        "settings" JSONB,
        "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
        "lastTestedAt" TIMESTAMP(3),
        "lastSyncAt" TIMESTAMP(3),
        "errorMessage" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationIntegration_org_type_provider_key" 
      ON "OrganizationIntegration" ("organizationId", "type", "provider");
    `);
    this.tableEnsured = true;
  } catch {
    this.tableEnsured = true;
  }
}
```

### Critical Issues Identified:
1. **Prepared Statement Protocol Limitation (Error `42601`):**
   PostgreSQL prepared statements do not allow multiple SQL statements in a single execution call (`cannot insert multiple commands into a prepared statement`). Because the `CREATE TABLE` and `CREATE UNIQUE INDEX` were submitted together, the execution threw an error, triggering the catch block and silently dropping to in-memory fallback.
2. **Violation of the Principle of Least Privilege (PoLP):**
   In enterprise environments, production application connection pools run under restricted database roles with DML privileges only (`SELECT, INSERT, UPDATE, DELETE`). Granting `CREATE TABLE` / DDL rights to the runtime application user represents a security and governance risk.
3. **Drift from Prisma Single Source of Truth:**
   Runtime DDL bypasses `schema.prisma`. It prevents Prisma Client from generating strongly-typed models, violates declarative schema synchronization, and creates undocumented drift between environments.

---

## 2. Phase 2B Item 1 Implementation Blueprint

In Phase 2B Item 1, this runtime DDL will be completely eliminated and replaced by a formal Prisma schema migration:

### Step 1: Add Model to `apps/api/prisma/schema.prisma`
```prisma
enum IntegrationType {
  BYOK_AI
  BYODB
  ERP
  STORAGE
  PAYMENT_GATEWAY
}

enum IntegrationStatus {
  CONNECTED
  DISCONNECTED
  ERROR
}

model OrganizationIntegration {
  id              String            @id @default(uuid())
  organizationId  String
  organization    Organization      @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  type            IntegrationType
  provider        String
  encryptedConfig String
  settings        Json?
  status          IntegrationStatus @default(DISCONNECTED)
  lastTestedAt    DateTime?
  lastSyncAt      DateTime?
  errorMessage    String?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@unique([organizationId, type, provider])
  @@index([organizationId, status])
}
```

### Step 2: Generate Migration via Prisma CLI
```bash
pnpm --filter @ap-saas/api exec prisma migrate dev --name add_organization_integration
```

### Step 3: Deprecate `ensureTable()` in `repository.ts`
Replace all raw SQL queries in `IntegrationRepository` with typed Prisma Client calls (`prisma.organizationIntegration.findUnique`, `upsert`, etc.), removing runtime DDL and eliminating fallback complexity.

---

## 3. Deployment & CI/CD Order
- **CI / Local:** Applied during `pnpm --filter @ap-saas/api db:setup` (`prisma migrate deploy`).
- **Production:** Executed during the release pipeline prior to application boot.
