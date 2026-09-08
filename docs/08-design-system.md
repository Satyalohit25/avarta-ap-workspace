# 08. Design System

**Version:** 1.0 (Locked)
**Inspiration:** 21st.dev component craft, applied within the visual philosophy locked in Document 02 (Apple clarity, Linear speed, Stripe operational density, IBM Carbon data handling — never decorative, never playful).

---

# A Note on Influence

21st.dev is used as a reference for **component craft**: restrained borders, generous whitespace, calm neutral surfaces, one disciplined accent color, crisp small-scale typography, and quiet micro-interactions.

It is **not** used for its more expressive patterns — gradients, glow effects, glassmorphism, decorative color, or playful motion. Those contradict the locked Visual Philosophy (Document 02): *"Never decorative. Never playful. Never cluttered."*

Rule of thumb:

> Borrow the polish. Reject the flourish.

---

# 8.1 Design Philosophy

> The interface should disappear. The work should remain.

ClearOps is a tool people use for hours every day. It must feel calm under repetition, not exciting on first impression.

Principles carried from Document 02, restated as design law:

- Work first, decoration never.
- One accent color, used sparingly and consistently.
- Every visual choice must earn its place by aiding comprehension or speed.
- Nothing animates for delight. Motion only explains state change.
- Consistency beats novelty on every page.

---

# 8.2 Design Principles

```text
Clarity
    Every element has one obvious purpose.

Density with Air
    Enterprise data density, but never cramped.
    Whitespace creates hierarchy, not decoration.

Restraint
    One accent color.
    One font family.
    One shadow scale.
    One radius scale.

Predictability
    Identical components behave identically everywhere.

Quiet Confidence
    The UI never shouts. Status is always visible, never alarming
    unless the underlying situation is actually critical.
```

---

# 8.3 Brand Identity

## Name

ClearOps AP Workspace

## Brand Personality

```text
Calm
Precise
Trustworthy
Unshowy
Fast
```

## Voice in UI Copy

- Plain language over financial jargon where possible.
- Active voice: "Approve invoice," not "Invoice can be approved."
- Never apologize excessively in error states. State the problem, offer the fix.
- Numbers are always exact. Never round silently.

## Logo Usage

- Single-color mark in the sidebar header, 24px height.
- Never stretched, never recolored outside approved tokens.
- Sufficient clear space equal to the mark's own height on all sides.

## What ClearOps Is Not Visually

```text
✗ Gradients as decoration
✗ Playful illustration or mascots
✗ Multiple accent colors
✗ Heavy drop shadows
✗ Skeuomorphism
✗ Dense enterprise chrome (SAP/Oracle style)
```

---

# 8.4 Color System

## Philosophy

Color has exactly one meaning per context. Status color is never used decoratively.

## Neutral Scale (Foundation)

```text
neutral-0    #FFFFFF   App background (light)
neutral-50   #F7F8FA   Surface / page background
neutral-100  #EEF0F3   Subtle fill, hover surface
neutral-200  #E2E5EA   Borders, dividers
neutral-300  #C9CED6   Disabled borders
neutral-400  #9AA1AC   Placeholder text, icons (inactive)
neutral-500  #6B7280   Secondary text
neutral-600  #4B5563   Body text (secondary emphasis)
neutral-700  #374151   Body text (primary)
neutral-800  #1F2937   Headings
neutral-900  #111827   Highest-contrast text
```

## Accent (Primary Brand Color)

```text
accent-50    #EEF2FF
accent-100   #E0E7FF
accent-500   #4F46E5   Primary actions, links, focus rings
accent-600   #4338CA   Hover state
accent-700   #3730A3   Active/pressed state
```

Used only for: primary buttons, active nav state, selected states, links, focus rings. Never used for large decorative fills.

## Semantic Colors (Status)

```text
success-500  #16A34A   Approved, Paid, Matched, Passed
warning-500  #D97706   Pending, Medium Severity, Awaiting Action
error-500    #DC2626   Rejected, Critical, Failed, Duplicate
info-500     #2563EB   Informational, Processing, System messages
neutral-500  #6B7280   Draft, Inactive, Not Applicable
```

Each semantic color ships with a `-50` (background tint) and `-700` (text-on-tint) pairing for badges:

