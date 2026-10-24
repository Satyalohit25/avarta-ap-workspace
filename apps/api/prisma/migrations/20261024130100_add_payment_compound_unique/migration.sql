CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "Payment_id_organizationId_key" ON "Payment"("id", "organizationId");
