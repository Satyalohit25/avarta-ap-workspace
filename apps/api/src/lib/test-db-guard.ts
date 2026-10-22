/**
 * Safety guard verifying that test suites and destructive reset operations
 * only run against an isolated test database or schema.
 */
export function isTestDatabaseUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    const schema = (parsed.searchParams.get("schema") || "").toLowerCase();

    // Check if db name has 'test' (e.g. /avarta_test or /avarta_test_db)
    if (pathname.includes("test")) return true;

    // Check if schema parameter is 'test' or 'test_suite' or starts with 'test'
    if (schema === "test" || schema.startsWith("test_")) return true;

    return false;
  } catch {
    // If not a full URL string, perform conservative fallback check
    const lower = url.toLowerCase();
    return lower.includes("schema=test") || lower.includes("/test") || lower.includes("avarta_test");
  }
}

export function assertTestDatabase(url?: string): void {
  const targetUrl = url ?? process.env.DATABASE_URL;
  if (!isTestDatabaseUrl(targetUrl)) {
    throw new Error(
      `FATAL SAFETY VIOLATION: Operation refused because DATABASE_URL ("${targetUrl}") does not point to a dedicated test database or test schema. It must contain 'test' in the database name or '?schema=test_suite'.`
    );
  }
}
