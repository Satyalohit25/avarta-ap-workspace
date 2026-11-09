import { apiRequest } from "./client";

export interface BankAccount {
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

export async function listBankAccounts(params: {
  search?: string;
  status?: string;
  primaryOnly?: boolean;
} = {}): Promise<{ data: BankAccount[]; total: number }> {
  // Errors surface to the caller. Never fall back to a fabricated local
  // registry, which would make a failed bank-account load look successful.
  return await apiRequest<{ data: BankAccount[]; total: number }>("/bank-accounts", { query: params });
}

export interface CreateBankAccountInput {
  supplierName: string;
  supplierId?: string;
  accountNumber: string;
  bankName: string;
  ifscSwift: string;
  accountType?: "CURRENT" | "SAVINGS" | "ESCROW";
  branchName?: string;
  isPrimary?: boolean;
}

export async function createBankAccount(input: CreateBankAccountInput): Promise<BankAccount> {
  return await apiRequest<BankAccount>("/bank-accounts", {
    method: "POST",
    body: {
      ...input,
      accountNumber: input.accountNumber.trim(),
      ifscSwift: input.ifscSwift.toUpperCase().trim(),
    },
  });
}

export async function verifyBankAccount(id: string): Promise<BankAccount> {
  return await apiRequest<BankAccount>(`/bank-accounts/${id}/verify`, { method: "POST" });
}

export async function togglePrimaryBankAccount(id: string): Promise<BankAccount> {
  return await apiRequest<BankAccount>(`/bank-accounts/${id}/primary`, { method: "POST" });
}
