-- Migration: Allow NULL subtotal and tax amounts on Invoice, add MISSING_TAX_DATA exception type
-- T-107: Stop fabricating subtotal and tax amounts with 85% fallback

-- 1. Add MISSING_TAX_DATA to ExceptionType enum
ALTER TYPE "ExceptionType" ADD VALUE IF NOT EXISTS 'MISSING_TAX_DATA';

-- 2. Make subtotalAmount and taxAmount nullable on Invoice table
ALTER TABLE "Invoice" ALTER COLUMN "subtotalAmount" DROP NOT NULL;
ALTER TABLE "Invoice" ALTER COLUMN "subtotalAmount" DROP DEFAULT;

ALTER TABLE "Invoice" ALTER COLUMN "taxAmount" DROP NOT NULL;
ALTER TABLE "Invoice" ALTER COLUMN "taxAmount" DROP DEFAULT;

-- 3. Identify and flag existing rows created with 85% fallback for review
-- Insert audit logs and review exceptions for invoices where subtotal was fabricated
INSERT INTO "Exception" (
  "id",
  "organizationId",
  "invoiceId",
  "type",
  "severity",
  "title",
  "description",
  "status",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  inv."organizationId",
  inv."id",
  'MISSING_TAX_DATA'::"ExceptionType",
  'HIGH'::"ExceptionSeverity",
  'Tax Data Review: Potential 85% Fabricated Subtotal',
  'Invoice subtotal exactly matches 85% of total amount, indicating historical OCR fallback fabrication. Manual verification required.',
  'OPEN'::"ExceptionStatus",
  NOW(),
  NOW()
FROM "Invoice" inv
WHERE inv."totalAmount" > 0
  AND inv."subtotalAmount" = ROUND(inv."totalAmount" * 0.85, 2)
  AND inv."status" NOT IN ('PAID', 'ARCHIVED', 'SYNCED')
  AND NOT EXISTS (
    SELECT 1 FROM "Exception" ex
    WHERE ex."invoiceId" = inv."id"
      AND ex."type" = 'MISSING_TAX_DATA'
  );
