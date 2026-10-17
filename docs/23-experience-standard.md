# 23. Avarta AP Workspace: Experience Standard v1.0

**Date:** Oct 14, 2026  
**Author:** @Satya Lohit  
**Version:** 1.0 (Draft)

---

## 1. Purpose and status

This is the standing experience standard for Avarta AP Workspace: it settles the twelve places where the user journey only partly matched the product vision, using conventions AP users already know instead of inventing new ones.

- **Governs:** navigation, onboarding, invoice detail, data tables, top bar, help, and how AI suggestions are shown.
- **Does not govern:** workflow rules (the FSM and the 8 operational laws in AGENTS.md stay the source of truth) or visual styling.
- **Audience:** product, design, engineering, QA.
- **Status:** v1.0 draft for confirmation. Changes go through the change register in section 9, never silent edits.
- **Precedence:** if this document and AGENTS.md conflict, let the user take the decision at last.

## 2. Product vision

Avarta is a calm AP workspace that starts empty, fills as you connect your data, and always shows the next action, with AI suggesting and a human deciding.

The nine experience promises below are the test every screen must pass.

1. **Fast entry.** Sign up, log in, and reach the main screen quickly. Every setup step is optional.
2. **Honest start.** The workspace is empty at first. No demo data.
3. **Connected means useful.** BYODB, BYOK and ERP are connected according to plan, and the data starts to make sense.
4. **One front door.** An invoice dropped, emailed, or already in the database is processed by AI and OCR the same way.
5. **AI suggests, human acts.** Nothing advances without a person's click.
6. **Essentials first.** Invoice detail shows what the task needs. Advanced information sits below in one scroll.
7. **A home for everything.** Bank details, suppliers, items and other master data live in searchable tables.
8. **Familiar and supported.** Standard navigation, with help close by.
9. **Personal controls on top.** Settings, profile, customization and logout live in the top bar.

## 3. Design principles and adopted conventions

Every pattern in this standard is one users already meet in email, accounting software, or banking apps; the only custom part is the AP workflow itself.

| Principle | Convention we adopt | What we do not build |
| --- | --- | --- |
| One obvious next step | Inbox-style worklist: a prioritized list, open an item, act, move to the next | A custom dashboard language or gamified progress |
| Essentials first, detail on scroll | Master-detail layout with one scrolling detail pane and sticky action bar | Tabs that hide required information |
| A home for every record | Standard data table: search, filter chips, sort, column chooser, pagination, quick-add, row drawer | Per-entity bespoke screens |
| Familiar orientation | Left sidebar for pages, top bar for account and global tools, breadcrumbs on detail pages | Novel navigation metaphors |
| Fast for experts | Command palette (Cmd or Ctrl + K), keyboard shortcuts for next, approve, and search | Mouse-only flows |
| Help where the doubt is | Tooltips, inline hints, empty-state guidance, and a searchable help panel | Long manuals or videos as the only help |
| Safe by default | Confirmation dialogs that name the action (Archive, Reject, Revoke), never Delete | Silent or auto-applied AI changes |
| Accessible to all | WCAG 2.1 AA, WAI-ARIA authoring practices for tables, dialogs, menus, and focus order | Color-only status signals |
| Clear language | Nielsen's usability heuristics: system status visible, match the real world, recoverable errors | Internal jargon (FSM state names) in the UI |

**Rule for new patterns:** before inventing one, name the familiar convention it replaces, and record the exception in the change register.

## 4. Resolution of the partial gaps

Each gap below has one decision, built on a familiar pattern, with a test for when it is done. Section references point to the detailed specs that follow.

