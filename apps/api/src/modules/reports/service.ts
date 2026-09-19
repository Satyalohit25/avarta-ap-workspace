import { prisma } from "../../config/database";

export interface AgingBucket {
  label: string;
  totalAmount: number;
  invoiceCount: number;
}

export interface VendorAgingItem {
  vendorId: string;
  vendorName: string;
  current: number;
  days31_60: number;
  days61_90: number;
  days91_plus: number;
  total: number;
}

export interface ApAgingReport {
  summary: {
    totalOutstanding: number;
    current: number;
    days31_60: number;
    days61_90: number;
    days91_plus: number;
  };
  buckets: AgingBucket[];
  byVendor: VendorAgingItem[];
  currency: string;
}

export interface CashForecastWeek {
  weekNumber: number;
  startDate: string;
  endDate: string;
  projectedAmount: number;
  paymentCount: number;
}

export interface CashForecastReport {
  totalNext30Days: number;
  weeks: CashForecastWeek[];
  currency: string;
}

export async function getApAgingReport(organizationId: string): Promise<ApAgingReport> {
  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId,
      status: { notIn: ["PAID", "ARCHIVED", "REJECTED"] },
    },
    include: { supplier: true },
  });

  const now = new Date();
  let current = 0;
  let days31_60 = 0;
  let days61_90 = 0;
  let days91_plus = 0;

  let countCurrent = 0;
  let count31_60 = 0;
  let count61_90 = 0;
  let count91_plus = 0;

  const vendorMap = new Map<string, VendorAgingItem>();

  for (const inv of invoices) {
    const amount = Number(inv.totalAmount);
    const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.invoiceDate || now);
    const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    const vendorId = inv.supplierId || "unknown";
    const vendorName = inv.supplier?.displayName || inv.supplier?.legalName || "Direct / Unassigned";

    if (!vendorMap.has(vendorId)) {
      vendorMap.set(vendorId, {
        vendorId,
        vendorName,
        current: 0,
        days31_60: 0,
        days61_90: 0,
        days91_plus: 0,
        total: 0,
      });
    }
    const vEntry = vendorMap.get(vendorId)!;
    vEntry.total += amount;

    if (diffDays <= 30) {
      current += amount;
      countCurrent++;
      vEntry.current += amount;
    } else if (diffDays <= 60) {
      days31_60 += amount;
      count31_60++;
      vEntry.days31_60 += amount;
    } else if (diffDays <= 90) {
      days61_90 += amount;
      count61_90++;
      vEntry.days61_90 += amount;
    } else {
      days91_plus += amount;
      count91_plus++;
      vEntry.days91_plus += amount;
    }
  }

  const totalOutstanding = current + days31_60 + days61_90 + days91_plus;

  return {
    summary: {
      totalOutstanding,
      current,
      days31_60,
      days61_90,
      days91_plus,
    },
    buckets: [
      { label: "Current (0–30 Days)", totalAmount: current, invoiceCount: countCurrent },
      { label: "31–60 Days Overdue", totalAmount: days31_60, invoiceCount: count31_60 },
      { label: "61–90 Days Overdue", totalAmount: days61_90, invoiceCount: count61_90 },
      { label: "91+ Days Overdue", totalAmount: days91_plus, invoiceCount: count91_plus },
    ],
    byVendor: Array.from(vendorMap.values()).sort((a, b) => b.total - a.total),
    currency: "INR",
  };
}

export async function getCashForecastReport(organizationId: string): Promise<CashForecastReport> {
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Consider scheduled payments and invoices due within the next 30 days
  const upcomingInvoices = await prisma.invoice.findMany({
    where: {
      organizationId,
      status: { in: ["APPROVED", "SCHEDULED", "PENDING_APPROVAL"] },
      dueDate: { gte: now, lte: thirtyDaysLater },
    },
  });

  const weeks: CashForecastWeek[] = [];
  let totalNext30Days = 0;

  for (let i = 0; i < 4; i++) {
    const weekStart = new Date(now.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(now.getTime() + (i + 1) * 7 * 24 * 60 * 60 * 1000);

    const weekInvoices = upcomingInvoices.filter((inv) => {
      if (!inv.dueDate) return false;
      const d = new Date(inv.dueDate);
      return d >= weekStart && d < weekEnd;
    });

    const projectedAmount = weekInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    totalNext30Days += projectedAmount;

    weeks.push({
      weekNumber: i + 1,
      startDate: weekStart.toISOString().split("T")[0],
      endDate: weekEnd.toISOString().split("T")[0],
      projectedAmount,
      paymentCount: weekInvoices.length,
    });
  }

  return {
    totalNext30Days,
    weeks,
    currency: "INR",
  };
}
