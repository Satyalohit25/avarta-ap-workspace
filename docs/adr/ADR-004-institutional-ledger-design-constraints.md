# ADR 004: Institutional Ledger Design Constraints & De-Vibecoding Standards

* **Status:** Accepted & Enforced
* **Date:** 2026-10-27
* **Deciders:** Head of Product, Principal Frontend Architect, Senior Financial Data Scientist
* **Scope:** `@ap-saas/web`, `apps/web/src`, design tokens, component library

---

## 1. Context & Problem Statement

Prior audits of `apps/web` identified visual and architectural friction common in early-stage consumer SaaS ("vibecoding"):
1. Pillowy border radii (12px–16px, `rounded-xl`/`rounded-2xl`).
2. Heavy drop shadows (`shadow-2xs` through `shadow-2xl`) causing visual blur and uncalibrated depth.
3. Translucent "liquid glass" (`backdrop-blur-md`, `backdrop-blur-xs`) on headers and action bars causing GPU texture sampling and paint bottlenecks during high-frequency ledger scrolling.
4. Marketing tropes (asymmetric bento grids, 3-column pricing tier cards with green checkmark bullets) placed within operational enterprise workflows.
5. Unicode emojis (`⚡`, `✓`, `✔`) and consumer AI tropes (`<Sparkles />`).
6. Inconsistent numerical alignment and em-dashes (`—`) in financial tables, causing cognitive friction for financial controllers auditing double-entry ledgers.

For an enterprise Accounts Payable and Financial Operations workstation serving CFOs, controllers, and AP specialists, high-trust institutional precision (Bloomberg/Stripe-grade) is mandatory.

---

## 2. Decision & Invariants

We codify the following non-negotiable architectural and visual constraints across `@ap-saas/web`:

### 2.1 Geometric Radius Clamping (Max 8px)
- **`xs: 2px`** — Micro badges, inline tags.
- **`sm: 4px`** — Form controls, inputs, buttons, status chips, `<kbd>`.
- **`md: 6px`** — Standard ledger cards, table wrappers, popovers, dropdown menus.
- **`lg: 8px`** — Modals, dialogs, command palettes (**hard maximum allowable corner radius**).
- **`full: 9999px`** — Strictly reserved for 6px status indicator dots and user avatar thumbnails.
- *Rule:* Radii ≥ 12px (`rounded-xl`, `rounded-2xl`, `rounded-3xl`) are strictly prohibited on static and layout surfaces.

### 2.2 Flat Structural Elevation & Zero Micro-Shadows
- Static surface elevation is communicated strictly through **1px hairline structural borders** (`border-neutral-200 dark:border-zinc-800`) and subtle background contrast.
- Static drop shadows (`shadow-2xs`, `shadow-xs`, `shadow-sm`) are nullified to `none`.
- Subtle elevation (`shadow-lg` / `overlay`) is reserved strictly for floating z-50 dialog overlays (`CommandPalette`, `DialogPrimitive.Content`).

### 2.3 Zero Atmospheric Blur ("Liquid Glass")
- All `backdrop-blur-*` utilities and translucent opacity modifiers (`bg-white/80`, `bg-neutral-900/95`) are banned from headers, sticky bars, overlays, and tables.
- All chrome, headers, and action bars must be **solid and opaque** (`bg-white dark:bg-zinc-900` or `bg-slate-900`).

### 2.4 Strict Tabular Numeral Precision (`tabular-nums`)
- `font-variant-numeric: tabular-nums` is globally enforced on `table, th, td, .tabular-nums, [data-numeric="true"], input[type="number"]`.
- All financial figures, invoice numbers, tax codes, and dates must align deterministically across vertical columns.

### 2.5 Double-Entry Accounting Notation
- When an account column (Debit or Credit) has zero balance, it must render as `0.00` with `tabular-nums`, rather than an ambiguous em-dash (`—`).
- Table fallbacks for missing textual metadata must use `<span className="font-mono text-xs text-neutral-400">N/A</span>`.
- Currency select labels must use standard institutional parentheses: `INR (₹) Indian Rupee`.

### 2.6 Zero Decorative Motion
- Per `AGENTS.md`: *"No decorative motion — animation only communicates state change."*
- `hover:scale-*`, `group-hover:translate-x-*` chevron slides, and layout-thrashing `transition-all` are strictly banned.
- Interactive states communicate focus purely through background tint (`hover:bg-neutral-100 dark:hover:bg-zinc-800/60`), instantaneous state feedback (`transition-colors duration-100`), and WCAG 2.2 AA compliant `:focus-visible` rings.

### 2.7 Iconography & Semantics
- Consumer AI tropes (`<Sparkles />`) are banned; system intelligence is communicated with deterministic technical icons (`<Cpu />`, `<ScanLine />`, `<Layers />`).
- Literal Unicode emojis (`⚡`, `✓`, `✔`) are banned in copy, buttons, and badges.
- Statuses must combine high-contrast neutral structural frames with a 6px semantic indicator dot (`bg-emerald-600`, `bg-amber-500`, `bg-rose-600`, `bg-blue-600`, `bg-neutral-400`).

### 2.8 Ledger Symmetry vs. Bento/Tier Marketing Grids
- Operational screens (Overview, Invoices, Approvals, Payments) must use symmetrical, uniform 1px-divided telemetry strips and data tables.
- Marketing 3-column pricing tier cards are prohibited in workspace settings; subscription capacities must be rendered as an **Enterprise Subscription & Entitlement Matrix table**.

---

## 3. Enforcement & Verification

1. **Automated Search Verification:**
   - `rg "backdrop-blur" apps/web/src/` must return `0`.
   - `rg "Sparkles" apps/web/src/` must return `0`.
   - `rg "[⚡✓✔]" apps/web/src/` must return `0`.
   - `rg "hover:scale-|group-hover:translate-x-" apps/web/src/` must return `0`.
2. **Theme Guard in `tailwind.config.ts`:**
   - `borderRadius.lg: "8px"`, `xl: "8px"`, `"2xl": "8px"`.
   - `boxShadow['2xs']: 'none'`, `xs: 'none'`, `sm: 'none'`.
3. **CI Pipeline:**
   - Any PR or commit failing the TypeScript check (`pnpm --filter @ap-saas/web typecheck`) or Vite production build (`pnpm --filter @ap-saas/web build`) is blocked.