| # | Gap | Decision | Familiar pattern | Done when |
| --- | --- | --- | --- | --- |
| 1 | Sign-up and login slow the first entry | Let users in right after sign-up. Email verification and MFA are prompted, not walls: limited mode until verified (no invites, no ERP connect), and MFA is required before approving or releasing payments | Verify-to-unlock, remind-me-later security prompts | A new user reaches the empty dashboard in under 2 minutes, and money actions are blocked without MFA |
| 2 | Not everything has a home | Add an Items catalogue and a Bank accounts view next to Suppliers and Purchase Orders, grouped as one Data area | Standard master-data tables under one nav group | Every entity users must enter has a table with add, edit, archive |
| 3 | Information is shown, but not tied to an action | A field sits in the main area only if the current stage needs it to act. Everything else goes to Advanced | Progressive disclosure | Each main-area field maps to a named action in the field inventory |
| 4 | Invoices already in a database have no way in | Add Import from BYODB or ERP (read-only pull). Imported items enter the Intake Register with source Imported and follow the same pipeline | Import wizard: preview count, confirm, track progress | Imported invoices show the same states, AI suggestions, and gate as uploaded ones |
| 5 | Tables are inconsistent | One data table spec for all lists (section 5) | Search, filter chips, sort, column chooser, row drawer | Same controls and keyboard behavior on every table |
| 6 | Top bar and logout undefined | Fixed top bar: workspace switcher, global search, Help, Notifications, Profile menu holding Settings, Preferences, Theme, and Log out | Account menu at top right, command palette | Log out and Settings are reachable from every page in two clicks or fewer |
| 7 | Validation, approval, and exceptions feel like separate areas | One stage tracker on every invoice. An exception appears as a banner on the same invoice, and the queue only deep-links to it | Stepper plus inline status banner | A user can say which stage an invoice is in and what to do next without leaving the page |
| 8 | Linking is a side modal | Inline Link PO or Link supplier control on the field itself, with AI-ranked suggestions that the user confirms | Searchable combobox with suggestions | Linking takes one search and one click, and the audit log records who confirmed |
| 9 | Attaching documents is absent | Attachments panel on the invoice: drag and drop, type tags (Delivery note, Credit note, PO copy, Other), included in the audit bundle | Standard file attachment list | Attachments are scanned, tagged, viewable, and appear in the archive export |
| 10 | Help is only a one-time tour | Four layers: tooltips, Why am I seeing this on AI suggestions and exceptions, empty-state guidance, and a searchable help panel (section 8) | Contextual help plus help center search | Every exception type and every setup step has help content |
| 11 | Connected data does not visibly make sense | Setup checklist on the empty dashboard and a first-sync summary after each connection | Onboarding checklist with progress | After connecting an ERP, the user sees counts of what arrived and what needs attention |
| 12 | Invoice detail is split across many parts | Pinned document on one side, a single scroll on the other with a sticky action bar (section 6) | Master-detail with sticky actions | Essentials fit above the fold, and advanced fields need only scrolling, not tab changes |

## 5. Information architecture

Pipeline pages sit in the sidebar and personal and global tools in the top bar, so the sidebar stays short as master data grows.

Work holds the daily pipeline in the order users act on it. Data groups every master record under one table pattern. Settings opens from the profile menu, and organization setup (approval policies, AI keys, database, ERP, team, audit log) stays inside it.

**Sidebar navigation (ordered):**

### Work group
- Overview
- Inbox
- Invoices
- Exceptions
- Approvals
- Payments

### Data group
- Suppliers
- Purchase Orders
- Items
- Bank Accounts

### Elsewhere
- Reports
- Archive

### Top bar (not in sidebar)
- Settings (via Profile menu)
- Notifications
- Profile

**Shared data table pattern, used by every list in Data and by the invoice register**

| Control | Behavior |
| --- | --- |
| Search | One box that finds by name, code, number, tax ID, or amount, with results as you type |
| Filter chips | Status and key fields as removable chips, and saved views per user |
| Sort and column chooser | Click a header to sort, and choose visible columns |
| Row drawer | Opens detail beside the table without losing the user's place |
| Quick add | Always-visible primary Add button, and import where relevant |
| Archive, never delete | Row actions say Archive, Deactivate, or Revoke |
| Keyboard | Arrow keys move through rows, Enter opens the drawer, a shortcut focuses search |
| Money columns | Right-aligned tabular figures with currency, and bank numbers masked |

## 6. Invoice detail page

The invoice page keeps the source document pinned on one side and gives the other side a single scroll, ordered by what the user needs to act, with advanced information last.

**Order of the scrolling pane, top to bottom:**

1. **Header:** supplier, invoice number, gross amount, due date, state badge, and the stage tracker (Received, Captured, Validated, Matched, Approved, Paid, Synced, Archived).
2. **Next action strip:** the AI suggestion in plain words and the one primary button. The user must click it. Suggestions are visually marked as proposals until accepted.
3. **Exception banner (only when present):** what is wrong, why, the AI-suggested fix, and the individual resolve actions.
4. **Essentials:** only the fields the current stage needs.
5. **Line items and match:** line table with variances against the PO and goods receipt in red, and inline Link PO or Link supplier.
6. **Attachments:** supporting documents with type tags.
7. **Advanced:** tax breakdown, payment terms, coding, extraction metadata, masked bank details.
8. **Activity and audit:** the full timeline, last, in the same scroll.

A **sticky action bar** stays at the bottom and shows only the actions legal in the current state (for example Flag exception, Reject, Approve and next).

**What the main area shows by stage:**

