/**
 * PM Audit Crawler — Demo Readiness & Clutter Analysis
 *
 * This script crawls every screen in the Avarta AP Workspace and produces:
 *   1. Full-page screenshots of every screen (light mode)
 *   2. A structured JSON report cataloging every visible element
 *   3. Redundancy and clutter analysis per screen
 *   4. Cross-screen consistency checks (sidebar, top bar, terminology)
 *
 * Run:  cd apps/web && npx playwright test e2e/pm-audit.spec.ts
 */

import { test, expect, Page } from "@playwright/test";
import { loginAs, SEEDED_ACCOUNTS } from "./helpers/auth";
import fs from "fs";
import path from "path";

const OUT_DIR = path.resolve("pm-audit-output");

interface ScreenAudit {
  screen: string;
  route: string;
  url: string;
  screenshot: string;
  loadTimeMs: number;
  viewport: { width: number; height: number };
  pageHeight: number;
  // Content inventory
  headings: string[];
  buttons: string[];
  links: string[];
  badges: string[];
  formFields: { label: string; type: string; id: string; name: string; placeholder: string; autocomplete: string }[];
  tables: { headerRow: string[]; rowCount: number }[];
  cards: string[];
  metricValues: string[];
  statusBadges: string[];
  // Clutter indicators
  emptyStates: string[];
  devArtifacts: string[];
  duplicateTexts: string[];
  tooltips: string[];
  // Sidebar state
  sidebarItems: string[];
  topBarItems: string[];
  // Accessibility
  imagesWithoutAlt: number;
  inputsWithoutLabel: number;
  lowContrastElements: number;
  consoleErrors: string[];
  networkErrors: { url: string; status: number }[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function extractScreenData(page: Page, screenName: string, route: string): Promise<ScreenAudit> {
  const start = Date.now();
  await page.goto(route);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800); // let animations settle
  const loadTimeMs = Date.now() - start;

  const vp = page.viewportSize() ?? { width: 1280, height: 720 };
  const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);

  // Screenshot
  const ssName = `${screenName.replace(/\s+/g, "-").toLowerCase()}.png`;
  await page.screenshot({ path: path.join(OUT_DIR, ssName), fullPage: true });

  // ── Extract all visible text elements ──

  const headings = await page.locator("h1, h2, h3, h4, h5, h6").allTextContents();
  const buttons = await page.locator("button").allTextContents();
  const links = await page.locator("a").allTextContents();

  // Badges (spans/divs with common badge patterns)
  const badges = await page.evaluate(() => {
    const els = document.querySelectorAll(
      '[class*="badge"], [class*="Badge"], [class*="chip"], [class*="tag"], [class*="status"], span[class*="rounded-full"], span[class*="rounded-md"]'
    );
    return Array.from(els).map(el => ((el as HTMLElement).innerText || "").trim()).filter(Boolean);
  });

  // Form fields
  const formFields = await page.evaluate(() => {
    const inputs = document.querySelectorAll("input, select, textarea");
    return Array.from(inputs).map(el => {
      const input = el as HTMLInputElement;
      const labelEl = input.id ? document.querySelector(`label[for="${input.id}"]`) : null;
      return {
        label: labelEl?.textContent?.trim() || input.getAttribute("aria-label") || "",
        type: input.type || input.tagName.toLowerCase(),
        id: input.id || "",
        name: input.name || "",
        placeholder: input.placeholder || "",
        autocomplete: input.autocomplete || "",
      };
    });
  });

  // Tables
  const tables = await page.evaluate(() => {
    const tableEls = document.querySelectorAll("table");
    return Array.from(tableEls).map(table => {
      const headerCells = table.querySelectorAll("thead th, thead td");
      const headerRow = Array.from(headerCells).map(cell => ((cell as HTMLElement).innerText || "").trim());
      const rows = table.querySelectorAll("tbody tr");
      return { headerRow, rowCount: rows.length };
    });
  });

