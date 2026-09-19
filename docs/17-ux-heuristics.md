This should be the **locked UX + development rulebook** for the application. It keeps the Apple-like direction, SME focus, and the earlier YAGNI constraint intact.

```markdown id="73164"
# 15. UX HEURISTICS & DEVELOPMENT RULES

**Version:** 1.0  
**Status:** LOCKED

---

# 15.1 Core Product Rule

The product should feel like:

> "Drop invoices in. The system does the work. I only handle what needs me."

Everything should reduce:

- Manual entry
- Searching
- Decision effort
- Waiting
- Repetition
- Uncertainty

The application must not make AP staff understand the underlying automation.

---

# 15.2 UX NORTH STAR

```text
INPUT
  ↓
UNDERSTAND
  ↓
AUTOMATE
  ↓
FLAG ONLY WHAT MATTERS
  ↓
APPROVE
  ↓
PAY
  ↓
SYNC
  ↓
DONE
```

The interface should make this flow obvious without explaining it.

---

# 15.3 Primary UX Principles

## 1. Clarity over density

Do not show everything simply because the system knows it.

Show:

```text
What happened
What matters
What needs action
What happens next
```

Hide implementation details unless requested.

---

## 2. Progressive disclosure

Default:

```text
Summary
```

Then:

```text
Details
```

Then:

```text
Technical evidence
```

Example:

```text
GST Validation
✓ Passed

[View details]
```

Not:

```text
GST Validation
Rule: GST-VALIDATE-001
Provider: External API
Response: 200
Confidence: 98.4
...
```

---

# 15.4 Apple-Inspired Design Language

The application should take inspiration from Apple's principles:

- Calm hierarchy
- Strong typography
- Generous spacing
- Clear grouping
- Minimal chrome
- Restrained color
- Smooth motion
- Direct manipulation
- High-quality feedback
- Content-first layouts

Do **not** imitate Apple's UI literally.

Do not copy:

```text
Apple icons
Apple layouts
Apple branding
Apple-specific components
```

The goal is the same level of clarity, not visual imitation.

---

# 15.5 SME Design Principle

The user is not buying an AP system.

They are buying:

```text
Less work
Fewer mistakes
Faster processing
Better visibility
Faster payment
```

Therefore every major screen should answer:

```text
What do I need to know?

What do I need to do?

Can I trust this?
```

---

# 15.6 3-SECOND RULE

When opening a page, the user should understand its purpose within approximately 3 seconds.

Example:

```text
Invoices

428 invoices
31 need attention

[Search invoices]

All     Processing     Exceptions     Approval     Paid
```

Not:

```text
Invoice Management
Document Processing Operations
Accounts Payable Transaction Repository
...
```

---

# 15.7 ONE PRIMARY ACTION

Every screen gets one dominant action.

Example:

```text
Invoice Review

Primary:
[Approve]

Secondary:
Reject
Request information
```

Do not give equal visual weight to six actions.

---

# 15.8 ACTION HIERARCHY

Use:

```text
Primary
   ↓
Secondary
   ↓
Tertiary
   ↓
Destructive
```

Example:

```text
[Approve Invoice]

Request information

More ▾

Reject
```

Destructive actions should never visually compete with the primary action.

---

# 15.9 STATUS MUST BE VISIBLE

Every major business object must have a clear state.

Example:

```text
Invoice
INV-10482

● Pending approval
```

Do not make users infer state from page location.

---

# 15.10 STATUS LANGUAGE

Use plain language.

Prefer:

```text
Needs review
Waiting for approval
Ready to pay
Payment scheduled
Paid
```

Avoid:

```text
STATE_EXCEPTION_PENDING
APPRLV_WAIT
PROC_STATE_04
```

Internal state names belong in code, not UI.

---

# 15.11 COLOR RULE

Color communicates meaning.

Use:

```text
Green   → successful / complete
Orange  → attention / warning
Red     → error / destructive
Blue    → information / interaction
Gray    → neutral
```

Do not use color merely for decoration.

Never communicate important information through color alone.

---

# 15.12 REDUCE RED

Red should mean:

```text
Something is wrong
```

Not:

```text
This is important
```

If every card is red, nothing is important.

---

# 15.13 CONFIDENCE UX

AI confidence must never appear as unexplained technical numbers.

Bad:

```text
Confidence: 87.43
```

Better:

```text
High confidence

