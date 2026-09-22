# Avarta AP Workspace: Presenter Demo Cheat Sheet

This cheat sheet pairs each of the **9 Named Demonstration Scenarios** with the exact user clicks, screen navigation, and talk track for client demonstrations and investor walkthroughs.

---

## Pre-Demo Checklist (5 Minutes Before Call)
1. **Reset Environment**:
   - Option A (Browser UI): Go to **Settings** → **Team & Workspace Governance** tab → Click **"Reset Demo Environment"** → Confirm.
   - Option B (CLI): Run `pnpm demo:reset` (or `npm run db:reset-demo`).
2. **Log In**: Open `/login` and select **Manav Manager** (`manager@avarta.dev`, password `password123`) — the Finance Manager persona.
3. **Verify Date Anchors**: All aging buckets and due dates are automatically computed relative to **today's date**.

---

## Scenario-by-Scenario Demo Script

### Scenario 1: The Clean 3-Way Match (Happy Path)
* **Screen**: **Overview** (`/overview`) ➔ **Inbox** (`/inbox`) ➔ **Invoice Detail** (`/invoices/:id`)
* **Target Invoice**: `INV-2026-1001` (Tata Steel Ltd, ₹1,46,000, PO `PO-FY26-0142`)
* **What to Click**:
  1. From Overview, click **Inbox** on the sidebar.
  2. Under "Recent Ingestion Feed", locate `INV-2026-1001` from Tata Steel.
  3. Click **"Review & Process"** (or click into the invoice row).
  4. In the Summary Strip, click **"Verify 3-Way Match"**.
* **What to Say**:
  > *"Invoices land in Avarta via automated email webhooks, supplier portal submissions, or drag-and-drop. Here, our AI parser extracted the line items from Tata Steel with 95% confidence. Notice how the system performs an instant 3-way match against Purchase Order PO-FY26-0142 and Gate Pass Goods Receipt Notes. All quantities and unit rates match to the rupee with zero manual data entry."*

---

### Scenario 2: 3-Way Match Price Variance Discrepancy
* **Screen**: **Exceptions** (`/exceptions`)
* **Target Invoice**: `INV-2026-1018` (Dell Technologies, USD 5,200, PO `PO-FY26-0881`)
* **What to Click**:
  1. Click **Exceptions** on the sidebar.
  2. Select the **Critical** severity filter.
  3. Click into `INV-2026-1018` flagged with `PRICE_DIFFERENCE`.
  4. Expand the discrepancy drawer to show the PO rate ($4,850) vs billed rate ($5,200).
* **What to Say**:
  > *"When vendors bill above the contract rate, Avarta's non-negotiable rule kicks in: AI suggests, but humans decide. The engine halted this invoice because Dell billed $5,200 per server against an authorized PO price of $4,850. The AP clerk can review the 7.2% variance and either resolve with a procurement memo or reject the invoice back to the supplier."*

---

### Scenario 3: GRN Quantity Variance with Transit Damage (Tata Chemicals Standard)
* **Screen**: **Exceptions** (`/exceptions`) ➔ **Purchase Orders** (`/purchase-orders`)
* **Target Invoice**: `INV-2026-1019` (Dell Technologies, USD 4,712, PO `PO-FY26-0881`)
* **What to Click**:
  1. In the Exceptions queue, click on `INV-2026-1019` (`QUANTITY_DIFFERENCE`).
  2. Point to the Goods Receipt reference `GRN-FY26-0083`.
  3. Switch to **Purchase Orders** and inspect `PO-FY26-0881`.
* **What to Say**:
  > *"This represents our deep physical inventory reconciliation. Dell billed for 8 monitors, but the warehouse inspection logged 7 accepted units and 1 damaged chassis returned under Return Note #RET-881. Avarta automatically deducted the return quantity, calculated the net receipt of 7, and prevented the business from paying for damaged freight."*

---

### Scenario 4: Statutory Tax Arithmetic & Indian GSTIN Verification
* **Screen**: **Exceptions** (`/exceptions`)
* **Target Invoices**: `INV-2026-1020` (Tata Steel, `TAX_DIFFERENCE`) & `INV-2026-1021` (Maersk Line, `INVALID_GST`)
* **What to Click**:
  1. Click on `INV-2026-1020` (Tax shortfall alert).
  2. Click on `INV-2026-1021` (Statutory GSTIN checksum alert).
* **What to Say**:
  > *"Avarta is built specifically for Indian corporate compliance. On this Tata Steel bill, the vendor applied a 12% GST rate instead of the mandatory 18% HSN 7208 rate, which our engine flagged immediately. Even more powerful: on Maersk Line, the vendor's tax ID failed statutory Modulo-36 check-digit verification. We catch compliance errors before they hit your GST return."*

---