  // Cards (common card patterns)
  const cards = await page.evaluate(() => {
    const cardEls = document.querySelectorAll(
      '[class*="card"], [class*="Card"], [class*="rounded-lg"][class*="border"], [class*="rounded-xl"][class*="shadow"]'
    );
    return Array.from(cardEls)
      .map(el => {
        const heading = el.querySelector("h2, h3, h4, strong, [class*='title']");
        return heading ? ((heading as HTMLElement).innerText || "").trim() : "";
      })
      .filter(Boolean);
  });

  // Metric / KPI values (numbers with currency or percentage symbols)
  const metricValues = await page.evaluate(() => {
    const allText = document.body.innerText;
    const matches = allText.match(/[₹$€£][\s]*[\d,]+(?:\.\d{1,2})?|[\d,]+(?:\.\d{1,2})?\s*%|\d+\s*(?:days?|hrs?|invoices?|items?)/gi);
    return [...new Set(matches || [])];
  });

  // Status badges specifically
  const statusBadges = await page.evaluate(() => {
    const keywords = ["RECEIVED", "PROCESSING", "EXCEPTION", "PENDING", "APPROVED", "REJECTED",
      "SCHEDULED", "PAID", "SYNCED", "ARCHIVED", "ON_HOLD", "FAILED", "OVERDUE",
      "High", "Medium", "Low", "Critical", "Urgent", "Active", "Inactive",
      "Verified", "Unverified", "Matched", "Unmatched", "Captured", "Validating"];
    const spans = document.querySelectorAll("span, div, td");
    const found: string[] = [];
    spans.forEach(el => {
      const text = ((el as HTMLElement).innerText || "").trim();
      if (keywords.some(kw => text === kw || text.toUpperCase() === kw)) {
        found.push(text);
      }
    });
    return [...new Set(found)];
  });

  // Empty states
  const emptyStates = await page.evaluate(() => {
    const indicators = document.querySelectorAll(
      '[class*="empty"], [class*="no-data"], [class*="placeholder"]'
    );
    const texts: string[] = [];
    indicators.forEach(el => {
      const t = ((el as HTMLElement).innerText || "").trim();
      if (t) texts.push(t);
    });
    // Also catch common "No X found" text patterns
    const body = document.body.innerText;
    const noDataMatches = body.match(/no\s+\w+\s+found|no\s+data|nothing\s+to\s+show|no\s+results/gi);
    if (noDataMatches) texts.push(...noDataMatches);
    return [...new Set(texts)];
  });

