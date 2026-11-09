import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../config/database";
import {
  createBankAccount,
  listBankAccounts,
  setPrimaryBankAccount,
  verifyBankAccount,
} from "./service";

const ORG_A = "org-bank-test-a";
const ORG_B = "org-bank-test-b";

const accountInput = {
  supplierName: "Acme Industrial",
  accountNumber: "111122223333",
  bankName: "HDFC Bank",
  ifscSwift: "HDFC0001234",
  accountType: "CURRENT" as const,
  isPrimary: false,
};

describe("Supplier bank accounts", () => {
  beforeEach(async () => {
    await prisma.bankAccount.deleteMany({
      where: { organizationId: { in: [ORG_A, ORG_B] } },
    });
    await prisma.supplier.deleteMany({ where: { organizationId: { in: [ORG_A, ORG_B] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [ORG_A, ORG_B] } } });
    await prisma.organization.createMany({
      data: [
        { id: ORG_A, name: "Bank Test A", defaultCurrency: "INR", country: "IN" },
        { id: ORG_B, name: "Bank Test B", defaultCurrency: "INR", country: "IN" },
      ],
    });
  });

  it("encrypts the account number and only returns the masked form", async () => {
    const created = await createBankAccount(ORG_A, accountInput);

    expect(created.maskedAccountNumber).toBe("•••• 3333");
    expect(created.accountNumber).toBe("•••• 3333");
    expect(created.status).toBe("PENDING");

    const stored = await prisma.bankAccount.findFirst({
      where: { id: created.id, organizationId: ORG_A },
    });
    expect(stored?.encryptedAccountNumber).not.toContain("111122223333");
    expect(stored?.accountNumberLast4).toBe("3333");
  });

  it("verifies an account without fabricating a penny-drop reference", async () => {
    const created = await createBankAccount(ORG_A, accountInput);
    const verified = await verifyBankAccount(ORG_A, created.id);

    expect(verified.status).toBe("VERIFIED");
    expect(verified.verifiedAt).toBeTruthy();
    expect(verified.pennyDropRef).toBeUndefined();
  });

  it("demotes the previous primary account for the same supplier", async () => {
    const first = await createBankAccount(ORG_A, { ...accountInput, isPrimary: true });
    const second = await createBankAccount(ORG_A, {
      ...accountInput,
      accountNumber: "444455556666",
      bankName: "ICICI Bank",
      ifscSwift: "ICIC0001234",
    });

    const promoted = await setPrimaryBankAccount(ORG_A, second.id);
    expect(promoted.isPrimary).toBe(true);

    const demoted = await prisma.bankAccount.findFirst({
      where: { id: first.id, organizationId: ORG_A },
    });
    expect(demoted?.isPrimary).toBe(false);
  });

  it("rejects linking a supplier from another tenant", async () => {
    const foreignSupplier = await prisma.supplier.create({
      data: {
        organizationId: ORG_B,
        supplierCode: "SUP-B-1",
        legalName: "Foreign Supplier",
        displayName: "Foreign Supplier",
      },
    });

    await expect(
      createBankAccount(ORG_A, { ...accountInput, supplierId: foreignSupplier.id })
    ).rejects.toThrow(/not found in this workspace/i);
  });

  it("keeps account lists tenant-scoped", async () => {
    await createBankAccount(ORG_A, accountInput);

    expect((await listBankAccounts(ORG_A, {})).total).toBe(1);
    expect((await listBankAccounts(ORG_B, {})).total).toBe(0);
  });
});
