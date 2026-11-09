import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";

export interface ListItemFilters {
  organizationId: string;
  search?: string;
  category?: string;
  status?: string;
}

function buildWhere(filters: ListItemFilters): Prisma.ItemWhereInput {
  return {
    organizationId: filters.organizationId,
    ...(filters.status && filters.status !== "ALL" ? { status: filters.status } : {}),
    ...(filters.category && filters.category !== "ALL" ? { category: filters.category } : {}),
    ...(filters.search
      ? {
          OR: [
            { itemCode: { contains: filters.search, mode: "insensitive" } },
            { description: { contains: filters.search, mode: "insensitive" } },
            { hsnSac: { contains: filters.search, mode: "insensitive" } },
            { category: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

export async function listItems(filters: ListItemFilters) {
  return prisma.item.findMany({
    where: { ...buildWhere(filters), organizationId: filters.organizationId },
    orderBy: [{ status: "asc" }, { itemCode: "asc" }],
  });
}

export async function findItemById(organizationId: string, id: string) {
  return prisma.item.findFirst({ where: { id, organizationId } });
}

export async function findItemByCode(organizationId: string, itemCode: string) {
  return prisma.item.findFirst({ where: { organizationId, itemCode } });
}

export async function createItem(data: Prisma.ItemUncheckedCreateInput) {
  return prisma.item.create({ data });
}

export async function updateItemStatus(organizationId: string, id: string, status: string) {
  const updated = await prisma.item.updateMany({
    where: { id, organizationId },
    data: { status },
  });
  if (updated.count === 0) return null;
  return findItemById(organizationId, id);
}
