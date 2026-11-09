import { prisma } from "../../config/database";
import { ApiError } from "../../lib/errors";
import { encryptSecret } from "../../lib/crypto";
import * as repo from "./repository";
import { toBankAccountDTO } from "./mapper";
import type { z } from "zod";
import type { createBankAccountSchema, listBankAccountsQuerySchema } from "./validation";

type ListQuery = z.infer<typeof listBankAccountsQuerySchema>;
type CreateInput = z.infer<typeof createBankAccountSchema>;

export async function listBankAccounts(organizationId: string, query: ListQuery) {
  const rows = await repo.listBankAccounts({ organizationId, ...query });
  const data = rows.map(toBankAccountDTO);
  return { data, total: data.length };
}

export async function createBankAccount(organizationId: string, input: CreateInput) {
  let supplierId: string | undefined;
  let supplierName = input.supplierName.trim();

  if (input.supplierId) {
    const supplier = await prisma.supplier.findFirst({
      where: { id: input.supplierId, organizationId },
      select: { id: true, displayName: true },
    });
    if (!supplier) {
      throw ApiError.badRequest("Supplier not found in this workspace.");
    }
    supplierId = supplier.id;
    supplierName = supplier.displayName;
  }

  const accountNumber = input.accountNumber.trim();
  const created = await repo.createBankAccount({
    organizationId,
    supplierId,
    supplierName,
    encryptedAccountNumber: encryptSecret(accountNumber),
    accountNumberLast4: accountNumber.slice(-4),
    bankName: input.bankName.trim(),
    ifscSwift: input.ifscSwift,
    accountType: input.accountType,
    branchName: input.branchName?.trim(),
    isPrimary: false,
    status: "PENDING",
  });

  const finalAccount =
    input.isPrimary ? await repo.setPrimary(organizationId, created.id) : created;
  if (!finalAccount) {
    throw ApiError.notFound("Bank account not found");
  }
  return toBankAccountDTO(finalAccount);
}

export async function verifyBankAccount(organizationId: string, id: string) {
  const verified = await repo.markVerified(organizationId, id);
  if (!verified) {
    throw ApiError.notFound("Bank account not found");
  }
  return toBankAccountDTO(verified);
}

export async function setPrimaryBankAccount(organizationId: string, id: string) {
  const updated = await repo.setPrimary(organizationId, id);
  if (!updated) {
    throw ApiError.notFound("Bank account not found");
  }
  return toBankAccountDTO(updated);
}
