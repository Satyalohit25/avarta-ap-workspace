-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "debitAccountNumberLast4" TEXT;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN "encryptedAccountNumber" TEXT,
ADD COLUMN "accountNumberLast4" TEXT,
ADD COLUMN "bankName" TEXT,
ADD COLUMN "ifscCode" TEXT,
ADD COLUMN "beneficiaryName" TEXT,
ADD COLUMN "paymentMethod" TEXT DEFAULT 'BANK_TRANSFER',
ADD COLUMN "panNumber" TEXT;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "storageProvider" TEXT NOT NULL DEFAULT 'LOCAL',
ADD COLUMN "s3ObjectKey" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "settlementDate" TIMESTAMP(3),
ADD COLUMN "notes" TEXT,
ADD COLUMN "recordedById" TEXT,
ADD COLUMN "beneficiaryAccountNumberLast4" TEXT,
ADD COLUMN "beneficiaryIfsc" TEXT,
ADD COLUMN "beneficiaryName" TEXT;

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "uom" TEXT NOT NULL,
    "taxRate" DECIMAL(5,2) DEFAULT 18,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SampleRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SampleRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationInvitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_organizationId_utrNumber_key" ON "Payment"("organizationId", "utrNumber");

-- CreateIndex
CREATE INDEX "Item_organizationId_idx" ON "Item"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Item_organizationId_itemCode_key" ON "Item"("organizationId", "itemCode");

-- CreateIndex
CREATE INDEX "SampleRecord_organizationId_entityType_idx" ON "SampleRecord"("organizationId", "entityType");

-- CreateIndex
CREATE INDEX "SampleRecord_entityId_idx" ON "SampleRecord"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvitation_tokenHash_key" ON "OrganizationInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_organizationId_idx" ON "OrganizationInvitation"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_organizationId_email_idx" ON "OrganizationInvitation"("organizationId", "email");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_invitedById_idx" ON "OrganizationInvitation"("invitedById");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_expiresAt_idx" ON "OrganizationInvitation"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_organizationId_idx" ON "PasswordResetToken"("organizationId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleRecord" ADD CONSTRAINT "SampleRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Custom PostgreSQL CHECK Constraints

-- CHECK on Payment: utrNumber format (not empty string, trimmed, alphanumeric, 10–22 characters)
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_utrNumber_format_check" 
CHECK ("utrNumber" IS NULL OR (length(trim("utrNumber")) >= 10 AND length(trim("utrNumber")) <= 22 AND "utrNumber" ~ '^[A-Za-z0-9]+$'));

-- CHECK on Payment: status PAID requires utrNumber and settlementDate, created NOT VALID
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paid_settlement_check" 
CHECK ("status" <> 'PAID' OR ("utrNumber" IS NOT NULL AND "settlementDate" IS NOT NULL)) NOT VALID;

-- CHECK on Supplier: ifscCode format
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_ifscCode_format_check" 
CHECK ("ifscCode" IS NULL OR "ifscCode" ~ '^[A-Z]{4}0[A-Z0-9]{6}$');

-- CHECK on Supplier: panNumber format
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_panNumber_format_check" 
CHECK ("panNumber" IS NULL OR "panNumber" ~ '^[A-Z]{5}[0-9]{4}[A-Z]{1}$');
