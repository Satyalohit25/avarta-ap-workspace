CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "Invoice_id_organizationId_key" ON "Invoice"("id", "organizationId");
