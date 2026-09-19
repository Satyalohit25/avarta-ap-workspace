import { prisma } from "../../config/database";

export interface ListAuditLogsParams {
  organizationId: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  skip: number;
  take: number;
}

export async function findAuditLogs(params: ListAuditLogsParams) {
  const where = {
    organizationId: params.organizationId,
    ...(params.entityType ? { entityType: params.entityType } : {}),
    ...(params.entityId ? { entityId: params.entityId } : {}),
    ...(params.userId ? { userId: params.userId } : {}),
    ...(params.action ? { action: params.action } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { rows, total };
}
