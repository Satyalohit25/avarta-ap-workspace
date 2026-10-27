/**
 * =============================================================================
 * AVARTA AP WORKSPACE — CLEAR ALL WORKSPACES TOOL
 * =============================================================================
 * Wipes all workspaces and user accounts to start completely fresh from 0.
 *
 * Usage:
 *   # Audit / Dry-run preview:
 *   pnpm --filter @ap-saas/api tsx scripts/clear-all-workspaces.ts
 *
 *   # Execute clear:
 *   pnpm --filter @ap-saas/api tsx scripts/clear-all-workspaces.ts --confirm-clear-all
 * =============================================================================
 */

import { PrismaClient } from "@prisma/client";

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient(
  dbUrl ? { datasources: { db: { url: dbUrl } } } : undefined
);

const isExecute = process.argv.includes("--confirm-clear-all");

async function main() {
  console.log("===============================================================================");
  console.log("   AVARTA AP WORKSPACE: RESET ALL WORKSPACES TOOL                              ");
  console.log("===============================================================================\n");

  const orgs = await prisma.organization.findMany({
    include: { _count: { select: { users: true } } },
  });

  console.log(`Found ${orgs.length} workspace(s) currently in database.`);

  if (orgs.length === 0) {
    console.log("Database is already completely clean (0 workspaces, 0 users).");
    return;
  }

  if (!isExecute) {
    console.log("\n===============================================================================");
    console.log("   PREVIEW MODE — NO RECORDS MODIFIED                                          ");
    console.log("===============================================================================");
    console.log("To delete ALL workspaces and start fresh, run with --confirm-clear-all:");
    console.log("  pnpm --filter @ap-saas/api tsx scripts/clear-all-workspaces.ts --confirm-clear-all\n");
    return;
  }

  for (const org of orgs) {
    const targetOrgId = org.id;
    console.log(`Purging workspace "${org.name}" (${targetOrgId})...`);

    await prisma.$transaction(async (tx) => {
      await tx.idempotencyKey.deleteMany({ where: { organizationId: targetOrgId } });
      await tx.auditLog.deleteMany({ where: { organizationId: targetOrgId } });
      await tx.notification.deleteMany({ where: { organizationId: targetOrgId } });

      await tx.comment.deleteMany({ where: { user: { organizationId: targetOrgId } } });
      await tx.workflowTransition.deleteMany({ where: { workflowInstance: { invoice: { organizationId: targetOrgId } } } });
      await tx.workflowInstance.deleteMany({ where: { invoice: { organizationId: targetOrgId } } });

      await tx.payment.deleteMany({ where: { organizationId: targetOrgId } });
      await tx.approval.deleteMany({ where: { invoice: { organizationId: targetOrgId } } });
      await tx.exception.deleteMany({ where: { organizationId: targetOrgId } });
      await tx.validation.deleteMany({ where: { invoice: { organizationId: targetOrgId } } });
      await tx.document.deleteMany({ where: { invoice: { organizationId: targetOrgId } } });

      await tx.invoiceLine.deleteMany({ where: { invoice: { organizationId: targetOrgId } } });
      await tx.invoice.deleteMany({ where: { organizationId: targetOrgId } });
      await tx.goodsReceiptLine.deleteMany({ where: { goodsReceipt: { organizationId: targetOrgId } } });
      await tx.goodsReceipt.deleteMany({ where: { organizationId: targetOrgId } });
      await tx.purchaseOrder.deleteMany({ where: { organizationId: targetOrgId } });
      await tx.supplier.deleteMany({ where: { organizationId: targetOrgId } });

      await tx.user.deleteMany({ where: { organizationId: targetOrgId } });
      await tx.organization.delete({ where: { id: targetOrgId } });
    }, {
      timeout: 60000,
      maxWait: 15000,
    });
  }

  console.log("\n[SUCCESS] All workspaces wiped. Database is now 100% fresh (0 workspaces, 0 users).");
}

main()
  .catch((e) => {
    console.error("Reset failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