Invoice number
INV-10482
```

For review:

```text
Medium confidence

Supplier
ABC Manufacturing

[Confirm]
```

Use detailed scores only inside the evidence/details layer.

---

# 15.14 AI MUST EXPLAIN ITSELF

Whenever AI influences a recommendation:

```text
Recommendation
     ↓
Reason
     ↓
Evidence
```

Example:

```text
Possible duplicate

This invoice matches INV-10281
by supplier, invoice number and amount.

[Review duplicate]
```

Never:

```text
AI detected fraud.
```

without supporting evidence.

---

# 15.15 AI NEVER HIDES HUMAN CONTROL

The user must always know:

```text
What AI decided
Why
Whether it can be changed
What happens if they override it
```

AI recommendation:

```text
Suggested supplier
ABC Manufacturing

[Accept] [Change]
```

---

# 15.16 AUTOMATION SHOULD BE QUIET

Successful automation should not create unnecessary notifications.

Bad:

```text
Invoice received
Invoice extracted
OCR complete
Vendor found
Validation started
Validation complete
PO found
Match complete
Workflow started
...
```

Better:

```text
Invoice processed

✓ Supplier identified
✓ Fields validated
✓ PO matched

No action required.
```

---

# 15.17 EXCEPTIONS ARE THE PRODUCT

The system should make normal invoices almost invisible.

```text
Normal invoice
      ↓
Automation
      ↓
Done
```

Only exceptions require attention.

The main dashboard should therefore emphasize:

```text
Needs attention
```

rather than:

```text
Total system activity
```

---

# 15.18 EXCEPTION PRIORITY

Order exceptions by:

```text
Urgency
   ↓
Financial impact
   ↓
Risk
   ↓
Age
```

Example:

```text
1. Fraud risk
2. Payment deadline
3. High-value mismatch
4. Tax issue
5. Missing information
```

---

# 15.19 EXCEPTION CARD

Every exception should answer:

```text
WHAT
WHY
IMPACT
ACTION
```

Example:

```text
Amount mismatch

Invoice: ₹128,000
PO:      ₹118,000
Difference: ₹10,000

[Review invoice]
```

---

# 15.20 TABLE RULES

Tables should be used for:

```text
Invoices
Payments
Suppliers
Exceptions
Approvals
Purchase Orders
```

Columns should represent decisions.

Good:

```text
Invoice
Supplier
Amount
Due
Status
Action
```

Avoid:

```text
Created At
Updated At
UUID
Workflow ID
Processing ID
Model ID
```

unless specifically needed.

---

# 15.21 TABLE DEFAULTS

Default:

```text
25 rows
```

Allow:

```text
25
50
100
```

Remember the user's selection.

---

# 15.22 TABLE ACTIONS

Row actions:

```text
Primary action
More ▾
```

Do not create five visible buttons in every row.

---

# 15.23 SEARCH

Search should tolerate natural user behavior.

Example:

```text
INV-10482
ABC Manufacturing
₹118000
PO-1024
```

One search box should handle common identifiers.

Placeholder:

```text
Search invoices, suppliers or PO numbers
```

---

# 15.24 FILTERS

Use progressive filtering.

Default:

```text
Status
Supplier
Date
Amount
```

Advanced:

```text
Currency
Assigned user
PO
Exception type
Confidence
```

Do not expose 20 filters by default.

---

# 15.25 FILTER PERSISTENCE

When navigating away and returning:

```text
Preserve filters
Preserve search
Preserve sort
Preserve page where reasonable
```

Do not force users to rebuild their view.

---

# 15.26 EMPTY STATES

Empty states must explain:

```text
What is empty
Why
What can be done
```

Example:

```text
No exceptions