```text
success-bg   #F0FDF4     success-text  #15803D
warning-bg   #FFFBEB     warning-text  #B45309
error-bg     #FEF2F2     error-text    #B91C1C
info-bg      #EFF6FF     info-text     #1D4ED8
neutral-bg   #F3F4F6     neutral-text  #4B5563
```

## Severity Colors (Exceptions)

```text
Critical   error-500
High       #EA580C  (orange-600)
Medium     warning-500
Low        neutral-500
```

## Color Usage Rules

- Color is never the sole indicator of status — always paired with text or icon (Accessibility requirement, Doc 06.x, applies system-wide).
- Maximum one accent color per screen.
- Status colors never used for branding or navigation.
- Charts use a fixed, colorblind-safe categorical palette (see 8.19), independent of the status palette.

## Dark Mode

Out of scope for V1. Token structure (semantic naming, not raw hex, in implementation) allows a future dark palette without component rewrites.

---

# 8.5 Typography

## Typeface

**Inter** (system fallback: -apple-system, Segoe UI, Roboto, sans-serif).

Chosen for high legibility at small sizes, tabular figures for financial data, and neutral character consistent with 21st.dev-style interfaces.

## Type Scale

```text
Token        Size   Line Height   Weight   Usage
display      28px   36px          600      Page titles (rare)
h1           22px   28px          600      Section headers
h2           18px   24px          600      Card / panel headers
h3           15px   20px          600      Subsection labels
body-lg      15px   22px          400      Primary reading text
body         14px   20px          400      Default UI text
body-sm      13px   18px          400      Table cells, metadata
caption      12px   16px          400      Timestamps, helper text
label        12px   16px          500      Form labels, badges (uppercase optional)
mono         13px   20px          400      Invoice numbers, IDs, GST/PO numbers
```

## Numeric Data

All currency and quantity values use **tabular figures** (`font-variant-numeric: tabular-nums`) so amounts align vertically in tables.

## Rules

- No more than 3 weights in the entire application: 400, 500, 600.
- No italics except inline citations in help text.
- Headings never use the accent color.
- Line length in reading contexts (comments, descriptions) capped around 75ch.

---

# 8.6 Spacing System

4px base unit. All spacing values are multiples of 4.

```text
space-1    4px
space-2    8px
space-3    12px
space-4    16px
space-5    20px
space-6    24px
space-8    32px
space-10   40px
space-12   48px
space-16   64px
```

## Application

```text
Field vertical rhythm         space-4
Card internal padding         space-4 to space-6
Section gaps                  space-8
Page margins (desktop)        space-8
Table cell padding            space-3 horizontal, space-2 vertical
Icon-to-label gap             space-2
```

No arbitrary pixel values in components. Every margin/padding maps to a token.

---

# 8.7 Grid & Layout

## Base Grid

12-column grid, 24px gutters, fluid within max container width.

## Structural Widths

```text
Sidebar (expanded)     240px
Sidebar (collapsed)    64px
Content max-width      1440px
Inspector panel        360px
Modal (standard)       560px
Modal (large)          800px
Document Preview pane  ~50% of split layout, min 480px
```

## Page Template (matches Doc 05's Global Layout)

```text
+------------------------------------------------+
| Top Navigation (64px height)                    |
+--------+-----------------------------------------+
|        | Breadcrumb / Page Title / Page Actions   |
|        +-------------------------------------------+
| Side   | Filters / Search                           |
| bar    +-------------------------------------------+
| 240px  | Primary Content                            |
|        +-------------------------------------------+
|        | Inspector (contextual)                     |
+--------+-----------------------------------------+
```

## Breakpoints

```text
mobile      < 768px
tablet      768px – 1279px
desktop     ≥ 1280px
wide        ≥ 1600px (content max-width caps, extra margin only)
```

---

# 8.8 Elevation & Shadows

Shadows are used only to indicate **layering**, never for decoration.

```text
shadow-none    Flat surfaces, page background, table rows
shadow-xs      0 1px 2px rgba(16,24,40,0.05)   Cards, inputs on focus
shadow-sm      0 1px 3px rgba(16,24,40,0.10)   Dropdowns, popovers
shadow-md      0 4px 12px rgba(16,24,40,0.12)  Modals, drawers
shadow-lg      0 12px 24px rgba(16,24,40,0.16) Reserved — rarely used
```

