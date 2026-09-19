import { describe, expect, it, vi } from "vitest";
import { getApAgingReport, getCashForecastReport } from "./service";
import { prisma } from "../../config/database";

describe("AP Aging & Cash Forecast Reports (Step 11)", () => {
  it("calculates AP aging buckets and groups by vendor", async () => {
    const now = new Date();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

    const mockInvoices = [
      {
        id: "inv-1",
        totalAmount: 10000 as any,
        dueDate: daysAgo(10), // current (0-30)
        supplierId: "sup-1",
        supplier: { displayName: "Acme Industrial" },
      },
      {
        id: "inv-2",
        totalAmount: 20000 as any,
        dueDate: daysAgo(45), // 31-60
        supplierId: "sup-1",
        supplier: { displayName: "Acme Industrial" },
      },
      {
        id: "inv-3",
        totalAmount: 30000 as any,
        dueDate: daysAgo(75), // 61-90
        supplierId: "sup-2",
        supplier: { displayName: "Beta Logistics" },
      },
      {
        id: "inv-4",
        totalAmount: 40000 as any,
        dueDate: daysAgo(120), // 91+
        supplierId: "sup-2",
        supplier: { displayName: "Beta Logistics" },
      },
    ];

    vi.spyOn(prisma.invoice, "findMany").mockResolvedValue(mockInvoices as any);

    const report = await getApAgingReport("org-1");

    expect(report.summary.totalOutstanding).toBe(100000);
    expect(report.summary.current).toBe(10000);
    expect(report.summary.days31_60).toBe(20000);
    expect(report.summary.days61_90).toBe(30000);
    expect(report.summary.days91_plus).toBe(40000);

    expect(report.byVendor).toHaveLength(2);
    expect(report.buckets).toHaveLength(4);
  });

  it("calculates rolling 4-week cash requirements forecast", async () => {
    const now = new Date();
    const daysInFuture = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

    const mockInvoices = [
      {
        id: "inv-w1",
        totalAmount: 15000 as any,
        dueDate: daysInFuture(3), // Week 1
      },
      {
        id: "inv-w2",
        totalAmount: 25000 as any,
        dueDate: daysInFuture(10), // Week 2
      },
    ];

    vi.spyOn(prisma.invoice, "findMany").mockResolvedValue(mockInvoices as any);

    const forecast = await getCashForecastReport("org-1");

    expect(forecast.weeks).toHaveLength(4);
    expect(forecast.weeks[0].projectedAmount).toBe(15000);
    expect(forecast.weeks[1].projectedAmount).toBe(25000);
    expect(forecast.totalNext30Days).toBe(40000);
  });
});
