# Avarta AP Workspace — Audit Lessons & Heuristics

Reusable heuristics discovered about this application. Updated continuously.

---

### LESSON-001: Header Tab Strips in Split Panels Require `flex-wrap`
- **Pattern**: When a workstation or card header places a bold title on the left and a tab switcher on the right inside a flex container (`flex items-center justify-between`), the combined width can easily exceed 450px. Inside a dual-column layout (e.g. `lg:col-span-7`), the panel width at 1024px is only ~400px.
- **Fast Detection**: Inspect any header containing both a title and tab group at 1024px viewport width (`document.querySelectorAll('.flex.justify-between')`). Check if `hRect.right > tabStripRect.left`.
- **Where it tends to appear**: `APWorkstationGrid`, `InvoiceDetailPage` tabs, `ExceptionsPage` filter bars.
- **Confidence**: High (confirmed with live DOM collision measurements).

---

### LESSON-002: 17-Character Indian Tabular Currency Strings Need at least 150px Usable Width
- **Pattern**: `formatCurrency(val, "INR")` formats full tabular numbers (e.g., `INR 15,26,812.00` = 17 chars). In monospace font (`font-mono`), each character is ~8.5px to 15px depending on font size. A 5-column grid on 1024px laptop viewports yields only 103px usable width per card, causing numbers to clip.
- **Fast Detection**: Search for `grid-cols-4` or `grid-cols-5` at `lg` breakpoints displaying `formatCurrency`.
- **Where it tends to appear**: Metric strips, dashboard cards, financial horizon summaries, invoice tables.
- **Confidence**: High (confirmed and fixed in `APFinancialHorizonStrip`).

---

### LESSON-003: Fixed Bottom Elements Require Safe-Area Bottom Padding on Scrollable Containers
- **Pattern**: Floating overlays like `CookieConsentBanner` (`fixed bottom-4 left-4 right-4 z-50`) overlap bottom action buttons and footer legal links if the parent container uses `overflow-hidden` or lacks bottom clearance (`pb-24` or `pb-28`).
- **Fast Detection**: Check any full-screen or modal layout for `overflow-hidden` combined with fixed bottom widgets.
- **Where it tends to appear**: Auth pages, modal drawers, onboarding overlays.
- **Confidence**: High.

---

### LESSON-004: All Money Values Must Retain Tabular Figures and Exact Precision
- **Pattern**: Per `AGENTS.md` and design system guidelines, financial figures must never be silently rounded in the UI, and tabular figures (`tabular-nums font-mono`) must be maintained to prevent visual jitter and misalignment.
- **Fast Detection**: Inspect money fields for `Math.round` without explicit currency compact helpers.
- **Where it tends to appear**: Invoices tables, approval rows, payment totals.
- **Confidence**: High.
