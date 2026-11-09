import type { BankAccount as PrismaBankAccount } from "@prisma/client";

export interface BankAccountDTO {
  id: string;
  supplierId?: string;
  supplierName: string;
  accountNumber: string;
  maskedAccountNumber: string;
  bankName: string;
  ifscSwift: string;
  accountType: "CURRENT" | "SAVINGS" | "ESCROW";
  status: "VERIFIED" | "PENDING" | "FAILED";
  isPrimary: boolean;
  lastUsedDate?: string;
  verifiedAt?: string;
  pennyDropRef?: string;
  branchName?: string;
  createdAt: string;
}

export function maskAccountNumber(last4: string): string {
  return last4 ? `•••• ${last4}` : "••••";
}

export function toBankAccountDTO(account: PrismaBankAccount): BankAccountDTO {
  const masked = maskAccountNumber(account.accountNumberLast4);
  const accountType =
    account.accountType === "SAVINGS" || account.accountType === "ESCROW"
      ? account.accountType
      : "CURRENT";
  const status =
    account.status === "VERIFIED" || account.status === "FAILED" ? account.status : "PENDING";

  return {
    id: account.id,
    supplierId: account.supplierId ?? undefined,
    supplierName: account.supplierName,
    // The full number is encrypted at rest and never returned over the wire.
    accountNumber: masked,
    maskedAccountNumber: masked,
    bankName: account.bankName,
    ifscSwift: account.ifscSwift,
    accountType,
    status,
    isPrimary: account.isPrimary,
    verifiedAt: account.verifiedAt?.toISOString(),
    pennyDropRef: account.pennyDropRef ?? undefined,
    branchName: account.branchName ?? undefined,
    createdAt: account.createdAt.toISOString(),
  };
}
