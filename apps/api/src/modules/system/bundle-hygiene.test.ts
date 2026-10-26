import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

describe("Item 12: Bundle Hygiene, Build Verification, and Source Scans", () => {
  const repoRoot = path.resolve(__dirname, "../../../../../");
  const webDir = path.resolve(__dirname, "../../../../web");
  const webDistDir = path.resolve(webDir, "dist");
  const apiSrcDir = path.resolve(__dirname, "../../");
  const webSrcDir = path.resolve(webDir, "src");

  function getAllFiles(dir: string, fileList: string[] = []): string[] {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        getAllFiles(fullPath, fileList);
      } else {
        fileList.push(fullPath);
      }
    }
    return fileList;
  }

  function searchFilesForString(files: string[], searchStr: string): string[] {
    const matches: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      if (content.includes(searchStr)) {
        matches.push(file);
      }
    }
    return matches;
  }

  beforeAll(() => {
    // If dist is absent or explicitly requested via BUILD_IN_TEST, trigger a build inside the test
    const shouldBuild = process.env.BUILD_IN_TEST === "true" || !fs.existsSync(path.join(webDistDir, "index.html"));
    if (shouldBuild) {
      try {
        execSync("pnpm --filter @ap-saas/web exec vite build", {
          cwd: repoRoot,
          stdio: "pipe",
          timeout: 60000,
        });
      } catch (err: any) {
        throw new Error(
          `Bundle hygiene test attempted to build apps/web but vite build failed:\n${err.stderr?.toString() || err.message}`
        );
      }
    }

    // Verify dist freshness and structure with explicit error message if stale or missing
    if (!fs.existsSync(webDistDir) || !fs.existsSync(path.join(webDistDir, "index.html"))) {
      throw new Error(
        `apps/web/dist is missing or invalid. Run 'pnpm --filter @ap-saas/web build' before executing bundle hygiene scans.`
      );
    }
  });

  it("verifies apps/web/dist is free from sensitive credentials and demo fixtures", () => {
    const distFiles = getAllFiles(webDistDir);
    expect(distFiles.length).toBeGreaterThan(0);

    const forbiddenStrings = ["devpassword123", "admin@avarta.dev", "INV-2026-1007"];
    for (const str of forbiddenStrings) {
      const matches = searchFilesForString(distFiles, str);
      expect(
        matches,
        `Forbidden string "${str}" found in built web assets: ${matches.join(", ")}`
      ).toHaveLength(0);
    }
  }, 30000);

  it("tracks expected-until-Item-C fixtures and verifies Item C is not started prematurely", () => {
    // Strings that are explicitly expected until Item C lands
    const expectedUntilItemCStrings = ["generateSupplierLineItems"];

    const webSrcFiles = getAllFiles(webSrcDir);
    for (const str of expectedUntilItemCStrings) {
      const matches = searchFilesForString(webSrcFiles, str);
      // Item C has NOT landed yet, so generateSupplierLineItems MUST still be present in web source
      expect(
        matches.length,
        `Expected fixture "${str}" was not found in web source. Item C should not be removed or started early without updating this checklist.`
      ).toBeGreaterThan(0);
    }
  });

  it("scans API source for 9876543210 in expected-until-Item-B list and verifies exclusion from web dist", () => {
    // This scan executes in apps/api and scans API source files.
    // The dist scan stays separate.
    const expectedUntilItemBStrings = [
      {
        id: "MOCK_BANK_ACCOUNT_9876543210",
        pattern: ["987654", "3210"].join(""),
        allowedApiFiles: [
          "src/modules/payments/service.ts",
          "src/modules/payments/bank-file-generator.test.ts",
        ],
        targetRemediation: "Item B (Bank Accounts Module - real DB-backed account resolution)",
      },
    ];

    const apiSrcFiles = getAllFiles(apiSrcDir).filter(
      (f) => !f.endsWith("bundle-hygiene.test.ts")
    );

    for (const item of expectedUntilItemBStrings) {
      // 1. Scan API source files
      const matches = searchFilesForString(apiSrcFiles, item.pattern);
      expect(
        matches.length,
        `Pattern ${item.id} expected in API source until ${item.targetRemediation}, but not found.`
      ).toBeGreaterThanOrEqual(1);

      for (const match of matches) {
        const relative = path.relative(path.resolve(__dirname, "../../.."), match).replace(/\\/g, "/");
        const isAllowed = item.allowedApiFiles.some((allowed) => relative.endsWith(allowed));
        expect(
          isAllowed,
          `Unexpected appearance of ${item.id} in API source outside allowed files: ${relative}. Must be resolved in ${item.targetRemediation}.`
        ).toBe(true);
      }

      // 2. Scan Web dist assets: MUST NEVER appear in client-facing bundles
      const distFiles = getAllFiles(webDistDir);
      const webDistMatches = searchFilesForString(distFiles, item.pattern);
      expect(
        webDistMatches,
        `Pattern ${item.id} leaked into client-facing web bundle: ${webDistMatches.join(", ")}`
      ).toHaveLength(0);
    }
  });
});