Rules:

- Maximum two elevation levels visible on screen at once.
- No shadows on static content cards (KPI cards, tables) — borders are used instead (see below).
- Sidebar and top navigation are flat, separated from content by a 1px border, not a shadow.

---

# 8.9 Border Radius

```text
radius-xs    4px    Badges, chips, small controls
radius-sm    6px    Inputs, buttons
radius-md    8px    Cards, table containers
radius-lg    12px   Modals, panels
radius-full  9999px Avatars, status dots, pill badges
```

Consistent, moderate rounding across the system — enough to feel modern (21st.dev-influenced), not soft enough to feel playful.

---

# 8.10 Icons

## Icon Set

**Lucide** — single icon library, used exclusively. No mixing icon sets.

## Sizing

```text
icon-sm   16px   Inline with body/caption text, table rows
icon-md   20px   Buttons, nav items, form fields
icon-lg   24px   Page headers, empty states
```

## Rules

- Stroke width fixed at 1.5px across all sizes.
- Icons are always paired with a text label in navigation and primary actions — never icon-only except in dense table row actions (with a tooltip and aria-label).
- Status icons (check, warning triangle, x-circle) always use the matching semantic color token, never the accent color.

---

# 8.11 Illustration

Illustration use is intentionally minimal, consistent with "never decorative, never playful."

## Where Illustration Appears

```text
Empty states only
```

## Style

- Simple, single-color line illustrations using neutral-300/400.
- No characters, no mascots, no humor.
- Illustration is always secondary to the message — text leads, image supports.

## Where Illustration Never Appears

```text
Dashboard
Onboarding beyond first-run empty states
Error pages
Loading states (use skeletons, not illustration)
```

---

# 8.12 Motion

Motion principles, restated from Document 02 as design law:

```text
Motion communicates change. Motion never decorates.

Used for:
    Loading
    Progress
    Navigation transitions
    State changes (status badge updates, row removal)
    Success confirmation
    Failure indication

Never used for:
    Page entrance flourishes
    Hover "delight" effects
    Decorative parallax or background motion
```

---

# 8.13 Animation

## Duration Tokens

```text
duration-fast     120ms   Hover, focus, toggle
duration-base     200ms   Panel open/close, tab switch
duration-slow     320ms   Modal, drawer entrance
duration-page     400ms   Route transitions (fade only)
```

## Easing

```text
ease-standard   cubic-bezier(0.4, 0, 0.2, 1)   Default for all UI motion
ease-emphasized cubic-bezier(0.2, 0, 0, 1)     Modal/drawer entrance only
```

## Concrete Patterns

```text
Status change        Badge cross-fades old → new (duration-fast)
Row removed           Row collapses height + fades (duration-base)
Toast enter/exit       Slide + fade (duration-base)
Modal enter             Scale 0.98 → 1 + fade (duration-slow, ease-emphasized)
Skeleton shimmer         Continuous, subtle, 1.5s loop
Progress bar fill         Linear, matches actual progress — never fake-eased
```

No bounce, spring, or elastic easing anywhere in the system.

---

# 8.14 Interaction States

Every interactive component must define all of the following:

```text
Default
Hover        neutral-100 fill or accent-50 for accent elements
Focus        2px accent-500 ring, 2px offset — always visible, never suppressed
Active/Pressed  accent-700 or neutral-200, slightly deeper than hover
Selected     accent-50 background + accent-500 left border (table rows, nav items)
Disabled     40% opacity, no pointer events, neutral-300 border
Loading      Content replaced by inline spinner (buttons only) or skeleton (containers)
Error        error-500 border + error-50 background (form fields)
```

Focus states are never removed for aesthetic reasons — this is a non-negotiable accessibility requirement (see 8.15).

---

# 8.15 Accessibility

Target: **WCAG 2.1 AA** across the entire application.

## Contrast

```text
Body text on background        ≥ 4.5:1
Large text / headings          ≥ 3:1
Interactive component borders  ≥ 3:1
Status badge text on tint bg   ≥ 4.5:1 (validated per token pair in 8.4)
```

