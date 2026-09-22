-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "closedForReceiving" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "buyerInvoiceId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "fiscalYear" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "erpClearingNumber" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "utrNumber" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "clearingDate" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "clearingDocumentNumber" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "GoodsReceipt" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "grnNumber" TEXT NOT NULL,
    "receiptDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vendorDeliveryNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACCEPTED',
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GoodsReceiptLine" (
    "id" TEXT NOT NULL,
    "goodsReceiptId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "itemCode" TEXT,
    "receivedQuantity" DECIMAL(18,4) NOT NULL,
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'UNIT',
    "status" TEXT NOT NULL DEFAULT 'ACCEPTED',
    "inspectionNotes" TEXT,

    CONSTRAINT "GoodsReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER,
    "responseBody" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GoodsReceipt_organizationId_grnNumber_key" ON "GoodsReceipt"("organizationId", "grnNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IdempotencyKey_expiresAt_idx" ON "IdempotencyKey"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "IdempotencyKey_key_organizationId_key" ON "IdempotencyKey"("key", "organizationId");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GoodsReceipt_purchaseOrderId_fkey') THEN
    ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GoodsReceiptLine_goodsReceiptId_fkey') THEN
    ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES "GoodsReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
