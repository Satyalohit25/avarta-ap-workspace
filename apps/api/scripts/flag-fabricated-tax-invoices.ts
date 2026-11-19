import { prisma } from "../src/config/database";

/**
 * T-107 Migration Script: Identify and flag invoices created with the 85% fallback.
 * Rule: Do not silently alter historical invoices. Instead, identify them and flag
 * them for user review by creating MISSING_TAX_DATA exceptions.
 */
export async function identifyAndFlagFabricatedTaxInvoices() {
  console.log("Searching for invoices created with 85% tax fallback...");

  const allInvoices = await prisma.invoice.findMany({
    where: {
      totalAmount: { gt: 0 },
      subtotalAmount: { not: null },
      status: { notIn: ["PAID", "ARCHIVED", "SYNCED"] },
    },
    select: {
      id: true,
      organizationId: true,
      invoiceNumber: true,
      totalAmount: true,
      subtotalAmount: true,
      taxAmount: true,
      status: true,
    },
  });

  const fabricated: typeof allInvoices = [];

  for (const inv of allInvoices) {
    const total = Number(inv.totalAmount);
    const subtotal = Number(inv.subtotalAmount);
    const expectedFabricated = Math.round(total * 0.85 * 100) / 100;

    // Check if subtotal is within 1 cent of 85% of total
    if (Math.abs(subtotal - expectedFabricated) < 0.01) {
      fabricated.push(inv);
    }
  }

  console.log(`Found ${fabricated.length} candidate invoice(s) with suspected 85% fallback data.`);

  let flaggedCount = 0;
  for (const inv of fabricated) {
    const existing = await prisma.exception.findFirst({
      where: {
        invoiceId: inv.id,
        type: "MISSING_TAX_DATA",
      },
    });

    if (!existing) {
      await prisma.exception.create({
        data: {
          organizationId: inv.organizationId,
          invoiceId: inv.id,
          type: "MISSING_TAX_DATA",
          severity: "HIGH",
          title: "Tax Data Review: Historical 85% Fallback Detected",
          description: `Invoice ${inv.invoiceNumber} subtotal (${inv.subtotalAmount}) appears to have been fabricated using historical 85% fallback. Requires manual verification of statutory tax amounts.`,
          status: "OPEN",
        },
      });
      flaggedCount++;
    }
  }

  console.log(`Flagged ${flaggedCount} invoice(s) with MISSING_TAX_DATA review exception.`);
  return { candidatesFound: fabricated.length, flaggedCount, invoices: fabricated };
}

if (require.main === module) {
  identifyAndFlagFabricatedTaxInvoices()
    .then((res) => {
      console.log("Migration script completed:", res);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration script failed:", err);
      process.exit(1);
    });
}
