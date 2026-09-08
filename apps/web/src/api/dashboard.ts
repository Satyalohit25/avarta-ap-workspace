import { apiRequest } from "./client";

export interface BlockerInvoiceItem {
  id: string;
  exceptionId?: string;
  invoiceNumber: string;
  vendor: string;
  amount: number;
  currency: string;
  daysWaiting: number;
  assignedTo: string;
  detailReason: string;
  urgency: "urgent" | "routine";
  type?: "approval" | "exception";
}

export interface BlockerGroup {
  id: string;
  title: string;
  description: string;
  severity: "routine" | "urgent";
  invoices: BlockerInvoiceItem[];
}

export interface MetricSummary {
  count: number;
  totalAmount: number;
}

export interface TopSupplierExposure {
  id: string;
  name: string;
  balance: number;
  currency: string;
  terms: number;
}

export interface PipelineStageItem {
  key: string;
  label: string;
  count: number;
  amount: number;
  isBranch: boolean;
  path: string;
}

export interface AgingBuckets {
  overdue: MetricSummary;
  dueIn7Days: MetricSummary;
  dueIn30Days: MetricSummary;
  dueLater: MetricSummary;
}

export interface DashboardOverview {
  // Top Anchors
  totalOutstanding: string;
  totalInvoices?: number;
  currency?: string;
  foreignBreakdown?: { currency: string; totalAmount: string }[];

  // Payment Outlook & Aging
  dueToday?: MetricSummary;
  dueIn7Days?: MetricSummary;
  dueIn30Days?: MetricSummary;
  overdueInvoices?: MetricSummary | number;
  agingBuckets?: AgingBuckets;

  // Monthly Volume & Performance
  monthlyThroughput?: MetricSummary;
  touchlessStpRate?: number;
  pipelineFunnel?: Record<string, number>;
  pipelineStages?: PipelineStageItem[];
  stageMap?: Record<string, { count: number; totalAmount: number }>;
  statusCounts?: { status: string; count: number }[];

  // Reconciled Stage Amounts
  pendingApprovalAmount?: number;
  scheduledAmount?: number;
  exceptionAmount?: number;

  // Operational Queues
  pendingApproval: number;
  exceptions: number;
  scheduledPayments: number;

  // Live Action Hub Blocker Groups
  blockerGroups?: BlockerGroup[];
  totalBlockedCount?: number;
  totalBlockedAmount?: number;

  // Supplier Exposure & Benchmarks
  topSuppliers?: TopSupplierExposure[];
  benchmarks?: {
    cycleTimeDays: number;
    approvalHours: number;
    exceptionRatePct: number;
    stpRatePct: number;
  };

  // Real-Time Activity Feed Stream (Unified Single-Call Ingestion)
  recentStream?: StreamItem[];
}

export interface StreamItem {
  id: string;
  invoiceNumber: string;
  vendor: string;
  channel: "EMAIL" | "UPLOAD" | "PORTAL";
  stage: string;
  statusVariant: "warning" | "info" | "success" | "error";
  amount: number;
  currency: string;
  confidence: number;
}

export function getDashboardOverview() {
  return apiRequest<{ data: DashboardOverview }>("/dashboard");
}
