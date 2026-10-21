---
name: ui-design-engineering
description: >-
  Production-grade enterprise UI/UX engineering, distinctive visual craft, design tokens,
  Tailwind layouts, micro-interactions, accessibility (WCAG 2.2 AA), and financial SaaS component craft.
  Activate when creating, refactoring, or auditing UI components, layouts, forms, tables, split-views,
  or user flows in apps/web.
---

# UI Design Engineering & Enterprise Craft

High-velocity engineering standard for building stunning, dense, accessible, and mathematically precise financial interfaces in Avarta AP Workspace (`apps/web`).

---

## 1. Distinctive Visual Craft & Anti-Template Principles

Avoid the generic tells of AI-generated dashboards. Build interfaces that feel like a precision financial instrument:

* **Ground in AP Operator Reality**:
  * Accounts Payable operators process hundreds of invoices a day. They care about high information density, zero visual noise, keyboard efficiency, and instant discrepancy recognition.
  * *Avoid AI tells*: Never accent a single arbitrary word in a headline with bold or color. Never use decorative numbered markers (01, 02) when content is not a sequence. Never add synthetic legal/compliance badges or marketing fluff.
* **Orchestrated, Purposeful Motion**:
  * Animation must communicate state change, never decorate.
  * Allowed transitions: Button loading spinner during server mutation, modal/drawer slide with subtle backdrop blur (`backdrop-blur-sm transition-all duration-200`), tab switching cross-fades, and toast notifications.
  * Disallowed: Scattered section entrance animations, bouncy hover cards, or decorative parallax.
* **Split-Screen Workbench**:
  * For Invoice Capture and Matching, implement a responsive split layout: Original Document PDF viewer on the left (50%) and Structured Fields / 3-Way Match Line Items on the right (50%).
  * Maintain synchronized line-highlighting when inspecting extracted fields.

---

## 2. Design System Tokens (Single Source of Truth)

All styling must strictly align with `apps/web/src/design-system/tokens.ts`. Never use arbitrary hex colors or hardcoded pixel spacing.

* **Accent / Brand**:
  * Primary: `#4F46E5` (`tokens.color.primary` / `bg-indigo-600` / `text-indigo-600`)
  * Primary Hover: `#4338CA` (`tokens.color.primaryHover` / `hover:bg-indigo-700`)
* **Semantic Status Colors**:
  * Success: `#16A34A` (`tokens.color.success` / emerald/green)
  * Warning: `#D97706` (`tokens.color.warning` / amber)
  * Error: `#DC2626` (`tokens.color.error` / red)
  * Info: `#2563EB` (`tokens.color.info` / blue)
  * Neutral: `#6B7280` (`tokens.color.neutral` / gray/slate)
  * *Rule:* Never use color as the sole status indicator. Always pair with text and an icon/dot.
* **Surface & Canvas Hierarchy**:
  * Canvas: `#F7F8FA` (`bg-slate-50` / canvas background)
  * Surface: `#FFFFFF` (`bg-white` / cards, table containers)
  * Surface Muted: `#EEF0F3` (`bg-slate-100` / zebra rows, badge backdrops)
  * Border: `#E2E5EA` (`border-neutral-200` or `border-slate-200`)
* **Spacing Scale (4px Grid)**:
  * Multiples of 4px only: `gap-1` (4px), `gap-2` (8px), `gap-3` (12px), `gap-4` (16px), `gap-6` (24px), `gap-8` (32px).
* **Radius Scale**:
  * `rounded-sm` (4px) for micro-badges and tags
  * `rounded-md` (6px) for form inputs, buttons, and select triggers
  * `rounded-lg` (8px) for cards, dialog modals, and floating menus
  * `rounded-xl` (12px) for primary layout surfaces and outer tables