| Stage | Essentials shown first | Primary human action | AI suggestion shown |
| --- | --- | --- | --- |
| Captured | Extracted fields with confidence bands | Confirm fields | Which fields to double-check |
| Validation failed | The failed checks | Fix or flag | Probable cause |
| Matching failed | Variance comparator | Resolve individually | Root cause and fix |
| Waiting approval | Amount, tier, signer chain | Approve or reject with reason | Flags worth reading |
| Scheduled or payment | Pay date, batch, discount window | Release or hold | Discount deadline |
| ERP sync | Sync status | Retry sync | Error cause |
| Archived | Read-only summary | None | None |

**Rules**

- No tab hides information the current action needs.
- Bounding boxes and fields highlight each other on hover. Confidence colors always carry a text label, never color alone.
- Approve and next moves to the next invoice in the worklist, never skips one, and the server confirms the action before the screen advances.
- Keyboard shortcuts for next, previous, and search are listed in the help panel.

## 7. Onboarding, empty state, and plan gating

A new user lands on a clean dashboard with a setup checklist, can skip every item, and gets a visible payoff each time something is connected.

**First-run sequence**

1. Sign up, then land immediately in the app in limited mode (email verification and MFA prompted, see section 4, gap 1).
2. A short, skippable tour that can be replayed from the help panel.
3. The empty dashboard shows the setup checklist and one primary action: Add your first invoice.

**Setup checklist (all items skippable, resumable, in any order)**

| Item | What it unlocks | If skipped |
| --- | --- | --- |
| Choose plan | Which connections are available | Trial limits apply |
| Database: managed or BYODB | Where data lives. Choose before first data, because switching later is a migration | Managed database |
| AI: BYOK or built-in extraction | OCR and suggestions. Can be turned off entirely | Manual entry and heuristic parser |
| ERP connection | Supplier, PO, and payment-status pull, and posting of paid invoices | Manual entry and CSV export |
| Invite team and assign roles | Approvals and segregation of duties | Single-user workspace |

**Empty states**

Every empty table and page says what it is for, what will appear, and gives one primary action (for example Import suppliers, Add supplier). No demo data is ever inserted.

**First-sync summary**

After each connection completes, show a plain summary of what arrived (counts of suppliers, POs, and invoices) and what needs attention (for example suppliers without a tax ID).

**Plan gating**

Locked features stay visible with a short reason and an upgrade action, so users learn what exists. Plan limits are enforced on the server, never only in the interface. Which plan unlocks BYODB, BYOK, and each ERP is an open decision (section 11).

## 8. Help and guidance layer

Help appears where the doubt arises, in four layers, so users who already know the standard AP process are never slowed down and users who are unsure are never stuck.

| Layer | Where it shows | Content rule | Owner |
| --- | --- | --- | --- |
| Tooltips and field hints | Next to labels and icons | One sentence: what it is and why it is needed | Design |
| Why am I seeing this | On every AI suggestion and every exception | States the evidence (for example, the invoice price is 4% above the PO price), the suggested fix, and that the user decides | Product |
| Empty-state guidance | Empty tables and pages | What the page is for, what will appear, one primary action | Design |
| Help panel | Top bar, opens beside the page, searchable | Task-based articles in AP language, shortcuts list, replayable tour | Support |

**Standards**

- Every one of the 14 exception types and every setup checklist item has a help entry before release.
- Help text uses accounting terms users already use (invoice, PO, GRN, three-way match), not internal state names.
- Help is available by keyboard and screen reader, and never blocks the task.
- Help content is versioned with the product and reviewed at each release.

## 9. Change register

These are the changes this standard makes to the corrected journey flowchart (version 2), grouped by type. All are proposed until the owner confirms them, and later changes are appended here with a date.

