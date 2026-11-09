import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";

export interface ListBankAccountFilters {
  organizationId: string;
  search?: string;
  status?: string;
  primaryOnly?: boolean;
}

function buildWhere(filters: ListBankAccountFilters): Prisma.BankAccountWhereInput {
  return {
    organizationId: filters.organizationId,
    ...(filters.status && filters.status !== "ALL" ? { status: filters.status } : {}),
    ...(filters.primaryOnly ? { isPrimary: true } : {}),
    ...(filters.search
      ? {
          OR: [
            { supplierName: { contains: filters.search, mode: "insensitive" } },
            { bankName: { contains: filters.search, mode: "insensitive" } },
            { ifscSwift: { contains: filters.search, mode: "insensitive" } },
            { accountNumberLast4: { contains: filters.search } },
          ],
        }
      : {}),
  };
}

export async function listBankAccounts(filters: ListBankAccountFilters) {
  return prisma.bankAccount.findMany({
    where: { ...buildWhere(filters), organizationId: filters.organizationId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
  });
}

export async function findBankAccountById(organizationId: string, id: string) {
  return prisma.bankAccount.findFirst({ where: { id, organizationId } });
}

export async function createBankAccount(data: Prisma.BankAccountUncheckedCreateInput) {
  return prisma.bankAccount.create({ data });
}

export async function markVerified(organizationId: string, id: string) {
  const result = await prisma.bankAccount.updateMany({
    where: { id, organizationId },
    data: {
      status: "VERIFIED",
      verifiedAt: new Date(),
      // No penny-drop gateway is configured; never fabricate a bank reference.
      pennyDropRef: null,
    },
  });
  if (result.count === 0) return null;
  return findBankAccountById(organizationId, id);
}

export async function setPrimary(organizationId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const target = await tx.bankAccount.findFirst({ where: { id, organizationId } });
    if (!target) return null;

    await tx.bankAccount.updateMany({
      where: { organizationId, supplierName: target.supplierName, isPrimary: true },
      data: { isPrimary: false },
    });

    await tx.bankAccount.updateMany({
      where: { id, organizationId },
      data: { isPrimary: true },
    });

    return tx.bankAccount.findFirst({ where: { id, organizationId } });
  });
}
