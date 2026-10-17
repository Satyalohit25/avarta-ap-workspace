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

const STORAGE_KEY = "avarta_bank_accounts_v1";

function maskAcc(num: string): string {
  const clean = num.replace(/\s+/g, "");
  if (clean.length <= 4) return clean;
  return `•••• ${clean.slice(-4)}`;
}

const INITIAL_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: "bnk-001",
    supplierName: "Tata Steel Limited",
    accountNumber: "0000003847291048",
    maskedAccountNumber: "•••• 1048",
    bankName: "State Bank of India",
    ifscSwift: "SBIN0000691",
    accountType: "CURRENT",
    status: "VERIFIED",
    isPrimary: true,
    lastUsedDate: "2026-10-14",
    verifiedAt: "2026-08-10T14:20:00Z",
    pennyDropRef: "NPCI-PENNY-994821",
    branchName: "Corporate Accounts Group, Mumbai",
    createdAt: "2026-08-10T14:15:00Z",
  },
  {
    id: "bnk-002",
    supplierName: "Schneider Electric India Pvt Ltd",
    accountNumber: "50200039281742",
    maskedAccountNumber: "•••• 1742",
    bankName: "HDFC Bank",
    ifscSwift: "HDFC0000060",
    accountType: "CURRENT",
    status: "VERIFIED",
    isPrimary: true,
    lastUsedDate: "2026-10-12",
    verifiedAt: "2026-08-15T09:40:00Z",
    pennyDropRef: "NPCI-PENNY-883712",
    branchName: "Fort Branch, Mumbai",
    createdAt: "2026-08-15T09:30:00Z",
  },
  {
    id: "bnk-003",
    supplierName: "Larsen & Toubro Ltd",
    accountNumber: "000105029481",
    maskedAccountNumber: "•••• 9481",
    bankName: "ICICI Bank",
    ifscSwift: "ICIC0000001",
    accountType: "CURRENT",
    status: "VERIFIED",
    isPrimary: true,
    lastUsedDate: "2026-10-10",
    verifiedAt: "2026-08-20T11:00:00Z",
    pennyDropRef: "NPCI-PENNY-772910",
    branchName: "Backbay Reclamation, Mumbai",
    createdAt: "2026-08-20T10:45:00Z",
  },
  {
    id: "bnk-004",
    supplierName: "Dell India Corporate Sales",
    accountNumber: "110294817293",
    maskedAccountNumber: "•••• 7293",
    bankName: "Citibank N.A. India",
    ifscSwift: "CITI0000002",
    accountType: "CURRENT",
    status: "VERIFIED",
    isPrimary: true,
    lastUsedDate: "2026-09-30",
    verifiedAt: "2026-09-01T16:00:00Z",
    pennyDropRef: "NPCI-PENNY-661902",
    branchName: "MG Road, Bengaluru",
    createdAt: "2026-09-01T15:30:00Z",
  },
  {
    id: "bnk-005",
    supplierName: "Zenith Precision Tooling",
    accountNumber: "918020048192837",
    maskedAccountNumber: "•••• 2837",
    bankName: "Axis Bank",
    ifscSwift: "UTIB0000015",
    accountType: "CURRENT",
    status: "PENDING",
    isPrimary: false,
    lastUsedDate: undefined,
    pennyDropRef: undefined,
    branchName: "Sector 18, Noida",
    createdAt: "2026-10-13T10:00:00Z",
  },
  {
    id: "bnk-006",
    supplierName: "Apex Logistics & Freight",
    accountNumber: "04820100029481",
    maskedAccountNumber: "•••• 9481",
    bankName: "Punjab National Bank",
    ifscSwift: "PUNB0048200",
    accountType: "CURRENT",
    status: "FAILED",
    isPrimary: false,
    lastUsedDate: undefined,
    pennyDropRef: "ERR_NAME_MISMATCH_GSTIN",
    branchName: "Transport Nagar, Delhi",
    createdAt: "2026-10-11T12:00:00Z",
  },
];

