-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "trackingTokenHash" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "trackingTokenEncrypted" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "trackingTokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_trackingTokenHash_key" ON "Invoice"("trackingTokenHash");
