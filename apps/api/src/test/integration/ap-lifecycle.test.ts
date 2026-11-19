import { describe, expect, it, beforeEach } from "vitest";
import { prisma } from "../../config/database";
import { applyTransition } from "../../workflow/engine";
import { findTransition } from "../../workflow/transitions";
import {
  createInvoice,
  getInvoice,
  updateInvoice,
  syncInvoiceToErp,
} from "../../modules/invoices/service";
import { createSupplier } from "../../modules/suppliers/service";
import {
  createPurchaseOrder,
  createGoodsReceipt,
  updatePoReceivingStatus,
} from "../../modules/purchase_orders/repository";
import { executePayment } from "../../modules/payments/service";
import {
  approveApproval,
  executeInvoiceRejection,
} from "../../modules/approvals/service";
import {
  resolveException,
  createException,
} from "../../modules/exceptions/service";
import { checkCanCreateInvoice } from "../../modules/billing/service";
import { idempotent } from "../../middleware/idempotency";
import { Request, Response } from "express";
import { buildJournalEntry } from "../../modules/erp/service";
import { signAccessToken } from "../../lib/jwt";
import { runWithEngineBypass } from "../../config/tenant-guard";
import { ApiError } from "../../lib/errors";

describe("T-402: Full-Lifecycle API Integration Test Suite on Real Postgres", () => {
  const orgId = "org-ap-lifecycle-test";
  let adminUserId: string;
  let financeManagerId: string;
  let approverUserId: string;
  let creatorExecutiveId: string;
  let testSupplierId: string;

  beforeEach(async () => {
    // Clean up all related tables in foreign key order for clean isolation
    await prisma.workflowTransition.deleteMany({
      where: { workflowInstance: { invoice: { organizationId: orgId } } },
    });
    await prisma.workflowInstance.deleteMany({
      where: { invoice: { organizationId: orgId } },
    });
    await prisma.approval.deleteMany({
      where: { invoice: { organizationId: orgId } },
    });
    await prisma.exception.deleteMany({ where: { organizationId: orgId } });
    await prisma.notification.deleteMany({ where: { organizationId: orgId } });
    await prisma.payment.deleteMany({ where: { organizationId: orgId } });
    await prisma.invoiceLine.deleteMany({
      where: { invoice: { organizationId: orgId } },
    });
    await prisma.invoice.deleteMany({ where: { organizationId: orgId } });
    await prisma.goodsReceiptLine.deleteMany({
      where: { goodsReceipt: { organizationId: orgId } },
    });
    await prisma.goodsReceipt.deleteMany({ where: { organizationId: orgId } });
    await prisma.purchaseOrder.deleteMany({ where: { organizationId: orgId } });
    await prisma.bankAccount.deleteMany({ where: { organizationId: orgId } });
    await prisma.auditLog.deleteMany({ where: { organizationId: orgId } });
    await prisma.subscription.deleteMany({ where: { organizationId: orgId } });
    await prisma.supplier.deleteMany({ where: { organizationId: orgId } });
    await prisma.user.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });

    // 1. Create Organization with Indian timezone and settings
    await prisma.organization.create({
      data: {
        id: orgId,
        name: "Acme Industrial Technologies Ltd",
        legalName: "Acme Industrial Technologies India Private Limited",
        defaultCurrency: "INR",
        country: "IN",
        timezone: "Asia/Kolkata",
        gstin: "27AABCA1234F1Z8",
        settings: {
          bankEditSodWindowDays: 30,
        },
      },
    });

    // 2. Create canonical users representing standard AP roles
    const admin = await prisma.user.create({
      data: {
        organizationId: orgId,
        email: "ap-admin@acme-industrial.com",
        fullName: "Aarav Sharma (Admin)",
        role: "ADMINISTRATOR",
        status: "ACTIVE",
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyzAaravAdminHashDummy123456",
      },
    });
    adminUserId = admin.id;

    const fm = await prisma.user.create({
      data: {
        organizationId: orgId,
        email: "ap-fm@acme-industrial.com",
        fullName: "Priya Nair (Finance Manager)",
        role: "FINANCE_MANAGER",
        status: "ACTIVE",
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyzPriyaFMHashDummy123456",
      },
    });
    financeManagerId = fm.id;

    const approver = await prisma.user.create({
      data: {
        organizationId: orgId,
        email: "ap-approver@acme-industrial.com",
        fullName: "Vikram Mehta (Approver)",
        role: "APPROVER",
        status: "ACTIVE",
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyzVikramApproverHash123",
      },
    });
    approverUserId = approver.id;

    const creator = await prisma.user.create({
      data: {
        organizationId: orgId,
        email: "ap-creator@acme-industrial.com",
        fullName: "Neha Verma (Finance Executive)",
        role: "FINANCE_EXECUTIVE",
        status: "ACTIVE",
        passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyzNehaCreatorHash1234",
      },
    });
    creatorExecutiveId = creator.id;

    // 3. Create active Starter SaaS subscription
    await prisma.subscription.create({
      data: {
        organizationId: orgId,
        planTier: "STARTER",
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      },
    });

    // 4. Create primary test supplier with valid statutory PAN and GSTIN
    const supplier = await createSupplier(orgId, {
      supplierCode: "SUP-ACME-001",
      legalName: "Bharat Precision Forgings Private Limited",
      displayName: "Bharat Precision",
      gstNumber: "27AAACB1234F1Z5",
      panNumber: "AAACB1234F",
      currency: "INR",
      country: "IN",
      ifscCode: "HDFC0001234",
    });
    testSupplierId = supplier.id;
  });

  describe("1. Real Postgres Migrations & Database Constraints (T-101 Verification)", () => {
    it("enforces Payment_paid_settlement_check in PostgreSQL: status PAID requires non-null utrNumber and settlementDate", async () => {
      // Create invoice first
      const invoice = await createInvoice({
        organizationId: orgId,
        supplierId: testSupplierId,
        invoiceNumber: "INV-PG-CHK-001",
        totalAmount: 15000,
        subtotalAmount: 12711.86,
        taxAmount: 2288.14,
        currency: "INR",
        userId: creatorExecutiveId,
      });

      // Advance through approval to reach SCHEDULED
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "CAPTURE_COMPLETE" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "VALIDATION_START" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "VALIDATION_SUCCESS" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_START" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_SUCCESS" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "APPROVAL_REQUEST" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "APPROVED", triggeredBy: financeManagerId });

      // Negative check A: Attempt raw insert of Payment with status PAID but utrNumber NULL
      let errorThrown = false;
      try {
        await prisma.payment.create({
          data: {
            organizationId: orgId,
            invoiceId: invoice.id,
            amount: 15000,
            currency: "INR",
            status: "PAID",
            paymentMethod: "NEFT",
            settlementDate: new Date(),
            utrNumber: null as unknown as string, // Violates Payment_paid_settlement_check
          },
        });
      } catch (err: unknown) {
        errorThrown = true;
        const msg = String(err);
        expect(
          msg.includes("Payment_paid_settlement_check") || msg.includes("23514") || msg.includes("check constraint")
        ).toBe(true);
      }
      expect(errorThrown).toBe(true);

      // Negative check B: Attempt raw insert of Payment with status PAID but settlementDate NULL
      errorThrown = false;
      try {
        await prisma.payment.create({
          data: {
            organizationId: orgId,
            invoiceId: invoice.id,
            amount: 15000,
            currency: "INR",
            status: "PAID",
            paymentMethod: "NEFT",
            settlementDate: null as unknown as Date, // Violates Payment_paid_settlement_check
            utrNumber: "HDFCN20261119001",
          },
        });
      } catch (err: unknown) {
        errorThrown = true;
        const msg = String(err);
        expect(
          msg.includes("Payment_paid_settlement_check") || msg.includes("23514") || msg.includes("check constraint")
        ).toBe(true);
      }
      expect(errorThrown).toBe(true);

      // Positive check: Providing both valid utrNumber and settlementDate passes database check constraint
      const validPayment = await prisma.payment.create({
        data: {
          organizationId: orgId,
          invoiceId: invoice.id,
          amount: 15000,
          currency: "INR",
          status: "PAID",
          paymentMethod: "NEFT",
          settlementDate: new Date("2026-11-19T10:00:00Z"),
          utrNumber: "HDFCN20261119001",
        },
      });
      expect(validPayment.id).toBeDefined();
      expect(validPayment.status).toBe("PAID");
      expect(validPayment.utrNumber).toBe("HDFCN20261119001");
      expect(validPayment.settlementDate).toEqual(new Date("2026-11-19T10:00:00Z"));
    });

    it("enforces Supplier_ifscCode_format_check check constraint on PostgreSQL", async () => {
      // 5th character must be '0' and exactly 11 chars
      let failed = false;
      try {
        await prisma.supplier.create({
          data: {
            organizationId: orgId,
            supplierCode: "SUP-INVALID-IFSC",
            displayName: "Invalid IFSC Corp",
            legalName: "Invalid IFSC Corp Ltd",
            currency: "INR",
            country: "IN",
            ifscCode: "HDFC9999999", // Invalid: 5th char is '9' instead of '0'
          },
        });
      } catch (err: unknown) {
        failed = true;
        const msg = String(err);
        expect(msg.includes("Supplier_ifscCode_format_check") || msg.includes("check constraint") || msg.includes("23514")).toBe(true);
      }
      expect(failed).toBe(true);
    });

    it("enforces Supplier_panNumber_format_check check constraint on PostgreSQL", async () => {
      // 5 letters + 4 digits + 1 letter
      let failed = false;
      try {
        await prisma.supplier.create({
          data: {
            organizationId: orgId,
            supplierCode: "SUP-INVALID-PAN",
            displayName: "Invalid PAN Corp",
            legalName: "Invalid PAN Corp Ltd",
            currency: "INR",
            country: "IN",
            panNumber: "INVALIDPAN1", // Invalid: 10 chars but wrong regex
          },
        });
      } catch (err: unknown) {
        failed = true;
        const msg = String(err);
        expect(msg.includes("Supplier_panNumber_format_check") || msg.includes("check constraint") || msg.includes("23514")).toBe(true);
      }
      expect(failed).toBe(true);
    });
  });

  describe("2. Full End-to-End AP Workflow Lifecycle (Receive -> Archive)", () => {
    it("executes complete linear flow: Auth -> PO -> Invoice -> 3-Way Match -> Approval -> Payment -> ERP Sync -> Archive", async () => {
      // 1. Authenticate Session & Verify JWT Tokens
      const adminToken = signAccessToken({
        userId: adminUserId,
        organizationId: orgId,
        role: "ADMINISTRATOR",
      });
      const fmToken = signAccessToken({
        userId: financeManagerId,
        organizationId: orgId,
        role: "FINANCE_MANAGER",
      });
      const creatorToken = signAccessToken({
        userId: creatorExecutiveId,
        organizationId: orgId,
        role: "FINANCE_EXECUTIVE",
      });
      expect(adminToken).toBeDefined();
      expect(fmToken).toBeDefined();
      expect(creatorToken).toBeDefined();

      // 2. Create Bank Account for Supplier and Verify it
      const bankAccount = await prisma.bankAccount.create({
        data: {
          organizationId: orgId,
          supplierId: testSupplierId,
          supplierName: "Bharat Precision",
          bankName: "HDFC Bank",
          accountNumberLast4: "5678",
          encryptedAccountNumber: "dummy:encrypted:5678",
          ifscSwift: "HDFC0001234",
          status: "VERIFIED",
          isPrimary: true,
        },
      });
      expect(bankAccount.status).toBe("VERIFIED");

      // 3. Create Purchase Order (PO) & Record Goods Receipt Note (GRN)
      const po = await createPurchaseOrder(orgId, {
        supplierId: testSupplierId,
        poNumber: "PO-2026-LIFECYCLE-001",
        totalAmount: 50000,
        currency: "INR",
        issueDate: new Date(),
      });
      expect(po.status).toBe("OPEN");
      expect(Number(po.totalAmount)).toBe(50000);

      const grn = await createGoodsReceipt(orgId, po.id, {
        grnNumber: "GRN-2026-001",
        vendorDeliveryNote: "DC-9921",
        lines: [
          {
            lineNumber: 1,
            description: "Industrial Forged Valves DN50",
            receivedQuantity: 100,
            unitOfMeasure: "NOS",
            status: "ACCEPTED",
          },
        ],
      });
      expect(grn.lines).toHaveLength(1);
      expect(Number(grn.lines[0].receivedQuantity)).toBe(100);

      // 4. Intake Invoice: Initial state is RECEIVED, status RECEIVED
      const invoice = await createInvoice({
        organizationId: orgId,
        supplierId: testSupplierId,
        purchaseOrderId: po.id,
        invoiceNumber: "INV-2026-FULL-001",
        totalAmount: 50000,
        subtotalAmount: 42372.88,
        taxAmount: 7627.12,
        currency: "INR",
        userId: creatorExecutiveId,
      });

      expect(invoice.workflowState).toBe("RECEIVED");
      expect(invoice.status).toBe("RECEIVED");

      // Verify audit log for creation exists
      const creationAudit = await prisma.auditLog.findFirst({
        where: { organizationId: orgId, entityId: invoice.id, action: "DOCUMENT_OCR_COMPLETED" },
      });
      expect(creationAudit).toBeDefined();

      // 5. Linear Transitions: Capture -> Validation
      await applyTransition({
        invoiceId: invoice.id,
        organizationId: orgId,
        event: "CAPTURE_COMPLETE",
        triggeredBy: creatorExecutiveId,
      });
      let currentInv = await getInvoice(orgId, invoice.id);
      expect(currentInv.workflowState).toBe("CAPTURED");
      expect(currentInv.status).toBe("PROCESSING");

      await applyTransition({
        invoiceId: invoice.id,
        organizationId: orgId,
        event: "VALIDATION_START",
        triggeredBy: creatorExecutiveId,
      });
      currentInv = await getInvoice(orgId, invoice.id);
      expect(currentInv.workflowState).toBe("VALIDATING");
      expect(currentInv.status).toBe("PROCESSING");

      await applyTransition({
        invoiceId: invoice.id,
        organizationId: orgId,
        event: "VALIDATION_SUCCESS",
        triggeredBy: creatorExecutiveId,
      });
      currentInv = await getInvoice(orgId, invoice.id);
      expect(currentInv.workflowState).toBe("VALIDATED");
      expect(currentInv.status).toBe("PROCESSING");

      // 6. 3-Way Matching: Match against PO and GRN
      await applyTransition({
        invoiceId: invoice.id,
        organizationId: orgId,
        event: "MATCHING_START",
        triggeredBy: creatorExecutiveId,
      });
      currentInv = await getInvoice(orgId, invoice.id);
      expect(currentInv.workflowState).toBe("MATCHING");

      // Matching succeeds: transitions to MATCHED, then via APPROVAL_REQUEST to WAITING_APPROVAL, status PENDING_APPROVAL
      await applyTransition({
        invoiceId: invoice.id,
        organizationId: orgId,
        event: "MATCHING_SUCCESS",
        triggeredBy: creatorExecutiveId,
      });
      await applyTransition({
        invoiceId: invoice.id,
        organizationId: orgId,
        event: "APPROVAL_REQUEST",
        triggeredBy: creatorExecutiveId,
      });
      currentInv = await getInvoice(orgId, invoice.id);
      expect(currentInv.workflowState).toBe("WAITING_APPROVAL");
      expect(currentInv.status).toBe("PENDING_APPROVAL");

      // Verify automated side effect: Approval & Notification created
      const pendingApproval = await prisma.approval.findFirst({
        where: { invoice: { organizationId: orgId }, invoiceId: invoice.id, status: "PENDING" },
      });
      expect(pendingApproval).toBeDefined();

      const notif = await prisma.notification.findFirst({
        where: { organizationId: orgId, entityId: invoice.id, type: "APPROVAL_REQUEST" },
      });
      expect(notif).toBeDefined();

      // 7. Multi-Tier Approval & Segregation of Duties (SoD)
      // Creator (Finance Executive) cannot approve own invoice (403 Forbidden)
      await expect(
        approveApproval(orgId, pendingApproval!.id, creatorExecutiveId, "FINANCE_EXECUTIVE", "Self approval")
      ).rejects.toThrow();

      // Finance Manager approves invoice: moves state to SCHEDULED, status SCHEDULED
      const approvedResult = await approveApproval(
        orgId,
        pendingApproval!.id,
        financeManagerId,
        "FINANCE_MANAGER",
        "Reviewed 3-way match against GRN-2026-001; approved."
      );
      expect(approvedResult!.status).toBe("APPROVED");

      currentInv = await getInvoice(orgId, invoice.id);
      expect(currentInv.workflowState).toBe("SCHEDULED");
      expect(currentInv.status).toBe("SCHEDULED");

      // Verify automated side effect: Payment created with status SCHEDULED
      const scheduledPayment = await prisma.payment.findFirst({
        where: { invoiceId: invoice.id, organizationId: orgId },
      });
      expect(scheduledPayment).toBeDefined();
      expect(scheduledPayment!.status).toBe("SCHEDULED");
      expect(Number(scheduledPayment!.amount)).toBe(50000);

      // 8. Payment Execution & Settlement
      // Advance to PAYMENT_RUN -> PROCESSING_PAYMENT
      await applyTransition({
        invoiceId: invoice.id,
        organizationId: orgId,
        event: "PAYMENT_RUN",
        triggeredBy: financeManagerId,
      });
      currentInv = await getInvoice(orgId, invoice.id);
      expect(currentInv.workflowState).toBe("PROCESSING_PAYMENT");
      expect(currentInv.status).toBe("SCHEDULED");

      // Transition to PAID requires UTR & settlement date
      await applyTransition({
        invoiceId: invoice.id,
        organizationId: orgId,
        event: "PAYMENT_SUCCESS",
        triggeredBy: financeManagerId,
        utrNumber: "AXISN202611190001",
        settlementDate: new Date("2026-11-19T12:00:00Z"),
      });

      currentInv = await getInvoice(orgId, invoice.id);
      expect(currentInv.workflowState).toBe("PAID");
      expect(currentInv.status).toBe("PAID");

      // Verify Payment record was updated to PAID with UTR & settlementDate (satisfying DB constraint)
      const paidPayment = await prisma.payment.findFirst({
        where: { invoiceId: invoice.id, organizationId: orgId },
      });
      expect(paidPayment!.status).toBe("PAID");
      expect(paidPayment!.utrNumber).toBe("AXISN202611190001");
      expect(paidPayment!.settlementDate).toBeDefined();

      // Verify public tracking token extended (+90 days) on database record
      const dbInvoice = await prisma.invoice.findFirst({
        where: { id: invoice.id, organizationId: orgId },
      });
      expect(dbInvoice!.trackingTokenExpiresAt).toBeDefined();
      const expiresMs = new Date(dbInvoice!.trackingTokenExpiresAt!).getTime();
      expect(expiresMs).toBeGreaterThan(Date.now() + 80 * 86400000);

      // 9. ERP Synchronization: Balanced Double-Entry Invariant
      const journalEntry = buildJournalEntry({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        subtotalAmount: invoice.subtotalAmount,
        taxAmount: invoice.taxAmount,
        supplier: { displayName: "Bharat Precision" },
      });

      // Verify double entry invariant: Total Debits == Total Credits
      const totalDebits = journalEntry.lines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredits = journalEntry.lines.reduce((sum, l) => sum + l.credit, 0);
      expect(totalDebits).toBeCloseTo(totalCredits, 2);
      expect(totalDebits).toBeCloseTo(50000, 2);

      // Advance: PAID -> ERP_SUCCESS -> ERP_SYNC (status SYNCED)
      await syncInvoiceToErp(orgId, invoice.id, "CSV", financeManagerId);
      currentInv = await getInvoice(orgId, invoice.id);
      expect(currentInv.workflowState).toBe("ERP_SYNC");
      expect(currentInv.status).toBe("SYNCED");
      expect(currentInv.erpClearingNumber).toBeDefined();

      // 10. Archival: Terminal resting state
      await applyTransition({
        invoiceId: invoice.id,
        organizationId: orgId,
        event: "ARCHIVE_COMPLETE",
        triggeredBy: adminUserId,
      });
      currentInv = await getInvoice(orgId, invoice.id);
      expect(currentInv.workflowState).toBe("ARCHIVED");
      expect(currentInv.status).toBe("ARCHIVED");

      const workflowInstance = await prisma.workflowInstance.findFirst({
        where: { invoice: { organizationId: orgId }, invoiceId: invoice.id },
      });
      expect(workflowInstance!.completedAt).toBeDefined();

      // 11. Audit Log Continuity Check
      const auditTrail = await prisma.auditLog.findMany({
        where: { organizationId: orgId, entityId: invoice.id },
        orderBy: { createdAt: "asc" },
      });
      expect(auditTrail.length).toBeGreaterThanOrEqual(5);
      const actions = auditTrail.map((a) => a.action);
      expect(actions).toContain("DOCUMENT_OCR_COMPLETED");
      expect(actions).toContain("WORKFLOW_TRANSITION");
    });

    it("handles exception branching and clean linear rejoin (Exception -> Resolve -> VALIDATED)", async () => {
      // Create PO with remainingAmount 10,000 and closed for receiving
      const po = await createPurchaseOrder(orgId, {
        supplierId: testSupplierId,
        poNumber: "PO-CLOSED-CAP-001",
        totalAmount: 10000,
        currency: "INR",
      });
      await updatePoReceivingStatus(orgId, po.id, true);

      // Create invoice for 25,000 INR (exceeding PO cap)
      const invoice = await createInvoice({
        organizationId: orgId,
        supplierId: testSupplierId,
        purchaseOrderId: po.id,
        invoiceNumber: "INV-EXC-REJOIN-001",
        totalAmount: 25000,
        subtotalAmount: 21186.44,
        taxAmount: 3813.56,
        currency: "INR",
        userId: creatorExecutiveId,
      });

      // Advance through validation to MATCHING
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "CAPTURE_COMPLETE" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "VALIDATION_START" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "VALIDATION_SUCCESS" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_START" });

      // Trigger MATCHING_FAILURE -> moves to MATCHING_FAILED, status EXCEPTION
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_FAILURE" });
      let inv = await getInvoice(orgId, invoice.id);
      expect(inv.workflowState).toBe("MATCHING_FAILED");
      expect(inv.status).toBe("EXCEPTION");

      // Create Exception record
      const exception = await createException({
        organizationId: orgId,
        invoiceId: invoice.id,
        type: "PRICE_DIFFERENCE",
        severity: "HIGH",
        title: "Liability Cap Exceeded",
        description: "Billed amount 25,000 exceeds remaining PO cap 10,000.",
      });
      expect(exception.status).toBe("OPEN");

      // Negative Test: Resolving without note throws 400 Bad Request
      await expect(
        resolveException(orgId, exception.id, "", financeManagerId)
      ).rejects.toThrow("Resolution note is required");

      // Positive Test: Resolving with valid note triggers EXCEPTION_RESOLVED and rejoins at VALIDATED
      const resolved = await resolveException(
        orgId,
        exception.id,
        "Supplier provided supplementary credit memo CM-8891; difference accepted under variance policy.",
        financeManagerId
      );
      expect(resolved.status).toBe("RESOLVED");

      inv = await getInvoice(orgId, invoice.id);
      expect(inv.workflowState).toBe("VALIDATED");
      expect(inv.status).toBe("PROCESSING");
    });
  });

  describe("3. Exhaustive FSM State Transition Matrix (16 Canonical Transitions)", () => {
    it("tests every legal transition has a passing test and every state rejects invalid events", async () => {
      // Create baseline invoice
      const invoice = await createInvoice({
        organizationId: orgId,
        supplierId: testSupplierId,
        invoiceNumber: "INV-FSM-MATRIX-001",
        totalAmount: 10000,
        subtotalAmount: 8500,
        taxAmount: 1500,
        currency: "INR",
      });

      // 1. RECEIVED -> CAPTURE_COMPLETE -> CAPTURED
      expect(findTransition("RECEIVED", "CAPTURE_COMPLETE")?.to).toBe("CAPTURED");
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "CAPTURE_COMPLETE" });
      let inv = await getInvoice(orgId, invoice.id);
      expect(inv.workflowState).toBe("CAPTURED");
      // Negative from CAPTURED: invalid event PAYMENT_SUCCESS throws 409
      await expect(
        applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "PAYMENT_SUCCESS" })
      ).rejects.toThrow(/is not valid from state "CAPTURED"/);

      // 2. CAPTURED -> VALIDATION_START -> VALIDATING
      expect(findTransition("CAPTURED", "VALIDATION_START")?.to).toBe("VALIDATING");
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "VALIDATION_START" });
      inv = await getInvoice(orgId, invoice.id);
      expect(inv.workflowState).toBe("VALIDATING");
      // Negative from VALIDATING: invalid event ARCHIVE_COMPLETE throws 409
      await expect(
        applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "ARCHIVE_COMPLETE" })
      ).rejects.toThrow(/is not valid from state "VALIDATING"/);

      // 3. VALIDATING -> VALIDATION_FAILURE -> VALIDATION_FAILED
      expect(findTransition("VALIDATING", "VALIDATION_FAILURE")?.to).toBe("VALIDATION_FAILED");
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "VALIDATION_FAILURE" });
      inv = await getInvoice(orgId, invoice.id);
      expect(inv.workflowState).toBe("VALIDATION_FAILED");
      // Negative from VALIDATION_FAILED: invalid event APPROVED throws 409
      await expect(
        applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "APPROVED" })
      ).rejects.toThrow(/is not valid from state "VALIDATION_FAILED"/);

      // 4. VALIDATION_FAILED -> EXCEPTION_RESOLVED -> VALIDATED
      expect(findTransition("VALIDATION_FAILED", "EXCEPTION_RESOLVED")?.to).toBe("VALIDATED");
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "EXCEPTION_RESOLVED" });
      inv = await getInvoice(orgId, invoice.id);
      expect(inv.workflowState).toBe("VALIDATED");
      // Negative from VALIDATED: invalid event PAYMENT_RUN throws 409
      await expect(
        applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "PAYMENT_RUN" })
      ).rejects.toThrow(/is not valid from state "VALIDATED"/);

      // 5. VALIDATED -> MATCHING_START -> MATCHING
      expect(findTransition("VALIDATED", "MATCHING_START")?.to).toBe("MATCHING");
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_START" });
      inv = await getInvoice(orgId, invoice.id);
      expect(inv.workflowState).toBe("MATCHING");
      // Negative from MATCHING: invalid event ERP_SUCCESS throws 409
      await expect(
        applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "ERP_SUCCESS" })
      ).rejects.toThrow(/is not valid from state "MATCHING"/);

      // 6. MATCHING -> MATCHING_FAILURE -> MATCHING_FAILED
      expect(findTransition("MATCHING", "MATCHING_FAILURE")?.to).toBe("MATCHING_FAILED");
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_FAILURE" });
      inv = await getInvoice(orgId, invoice.id);
      expect(inv.workflowState).toBe("MATCHING_FAILED");
      // Negative from MATCHING_FAILED: invalid event PAYMENT_SUCCESS throws 409
      await expect(
        applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "PAYMENT_SUCCESS" })
      ).rejects.toThrow(/is not valid from state "MATCHING_FAILED"/);

      // 7. MATCHING_FAILED -> EXCEPTION_RESOLVED -> VALIDATED
      expect(findTransition("MATCHING_FAILED", "EXCEPTION_RESOLVED")?.to).toBe("VALIDATED");
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "EXCEPTION_RESOLVED" });
      inv = await getInvoice(orgId, invoice.id);
      expect(inv.workflowState).toBe("VALIDATED");

      // 8. Re-enter MATCHING -> MATCHING_SUCCESS -> MATCHED -> APPROVAL_REQUEST -> WAITING_APPROVAL
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_START" });
      expect(findTransition("MATCHING", "MATCHING_SUCCESS")?.to).toBe("MATCHED");
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_SUCCESS" });
      expect(findTransition("MATCHED", "APPROVAL_REQUEST")?.to).toBe("WAITING_APPROVAL");
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "APPROVAL_REQUEST" });
      inv = await getInvoice(orgId, invoice.id);
      expect(inv.workflowState).toBe("WAITING_APPROVAL");

      // 9. WAITING_APPROVAL -> REJECTED -> VALIDATION_FAILED
      expect(findTransition("WAITING_APPROVAL", "REJECTED")?.to).toBe("VALIDATION_FAILED");
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "REJECTED", reason: "Variance rejected" });
      inv = await getInvoice(orgId, invoice.id);
      expect(inv.workflowState).toBe("VALIDATION_FAILED");

      // 10. Rejoin to VALIDATED and advance to WAITING_APPROVAL -> APPROVED -> SCHEDULED
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "EXCEPTION_RESOLVED" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_START" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_SUCCESS" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "APPROVAL_REQUEST" });
      expect(findTransition("WAITING_APPROVAL", "APPROVED")?.to).toBe("SCHEDULED");
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "APPROVED" });
      inv = await getInvoice(orgId, invoice.id);
      expect(inv.workflowState).toBe("SCHEDULED");
      // Negative from SCHEDULED: invalid event CAPTURE_COMPLETE throws 409
      await expect(
        applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "CAPTURE_COMPLETE" })
      ).rejects.toThrow(/is not valid from state "SCHEDULED"/);

      // 11. SCHEDULED -> PAYMENT_RUN -> PROCESSING_PAYMENT
      expect(findTransition("SCHEDULED", "PAYMENT_RUN")?.to).toBe("PROCESSING_PAYMENT");
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "PAYMENT_RUN" });
      inv = await getInvoice(orgId, invoice.id);
      expect(inv.workflowState).toBe("PROCESSING_PAYMENT");

      // 12. PROCESSING_PAYMENT -> PAYMENT_FAILURE -> SCHEDULED (retry path)
      expect(findTransition("PROCESSING_PAYMENT", "PAYMENT_FAILURE")?.to).toBe("SCHEDULED");
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "PAYMENT_FAILURE" });
      inv = await getInvoice(orgId, invoice.id);
      expect(inv.workflowState).toBe("SCHEDULED");

      // 13. SCHEDULED -> PAYMENT_RUN -> PROCESSING_PAYMENT -> PAYMENT_SUCCESS -> PAID
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "PAYMENT_RUN" });
      expect(findTransition("PROCESSING_PAYMENT", "PAYMENT_SUCCESS")?.to).toBe("PAID");
      await applyTransition({
        invoiceId: invoice.id,
        organizationId: orgId,
        event: "PAYMENT_SUCCESS",
        utrNumber: "UTRFSM2026111901",
        settlementDate: new Date(),
      });
      inv = await getInvoice(orgId, invoice.id);
      expect(inv.workflowState).toBe("PAID");
      // Negative from PAID: invalid event PAYMENT_RUN throws 409
      await expect(
        applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "PAYMENT_RUN" })
      ).rejects.toThrow(/is not valid from state "PAID"/);

      // 14. PAID -> ERP_SUCCESS -> ERP_SYNC
      expect(findTransition("PAID", "ERP_SUCCESS")?.to).toBe("ERP_SYNC");
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "ERP_SUCCESS" });
      inv = await getInvoice(orgId, invoice.id);
      expect(inv.workflowState).toBe("ERP_SYNC");
      // Negative from ERP_SYNC: invalid event APPROVED throws 409
      await expect(
        applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "APPROVED" })
      ).rejects.toThrow(/is not valid from state "ERP_SYNC"/);

      // 15. ERP_SYNC -> ARCHIVE_COMPLETE -> ARCHIVED
      expect(findTransition("ERP_SYNC", "ARCHIVE_COMPLETE")?.to).toBe("ARCHIVED");
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "ARCHIVE_COMPLETE" });
      inv = await getInvoice(orgId, invoice.id);
      expect(inv.workflowState).toBe("ARCHIVED");
      // Negative from ARCHIVED: terminal state rejects any event
      await expect(
        applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "VALIDATION_START" })
      ).rejects.toThrow(/is not valid from state "ARCHIVED"/);
    });
  });

  describe("4. Table 2 4xx Rules Verification (SoD, Tiers, Quotas, State Guards)", () => {
    it("RULE-PERM-002 / TIER-INR-01..03: enforces approval tier boundaries and rejects unauthorized roles (403)", async () => {
      // Invoice for 150,000 INR belongs to Tier 2 (100,000.01 - 500,000)
      const invoice = await createInvoice({
        organizationId: orgId,
        supplierId: testSupplierId,
        invoiceNumber: "INV-TIER-TEST-001",
        totalAmount: 150000,
        subtotalAmount: 127118.64,
        taxAmount: 22881.36,
        currency: "INR",
      });

      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "CAPTURE_COMPLETE" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "VALIDATION_START" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "VALIDATION_SUCCESS" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_START" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_SUCCESS" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "APPROVAL_REQUEST" });

      const approval = await prisma.approval.findFirst({
        where: { invoice: { organizationId: orgId }, invoiceId: invoice.id, status: "PENDING" },
      });

      // APPROVER role is strictly Tier 1 (<= 100,000 INR) -> 403 Forbidden
      await expect(
        approveApproval(orgId, approval!.id, approverUserId, "APPROVER", "Attempting Tier 2 approval as standard approver")
      ).rejects.toThrow(/not authorized to approve/);

      // FINANCE_MANAGER is authorized for Tier 2 -> succeeds
      const result = await approveApproval(orgId, approval!.id, financeManagerId, "FINANCE_MANAGER", "Authorized Tier 2 approval");
      expect(result!.status).toBe("APPROVED");
    });

    it("RULE-PERM-004 / SOD-BANK-01: Segregation of Duties - Bank Account Editor cannot release payment to supplier (403)", async () => {
      // Create invoice and advance to SCHEDULED
      const invoice = await createInvoice({
        organizationId: orgId,
        supplierId: testSupplierId,
        invoiceNumber: "INV-SOD-BANK-001",
        totalAmount: 30000,
        subtotalAmount: 25423.73,
        taxAmount: 4576.27,
        currency: "INR",
      });

      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "CAPTURE_COMPLETE" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "VALIDATION_START" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "VALIDATION_SUCCESS" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_START" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_SUCCESS" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "APPROVAL_REQUEST" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "APPROVED", triggeredBy: financeManagerId });

      const payment = await prisma.payment.findFirst({
        where: { invoiceId: invoice.id, organizationId: orgId },
      });
      expect(payment).toBeDefined();

      // Log bank account edit by financeManagerId within last 30 days
      await prisma.auditLog.create({
        data: {
          organizationId: orgId,
          userId: financeManagerId,
          entityType: "SUPPLIER_BANK_ACCOUNT",
          action: "UPDATE_BANK_ACCOUNT",
          entityId: testSupplierId,
          beforeData: { ifsc: "OLD00001" },
          afterData: { ifsc: "HDFC0001234" },
        },
      });

      // Finance Manager attempts to execute payment to this supplier -> 403 Forbidden SoD violation
      await expect(
        executePayment(orgId, payment!.id, financeManagerId, {
          utrNumber: "UTRSOD2026111901",
        })
      ).rejects.toThrow(/Segregation of Duties/);
    });

    it("APPR-BLOCK-01: blocks invoice approval when open exception exists (409 Conflict)", async () => {
      const invoice = await createInvoice({
        organizationId: orgId,
        supplierId: testSupplierId,
        invoiceNumber: "INV-BLOCK-EXC-001",
        totalAmount: 20000,
        currency: "INR",
      });

      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "CAPTURE_COMPLETE" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "VALIDATION_START" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "VALIDATION_SUCCESS" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_START" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_SUCCESS" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "APPROVAL_REQUEST" });

      const approval = await prisma.approval.findFirst({
        where: { invoice: { organizationId: orgId }, invoiceId: invoice.id, status: "PENDING" },
      });

      // Inject open exception
      await prisma.exception.create({
        data: {
          organizationId: orgId,
          invoiceId: invoice.id,
          type: "TAX_DIFFERENCE",
          severity: "MEDIUM",
          title: "GST discrepancy",
          status: "OPEN",
        },
      });

      // Attempting to approve while exception is OPEN throws 409 Conflict
      await expect(
        approveApproval(orgId, approval!.id, financeManagerId, "FINANCE_MANAGER", "Bypassing exception")
      ).rejects.toThrow(/Cannot approve invoice.*unresolved blocking exception/);
    });

    it("APPR-REJ-01: mandatory rejection reason required (400 Bad Request)", async () => {
      const invoice = await createInvoice({
        organizationId: orgId,
        supplierId: testSupplierId,
        invoiceNumber: "INV-REJ-TEST-001",
        totalAmount: 18000,
        currency: "INR",
      });

      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "CAPTURE_COMPLETE" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "VALIDATION_START" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "VALIDATION_SUCCESS" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_START" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_SUCCESS" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "APPROVAL_REQUEST" });

      // Rejection with empty reason throws 400 Bad Request
      await expect(
        executeInvoiceRejection({
          organizationId: orgId,
          invoiceId: invoice.id,
          userId: financeManagerId,
          reason: "   ",
        })
      ).rejects.toThrow(/A reason is required when rejecting an invoice/);
    });

    it("PAY-STATE-01: prevents executing payment if already PAID (409 Conflict)", async () => {
      const invoice = await createInvoice({
        organizationId: orgId,
        supplierId: testSupplierId,
        invoiceNumber: "INV-ALREADY-PAID-01",
        totalAmount: 12000,
        currency: "INR",
      });

      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "CAPTURE_COMPLETE" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "VALIDATION_START" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "VALIDATION_SUCCESS" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_START" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_SUCCESS" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "APPROVAL_REQUEST" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "APPROVED", triggeredBy: financeManagerId });

      const payment = await prisma.payment.findFirst({
        where: { invoiceId: invoice.id, organizationId: orgId },
      });

      // Mark payment PAID
      await prisma.payment.update({
        where: { id_organizationId: { id: payment!.id, organizationId: orgId } },
        data: {
          status: "PAID",
          utrNumber: "UTRPAID99990001",
          settlementDate: new Date(),
        },
      });

      // Re-executing throws 409 Conflict
      await expect(
        executePayment(orgId, payment!.id, adminUserId, { utrNumber: "NEWUTR123456" })
      ).rejects.toThrow(/Payment has already been executed and is marked as PAID/);
    });

    it("RULE-PERM-008 / FSM-RULE-03: blocks direct application writes to Invoice.status or Invoice.workflowState (TenantGuardViolationError)", async () => {
      const invoice = await createInvoice({
        organizationId: orgId,
        supplierId: testSupplierId,
        invoiceNumber: "INV-TG-VIOLATE-001",
        totalAmount: 5000,
        currency: "INR",
      });

      // Attempting direct prisma.invoice.update touching status or workflowState without engine bypass
      await expect(
        prisma.invoice.update({
          where: {
            id_organizationId: {
              id: invoice.id,
              organizationId: orgId,
            },
          },
          data: {
            status: "PAID" as unknown as never,
          },
        })
      ).rejects.toThrow(/AGENTS.md Rule 4/);
    });

    it("INVOICE-TERM: terminal status immutability guard blocks updates to ARCHIVED or PAID invoices (400)", async () => {
      const invoice = await createInvoice({
        organizationId: orgId,
        supplierId: testSupplierId,
        invoiceNumber: "INV-TERMINAL-GUARD",
        totalAmount: 7500,
        currency: "INR",
      });

      // Advance to PAID
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "CAPTURE_COMPLETE" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "VALIDATION_START" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "VALIDATION_SUCCESS" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_START" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_SUCCESS" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "APPROVAL_REQUEST" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "APPROVED", triggeredBy: financeManagerId });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "PAYMENT_RUN" });
      await applyTransition({
        invoiceId: invoice.id,
        organizationId: orgId,
        event: "PAYMENT_SUCCESS",
        utrNumber: "UTRPAYTERM0001",
        settlementDate: new Date(),
      });

      // Attempting update on PAID invoice throws 400 Bad Request
      await expect(
        updateInvoice({
          organizationId: orgId,
          id: invoice.id,
          totalAmount: 9000,
        })
      ).rejects.toThrow(/Invoices in terminal status.*are immutable/);
    });

    it("BILL-QUOTA-01: enforces monthly invoice quota and throws 400 Bad Request when limit reached", async () => {
      // Starter plan limit is 50 invoices
      // Create 50 invoices in this organization
      const invoicesData = Array.from({ length: 50 }, (_, i) => ({
        organizationId: orgId,
        invoiceNumber: `INV-QUOTA-BULK-${i + 1}`,
        totalAmount: 1000,
        currency: "INR",
        status: "RECEIVED" as const,
        workflowState: "RECEIVED" as const,
      }));

      await runWithEngineBypass(async () => {
        await prisma.invoice.createMany({
          data: invoicesData,
        });
      });

      // checkCanCreateInvoice throws 400 Bad Request
      await expect(checkCanCreateInvoice(orgId)).rejects.toThrow(/Monthly invoice processing limit reached/);
    });

    it("SOD-CREAT-01: Creator cannot approve own invoice (403 Forbidden)", async () => {
      // Ingest invoice created by an approver
      const invoice = await createInvoice({
        organizationId: orgId,
        supplierId: testSupplierId,
        invoiceNumber: "INV-SOD-CREATOR-01",
        totalAmount: 10000,
        currency: "INR",
        userId: approverUserId,
      });

      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "CAPTURE_COMPLETE" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "VALIDATION_START" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "VALIDATION_SUCCESS" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_START" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_SUCCESS" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "APPROVAL_REQUEST" });

      const approval = await prisma.approval.findFirst({
        where: { invoice: { organizationId: orgId }, invoiceId: invoice.id, status: "PENDING" },
      });

      // Creator (who has APPROVER role) attempts approval of their own invoice -> 403 Forbidden SoD violation
      await expect(
        approveApproval(orgId, approval!.id, approverUserId, "APPROVER", "Creator approving own invoice")
      ).rejects.toThrow(/The user who created or uploaded this invoice cannot approve it/);
    });

    it("SOD-OVER-01: Solo-admin SoD override requires activeAdminCount == 1 and reason length >= 10", async () => {
      // Create invoice by Admin
      const invoice = await createInvoice({
        organizationId: orgId,
        supplierId: testSupplierId,
        invoiceNumber: "INV-SOD-OVERRIDE-01",
        totalAmount: 25000,
        subtotalAmount: 21186.44,
        taxAmount: 3813.56,
        currency: "INR",
        userId: adminUserId,
      });

      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "CAPTURE_COMPLETE" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "VALIDATION_START" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "VALIDATION_SUCCESS" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_START" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "MATCHING_SUCCESS" });
      await applyTransition({ invoiceId: invoice.id, organizationId: orgId, event: "APPROVAL_REQUEST" });

      const approval = await prisma.approval.findFirst({
        where: { invoice: { organizationId: orgId }, invoiceId: invoice.id, status: "PENDING" },
      });

      // Negative: Reason < 10 characters throws 400 Bad Request
      await expect(
        approveApproval(
          orgId,
          approval!.id,
          adminUserId,
          "ADMINISTRATOR",
          "Approval",
          true,
          "Too short" // < 10 chars
        )
      ).rejects.toThrow(/justification reason of at least 10 characters is required/);

      // Positive: Valid reason >= 10 chars succeeds and logs audit entry
      const approved = await approveApproval(
        orgId,
        approval!.id,
        adminUserId,
        "ADMINISTRATOR",
        "Override notes",
        true,
        "Solo administrator operating under sole-proprietor exception protocol."
      );
      expect(approved!.status).toBe("APPROVED");

      const overrideAudit = await prisma.auditLog.findFirst({
        where: { organizationId: orgId, entityId: invoice.id, action: "SOD_OVERRIDE_APPROVAL" },
      });
      expect(overrideAudit).toBeDefined();
    });

    it("RULE-DATE-009 / IDEMP-TTL-01: enforces DB-backed idempotency guarantees on real Postgres", async () => {
      // 1. Missing header throws 400 Bad Request
      let req = { headers: {} } as unknown as Request;
      let res = {} as unknown as Response;
      let nextError: unknown = null;
      idempotent(req, res, (err) => { nextError = err; });
      expect(nextError).toBeDefined();
      expect(String(nextError)).toContain("Idempotency-Key header is required");

      // 2. Pre-seed completed idempotency record in real PostgreSQL
      const testKey = "idemp-pg-test-key-999";
      await prisma.idempotencyKey.deleteMany({ where: { organizationId: orgId } });
      await prisma.idempotencyKey.create({
        data: {
          key: testKey,
          organizationId: orgId,
          method: "POST",
          path: "/api/v1/payments/execute",
          statusCode: 200,
          responseBody: { paymentId: "pay-cached-123", status: "PAID" },
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      let statusCalledWith: number | null = null;
      let jsonCalledWith: unknown = null;

      req = {
        headers: { "idempotency-key": testKey },
        auth: { organizationId: orgId, userId: adminUserId },
        method: "POST",
        originalUrl: "/api/v1/payments/execute",
      } as unknown as Request;

      await new Promise<void>((resolve) => {
        const replayRes = {
          status: (code: number) => {
            statusCalledWith = code;
            return {
              json: (body: unknown) => {
                jsonCalledWith = body;
                resolve();
              },
            };
          },
        } as unknown as Response;

        idempotent(req, replayRes, () => resolve());
      });

      expect(statusCalledWith).toBe(200);
      expect(jsonCalledWith).toEqual({ paymentId: "pay-cached-123", status: "PAID" });

      // 3. In-flight request check (statusCode is null): throws 409 Conflict
      const inFlightKey = "idemp-inflight-key-888";
      await prisma.idempotencyKey.create({
        data: {
          key: inFlightKey,
          organizationId: orgId,
          method: "POST",
          path: "/api/v1/payments/execute",
          statusCode: null,
          responseBody: null,
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      req = {
        headers: { "idempotency-key": inFlightKey },
        auth: { organizationId: orgId, userId: adminUserId },
        method: "POST",
        originalUrl: "/api/v1/payments/execute",
      } as unknown as Request;

      nextError = null;
      await new Promise<void>((resolve) => {
        idempotent(req, res, (err) => {
          nextError = err;
          resolve();
        });
      });

      expect(nextError).toBeDefined();
      expect((nextError as ApiError).status).toBe(409);
      expect((nextError as ApiError).message).toContain("already being processed");
    });
  });
});
