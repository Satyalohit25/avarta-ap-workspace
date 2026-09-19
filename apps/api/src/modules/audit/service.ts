import { parsePagination, paginationMeta } from "../../lib/pagination";
import * as repo from "./repository";

export interface ListAuditParams {
  organizationId: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  page?: number;
  pageSize?: number;
}

export async function listAuditLogs(params: ListAuditParams) {
  const { page, pageSize } = parsePagination({ page: params.page, pageSize: params.pageSize });
  const { rows, total } = await repo.findAuditLogs({
    organizationId: params.organizationId,
    entityType: params.entityType,
    entityId: params.entityId,
    userId: params.userId,
    action: params.action,
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    data: rows.map((log) => ({
      id: log.id,
      organizationId: log.organizationId,
      userId: log.userId,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      beforeData: log.beforeData,
      afterData: log.afterData,
      result: log.result,
      createdAt: log.createdAt,
    })),
    meta: paginationMeta(page, pageSize, total),
  };
}
