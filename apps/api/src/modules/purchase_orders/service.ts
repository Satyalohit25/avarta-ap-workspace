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
      closedForReceiving: (po as unknown as { closedForReceiving?: boolean }).closedForReceiving ?? false,
      matchingStatus: po.matchingStatus,
      issueDate: po.issueDate,
      createdAt: po.createdAt,
      linkedInvoicesCount: po.invoices.length,
      goodsReceiptsCount: (po as unknown as { goodsReceipts?: unknown[] }).goodsReceipts?.length ?? 0,
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
    closedForReceiving: (po as unknown as { closedForReceiving?: boolean }).closedForReceiving ?? false,
    matchingStatus: po.matchingStatus,
    issueDate: po.issueDate,
    createdAt: po.createdAt,
    invoices: po.invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      totalAmount: inv.totalAmount.toString(),
      status: inv.status,
    })),
    goodsReceipts: (po as unknown as { goodsReceipts?: Array<{
      id: string;
      grnNumber: string;
      receiptDate: Date;
      vendorDeliveryNote?: string | null;
      status: string;
      comments?: string | null;
      lines: Array<{
        id: string;
        lineNumber: number;
        description: string;
        itemCode?: string | null;
        receivedQuantity: number | string;
        unitOfMeasure: string;
        status: string;
        inspectionNotes?: string | null;
      }>;
    }> }).goodsReceipts?.map((gr) => ({
      id: gr.id,
      grnNumber: gr.grnNumber,
      receiptDate: gr.receiptDate,
      vendorDeliveryNote: gr.vendorDeliveryNote,
      status: gr.status,
      comments: gr.comments,
      lines: gr.lines.map((l) => ({
        id: l.id,
        lineNumber: l.lineNumber,
        description: l.description,
        itemCode: l.itemCode,
        receivedQuantity: Number(l.receivedQuantity),
        unitOfMeasure: l.unitOfMeasure,
        status: l.status,
        inspectionNotes: l.inspectionNotes,
      })),
    })) ?? [],
  };
}

export async function togglePoReceivingStatus(organizationId: string, poId: string, closed: boolean) {
  await repo.updatePoReceivingStatus(organizationId, poId, closed);
  return getPurchaseOrder(organizationId, poId);
}

export async function createPurchaseOrder(
  organizationId: string,
  data: repo.CreatePoData
) {
  return repo.createPurchaseOrder(organizationId, data);
}

export async function recordGoodsReceipt(
  organizationId: string,
  poId: string,
  data: Parameters<typeof repo.createGoodsReceipt>[2]
) {
  const po = await repo.findPoById(organizationId, poId);
  if (!po) throw ApiError.notFound("Purchase Order not found");
  return repo.createGoodsReceipt(organizationId, poId, data);
}
