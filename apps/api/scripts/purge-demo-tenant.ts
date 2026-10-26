/**
 * =============================================================================
 * AVARTA AP WORKSPACE — TARGETED DEMO TENANT PURGE SCRIPT
 * =============================================================================
 * 
 * ARCHITECTURAL SAFETY CONSTRAINTS & COMPLIANCE:
 * 1. AGENTS.md Rule 3 Exception: Entity deletion is strictly prohibited in Avarta.
 *    This script represents a ONE-TIME, DEMO-ONLY EXCEPTION exclusively intended
 *    to eradicate synthetic demo records seeded during development/testing.
 *    MANDATORY PRE-REQUISITE: An active Neon branch or backup snapshot must be
 *    created in the Neon console before executing this script with deletion enabled.
 * 
 * 2. AGENTS.md Rule 7 Tenant Isolation:
 *    - All deletions strictly scope to `where: { organizationId: targetOrgId }`.
 *    - Never delete users by email across organizations.
 *    - Users with demo emails residing in non-demo organizations are audited, listed,
 *      and STRICTLY PRESERVED.
 * 
 * 3. Default Execution Mode:
 *    - DEFAULT IS AUDIT-ONLY (READ-ONLY).
 *    - To execute deletion, the operator MUST supply BOTH flags:
 *      --confirm-purge-demo
 *      --target-org-id=org_demo_001
 * =============================================================================
 */

import { PrismaClient } from "@prisma/client";

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient(
  dbUrl ? { datasources: { db: { url: dbUrl } } } : undefined
);

const DEMO_EMAILS = [
  "admin@avarta.dev",
  "manager@avarta.dev",
  "executive@avarta.dev",
  "approver@avarta.dev",
  "readonly@avarta.dev",
  "admin@clearops.dev",
  "manager@clearops.dev",
  "executive@clearops.dev",
  "approver@clearops.dev",
  "readonly@clearops.dev",
];

function getHostDescription(urlStr?: string): string {
  if (!urlStr) return "default (Prisma schema url)";
  try {
    const parsed = new URL(urlStr);
    return `${parsed.protocol}//${parsed.username ? parsed.username + "@" : ""}${parsed.host}${parsed.pathname}`;
  } catch {
    return "custom-url";
  }
}