function getStoredBankAccounts(): BankAccount[] {
  if (typeof window === "undefined") return INITIAL_BANK_ACCOUNTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BANK_ACCOUNTS));
      return INITIAL_BANK_ACCOUNTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_BANK_ACCOUNTS;
  }
}

function saveBankAccounts(accounts: BankAccount[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.warn("Failed to persist bank accounts:", err);
  }
}

export async function listBankAccounts(params: {
  search?: string;
  status?: string;
  primaryOnly?: boolean;
} = {}): Promise<{ data: BankAccount[]; total: number }> {
  await new Promise((resolve) => setTimeout(resolve, 80));
  let accounts = getStoredBankAccounts();

  if (params.search) {
    const q = params.search.toLowerCase().trim();
    accounts = accounts.filter(
      (acc) =>
        acc.supplierName.toLowerCase().includes(q) ||
        acc.bankName.toLowerCase().includes(q) ||
        acc.ifscSwift.toLowerCase().includes(q) ||
        acc.accountNumber.includes(q) ||
        acc.maskedAccountNumber.includes(q)
    );
  }

  if (params.status && params.status !== "ALL") {
    accounts = accounts.filter((acc) => acc.status === params.status);
  }

  if (params.primaryOnly) {
    accounts = accounts.filter((acc) => acc.isPrimary);
  }

  return { data: accounts, total: accounts.length };
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
  await new Promise((resolve) => setTimeout(resolve, 100));
  const accounts = getStoredBankAccounts();
  const rawNum = input.accountNumber.trim();

  const newAcc: BankAccount = {
    id: `bnk-${Date.now().toString(36)}`,
    supplierId: input.supplierId,
    supplierName: input.supplierName.trim(),
    accountNumber: rawNum,
    maskedAccountNumber: maskAcc(rawNum),
    bankName: input.bankName.trim(),
    ifscSwift: input.ifscSwift.toUpperCase().trim(),
    accountType: input.accountType || "CURRENT",
    branchName: input.branchName?.trim(),
    status: "PENDING",
    isPrimary: !!input.isPrimary,
    createdAt: new Date().toISOString(),
  };

  // If set to primary, toggle off other accounts for same supplier
  let updated = accounts;
  if (newAcc.isPrimary) {
    updated = updated.map((acc) =>
      acc.supplierName.toLowerCase() === newAcc.supplierName.toLowerCase()
        ? { ...acc, isPrimary: false }
        : acc
    );
  }

  updated = [newAcc, ...updated];
  saveBankAccounts(updated);
  return newAcc;
}

export async function verifyBankAccount(id: string): Promise<BankAccount> {
  await new Promise((resolve) => setTimeout(resolve, 120));
  const accounts = getStoredBankAccounts();
  const index = accounts.findIndex((a) => a.id === id);
  if (index === -1) throw new Error("Bank account not found");

  const acc = accounts[index];
  const verified: BankAccount = {
    ...acc,
    status: "VERIFIED",
    verifiedAt: new Date().toISOString(),
    pennyDropRef: `NPCI-PENNY-${Math.floor(100000 + Math.random() * 900000)}`,
  };

  accounts[index] = verified;
  saveBankAccounts(accounts);
  return verified;
}

export async function togglePrimaryBankAccount(id: string): Promise<BankAccount> {
  await new Promise((resolve) => setTimeout(resolve, 80));
  const accounts = getStoredBankAccounts();
  const target = accounts.find((a) => a.id === id);
  if (!target) throw new Error("Bank account not found");

  const updated = accounts.map((acc) => {
    if (acc.id === id) {
      return { ...acc, isPrimary: true };
    }
    if (acc.supplierName.toLowerCase() === target.supplierName.toLowerCase()) {
      return { ...acc, isPrimary: false };
    }
    return acc;
  });

  saveBankAccounts(updated);
  return updated.find((a) => a.id === id)!;
}