## Requirements Carried From Module Specs

- Color is never the only status indicator — always paired with icon and/or text (repeated in every module spec).
- All tables are fully keyboard navigable with visible focus states.
- All interactive icons have `aria-label`.
- Skeleton loaders and progress announce state changes to screen readers via `aria-live="polite"`.
- Forms link error messages to their field via `aria-describedby`.
- Drop zones (file upload) are keyboard operable, not drag-only.
- Minimum hit target size: 40x40px for all clickable controls, including table row actions.

---

# 8.16 Responsive Design

Consistent with the Desktop / Tablet / Mobile pattern locked across every module spec.

```text
Desktop (≥1280px)
    Full sidebar, full tables, split layouts side-by-side.

Tablet (768–1279px)
    Collapsible sidebar, reduced table columns,
    split layouts stack (document above details).

Mobile (<768px)
    Sidebar becomes a drawer.
    Tables become stacked cards.
    Tabs become horizontal scroll.
    Bottom action bars become sticky.
    Single-column forms.
```

## Rule

Nothing is hidden on mobile that changes the meaning of the data — only density and layout adapt. Every action available on desktop remains available on mobile, possibly relocated.

---

# 8.17 Design Tokens

Tokens are the single source of truth. Components consume tokens; they never hardcode raw values.

## Token Categories

```text
color.*        (8.4)
font.*          (8.5)
space.*          (8.6)
radius.*          (8.9)
shadow.*           (8.8)
duration.*          (8.13)
easing.*             (8.13)
breakpoint.*          (8.16)
```

## Example Token File Shape

```json
{
  "color": {
    "accent": { "500": "#4F46E5", "600": "#4338CA" },
    "success": { "500": "#16A34A", "bg": "#F0FDF4", "text": "#15803D" }
  },
  "space": { "1": "4px", "2": "8px", "4": "16px" },
  "radius": { "sm": "6px", "md": "8px" },
  "font": {
    "body": { "size": "14px", "lineHeight": "20px", "weight": 400 }
  }
}
```

## Rule

Any new color, spacing value, or font size must be added to the token set before use. No inline one-off values in component code.

---

# 8.18 Components

Full inventory is defined in **Document 07 — Reusable Component Library**. This section governs how tokens bind to those components.

```text
Every component consumes:
    color tokens for surface, border, text
    space tokens for padding/margin
    radius tokens for corners
    shadow tokens for elevation (where applicable)
    duration/easing tokens for any transition
```

No component may define a locally-scoped color, spacing, or radius value outside the token set. This is what makes "one DataTable, reused everywhere" (Doc 07) actually hold up visually.

---

# 8.19 Data Visualization

Applies to **Reports only** (see correction below).

> Correction to Doc 07: Document 06.1 (Dashboard) locks "no charts on the default dashboard." Document 07's chart scope ("used only inside Reports and Dashboard") conflicts with that and is superseded here — charts are used in **Reports only**. Dashboard KPI Cards use the Summary Card component, not the chart library.

## Chart Palette (Categorical, Colorblind-Safe)

```text
series-1   #4F46E5  (accent)
series-2   #0EA5E9
series-3   #16A34A
series-4   #D97706
series-5   #DC2626
series-6   #6366F1
series-7   #6B7280
```

Maximum 7 series per chart before falling back to a table (Doc 06.11: "no pie charts with many categories").

## Rules

- Status/severity colors (8.4) are never reused as chart series colors — different semantic system, avoids confusion between "this bar is red because it's the 3rd category" vs. "this is red because it's critical."
- All charts ship with an accessible data table equivalent (8.15).
- No 3D effects, no gauges, per Doc 06.11.
- Gridlines use neutral-200, never full-opacity black.

---

# 8.20 Tables

The single DataTable component (Doc 07) follows these visual rules:

```text
Row height             40px (default), 48px (touch/tablet)
Header                 neutral-50 background, sticky, body-sm/label weight
Row border              1px neutral-200, bottom only (no vertical rules)
Row hover               neutral-50 fill
Row selected             accent-50 fill + accent-500 left border, 2px
Zebra striping           Not used — flat rows, hierarchy from borders only
Cell padding             space-3 horizontal, space-2 vertical
Numeric columns          Right-aligned, tabular figures
Status column             Always renders Status Badge, never raw text
Sort indicator            Chevron icon, accent-500 when active
Sticky header             Enabled by default
Empty column overflow      Ellipsis truncation with tooltip on hover
```

