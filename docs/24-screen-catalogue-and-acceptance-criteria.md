# 24. Screen Catalogue and Acceptance Criteria

Every screen a user meets from sign-up to log out, with what they expect there, what it must do, and how we test it.

---

## 1. How to read this catalogue

Each screen has an ID, the expectation a user brings to it, its features, and numbered acceptance criteria that QA can test one by one.

- **Screen IDs:** a group letter and a number, for example A1 Sign up. Groups: A Public and authentication, B Onboarding, C Daily work, D Data, E Insight and records, F Global.
- **Criteria IDs:** the screen ID plus a number (A1-1). Each is one testable statement, and most map to a Playwright check.
- **User expectation:** what an AP professional who already knows the standard process expects to see and do without training.
- **Roles:** Administrator (ADM), Finance Manager (FM), Finance Executive (FE), Approver (APR), Read Only (RO).
- **Fixed rules behind every screen:** the organization comes from the session and never from a request, every money action is confirmed by the server, AI suggests and a human clicks, nothing is deleted, and Avarta never holds or moves customer money.

---

## 2. End-to-end screen flow

A user gets in, optionally sets up, enters the daily loop, and can leave from any page.

```
[Sign up / Login / Invite]
         │
         ▼
[Email Verification / MFA]
         │
         ▼
[Welcome Tour & Setup Checklist] ── (Optional setup: BYODB, BYOK, ERP, Gateway, Team)
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ DAILY WORK LOOP                                                                 │
│                                                                                 │
│   [Overview] ──► [Inbox & Intake / Import] ──► [Invoices Register]              │
│                                                       │                         │
│                                                       ▼                         │
│                                              [Invoice Detail]                   │
│                                                │           ▲                    │
│                        (Variance / Low Conf)   │           │ (Resolved / Re-run)│
│                                                ▼           │                    │
│                                            [Exceptions] ───┘                    │
│                                                │                                │
│                                                ▼                                │
│                                           [Approvals]                           │
│                                                │                                │
│                                                ▼                                │
│                                            [Payments]                           │
│                                                │                                │
│                                                ▼                                │
│                                      [ERP Sync / Archive]                       │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼ (Accessible globally from any view)
┌─────────────────────────────────────────────────────────────────────────────────┐
│ GLOBAL & MASTER DATA                                                            │
│                                                                                 │
│ • Master Data: Suppliers, Purchase Orders, Items Catalogue, Bank Accounts       │
│ • Insights: Reports & Cash Forecast, Archive Vault, Immutable Audit Log         │
│ • Personal & Org: Profile, Notifications, Settings (BYOK/BYODB/BYOPG), Logout   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Group A: Public and authentication screens

Users expect a short, familiar path in: create an account, get into the product, and never be locked out without a way back.

| ID | Screen | What the user expects | Features |
| --- | --- | --- | --- |
| A1 | Sign up | To create a workspace in about a minute and land inside the app | Name, work email, password with strength meter, company name, country (sets currency and tax defaults), Terms and Privacy links, consent record |
| A2 | Email verification | A gentle reminder, not a wall | Banner with days left, resend link, confirmation page, limited mode until verified |
| A3 | Login | A standard email and password form that returns them to where they were | Email, password, show password, forgot link, session restore, rate limiting |
| A4 | MFA challenge | A quick code entry that stays out of the way | Code field, recovery code option, remember this device |
| A5 | MFA enrollment | A guided setup with a safe fallback | QR code and manual key, passkey option, recovery codes, remind me later |
| A6 | Forgot password | A neutral confirmation that an email is on its way | Email field, same message for any address |
| A7 | Reset password | To choose a new password and be signed in safely | Expiring single-use link, strength check, other sessions ended |
| A8 | Accept invite | To see which workspace and role they are joining | Workspace and role shown, name and password, expiring single-use link |
| A9 | Legal pages and cookie consent | Terms, Privacy, DPA, Subprocessors, and Refund policy always reachable | Public pages, footer links, cookie banner with accept, reject, and manage |

### Acceptance criteria

- **A1 Sign up**
  - A1-1: A valid sign-up creates one workspace and one Administrator, then opens the empty dashboard.
  - A1-2: A duplicate email shows a clear message with a link to log in.
  - A1-3: Consent to Terms and Privacy is stored with a timestamp.
  - A1-4: The organization is never taken from the request body.
- **A2 Email verification**
  - A2-1: After sign-up a banner shows the days left in the 3-day window and a resend action.
  - A2-2: Until verified, inviting users and connecting an ERP are blocked with an explanation.
  - A2-3: A verification link works once and expires, and an expired link offers a new one.
  - A2-4: When the window ends unverified, login asks for verification before opening the app.
- **A3 Login**
  - A3-1: Valid credentials open the last page visited, and invalid ones show a generic error that does not say which field was wrong.
  - A3-2: Repeated failures trigger a rate limit and lockout with a recovery message.
  - A3-3: The session cookie is HttpOnly, Secure, and SameSite, and an expired session returns to login and then back to the original page.
  - A3-4: A deactivated user cannot log in, and their open sessions end at once.
- **A4 MFA challenge**
  - A4-1: A correct code opens the app, and a wrong code shows an error with limited attempts.
  - A4-2: A recovery code works once.
  - A4-3: Users in money-moving roles cannot approve or release payments until MFA is enrolled.
- **A5 MFA enrollment**
  - A5-1: Enrollment completes only after a valid code or passkey is confirmed.
  - A5-2: Recovery codes are shown once and can be downloaded.
  - A5-3: Remind me later keeps the user in the app, and money actions stay blocked.
- **A6 Forgot password**
  - A6-1: The confirmation message is identical whether or not the email exists.
  - A6-2: Requests are rate-limited.
- **A7 Reset password**
  - A7-1: The link works once and expires, and reuse shows a clear message.
  - A7-2: The new password must meet the policy, and all other sessions end.
- **A8 Accept invite**
  - A8-1: The user joins the correct workspace with exactly the invited role.
  - A8-2: Expired or used invites are refused with a way to request a new one.
- **A9 Legal pages and cookie consent**
  - A9-1: All five legal pages open without login and are linked from sign-up and the footer.
  - A9-2: Analytics stays off until consent is given, and the choice can be changed later.

---

## 4. Group B: Onboarding and setup screens

A new user expects to reach the main screen quickly, see an honest empty workspace, and connect things in any order, with a visible payoff each time.

| ID | Screen | What the user expects | Features |
| --- | --- | --- | --- |
| B1 | Welcome and tour | A short tour they can skip and replay later | Four or five steps, skip, replay from the help panel |
| B2 | Empty dashboard and setup checklist | To see what to do first, with no fake data | Checklist with progress, primary action Add your first invoice, empty-state guidance |
| B3 | Plan and billing | To pick or change a plan and see what each unlocks | Plan cards, trial status, locked features with upgrade prompts, billing details, paid through Avarta's own gateway |
| B4 | Database choice | To choose where their data lives, with a clear warning | Managed or BYODB, connection test with latency and table count, TLS required, lock-after-data notice |
| B5 | AI setup | To bring their own AI key or turn AI off | BYOK for Gemini, OpenAI, or Textract, live test, masked key, AI-off switch |
| B6 | ERP connection and first-sync summary | To connect once and see what arrived | Tally, QuickBooks, Xero, or CSV, connection test, read-only pull, summary of counts and items needing attention |
| B7 | Invite team and roles | To invite colleagues with the right access | Email invites, role picker with the five roles, pending and expired invites, revoke |
| B8 | Payment gateway | To connect the gateways or banks they already use to pay suppliers, and keep one clear record | One or several existing gateways or bank APIs (for example Stripe or Razorpay), a default gateway, test and live modes, connection test, masked credentials, bank file fallback |

### Acceptance criteria

- **B1 Welcome and tour**
  - B1-1: The tour can be skipped at any step and never reappears unless replayed.
  - B1-2: Replay is available from the help panel.
- **B2 Empty dashboard and setup checklist**
  - B2-1: A new workspace contains no demo data in any table.
  - B2-2: Every checklist item can be skipped, resumed, and completed in any order.
  - B2-3: Progress updates as soon as an item is completed.
  - B2-4: Every empty table and page states its purpose and offers one primary action.
- **B3 Plan and billing**
  - B3-1: Locked features stay visible with a reason and an upgrade action.
  - B3-2: Plan limits are enforced by the server, and a direct call to a locked feature is refused.
  - B3-3: Trial end, failed card, and cancellation show clear status and next steps.
  - B3-4: Subscription payments go through Avarta's own gateway, and that gateway is never used to pay suppliers.
- **B4 Database choice**
  - B4-1: The BYODB test refuses local, private, and cloud-metadata addresses.
  - B4-2: The screen shows latency and table count on success and a plain error on failure.
  - B4-3: After first data exists, switching shows a migration warning and requires confirmation.
- **B5 AI setup**
  - B5-1: A saved key is shown masked and is never returned in full by any response.
  - B5-2: Turning AI off routes new invoices to the heuristic parser or manual entry.
  - B5-3: A failing key shows a friendly message and extraction falls back safely.
- **B6 ERP connection and first-sync summary**
  - B6-1: A failed connection shows the reason and a retry, and no partial data is imported.
  - B6-2: The summary shows counts of suppliers, purchase orders, and invoices pulled, and what needs attention.
  - B6-3: The pull is read-only, and the ERP stays the source of truth for master data.
  - B6-4: Skipping the ERP leaves manual entry and CSV export fully usable.
- **B7 Invite team and roles**
  - B7-1: Only Administrator can invite and assign roles.
  - B7-2: Invite links are single-use and expire, and revoking one stops it working at once.
  - B7-3: A role change takes effect without waiting for the session to expire.
- **B8 Payment gateway**
  - B8-1: A connection can be tested in sandbox mode before going live, and the screen always shows which mode is active.
  - B8-2: Credentials are encrypted, shown masked, and never returned in full by any response.
  - B8-3: Only Administrator can connect, change, or disconnect the gateway, and each change is audit-logged.
  - B8-4: A failed connection shows the reason and a retry, and nothing is sent.
  - B8-5: Skipping the gateway leaves bank file export fully usable.
  - B8-6: Disconnecting the gateway holds scheduled payments and tells the owner, instead of losing them.
  - B8-7: Several gateways can be connected at once, with one marked as the default.
  - B8-8: Avarta creates no gateway account for the user and adds no fee or markup to supplier payments.
  - B8-9: Every payment records the gateway used, its reference, and its status in Avarta, so reconciliation needs no outside lookup.

---

## 5. Group C: Daily work screens

These eight screens carry the linear pipeline, and users expect each one to answer one question: what needs me now, and what is the next step.

| ID | Screen | What the user expects | Features |
| --- | --- | --- | --- |
| C1 | Overview | To see what needs them now before any report | Priority worklist (past SLA, overdue approvals, active exceptions), pipeline stage counts, five metric cards, recent activity |
| C2 | Inbox and intake register | Every incoming invoice in one place, whatever the source | Drag and drop and file picker, email ingestion status, intake table with source and OCR status, manual entry |
| C3 | Import wizard | To bring in invoices that already exist in their ERP or database | Source choice, preview, confirm, progress, summary |
| C4 | Invoices register | To find any invoice in seconds | Status chips, search, dense grid, saved views, permitted bulk actions |
| C5 | Invoice detail | What matters for the task first, the rest in one scroll | Pinned document with overlays, next action strip, exception banner, essentials, line match, attachments, advanced, audit |
| C6 | Exceptions queue | To see why an invoice stopped and what to do | Queue by type, comparator, AI suggested cause, individual resolution, credit note request |
| C7 | Approvals | To know exactly what they are signing and why | Queue, signer chain, match result, approve or reject with reason, Treasury review |
| C8 | Payments | To schedule, release, and track money safely | Single and batch payments through the customer's gateway, status lifecycle, discount flags, bank file fallback, recovery for failures |

### Acceptance criteria

- **C1 Overview**
  - C1-1: The priority worklist appears above the metrics and is ordered by urgency.
  - C1-2: Stage counts and the five metric cards match the underlying data.
  - C1-3: Each worklist item opens its invoice at the right stage with the next action visible.
  - C1-4: Read Only users see no action buttons.
  - C1-5: With no data, the page shows setup guidance instead of zeros.
- **C2 Inbox and intake register**
  - C2-1: PDF, TIFF, PNG, and JPEG up to 25MB are accepted, and oversized, empty, corrupt, or unsupported files are refused with a clear message.
  - C2-2: Every source (upload, email, manual, import, scanner, API) lands in the register first, labelled with its source.
  - C2-3: If AI is off or fails, the item continues through the heuristic parser or manual entry.
  - C2-4: The email card reads not live until the inbound worker ships, and once live it checks the sender and scans attachments.
  - C2-5: A file already received is flagged as a possible duplicate.
- **C3 Import wizard**
  - C3-1: A preview of the count and date range appears before anything is imported.
  - C3-2: Imported items enter the register with source Imported and pass the same verification gate.
  - C3-3: Items already present are detected and skipped, and the summary reports them.
  - C3-4: Running the import again creates no duplicates.
  - C3-5: A failure reports what was and was not imported, and can be resumed.
- **C4 Invoices register**
  - C4-1: Search finds by invoice number, supplier, or amount.
  - C4-2: Status chips and counts match the data and the workflow state.
  - C4-3: Bulk resolve and bulk reject are not offered, and the server refuses them.
  - C4-4: Money columns are right-aligned with currency, and opening and returning keeps the user's place.
- **C5 Invoice detail**
  - C5-1: The source document stays pinned while the other pane scrolls, and no tab hides required information.
  - C5-2: The next action strip shows the AI suggestion and only the actions legal in the current state.
  - C5-3: Nothing advances without a click, and fields below 80 percent confidence need explicit acceptance.
  - C5-4: Hovering a field highlights its box on the document and the reverse, and confidence colors carry a text label.
  - C5-5: Inline Link supplier or Link PO records who confirmed it.
  - C5-6: Attachments can be added with a type tag and appear in the audit bundle.
  - C5-7: Approve and next moves to the next invoice without skipping one, only after the server confirms.
  - C5-8: The audit timeline at the bottom lists every event from receipt onward.
- **C6 Exceptions queue**
  - C6-1: Each of the 14 exception types can be raised and shows a plain-language reason.
  - C6-2: Resolution happens one invoice at a time, and bulk resolve is not offered.
  - C6-3: An override needs permission, a reason, and an audit entry.
  - C6-4: After resolution, validation and matching run again before the invoice moves on.
  - C6-5: A credit note request stays tracked until the note is received through the Inbox.
  - C6-6: Rejecting records a reason and moves the invoice to Rejected.
- **C7 Approvals**
  - C7-1: Routing follows the tier policy at every boundary amount.
  - C7-2: The creator cannot approve their own invoice, in the interface or by direct API call.
  - C7-3: Rejection requires a reason and a comment.
  - C7-4: Bulk approve is limited to eligible lowest-tier invoices, and the server checks each one.
  - C7-5: Foreign-currency invoices go to Treasury review.
  - C7-6: Administrators cannot bypass tiers, and MFA is required to approve.
- **C8 Payments**
  - C8-1: Batches group by due date, currency, and payment method.
  - C8-2: A double click or repeated request creates one batch, through the idempotency key.
  - C8-3: Buttons show a pending state, and status changes only after the server confirms.
  - C8-4: Bank files parse correctly: expected columns, 94-character NACHA records, control totals, and routing check digits.
  - C8-5: The early payment discount banner shows only inside its window.
  - C8-6: Failed or returned payments move to on hold with a clear recovery path.
  - C8-7: Releasing a batch requires MFA, and the person who edited a supplier's bank details cannot release that supplier's payment.
  - C8-8: Each payment or batch goes through a gateway or bank chosen from those connected, with the default preselected, and with none connected the screen offers bank file export instead.
  - C8-9: Single and batch payments both work, and each shows the status the gateway reports back (processing, paid, failed).
  - C8-10: Gateway callbacks are verified by signature and applied once, even when repeated or out of order.
  - C8-11: Avarta never holds or moves funds, and test-mode credentials cannot send a payment in a live workspace.
  - C8-12: Each payment keeps the gateway name, reference, and status in Avarta's record, and the payment list can be filtered by gateway.

---

## 6. Group D: Data screens

Every record users must enter or look up has one searchable table with the same controls, so learning one teaches all four.

| ID | Screen | What the user expects | Features |
| --- | --- | --- | --- |
| D1 | Suppliers | To find a supplier fast and trust its details | Table with code, legal and display name, tax ID with verification badge, terms, status; drawer with masked bank details, contact, liability, invoice history, spend and risk |
| D2 | Purchase orders and receipts | To see what was ordered, received, and invoiced | PO register with committed, invoiced, and remaining amounts; line items; goods receipts including returns; tolerance settings |
| D3 | Items catalogue | One place for the goods and services they buy | Item code, description, unit, default tax rate, standard price, status; used in line matching |
| D4 | Bank accounts | To search supplier bank details and see who changed what | Masked numbers, verification status, last change, change approvals |

### Acceptance criteria

- **D1 Suppliers**
  - D1-1: A supplier can be added manually or pulled from the ERP, and its tax ID is validated, including state code and checksum.
  - D1-2: Suppliers are archived, deactivated, or blocked, never deleted, and a blocked supplier's invoices raise an exception.
  - D1-3: Bank details are masked in the drawer and in responses for roles that should not see them.
  - D1-4: Editing bank details needs a second person's approval, raises a fraud flag, and is audit-logged.
- **D2 Purchase orders and receipts**
  - D2-1: Committed, invoiced, and remaining amounts update as invoices are matched.
  - D2-2: Price variance is evaluated at plus or minus 2 percent and quantity variance at zero, exactly at the edges.
  - D2-3: Negative received quantities and partial deliveries are supported.
  - D2-4: Several invoices can match one PO without exceeding its remaining balance.
- **D3 Items catalogue**
  - D3-1: Items can be added, edited, archived, and imported, and codes are unique per organization.
  - D3-2: A line item linked to a catalogue item shows its standard price and tax rate during matching.
  - D3-3: Archived items stay visible on past invoices.
- **D4 Bank accounts**
  - D4-1: Search finds by supplier, masked number, or status.
  - D4-2: Every change shows who requested it, who approved it, and when.
  - D4-3: An unverified or recently changed account is flagged on any invoice that would pay to it.
- **All Data screens**
  - D-ALL-1: Search, filter chips, sort, column chooser, row drawer, and quick add behave the same on every table.
  - D-ALL-2: Read Only users can search and view but see no add or edit actions.
  - D-ALL-3: Empty tables explain their purpose and offer one primary action, such as import or add.

---

## 7. Group E: Insight and record screens

After the work is done, users expect numbers they can trust and records they can hand to an auditor without preparation.

| ID | Screen | What the user expects | Features |
| --- | --- | --- | --- |
| E1 | Reports | Familiar AP numbers they can export | AP aging buckets with supplier drill-down, days payable outstanding, cash outflow forecast, processing cycle time, export |
| E2 | Archive vault | To retrieve any closed invoice and prove what happened | Read-only register, search by invoice number, supplier, clearing document, fiscal year, or hash, audit bundle export |
| E3 | Audit log | A complete, unalterable history | Filter by actor, action, entity, and date, covers invoices and settings, export |

### Acceptance criteria

- **E1 Reports**
  - E1-1: Aging, days payable outstanding, forecast, and cycle time match values computed from the underlying data.
  - E1-2: Exports download and match the numbers on screen.
  - E1-3: Amounts show the organization's currency and format, with lakh grouping where India is selected.
- **E2 Archive vault**
  - E2-1: An invoice reaches the archive only after it is paid and synced, or after a rejection is closed.
  - E2-2: Archived records are read-only for every role.
  - E2-3: Search works on all five fields, and the audit bundle contains the original document, attachments, and the event history certificate.
- **E3 Audit log**
  - E3-1: No role, including Administrator, can edit or delete an entry, in the interface or by API.
  - E3-2: Entries record actor, action, time, and source address, and settings changes appear with a filter.
  - E3-3: Overrides, waivers, bank-detail changes, and role changes always have an entry with a reason where one is required.

---

## 8. Group F: Global screens

These are available from anywhere, and users expect them in the usual places: tools along the top, account items in the profile menu, and a clean exit at the end.

| ID | Screen | What the user expects | Features |
| --- | --- | --- | --- |
| F1 | Top bar tools | Always-present orientation and quick access | Workspace switcher, global search and command palette, help panel, notifications bell, profile menu |
| F2 | Notifications | To see what changed and what is waiting for them | Unread and read, links to the item, filters, per-user preferences |
| F3 | Profile and preferences | To control their own account | Name, email, password, MFA, theme, language, notification preferences, active sessions |
| F4 | Settings | One place for organization setup | Organization and financial controls, approval policies, AI keys, database, ERP, payment gateway, team and roles, security log |
| F5 | Billing and subscription | To see cost, change plan, and leave cleanly | Current plan and usage, invoices and receipts, card update through Avarta's own gateway, cancel, data export, offboarding |
| F6 | Log out | A clear, immediate exit | Log out in the profile menu, optional log out of all devices, confirmation message |
| F7 | Error and system states | Plain explanations and a way forward | 403, 404, 500, offline, session expired, maintenance |

### Acceptance criteria

- **F1 Top bar tools**
  - F1-1: The top bar is present on every page, and Settings and Log out are reachable within two clicks.
  - F1-2: The command palette opens with the standard shortcut and finds pages, invoices, suppliers, and actions the user's role allows.
  - F1-3: Switching workspace issues a token for the new organization only, and the old token stops working.
  - F1-4: The help panel opens beside the page, is searchable, and never blocks the task.
- **F2 Notifications**
  - F2-1: Each notification opens the item it refers to and marks itself read.
  - F2-2: Users only see notifications for their own organization and role.
  - F2-3: Preferences control which events send email as well.
- **F3 Profile and preferences**
  - F3-1: Changing the password or MFA requires re-authentication.
  - F3-2: The user can see and end other active sessions.
  - F3-3: Theme and language choices persist per user.
- **F4 Settings**
  - F4-1: Each section loads, validates, saves, and writes an audit entry.
  - F4-2: Only Administrator can change policies, keys, database, ERP, payment gateway, and roles, and others see read-only values or nothing.
  - F4-3: Approval policy changes apply to the next invoice and never alter invoices already routed.
  - F4-4: Secrets are masked and cannot be read back in full.
- **F5 Billing and subscription**
  - F5-1: Plan, usage, and limits match what the server enforces.
  - F5-2: A failed card shows a grace period and clear steps before access is limited.
  - F5-3: After cancellation the user can export their data, and records are retained according to the retention policy.
- **F6 Log out**
  - F6-1: Log out ends the server session and returns to the login page, and the back button does not reopen protected pages.
  - F6-2: Log out of all devices ends every session.
  - F6-3: A session that expires while a form is open keeps the draft and returns the user to the same page after login.
- **F7 Error and system states**
  - F7-1: 403 explains that access is restricted and names who can grant it.
  - F7-2: 404 and 500 pages offer a path back and a way to report the problem.
  - F7-3: Offline shows a clear banner, and actions that need the server are disabled instead of failing silently.

---

## 9. Role access by screen

These are proposed defaults for the five roles, to be confirmed against the permission matrix in code before release.

| Area | Administrator | Finance Manager | Finance Executive | Approver | Read Only |
| --- | --- | --- | --- | --- | --- |
| Overview | View | View | View | View | View |
| Inbox and import | Full | Full | Full | View | View |
| Invoices and verification | Full | Full | Full | View | View |
| Exceptions | Resolve and override | Resolve and override | Resolve, no override | View | View |
| Approvals | Per tier policy | Per tier policy | Per tier policy | Per tier policy | View |
| Payments | Release | Release | Prepare batches | None | View |
| Suppliers, POs, Items | Full | Full | Edit | View | View |
| Bank accounts | Approve changes | Approve changes | Request changes | None | View masked |
| Reports | View and export | View and export | View and export | View | View |
| Archive | View and export | View and export | View and export | View | View |
| Audit log | View and export | View | None | None | None |
| Settings | Full | View policies | None | None | None |
| Team and roles | Full | None | None | None | None |
| Billing | Full | None | None | None | None |
| Profile and preferences | Own | Own | Own | Own | Own |

### Rules that hold for every role

- No role approves an invoice it created, and no role can bypass an approval tier.
- The person who edits a supplier's bank details cannot release payment to that supplier.
- Approving and releasing payments require MFA.
- Every denied action returns the same result by direct API call as it does in the interface.

---

## 10. Criteria that apply to every screen

A screen is not done until it also meets these, and each can be checked automatically across all pages.

| ID | Criterion |
| --- | --- |
| X-1 | Passes an automated accessibility scan with no serious violations, and meets WCAG 2.1 AA for contrast, labels, and focus order |
| X-2 | Every action is reachable by keyboard, with a visible focus indicator and a logical tab order |
| X-3 | Status is never shown by color alone, and every color has a text label or icon |
| X-4 | Loading, empty, error, and offline states are designed and tested |
| X-5 | Errors say what happened and what to do next, and never show stack traces or raw codes |
| X-6 | Financial actions show a pending state and change only after the server confirms |
| X-7 | Confirmation dialogs name the real action (Archive, Reject, Revoke), and the word Delete never appears |
| X-8 | AI output is labelled as a suggestion, shows its evidence, and never changes data without a click |
| X-9 | Every state-changing action writes an audit entry with actor, time, and reason where required |
| X-10 | Text uses accounting terms users know, and internal state names never appear |
| X-11 | Amounts use tabular figures, the right currency and grouping, and are right-aligned |
| X-12 | Layout works on laptop, tablet, and phone widths without sideways scrolling of the page |
| X-13 | No placeholder text, console errors, or failed network requests on any page |
| X-14 | Help is available from the page through the help panel or a contextual hint |
| X-15 | Access is checked on the server for every role, and a hidden button is never the only protection |
