-- AlterEnum
ALTER TYPE "ExceptionType" ADD VALUE IF NOT EXISTS 'APPROVAL_REJECTED';

-- AlterTable Invoice
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "decisionChecklist" JSONB;

-- AlterTable InvoiceLine
ALTER TABLE "InvoiceLine" ADD COLUMN IF NOT EXISTS "matchStatus" TEXT;
ALTER TABLE "InvoiceLine" ADD COLUMN IF NOT EXISTS "overrideAccepted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "InvoiceLine" ADD COLUMN IF NOT EXISTS "overrideReason" TEXT;
ALTER TABLE "InvoiceLine" ADD COLUMN IF NOT EXISTS "overrideUserId" TEXT;
ALTER TABLE "InvoiceLine" ADD COLUMN IF NOT EXISTS "overrideAt" TIMESTAMP(3);

-- AlterTable Approval
ALTER TABLE "Approval" ADD COLUMN IF NOT EXISTS "confirmations" JSONB;