---

# 8.21 Forms

```text
Label position           Above field, label token (12px/500)
Field height              36px (default), 40px on touch
Field border               1px neutral-300, radius-sm
Field focus                 accent-500 border + 2px accent ring
Field error                  error-500 border, error message below in caption/error-text
Helper text                   caption token, neutral-500
Required indicator             Asterisk, never color-only
Disabled field                  neutral-100 fill, neutral-400 text
Currency input                   Symbol prefix fixed to locale, tabular figures
Inline validation                 On blur, not on every keystroke
```

Editable fields inside Invoice Details / Exception Details use the same input components as Settings — no separate "invoice-specific" input styling (Doc 07 reuse rule).

---

# 8.22 Navigation

```text
Sidebar item height         40px
Sidebar item padding         space-3 horizontal
Active item                   accent-50 background, accent-700 text, accent-500 left bar (3px)
Hover item                     neutral-100 background
Icon + label                    Always both, never icon-only in primary nav
Section dividers                 1px neutral-200, space-4 margin above/below
Breadcrumb separator              "›" chevron, neutral-400
Tabs (underline style)              2px accent-500 underline on active, neutral-500 text inactive
Top nav height                       64px, 1px neutral-200 bottom border, flat (no shadow)
```

---

# 8.23 Feedback

```text
Toast          Bottom-right, 4 variants (success/warning/error/info),
                auto-dismiss 4s (success/info), manual dismiss for error/warning,
                max 1 visible at a time — additional toasts queue.

Alert           Persistent, inline, used for page-level warnings
                 (e.g. "Integration sync failed"), dismissible if non-blocking.

Confirmation     Used before: Archive, Approve (bulk), Reject, Save Critical
Dialog            Changes. NOT used for "Delete" — no entity in ClearOps
                   is deletable (superseding Doc 07's listing of "Delete"
                   as a trigger; replace with Archive/Deactivate/Revoke).

Inline validation  Field-level, appears on blur, error-text token.
```

---

# 8.24 Empty States

Consistent structure across every module (already locked per-spec; formalized here):

```text
Illustration (8.11, optional for dense operational pages)
Title            body-lg, neutral-700
Description       body-sm, neutral-500
Primary Action      Button, when a clear next step exists
```

Examples already locked in module specs:

```text
"No invoices waiting. You're all caught up." (Dashboard)
"No invoices received today. Upload your first invoice." (Inbox)
"No exceptions. All invoices are progressing normally." (Exceptions)
```

Empty states are written to be reassuring, not apologetic — absence of work is a good outcome in an AP workspace.

---

# 8.25 Loading States

```text
Page load             Skeleton layout matching final content shape.
                        Never a full-page spinner.

Table load              Skeleton rows (5–8), header renders immediately.

Button load               Inline spinner replaces label, button stays same width.

Long-running (Inbox        Progress bar per stage, live-updating,
processing pipeline)         per Doc 06.2.

Chart load                    Skeleton chart shape, not a spinner.
```

Rule, restated from Doc 07: **spinners only inside buttons. Never for page-level loading.**

---

# 8.26 AI Components

```text
AI Confidence Badge
    ≥ 90%    success token, "High confidence"
    70–89%   warning token, "Review recommended"
    < 70%    error token, "Low confidence — verify"

AI Suggestion Card
    Field name, current value, suggested value, confidence badge, reason
     (one short sentence), Accept / Dismiss buttons — both required,
     neither pre-selected.

Highlighted Fields
    Fields with AI-suggested changes get a 1px accent-500 left border
     and a small "AI" chip — never a full-field color fill
     (avoids implying the value is already validated/correct).
```

Rule, carried from Document 02: AI never pre-accepts its own suggestions. The Accept action always requires a deliberate user click — never a default-checked state.

---

# 8.27 Enterprise UX Patterns

