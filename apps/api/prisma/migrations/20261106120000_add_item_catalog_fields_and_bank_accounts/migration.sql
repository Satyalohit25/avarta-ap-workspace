-- Item catalogue: HSN/SAC statutory code and per-item currency.
ALTER TABLE "Item" ADD COLUMN "hsnSac" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Item" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'INR';

-- Supplier settlement bank accounts.
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "supplierId" TEXT,
    "supplierName" TEXT NOT NULL,
    "encryptedAccountNumber" TEXT NOT NULL,
    "accountNumberLast4" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "ifscSwift" TEXT NOT NULL,
    "accountType" TEXT NOT NULL DEFAULT 'CURRENT',
    "branchName" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "pennyDropRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BankAccount_organizationId_idx" ON "BankAccount"("organizationId");
CREATE INDEX "BankAccount_organizationId_supplierName_idx" ON "BankAccount"("organizationId", "supplierName");

ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
