import { PrismaClient } from "@prisma/client";
import { seedDemoDataset } from "../src/lib/demo-seeder";

const prisma = new PrismaClient();

async function main() {
  console.log("-------------------------------------------------------");
  console.log("Avarta AP Workspace: Executing Dynamic Demo Seeder...");
  console.log("-------------------------------------------------------");

  const summary = await seedDemoDataset(prisma);

  console.log("-------------------------------------------------------");
  console.log("Avarta Seed Refresh Completed Successfully!");
  console.log("-------------------------------------------------------");
  console.log("Seeded Entities:");
  console.log(` - Organizations: ${summary.counts.organizations} (${summary.organization})`);
  console.log(` - Users: ${summary.counts.users} (admin, manager, executive, approver, readonly)`);
  console.log(` - Suppliers: ${summary.counts.suppliers}`);
  console.log(` - Purchase Orders: ${summary.counts.purchaseOrders} + Goods Receipts: ${summary.counts.goodsReceipts}`);
  console.log(` - Invoices: ${summary.counts.invoices} across 9 Named Demo Scenarios`);
  console.log(` - Open Exceptions: ${summary.counts.exceptions}`);
  console.log(` - Pending Approvals: ${summary.counts.approvals}`);
  console.log(` - Payments: ${summary.counts.payments}`);
  console.log("Active Scenarios:", summary.scenarios.join(", "));
  console.log("All dates dynamically anchored to:", summary.seededAt);
  console.log("Standard Login Credentials (password123 for all):");
  console.log("  admin@avarta.dev (or @clearops.dev)      (Administrator)");
  console.log("  manager@avarta.dev (or @clearops.dev)    (Finance Manager)");
  console.log("  executive@avarta.dev (or @clearops.dev)  (Finance Executive)");
  console.log("  approver@avarta.dev (or @clearops.dev)   (Approver)");
  console.log("  readonly@avarta.dev (or @clearops.dev)   (Read Only)");
  console.log("-------------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("Seed execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
