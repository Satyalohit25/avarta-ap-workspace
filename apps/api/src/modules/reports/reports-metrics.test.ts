import { describe, it, expect, vi, beforeEach } from "vitest";
import { getApAgingReport, getCashForecastReport, getOperationalReport } from "./service";
import { prisma } from "../../config/database";

vi.mock("../../config/database", () => ({
  prisma: {
    organization: {
      findUnique: vi.fn(),
    },
    invoice: {
      findMany: vi.fn(),
    },
    exception: {
      findMany: vi.fn(),
    },
  },
}));

describe("Reports Metrics - T-304 Financial Metrics, AP Aging Buckets & Forecast", () => {
  const orgId = "org-metrics-123";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      id: orgId,
      name: "Acme Metrics Org",
      timezone: "Asia/Kolkata",
    } as any);
  });

  describe("AP Aging Report (T-304)", () => {
    it("separates 'Not yet due' from '1 to 30 days overdue' across 5 distinct buckets", async () => {
      // Mock fixed reference date: today is 2026-06-15
      const now = new Date();
      const futureDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days in future -> Not Yet Due
      const overdue15d = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000); // 15 days overdue -> 1-30 Days Overdue
      const overdue45d = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000); // 45 days overdue -> 31-60 Days Overdue
      const overdue75d = new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000); // 75 days overdue -> 61-90 Days Overdue
      const overdue120d = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000); // 120 days overdue -> 91+ Days Overdue

      vi.mocked(prisma.invoice.findMany).mockResolvedValue([
        {
          id: "inv-1",
          organizationId: orgId,
          supplierId: "sup-1",
          supplier: { displayName: "Supplier Alpha" },
          totalAmount: 10000,
          dueDate: futureDate,
          status: "APPROVED",
        },
        {
          id: "inv-2",
          organizationId: orgId,
          supplierId: "sup-1",
          supplier: { displayName: "Supplier Alpha" },
          totalAmount: 20000,
          dueDate: overdue15d,
          status: "APPROVED",
        },
        {
          id: "inv-3",
          organizationId: orgId,
          supplierId: "sup-2",
          supplier: { displayName: "Supplier Beta" },
          totalAmount: 30000,
          dueDate: overdue45d,
          status: "SCHEDULED",
        },
        {
          id: "inv-4",
          organizationId: orgId,
          supplierId: "sup-2",
          supplier: { displayName: "Supplier Beta" },
          totalAmount: 40000,
          dueDate: overdue75d,
          status: "SCHEDULED",
        },
        {
          id: "inv-5",
          organizationId: orgId,
          supplierId: "sup-3",
          supplier: { displayName: "Supplier Gamma" },
          totalAmount: 50000,
          dueDate: overdue120d,
          status: "PENDING_APPROVAL",
        },
      ] as any);

      const report = await getApAgingReport(orgId);

      // Verify summary amounts
      expect(report.summary.notYetDue).toBe(10000);
      expect(report.summary.days1_30).toBe(20000);
      expect(report.summary.days31_60).toBe(30000);
      expect(report.summary.days61_90).toBe(40000);
      expect(report.summary.days91_plus).toBe(50000);
      expect(report.summary.totalOutstanding).toBe(150000);

      // Verify separate bucket array entries
      expect(report.buckets).toHaveLength(5);
      expect(report.buckets[0]).toEqual({
        label: "Not Yet Due",
        totalAmount: 10000,
        invoiceCount: 1,
      });
      expect(report.buckets[1]).toEqual({
        label: "1–30 Days Overdue",
        totalAmount: 20000,
        invoiceCount: 1,
      });
      expect(report.buckets[2]).toEqual({
        label: "31–60 Days Overdue",
        totalAmount: 30000,
        invoiceCount: 1,
      });
      expect(report.buckets[3]).toEqual({
        label: "61–90 Days Overdue",
        totalAmount: 40000,
        invoiceCount: 1,
      });
      expect(report.buckets[4]).toEqual({
        label: "91+ Days Overdue",
        totalAmount: 50000,
        invoiceCount: 1,
      });
    });
  });

  describe("Cash Forecast Report (T-304)", () => {
    it("includes already-overdue payables as the first row in the 30-day forecast", async () => {
      const now = new Date();
      const pastDue1 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      const pastDue2 = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
      const week1Due = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const week2Due = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

      vi.mocked(prisma.invoice.findMany).mockResolvedValue([
        {
          id: "inv-od-1",
          totalAmount: 15000,
          dueDate: pastDue1,
          status: "APPROVED",
        },
        {
          id: "inv-od-2",
          totalAmount: 25000,
          dueDate: pastDue2,
          status: "APPROVED",
        },
        {
          id: "inv-w1",
          totalAmount: 50000,
          dueDate: week1Due,
          status: "SCHEDULED",
        },
        {
          id: "inv-w2",
          totalAmount: 70000,
          dueDate: week2Due,
          status: "SCHEDULED",
        },
      ] as any);

      const forecast = await getCashForecastReport(orgId);

      expect(forecast.overdueAmount).toBe(40000); // 15000 + 25000
      expect(forecast.weeks).toHaveLength(5); // Week 0 (Overdue) + 4 forward weeks

      // First row MUST be Overdue Payables
      const firstRow = forecast.weeks[0];
      expect(firstRow.weekNumber).toBe(0);
      expect(firstRow.label).toBe("Overdue Payables");
      expect(firstRow.projectedAmount).toBe(40000);
      expect(firstRow.paymentCount).toBe(2);

      // Forward weeks
      expect(forecast.weeks[1].weekNumber).toBe(1);
      expect(forecast.weeks[1].projectedAmount).toBe(50000);
      expect(forecast.weeks[2].weekNumber).toBe(2);
      expect(forecast.weeks[2].projectedAmount).toBe(70000);
    });
  });

  describe("Operational Report: STP Rate & AP Cycle Time (T-304)", () => {
    it("returns null ('No data') for No-exception STP rate when total invoices is zero", async () => {
      vi.mocked(prisma.invoice.findMany).mockResolvedValue([]);
      vi.mocked(prisma.exception.findMany).mockResolvedValue([]);

      const report = await getOperationalReport(orgId, "30d");

      expect(report.kpis.straightThroughRate.title).toBe("No-exception Rate");
      expect(report.kpis.straightThroughRate.value).toBe("No data");
      expect(report.kpis.straightThroughRate.subtitle).toBe("No invoices in period");

      expect(report.kpis.avgCycleTime.title).toBe("Intake-to-Payment Cycle Time");
      expect(report.kpis.avgCycleTime.value).toBe("No data");
    });

    it("calculates AP cycle time strictly from receivedAt (createdAt) to paidAt (settlementDate)", async () => {
      const receivedDate = new Date("2026-05-01T10:00:00Z");
      const settledDate = new Date("2026-05-03T10:00:00Z"); // Exactly 48 hours later
      const irrelevantUpdatedAt = new Date("2026-05-10T12:00:00Z"); // Should NOT be used

      vi.mocked(prisma.invoice.findMany).mockResolvedValue([
        {
          id: "inv-paid-1",
          organizationId: orgId,
          status: "PAID",
          totalAmount: 50000,
          createdAt: receivedDate,
          updatedAt: irrelevantUpdatedAt,
          exceptions: [],
          payments: [
            {
              id: "pay-1",
              status: "PAID",
              settlementDate: settledDate,
              processedAt: settledDate,
            },
          ],
        },
      ] as any);
      vi.mocked(prisma.exception.findMany).mockResolvedValue([]);

      const report = await getOperationalReport(orgId, "30d");

      // 48.0 Hours cycle time
      expect(report.kpis.avgCycleTime.value).toBe("48.0 Hours");
      // Touchless / No-exception rate with 1 clean invoice is 100.0%
      expect(report.kpis.straightThroughRate.value).toBe("100.0%");
    });
  });
});
