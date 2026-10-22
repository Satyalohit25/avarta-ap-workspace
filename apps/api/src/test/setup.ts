import { assertTestDatabase, isTestDatabaseUrl } from "../lib/test-db-guard";

// Ensure tests always run against an isolated test schema
if (!process.env.DATABASE_URL || !isTestDatabaseUrl(process.env.DATABASE_URL)) {
  process.env.DATABASE_URL = "postgresql://postgres:123456@127.0.0.1:5432/avarta_db?schema=test_suite";
}

assertTestDatabase(process.env.DATABASE_URL);