Everything is processing normally.

Nothing needs your attention.
```

Do not use:

```text
No data found.
```

---

# 15.27 LOADING STATES

Never show a blank screen.

Use:

```text
Skeleton
Progress
Inline loading
```

For known processing:

```text
Extracting invoice data...
```

For unknown processing:

```text
Processing...
```

---

# 15.28 ERROR STATES

Errors must be actionable.

Bad:

```text
Something went wrong.
```

Better:

```text
Invoice could not be processed.

The document could not be read.

[Retry]
```

If retry is unsafe:

```text
Processing failed.

No payment was created.

[View details]
```

---

# 15.29 DESTRUCTIVE ACTIONS

Destructive actions require confirmation when consequences are significant.

Examples:

```text
Reject invoice
Delete document
Deactivate supplier
Execute payment
```

Confirmation must state the consequence.

Bad:

```text
Are you sure?
```

Better:

```text
Reject invoice?

INV-10482 will stop moving through approval.

[Cancel] [Reject invoice]
```

---

# 15.30 PAYMENT SAFETY

Payment operations receive the highest confirmation level.

Before payment:

```text
Supplier
Amount
Currency
Bank destination
Scheduled date
Approval status
```

Then:

```text
[Schedule payment]
```

For execution:

```text
[Confirm payment]
```

Never hide the amount.

---

# 15.31 APPROVAL UX

Approvers should not need to navigate through the entire application.

Approval screen should show:

```text
Invoice
Supplier
Amount
Due date
PO
Match status
Exceptions
Supporting document
AI flags
Previous approvals
```

Then:

```text
[Approve]

[Reject]

[Request information]
```

---

# 15.32 DOCUMENT VIEWER

Invoice review uses a split view.

```text
┌──────────────────────┬────────────────────────┐
│ Invoice information  │                        │
│                      │                        │
│ Supplier             │                        │
│ Amount               │      DOCUMENT          │
│ Due date             │       VIEWER           │
│ PO                   │                        │
│ Validation           │                        │
│ Exceptions           │                        │
│                      │                        │
└──────────────────────┴────────────────────────┘
```

The document should remain visible while reviewing data.

---

# 15.33 HUMAN REVIEW

AI-extracted fields should visually identify uncertainty.

```text
Supplier
ABC Manufacturing        ✓

Invoice Number
INV-10482                 ✓

Due Date
08/31/2026               ⚠ Review
```

The user should fix the field directly.

Do not send them to a separate correction page.

---

# 15.34 INLINE EDITING

Use inline editing for small corrections.

```text
Amount
₹118,000        [Edit]
```

After edit:

```text
₹128,000

[Save]
```

Do not open a full-page form for one field.

---

# 15.35 FORM DESIGN

Forms should:

```text
Group related fields
Use clear labels
Show required fields
Validate inline
Preserve entered data
Explain errors
```

Avoid giant forms.

---

# 15.36 FORM LABELS

Never rely on placeholder text as the label.

Bad:

```text
[Enter supplier name]
```

Good:

```text
Supplier
[ABC Manufacturing]
```

---

# 15.37 SAVE BEHAVIOR

Use:

```text
Auto-save
```

where safe.

Use explicit:

```text
Save
```

for important financial or configuration changes.

Never silently save a payment decision.

---

# 15.38 NAVIGATION

Primary navigation should map to user jobs.

```text
Overview

Inbox
Invoices
Exceptions
Approvals
Payments

Suppliers
Purchase Orders

Reports

Archive

