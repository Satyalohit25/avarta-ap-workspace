-- prisma:no-transaction
-- CreateIndex: Hand-written compound unique indexes to preserve returned row on update while enforcing tenant isolation
-- Hand-crafted for zero downtime using CONCURRENTLY outside a transaction block:
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "Invoice_id_organizationId_key" ON "Invoice"("id", "organizationId");
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "Payment_id_organizationId_key" ON "Payment"("id", "organizationId");

-- Verification query (to ensure index built successfully and is valid for queries):
-- SELECT indexrelid::regclass, indisvalid FROM pg_index WHERE indexrelid::regclass::text IN ('"Invoice_id_organizationId_key"', '"Payment_id_organizationId_key"');

-- ROLLBACK SQL (execute if rolling back migration):
-- DROP INDEX CONCURRENTLY IF EXISTS "Invoice_id_organizationId_key";
-- DROP INDEX CONCURRENTLY IF EXISTS "Payment_id_organizationId_key";