* **Typography Scale (Inter)**:
  * Inter across all copy. Weights: `400` (normal), `500` (medium), `600` (semibold) only.
  * Tabular Numbers: Always apply `tabular-nums font-mono` to currency, balances, tax amounts, line items, and timestamps.
  * Right-align financial numbers in tables (`text-right font-mono tabular-nums`).

---

## 3. Canonical Component Palette (`apps/web/src/components/ui/`)

Leverage pre-built, tested design-system components instead of rolling ad-hoc elements:

| Component | Path | Use Case |
| :--- | :--- | :--- |
| `<Button>` | `components/ui/Button.tsx` | Primary (`variant="default"`), secondary (`outline`), quiet (`ghost`), danger (`destructive`). |
| `<Card>` | `components/ui/Card.tsx` | Standard surface container with header, content, and footer slots. |
| `<StatsCard>` | `components/ui/StatsCard.tsx` | KPI tiles with title, value, icon, and trend indicators. |
| `<MetricStrip>` | `components/ui/MetricStrip.tsx` | Top-of-page compact horizontal KPI row. |
| `<StatusBadge>` | `components/StatusBadge.tsx` | Domain status indicators for Invoice, Payment, and PO states. |
| `<Badge>` | `components/ui/Badge.tsx` | Generic categorical, priority, or count tags. |
| `<Dialog>` | `components/ui/Dialog.tsx` | Modal confirmations, assignments, and critical interventions. |
| `<Sheet>` | `components/ui/Sheet.tsx` | Slide-over drawer for deep inspection, audit logs, and detail editing. |
| `<FilterTokenBar>` | `components/ui/FilterTokenBar.tsx` | Filter chips for status, date range, supplier, and currency. |
| `<PropertyInspector>` | `components/ui/PropertyInspector.tsx` | Key-value attribute panels for invoice/vendor metadata. |
| `<EmptyState>` | `components/EmptyState.tsx` | Actionable zero-data states with icon, descriptive title, and primary CTA. |
| `<Skeleton>` | `components/Skeleton.tsx` | Pulsing content placeholders while asynchronous data loads. |
| `<Toast>` / `useToast` | `components/ui/ToastContext.tsx` | Transient user feedback notifications for completed actions. |

---

## 4. Product Ergonomics & Non-Negotiable Invariants

1. **AI Suggests, Humans Decide**:
   * Never auto-apply AI extractions or advance workflow states automatically based on confidence scores.
   * High confidence (≥95%): Pre-fill values + 1-click accept button (explicit user click required).
   * Medium confidence (80–94%): Render recommendation badge + explicit confirmation input.
   * Low confidence (<80%): Leave fields blank for manual entry; flag with warning indicator.
2. **No Optimistic UI on Financial Operations**:
   * Never optimistically transition state for approval clicks, payment batches, or ERP syncs.
   * Disable button, show active loading spinner, await server confirmation, then update UI and display toast.
3. **Zero "Delete" Affordances**:
   * Destructive actions must read "Archive", "Deactivate", "Reject", or "Revoke". Never label a button "Delete".
4. **Single Forward Action per View**:
   * Avoid competing primary buttons. Use one high-contrast primary CTA (`bg-indigo-600`) and auxiliary actions in `variant="outline"` or `variant="ghost"`.
   * For terminal states (`SYNCED`, `REJECTED`, `ARCHIVED`), do not render pseudo-primary forward buttons.
5. **Keyboard & Accessibility Discipline (WCAG 2.2 AA)**:
   * Visible focus rings on all interactive elements (`focus-visible:ring-2 focus-visible:ring-indigo-500`).
   * Explicit label bindings (`htmlFor` matching input `id`).
   * Contrast ratio ≥ 4.5:1 for body copy and badge text.

---

## 5. Verification & Proof Standard

* Run headless Playwright specs: `npx playwright test <spec-path>`.
* Ensure tests use accessible role locators: `page.getByRole('button', { name: 'Approve' })`.
* Capture visual proof artifacts to the active brain conversation directory if visual audit is required.
