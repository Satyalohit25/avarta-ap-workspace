import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";

const listInclude = {
  supplier: true,
  exceptions: true,
} satisfies Prisma.InvoiceInclude;

const detailInclude = {
  supplier: true,
  workflowInstance: {
    include: {
      transitions: {
        orderBy: { createdAt: "asc" },
      },
    },
  },
  exceptions: true,
  documents: true,
  lines: true,
  validations: {
    orderBy: { createdAt: "asc" },
  },
  approvals: {
    include: { approver: true },
    orderBy: { requestedAt: "asc" },
  },
  payments: {
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.InvoiceInclude;

interface ListFilters {
  organizationId: string;
  status?: string;
  supplierId?: string;
  search?: string;
  page: number;
  pageSize: number;
}

// Doc 15 §15.69 / AGENTS.md rule 7 — organizationId is always a required,
// server-derived filter on every query. There is no code path in this
// repository that can return another organization's rows.
export async function listInvoices(filters: ListFilters) {
  const where: Prisma.InvoiceWhereInput = {
    organizationId: filters.organizationId,
    ...(filters.status ? { status: filters.status as unknown as never } : {}),
    ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
    ...(filters.search
      ? {
          OR: [
            { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
            { supplier: { displayName: { contains: filters.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: listInclude,
      orderBy: { updatedAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);

  return { rows, total };
}

export async function findInvoiceById(organizationId: string, id: string) {
  return prisma.invoice.findFirst({
    where: { id, organizationId },
    include: detailInclude,
  });
}

export async function createInvoice(
  organizationId: string,
  data: Prisma.InvoiceUncheckedCreateInput
) {
  return prisma.invoice.create({
    data: { ...data, organizationId },
    include: listInclude,
  });
}

export async function updateInvoice(
  id: string,
  data: Prisma.InvoiceUncheckedUpdateInput
) {
  return prisma.invoice.update({
    where: { id },
    data,
    include: listInclude,
  });
}
