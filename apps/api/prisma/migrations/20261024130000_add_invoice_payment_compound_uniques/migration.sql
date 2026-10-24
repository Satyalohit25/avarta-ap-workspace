-- CreateIndex: Hand-written compound unique indexes to preserve returned row on update while enforcing tenant isolation
-- Hand-crafted for zero downtime. In high-traffic production, run outside a transaction block with CONCURRENTLY:
-- CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "Invoice_id_organizationId_key" ON "Invoice"("id", "organizationId");
-- CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "Payment_id_organizationId_key" ON "Payment"("id", "organizationId");

CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_id_organizationId_key" ON "Invoice"("id", "organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_id_organizationId_key" ON "Payment"("id", "organizationId");

-- ROLLBACK SQL (execute if rolling back migration):
-- DROP INDEX CONCURRENTLY IF EXISTS "Invoice_id_organizationId_key";
-- DROP INDEX CONCURRENTLY IF EXISTS "Payment_id_organizationId_key";
