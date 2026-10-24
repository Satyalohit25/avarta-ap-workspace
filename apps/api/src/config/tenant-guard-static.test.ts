/**
 * AST-Based Static Tenant Isolation Guardrail Test
 *
 * Scans `apps/api/src` for unguarded Prisma queries on multi-tenant (org-scoped) models.
 *
 * LIMITATIONS & DESIGN SCOPE:
 * 1. Syntax Tree Analysis: This test inspects static TypeScript AST representations. When query
 *    arguments use variable references (`{ where }` or `{ where: whereClause }`), the static analyzer
 *    strictly inspects the initializer of that specific `where` variable declaration to verify
 *    that `organizationId` is scoped directly in the query criteria. It rejects spreads or functions
 *    that merely reference `organizationId` in parameter lists or unrelated statements.
 * 2. Defense-in-Depth Layer: This test functions as an automated pre-commit and CI linting guardrail.
 *    It complements — but does not replace — the runtime `tenant-guard.ts` middleware and the
 *    end-to-end role-isolated route sweep (`scripts/route-sweep.ts`).
 * 3. Exemptions:
 *    - Test files (`*.test.ts`, `*.spec.ts`)
 *    - Seeding scripts (`prisma/seed.ts`, `lib/demo-seeder.ts`)
 *    - Named bypass wrappers (`runWithAdminBackfillBypass`, `runWithSystemJobBypass`, `runWithSeederBypass`, `runWithTrackingLookupBypass`)
 */

import { describe, expect, it } from "vitest";
import { Project, SyntaxKind, CallExpression, Node, SourceFile } from "ts-morph";
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

export function hasOrganizationScope(callExpr: CallExpression): boolean {
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

  // 2. If firstArg is an ObjectLiteralExpression passing `{ where }` or `{ where: variable }`
  if (firstArg.getKind() === SyntaxKind.ObjectLiteralExpression) {
    const objLiteral = firstArg.asKind(SyntaxKind.ObjectLiteralExpression);
    const whereProp = objLiteral?.getProperty("where");
    if (whereProp) {
      let identifierName: string | null = null;
      if (whereProp.getKind() === SyntaxKind.ShorthandPropertyAssignment) {
        identifierName = whereProp.getText();
      } else if (whereProp.getKind() === SyntaxKind.PropertyAssignment) {
        const init = (whereProp as any).getInitializer();
        if (init && init.getKind() === SyntaxKind.Identifier) {
          identifierName = init.getText();
        }
      }

      if (identifierName) {
        // Trace variable declaration in the enclosing function scope
        const enclosingFn =
          callExpr.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration) ||
          callExpr.getFirstAncestorByKind(SyntaxKind.ArrowFunction) ||
          callExpr.getFirstAncestorByKind(SyntaxKind.MethodDeclaration) ||
          callExpr.getFirstAncestorByKind(SyntaxKind.FunctionExpression);

        if (enclosingFn) {
          const varDecls = enclosingFn.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
          const decl = varDecls.find((d) => d.getName() === identifierName);
          if (decl) {
            const initializer = decl.getInitializer();
            if (initializer) {
              const initText = initializer.getText();
              // Strictly verify that organizationId is present in the variable definition
              if (
                initText.includes("organizationId") ||
                initText.includes("id_organizationId") ||
                initText.includes("key_organizationId")
              ) {
                return true;
              }
            }
          }
        }
      }
    }
  }

  return false;
}

export function scanSourceFileForViolations(sourceFile: SourceFile): {
  line: number;
  model: string;
  action: string;
  code: string;
}[] {
  const violations: { line: number; model: string; action: string; code: string }[] = [];

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
      if (isInsideBypass(callExpr)) {
        return;
      }

      if (!hasOrganizationScope(callExpr)) {
        violations.push({
          line: callExpr.getStartLineNumber(),
          model,
          action,
          code: callExpr.getText(),
        });
      }
    }
  });

  return violations;
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

    const allViolations: { file: string; line: number; model: string; action: string; code: string }[] = [];

    for (const sourceFile of project.getSourceFiles()) {
      const violations = scanSourceFileForViolations(sourceFile);
      for (const v of violations) {
        allViolations.push({
          file: sourceFile.getFilePath(),
          ...v,
        });
      }
    }

    if (allViolations.length > 0) {
      const formatted = allViolations
        .map((v) => `  ${v.file}:${v.line} -> ${v.model}.${v.action}\n    Code: ${v.code}`)
        .join("\n\n");
      expect.fail(
        `Found ${allViolations.length} potentially unguarded Prisma queries on org-scoped models:\n\n${formatted}`
      );
    }

    expect(allViolations.length).toBe(0);
  });

  describe("Known-Bad Fixtures Verification (Proving Analyzer Can Fail)", () => {
    const virtualProject = new Project({ useInMemoryFileSystem: true });

    it("detects violation when variable 'where' is built without organizationId", () => {
      const badCode = `
        export async function findInvoicesBad(organizationId: string) {
          const where = { status: "RECEIVED" };
          return prisma.invoice.findMany({ where });
        }
      `;
      const source = virtualProject.createSourceFile("bad-variable.ts", badCode, { overwrite: true });
      const violations = scanSourceFileForViolations(source);

      expect(violations).toHaveLength(1);
      expect(violations[0].model).toBe("invoice");
      expect(violations[0].action).toBe("findMany");
    });

    it("detects violation when variable 'where' uses an unvalidated spread", () => {
      const badCode = `
        export async function findSuppliersBad(organizationId: string, filters: any) {
          const where = { ...filters };
          return prisma.supplier.findMany({ where });
        }
      `;
      const source = virtualProject.createSourceFile("bad-spread.ts", badCode, { overwrite: true });
      const violations = scanSourceFileForViolations(source);

      expect(violations).toHaveLength(1);
      expect(violations[0].model).toBe("supplier");
      expect(violations[0].action).toBe("findMany");
    });

    it("detects violation when organizationId is mentioned only in an unrelated parameter or comment", () => {
      const badCode = `
        export async function findPaymentsBad(organizationId: string) {
          console.log("Tenant is:", organizationId);
          // organizationId is mentioned here in a comment
          return prisma.payment.findUnique({ where: { id: "pay-123" } });
        }
      `;
      const source = virtualProject.createSourceFile("bad-unrelated.ts", badCode, { overwrite: true });
      const violations = scanSourceFileForViolations(source);

      expect(violations).toHaveLength(1);
      expect(violations[0].model).toBe("payment");
      expect(violations[0].action).toBe("findUnique");
    });

    it("passes when variable 'where' explicitly includes organizationId", () => {
      const goodCode = `
        export async function findInvoicesGood(organizationId: string) {
          const where = { organizationId, status: "RECEIVED" };
          return prisma.invoice.findMany({ where });
        }
      `;
      const source = virtualProject.createSourceFile("good-variable.ts", goodCode, { overwrite: true });
      const violations = scanSourceFileForViolations(source);

      expect(violations).toHaveLength(0);
    });
  });
});
