import { prisma } from "../src/config/database";

async function verifyIndexes() {
  const result = await prisma.$queryRawUnsafe(`
    SELECT 
      c.relname AS indexname,
      indrelid::regclass::text AS tablename,
      indisunique,
      indisvalid,
      indisready
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indexrelid
    WHERE c.relname IN ('Invoice_id_organizationId_key', 'Payment_id_organizationId_key')
    ORDER BY c.relname;
  `);

  console.log("=== POSTGRESQL COMPOUND UNIQUE INDEX VERIFICATION ===");
  console.log(JSON.stringify(result, null, 2));
  await prisma.$disconnect();
}

verifyIndexes().catch((err) => {
  console.error("Index verification failed:", err);
  process.exit(1);
});
