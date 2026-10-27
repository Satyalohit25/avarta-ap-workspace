/**
 * =============================================================================
 * AVARTA AP WORKSPACE — CLEAR SECONDARY (CLIENT) WORKSPACE TOOL
 * =============================================================================
 * Allows the primary administrator to reset/clear secondary client showcase
 * workspaces so another client can self-serve signup, while keeping the
 * primary Administrator workspace 100% preserved.
 *
 * Usage:
 *   # Audit / Dry-run preview:
 *   pnpm --filter @ap-saas/api tsx scripts/clear-client-workspace.ts
 *
 *   # Execute clear:
 *   pnpm --filter @ap-saas/api tsx scripts/clear-client-workspace.ts --confirm-clear
 * =============================================================================
 */

import { PrismaClient } from "@prisma/client";

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient(
  dbUrl ? { datasources: { db: { url: dbUrl } } } : undefined
);

const isExecute = process.argv.includes("--confirm-clear");

async function main() {
  console.log("===============================================================================");
  console.log("   AVARTA AP WORKSPACE: CLIENT WORKSPACE RESET TOOL                            ");
  console.log("===============================================================================\n");

  const allOrgs = await prisma.organization.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: {
          users: true,
          invoices: true,
          payments: true,
        },
      },
    },
  });

  if (allOrgs.length === 0) {
    console.log("[INFO] Database is currently empty (0 organizations, 0 users).");
    console.log("Public signup is fully open. You can sign up your Admin account on /signup.");
    return;
  }

  const primaryAdminOrg = allOrgs[0];
  const clientOrgs = allOrgs.slice(1);

  console.log(`[PRIMARY ADMIN WORKSPACE - PRESERVED]`);
  console.log(` - ID: "${primaryAdminOrg.id}" | Name: "${primaryAdminOrg.name}"`);
  console.log(`   Users: ${primaryAdminOrg._count.users} | Invoices: ${primaryAdminOrg._count.invoices} | Created: ${primaryAdminOrg.createdAt.toISOString()}\n`);

  if (clientOrgs.length === 0) {
    console.log("[INFO] No secondary client workspace found.");
    console.log(`Current workspace count is 1 of 2. Public signup is currently OPEN for a client.`);
    return;
  }

  console.log(`[SECONDARY CLIENT WORKSPACE(S) IDENTIFIED FOR CLEARING (${clientOrgs.length})]:`);
  for (const org of clientOrgs) {
    console.log(` - ID: "${org.id}" | Name: "${org.name}"`);
    console.log(`   Users: ${org._count.users} | Invoices: ${org._count.invoices} | Created: ${org.createdAt.toISOString()}`);
  }

  if (!isExecute) {
    console.log("\n===============================================================================");
    console.log("   PREVIEW MODE — NO RECORDS MODIFIED                                          ");
    console.log("===============================================================================");
    console.log("To delete the client workspace(s) and re-open public signup, run:");
    console.log("  pnpm --filter @ap-saas/api tsx scripts/clear-client-workspace.ts --confirm-clear\n");
    return;
  }

  for (const org of clientOrgs) {
    const targetOrgId = org.id;
    console.log(`\nPurging client workspace "${org.name}" (${targetOrgId})...`);

    await prisma.$transaction(async (tx) => {
      // 1. Ancillary & Audit
      await tx.idempotencyKey.deleteMany({ where: { organizationId: targetOrgId } });
      await tx.auditLog.deleteMany({ where: { organizationId: targetOrgId } });
      await tx.notification.deleteMany({ where: { organizationId: targetOrgId } });

      // 2. Comments, Transitions, Workflow
      await tx.comment.deleteMany({ where: { user: { organizationId: targetOrgId } } });
      await tx.workflowTransition.deleteMany({ where: { workflowInstance: { invoice: { organizationId: targetOrgId } } } });
      await tx.workflowInstance.deleteMany({ where: { invoice: { organizationId: targetOrgId } } });

      // 3. Financials & Exceptions
      await tx.payment.deleteMany({ where: { organizationId: targetOrgId } });
      await tx.approval.deleteMany({ where: { invoice: { organizationId: targetOrgId } } });
      await tx.exception.deleteMany({ where: { organizationId: targetOrgId } });
      await tx.validation.deleteMany({ where: { invoice: { organizationId: targetOrgId } } });
      await tx.document.deleteMany({ where: { invoice: { organizationId: targetOrgId } } });

      // 4. Invoices & POs
      await tx.invoiceLine.deleteMany({ where: { invoice: { organizationId: targetOrgId } } });
      await tx.invoice.deleteMany({ where: { organizationId: targetOrgId } });
      await tx.goodsReceiptLine.deleteMany({ where: { goodsReceipt: { organizationId: targetOrgId } } });
      await tx.goodsReceipt.deleteMany({ where: { organizationId: targetOrgId } });
      await tx.purchaseOrder.deleteMany({ where: { organizationId: targetOrgId } });
      await tx.supplier.deleteMany({ where: { organizationId: targetOrgId } });

      // 5. Users
      await tx.user.deleteMany({ where: { organizationId: targetOrgId } });

      // 6. Organization record
      await tx.organization.delete({ where: { id: targetOrgId } });
    }, {
      timeout: 60000,
      maxWait: 15000,
    });

    console.log(`[SUCCESS] Purged client workspace "${org.name}".`);
  }

  console.log("\n===============================================================================");
  console.log("   RESET COMPLETE: Public signup is now RE-OPENED for the next client!         ");
  console.log("   Active workspaces: 1 of 2 (Primary Admin preserved).                        ");
  console.log("===============================================================================\n");
}

main()
  .catch((err) => {
    console.error("Failed to clear client workspace:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