Settings
```

Do not organize navigation around backend architecture.

---

# 15.39 SIDEBAR

Desktop:

```text
┌──────────────────────┐
│ Logo                 │
│                      │
│ Overview             │
│ Inbox                │
│ Invoices             │
│ Exceptions      12   │
│ Approvals        8   │
│ Payments             │
│                      │
│ Suppliers            │
│ Purchase Orders      │
│                      │
│ Reports              │
│ Archive              │
│                      │
│ Settings             │
└──────────────────────┘
```

Badges only appear when actionable.

---

# 15.40 BREADCRUMBS

Use breadcrumbs only when navigation depth requires them.

Example:

```text
Invoices / INV-10482
```

Do not use breadcrumbs everywhere.

---

# 15.41 MODALS

Use modals for:

```text
Confirmation
Short forms
Focused decisions
Quick details
```

Do not use modals for complex workflows.

---

# 15.42 DRAWERS

Use drawers for:

```text
Quick inspection
Activity
Comments
Audit
Supporting information
```

Example:

```text
Invoice
      │
      └── Activity drawer
```

---

# 15.43 DETAIL PAGES

Every detail page follows:

```text
Header
   ↓
Status
   ↓
Primary action
   ↓
Key information
   ↓
Workflow
   ↓
Supporting information
   ↓
Activity / Audit
```

---

# 15.44 AUDIT UX

Audit history should be understandable.

```text
10:42 AM
John approved invoice

10:40 AM
AI flagged amount mismatch

10:38 AM
Invoice extracted
```

Technical metadata belongs behind:

```text
View details
```

---

# 15.45 ACTIVITY TIMELINE

Use one timeline for:

```text
User actions
System actions
AI actions
Workflow actions
Integration events
```

Differentiate them visually.

---

# 15.46 RESPONSIVE RULE

Desktop is the primary experience.

Tablet must remain usable.

Mobile prioritizes:

```text
Inbox
Exceptions
Approvals
Notifications
Invoice review
```

Do not attempt to reproduce the full desktop interface on mobile.

---

# 15.47 ACCESSIBILITY

Minimum:

```text
WCAG 2.2 AA target
```

Required:

- Keyboard navigation
- Visible focus
- Semantic HTML
- Screen-reader labels
- Sufficient contrast
- Color-independent status
- Accessible forms
- Accessible tables
- Reduced-motion support

---

# 15.48 MOTION

Motion communicates:

```text
Change
Relationship
Progress
Feedback
```

Do not animate for decoration.

Use short transitions.

Examples:

```text
Panel → 150–250ms
Modal → 200–300ms
Toast → 150–200ms
Page transition → minimal
```

Respect:

```text
prefers-reduced-motion
```

---

# 15.49 MOTION RULE

Never delay an action just to show animation.

Correct:

```text
Action
 ↓
Immediate feedback
 ↓
Animation while state settles
```

Not:

```text
Click
 ↓
Animation
 ↓
Wait
 ↓
Result
```

---

# 15.50 TOASTS

Use toasts for lightweight feedback.

Good:

```text
Invoice updated
```

Bad:

```text
Invoice updated successfully and all related
workflow state transitions have completed...
```

Errors requiring action stay visible.

---

# 15.51 NOTIFICATIONS

Notification hierarchy:

```text
Critical
Action required
Informational
Success
```

Do not notify users for routine automation.

---

# 15.52 DESIGN CONSISTENCY

Same concept = same component.

Examples:

```text
StatusBadge
ConfidenceBadge
Amount
UserAvatar
Date
EmptyState
DataTable
ActionMenu
ConfirmDialog
ActivityTimeline
```

Do not create:

```text
InvoiceStatus
PaymentStatus
SupplierStatus
```

with three visually different status systems.

---

# 15.53 DEVELOPMENT RULE: SIMPLE FIRST

Before adding a dependency or abstraction:

```text
Can existing code solve it?
```

If yes:

```text
Do not add it.
```

---

# 15.54 YAGNI

Do not build functionality because:

```text
"we might need it later."
```

Build only what the current product requires.

---

# 15.55 NO PREMATURE ABSTRACTION

Do not create a generic system before repeated use exists.

Bad:

```text
UniversalWorkflowFramework
UniversalEntityEngine
UniversalFormBuilder
UniversalDataProvider
```

Prefer:

```text
invoice workflow
invoice form
invoice service
```

Abstract only when duplication becomes real.

---

# 15.56 BUSINESS LOGIC LOCATION

Business rules belong in backend services/workflow.

Not:

```text
React component
```

Not:

```text
CSS
```

Not:

```text
Database trigger
```

unless the rule is fundamentally a database integrity constraint.

---

# 15.57 FRONTEND RESPONSIBILITY

Frontend:

```text
Display
Interaction
Local UI state
Form state
Navigation
API calls
Loading states
Error presentation
```

Backend:

```text
Business rules
Permissions
Workflow
Validation
Financial calculations
AI decisions
Database writes
Integration
```

---

# 15.58 DATABASE RESPONSIBILITY

Database:

```text
Persistence
Relationships
Constraints
Transactions
Indexes
```

Database should not become the application layer.

---

# 15.59 WORKFLOW RESPONSIBILITY

Workflow Engine:

```text
State
Transitions
Guards
Actions
```

Example:

```text
WAITING_APPROVAL
      │
      ├── Approve
      │       ↓
      │   APPROVED
      │
      └── Reject
              ↓
          REJECTED
