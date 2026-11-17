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

describe("generateBankExportFile - Real Bank Account Resolution (Item B / B1)", () => {
  const orgId = "org-test-123";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      id: orgId,
      name: "Acme Org",
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

  it("throws clear ApiError if supplier has no bank account records at all", async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      {
        id: "pay-1",
        amount: 1000,
        currency: "INR",
        scheduledDate: new Date("2026-05-01"),
        invoice: {
          invoiceNumber: "INV-002",
          supplierId: "sup-none",
          supplier: {
            id: "sup-none",
            displayName: "No Bank Supplier",
          },
        },
      },
    ] as any);

    vi.mocked(prisma.bankAccount.findMany).mockResolvedValue([]);

    await expect(generateBankExportFile(orgId, "csv")).rejects.toThrow(
      "Cannot export bank file: Supplier 'No Bank Supplier' has no verified bank account.",
    );
  });

  it("successfully exports real decrypted account and routing when verified", async () => {
    const realAccount = "998877665544";
    const realIfsc = "ICIC0001234";

    vi.mocked(prisma.payment.findMany).mockResolvedValue([
      {
        id: "pay-1",
        amount: 25000,
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

    const csvResult = await generateBankExportFile(orgId, "csv");

    expect(csvResult).toContain(realAccount);
    expect(csvResult).toContain(realIfsc);
    expect(csvResult).toContain('"Verified Vendor Ltd"');
    expect(csvResult).toContain("25000.00");
  });
});
