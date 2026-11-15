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
          // Vitest sets NODE_ENV=test. Force a real production bundle so the
          // scan validates what actually ships, not a jsxDEV development build.
          env: { ...process.env, NODE_ENV: "production" },
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
  }, 120000);

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

  it("verifies the Item C generated-catalogue fixtures have been removed", () => {
    // Item C replaced the synthetic supplier catalogue with invoice-backed
    // line items, so these fixtures must no longer exist in web source.
    const removedFixtureStrings = ["generateSupplierLineItems", "selectCatalog"];

    const webSrcFiles = getAllFiles(webSrcDir);
    for (const str of removedFixtureStrings) {
      const matches = searchFilesForString(webSrcFiles, str);
      expect(
        matches,
        `Fixture "${str}" still exists in web source: ${matches.join(", ")}`
      ).toHaveLength(0);
    }
  });

  it("verifies Item B remediation: mock bank account 9876543210 is removed from payments service and web dist", () => {
    const pattern = ["987654", "3210"].join("");

    // 1. Verify payments service.ts does NOT contain the mock bank account
    const paymentServiceFile = path.join(apiSrcDir, "modules/payments/service.ts");
    if (fs.existsSync(paymentServiceFile)) {
      const serviceContent = fs.readFileSync(paymentServiceFile, "utf8");
      expect(
        serviceContent.includes(pattern),
        "Mock bank account 9876543210 must not appear in payments/service.ts after Item B resolution"
      ).toBe(false);
    }

    // 2. Scan Web dist assets: MUST NEVER appear in client-facing bundles
    const distFiles = getAllFiles(webDistDir);
    const webDistMatches = searchFilesForString(distFiles, pattern);
    expect(
      webDistMatches,
      `Pattern 9876543210 leaked into client-facing web bundle: ${webDistMatches.join(", ")}`
    ).toHaveLength(0);
  });
});
