# 07. Reusable Component Library

**Version:** 1.0 (Locked)

---

# Objective

The application is built from a **small, reusable set of UI components**.

Every page should be assembled from these components.

If a new feature requires a brand-new component, first verify that an existing component cannot solve the problem.

**Build once. Reuse everywhere.**

---

# Design Principles

- One responsibility per component.
- Consistent spacing.
- Consistent interactions.
- Accessible by default.
- Responsive by default.
- Stateless whenever possible.
- Composable over configurable.
- No duplicate components.

---

# Component Hierarchy

```text
Foundation

├── Tokens
├── Icons
├── Typography
├── Colors
└── Grid

↓

Base Components

↓

Composite Components

↓

Page Sections

↓

Pages
```

---

# 1. Layout Components

## App Layout

Used by every authenticated page.

Contains

```text
Top Navigation

Sidebar

Main Content

Notification Drawer

Profile Menu
```

---

## Page Layout

Contains

```text
Page Header

Toolbar

Content

Footer (optional)
```

---

## Split Layout

Used by

- Invoice Details
- Exception Details

```text
Left Panel

Right Panel
```

---

## Card Grid

Responsive KPI cards.

---

## Container

Standard content width.

---

## Stack

Vertical spacing.

---

## Inline

Horizontal spacing.

---

# 2. Navigation Components

## Sidebar

Used everywhere.

Contains

```text
Navigation Items

Collapse

Active State
```

---

## Top Navigation

Contains

```text
Logo

Global Search

Notifications

Profile
```

---

## Breadcrumb

Used in detail pages.

Example

```text
Invoices

>

Invoice Details
```

---

## Tabs

Used by

```text
Invoice Details

Exception Details

Reports
```

---

## Pagination

Server-side pagination.

---

# 3. Data Display Components

## Data Table

Most important component.

Supports

```text
Sorting

Filtering

Pagination

Sticky Header

Virtualization

Column Resize

Column Hide

Column Reorder

Selection

Actions
```

Used by

```text
Invoices

Payments

Approvals

Suppliers

Purchase Orders

Reports

Audit

Users
```

---

## Summary Card

Displays

```text
Title

Value

Trend (optional)

Status (optional)
```

Clickable.

---

## Status Badge

Variants

```text
Success

Warning

Error

Info

Neutral
```

---

## Priority Badge

Variants

```text
High

Medium

Low
```

---

## Avatar

Displays

```text
Initials

Photo
```

---

## Timeline

Displays

```text
Event

Time

User

Status
```

---

## Audit Table

Specialized read-only table.

---

## Property List

Displays

```text
Label

Value
```

Used for invoice metadata.

---

# 4. Form Components

## Text Input

---

## Number Input

---

## Currency Input

---

## Date Picker

---

## Search Input

Instant search.

---

## Select

Single select.

---

## Multi Select

---

## Toggle

Boolean settings.

---

## Checkbox

---

## Radio Group

---

## Text Area

---

## File Upload

Supports

```text
Drag & Drop

Browse

Progress
```

---

## Document Viewer

Supports

```text
Zoom

Rotate

Page Navigation

Download

Fullscreen
```

Read-only.

---

# 5. Action Components

## Primary Button

One per page.

---

## Secondary Button

---

## Ghost Button

---

## Icon Button

---

## Dropdown Menu

---

## Overflow Menu

Three-dot menu.

---

## Floating Action Bar

Used for

```text
Bulk Actions
```

---

# 6. Feedback Components

## Toast

Variants

```text
Success

Warning

Error

Info
```

Auto dismiss.

---

## Alert

Persistent.

---

## Confirmation Dialog

Used before

```text
Delete

Archive

Approve

Reject

Save Critical Changes
```

---

## Empty State

Contains

```text
Illustration

Title

Description

Primary Action
```

---

## Skeleton Loader

Used everywhere.

No loading spinners.

---

