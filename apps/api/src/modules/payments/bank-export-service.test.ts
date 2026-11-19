import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateBankExportFile } from "./service";
import { prisma } from "../../config/database";
import { encryptSecret } from "../../lib/crypto";

vi.mock("../../config/database", () => ({
  prisma: {
    organization: {
      findUnique: vi.fn(),
    },
    payment: {
      findMany: vi.fn(),
    },
    bankAccount: {
      findMany: vi.fn(),
    },
  },
}));

describe("generateBankExportFile - Indian Bank Formats & Bank Account Resolution (T-309)", () => {
  const orgId = "org-test-123";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      id: orgId,
      name: "Acme Org",
      debitAccountNumberLast4: "5678",
    } as any);
  });

  it("throws clear ApiError if supplier has no verified bank account", async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      {
        id: "pay-1",
        amount: 1000,
        currency: "INR",
        scheduledDate: new Date("2026-05-01"),
        invoice: {
          invoiceNumber: "INV-001",
          supplierId: "sup-unverified",
          supplier: {
            id: "sup-unverified",
            displayName: "Unverified Supplier",
          },
        },
      },
    ] as any);

    // Bank account exists but status is PENDING
    vi.mocked(prisma.bankAccount.findMany).mockResolvedValue([
      {
        id: "ba-1",
        organizationId: orgId,
        supplierId: "sup-unverified",
        status: "PENDING",
        isPrimary: true,
        encryptedAccountNumber: encryptSecret("1122334455"),
        ifscSwift: "HDFC0001234",
      },
    ] as any);

    await expect(generateBankExportFile(orgId, "csv")).rejects.toThrow(
      "Cannot export bank file: Supplier 'Unverified Supplier' has no verified bank account.",
    );
  });

  it("throws clear ApiError if Indian bank file requested with invalid IFSC", async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      {
        id: "pay-1",
        amount: 50000,
        currency: "INR",
        scheduledDate: new Date("2026-05-01"),
        invoice: {
          invoiceNumber: "INV-BAD-IFSC",
          supplierId: "sup-bad-ifsc",
          supplier: {
            id: "sup-bad-ifsc",
            displayName: "Bad IFSC Vendor",
          },
        },
      },
    ] as any);

    vi.mocked(prisma.bankAccount.findMany).mockResolvedValue([
      {
        id: "ba-bad",
        organizationId: orgId,
        supplierId: "sup-bad-ifsc",
        status: "VERIFIED",
        isPrimary: true,
        encryptedAccountNumber: encryptSecret("123456789"),
        ifscSwift: "INVALIDIFSC", // Not 11 chars format
      },
    ] as any);

    await expect(generateBankExportFile(orgId, "neft")).rejects.toThrow(
      "Cannot export Indian bank file: Supplier 'Bad IFSC Vendor' has invalid IFSC 'INVALIDIFSC'. Must be 11 characters (e.g. HDFC0001234).",
    );
  });

  it("successfully exports HDFC, ICICI, SBI, and NEFT/RTGS files with verified accounts", async () => {
    const realAccount = "998877665544";
    const realIfsc = "HDFC0001234";

    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      {
        id: "pay-1",
        amount: 250000,
        currency: "INR",
        scheduledDate: new Date("2026-05-01"),
        invoice: {
          invoiceNumber: "INV-REAL-101",
          supplierId: "sup-verified",
          supplier: {
            id: "sup-verified",
            displayName: "Verified Vendor Ltd",
          },
        },
      },
    ] as any);

    vi.mocked(prisma.bankAccount.findMany).mockResolvedValue([
      {
        id: "ba-real",
        organizationId: orgId,
        supplierId: "sup-verified",
        status: "VERIFIED",
        isPrimary: true,
        encryptedAccountNumber: encryptSecret(realAccount),
        ifscSwift: realIfsc,
      },
    ] as any);

    // Test HDFC
    const hdfcResult = await generateBankExportFile(orgId, "hdfc");
    expect(hdfcResult).toContain("Transaction Type,Beneficiary Account Number");
    expect(hdfcResult).toContain("IFT"); // HDFC to HDFC
    expect(hdfcResult).toContain(realAccount);

    // Test ICICI
    const iciciResult = await generateBankExportFile(orgId, "icici");
    expect(iciciResult).toContain("PaymentMode,DebitAccountNumber");
    expect(iciciResult).toContain("R"); // >= 200,000 RTGS
    expect(iciciResult).toContain(realAccount);

    // Test SBI
    const sbiResult = await generateBankExportFile(orgId, "sbi");
    expect(sbiResult).toContain("PaymentType,DebitAccount");
    expect(sbiResult).toContain("RTGS");
    expect(sbiResult).toContain(realAccount);

    // Test NEFT/RTGS
    const neftResult = await generateBankExportFile(orgId, "neft");
    expect(neftResult).toContain("TransactionType,BeneficiaryAccountNumber");
    expect(neftResult).toContain("RTGS");
    expect(neftResult).toContain(realAccount);
  });
});
