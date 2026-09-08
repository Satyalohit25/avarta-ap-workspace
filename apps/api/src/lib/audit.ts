import { prisma } from "../config/database";

interface AuditEntry {
  organizationId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeData?: unknown;
  afterData?: unknown;
  result?: "SUCCESS" | "FAILURE";
}

// Doc 04 rule: every transition creates an audit event. Doc 13 rule:
// audit records are immutable — this is the only place rows are written
// into audit_logs; nothing ever updates or deletes them afterward.
export async function recordAudit(entry: AuditEntry) {
  await prisma.auditLog.create({
    data: {
      organizationId: entry.organizationId,
      userId: entry.userId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      beforeData: entry.beforeData as unknown as never,
      afterData: entry.afterData as unknown as never,
      result: entry.result ?? "SUCCESS",
    },
  });
}
