/**
 * AST-Based Static Tenant Isolation Guardrail Test
 *
 * Scans `apps/api/src` for unguarded Prisma queries on multi-tenant (org-scoped) models.
 *
 * LIMITATIONS & DESIGN SCOPE:
 * 1. Syntax Tree Analysis: This test inspects static TypeScript AST representations. When query
 *    arguments use variable references or dynamically assembled objects (e.g. `const where = ...`),
 *    the static analyzer inspects whether the variable definition or enclosing function scopes with `organizationId`.
 * 2. Defense-in-Depth Layer: This test functions as an automated pre-commit and CI linting guardrail.
 *    It complements — but does not replace — the runtime `tenant-guard.ts` middleware and the
 *    end-to-end role-isolated route sweep (`scripts/route-sweep.ts`).
 * 3. Exemptions:
 *    - Test files (`*.test.ts`, `*.spec.ts`)
 *    - Seeding scripts (`prisma/seed.ts`, `lib/demo-seeder.ts`)
 *    - Named bypass wrappers (`runWithAdminBackfillBypass`, `runWithSystemJobBypass`, `runWithSeederBypass`, `runWithTrackingLookupBypass`)
 */

import { describe, expect, it } from "vitest";
import { Project, SyntaxKind, CallExpression, Node } from "ts-morph";
import path from "path";

// Exact org-scoped models matching src/config/tenant-guard.ts
const ORG_SCOPED_MODELS = new Set([
  "invoice",
  "supplier",
  "purchaseOrder",
  "exception",
  "payment",
  "notification",
  "auditLog",
  "goodsReceipt",
  "idempotencyKey",
]);

const GUARDED_ACTIONS = new Set([
  "findMany",
  "findFirst",
  "findUnique",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "upsert",
]);

function isInsideBypass(node: CallExpression): boolean {
  let curr: Node | undefined = node.getParent();
  while (curr) {
    if (curr.getKind() === SyntaxKind.CallExpression) {
      const call = curr as CallExpression;
      const fnName = call.getExpression().getText();
      if (
        fnName.includes("runWithSystemJobBypass") ||
        fnName.includes("runWithAdminBackfillBypass") ||
        fnName.includes("runWithSeederBypass") ||
        fnName.includes("runWithTrackingLookupBypass")
      ) {
        return true;
      }
    }
    curr = curr.getParent();
  }
  return false;
}

function hasOrganizationScope(callExpr: CallExpression): boolean {
  const args = callExpr.getArguments();
  if (args.length === 0) return false;

  const firstArg = args[0];
  const argText = firstArg.getText();

  // 1. Direct inline reference to tenant property or compound unique selector
  if (
    argText.includes("organizationId") ||
    argText.includes("id_organizationId") ||
    argText.includes("key_organizationId") ||
    argText.includes("organizationId_supplierCode") ||
    argText.includes("organizationId_poNumber") ||
    argText.includes("organizationId_invoiceNumber") ||
    argText.includes("trackingTokenHash")
  ) {
    return true;
  }

  // 2. Variable reference: if `where` or `whereClause` or `params.where` is passed,
  // inspect the enclosing function/method to verify that organizationId is defined or passed
  const enclosingFn =
    callExpr.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration) ||
    callExpr.getFirstAncestorByKind(SyntaxKind.ArrowFunction) ||
    callExpr.getFirstAncestorByKind(SyntaxKind.MethodDeclaration) ||
    callExpr.getFirstAncestorByKind(SyntaxKind.FunctionExpression);

  if (enclosingFn) {
    const fnText = enclosingFn.getText();
    if (
      fnText.includes("organizationId") ||
      fnText.includes("params.organizationId") ||
      fnText.includes("filters.organizationId")
    ) {
      return true;
    }
  }

  return false;
}

describe("AST Static Analysis: Tenant Guardrail (AGENTS.md Rule 7)", () => {
  it("verifies no raw unguarded Prisma query on org-scoped models exists in production source", () => {
    const project = new Project({
      tsConfigFilePath: path.resolve(__dirname, "../../tsconfig.json"),
      skipAddingFilesFromTsConfig: true,
    });

    const srcDir = path.resolve(__dirname, "..");
    project.addSourceFilesAtPaths([
      `${srcDir}/**/*.ts`,
      `!${srcDir}/**/*.test.ts`,
      `!${srcDir}/**/*.spec.ts`,
      `!${srcDir}/config/tenant-guard.ts`, // The runtime guard definition itself
      `!${srcDir}/config/tenant-guard-static.test.ts`,
      `!${srcDir}/lib/demo-seeder.ts`, // Dev-only demo seeder
    ]);

    const violations: { file: string; line: number; model: string; action: string; code: string }[] = [];

    const sourceFiles = project.getSourceFiles();

    for (const sourceFile of sourceFiles) {
      const filePath = sourceFile.getFilePath();

      sourceFile.forEachDescendant((node) => {
        if (node.getKind() !== SyntaxKind.CallExpression) return;

        const callExpr = node as CallExpression;
        const expr = callExpr.getExpression();
        const exprText = expr.getText();

        // Pattern: prisma.<model>.<action>(...) or tx.<model>.<action>(...) or client.<model>.<action>(...)
        const parts = exprText.split(".");
        if (parts.length < 3) return;

        const caller = parts[parts.length - 3];
        const model = parts[parts.length - 2];
        const action = parts[parts.length - 1];

        if (
          (caller === "prisma" || caller === "tx" || caller === "client") &&
          ORG_SCOPED_MODELS.has(model) &&
          GUARDED_ACTIONS.has(action)
        ) {
          // Check if this call is wrapped in a named bypass
          if (isInsideBypass(callExpr)) {
            return;
          }

          if (!hasOrganizationScope(callExpr)) {
            violations.push({
              file: filePath,
              line: callExpr.getStartLineNumber(),
              model,
              action,
              code: callExpr.getText(),
            });
          }
        }
      });
    }

    if (violations.length > 0) {
      const formatted = violations
        .map((v) => `  ${v.file}:${v.line} -> ${v.model}.${v.action}\n    Code: ${v.code}`)
        .join("\n\n");
      expect.fail(
        `Found ${violations.length} potentially unguarded Prisma queries on org-scoped models:\n\n${formatted}`
      );
    }

    expect(violations.length).toBe(0);
  });
});
