import { describe, expect, it, vi } from "vitest";
import { listAuditLogs } from "./service";
import { prisma } from "../../config/database";

describe("Audit-as-a-Tab Backend API (Step 7)", () => {
  it("returns paginated audit logs filtered by organization and entity", async () => {
    const mockLogs = [
      {
        id: "audit-1",
        organizationId: "org-1",
        userId: "user-1",
        action: "WORKFLOW_TRANSITION",
        entityType: "invoice",
        entityId: "inv-123",
        beforeData: { state: "RECEIVED" },
        afterData: { state: "VALIDATING" },
        result: "SUCCESS",
        createdAt: new Date("2026-09-01T10:00:00Z"),
      },
      {
        id: "audit-2",
        organizationId: "org-1",
        userId: "user-1",
        action: "WORKFLOW_TRANSITION",
        entityType: "invoice",
        entityId: "inv-123",
        beforeData: { state: "VALIDATING" },
        afterData: { state: "VALIDATED" },
        result: "SUCCESS",
        createdAt: new Date("2026-09-01T10:01:00Z"),
      },
    ];

    vi.spyOn(prisma.auditLog, "findMany").mockResolvedValue(mockLogs as any);
    vi.spyOn(prisma.auditLog, "count").mockResolvedValue(2);

    const result = await listAuditLogs({
      organizationId: "org-1",
      entityType: "invoice",
      entityId: "inv-123",
      page: 1,
      pageSize: 10,
    });

    expect(result.data).toHaveLength(2);
    expect(result.data[0].action).toBe("WORKFLOW_TRANSITION");
    expect(result.data[0].entityId).toBe("inv-123");
    expect(result.meta.total).toBe(2);
    expect(result.meta.page).toBe(1);
  });
});
