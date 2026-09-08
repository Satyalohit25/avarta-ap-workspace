import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/database";
import { ApiError } from "../../lib/errors";

// Doc 14 §14.25 shape, Doc 06.1 rule: operational counts & macro AP metrics.
export async function overviewHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    const organizationId = req.auth.organizationId;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      scheduledPayments,
      inrOutstanding,
      currencyBreakdown,
      statusBreakdown,
      dueTodayAgg,
      dueIn7DaysAgg,
      dueIn30DaysAgg,
      dueLaterAgg,
      overdueAgg,
      monthlyInvoicesAgg,
      totalInvoicesCount,
      invoicesWithExceptionsGroup,
      approvalInvoices,
      openExceptions,
      topSuppliersRaw,
      recentInvoicesRaw,
    ] = await Promise.all([
      prisma.payment.count({ where: { organizationId, status: "SCHEDULED" } }),
      prisma.invoice.aggregate({
        where: { organizationId, currency: "INR", status: { notIn: ["PAID", "SYNCED", "ARCHIVED", "REJECTED"] } },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.groupBy({
        by: ["currency"],
        where: { organizationId, currency: { not: "INR" }, status: { notIn: ["PAID", "SYNCED", "ARCHIVED", "REJECTED"] } },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.groupBy({
        by: ["status"],
        where: { organizationId },
        _count: true,
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: {
          organizationId,
          status: { notIn: ["PAID", "SYNCED", "ARCHIVED", "REJECTED"] },
          dueDate: { gte: startOfToday, lte: endOfToday },
        },
        _count: true,
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: {
          organizationId,
          status: { notIn: ["PAID", "SYNCED", "ARCHIVED", "REJECTED"] },
          dueDate: { gte: now, lte: sevenDaysFromNow },
        },
        _count: true,
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: {
          organizationId,
          status: { notIn: ["PAID", "SYNCED", "ARCHIVED", "REJECTED"] },
          dueDate: { gt: sevenDaysFromNow, lte: thirtyDaysFromNow },
        },
        _count: true,
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: {
          organizationId,
          status: { notIn: ["PAID", "SYNCED", "ARCHIVED", "REJECTED"] },
          dueDate: { gt: thirtyDaysFromNow },
        },
        _count: true,
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: {
          organizationId,
          status: { notIn: ["PAID", "SYNCED", "ARCHIVED", "REJECTED"] },
          dueDate: { lt: now },
        },
        _count: true,
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: {
          organizationId,
          createdAt: { gte: startOfMonth },
        },
        _count: true,
        _sum: { totalAmount: true },
      }),
      prisma.invoice.count({
        where: { organizationId, status: { not: "REJECTED" } },
      }),
      prisma.exception.groupBy({
        by: ["invoiceId"],
        where: { organizationId },
      }),
      // Live blocker items: pending approvals
      prisma.invoice.findMany({
        where: { organizationId, status: "PENDING_APPROVAL" },
        include: {
          supplier: { select: { displayName: true } },
          assignedTo: { select: { fullName: true } },
          approvals: {
            where: { status: "PENDING" },
            include: { approver: { select: { fullName: true } } },
            take: 1,
          },
        },
        orderBy: { totalAmount: "desc" },
      }),
      // Live blocker items: open exceptions
      prisma.exception.findMany({
        where: { organizationId, status: { in: ["OPEN", "ASSIGNED", "UNDER_REVIEW"] } },
        include: {
          invoice: {
            include: {
              supplier: { select: { displayName: true } },
            },
          },
          assignedTo: { select: { fullName: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      // Top suppliers by outstanding balance
      prisma.supplier.findMany({
        where: { organizationId },
        orderBy: { outstandingBalance: "desc" },
        take: 4,
        select: {
          id: true,
          displayName: true,
          currency: true,
          outstandingBalance: true,
          paymentTermsDays: true,
        },
      }),
      // Recent invoices for unified activity stream (removes redundant frontend invoice list call)
      prisma.invoice.findMany({
        where: { organizationId },
        take: 4,
        orderBy: { createdAt: "desc" },
        include: {
          supplier: { select: { displayName: true } },
        },
      }),
    ]);

    const pendingApproval = approvalInvoices.length;
    const exceptions = openExceptions.length;

    const foreignBreakdown = currencyBreakdown.map((cb) => ({
      currency: cb.currency,
      totalAmount: (cb._sum.totalAmount ?? 0).toString(),
    }));

    const statusCounts = statusBreakdown.map((sb) => ({
      status: sb.status,
      count: sb._count,
    }));

    // Pipeline funnel map with dynamic counts and amounts
    const pipelineFunnel: Record<string, number> = {
      RECEIVED: 0,
      PROCESSING: 0,
      EXCEPTION: 0,
      PENDING_APPROVAL: 0,
      APPROVED: 0,
      SCHEDULED: 0,
      PAID: 0,
      SYNCED: 0,
      ARCHIVED: 0,
    };
    const stageMap: Record<string, { count: number; totalAmount: number }> = {
      RECEIVED: { count: 0, totalAmount: 0 },
      PROCESSING: { count: 0, totalAmount: 0 },
      EXCEPTION: { count: 0, totalAmount: 0 },
      PENDING_APPROVAL: { count: 0, totalAmount: 0 },
      APPROVED: { count: 0, totalAmount: 0 },
      SCHEDULED: { count: 0, totalAmount: 0 },
      PAID: { count: 0, totalAmount: 0 },
      SYNCED: { count: 0, totalAmount: 0 },
      ARCHIVED: { count: 0, totalAmount: 0 },
    };
    for (const sb of statusBreakdown) {
      pipelineFunnel[sb.status] = sb._count;
      stageMap[sb.status] = {
        count: sb._count,
        totalAmount: Number(sb._sum.totalAmount ?? 0),
      };
    }

    const pendingApprovalAmount = stageMap["PENDING_APPROVAL"]?.totalAmount || 0;
    const scheduledAmount = (stageMap["SCHEDULED"]?.totalAmount || 0) + (stageMap["APPROVED"]?.totalAmount || 0);
    const exceptionAmount = stageMap["EXCEPTION"]?.totalAmount || 0;

    // Linear canonical pipeline stages per AGENTS.md:
    const pipelineStages = [
      { key: "RECEIVED", label: "Intake & Capture", count: stageMap["RECEIVED"]?.count || 0, amount: stageMap["RECEIVED"]?.totalAmount || 0, isBranch: false, path: "/invoices" },
      { key: "PROCESSING", label: "Match & Validate", count: stageMap["PROCESSING"]?.count || 0, amount: stageMap["PROCESSING"]?.totalAmount || 0, isBranch: false, path: "/invoices" },
      { key: "EXCEPTION", label: "Open Exceptions", count: stageMap["EXCEPTION"]?.count || 0, amount: stageMap["EXCEPTION"]?.totalAmount || 0, isBranch: true, path: "/exceptions" },
      { key: "PENDING_APPROVAL", label: "Pending Sign-off", count: stageMap["PENDING_APPROVAL"]?.count || 0, amount: stageMap["PENDING_APPROVAL"]?.totalAmount || 0, isBranch: false, path: "/approvals" },
      { key: "SCHEDULED", label: "Scheduled for Pay", count: (stageMap["SCHEDULED"]?.count || 0) + (stageMap["APPROVED"]?.count || 0), amount: scheduledAmount, isBranch: false, path: "/payments" },
      { key: "PAID", label: "Settled & Synced", count: (stageMap["PAID"]?.count || 0) + (stageMap["SYNCED"]?.count || 0), amount: (stageMap["PAID"]?.totalAmount || 0) + (stageMap["SYNCED"]?.totalAmount || 0), isBranch: false, path: "/invoices?status=PAID" },
    ];

    // Straight-Through Processing (STP) rate:
    const invoicesWithExceptionsCount = invoicesWithExceptionsGroup.length;
    const cleanInvoices = Math.max(0, totalInvoicesCount - invoicesWithExceptionsCount);
    const touchlessStpRate = totalInvoicesCount > 0
      ? Math.min(100, Math.round((cleanInvoices / totalInvoicesCount) * 100))
      : 100;

    // Build Live Blocker Groups for AP Action Hub
    const mappedApprovals = approvalInvoices.map((inv) => {
      const daysWaiting = Math.max(1, Math.floor((now.getTime() - new Date(inv.createdAt).getTime()) / (24 * 3600 * 1000)));
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        vendor: inv.supplier?.displayName || "Unlinked Supplier",
        amount: Number(inv.totalAmount),
        currency: inv.currency,
        daysWaiting,
        assignedTo: inv.approvals[0]?.approver?.fullName || inv.assignedTo?.fullName || "Assigned Approver",
        detailReason: `Awaiting executive sign-off (${inv.currency} ${Number(inv.totalAmount).toLocaleString()})`,
        urgency: daysWaiting >= 3 ? "urgent" as const : "routine" as const,
        type: "approval",
      };
    });

    const mismatchExceptions: any[] = [];
    const missingPoExceptions: any[] = [];
    const duplicateExceptions: any[] = [];
    const complianceExceptions: any[] = [];

    for (const exc of openExceptions) {
      const inv = exc.invoice;
      const daysWaiting = Math.max(1, Math.floor((now.getTime() - new Date(exc.createdAt).getTime()) / (24 * 3600 * 1000)));
      const item = {
        id: inv?.id || exc.id,
        exceptionId: exc.id,
        invoiceNumber: inv?.invoiceNumber || "INV-UNKNOWN",
        vendor: inv?.supplier?.displayName || "Unlinked Supplier",
        amount: inv ? Number(inv.totalAmount) : 0,
        currency: inv?.currency || "INR",
        daysWaiting,
        assignedTo: exc.assignedTo?.fullName || "Finance AP",
        detailReason: exc.description || exc.title,
        urgency: (exc.severity === "CRITICAL" || exc.severity === "HIGH" || daysWaiting >= 3) ? "urgent" as const : "routine" as const,
        type: "exception",
      };

      if (exc.type === "MISSING_PO") {
        missingPoExceptions.push(item);
      } else if (["PRICE_DIFFERENCE", "QUANTITY_DIFFERENCE", "TAX_DIFFERENCE", "CURRENCY_MISMATCH"].includes(exc.type)) {
        mismatchExceptions.push(item);
      } else if (["DUPLICATE_INVOICE", "DUPLICATE_AMOUNT", "FRAUD_RISK"].includes(exc.type)) {
        duplicateExceptions.push(item);
      } else {
        complianceExceptions.push(item);
      }
    }

    const blockerGroups = [
      {
        id: "pending_approval",
        title: "Pending Approval",
        description: "Invoices matched & validated, awaiting manager sign-off",
        severity: mappedApprovals.some((a) => a.urgency === "urgent") ? "urgent" : "routine",
        invoices: mappedApprovals,
      },
      {
        id: "po_mismatch",
        title: "PO Mismatch & Variances",
        description: "3-way line matching found unit rate or delivered quantity variances",
        severity: mismatchExceptions.some((a) => a.urgency === "urgent") ? "urgent" : "routine",
        invoices: mismatchExceptions,
      },
      {
        id: "missing_po",
        title: "Missing Purchase Order",
        description: "Inbound invoices submitted without a linked PO reference",
        severity: missingPoExceptions.some((a) => a.urgency === "urgent") ? "urgent" : "routine",
        invoices: missingPoExceptions,
      },
      {
        id: "duplicate_suspected",
        title: "Duplicate Suspected",
        description: "Matches previous invoice number, amount fingerprint, or fraud check",
        severity: duplicateExceptions.some((a) => a.urgency === "urgent") ? "urgent" : "routine",
        invoices: duplicateExceptions,
      },
      {
        id: "compliance_validation",
        title: "Vendor & AI Extraction",
        description: "Unknown supplier record, low AI confidence, or missing required fields",
        severity: complianceExceptions.some((a) => a.urgency === "urgent") ? "urgent" : "routine",
        invoices: complianceExceptions,
      },
    ].filter((group) => group.invoices.length > 0 || group.id === "pending_approval" || group.id === "missing_po");

    const totalBlockedInvoices = blockerGroups.reduce((acc, g) => acc + g.invoices.length, 0);
    const totalBlockedAmount = blockerGroups.reduce(
      (acc, g) => acc + g.invoices.reduce((sum: number, inv: any) => sum + inv.amount, 0),
      0
    );

    const topSuppliers = topSuppliersRaw.map((s) => ({
      id: s.id,
      name: s.displayName,
      balance: Number(s.outstandingBalance),
      currency: s.currency,
      terms: s.paymentTermsDays,
    }));

    const recentStream = recentInvoicesRaw.map((inv) => {
      let statusVariant: "warning" | "info" | "success" | "error" = "info";
      let stage = inv.status.replace(/_/g, " ");

      if (inv.status === "EXCEPTION" || inv.status === "REJECTED") {
        statusVariant = "error";
        stage = "Exception Flagged";
      } else if (inv.status === "PENDING_APPROVAL") {
        statusVariant = "warning";
        stage = "Pending Approval";
      } else if (inv.status === "APPROVED" || inv.status === "PAID" || inv.status === "SYNCED") {
        statusVariant = "success";
        stage = inv.status === "PAID" ? "Paid" : "Approved";
      } else if (inv.status === "SCHEDULED") {
        statusVariant = "info";
        stage = "Payment Scheduled";
      } else {
        stage = "Validation Passed";
        statusVariant = "info";
      }

      const channel = (inv.source === "EMAIL" ? "EMAIL" : inv.source === "PORTAL" ? "PORTAL" : "UPLOAD") as
        | "EMAIL"
        | "UPLOAD"
        | "PORTAL";

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        vendor: inv.supplier?.displayName || "Unlinked Supplier",
        channel,
        stage,
        statusVariant,
        amount: Number(inv.totalAmount) || 0,
        currency: inv.currency || "INR",
        confidence: inv.aiConfidence ?? 96,
      };
    });

    res.json({
      data: {
        // Top Anchors (Dominant Financial Metrics)
        totalOutstanding: (inrOutstanding._sum.totalAmount ?? 0).toString(),
        totalInvoices: totalInvoicesCount,
        currency: "INR",
        foreignBreakdown,

        // Payment Outlook & Aging Buckets
        dueToday: {
          count: dueTodayAgg._count,
          totalAmount: Number(dueTodayAgg._sum.totalAmount ?? 0),
        },
        dueIn7Days: {
          count: dueIn7DaysAgg._count,
          totalAmount: Number(dueIn7DaysAgg._sum.totalAmount ?? 0),
        },
        dueIn30Days: {
          count: dueIn30DaysAgg._count,
          totalAmount: Number(dueIn30DaysAgg._sum.totalAmount ?? 0),
        },
        overdueInvoices: {
          count: overdueAgg._count,
          totalAmount: Number(overdueAgg._sum.totalAmount ?? 0),
        },
        agingBuckets: {
          overdue: {
            count: overdueAgg._count,
            totalAmount: Number(overdueAgg._sum.totalAmount ?? 0),
          },
          dueIn7Days: {
            count: dueIn7DaysAgg._count,
            totalAmount: Number(dueIn7DaysAgg._sum.totalAmount ?? 0),
          },
          dueIn30Days: {
            count: dueIn30DaysAgg._count,
            totalAmount: Number(dueIn30DaysAgg._sum.totalAmount ?? 0),
          },
          dueLater: {
            count: dueLaterAgg._count,
            totalAmount: Number(dueLaterAgg._sum.totalAmount ?? 0),
          },
        },

        // Monthly Volume & Performance
        monthlyThroughput: {
          count: monthlyInvoicesAgg._count,
          totalAmount: Number(monthlyInvoicesAgg._sum.totalAmount ?? 0),
        },
        touchlessStpRate,
        pipelineFunnel,
        pipelineStages,
        stageMap,
        statusCounts,

        // Reconciled Stage Amounts
        pendingApprovalAmount,
        scheduledAmount,
        exceptionAmount,

        // Work Queue & Live Blocker Groups
        pendingApproval,
        exceptions,
        scheduledPayments,
        blockerGroups,
        totalBlockedCount: totalBlockedInvoices,
        totalBlockedAmount,

        // Supplier Exposure & Benchmarks
        topSuppliers,
        benchmarks: {
          cycleTimeDays: 2.4,
          approvalHours: 14.2,
          exceptionRatePct: 18.2,
          stpRatePct: touchlessStpRate,
        },

        // Real-Time Activity Feed Stream (Compact Unified Ingestion)
        recentStream,
      },
    });

  } catch (err) {
    next(err);
  }
}