## Error State

Contains

```text
Message

Retry
```

---

# 7. Collaboration Components

## Comments

Supports

```text
Mentions

Attachments

Replies
```

---

## Activity Feed

Chronological.

---

## User Picker

Search users.

---

# 8. AI Components

## AI Confidence

Displays

```text
Score

Color

Confidence Level
```

---

## AI Suggestion Card

Displays

```text
Field

Suggested Value

Reason

Confidence

Accept
```

---

## Validation Card

Displays

```text
Rule

Status

Message
```

---

# 9. Chart Components

Supported

```text
Line Chart

Bar Chart

Stacked Bar

Area Chart

Donut Chart

Treemap

Heatmap

Table
```

Used only inside Reports and Dashboard.

---

# 10. Overlay Components

## Modal

Large dialog.

---

## Drawer

Side panel.

---

## Popover

Small contextual overlay.

---

## Tooltip

Short explanation.

---

# 11. Utility Components

## Divider

---

## Spacer

---

## Chip

Used for

```text
Filters

Tags
```

---

## Progress Bar

---

## Spinner

Only inside buttons.

Never used for page loading.

---

## Copy Button

Copies

```text
Invoice Number

PO Number

Reference ID

API Token
```

---

# 12. Domain Components

## Invoice Card

Displays

```text
Status

Vendor

Amount

Due Date
```

---

## Exception Card

Displays

```text
Severity

Issue

Owner
```

---

## Approval Card

Displays

```text
Approver

Amount

Due Date
```

---

## Payment Card

Displays

```text
Status

Method

Batch
```

---

## Supplier Card

Displays

```text
Supplier

Outstanding Balance

Status
```

---

## Purchase Order Card

Displays

```text
PO

Remaining Balance

Status
```

---

# Shared Component Usage

| Component | Used In |
|-----------|---------|
| App Layout | Every Page |
| Sidebar | Every Page |
| Top Navigation | Every Page |
| Page Header | Every Page |
| Summary Card | Dashboard, Invoices, Payments, Reports, Suppliers, Approvals, Exceptions |
| Search | Almost Every Page |
| Filter Bar | Every Queue Page |
| Data Table | Invoices, Payments, Approvals, Reports, Suppliers, Purchase Orders, Audit, Users |
| Status Badge | Everywhere |
| Timeline | Invoice Details, Exception Details |
| Comments | Invoice Details, Exception Details |
| Audit Table | Invoice Details, Exception Details, Settings |
| Document Viewer | Inbox, Invoice Details, Exception Details |
| Tabs | Invoice Details, Exception Details, Reports |
| Pagination | Every Table |
| Skeleton Loader | Every Page |
| Empty State | Every Page |
| Confirmation Dialog | Destructive Actions |

---

# Component Naming Convention

```text
AppLayout

PageHeader

SummaryCard

FilterBar

DataTable

StatusBadge

PriorityBadge

SearchInput

DocumentViewer

ValidationCard

AISuggestionCard

Timeline

CommentPanel

AuditTable

EmptyState

SkeletonLoader

ConfirmationDialog
```

---

# Reuse Rules

- Never create page-specific buttons.
- Never create page-specific tables.
- Never create duplicate filter components.
- Every queue uses the same DataTable.
- Every detail page uses the same Split Layout.
- Every summary uses Summary Cards.
- Every status uses Status Badges.
- Every confirmation uses Confirmation Dialog.
- Every loading state uses Skeleton Loader.
- Every empty state follows the same layout.

---

# Locked Decisions

✓ Single App Layout.

✓ One DataTable component for the entire application.

✓ One Filter Bar component.

✓ One Summary Card component.

✓ One Document Viewer component.

✓ One Timeline component.

✓ One Comments component.

✓ One Audit Table component.

✓ Standard chart library.

✓ Shared design tokens across the entire application.

✓ Component-first architecture with maximum reuse.
