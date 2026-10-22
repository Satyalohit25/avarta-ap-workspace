import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Item 12: Bundle Hygiene and Source Scans", () => {
  const webDistDir = path.resolve(__dirname, "../../../../web/dist");
  const apiSrcDir = path.resolve(__dirname, "../../");
  const webSrcDir = path.resolve(__dirname, "../../../../web/src");

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

  it("verifies apps/web/dist is free from sensitive credentials and demo fixtures", () => {
    expect(fs.existsSync(webDistDir)).toBe(true);
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
  });

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

  it("scans API source for 9876543210 and confirms isolation to payments mock service", () => {
    const targetAccountNum = ["987654", "3210"].join("");
    const apiSrcFiles = getAllFiles(apiSrcDir).filter(
      (f) => !f.endsWith("bundle-hygiene.test.ts")
    );
    const matches = searchFilesForString(apiSrcFiles, targetAccountNum);

    // Must be found in payments service (mock account pending Phase 2 Bank Accounts module)
    expect(matches.length).toBeGreaterThanOrEqual(1);
    for (const match of matches) {
      const relative = path.relative(apiSrcDir, match).replace(/\\/g, "/");
      const isAllowedPaymentsModule =
        relative.includes("modules/payments/service.ts") ||
        relative.includes("modules/payments/bank-file-generator.test.ts");
      expect(
        isAllowedPaymentsModule,
        `Unexpected appearance of ${targetAccountNum} in API source: ${relative}`
      ).toBe(true);
    }

    // Verify targetAccountNum does NOT leak into web dist
    const distFiles = getAllFiles(webDistDir);
    const webDistMatches = searchFilesForString(distFiles, targetAccountNum);
    expect(webDistMatches).toHaveLength(0);
  });
});