```text
Bulk Action Bar        Appears only on selection, sticky to bottom of
                         table viewport, shows count ("12 selected").

Saved Views              Pill-style tabs above the table, user-creatable,
                           default views cannot be deleted (Doc 06.3).

Inspector Panel            Sticky right panel on detail pages, always
                             shows: status, owner, due date, priority,
                              AI confidence, workflow stage.

Progressive Disclosure       List → Detail → Tab → Sub-detail. Never more
                               than this depth (Doc 02, Doc 05).

Split Layout                   Document + data, used only where an original
                                 source document must be verified against
                                  extracted data (Invoice Details, Exception
                                   Details).
```

---

# 8.28 Apple Design Language Rules

Adapted from Apple's Human Interface Guidelines triad — **Clarity, Deference, Depth** — for an enterprise financial workspace:

```text
Clarity
    Text is legible at every size used. Icons are precise, not decorative.
    Negative space is used deliberately, not left over.

Deference
    UI chrome recedes; content (the invoice, the data, the decision)
    is always the visual focus. Fluid motion and thin, subtle interface
    elements help people understand and interact with content without
    competing with it.

Depth
    Distinct visual layers (sidebar, content, inspector, modal) convey
    hierarchy through subtle elevation (8.8) and layering — never
    through heavy shadows or 3D effects.
```

Applied constraint specific to ClearOps: unlike consumer Apple products, **no gesture-driven or hidden UI**. Every action must have a persistently visible affordance — enterprise finance users cannot be expected to discover swipe gestures.

---

# 8.29 Implementation Guidelines

```text
Tokens                Implemented as CSS custom properties, mapped to a
                        Tailwind config (color, spacing, radius, shadow,
                         fontSize) so components reference tokens, not
                          raw values (aligns with the frontend-design
                           conventions used for this application).

Component build order   Foundation tokens → Base components → Composite
                           components → Page sections → Pages
                            (Doc 07 hierarchy).

Theming                   Single light theme in V1. Token-based structure
                            (semantic names, not raw hex) so a dark theme
                             can be added later without component rewrites.

New component rule          Before building a new component, check Doc 07's
                              inventory. If an existing component can be
                               composed to solve the problem, do not create
                                a new one.
```

---

# 8.30 Design Checklist

Before any page or component ships:

```text
□ Uses only tokens defined in 8.17 — no raw hex/px values
□ All interactive elements have hover, focus, active, disabled states
□ Focus ring visible and meets contrast requirements
□ Color is never the sole status indicator
□ Loading state uses skeleton (page/table) or inline spinner (button) only
□ Empty state follows the Title + Description + Action pattern
□ Component reused from Doc 07 inventory, not duplicated
□ Responsive across desktop / tablet / mobile per 8.16
□ Keyboard fully navigable, tested without a mouse
□ No decorative motion — every animation communicates a state change
□ Matches locked page structure: Header → Toolbar → Content → Inspector → Actions
```

---

# 8.31 Locked Decisions

```text
✓ Single accent color (Indigo 500), used only for primary actions,
   links, active states, and focus rings.

✓ Neutral-first palette; status conveyed through a fixed 5-color
   semantic system (success/warning/error/info/neutral).

✓ Inter typeface, 3 weights only (400/500/600), tabular figures for
   all numeric/financial data.

✓ 4px base spacing grid. No off-grid spacing values.

✓ Lucide icon set exclusively, 1.5px stroke, always paired with text
   in primary navigation.

✓ Illustration limited to empty states only — no mascots, no
   decorative art elsewhere in the product.

✓ Motion communicates state change only. No decorative animation.

✓ WCAG 2.1 AA is the accessibility floor for the entire application.

✓ Charts are scoped to Reports only — Dashboard remains chart-free
   (this document supersedes Doc 07's "Reports and Dashboard" scoping).

✓ No entity in the application is ever deleted — Confirmation Dialogs
   trigger on Archive / Deactivate / Revoke / Approve / Reject, never
   "Delete" (this document supersedes Doc 07's listing of "Delete").

✓ One token system feeds every component; no component defines a
   local, one-off visual value.

✓ 21st.dev influence is limited to component craft and polish —
   never to decorative color, gradients, or playful motion, which
   remain prohibited by Document 02's Visual Philosophy.
```
