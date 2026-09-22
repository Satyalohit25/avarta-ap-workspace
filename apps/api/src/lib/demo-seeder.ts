import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

export interface SeedSummary {
  success: boolean;
  organization: string;
  seededAt: string;
  counts: {
    organizations: number;
    users: number;
    suppliers: number;
    purchaseOrders: number;
    goodsReceipts: number;
    invoices: number;
    exceptions: number;
    approvals: number;
    payments: number;
  };
  scenarios: string[];
}

export async function seedDemoDataset(prismaClient: PrismaClient): Promise<SeedSummary> {
  const prisma = prismaClient;

  // 1. Dependency-ordered clean table wipe inside transaction
  await prisma.$transaction([
    prisma.idempotencyKey.deleteMany(),
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
    prisma.goodsReceiptLine.deleteMany(),
    prisma.goodsReceipt.deleteMany(),
    prisma.purchaseOrder.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.user.deleteMany(),
    prisma.organization.deleteMany(),
  ]);

  // 2. Organization Creation (Deterministic ID preserves active demo session tokens)
  const org = await prisma.organization.create({
    data: {
      id: "org_demo_001",
      name: "Acme Manufacturing Pvt Ltd",
      legalName: "Acme Manufacturing Private Limited",
      country: "IN",
      defaultCurrency: "INR",
      timezone: "Asia/Kolkata",
    },
  });

  // 3. Canonical Users (5 Roles per Doc 18 & AGENTS.md, deterministic IDs)
  const passwordHash = await bcrypt.hash("password123", 10);

  const [adminUser, managerUser, executiveUser, approverUser, readonlyUser] = await Promise.all([
    prisma.user.create({
      data: {
        id: "user_demo_admin",
        organizationId: org.id,
        email: "admin@avarta.dev",
        passwordHash,
        fullName: "Asha Administrator",
        role: "ADMINISTRATOR",
      },
    }),
    prisma.user.create({
      data: {
        id: "user_demo_manager",
        organizationId: org.id,
        email: "manager@avarta.dev",
        passwordHash,
        fullName: "Manav Manager",
        role: "FINANCE_MANAGER",
      },
    }),
    prisma.user.create({
      data: {
        id: "user_demo_executive",
        organizationId: org.id,
        email: "executive@avarta.dev",
        passwordHash,
        fullName: "Esha Executive",
        role: "FINANCE_EXECUTIVE",
      },
    }),
    prisma.user.create({
      data: {
        id: "user_demo_approver",
        organizationId: org.id,
        email: "approver@avarta.dev",
        passwordHash,
        fullName: "Arjun Approver",
        role: "APPROVER",
      },
    }),
    prisma.user.create({
      data: {
        id: "user_demo_readonly",
        organizationId: org.id,
        email: "readonly@avarta.dev",
        passwordHash,
        fullName: "Rohan Readonly",
        role: "READ_ONLY",
      },
    }),
  ]);

  // 4. Dynamic Date Offsets Generator (100% relative to execution moment)
  const now = new Date();
  function relDate(daysOffset: number, hoursOffset = 0, minsOffset = 0): Date {
    const d = new Date(now);
    d.setDate(d.getDate() + daysOffset);
    d.setHours(d.getHours() + hoursOffset, d.getMinutes() + minsOffset, 0, 0);
    return d;
  }

  // 5. Suppliers (8 Industry Vendors across INR, USD, EUR, GBP, CAD)
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

  // 6. Purchase Orders (5 Reconciled POs with relative issue dates)
  const poData = [
    { poNumber: "PO-FY26-0142", supCode: "SUP-001", currency: "INR", total: 500000, utilized: 500000, remaining: 0, status: "OPEN", matchStatus: "MATCHED", relIssueDays: -60 },
    { poNumber: "PO-FY26-0143", supCode: "SUP-002", currency: "INR", total: 150000, utilized: 127500, remaining: 22500, status: "OPEN", matchStatus: "PARTIAL", relIssueDays: -45 },
    { poNumber: "PO-FY26-0881", supCode: "SUP-004", currency: "USD", total: 25000, utilized: 16700, remaining: 8300, status: "OPEN", matchStatus: "PARTIAL", relIssueDays: -40 },
    { poNumber: "PO-FY26-0902", supCode: "SUP-005", currency: "EUR", total: 18000, utilized: 6400, remaining: 11600, status: "OPEN", matchStatus: "PARTIAL", relIssueDays: -30 },
    { poNumber: "PO-FY26-0990", supCode: "SUP-006", currency: "INR", total: 300000, utilized: 0, remaining: 300000, status: "OPEN", matchStatus: "UNMATCHED", relIssueDays: -20 },
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
        issueDate: relDate(po.relIssueDays),
      },
    });
    purchaseOrders[po.poNumber] = created.id;
  }

  // 7. Goods Receipt Notes (GRN) for 3-Way Matching per Tata Chemicals Standard
  await prisma.goodsReceipt.create({
    data: {
      organizationId: org.id,
      purchaseOrderId: purchaseOrders["PO-FY26-0142"],
      grnNumber: "GRN-FY26-0081",
      receiptDate: relDate(-50),
      vendorDeliveryNote: "DN-TS-8819",
      status: "ACCEPTED",
      comments: "Full shipment received and verified against Gate Pass GP-4091.",
      lines: {
        create: [
          { lineNumber: 1, description: "Hot-Rolled Steel Coil (3mm)", itemCode: "ITM-STL-001", receivedQuantity: 200, unitOfMeasure: "MT", status: "ACCEPTED" },
          { lineNumber: 2, description: "Cold-Rolled Sheet (1.2mm)", itemCode: "ITM-STL-002", receivedQuantity: 150, unitOfMeasure: "MT", status: "ACCEPTED" },
        ],
      },
    },
  });

  await prisma.goodsReceipt.create({
    data: {
      organizationId: org.id,
      purchaseOrderId: purchaseOrders["PO-FY26-0143"],
      grnNumber: "GRN-FY26-0082",
      receiptDate: relDate(-38),
      vendorDeliveryNote: "BD-WB-9912",
      status: "ACCEPTED",
      comments: "Delivered to central logistics depot.",
      lines: {
        create: [
          { lineNumber: 1, description: "Surface Cargo — Mumbai to Delhi (500kg)", itemCode: "SRV-LOG-001", receivedQuantity: 4, unitOfMeasure: "CONSIGNMENT", status: "ACCEPTED" },
        ],
      },
    },
  });

  await prisma.goodsReceipt.create({
    data: {
      organizationId: org.id,
      purchaseOrderId: purchaseOrders["PO-FY26-0881"],
      grnNumber: "GRN-FY26-0083",
      receiptDate: relDate(-32),
      vendorDeliveryNote: "DEL-US-4421",
      status: "SUBJECT_TO_INSPECTION",
      comments: "Subject to Quality Inspection. 1 monitor unit arrived with chassis transit dent.",
      lines: {
        create: [
          { lineNumber: 1, description: "Dell PowerEdge R750 Rack Server", itemCode: "ITM-SRV-750", receivedQuantity: 2, unitOfMeasure: "UNIT", status: "ACCEPTED", inspectionNotes: "All seals intact, serials verified." },
          { lineNumber: 2, description: "Dell 27\" UltraSharp Monitor U2723QE", itemCode: "ITM-MON-27", receivedQuantity: 7, unitOfMeasure: "UNIT", status: "ACCEPTED", inspectionNotes: "7 units verified operational." },
          { lineNumber: 3, description: "Dell 27\" UltraSharp Monitor U2723QE (Damaged)", itemCode: "ITM-MON-27", receivedQuantity: -1, unitOfMeasure: "UNIT", status: "RETURNED", inspectionNotes: "Transit damage return note #RET-881." },
        ],
      },
    },
  });

  // 8. Line item templates per supplier
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

  // 9. 28 Invoices Organized across the 9 Named Coherent Demo Scenarios
  const invoiceSeedList = [
    // -------------------------------------------------------------------------
    // SCENARIO 1: Clean 3-Way Match Happy Path
    // -------------------------------------------------------------------------
    {
      scenario: "SCENARIO_1_HAPPY_PATH",
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
      terms: 30,
      doc: { file: "Tata-Steel-INV-2026-1001.pdf", mime: "application/pdf", size: 182400 },
    },
    {
      scenario: "SCENARIO_1_HAPPY_PATH",
      num: "INV-2026-1002",
      supCode: "SUP-002",
      poNum: "PO-FY26-0143",
      currency: "INR",
      amount: 42500,
      paid: 0,
      wfState: "VALIDATING",
      status: "PROCESSING",
      source: "EMAIL",
      confidence: 92.0,
      daysDue: 12,
      terms: 15,
      doc: { file: "BlueDart-INV-2026-1002.pdf", mime: "application/pdf", size: 94100 },
    },
    {
      scenario: "SCENARIO_1_HAPPY_PATH",
      num: "INV-2026-1003",
      supCode: "SUP-003",
      poNum: null,
      currency: "INR",
      amount: 20900,
      paid: 0,
      wfState: "VALIDATED",
      status: "PROCESSING",
      source: "PORTAL",
      confidence: 97.0,
      daysDue: 20,
      terms: 30,
      doc: { file: "Amazon-INV-2026-1003.pdf", mime: "application/pdf", size: 112000 },
    },

    // -------------------------------------------------------------------------
    // SCENARIO 2: 3-Way Match Price Variance Discrepancy
    // -------------------------------------------------------------------------
    {
      scenario: "SCENARIO_2_PRICE_MISMATCH",
      num: "INV-2026-1018",
      supCode: "SUP-004",
      poNum: "PO-FY26-0881",
      currency: "USD",
      amount: 5200,
      paid: 0,
      wfState: "MATCHING_FAILED",
      status: "EXCEPTION",
      source: "API",
      confidence: 94.0,
      daysDue: 15,
      terms: 45,
      exception: {
        type: "PRICE_DIFFERENCE",
        severity: "CRITICAL",
        title: "3-Way Match: Unit Price Discrepancy on Hardware",
        desc: "Billed unit price ($5,200) exceeds approved PO line item rate ($4,850) by 7.2%. Exceeds 0.5% tolerance.",
        assignedTo: managerUser.id,
      },
    },

    // -------------------------------------------------------------------------
    // SCENARIO 3: GRN Quantity Variance with Damaged Goods Return
    // -------------------------------------------------------------------------
    {
      scenario: "SCENARIO_3_GRN_RETURN_MISMATCH",
      num: "INV-2026-1019",
      supCode: "SUP-004",
      poNum: "PO-FY26-0881",
      currency: "USD",
      amount: 4712,
      paid: 0,
      wfState: "MATCHING_FAILED",
      status: "EXCEPTION",
      source: "UPLOAD",
      confidence: 92.5,
      daysDue: 18,
      terms: 45,
      exception: {
        type: "QUANTITY_DIFFERENCE",
        severity: "HIGH",
        title: "3-Way Match: Net Quantity Discrepancy after Transit Damage",
        desc: "Invoice claims 8 monitor units, but GRN-FY26-0083 recorded 1 damaged return (Return Note #RET-881). Net received is 7.",
        assignedTo: executiveUser.id,
      },
    },

    // -------------------------------------------------------------------------
    // SCENARIO 4: Statutory Tax Arithmetic & GST Checksum Integrity
    // -------------------------------------------------------------------------
    {
      scenario: "SCENARIO_4_GST_STATUTORY",
      num: "INV-2026-1020",
      supCode: "SUP-001",
      poNum: null,
      currency: "INR",
      amount: 98500,
      paid: 0,
      wfState: "VALIDATION_FAILED",
      status: "EXCEPTION",
      source: "EMAIL",
      confidence: 88.0,
      daysDue: 8,
      terms: 30,
      exception: {
        type: "TAX_DIFFERENCE",
        severity: "HIGH",
        title: "Statutory Compliance: Incorrect GST Rate Calculation",
        desc: "Extracted line items carry 12% GST instead of mandated 18% HSN 7208 rate. Tax shortfall: INR 5,910.",
        assignedTo: executiveUser.id,
      },
    },
    {
      scenario: "SCENARIO_4_GST_STATUTORY",
      num: "INV-2026-1021",
      supCode: "SUP-006",
      poNum: null,
      currency: "INR",
      amount: 115000,
      paid: 0,
      wfState: "VALIDATION_FAILED",
      status: "EXCEPTION",
      source: "UPLOAD",
      confidence: 89.0,
      daysDue: 12,
      terms: 15,
      exception: {
        type: "INVALID_GST",
        severity: "CRITICAL",
        title: "Statutory Compliance: Invalid GSTIN Checksum",
        desc: "Vendor GSTIN '33AABCM4321D1ZZ' failed statutory Modulo-36 check-digit verification.",
        assignedTo: managerUser.id,
      },
    },

    // -------------------------------------------------------------------------
    // SCENARIO 5: Multi-Tier Delegation of Authority & Approval Thresholds
    // -------------------------------------------------------------------------
    {
      scenario: "SCENARIO_5_TIERED_APPROVAL",
      num: "INV-2026-1006",
      supCode: "SUP-002",
      poNum: null,
      currency: "INR",
      amount: 38000, // Tier 1: <= 1L
      paid: 0,
      wfState: "WAITING_APPROVAL",
      status: "PENDING_APPROVAL",
      source: "UPLOAD",
      confidence: 96.0,
      daysDue: 6,
      terms: 15,
      approval: { approverId: approverUser.id, status: "PENDING", comment: "Tier 1 standard departmental review (<= INR 1,00,000)." },
    },
    {
      scenario: "SCENARIO_5_TIERED_APPROVAL",
      num: "INV-2026-1007",
      supCode: "SUP-003",
      poNum: null,
      currency: "INR",
      amount: 185000, // Tier 2: 1L - 5L
      paid: 0,
      wfState: "WAITING_APPROVAL",
      status: "PENDING_APPROVAL",
      source: "PORTAL",
      confidence: 97.0,
      daysDue: 14,
      terms: 30,
      approval: { approverId: managerUser.id, status: "PENDING", comment: "Tier 2 mid-value sign-off required (INR 1,00,000 - 5,00,000)." },
    },
    {
      scenario: "SCENARIO_5_TIERED_APPROVAL",
      num: "INV-2026-1024",
      supCode: "SUP-001",
      poNum: "PO-FY26-0142",
      currency: "INR",
      amount: 825000, // Tier 3: > 5L
      paid: 0,
      wfState: "WAITING_APPROVAL",
      status: "PENDING_APPROVAL",
      source: "UPLOAD",
      confidence: 99.0,
      daysDue: 28,
      terms: 30,
      approval: { approverId: adminUser.id, status: "PENDING", comment: "Tier 3 executive authorization required for disbursements exceeding INR 5,00,000." },
    },

    // -------------------------------------------------------------------------
    // SCENARIO 6: Duplicate Invoice & Remittance Fraud Defense
    // -------------------------------------------------------------------------
    {
      scenario: "SCENARIO_6_FRAUD_DUPLICATE",
      num: "INV-2026-1011",
      supCode: "SUP-001",
      poNum: null,
      currency: "INR",
      amount: 146000,
      paid: 0,
      wfState: "VALIDATION_FAILED",
      status: "EXCEPTION",
      source: "EMAIL",
      confidence: 88.0,
      daysDue: 5,
      terms: 30,
      exception: {
        type: "DUPLICATE_INVOICE",
        severity: "CRITICAL",
        title: "Exact Duplicate Detected",
        desc: "Identical vendor, amount (₹1,46,000), and period matches active record INV-2026-1001.",
        assignedTo: managerUser.id,
      },
    },
    {
      scenario: "SCENARIO_6_FRAUD_DUPLICATE",
      num: "INV-2026-1022",
      supCode: "SUP-005",
      poNum: null,
      currency: "EUR",
      amount: 14500,
      paid: 0,
      wfState: "VALIDATION_FAILED",
      status: "EXCEPTION",
      source: "SCANNER",
      confidence: 86.0,
      daysDue: -2, // Overdue by 2 days
      terms: 30,
      exception: {
        type: "FRAUD_RISK",
        severity: "CRITICAL",
        title: "Remittance Discrepancy / Bank Details On Hold",
        desc: "Bank IBAN on scanned invoice does not match authenticated vendor master record in ERP.",
        assignedTo: adminUser.id,
      },
    },

    // -------------------------------------------------------------------------
    // SCENARIO 7: Batch Banking Disbursement & Host-to-Host Liquidity Release
    // -------------------------------------------------------------------------
    {
      scenario: "SCENARIO_7_BATCH_DISBURSEMENT",
      num: "INV-2026-1008",
      supCode: "SUP-004",
      poNum: "PO-FY26-0881",
      currency: "USD",
      amount: 16700,
      paid: 0,
      wfState: "SCHEDULED",
      status: "SCHEDULED",
      source: "API",
      confidence: 99.0,
      daysDue: 2, // Maturing in 2 days
      terms: 45,
      payment: { status: "SCHEDULED", method: "WIRE_SWIFT", date: relDate(2), ref: "PAY-2026-004" },
    },
    {
      scenario: "SCENARIO_7_BATCH_DISBURSEMENT",
      num: "INV-2026-1009",
      supCode: "SUP-005",
      poNum: "PO-FY26-0902",
      currency: "EUR",
      amount: 6400,
      paid: 0,
      wfState: "SCHEDULED",
      status: "SCHEDULED",
      source: "EMAIL",
      confidence: 98.0,
      daysDue: 3, // Maturing in 3 days
      terms: 30,
      payment: { status: "SCHEDULED", method: "SEPA_CREDIT", date: relDate(3), ref: "PAY-2026-005" },
    },
    {
      scenario: "SCENARIO_7_BATCH_DISBURSEMENT",
      num: "INV-2026-1023",
      supCode: "SUP-002",
      poNum: null,
      currency: "INR",
      amount: 450, // Micro-amount
      paid: 0,
      wfState: "SCHEDULED",
      status: "SCHEDULED",
      source: "EDI",
      confidence: 99.5,
      daysDue: 1, // Maturing tomorrow
      terms: 15,
      payment: { status: "SCHEDULED", method: "UPI_CORPORATE", date: relDate(1), ref: "PAY-MICRO-1023" },
    },

    // -------------------------------------------------------------------------
    // SCENARIO 8: Partial Payment & Multi-Currency Overdue Triage
    // -------------------------------------------------------------------------
    {
      scenario: "SCENARIO_8_PARTIAL_OVERDUE_FX",
      num: "INV-2026-1017",
      supCode: "SUP-001",
      poNum: "PO-FY26-0142",
      currency: "INR",
      amount: 150000,
      paid: 75000, // 50% partial payment
      wfState: "PROCESSING_PAYMENT",
      status: "PROCESSING",
      source: "PORTAL",
      confidence: 97.0,
      daysDue: -10, // Overdue by 10 days
      terms: 30,
      payment: { status: "PROCESSING", method: "BANK_TRANSFER", date: relDate(-10), ref: "PAY-PARTIAL-1017" },
    },
    {
      scenario: "SCENARIO_8_PARTIAL_OVERDUE_FX",
      num: "INV-2026-1012",
      supCode: "SUP-002",
      poNum: null,
      currency: "INR",
      amount: 51200,
      paid: 0,
      wfState: "MATCHING_FAILED",
      status: "EXCEPTION",
      source: "PORTAL",
      confidence: 84.0,
      daysDue: -8, // Overdue by 8 days
      terms: 15,
      exception: {
        type: "MISSING_PO",
        severity: "MEDIUM",
        title: "Missing Purchase Order Reference",
        desc: "Surface cargo booking invoiced without reference to an open PO.",
        assignedTo: executiveUser.id,
      },
    },
    {
      scenario: "SCENARIO_8_PARTIAL_OVERDUE_FX",
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
      terms: 30,
    },
    {
      scenario: "SCENARIO_8_PARTIAL_OVERDUE_FX",
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
      terms: 30,
    },

    // -------------------------------------------------------------------------
    // SCENARIO 9: ERP Sync & Section 44AA Immutable Archive
    // -------------------------------------------------------------------------
    {
      scenario: "SCENARIO_9_ERP_ARCHIVE",
      num: "INV-2026-1028",
      supCode: "SUP-005",
      poNum: "PO-FY26-0902",
      currency: "EUR",
      amount: 9800,
      paid: 9800,
      wfState: "ERP_SYNC",
      status: "SYNCED",
      source: "ERP",
      confidence: 100.0,
      daysDue: -18,
      terms: 30,
    },
    {
      scenario: "SCENARIO_9_ERP_ARCHIVE",
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
      terms: 30,
      doc: { file: "Tata-Steel-INV-2026-0900.pdf", mime: "application/pdf", size: 245120 },
      payment: { status: "PAID", method: "BANK_TRANSFER", date: relDate(-14), ref: "PAY-2026-001" },
    },
    {
      scenario: "SCENARIO_9_ERP_ARCHIVE",
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
      terms: 15,
    },
    {
      scenario: "SCENARIO_9_ERP_ARCHIVE",
      num: "INV-2026-1025",
      supCode: "SUP-007",
      poNum: null,
      currency: "GBP",
      amount: 2400,
      paid: 2400,
      wfState: "PAID",
      status: "PAID",
      source: "EMAIL",
      confidence: 98.0,
      daysDue: -32,
      terms: 30,
      payment: { status: "PAID", method: "WIRE_SWIFT", date: relDate(-30), ref: "PAY-SWIFT-9912" },
    },
    {
      scenario: "SCENARIO_9_ERP_ARCHIVE",
      num: "INV-2026-1026",
      supCode: "SUP-008",
      poNum: null,
      currency: "CAD",
      amount: 4800,
      paid: 4800,
      wfState: "ARCHIVED",
      status: "ARCHIVED",
      source: "PORTAL",
      confidence: 99.0,
      daysDue: -60,
      terms: 30,
    },

    // Additional Operational Invoices
    {
      scenario: "SCENARIO_1_HAPPY_PATH",
      num: "INV-2026-1004",
      supCode: "SUP-001",
      poNum: "PO-FY26-0142",
      currency: "INR",
      amount: 210000,
      paid: 0,
      wfState: "MATCHED",
      status: "PROCESSING",
      source: "EDI",
      confidence: 98.0,
      daysDue: 18,
      terms: 30,
    },
    {
      scenario: "SCENARIO_1_HAPPY_PATH",
      num: "INV-2026-1005",
      supCode: "SUP-002",
      poNum: "PO-FY26-0143",
      currency: "INR",
      amount: 85000,
      paid: 0,
      wfState: "MATCHED",
      status: "PROCESSING",
      source: "SCANNER",
      confidence: 93.0,
      daysDue: 8,
      terms: 15,
    },
    {
      scenario: "SCENARIO_4_GST_STATUTORY",
      num: "INV-2026-1010",
      supCode: "SUP-003",
      poNum: null,
      currency: "INR",
      amount: 29500,
      paid: 0,
      wfState: "VALIDATION_FAILED",
      status: "EXCEPTION",
      source: "UPLOAD",
      confidence: 79.0,
      daysDue: 4,
      terms: 30,
      exception: {
        type: "LOW_AI_CONFIDENCE",
        severity: "LOW",
        title: "Low Extraction Confidence Alert",
        desc: "Document scan resolution sub-optimal; line total confidence at 79%. Requires human confirmation.",
        assignedTo: executiveUser.id,
      },
    },
    {
      scenario: "SCENARIO_4_GST_STATUTORY",
      num: "INV-2026-1013",
      supCode: "SUP-003",
      poNum: null,
      currency: "INR",
      amount: 14200,
      paid: 0,
      wfState: "VALIDATION_FAILED",
      status: "EXCEPTION",
      source: "SCANNER",
      confidence: 91.0,
      daysDue: 10,
      terms: 30,
      exception: {
        type: "MISSING_REQUIRED_FIELD",
        severity: "MEDIUM",
        title: "Mandatory Tax ID Missing",
        desc: "Supplier GSTIN missing from tax invoice header.",
        assignedTo: executiveUser.id,
      },
    },
    {
      scenario: "SCENARIO_4_GST_STATUTORY",
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
      terms: 15,
      approval: { approverId: approverUser.id, status: "REJECTED", comment: "Vendor is blocked in ERP supplier master." },
    },
    {
      scenario: "SCENARIO_1_HAPPY_PATH",
      num: "INV-2026-1027",
      supCode: "SUP-003",
      poNum: null,
      currency: "INR",
      amount: 18900,
      paid: 0,
      wfState: "VALIDATED",
      status: "PROCESSING",
      source: "SCANNER",
      confidence: 96.0,
      daysDue: 19,
      terms: 30,
    },
  ];

  let exceptionsCount = 0;
  let approvalsCount = 0;
  let paymentsCount = 0;

  for (const item of invoiceSeedList) {
    const termsDays = item.terms || 30;
    const invDate = relDate(item.daysDue - termsDays);
    const dueDate = relDate(item.daysDue);

    const inv = await prisma.invoice.create({
      data: {
        organizationId: org.id,
        supplierId: item.supCode ? suppliers[item.supCode] : null,
        purchaseOrderId: item.poNum ? purchaseOrders[item.poNum] : null,
        assignedToId: item.exception?.assignedTo ?? null,
        invoiceNumber: item.num,
        invoiceDate: invDate,
        dueDate: dueDate,
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
            completedAt: item.wfState === "ARCHIVED" ? relDate(-40) : null,
          },
        },
      },
    });

    const instance = await prisma.workflowInstance.findUnique({ where: { invoiceId: inv.id } });

    // Progressive timeline transitions
    const stageTimeline: Array<{
      state: string;
      action: string;
      event: string;
      user: string;
      date: Date;
      data: Record<string, unknown>;
    }> = [];

    // Stage 1: Intake
    stageTimeline.push({
      state: "RECEIVED",
      action: "INVOICE_RECEIVED",
      event: "RECEIVE",
      user: executiveUser.id,
      date: invDate,
      data: { source: item.source, invoiceNumber: item.num, amount: item.amount, currency: item.currency },
    });

    const isAfterReceived = item.wfState !== "RECEIVED";
    if (isAfterReceived) {
      // Stage 2: Capture
      const captureDate = new Date(invDate.getTime() + 1000 * 60 * 5);
      stageTimeline.push({
        state: "CAPTURED",
        action: "DOCUMENT_OCR_COMPLETED",
        event: "CAPTURE_COMPLETE",
        user: executiveUser.id,
        date: captureDate,
        data: { confidence: item.confidence, extractedFields: ["INVOICE_NUMBER", "DATE", "TOTAL", "LINE_ITEMS"] },
      });
    }

    const isAfterCaptured = isAfterReceived && item.wfState !== "CAPTURED";
    if (isAfterCaptured) {
      // Stage 3: Validation
      const valDate = new Date(invDate.getTime() + 1000 * 60 * 10);
      const isValFailed = item.wfState === "VALIDATION_FAILED";
      stageTimeline.push({
        state: isValFailed ? "VALIDATION_FAILED" : "VALIDATED",
        action: isValFailed ? "VALIDATION_FLAGGED" : "VALIDATION_PASSED",
        event: isValFailed ? "VALIDATION_FAILURE" : "VALIDATION_SUCCESS",
        user: managerUser.id,
        date: valDate,
        data: { status: isValFailed ? "FAILED" : "PASSED", checks: ["GST_CHECKSUM", "MATH_ARITHMETIC", "VENDOR_MASTER"] },
      });
    }

    const isAfterValidated = isAfterCaptured && item.wfState !== "VALIDATION_FAILED" && item.wfState !== "VALIDATED";
    if (isAfterValidated) {
      // Stage 4: Matching
      const matchDate = new Date(invDate.getTime() + 1000 * 60 * 15);
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
      const appDate = relDate(-3);
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
      const schedDate = relDate(-2);
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
      const syncDate = relDate(-1);
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
        date: relDate(0),
        data: { retentionYears: 8, policy: "COMPLIANCE_ARCHIVE_SEC44AA" },
      });
    }

    // Insert transitions and audit logs
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
          afterData: step.data as unknown as never,
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

    // Attach Line Items
    const supplierLines = item.supCode ? lineItems[item.supCode] : null;
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
      exceptionsCount++;
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
      approvalsCount++;
      await prisma.approval.create({
        data: {
          invoiceId: inv.id,
          approverId: item.approval.approverId,
          status: item.approval.status as unknown as never,
          comment: item.approval.comment ?? null,
          requestedAt: relDate(-3),
          respondedAt: item.approval.status !== "PENDING" ? relDate(-1) : null,
        },
      });
    }

    // Attach Payment
    if (item.payment) {
      paymentsCount++;
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

  return {
    success: true,
    organization: org.name,
    seededAt: now.toISOString(),
    counts: {
      organizations: 1,
      users: 5,
      suppliers: 8,
      purchaseOrders: 5,
      goodsReceipts: 3,
      invoices: invoiceSeedList.length,
      exceptions: exceptionsCount,
      approvals: approvalsCount,
      payments: paymentsCount,
    },
    scenarios: [
      "SCENARIO_1_HAPPY_PATH",
      "SCENARIO_2_PRICE_MISMATCH",
      "SCENARIO_3_GRN_RETURN_MISMATCH",
      "SCENARIO_4_GST_STATUTORY",
      "SCENARIO_5_TIERED_APPROVAL",
      "SCENARIO_6_FRAUD_DUPLICATE",
      "SCENARIO_7_BATCH_DISBURSEMENT",
      "SCENARIO_8_PARTIAL_OVERDUE_FX",
      "SCENARIO_9_ERP_ARCHIVE",
    ],
  };
}