async function main() {
  console.log("===============================================================================");
  console.log("   AVARTA AP WORKSPACE: DEMO TENANT AUDIT & PURGE TOOL (AGENTS.md RULE 7)      ");
  console.log("===============================================================================");
  console.log(`Database Target: ${getHostDescription(dbUrl)}`);

  const hasConfirmFlag = process.argv.includes("--confirm-purge-demo");
  const targetOrgArg = process.argv.find((a) => a.startsWith("--target-org-id="));
  const targetOrgId = targetOrgArg ? targetOrgArg.split("=")[1] : undefined;
  const isAuditOnly = !hasConfirmFlag || !targetOrgId;

  console.log(`Execution Mode:  ${isAuditOnly ? "READ-ONLY AUDIT (--audit-only)" : "ACTIVE SURGICAL PURGE"}`);
  if (!isAuditOnly) {
    console.log(`Target Org ID:   "${targetOrgId}"`);
  }
  console.log("===============================================================================\n");

  // 1. Audit ALL organizations currently in target database
  const allOrgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: {
        select: {
          users: true,
          invoices: true,
          suppliers: true,
          purchaseOrders: true,
          payments: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`=== [STEP 1] DATABASE TENANT AUDIT: ALL ORGANIZATIONS (${allOrgs.length} found) ===`);
  for (const org of allOrgs) {
    const isTarget = targetOrgId ? org.id === targetOrgId : org.id === "org_demo_001";
    console.log(
      ` [${isTarget ? "TARGET DEMO TENANT" : "PRESERVED REAL TENANT"}] ID: "${org.id}" | Name: "${org.name}"\n` +
      `   Counts: Users: ${org._count.users} | Invoices: ${org._count.invoices} | Suppliers: ${org._count.suppliers} | POs: ${org._count.purchaseOrders} | Payments: ${org._count.payments}\n` +
      `   Created: ${org.createdAt.toISOString()}`
    );
  }

  // 2. Audit all users belonging to target demo organization
  const demoOrgId = targetOrgId || "org_demo_001";
  const demoOrgUsers = await prisma.user.findMany({
    where: {
      organizationId: demoOrgId,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      organizationId: true,
    },
  });

  console.log(`\n=== [STEP 2] AUDIT TARGET ORG USERS ("${demoOrgId}"): ${demoOrgUsers.length} found ===`);
  for (const u of demoOrgUsers) {
    console.log(` - ID: "${u.id}" | Email: "${u.email}" | Name: "${u.fullName}" | Role: ${u.role}`);
  }

  // 3. Cross-tenant safety audit: Find any users with demo emails in OTHER organizations
  const crossTenantDemoUsers = await prisma.user.findMany({
    where: {
      email: { in: DEMO_EMAILS },
      organizationId: { not: demoOrgId },
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      organizationId: true,
    },
  });

  console.log(`\n=== [STEP 3] CROSS-TENANT USER SAFETY AUDIT ===`);
  if (crossTenantDemoUsers.length > 0) {
    console.log(
      `[CRITICAL NOTICE] Found ${crossTenantDemoUsers.length} user(s) with demo emails in OTHER organizations.\n` +
      `PER AGENTS.md RULE 7, THESE WILL NEVER BE DELETED BY THIS SCRIPT:`
    );
    for (const u of crossTenantDemoUsers) {
      console.log(` [PRESERVED USER] ID: "${u.id}" | Email: "${u.email}" | Org: "${u.organizationId}"`);
    }
  } else {
    console.log("No demo email accounts found in other organizations. Safe to proceed.");
  }

  // If in read-only audit mode, exit cleanly here
  if (isAuditOnly) {
    console.log("\n===============================================================================");
    console.log("   AUDIT COMPLETE — NO RECORDS WERE MODIFIED OR DELETED (READ-ONLY)            ");
    console.log("===============================================================================");
    console.log("To execute the purge, you must explicitly supply both CLI parameters:");
    console.log(`  npx tsx scripts/purge-demo-tenant.ts --confirm-purge-demo --target-org-id=${demoOrgId}`);
    console.log("MANDATORY PRE-REQUISITE: Ensure a Neon backup/branch snapshot has been completed.");
    return;
  }

  // 4. Execution Mode: Require exact target organization match
  const targetOrg = allOrgs.find((o) => o.id === targetOrgId);
  if (!targetOrg) {
    console.log(`\n[ABORT] Target organization "${targetOrgId}" does not exist in database. Nothing to purge.`);
    return;
  }

  console.log(`\n===============================================================================`);
  console.log(`   COMMENCING SURGICAL PURGE OF DEMO TENANT "${targetOrgId}"                     `);
  console.log(`===============================================================================\n`);

  // Count entities to be deleted before beginning transaction
  const counts = {
    idempotencyKeys: await prisma.idempotencyKey.count({ where: { organizationId: targetOrgId } }),
    auditLogs: await prisma.auditLog.count({ where: { organizationId: targetOrgId } }),
    notifications: await prisma.notification.count({ where: { organizationId: targetOrgId } }),
    payments: await prisma.payment.count({ where: { organizationId: targetOrgId } }),
    exceptions: await prisma.exception.count({ where: { organizationId: targetOrgId } }),
    approvals: await prisma.approval.count({ where: { invoice: { organizationId: targetOrgId } } }),
    invoices: await prisma.invoice.count({ where: { organizationId: targetOrgId } }),
    invoiceLines: await prisma.invoiceLine.count({ where: { invoice: { organizationId: targetOrgId } } }),
    suppliers: await prisma.supplier.count({ where: { organizationId: targetOrgId } }),
    purchaseOrders: await prisma.purchaseOrder.count({ where: { organizationId: targetOrgId } }),
    goodsReceipts: await prisma.goodsReceipt.count({ where: { organizationId: targetOrgId } }),
    users: await prisma.user.count({ where: { organizationId: targetOrgId } }),
  };

  console.log("Pre-Deletion Entity Counts for Target Org:");
  console.log(JSON.stringify(counts, null, 2));

  await prisma.$transaction(async (tx) => {
    // 1. Ancillary & Audit
    await tx.idempotencyKey.deleteMany({ where: { organizationId: targetOrgId } });
    await tx.auditLog.deleteMany({ where: { organizationId: targetOrgId } });
    await tx.notification.deleteMany({ where: { organizationId: targetOrgId } });

    // 2. Comments, Transitions, Workflow
    await tx.comment.deleteMany({ where: { user: { organizationId: targetOrgId } } });
    await tx.workflowTransition.deleteMany({ where: { workflowInstance: { invoice: { organizationId: targetOrgId } } } });
    await tx.workflowInstance.deleteMany({ where: { invoice: { organizationId: targetOrgId } } });

    // 3. Financials
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

    // 5. Users — STRICTLY by organizationId only (Never by email across organizations)
    const usr = await tx.user.deleteMany({
      where: {
        organizationId: targetOrgId,
      },
    });

    // 6. Organization itself
    await tx.organization.delete({
      where: {
        id: targetOrgId,
      },
    });

    console.log(`\n[PURGE SUCCESSFUL] Target organization "${targetOrgId}" and ${usr.count} user accounts completely removed.`);
  }, {
    timeout: 60000,
    maxWait: 15000,
  });
}

main()
  .catch((e) => {
    console.error("Purge tool failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