### Scenario 5: Multi-Tier Delegation of Authority (Approval Thresholds)
* **Screen**: **Approvals** (`/approvals`)
* **Target Invoices**:
  - `INV-2026-1006` (BlueDart, ₹38,000 — Tier 1)
  - `INV-2026-1007` (Amazon, ₹1,85,000 — Tier 2)
  - `INV-2026-1024` (Tata Steel, ₹8,25,000 — Tier 3)
* **What to Click**:
  1. Click **Approvals** on the sidebar.
  2. Point to the Tier badges (`Tier 1`, `Tier 2`, `Tier 3`).
  3. Click **"Approve"** on `INV-2026-1007` (Tier 2).
  4. Switch persona via top bar to **Arjun Approver** (`approver@avarta.dev`) and observe that Tier 2 and Tier 3 show role restrictions.
* **What to Say**:
  > *"Spend authorization is strictly enforced server-side. Invoices under ₹1 Lakh are routed to departmental Approvers; mid-value spend between ₹1 Lakh and ₹5 Lakhs requires the Finance Manager; high-value capital expenditure over ₹5 Lakhs—like this ₹8.25 Lakh steel order—mandates Administrator sign-off. When I approve here, the engine records an immutable audit log entry."*

---

### Scenario 6: Duplicate Detection & Remittance Fraud Defense
* **Screen**: **Exceptions** (`/exceptions`)
* **Target Invoices**: `INV-2026-1011` (`DUPLICATE_INVOICE`) & `INV-2026-1022` (`FRAUD_RISK`)
* **What to Click**:
  1. Filter by `Critical` in Exceptions.
  2. Open `INV-2026-1011` to show the matching reference `INV-2026-1001`.
  3. Open `INV-2026-1022` to show the bank details mismatch alert.
* **What to Say**:
  > *"Every CFO worries about duplicate payments and account takeover fraud. Here, Avarta detected an identical ₹1.46 Lakh invoice submitted twice. On Siemens AG, the bank IBAN extracted from the document header did not match the authenticated master record in our vendor database, placing an automatic hold on disbursements."*

---

### Scenario 7: Host-to-Host Batch Banking Disbursement
* **Screen**: **Payments** (`/payments`)
* **Target Invoices**: `INV-2026-1008` (Dell $16,700), `INV-2026-1009` (Siemens €6,400), `INV-2026-1023` (BlueDart ₹450)
* **What to Click**:
  1. Navigate to **Payments**.
  2. Check the boxes next to 3 scheduled payments.
  3. Notice the sticky **Batch Disbursement Bar** appears at the bottom.
  4. Click **"Authorize Batch Banking Disbursement"**.
  5. In the modal, select **HDFC Corporate Current**, enter notes, and click **"Execute Bank Release"**.
* **What to Say**:
  > *"In the Payments hub, scheduled invoices aggregate for treasury release. With one click, the Finance Manager authorizes a multi-currency batch disbursement. Our Host-to-Host banking simulation connects to institutional treasury rails, generates unique settlement UTRs, and guarantees zero optimistic UI errors."*

---

### Scenario 8: Partial Payment & Overdue Aging Triage
* **Screen**: **Overview** (`/overview`) ➔ **Reports** (`/reports`)
* **Target Invoices**: `INV-2026-1017` (Siemens India ₹75,000 partial payment)
* **What to Click**:
  1. On Overview, point to the **Overdue Triage** card and **Foreign Currency Exposure**.
  2. Switch to **Reports** ➔ **AP Aging & Cash Forecast** tab.
  3. Show the aging buckets (`Current`, `1–30 Days`, `31–60 Days`, `60+ Days`) and weekly 30-day cash outflow.
* **What to Say**:
  > *"Accounts payable is never static. On this Siemens invoice, we paid 50% upfront and the remaining ₹75,000 is tracked with live aging relative to today. Leadership gets complete clarity on working capital outflows over the next 4 weeks."*

---

### Scenario 9: ERP General Ledger Sync & Section 44AA Archive
* **Screen**: **Archive** (`/archive`)
* **Target Invoices**: `INV-2026-1028` (`SYNCED`) and `INV-2026-0900` (`ARCHIVED`)
* **What to Click**:
  1. Click **Archive** on the sidebar.
  2. Inspect the StatsCards: **Total Archived Capital** and **Section 44AA 8-Year Compliance Lock**.
  3. Click **"View Compliance Certificate"** on `INV-2026-0900`.
* **What to Say**:
  > *"Once paid, invoices sync to your ERP—like Tally, SAP, or QuickBooks—using double-entry journal vouchers. The records then lock into our Section 44AA compliant archive with a tamper-evident SHA-256 digital certificate, guaranteeing an audit-ready tax posture for 8 years."*

---

## Post-Demo Reset (Leaving Clean for Next Presentation)
1. Open `/settings?tab=users`.
2. Click **"Reset Demo Environment"** and confirm.
3. The application is now restored to its pristine 28-invoice baseline for the next presentation.
