import { ApiError } from "../../lib/errors";
import { parsePagination, paginationMeta } from "../../lib/pagination";
import * as repo from "./repository";

export async function listPurchaseOrders(params: {
  organizationId: string;
  supplierId?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { page, pageSize } = parsePagination({ page: params.page, pageSize: params.pageSize });
  const { rows, total } = await repo.listPurchaseOrders({
    organizationId: params.organizationId,
    supplierId: params.supplierId,
    status: params.status,
    search: params.search,
    page,
    pageSize,
  });

  return {
    data: rows.map((po) => ({
      id: po.id,
      poNumber: po.poNumber,
      supplierId: po.supplierId,
      vendor: po.supplier?.displayName ?? "Unknown",
      currency: po.currency,
      totalAmount: po.totalAmount.toString(),
      utilizedAmount: po.utilizedAmount.toString(),
      remainingAmount: po.remainingAmount.toString(),
      status: po.status,
      matchingStatus: po.matchingStatus,
      issueDate: po.issueDate,
      createdAt: po.createdAt,
      linkedInvoicesCount: po.invoices.length,
    })),
    meta: paginationMeta(page, pageSize, total),
  };
}

export async function getPurchaseOrder(organizationId: string, id: string) {
  const po = await repo.findPoById(organizationId, id);
  if (!po) throw ApiError.notFound("Purchase Order not found");

  return {
    id: po.id,
    poNumber: po.poNumber,
    supplierId: po.supplierId,
    vendor: po.supplier?.displayName ?? "Unknown",
    currency: po.currency,
    totalAmount: po.totalAmount.toString(),
    utilizedAmount: po.utilizedAmount.toString(),
    remainingAmount: po.remainingAmount.toString(),
    status: po.status,
    matchingStatus: po.matchingStatus,
    issueDate: po.issueDate,
    createdAt: po.createdAt,
    invoices: po.invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      totalAmount: inv.totalAmount.toString(),
      status: inv.status,
    })),
  };
}

export async function createPurchaseOrder(
  organizationId: string,
  data: repo.CreatePoData
) {
  return repo.createPurchaseOrder(organizationId, data);
}
