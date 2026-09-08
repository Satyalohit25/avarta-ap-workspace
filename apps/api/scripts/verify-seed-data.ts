import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Running ClearOps Seed Data Verification Assertions...");

  const [
    orgCount,
    userCount,
    supplierCount,
    poCount,
    invoiceCount,
    exceptionCount,
    approvalCount,
    scheduledPaymentCount,
    paidPaymentCount,
    pos,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.supplier.count(),
    prisma.purchaseOrder.count(),
    prisma.invoice.count(),
    prisma.exception.count({ where: { status: "OPEN" } }),
    prisma.approval.count({ where: { status: "PENDING" } }),
    prisma.payment.count({ where: { status: "SCHEDULED" } }),
    prisma.payment.count({ where: { status: "PAID" } }),
    prisma.purchaseOrder.findMany({ include: { supplier: true } }),
  ]);

  console.log(`- Organizations: ${orgCount}`);
  console.log(`- Users: ${userCount}`);
  console.log(`- Suppliers: ${supplierCount}`);
  console.log(`- Purchase Orders: ${poCount}`);
  console.log(`- Invoices: ${invoiceCount}`);
  console.log(`- Open Exceptions: ${exceptionCount}`);
  console.log(`- Pending Approvals: ${approvalCount}`);
  console.log(`- Scheduled Payments: ${scheduledPaymentCount}`);
  console.log(`- Paid Payments: ${paidPaymentCount}`);

  // Assertions
  assert(orgCount === 1, "Expected exactly 1 Organization");
  assert(userCount === 4, "Expected exactly 4 User roles");
  assert(supplierCount === 8, "Expected exactly 8 Suppliers");
  assert(poCount === 5, "Expected exactly 5 Purchase Orders");
  assert(invoiceCount === 17, "Expected exactly 17 Invoices");
  assert(exceptionCount === 4, "Expected exactly 4 Open Exceptions");
  assert(approvalCount === 2, "Expected exactly 2 Pending Approvals");
  assert(scheduledPaymentCount === 2, "Expected exactly 2 Scheduled Payments");

  // Assert PO Matching Status Formulas
  const po142 = pos.find((p) => p.poNumber === "PO-2026-0142");
  assert(po142?.matchingStatus === "MATCHED", "PO-2026-0142 must be MATCHED");
  assert(Number(po142?.remainingAmount) === 0, "PO-2026-0142 remaining must be 0");

  const po143 = pos.find((p) => p.poNumber === "PO-2026-0143");
  assert(po143?.matchingStatus === "PARTIAL", "PO-2026-0143 must be PARTIAL");
  assert(Number(po143?.utilizedAmount) === 127500, "PO-2026-0143 utilized must be 127,500");

  const po881 = pos.find((p) => p.poNumber === "PO-2026-0881");
  assert(po881?.matchingStatus === "PARTIAL", "PO-2026-0881 must be PARTIAL");
  assert(Number(po881?.utilizedAmount) === 16700, "PO-2026-0881 utilized must be 16,700 USD");

  const po990 = pos.find((p) => p.poNumber === "PO-2026-0990");
  assert(po990?.matchingStatus === "UNMATCHED", "PO-2026-0990 must be UNMATCHED");
  assert(po990?.supplier.status === "BLOCKED", "PO-2026-0990 supplier must be BLOCKED");

  console.log("-------------------------------------------------------");
  console.log("ALL SEED ASSERTIONS PASSED VERIFIED CLEANLY!");
  console.log("-------------------------------------------------------");
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`Assertion Failed: ${message}`);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("Verification failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
