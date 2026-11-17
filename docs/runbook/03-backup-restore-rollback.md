# 03. Production Backup, Restore, and Rollback Runbook

**Version:** 1.0 (Institutional AP Standard)  
**Applicability:** Avarta AP Workspace Modular Monolith (`apps/api` + PostgreSQL)  
**Recovery Objectives:** RPO < 15 minutes, RTO < 30 minutes

---

## 1. Overview & Architectural Invariants

Avarta AP Workspace is a multi-tenant financial workspace governing accounts payable ledgers. Every business entity is bound to `organization_id` (AGENTS.md Rule 7).
Because financial operations require absolute consistency and non-repudiation (AGENTS.md Rule 5), backups and restore operations must guarantee:

1. **Transaction Snapshot Consistency:** Backups must capture consistent state machine snapshots across `workflow_instances`, `invoices`, and `payments`.
2. **Deterministic Encryption State:** Secrets in `OrganizationIntegration` (`encryptedConfig`) and `BankAccount` (`encryptedAccountNumber`) use AES-256-GCM keyed by `APP_ENCRYPTION_KEY`. The backup archive must be paired with the corresponding key version.
3. **No In-Place Unverified Overwrites:** Disaster recovery restores must execute into a clean staging or target database first, verify data integrity and tenant schemas, before traffic cutover.

---

## 2. Automated & Manual Database Backup Procedure

### 2.1 Full Logical Backup via `pg_dump`

Execute a consistent snapshot backup using PostgreSQL custom format (`-Fc`), enabling parallel restore, blob compression, and selective table extraction:

```bash
# Set timestamp identifier
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/avarta"
BACKUP_FILE="${BACKUP_DIR}/avarta_db_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

# Execute snapshot backup with transaction isolation
pg_dump \
  --dbname="${DATABASE_URL}" \
  --format=custom \
  --compress=9 \
  --verbose \
  --no-owner \
  --no-privileges \
  --file="${BACKUP_FILE}"
```

### 2.2 Verify Backup File Integrity

Verify the dump header and table of contents without restoring:

```bash
pg_restore --list "${BACKUP_FILE}" | head -n 30
```

Ensure exit code is `0` and critical tables (`Organization`, `User`, `Invoice`, `WorkflowInstance`, `Payment`, `BankAccount`) are present in the catalog.

---

## 3. Clean-Database Restoration Procedure

### 3.1 Provision Clean Target Database

Never restore directly over an active database. Provision a clean target instance:

```bash
TARGET_DB="avarta_recovery_$(date +%s)"

createdb -h "${PGHOST:-localhost}" -U "${PGUSER:-postgres}" "${TARGET_DB}"
```

### 3.2 Execute Restore via `pg_restore`

Restore into the clean database using parallel workers (`-j 4`) and stop-on-error:

```bash
pg_restore \
  -h "${PGHOST:-localhost}" \
  -U "${PGUSER:-postgres}" \
  --dbname="${TARGET_DB}" \
  --clean \
  --if-exists \
  --exit-on-error \
  --jobs=4 \
  --verbose \
  "${BACKUP_FILE}"
```

### 3.3 Post-Restore Integrity Verification Script

Run the automated verification query to assert tenant isolation, ledger count, and foreign key integrity:

```sql
-- Connect to TARGET_DB and execute:
SELECT 'Organizations' AS entity, COUNT(*) AS count FROM "Organization"
UNION ALL
SELECT 'Users', COUNT(*) FROM "User"
UNION ALL
SELECT 'Invoices', COUNT(*) FROM "Invoice"
UNION ALL
SELECT 'Workflow Instances', COUNT(*) FROM "WorkflowInstance"
UNION ALL
SELECT 'Payments', COUNT(*) FROM "Payment"
UNION ALL
SELECT 'Bank Accounts', COUNT(*) FROM "BankAccount";

-- Assert that every payment belongs to a valid invoice and organization
SELECT COUNT(*) AS orphaned_payments
FROM "Payment" p
LEFT JOIN "Invoice" i ON p."invoiceId" = i."id" AND p."organizationId" = i."organizationId"
WHERE i."id" IS NULL;
-- Expected output: 0 orphaned_payments
```

---

## 4. Prisma Migration Rollback Protocol

When an application deployment triggers a failing migration or code regression, follow this controlled rollback sequence:

### 4.1 Mark Failing Migration as Rolled Back

If a migration fails midway:

```bash
pnpm --filter @ap-saas/api exec prisma migrate resolve --rolled-back "<migration_name>"
```

### 4.2 Revert to Known-Good Git Commit

Checkout the previous stable release commit:

```bash
git checkout <previous_commit_sha>
pnpm install --frozen-lockfile
pnpm --filter @ap-saas/api build
pnpm --filter @ap-saas/web build
```

### 4.3 Database Schema Synchronization

Verify the database schema matches the target commit:

```bash
pnpm --filter @ap-saas/api exec prisma migrate status
```

---

## 5. Secret Key & Environment Incident Recovery

If `APP_ENCRYPTION_KEY` is corrupted or lost:

1. **Immediate Quarantine:** Halt `apps/api` worker processes to prevent writes with unkeyed encryption.
2. **Key Vault Retrieval:** Retrieve the historical key version matching the backup timestamp from corporate KMS / AWS Secrets Manager.
3. **Decryption Probe:** Run the test suite (`pnpm --filter @ap-saas/api exec vitest run src/lib/crypto.test.ts`) against the restored key to verify key checksum matches.