  // Dev artifacts (look for debug text, UUIDs displayed, console references, "TODO", "FIXME", etc.)
  const devArtifacts = await page.evaluate(() => {
    const body = document.body.innerText;
    const patterns: string[] = [];
    // Exposed UUIDs
    const uuids = body.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi);
    if (uuids) patterns.push(...uuids.map(u => `Exposed UUID: ${u}`));
    // TODO/FIXME/HACK
    const todos = body.match(/\b(TODO|FIXME|HACK|XXX|TEMP|DEBUG)\b/g);
    if (todos) patterns.push(...todos.map(t => `Dev marker: ${t}`));
    // "password123" or similar test credentials shown
    if (body.includes("password123")) patterns.push("Test credential 'password123' visible on screen");
    // "localhost" references
    if (body.includes("localhost")) patterns.push("'localhost' reference visible on screen");
    // "Lorem ipsum"
    if (body.toLowerCase().includes("lorem ipsum")) patterns.push("Placeholder 'Lorem ipsum' text visible");
    // "test", "dummy", "sample" in visible content (case insensitive, only if looks like placeholder)
    const placeholders = body.match(/\b(test\s*data|dummy\s*\w+|sample\s*\w+|placeholder)\b/gi);
    if (placeholders) patterns.push(...placeholders.map(p => `Possible placeholder: ${p}`));
    return patterns;
  });

  // Find duplicate text within the same screen
  const duplicateTexts = await page.evaluate(() => {
    const headings = document.querySelectorAll("h1, h2, h3, h4");
    const texts = Array.from(headings).map(h => ((h as HTMLElement).innerText || "").trim()).filter(Boolean);
    const seen = new Map<string, number>();
    texts.forEach(t => seen.set(t, (seen.get(t) || 0) + 1));
    return Array.from(seen.entries()).filter(([, count]) => count > 1).map(([text, count]) => `"${text}" appears ${count}x`);
  });

  // Tooltips
  const tooltips = await page.evaluate(() => {
    const els = document.querySelectorAll("[title], [data-tooltip], [aria-describedby]");
    return Array.from(els).map(el => el.getAttribute("title") || el.getAttribute("data-tooltip") || "").filter(Boolean);
  });

  // Sidebar items
  const sidebarItems = await page.evaluate(() => {
    const sidebar = document.querySelector("aside, nav, [class*='sidebar'], [class*='Sidebar']");
    if (!sidebar) return [];
    const links = sidebar.querySelectorAll("a, button");
    return Array.from(links).map(el => ((el as HTMLElement).innerText || "").trim()).filter(Boolean);
  });

  // Top bar items
  const topBarItems = await page.evaluate(() => {
    const header = document.querySelector("header");
    if (!header) return [];
    const items = header.querySelectorAll("a, button, span, [class*='user'], [class*='avatar']");
    return Array.from(items).map(el => ((el as HTMLElement).innerText || "").trim()).filter(Boolean);
  });

  // Accessibility quick-checks
  const imagesWithoutAlt = await page.locator("img:not([alt]), img[alt='']").count();
  const inputsWithoutLabel = await page.evaluate(() => {
    const inputs = document.querySelectorAll(
      "input:not([type='hidden']):not([aria-hidden='true']), select:not([aria-hidden='true']), textarea:not([aria-hidden='true'])"
    );
    let count = 0;
    inputs.forEach(input => {
      const id = input.id;
      const hasLabel = id ? !!document.querySelector(`label[for="${id}"]`) : false;
      const hasAriaLabel = input.hasAttribute("aria-label") || input.hasAttribute("aria-labelledby");
      if (!hasLabel && !hasAriaLabel) count++;
    });
    return count;
  });

  return {
    screen: screenName,
    route,
    url: page.url(),
    screenshot: ssName,
    loadTimeMs,
    viewport: vp,
    pageHeight,
    headings: headings.map(h => h.trim()).filter(Boolean),
    buttons: buttons.map(b => b.trim()).filter(Boolean),
    links: links.map(l => l.trim()).filter(Boolean),
    badges,
    formFields,
    tables,
    cards,
    metricValues,
    statusBadges,
    emptyStates,
    devArtifacts,
    duplicateTexts,
    tooltips,
    sidebarItems,
    topBarItems,
    imagesWithoutAlt,
    inputsWithoutLabel,
    lowContrastElements: 0, // placeholder — Axe-core would be needed for real contrast checks
    consoleErrors: [],
    networkErrors: [],
  };
}

// ─── Main Test ─────────────────────────────────────────────────────────────

