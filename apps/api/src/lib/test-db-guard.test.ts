import { describe, it, expect } from "vitest";
import { isTestDatabaseUrl, assertTestDatabase } from "./test-db-guard";

describe("Test Database Safety Guard (Item 11)", () => {
  it("rejects production and development databases lacking test isolation", () => {
    expect(isTestDatabaseUrl("postgresql://postgres:123@localhost:5432/avarta_db?schema=public")).toBe(false);
    expect(isTestDatabaseUrl("postgresql://user:pass@prod-cluster.rds.amazonaws.com:5432/avarta_prod")).toBe(false);
    expect(isTestDatabaseUrl("postgresql://user:pass@localhost:5432/dev_db")).toBe(false);
    expect(isTestDatabaseUrl(undefined)).toBe(false);
    expect(isTestDatabaseUrl("")).toBe(false);
  });

  it("accepts dedicated test schemas or databases", () => {
    expect(isTestDatabaseUrl("postgresql://postgres:123@localhost:5432/avarta_db?schema=test_suite")).toBe(true);
    expect(isTestDatabaseUrl("postgresql://postgres:123@localhost:5432/avarta_db?schema=test")).toBe(true);
    expect(isTestDatabaseUrl("postgresql://postgres:123@localhost:5432/avarta_test")).toBe(true);
    expect(isTestDatabaseUrl("postgresql://postgres:123@localhost:5432/avarta_test_db?schema=public")).toBe(true);
  });

  it("throws fatal error when assertTestDatabase is called with non-test URL", () => {
    expect(() =>
      assertTestDatabase("postgresql://postgres:123@localhost:5432/avarta_db?schema=public")
    ).toThrow(/FATAL SAFETY VIOLATION/);
  });

  it("passes cleanly when assertTestDatabase is called with test schema", () => {
    expect(() =>
      assertTestDatabase("postgresql://postgres:123@localhost:5432/avarta_db?schema=test_suite")
    ).not.toThrow();
  });
});
