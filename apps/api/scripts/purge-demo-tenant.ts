import { PrismaClient } from "@prisma/client";

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient(
  dbUrl ? { datasources: { db: { url: dbUrl } } } : undefined
);

const DEMO_ORG_ID = "org_demo_001";
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

async function main() {
  console.log("=======================================================");
  console.log("Avarta AP: Targeted Demo Tenant & User Purge Script");
  console.log("=======================================================");

  const isProd = process.env.NODE_ENV === "production";
  if (isProd && !process.argv.includes("--confirm-purge-demo")) {
    console.error(
      "FATAL SAFETY ABORT: To execute demo purge in production, you must supply --confirm-purge-demo"
    );
    process.exit(1);
  }

  // 1. Audit ALL current organizations in database (SELECT id, name, createdAt FROM "Organization")
  const allOrgs = await prisma.organization.findMany({
    select: { id: true, name: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`\n=== DATABASE TENANT AUDIT: ALL CURRENT ORGANIZATIONS (${allOrgs.length}) ===`);
  for (const org of allOrgs) {
    const isDemo = org.id === DEMO_ORG_ID;
    console.log(
      ` [${isDemo ? "TARGET: DEMO" : "PRESERVE: REAL"}] ID: "${org.id}" | Name: "${org.name}" | Created: ${org.createdAt.toISOString()}`
    );
  }

  const nonDemoOrgs = allOrgs.filter((o) => o.id !== DEMO_ORG_ID);
  if (nonDemoOrgs.length > 0) {
    console.log(`\n[SAFETY NOTICE] Found ${nonDemoOrgs.length} non-demo organization(s) in database. These will be STRICTLY PRESERVED.`);
  } else {
    console.log(`\n[NOTICE] No non-demo organizations found. Only demo organization "${DEMO_ORG_ID}" exists.`);
  }

  // 2. Audit demo users
  const demoOrg = allOrgs.find((o) => o.id === DEMO_ORG_ID);
  const demoUsers = await prisma.user.findMany({
    where: {
      OR: [
        { organizationId: DEMO_ORG_ID },
        { email: { in: DEMO_EMAILS } },
      ],
    },
  });

  console.log(`\nFound demo organization "${DEMO_ORG_ID}":`, demoOrg ? "EXISTS" : "NOT FOUND");
  console.log(`Found ${demoUsers.length} demo user accounts to purge:`);
  for (const u of demoUsers) {
    console.log(` - ${u.id} (${u.email}) [Role: ${u.role}, Org: ${u.organizationId}]`);
  }

  if (!demoOrg && demoUsers.length === 0) {
    console.log("No demo organization or users found in database. Nothing to purge.");
    return;
  }

  console.log("\nExecuting surgical purge of demo tenant data in dependency order...");

  // Every org-scoped delete strictly specifies organizationId: DEMO_ORG_ID
  await prisma.$transaction(async (tx) => {
    // 1. Idempotency keys & audit logs
    await tx.idempotencyKey.deleteMany({ where: { organizationId: DEMO_ORG_ID } });
    await tx.auditLog.deleteMany({ where: { organizationId: DEMO_ORG_ID } });
    await tx.notification.deleteMany({ where: { organizationId: DEMO_ORG_ID } });

    // 2. Comments, Transitions, Workflow
    await tx.comment.deleteMany({ where: { user: { organizationId: DEMO_ORG_ID } } });
    await tx.workflowTransition.deleteMany({ where: { instance: { invoice: { organizationId: DEMO_ORG_ID } } } });
    await tx.workflowInstance.deleteMany({ where: { invoice: { organizationId: DEMO_ORG_ID } } });

    // 3. Financials
    const pay = await tx.payment.deleteMany({ where: { organizationId: DEMO_ORG_ID } });
    const app = await tx.approval.deleteMany({ where: { invoice: { organizationId: DEMO_ORG_ID } } });
    const exc = await tx.exception.deleteMany({ where: { organizationId: DEMO_ORG_ID } });
    await tx.validation.deleteMany({ where: { invoice: { organizationId: DEMO_ORG_ID } } });
    await tx.document.deleteMany({ where: { invoice: { organizationId: DEMO_ORG_ID } } });

    // 4. Invoices & POs
    await tx.invoiceLine.deleteMany({ where: { invoice: { organizationId: DEMO_ORG_ID } } });
    const inv = await tx.invoice.deleteMany({ where: { organizationId: DEMO_ORG_ID } });
    await tx.goodsReceiptLine.deleteMany({ where: { goodsReceipt: { organizationId: DEMO_ORG_ID } } });
    await tx.goodsReceipt.deleteMany({ where: { organizationId: DEMO_ORG_ID } });
    const po = await tx.purchaseOrder.deleteMany({ where: { organizationId: DEMO_ORG_ID } });
    const sup = await tx.supplier.deleteMany({ where: { organizationId: DEMO_ORG_ID } });

    // 5. Users
    const usr = await tx.user.deleteMany({
      where: {
        OR: [
          { organizationId: DEMO_ORG_ID },
          { email: { in: DEMO_EMAILS } },
        ],
      },
    });

    // 6. Organization
    if (demoOrg) {
      await tx.organization.delete({ where: { id: DEMO_ORG_ID } });
    }

    console.log("Purge Summary:");
    console.log(` - Invoices removed: ${inv.count}`);
    console.log(` - Payments removed: ${pay.count}`);
    console.log(` - Exceptions removed: ${exc.count}`);
    console.log(` - Approvals removed: ${app.count}`);
    console.log(` - Suppliers removed: ${sup.count}`);
    console.log(` - POs removed: ${po.count}`);
    console.log(` - Users removed: ${usr.count}`);
    console.log(` - Demo organization removed: ${demoOrg ? 1 : 0}`);
  });

  console.log("\n[SUCCESS] Demo tenant and demo accounts have been completely purged.");
}

main()
  .catch((e) => {
    console.error("Purge script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
