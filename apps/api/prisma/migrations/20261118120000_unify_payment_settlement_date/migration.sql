-- Unify Payment settlement date by dropping redundant clearingDate
-- and backfilling settlementDate from clearingDate if null

UPDATE "Payment"
SET "settlementDate" = "clearingDate"
WHERE "settlementDate" IS NULL AND "clearingDate" IS NOT NULL;

ALTER TABLE "Payment" DROP COLUMN IF EXISTS "clearingDate";
