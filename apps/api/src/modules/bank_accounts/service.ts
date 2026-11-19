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

export async function createBankAccount(
  organizationId: string,
  input: CreateInput,
  userId?: string
) {
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

  if (userId) {
    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: "CREATE_BANK_ACCOUNT",
        entityType: "BANK_ACCOUNT",
        entityId: finalAccount.id,
        afterData: {
          supplierId: finalAccount.supplierId,
          supplierName: finalAccount.supplierName,
          bankName: finalAccount.bankName,
          accountNumberLast4: finalAccount.accountNumberLast4,
        },
        result: "SUCCESS",
      },
    });
  }

  return toBankAccountDTO(finalAccount);
}

export async function verifyBankAccount(
  organizationId: string,
  id: string,
  userId?: string,
  options?: { overrideSoloAdmin?: boolean; overrideReason?: string }
) {
  // Doc 24 C8-7 / 2-person verification rule:
  // The person who added a bank account cannot verify it in a multi-admin organization.
  if (userId) {
    const creationAudit = await prisma.auditLog.findFirst({
      where: {
        organizationId,
        entityType: "BANK_ACCOUNT",
        entityId: id,
        action: { in: ["CREATE_BANK_ACCOUNT", "UPDATE_BANK_ACCOUNT"] },
      },
      orderBy: { createdAt: "asc" },
    });

    if (creationAudit?.userId && creationAudit.userId === userId) {
      const activeAdminCount = await prisma.user.count({
        where: { organizationId, role: "ADMINISTRATOR", status: "ACTIVE" },
      });

      if (activeAdminCount > 1) {
        if (!options?.overrideSoloAdmin) {
          throw ApiError.forbidden(
            "Segregation of Duties (SoD) violation: The user who created this bank account cannot verify it (two-person verification rule)."
          );
        }
        throw ApiError.forbidden(
          `Segregation of Duties override is only permitted for single-administrator organizations (organization has ${activeAdminCount} active administrators).`
        );
      }
    }
  }

  const verified = await repo.markVerified(organizationId, id);
  if (!verified) {
    throw ApiError.notFound("Bank account not found");
  }

  if (userId) {
    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: "VERIFY_BANK_ACCOUNT",
        entityType: "BANK_ACCOUNT",
        entityId: verified.id,
        afterData: {
          isVerified: true,
          supplierId: verified.supplierId,
        },
        result: "SUCCESS",
      },
    });
  }

  return toBankAccountDTO(verified);
}

export async function setPrimaryBankAccount(
  organizationId: string,
  id: string,
  userId?: string
) {
  const updated = await repo.setPrimary(organizationId, id);
  if (!updated) {
    throw ApiError.notFound("Bank account not found");
  }

  if (userId) {
    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: "UPDATE_BANK_ACCOUNT",
        entityType: "BANK_ACCOUNT",
        entityId: updated.id,
        afterData: {
          isPrimary: true,
          supplierId: updated.supplierId,
        },
        result: "SUCCESS",
      },
    });
  }

  return toBankAccountDTO(updated);
}