| Type | Change | Reason |
| --- | --- | --- |
| Add | Items catalogue table | Needed for line-item matching and price checks, and for the vision of a home for everything |
| Add | Bank accounts view | Searchable bank details, linked to the supplier fraud control |
| Add | Import from BYODB or ERP | Invoices that already exist must enter the same pipeline |
| Add | Next action strip with AI suggestion | One obvious next step on every invoice |
| Add | Why am I seeing this on suggestions and exceptions | AI suggests, human decides, with visible evidence |
| Add | Attachments panel | Supporting documents and credit notes had no place |
| Add | Setup checklist and first-sync summary | Connected data must visibly make sense |
| Add | Help panel, tooltips, empty-state guidance | Only a one-time tour existed |
| Add | Top bar definition including Log out | Logout and personal controls were undefined |
| Add | Plan gating rules | Connect according to plan, with locked items shown |
| Modify | Invoice detail becomes one scrolling pane beside the pinned document | Replaces the separate viewer, fields, and match nodes and the Audit tab |
| Modify | Entity linker becomes an inline control | Removes a side modal from the main path |
| Modify | Email verification and MFA become prompts with limits, not walls | Fast entry, while money actions still require MFA |
| Modify | Master data setup becomes optional and non-blocking | Users can start with an empty workspace |
| Modify | Exceptions appear on the invoice as a banner, with the queue deep-linking | Removes the feeling of a separate area |
| Modify | Overview becomes worklist-first, metrics second | Action before reporting |
| Modify | Use Supplier everywhere, not Vendor | One term across screens and help |
| Modify | Suppliers, POs, Items, and Bank accounts grouped as Data | Short sidebar, one table pattern |
| Update | Settings opens from the profile menu, and organization tabs stay inside it | Matches the top bar convention |
| Update | Role labels use the five canonical personas everywhere | Consistency with RBAC |
| Update | Approval tier amounts set without gaps (the 10,000 to 50,000 USD gap) | A gap leaves invoices unrouted |
| Update | Flowchart node labels written as user outcomes | Readable in design reviews |
| Remove | Policy pre-approval from version 1 | Conflicts with AI suggests, human decides |
| Remove | Separate settings audit node | Merged into the main audit log with a filter |
| Remove | Error pages node from the journey | Tracked in the test list instead |
| Defer | External supplier status portal | Not in the vision, and the only unauthenticated surface |

## 10. Acceptance criteria and test mapping

The standard is only real if it can be checked; most of it can be automated in Playwright, and the rest needs a named human reviewer.

| Area | Acceptance check | How |
| --- | --- | --- |
| First entry | New user reaches the empty dashboard after sign-up without completing verification or MFA | Playwright |
| First entry | Approve and release-payment actions are blocked until MFA is set up | Playwright (UI and API) |
| Empty state | No demo data exists, and every empty table shows guidance and one primary action | Playwright |
| Setup | Every checklist item can be skipped and resumed, and the dashboard still works | Playwright |
| Plan gating | Locked features are visible with an upgrade prompt, and the server refuses them | Playwright (UI and API) |
| Import | Imported invoices enter the Intake Register with source Imported and show the verification gate | Playwright with mocked ERP and database |
| Invoice page | Pinned document remains visible while the other pane scrolls, with no tab hiding required data | Playwright |
| Invoice page | Next action strip shows only the actions legal for the current state | Playwright (FSM matrix) |
| AI behavior | No suggestion changes state or field values without a click | Playwright with mocked AI |
| Linking and attachments | Inline link records who confirmed it, and attachments appear in the archive bundle | Playwright |
| Tables | All Data tables share search, filter, sort, column chooser, and keyboard behavior | Playwright, one parameterized spec |
| Top bar | Log out and Settings reachable from every page in two clicks or fewer | Playwright |
| Help | Each exception type and checklist item has a help entry | Playwright content check |
| Accessibility | No serious axe violations on all pages, and the workbench is fully keyboard operable | Playwright with axe |
| Language | No internal state names or the word Delete appear in the interface | Playwright text scan |
| Usability | Five first-time AP users complete the first-invoice task without assistance | Manual study |
| Screen reader | The invoice page is understandable with NVDA or VoiceOver | Manual review |

## 11. Open decisions and governance

Seven decisions are still open, and each has a recommendation so the document can be approved without waiting on all of them.

| Decision | Options | Recommendation | Decider |
| --- | --- | --- | --- |
| Email verification grace period | 3, 7, or 14 days of limited access | 7 days | Product owner |
| MFA methods | Authenticator app, passkey, or both | Both, with the app as default | Product owner and security lead |
| Plan matrix for BYODB, BYOK, and each ERP | Which plan unlocks each | Define before pricing page work | Product owner |
| Approval tier amounts | Fix the 10,000 to 50,000 USD gap and align INR and USD | Contiguous tiers, boundary-tested | Finance lead |
| Policy pre-approval | Keep, or remove from version 1 | Remove | Product owner |
| Supplier status portal | Ship, or defer | Defer | Product owner |
| Import source order | ERP pull first, or direct database connection first | ERP pull first | Engineering lead |

**How this document stays alive**

- **Versioning:** every change gets a new row in section 9 with the date and the person who approved it. The version number rises with each approved change.
- **Review cadence:** reviewed at the start of each release cycle, and whenever a new screen pattern is proposed.
- **Owner:** the product owner owns the document. Design owns sections 3, 5, 6, and 8. Engineering owns the acceptance mapping in section 10.
- **Precedence:** AGENTS.md first, then this standard, then individual page specs. A page spec that departs from this standard needs a recorded exception.
- **New pattern rule:** name the familiar convention it replaces before proposing something new.
