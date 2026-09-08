import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";

interface ListFilters {
  organizationId: string;
  status?: string;
  search?: string;
  page: number;
  pageSize: number;
}

export async function listSuppliers(filters: ListFilters) {
  const where: Prisma.SupplierWhereInput = {
    organizationId: filters.organizationId,
    ...(filters.status ? { status: filters.status as unknown as never } : {}),
    ...(filters.search
      ? {
          OR: [
            { displayName: { contains: filters.search, mode: "insensitive" } },
            { legalName: { contains: filters.search, mode: "insensitive" } },
            { gstNumber: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      orderBy: { displayName: "asc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      include: { _count: { select: { invoices: true } } },
    }),
    prisma.supplier.count({ where }),
  ]);

  return { rows, total };
}

export async function findSupplierById(organizationId: string, id: string) {
  return prisma.supplier.findFirst({
    where: { id, organizationId },
    include: { invoices: { orderBy: { updatedAt: "desc" }, take: 20 } },
  });
}

export async function createSupplier(organizationId: string, data: Prisma.SupplierUncheckedCreateInput) {
  return prisma.supplier.create({ data: { ...data, organizationId } });
}