test.describe("PM Audit: Demo Readiness & Clutter Analysis", () => {
  test("Full Application PM Audit Crawl", async ({ page }) => {
    test.setTimeout(300_000); // 5 minutes

    // Setup output
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

    // Collect console errors globally
    const globalConsoleErrors: string[] = [];
    const globalNetworkErrors: { url: string; status: number }[] = [];

    page.on("console", msg => {
      if (msg.type() === "error") {
        globalConsoleErrors.push(`[${msg.type()}] ${msg.text()}`);
      }
    });
    page.on("response", res => {
      if (res.status() >= 400) {
        globalNetworkErrors.push({ url: res.url(), status: res.status() });
      }
    });

    // ── 0. Login Screen (unauthenticated) ──
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, "00-login.png"), fullPage: true });

    // Extract login page specifics
    const loginContent = await page.evaluate(() => {
      const body = document.body.innerText;
      return {
        fullText: body,
        hasPasswordVisible: body.includes("password123"),
        hasDemoSwitcher: body.includes("DEMO") || body.includes("demo") || body.includes("1-TAP"),
        formLabels: Array.from(document.querySelectorAll("label")).map(l => l.textContent?.trim()).filter(Boolean),
        inputCount: document.querySelectorAll("input").length,
        buttonLabels: Array.from(document.querySelectorAll("button")).map(b => (b as HTMLElement).innerText.trim()).filter(Boolean),
      };
    });

    // Login
    await loginAs(page, SEEDED_ACCOUNTS.manager);

    // ── Define screens to crawl ──
    const screens: { name: string; route: string }[] = [
      { name: "Overview", route: "/overview" },
      { name: "Inbox", route: "/inbox" },
      { name: "Invoices", route: "/invoices" },
      { name: "Exceptions", route: "/exceptions" },
      { name: "Approvals", route: "/approvals" },
      { name: "Payments", route: "/payments" },
      { name: "Suppliers", route: "/suppliers" },
      { name: "Purchase Orders", route: "/purchase-orders" },
      { name: "Reports", route: "/reports" },
      { name: "Archive", route: "/archive" },
      { name: "Settings", route: "/settings" },
      { name: "Settings - Users Tab", route: "/settings?tab=users" },
      { name: "Notifications", route: "/notifications" },
      { name: "Profile", route: "/profile" },
    ];

    const allAudits: ScreenAudit[] = [];

    for (const screen of screens) {
      const audit = await extractScreenData(page, screen.name, screen.route);
      audit.consoleErrors = [...globalConsoleErrors];
      audit.networkErrors = [...globalNetworkErrors];
      allAudits.push(audit);
    }

    // ── Invoice Detail: pick the first invoice ──
    await page.goto("/invoices");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    const firstInvoiceLink = page.locator("table tbody tr td a").first();
    if (await firstInvoiceLink.isVisible()) {
      await firstInvoiceLink.click();
      await page.waitForURL(/\/invoices\/[a-zA-Z0-9-]+$/);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(800);
      const detailAudit = await extractScreenData(page, "Invoice Detail", page.url());
      allAudits.push(detailAudit);
    }

    // ── Cross-Screen Consistency Analysis ──
    const crossScreenAnalysis = {
      // Check sidebar consistency
      sidebarConsistency: (() => {
        const sidebarSets = allAudits
          .filter(a => a.sidebarItems.length > 0)
          .map(a => ({ screen: a.screen, items: a.sidebarItems }));
        if (sidebarSets.length < 2) return { consistent: true, differences: [] };
        const reference = sidebarSets[0].items.join("|");
        const diffs = sidebarSets.filter(s => s.items.join("|") !== reference);
        return { consistent: diffs.length === 0, differences: diffs.map(d => d.screen) };
      })(),

      // Check top bar consistency
      topBarConsistency: (() => {
        const topBarSets = allAudits
          .filter(a => a.topBarItems.length > 0)
          .map(a => ({ screen: a.screen, items: a.topBarItems }));
        if (topBarSets.length < 2) return { consistent: true, differences: [] };
        const reference = topBarSets[0].items.join("|");
        const diffs = topBarSets.filter(s => s.items.join("|") !== reference);
        return { consistent: diffs.length === 0, differences: diffs.map(d => d.screen) };
      })(),

      // Aggregate dev artifacts across all screens
      allDevArtifacts: allAudits.flatMap(a => a.devArtifacts.map(d => ({ screen: a.screen, artifact: d }))),

      // Aggregate empty states
      allEmptyStates: allAudits.flatMap(a => a.emptyStates.map(e => ({ screen: a.screen, state: e }))),

      // Aggregate duplicate texts
      allDuplicateTexts: allAudits.flatMap(a => a.duplicateTexts.map(d => ({ screen: a.screen, duplicate: d }))),

      // Form fields without labels
      fieldsWithoutLabels: allAudits
        .filter(a => a.inputsWithoutLabel > 0)
        .map(a => ({ screen: a.screen, count: a.inputsWithoutLabel })),

      // Images without alt
      imagesWithoutAlt: allAudits
        .filter(a => a.imagesWithoutAlt > 0)
        .map(a => ({ screen: a.screen, count: a.imagesWithoutAlt })),

      // Slow screens (> 2000ms)
      slowScreens: allAudits
        .filter(a => a.loadTimeMs > 2000)
        .map(a => ({ screen: a.screen, route: a.route, loadTimeMs: a.loadTimeMs })),
    };

    // ── Login-specific findings ──
    const loginFindings = {
      passwordVisibleOnScreen: loginContent.hasPasswordVisible,
      demoSwitcherPresent: loginContent.hasDemoSwitcher,
      formLabels: loginContent.formLabels,
      buttonLabels: loginContent.buttonLabels,
      inputCount: loginContent.inputCount,
    };

    // ── Build final report ──
    const report = {
      meta: {
        timestamp: new Date().toISOString(),
        auditor: "Playwright PM Audit Script",
        screensAudited: allAudits.length,
        totalConsoleErrors: globalConsoleErrors.length,
        totalNetworkErrors: globalNetworkErrors.length,
      },
      loginFindings,
      screens: allAudits.map(a => ({
        screen: a.screen,
        route: a.route,
        url: a.url,
        screenshot: a.screenshot,
        loadTimeMs: a.loadTimeMs,
        pageHeight: a.pageHeight,
        content: {
          headings: a.headings,
          buttonCount: a.buttons.length,
          buttons: a.buttons,
          linkCount: a.links.length,
          formFieldCount: a.formFields.length,
          formFields: a.formFields,
          tableCount: a.tables.length,
          tables: a.tables,
          cardTitles: a.cards,
          metricValues: a.metricValues,
          statusBadges: a.statusBadges,
        },
        clutter: {
          devArtifacts: a.devArtifacts,
          emptyStates: a.emptyStates,
          duplicateTexts: a.duplicateTexts,
        },
        accessibility: {
          imagesWithoutAlt: a.imagesWithoutAlt,
          inputsWithoutLabel: a.inputsWithoutLabel,
        },
        navigation: {
          sidebarItems: a.sidebarItems,
          topBarItems: a.topBarItems,
        },
      })),
      crossScreenAnalysis,
      consoleErrors: globalConsoleErrors,
      networkErrors: globalNetworkErrors,
    };

    // Write report
    fs.writeFileSync(
      path.join(OUT_DIR, "pm-audit-report.json"),
      JSON.stringify(report, null, 2)
    );

    console.log("═══════════════════════════════════════════════════════");
    console.log("PM AUDIT COMPLETE");
    console.log(`Screens audited: ${allAudits.length}`);
    console.log(`Console errors: ${globalConsoleErrors.length}`);
    console.log(`Network errors: ${globalNetworkErrors.length}`);
    console.log(`Dev artifacts found: ${crossScreenAnalysis.allDevArtifacts.length}`);
    console.log(`Empty states: ${crossScreenAnalysis.allEmptyStates.length}`);
    console.log(`Duplicate headings: ${crossScreenAnalysis.allDuplicateTexts.length}`);
    console.log(`Fields without labels: ${crossScreenAnalysis.fieldsWithoutLabels.reduce((sum, f) => sum + f.count, 0)}`);
    console.log(`Slow screens (>2s): ${crossScreenAnalysis.slowScreens.length}`);
    console.log(`Report saved to: ${path.join(OUT_DIR, "pm-audit-report.json")}`);
    console.log("═══════════════════════════════════════════════════════");
  });
});
