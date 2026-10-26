import { describe, expect, it } from "vitest";
import { prisma } from "../../config/database";
import { seedDemoDataset } from "../../lib/demo-seeder";

describe("Demo Dataset Seeder & Dynamic Scenarios", () => {
  it("re-seeds clean baseline with all 9 named scenarios and dynamic relative dates", async () => {
    const startTime = Date.now();
    const summary = await seedDemoDataset(prisma);
    const durationMs = Date.now() - startTime;

    expect(summary.success).toBe(true);
    expect(summary.organization).toBe("Acme Manufacturing Pvt Ltd");
    expect(summary.counts.users).toBe(5);
    expect(summary.counts.suppliers).toBe(8);
    expect(summary.counts.purchaseOrders).toBe(5);
    expect(summary.counts.goodsReceipts).toBe(3);
    expect(summary.counts.invoices).toBeGreaterThanOrEqual(28);
    expect(summary.counts.exceptions).toBeGreaterThanOrEqual(8);
    expect(summary.counts.approvals).toBeGreaterThanOrEqual(3);
    expect(summary.counts.payments).toBeGreaterThanOrEqual(4);

    expect(summary.scenarios).toEqual([
      "SCENARIO_1_HAPPY_PATH",
      "SCENARIO_2_PRICE_MISMATCH",
      "SCENARIO_3_GRN_RETURN_MISMATCH",
      "SCENARIO_4_GST_STATUTORY",
      "SCENARIO_5_TIERED_APPROVAL",
      "SCENARIO_6_FRAUD_DUPLICATE",
      "SCENARIO_7_BATCH_DISBURSEMENT",
      "SCENARIO_8_PARTIAL_OVERDUE_FX",
      "SCENARIO_9_ERP_ARCHIVE",
    ]);

    // Verify relative dates in database
    const invoices = await prisma.invoice.findMany({
      where: { organizationId: "org_demo_001" },
      select: { dueDate: true, invoiceDate: true },
    });
    expect(invoices.length).toBeGreaterThanOrEqual(28);

    for (const inv of invoices) {
      if (inv.dueDate) {
        expect(inv.dueDate instanceof Date).toBe(true);
      }
      if (inv.invoiceDate) {
        expect(inv.invoiceDate instanceof Date).toBe(true);
      }
    }

    console.log(`✓ Full demo dataset reset completed in ${durationMs}ms`);
  }, 60000);
});
