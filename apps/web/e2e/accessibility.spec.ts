import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Automated DOM Accessibility & Label Auditing", () => {
  test("verifies zero unlabeled buttons or form inputs across primary routes", async ({ page }) => {
    test.setTimeout(60000);
    await loginAs(page);

    const routes = [
      "/overview",
      "/inbox",
      "/invoices",
      "/exceptions",
      "/approvals",
      "/payments",
      "/suppliers",
      "/purchase-orders",
      "/reports",
      "/archive",
      "/settings",
    ];

    for (const route of routes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });

      const issues = await page.evaluate(() => {
        const violations: { type: string; html: string }[] = [];

        // Check for buttons without visible text, title, or aria-label
        const buttons = Array.from(document.querySelectorAll("button"));
        buttons.forEach((btn) => {
          const text = btn.innerText.trim();
          const aria = btn.getAttribute("aria-label");
          const title = btn.getAttribute("title");
          if (!text && !aria && !title) {
            violations.push({ type: "Unlabeled Button", html: btn.outerHTML });
          }
        });

        // Check for inputs without label, aria-label, or placeholder (excluding aria-hidden helper elements)
        const inputs = Array.from(document.querySelectorAll("input:not([aria-hidden='true']), select:not([aria-hidden='true']), textarea:not([aria-hidden='true'])"));
        inputs.forEach((inp) => {
          const id = inp.id;
          const hasLabel = id && document.querySelector(`label[for="${id}"]`);
          const aria = inp.getAttribute("aria-label");
          const placeholder = inp.getAttribute("placeholder");
          if (!hasLabel && !aria && !placeholder) {
            violations.push({ type: "Unlabeled Input", html: inp.outerHTML });
          }
        });

        return violations;
      });

      expect(issues, `Route ${route} has accessibility violations`).toEqual([]);
    }
  });
});
