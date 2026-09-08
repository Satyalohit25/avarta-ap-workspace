import { prisma } from "../../config/database";

export interface ListPoParams {
  organizationId: string;
  supplierId?: string;
  status?: string;
  search?: string;
  page: number;
  pageSize: number;
}

export async function listPurchaseOrders(params: ListPoParams) {
  const where = {
    organizationId: params.organizationId,
    ...(params.supplierId ? { supplierId: params.supplierId } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.search
      ? {
          poNumber: { contains: params.search, mode: "insensitive" as const },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: { supplier: true, invoices: true },
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return { rows, total };
}

export async function findPoById(organizationId: string, id: string) {
  return prisma.purchaseOrder.findFirst({
    where: { id, organizationId },
    include: { supplier: true, invoices: true },
  });
}

export interface CreatePoData {
  supplierId: string;
  poNumber: string;
  currency?: string;
  issueDate?: Date;
  totalAmount: number | string;
}

export async function createPurchaseOrder(organizationId: string, data: CreatePoData) {
  const amount = Number(data.totalAmount);
  return prisma.purchaseOrder.create({
    data: {
      organizationId,
      supplierId: data.supplierId,
      poNumber: data.poNumber,
      currency: data.currency ?? "INR",
      issueDate: data.issueDate ?? new Date(),
      totalAmount: amount,
      utilizedAmount: 0,
      remainingAmount: amount,
      status: "OPEN",
      matchingStatus: "UNMATCHED",
    },
    include: { supplier: true },
  });
}
