import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning existing ClearOps database tables...");

  // Dependency-ordered clean table wipe inside transaction
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.workflowTransition.deleteMany(),
    prisma.workflowInstance.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.approval.deleteMany(),
    prisma.exception.deleteMany(),
    prisma.validation.deleteMany(),
    prisma.document.deleteMany(),
    prisma.invoiceLine.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.purchaseOrder.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.user.deleteMany(),
    prisma.organization.deleteMany(),
  ]);

  console.log("Seeding fresh ClearOps AP Workspace dataset...");

  // 1. Organization
  const org = await prisma.organization.create({
    data: {
      name: "Acme Manufacturing Pvt Ltd",
      legalName: "Acme Manufacturing Private Limited",
      country: "IN",
      defaultCurrency: "INR",
      timezone: "Asia/Kolkata",
    },
  });

  // 2. Canonical Users (4 Roles)
  const passwordHash = await bcrypt.hash("password123", 10);

  const [adminUser, managerUser, executiveUser, approverUser] = await Promise.all([
    prisma.user.create({
      data: {
        organizationId: org.id,
        email: "admin@avarta.dev",
        passwordHash,
        fullName: "Asha Administrator",
        role: "ADMINISTRATOR",
      },
    }),
    prisma.user.create({
      data: {
        organizationId: org.id,
        email: "manager@avarta.dev",
        passwordHash,
        fullName: "Manav Manager",
        role: "FINANCE_MANAGER",
      },
    }),
    prisma.user.create({
      data: {
        organizationId: org.id,
        email: "executive@avarta.dev",
        passwordHash,
        fullName: "Esha Executive",
        role: "FINANCE_EXECUTIVE",
      },
    }),
    prisma.user.create({
      data: {
        organizationId: org.id,
        email: "approver@avarta.dev",
        passwordHash,
        fullName: "Arjun Approver",
        role: "APPROVER",
      },
    }),
  ]);

  // 3. Suppliers (8 Vendors — recognizable industry names across INR, USD, EUR, GBP, CAD)
  const supplierData = [
    { code: "SUP-001", legal: "Tata Steel Ltd", display: "Tata Steel", gst: "27AABCT1234A1ZP", country: "IN", currency: "INR", terms: 30, status: "ACTIVE", balance: 1188000, email: "vendor.payments@tatasteel.com", phone: "+91-22-6665-8282", address: "Bombay House, Fort, Mumbai 400001" },
    { code: "SUP-002", legal: "BlueDart Express Ltd", display: "BlueDart Express", gst: "29AABCB5678B2ZQ", country: "IN", currency: "INR", terms: 15, status: "ACTIVE", balance: 145700, email: "invoicing@bluedart.com", phone: "+91-22-2839-6444", address: "Blue Dart Centre, Sahar Airport Rd, Mumbai 400099" },
    { code: "SUP-003", legal: "Amazon Business India Pvt Ltd", display: "Amazon Business", gst: "07AABCA9012C3ZR", country: "IN", currency: "INR", terms: 30, status: "ACTIVE", balance: 20900, email: "business-billing@amazon.in", phone: "+91-80-4603-9000", address: "World Trade Center, Brigade Gateway, Bangalore 560055" },
    { code: "SUP-004", legal: "Dell Technologies Inc", display: "Dell Technologies", gst: null, country: "US", currency: "USD", terms: 45, status: "ACTIVE", balance: 16700, email: "ar-team@dell.com", phone: "+1-800-624-9897", address: "One Dell Way, Round Rock, TX 78682" },
    { code: "SUP-005", legal: "Siemens AG", display: "Siemens AG", gst: null, country: "DE", currency: "EUR", terms: 30, status: "ACTIVE", balance: 6400, email: "invoicing@siemens.com", phone: "+49-89-636-00", address: "Werner-von-Siemens-Str. 1, 80333 Munich" },
    { code: "SUP-006", legal: "Maersk Line India Pvt Ltd", display: "Maersk Line", gst: "33AABCM4321D1ZS", country: "IN", currency: "INR", terms: 15, status: "BLOCKED", balance: 92000, email: "india.finance@maersk.com", phone: "+91-44-4222-3333", address: "Maersk House, Nungambakkam, Chennai 600034" },
    { code: "SUP-007", legal: "FedEx International", display: "FedEx International", gst: null, country: "GB", currency: "GBP", terms: 30, status: "ACTIVE", balance: 1850, email: "billing.emea@fedex.com", phone: "+44-20-7660-0500", address: "FedEx House, Feltham, Middlesex TW14 8EE" },
    { code: "SUP-008", legal: "Salesforce Inc", display: "Salesforce", gst: null, country: "CA", currency: "CAD", terms: 30, status: "ACTIVE", balance: 3100, email: "ar@salesforce.com", phone: "+1-415-901-7000", address: "Salesforce Tower, 415 Mission St, San Francisco, CA 94105" },
  ];

  const suppliers: Record<string, string> = {};
  for (const s of supplierData) {
    const created = await prisma.supplier.create({
      data: {
        organizationId: org.id,
        supplierCode: s.code,
        legalName: s.legal,
        displayName: s.display,
        gstNumber: s.gst,
        country: s.country,
        currency: s.currency,
        paymentTermsDays: s.terms,
        status: s.status as unknown as never,
        outstandingBalance: s.balance,
        email: s.email,
        phone: s.phone,
        address: s.address,
      },
    });
    suppliers[s.code] = created.id;
  }

  // 4. Purchase Orders (5 Reconciled POs)
  const poData = [
    { poNumber: "PO-FY26-0142", supCode: "SUP-001", currency: "INR", total: 500000, utilized: 500000, remaining: 0, status: "OPEN", matchStatus: "MATCHED" },
    { poNumber: "PO-FY26-0143", supCode: "SUP-002", currency: "INR", total: 150000, utilized: 127500, remaining: 22500, status: "OPEN", matchStatus: "PARTIAL" },
    { poNumber: "PO-FY26-0881", supCode: "SUP-004", currency: "USD", total: 25000, utilized: 16700, remaining: 8300, status: "OPEN", matchStatus: "PARTIAL" },
    { poNumber: "PO-FY26-0902", supCode: "SUP-005", currency: "EUR", total: 18000, utilized: 6400, remaining: 11600, status: "OPEN", matchStatus: "PARTIAL" },
    { poNumber: "PO-FY26-0990", supCode: "SUP-006", currency: "INR", total: 300000, utilized: 0, remaining: 300000, status: "OPEN", matchStatus: "UNMATCHED" },
  ];

  const purchaseOrders: Record<string, string> = {};
  for (const po of poData) {
    const created = await prisma.purchaseOrder.create({
      data: {
        organizationId: org.id,
        supplierId: suppliers[po.supCode],
        poNumber: po.poNumber,
        currency: po.currency,
        totalAmount: po.total,
        utilizedAmount: po.utilized,
        remainingAmount: po.remaining,
        status: po.status,
        matchingStatus: po.matchStatus,
        issueDate: new Date("2026-01-15"),
      },
    });
    purchaseOrders[po.poNumber] = created.id;
  }

  // 5. Invoices (17 Invoices covering 14 Workflow Scenes)
  const now = new Date();

  function addDays(days: number) {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d;
  }

  // Line item templates per supplier for realistic demo content
  const lineItems: Record<string, { description: string; quantity: number; unitPrice: number }[]> = {
    "SUP-001": [
      { description: "Hot-Rolled Steel Coil (3mm)", quantity: 200, unitPrice: 580 },
      { description: "Cold-Rolled Sheet (1.2mm)", quantity: 150, unitPrice: 420 },
      { description: "Transportation & Handling Charges", quantity: 1, unitPrice: 8500 },
    ],
    "SUP-002": [
      { description: "Surface Cargo — Mumbai to Delhi (500kg)", quantity: 4, unitPrice: 3200 },
      { description: "Express Air Shipment — BOM-BLR", quantity: 2, unitPrice: 8750 },
      { description: "Packaging & Insurance Surcharge", quantity: 1, unitPrice: 2300 },
    ],
    "SUP-003": [
      { description: "HP LaserJet Pro MFP M428 Printer", quantity: 3, unitPrice: 1800 },
      { description: "A4 Copy Paper (5-Ream Box)", quantity: 20, unitPrice: 145 },
      { description: "Delivery & Setup Charges", quantity: 1, unitPrice: 500 },
    ],
    "SUP-004": [
      { description: "Dell PowerEdge R750 Rack Server", quantity: 2, unitPrice: 4850 },
      { description: "Dell 27\" UltraSharp Monitor U2723QE", quantity: 8, unitPrice: 589 },
      { description: "Dell ProSupport Plus (3yr, per unit)", quantity: 2, unitPrice: 1200 },
      { description: "International Freight & Customs", quantity: 1, unitPrice: 420 },
    ],
    "SUP-005": [
      { description: "Siemens SIMATIC S7-1500 PLC Module", quantity: 5, unitPrice: 890 },
      { description: "HMI Touch Panel KTP700", quantity: 3, unitPrice: 645 },
    ],
    "SUP-006": [
      { description: "40ft Container FCL — Chennai to Rotterdam", quantity: 2, unitPrice: 28000 },
      { description: "Port Handling & Documentation", quantity: 1, unitPrice: 12000 },
      { description: "Marine Cargo Insurance Premium", quantity: 1, unitPrice: 24000 },
    ],
    "SUP-007": [
      { description: "FedEx International Priority (10kg)", quantity: 3, unitPrice: 385 },
      { description: "Customs Clearance Fee — UK Import", quantity: 1, unitPrice: 245 },
      { description: "Saturday Delivery Surcharge", quantity: 2, unitPrice: 175 },
    ],
    "SUP-008": [
      { description: "Salesforce Sales Cloud — Enterprise (annual)", quantity: 25, unitPrice: 75 },
      { description: "Salesforce Service Cloud — Professional", quantity: 10, unitPrice: 55 },
      { description: "Implementation Support Package", quantity: 1, unitPrice: 225 },
    ],
  };

  const invoiceSeedList = [
    {
      num: "INV-2026-0900",
      supCode: "SUP-001",
      poNum: null,
      currency: "INR",
      amount: 236000,
      paid: 236000,
      wfState: "PAID",
      status: "PAID",
      source: "UPLOAD",
      confidence: 99.0,
      daysDue: -15,
      doc: { file: "Tata-Steel-INV-2026-0900.pdf", mime: "application/pdf", size: 245120 },
    },
    {
      num: "INV-2026-1001",
      supCode: "SUP-001",
      poNum: "PO-FY26-0142",
      currency: "INR",
      amount: 146000,
      paid: 0,
      wfState: "RECEIVED",
      status: "RECEIVED",
      source: "UPLOAD",
      confidence: 95.0,
      daysDue: 25,
      doc: { file: "Tata-Steel-INV-2026-1001.pdf", mime: "application/pdf", size: 182400 },
    },
    {
      num: "INV-2026-1002",
      supCode: "SUP-002",
      poNum: "PO-FY26-0143",
      currency: "INR",
      amount: 42500,
      paid: 0,
      wfState: "CAPTURED",
      status: "PROCESSING",
      source: "PORTAL",
      confidence: 92.5,
      daysDue: 14,
    },
    {
      num: "INV-2026-1003",
      supCode: "SUP-003",
      poNum: null,
      currency: "INR",
      amount: 8600,
      paid: 0,
      wfState: "VALIDATION_FAILED",
      status: "EXCEPTION",
      source: "EMAIL",
      confidence: 96.0,
      daysDue: -4,
      exception: {
        type: "MISSING_PO",
        severity: "HIGH",
        title: "Missing Purchase Order",
        desc: "Invoice exceeds policy threshold (INR 5,000) but has no linked PO.",
        assignedTo: managerUser.id,
      },
    },
    {
      num: "INV-2026-1004",
      supCode: "SUP-001",
      poNum: null,
      currency: "INR",
      amount: 236000,
      paid: 0,
      wfState: "VALIDATION_FAILED",
      status: "EXCEPTION",
      source: "UPLOAD",
      confidence: 98.0,
      daysDue: 30,
      exception: {
        type: "DUPLICATE_INVOICE",
        severity: "HIGH",
        title: "Duplicate Invoice Detected",
        desc: "Invoice number and amount match existing paid invoice INV-2026-0900.",
        assignedTo: executiveUser.id,
      },
    },
    {
      num: "INV-2026-1005",
      supCode: null,
      poNum: null,
      currency: "INR",
      amount: 15400,
      paid: 0,
      wfState: "VALIDATION_FAILED",
      status: "EXCEPTION",
      source: "SCANNER",
      confidence: 88.0,
      daysDue: -1,
      exception: {
        type: "UNKNOWN_VENDOR",
        severity: "HIGH",
        title: "Unknown Vendor / Unlinked Supplier",
        desc: "Vendor name on invoice document could not be matched to master record.",
        assignedTo: managerUser.id,
      },
    },
    {
      num: "INV-2026-1006",
      supCode: "SUP-004",
      poNum: "PO-FY26-0881",
      currency: "USD",
      amount: 4200,
      paid: 0,
      wfState: "VALIDATION_FAILED",
      status: "EXCEPTION",
      source: "MOBILE",
      confidence: 68.5,
      daysDue: 20,
      exception: {
        type: "LOW_AI_CONFIDENCE",
        severity: "MEDIUM",
        title: "Low AI Confidence Extraction",
        desc: "Extraction confidence (68.5%) is below automated threshold (80.0%).",
        assignedTo: executiveUser.id,
      },
    },
    {
      num: "INV-2026-1007",
      supCode: "SUP-001",
      poNum: "PO-FY26-0142",
      currency: "INR",
      amount: 354000,
      paid: 0,
      wfState: "WAITING_APPROVAL",
      status: "PENDING_APPROVAL",
      source: "PORTAL",
      confidence: 98.5,
      daysDue: 18,
      approval: { approverId: approverUser.id, status: "PENDING" },
    },
    {
      num: "INV-2026-1008",
      supCode: "SUP-004",
      poNum: "PO-FY26-0881",
      currency: "USD",
      amount: 12500,
      paid: 0,
      wfState: "WAITING_APPROVAL",
      status: "PENDING_APPROVAL",
      source: "API",
      confidence: 97.0,
      daysDue: 35,
      approval: { approverId: approverUser.id, status: "PENDING" },
    },
    {
      num: "INV-2026-1009",
      supCode: "SUP-002",
      poNum: "PO-FY26-0143",
      currency: "INR",
      amount: 85000,
      paid: 0,
      wfState: "SCHEDULED",
      status: "SCHEDULED",
      source: "EDI",
      confidence: 99.0,
      daysDue: 5,
      payment: { status: "SCHEDULED", method: "BANK_TRANSFER", date: addDays(4) },
    },
    {
      num: "INV-2026-1010",
      supCode: "SUP-005",
      poNum: "PO-FY26-0902",
      currency: "EUR",
      amount: 6400,
      paid: 0,
      wfState: "SCHEDULED",
      status: "SCHEDULED",
      source: "PORTAL",
      confidence: 97.5,
      daysDue: 12,
      payment: { status: "SCHEDULED", method: "SEPA_TRANSFER", date: addDays(10) },
    },
    {
      num: "INV-2026-1011",
      supCode: "SUP-003",
      poNum: null,
      currency: "INR",
      amount: 12300,
      paid: 12300,
      wfState: "PAID",
      status: "PAID",
      source: "PORTAL",
      confidence: 99.0,
      daysDue: -5,
      payment: { status: "PAID", method: "UPI_CORPORATE", date: addDays(-6), ref: "PAY-2026-8891" },
    },
    {
      num: "INV-2026-1012",
      supCode: "SUP-001",
      poNum: null,
      currency: "INR",
      amount: 450000,
      paid: 450000,
      wfState: "ERP_SYNC",
      status: "SYNCED",
      source: "ERP",
      confidence: 100.0,
      daysDue: -20,
    },
    {
      num: "INV-2026-0999",
      supCode: "SUP-002",
      poNum: null,
      currency: "INR",
      amount: 18200,
      paid: 18200,
      wfState: "ARCHIVED",
      status: "ARCHIVED",
      source: "UPLOAD",
      confidence: 98.0,
      daysDue: -45,
    },
    {
      num: "INV-2026-1014",
      supCode: "SUP-006",
      poNum: null,
      currency: "INR",
      amount: 92000,
      paid: 0,
      wfState: "VALIDATION_FAILED",
      status: "REJECTED",
      source: "UPLOAD",
      confidence: 91.0,
      daysDue: 15,
      approval: { approverId: approverUser.id, status: "REJECTED", comment: "Vendor is blocked in ERP supplier master." },
    },
    {
      num: "INV-2026-1015",
      supCode: "SUP-007",
      poNum: null,
      currency: "GBP",
      amount: 1850,
      paid: 0,
      wfState: "RECEIVED",
      status: "RECEIVED",
      source: "EMAIL",
      confidence: 94.0,
      daysDue: 28,
    },
    {
      num: "INV-2026-1016",
      supCode: "SUP-008",
      poNum: null,
      currency: "CAD",
      amount: 3100,
      paid: 0,
      wfState: "RECEIVED",
      status: "RECEIVED",
      source: "PORTAL",
      confidence: 96.0,
      daysDue: 30,
    },
  ];

  for (const item of invoiceSeedList) {
    const inv = await prisma.invoice.create({
      data: {
        organizationId: org.id,
        supplierId: item.supCode ? suppliers[item.supCode] : null,
        purchaseOrderId: item.poNum ? purchaseOrders[item.poNum] : null,
        assignedToId: item.exception?.assignedTo ?? null,
        invoiceNumber: item.num,
        invoiceDate: addDays(-5),
        dueDate: addDays(item.daysDue),
        currency: item.currency,
        subtotalAmount: item.amount * 0.85,
        taxAmount: item.amount * 0.15,
        totalAmount: item.amount,
        paidAmount: item.paid,
        status: item.status as unknown as never,
        workflowState: item.wfState as unknown as never,
        source: item.source as unknown as never,
        aiConfidence: item.confidence,
        workflowInstance: {
          create: {
            currentState: item.wfState as unknown as never,
            completedAt: item.wfState === "ARCHIVED" ? addDays(-40) : null,
          },
        },
      },
    });

    // Supplier line items template
    const supplierLines = item.supCode ? lineItems[item.supCode] : null;

    // Workflow transition records & Chronological Audit Logs
    const instance = await prisma.workflowInstance.findUnique({ where: { invoiceId: inv.id } });

    // Build progressive workflow transitions and audit trail
    const stageTimeline: Array<{
      state: string;
      action: string;
      event: string;
      user: string;
      date: Date;
      data: Record<string, unknown>;
    }> = [];

    // Stage 1: Intake
    const intakeDate = addDays(-8);
    stageTimeline.push({
      state: "RECEIVED",
      action: "INVOICE_RECEIVED",
      event: "INVOICE_RECEIVED",
      user: executiveUser.id,
      date: intakeDate,
      data: { source: item.source, invoiceNumber: item.num, totalAmount: item.amount, currency: item.currency },
    });

    const isAfterReceived = item.wfState !== "RECEIVED";
    if (isAfterReceived) {
      // Stage 2: Capture / OCR
      const captureDate = new Date(intakeDate.getTime() + 1000 * 60 * 3);
      stageTimeline.push({
        state: "CAPTURED",
        action: "DOCUMENT_OCR_COMPLETED",
        event: "CAPTURE_COMPLETE",
        user: managerUser.id,
        date: captureDate,
        data: { confidence: item.confidence, extractedLines: supplierLines?.length || 2 },
      });
    }

    const isAfterCaptured = isAfterReceived && item.wfState !== "CAPTURED";
    if (isAfterCaptured) {
      // Stage 3: Validation
      const valDate = new Date(intakeDate.getTime() + 1000 * 60 * 8);
      const isValFailed = item.wfState === "VALIDATION_FAILED";
      stageTimeline.push({
        state: isValFailed ? "VALIDATION_FAILED" : "VALIDATED",
        action: isValFailed ? "VALIDATION_FLAGGED" : "VALIDATION_PASSED",
        event: isValFailed ? "VALIDATION_FAILED" : "VALIDATION_PASSED",
        user: managerUser.id,
        date: valDate,
        data: { status: isValFailed ? "FAILED" : "PASSED", checks: ["GST_CHECKSUM", "MATH_ARITHMETIC", "VENDOR_MASTER"] },
      });
    }

    const isAfterValidated = isAfterCaptured && item.wfState !== "VALIDATION_FAILED" && item.wfState !== "VALIDATED";
    if (isAfterValidated) {
      // Stage 4: Matching
      const matchDate = new Date(intakeDate.getTime() + 1000 * 60 * 15);
      const isMatchFailed = item.wfState === "MATCHING_FAILED";
      stageTimeline.push({
        state: isMatchFailed ? "MATCHING_FAILED" : "MATCHED",
        action: item.poNum ? (isMatchFailed ? "PO_MATCH_FAILED" : "PO_3WAY_MATCHED") : "DIRECT_EXPENSE_APPROVED",
        event: isMatchFailed ? "MATCHING_FAILED" : "MATCHING_COMPLETE",
        user: managerUser.id,
        date: matchDate,
        data: { poNumber: item.poNum || "NON_PO", variance: isMatchFailed ? "QTY_MISMATCH" : "NONE" },
      });
    }

    const isAfterMatched = isAfterValidated && item.wfState !== "MATCHING_FAILED" && item.wfState !== "MATCHED";
    if (isAfterMatched) {
      // Stage 5: Approval
      const appDate = addDays(-3);
      const isRejected = item.status === "REJECTED";
      stageTimeline.push({
        state: "WAITING_APPROVAL",
        action: isRejected ? "INVOICE_REJECTED" : (item.wfState === "WAITING_APPROVAL" ? "APPROVAL_REQUESTED" : "INVOICE_APPROVED"),
        event: isRejected ? "REJECT" : (item.wfState === "WAITING_APPROVAL" ? "ROUTED_FOR_APPROVAL" : "APPROVE"),
        user: approverUser.id,
        date: appDate,
        data: {
          approver: approverUser.fullName,
          status: isRejected ? "REJECTED" : (item.wfState === "WAITING_APPROVAL" ? "PENDING" : "APPROVED"),
          notes: isRejected ? "Vendor blocked in master ledger" : "Authorized for settlement release",
        },
      });
    }

    const isAfterApproved = isAfterMatched && item.wfState !== "WAITING_APPROVAL" && item.status !== "REJECTED";
    if (isAfterApproved) {
      // Stage 6: Payment Scheduling / Settlement
      const schedDate = addDays(-2);
      stageTimeline.push({
        state: item.wfState === "SCHEDULED" ? "SCHEDULED" : "PAID",
        action: item.wfState === "SCHEDULED" ? "PAYMENT_SCHEDULED" : "PAYMENT_SETTLED",
        event: item.wfState === "SCHEDULED" ? "PAYMENT_SCHEDULED" : "PAYMENT_CONFIRMED",
        user: managerUser.id,
        date: schedDate,
        data: {
          method: item.payment?.method || "BANK_TRANSFER",
          reference: item.payment?.ref || "PAY-2026-8891",
          amount: item.amount,
          currency: item.currency,
        },
      });
    }

    const isSyncedOrArchived = item.wfState === "ERP_SYNC" || item.wfState === "ARCHIVED";
    if (isSyncedOrArchived) {
      // Stage 7: ERP Sync
      const syncDate = addDays(-1);
      stageTimeline.push({
        state: "ERP_SYNC",
        action: "ERP_POSTED",
        event: "ERP_SYNC_COMPLETE",
        user: adminUser.id,
        date: syncDate,
        data: { target: "SAP_S4HANA", glPosting: "POSTED", documentNumber: `GL-${item.num}` },
      });
    }

    if (item.wfState === "ARCHIVED") {
      // Stage 8: Archive
      stageTimeline.push({
        state: "ARCHIVED",
        action: "INVOICE_ARCHIVED",
        event: "ARCHIVE_COMPLETE",
        user: adminUser.id,
        date: new Date(),
        data: { retentionYears: 7, policy: "COMPLIANCE_ARCHIVE" },
      });
    }

    // Now insert workflow transitions and audit logs for this invoice
    for (let i = 0; i < stageTimeline.length; i++) {
      const step = stageTimeline[i];
      if (instance && i > 0) {
        await prisma.workflowTransition.create({
          data: {
            workflowInstanceId: instance.id,
            fromState: stageTimeline[i - 1].state,
            toState: step.state,
            event: step.event,
            triggeredBy: step.user,
            createdAt: step.date,
          },
        });
      }

      await prisma.auditLog.create({
        data: {
          organizationId: org.id,
          userId: step.user,
          action: step.action,
          entityType: "invoice",
          entityId: inv.id,
          afterData: step.data,
          createdAt: step.date,
        },
      });
    }

    // Attach Document
    if (item.doc) {
      await prisma.document.create({
        data: {
          invoiceId: inv.id,
          fileName: item.doc.file,
          mimeType: item.doc.mime,
          storageKey: item.doc.file,
          fileSize: item.doc.size,
          ocrStatus: "COMPLETED",
          extractionStatus: "COMPLETED",
        },
      });
    }

    // Attach Line Items (2–4 per invoice from supplier template)
    if (supplierLines) {
      for (let li = 0; li < supplierLines.length; li++) {
        const line = supplierLines[li];
        const taxAmt = line.quantity * line.unitPrice * 0.18; // 18% GST
        await prisma.invoiceLine.create({
          data: {
            invoiceId: inv.id,
            lineNumber: li + 1,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            taxAmount: taxAmt,
            lineAmount: line.quantity * line.unitPrice + taxAmt,
          },
        });
      }
    }

    // Attach Exception
    if (item.exception) {
      await prisma.exception.create({
        data: {
          organizationId: org.id,
          invoiceId: inv.id,
          assignedToId: item.exception.assignedTo,
          type: item.exception.type as unknown as never,
          severity: item.exception.severity as unknown as never,
          title: item.exception.title,
          description: item.exception.desc,
          status: "OPEN",
        },
      });
    }

    // Attach Approval
    if (item.approval) {
      await prisma.approval.create({
        data: {
          invoiceId: inv.id,
          approverId: item.approval.approverId,
          status: item.approval.status as unknown as never,
          comment: item.approval.comment ?? null,
          requestedAt: addDays(-3),
          respondedAt: item.approval.status !== "PENDING" ? addDays(-1) : null,
        },
      });
    }

    // Attach Payment
    if (item.payment) {
      await prisma.payment.create({
        data: {
          organizationId: org.id,
          invoiceId: inv.id,
          paymentReference: item.payment.ref ?? null,
          amount: item.amount,
          currency: item.currency,
          paymentMethod: item.payment.method,
          scheduledDate: item.payment.date,
          processedAt: item.payment.status === "PAID" ? item.payment.date : null,
          status: item.payment.status as unknown as never,
        },
      });
    }
  }

  console.log("-------------------------------------------------------");
  console.log("Avarta Seed Refresh Completed Successfully!");
  console.log("-------------------------------------------------------");
  console.log("Seeded Entities:");
  console.log(` - 1 Organization (${org.name})`);
  console.log(" - 4 Users (admin, manager, executive, approver)");
  console.log(" - 8 Suppliers (Tata Steel, BlueDart, Amazon, Dell, Siemens, Maersk, FedEx, Salesforce)");
  console.log(" - 5 Reconciled Purchase Orders");
  console.log(" - 17 Invoices covering 14 Workflow Scenes (with line items)");
  console.log(" - 4 Representative Open Exceptions");
  console.log(" - 2 Pending Approvals, 2 Scheduled Payments, 2 Paid Payments");
  console.log("Standard Login Credentials (password123 for all):");
  console.log("  admin@avarta.dev (or @clearops.dev)      (Administrator)");
  console.log("  manager@avarta.dev (or @clearops.dev)    (Finance Manager)");
  console.log("  executive@avarta.dev (or @clearops.dev)  (Finance Executive)");
  console.log("  approver@avarta.dev (or @clearops.dev)   (Approver)");
  console.log("-------------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("Seed execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