```

No UI logic inside the workflow engine.

---

# 15.60 AI RESPONSIBILITY

AI:

```text
Extract
Classify
Match
Detect
Recommend
Explain
```

AI does not directly:

```text
Approve payments
Change financial records
Override permissions
Change workflow state
Execute SQL
```

---

# 15.61 VALIDATION RULE

Two levels:

```text
Client validation
       ↓
Fast feedback

Server validation
       ↓
Authoritative
```

Never trust client validation alone.

---

# 15.62 ERROR HANDLING

All backend errors use the standard API error contract.

Frontend converts errors into user language.

Example backend:

```text
DUPLICATE_INVOICE
```

UI:

```text
Possible duplicate invoice

This invoice appears to match INV-10281.
```

---

# 15.63 LOGGING

Log:

```text
Errors
Warnings
Important workflow events
Integration failures
Payment events
Security events
```

Do not log:

```text
Passwords
Tokens
Bank credentials
Sensitive document contents
```

---

# 15.64 PERFORMANCE RULE

Optimize measured problems.

Do not optimize hypothetical problems.

Priorities:

```text
1. Initial page load
2. Invoice list
3. Invoice review
4. Search
5. Workflow actions
6. Large document viewing
```

---

# 15.65 API CALL RULE

Do not repeatedly fetch the same data unnecessarily.

Prefer:

```text
One useful request
```

over:

```text
Six tiny requests
```

But do not create giant "fetch everything" endpoints.

---

# 15.66 CACHING

Cache only data that is safe to cache.

Good candidates:

```text
Settings
Permissions
Reference data
Dashboard summaries
```

Be careful with:

```text
Invoice status
Payment status
Approval status
```

Financial state must remain fresh.

---

# 15.67 OPTIMISTIC UI

Allowed for:

```text
Read status
Preference changes
Non-critical UI actions
```

Avoid for:

```text
Payment execution
Invoice approval
Invoice rejection
Financial state
```

---

# 15.68 SECURITY BY DEFAULT

Every endpoint:

```text
Authenticate
   ↓
Authorize
   ↓
Check organization
   ↓
Validate input
   ↓
Execute
   ↓
Audit when required
```

---

# 15.69 TENANT ISOLATION

Never trust:

```text
organizationId
```

from the request body.

Derive organization from authenticated context.

Every query must enforce organization scope.

---

# 15.70 FINANCIAL PRECISION

Never use JavaScript floating-point arithmetic for financial calculations.

Use:

```text
Decimal
```

or server-side fixed-precision handling.

Never:

```text
0.1 + 0.2
```

for financial totals.

---

# 15.71 MONEY DISPLAY

Always display:

```text
Currency symbol
Amount
```

Example:

```text
₹118,000.00
```

Never:

```text
118000
```

when currency is relevant.

---

# 15.72 DATE DISPLAY

Respect organization settings.

Example:

```text
31 Aug 2026
```

Do not expose raw timestamps unless useful.

---

# 15.73 CODE NAMING

Use clear names.

Good:

```text
invoiceService
approvalRule
paymentStatus
workflowState
```

Bad:

```text
svc1
dataObj
tmp
process2
```

---

# 15.74 FILE NAMING

Use predictable names.

```text
invoice.service.ts
invoice.controller.ts
invoice.repository.ts
invoice.routes.ts
```

Not:

```text
invoiceStuff.ts
invoiceFinal.ts
invoiceNew.ts
```

---

# 15.75 FUNCTIONS

Prefer small functions with one responsibility.

Bad:

```text
processInvoice()
```

containing:

```text
upload
OCR
AI
validation
matching
approval
payment
```

Good:

```text
extractInvoice()
validateInvoice()
matchInvoice()
createApproval()
```

Workflow coordinates them.

---

# 15.76 DUPLICATION

Do not remove every duplicate line automatically.

The goal is:

```text
Simple
Readable
Maintainable
```

not:

```text
Maximum abstraction
```

---

# 15.77 COMMENTS

Comment:

```text
Why
```

not:

```text
What
```

Bad:

```text
// Set status to approved
status = APPROVED;
```

Good:

```text
// Approval is finalized only after all required approvers respond.
```

---

# 15.78 TYPES

Use strong types for:

```text
Invoice
Supplier
Payment
Workflow
Approval
API responses
```

Avoid:

```text
any
```

unless there is a documented reason.

---

# 15.79 TESTING PRIORITY

Test business risk first.

Highest priority:

```text
Payment
Approval
Workflow
Invoice totals
Matching
Permissions
Tenant isolation
AI corrections
ERP sync
```

---

# 15.80 TESTING PYRAMID

```text
        E2E
       /   \
   Integration
    /       \
      Unit
```

Most tests should be unit tests.

Critical workflows require integration/E2E coverage.

---

# 15.81 DEPLOYMENT RULE

Application must be deployable as:

```text
Web
API
Worker
PostgreSQL
Object Storage
```

No additional infrastructure is required for V1.

---

# 15.82 FEATURE FLAG RULE

Use feature flags only for:

```text
Incomplete features
Controlled rollout
Risky integrations
```

Do not create flags for every component.

---

# 15.83 DEVELOPMENT DEFINITION OF DONE

A feature is complete only when:

```text
✓ UI implemented
✓ API implemented
✓ Validation implemented
✓ Permission checked
✓ Loading state handled
✓ Error state handled
✓ Empty state handled
✓ Audit requirement handled
✓ Mobile behavior considered
✓ Tests added where risk requires
✓ No console errors
✓ No obvious accessibility failure
```

---

# 15.84 NO FEATURE WITHOUT A USER JOB

Before implementing a feature:

```text
Who uses it?
What problem does it solve?
What action does it enable?
```

If these cannot be answered:

```text
Do not build it.
```

---

# 15.85 FINAL UX TEST

For every major screen ask:

```text
Can I understand this in 3 seconds?

Can I find what needs attention?

Can I tell what happened?

Can I tell what happens next?

Can I complete the main task without help?

Can I undo or recover from a mistake?

Can I trust the result?
```

If not:

```text
Simplify the screen.
```

---

# 15.86 FINAL DEVELOPMENT TEST

Before adding anything:

```text
Is it required?
     │
     ├── No → Don't build it.
     │
     └── Yes
           │
           ▼
Can existing code handle it?
           │
           ├── Yes → Reuse it.
           │
           └── No
                 │
                 ▼
What's the simplest implementation?
                 │
                 ▼
              Build it.
```

---

# LOCKED RULE

The product should continuously move toward:

```text
LESS UI
LESS DATA ENTRY
LESS CLICKS
LESS WAITING
LESS DECISION LOAD
LESS TRAINING

MORE AUTOMATION
MORE CLARITY
MORE CONFIDENCE
MORE CONTROL
```

The best AP workflow is the one where the user only sees the work that genuinely requires a human.
