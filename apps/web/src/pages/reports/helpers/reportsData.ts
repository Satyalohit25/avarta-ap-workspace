export interface KpiMetric {
  title: string;
  value: string;
  subtitle: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export interface ThroughputDataPoint {
  label: string;
  processed: number;
  exceptions: number;
  dateStr?: string;
  totalAmount?: number;
}

export interface ExceptionBreakdownItem {
  type: string;
  label: string;
  percentage: number;
  count: number;
  avgResolutionTime: string;
  colorClass: string;
}

export interface StageSlaItem {
  stage: string;
  from: string;
  to: string;
  avgDuration: string;
  targetSla: string;
  status: "ON_TRACK" | "WARNING" | "CRITICAL";
  automated: boolean;
}

export interface VendorVelocityItem {
  id: string;
  vendorName: string;
  category: string;
  invoiceCount: number;
  totalSpend: number;
  touchlessRate: number;
  avgCycleHours: number;
}

export interface OperationalReportDataset {
  kpis: {
    straightThroughRate: KpiMetric;
    avgCycleTime: KpiMetric;
    exceptionResolutionTime: KpiMetric;
    totalSpendVolume: KpiMetric;
  };
  throughputSeries: ThroughputDataPoint[];
  exceptionBreakdown: ExceptionBreakdownItem[];
  stageSlas: StageSlaItem[];
  topVendors: VendorVelocityItem[];
}

export const REPORTS_DATA_BY_TIMERANGE: Record<string, OperationalReportDataset> = {
  "7d": {
    kpis: {
      straightThroughRate: {
        title: "Straight-Through Processing (STP)",
        value: "86.4%",
        subtitle: "+3.8% vs previous 7-day period",
        trend: { value: "+3.8%", isPositive: true },
      },
      avgCycleTime: {
        title: "Intake-to-Schedule Cycle Time",
        value: "1.2 Hours",
        subtitle: "-88% vs manual AP baseline (10.5 days)",
        trend: { value: "-0.4h", isPositive: true },
      },
      exceptionResolutionTime: {
        title: "Exception Resolution Velocity",
        value: "3.4 Hours",
        subtitle: "Median resolution turnaround",
        trend: { value: "-1.1h", isPositive: true },
      },
      totalSpendVolume: {
        title: "Total Spend Processed",
        value: "₹ 1,14,50,000",
        subtitle: "78 invoices processed across 18 vendors",
      },
    },
    throughputSeries: [
      { label: "Mon", processed: 14, exceptions: 1, dateStr: "25 Aug", totalAmount: 1850000 },
      { label: "Tue", processed: 18, exceptions: 2, dateStr: "26 Aug", totalAmount: 2450000 },
      { label: "Wed", processed: 15, exceptions: 1, dateStr: "27 Aug", totalAmount: 2100000 },
      { label: "Thu", processed: 22, exceptions: 2, dateStr: "28 Aug", totalAmount: 3200000 },
      { label: "Fri", processed: 16, exceptions: 0, dateStr: "29 Aug", totalAmount: 1850000 },
      { label: "Sat", processed: 4, exceptions: 0, dateStr: "30 Aug", totalAmount: 450000 },
      { label: "Sun", processed: 2, exceptions: 0, dateStr: "31 Aug", totalAmount: 220000 },
    ],
    exceptionBreakdown: [
      {
        type: "DUPLICATE_INVOICE",
        label: "Duplicate Invoice / Number",
        percentage: 33,
        count: 2,
        avgResolutionTime: "1.5h",
        colorClass: "bg-indigo-600",
      },
      {
        type: "PRICE_DIFFERENCE",
        label: "Price / Rate Variance vs PO",
        percentage: 33,
        count: 2,
        avgResolutionTime: "4.2h",
        colorClass: "bg-amber-500",
      },
      {
        type: "MISSING_PO",
        label: "Missing PO / Unlinked Record",
        percentage: 17,
        count: 1,
        avgResolutionTime: "3.8h",
        colorClass: "bg-sky-500",
      },
      {
        type: "TAX_DIFFERENCE",
        label: "Tax / GST Mismatch",
        percentage: 17,
        count: 1,
        avgResolutionTime: "2.1h",
        colorClass: "bg-emerald-500",
      },
    ],
    stageSlas: [
      {
        stage: "Receive → Capture & OCR",
        from: "Intake",
        to: "Capture",
        avgDuration: "42 sec",
        targetSla: "< 2 min",
        status: "ON_TRACK",
        automated: true,
      },
      {
        stage: "Capture → 3-Way Match & Validation",
        from: "Validate",
        to: "Matching",
        avgDuration: "1.8 min",
        targetSla: "< 5 min",
        status: "ON_TRACK",
        automated: true,
      },
      {
        stage: "Exception Resolution (Human)",
        from: "Exception",
        to: "Resolved",
        avgDuration: "3.4 hrs",
        targetSla: "< 8 hrs",
        status: "ON_TRACK",
        automated: false,
      },
      {
        stage: "Tiered Approval Sign-Off",
        from: "Waiting Approval",
        to: "Approved",
        avgDuration: "6.2 hrs",
        targetSla: "< 24 hrs",
        status: "ON_TRACK",
        automated: false,
      },
      {
        stage: "Scheduled → ERP Sync & Settlement",
        from: "Scheduled",
        to: "Paid",
        avgDuration: "14.5 hrs",
        targetSla: "< 48 hrs",
        status: "ON_TRACK",
        automated: true,
      },
    ],
    topVendors: [
      {
        id: "v-1",
        vendorName: "Tata Steel Ltd",
        category: "Raw Materials",
        invoiceCount: 24,
        totalSpend: 4250000,
        touchlessRate: 91.6,
        avgCycleHours: 1.1,
      },
      {
        id: "v-2",
        vendorName: "BlueDart Express",
        category: "Logistics",
        invoiceCount: 18,
        totalSpend: 1820000,
        touchlessRate: 88.9,
        avgCycleHours: 0.8,
      },
      {
        id: "v-3",
        vendorName: "Dell Technologies",
        category: "Hardware / IT",
        invoiceCount: 12,
        totalSpend: 2890000,
        touchlessRate: 83.3,
        avgCycleHours: 1.8,
      },
      {
        id: "v-4",
        vendorName: "Siemens Industrial",
        category: "Automation",
        invoiceCount: 9,
        totalSpend: 1450000,
        touchlessRate: 77.8,
        avgCycleHours: 2.4,
      },
    ],
  },

  "30d": {
    kpis: {
      straightThroughRate: {
        title: "Straight-Through Processing (STP)",
        value: "84.2%",
        subtitle: "+6.4% touchless 3-way match automation",
        trend: { value: "+6.4%", isPositive: true },
      },
      avgCycleTime: {
        title: "Intake-to-Schedule Cycle Time",
        value: "1.4 Hours",
        subtitle: "-92% vs manual AP baseline (12 days)",
        trend: { value: "-0.8h", isPositive: true },
      },
      exceptionResolutionTime: {
        title: "Exception Resolution Velocity",
        value: "4.2 Hours",
        subtitle: "Down from 18.5h manual turnaround",
        trend: { value: "-3.2h", isPositive: true },
      },
      totalSpendVolume: {
        title: "Total Spend Processed",
        value: "₹ 4,82,90,000",
        subtitle: "311 total invoices processed this month",
      },
    },
    throughputSeries: [
      { label: "W1", processed: 68, exceptions: 5, dateStr: "1 - 7 Aug", totalAmount: 9800000 },
      { label: "W2", processed: 79, exceptions: 6, dateStr: "8 - 14 Aug", totalAmount: 12100000 },
      { label: "W3", processed: 84, exceptions: 4, dateStr: "15 - 21 Aug", totalAmount: 13450000 },
      { label: "W4", processed: 80, exceptions: 5, dateStr: "22 - 31 Aug", totalAmount: 12940000 },
    ],
    exceptionBreakdown: [
      {
        type: "DUPLICATE_INVOICE",
        label: "Duplicate Invoice / Number",
        percentage: 35,
        count: 7,
        avgResolutionTime: "1.8h",
        colorClass: "bg-indigo-600",
      },
      {
        type: "UNKNOWN_VENDOR",
        label: "Unknown / Unverified Vendor",
        percentage: 25,
        count: 5,
        avgResolutionTime: "3.2h",
        colorClass: "bg-amber-500",
      },
      {
        type: "PRICE_DIFFERENCE",
        label: "Price / Rate Variance vs PO",
        percentage: 20,
        count: 4,
        avgResolutionTime: "5.4h",
        colorClass: "bg-sky-500",
      },
      {
        type: "MISSING_PO",
        label: "Missing PO / Unlinked Record",
        percentage: 15,
        count: 3,
        avgResolutionTime: "4.1h",
        colorClass: "bg-neutral-400",
      },
      {
        type: "TAX_DIFFERENCE",
        label: "Tax / GST Mismatch",
        percentage: 5,
        count: 1,
        avgResolutionTime: "2.5h",
        colorClass: "bg-emerald-500",
      },
    ],
    stageSlas: [
      {
        stage: "Receive → Capture & OCR",
        from: "Intake",
        to: "Capture",
        avgDuration: "45 sec",
        targetSla: "< 2 min",
        status: "ON_TRACK",
        automated: true,
      },
      {
        stage: "Capture → 3-Way Match & Validation",
        from: "Validate",
        to: "Matching",
        avgDuration: "2.1 min",
        targetSla: "< 5 min",
        status: "ON_TRACK",
        automated: true,
      },
      {
        stage: "Exception Resolution (Human)",
        from: "Exception",
        to: "Resolved",
        avgDuration: "4.2 hrs",
        targetSla: "< 8 hrs",
        status: "ON_TRACK",
        automated: false,
      },
      {
        stage: "Tiered Approval Sign-Off",
        from: "Waiting Approval",
        to: "Approved",
        avgDuration: "8.5 hrs",
        targetSla: "< 24 hrs",
        status: "ON_TRACK",
        automated: false,
      },
      {
        stage: "Scheduled → ERP Sync & Settlement",
        from: "Scheduled",
        to: "Paid",
        avgDuration: "18.2 hrs",
        targetSla: "< 48 hrs",
        status: "ON_TRACK",
        automated: true,
      },
    ],
    topVendors: [
      {
        id: "v-1",
        vendorName: "Tata Steel Ltd",
        category: "Raw Materials",
        invoiceCount: 92,
        totalSpend: 18450000,
        touchlessRate: 89.1,
        avgCycleHours: 1.2,
      },
      {
        id: "v-2",
        vendorName: "BlueDart Express",
        category: "Logistics",
        invoiceCount: 74,
        totalSpend: 8120000,
        touchlessRate: 90.5,
        avgCycleHours: 0.9,
      },
      {
        id: "v-3",
        vendorName: "Dell Technologies",
        category: "Hardware / IT",
        invoiceCount: 46,
        totalSpend: 11200000,
        touchlessRate: 82.6,
        avgCycleHours: 1.9,
      },
      {
        id: "v-4",
        vendorName: "Siemens Industrial",
        category: "Automation",
        invoiceCount: 38,
        totalSpend: 6240000,
        touchlessRate: 76.3,
        avgCycleHours: 2.6,
      },
      {
        id: "v-5",
        vendorName: "Amazon Business",
        category: "Office & Operations",
        invoiceCount: 31,
        totalSpend: 1480000,
        touchlessRate: 96.7,
        avgCycleHours: 0.4,
      },
    ],
  },

  "90d": {
    kpis: {
      straightThroughRate: {
        title: "Straight-Through Processing (STP)",
        value: "82.8%",
        subtitle: "Aggregated quarterly touchless throughput",
        trend: { value: "+8.2%", isPositive: true },
      },
      avgCycleTime: {
        title: "Intake-to-Schedule Cycle Time",
        value: "1.6 Hours",
        subtitle: "-89% reduction across 942 invoices",
        trend: { value: "-1.2h", isPositive: true },
      },
      exceptionResolutionTime: {
        title: "Exception Resolution Velocity",
        value: "4.8 Hours",
        subtitle: "Quarterly median turnaround",
        trend: { value: "-4.5h", isPositive: true },
      },
      totalSpendVolume: {
        title: "Total Spend Processed",
        value: "₹ 14,20,50,000",
        subtitle: "942 total invoices across 42 active suppliers",
      },
    },
    throughputSeries: [
      { label: "Jun", processed: 295, exceptions: 24, dateStr: "June 2026", totalAmount: 43200000 },
      { label: "Jul", processed: 336, exceptions: 21, dateStr: "July 2026", totalAmount: 50600000 },
      { label: "Aug", processed: 311, exceptions: 18, dateStr: "August 2026", totalAmount: 48250000 },
    ],
    exceptionBreakdown: [
      {
        type: "DUPLICATE_INVOICE",
        label: "Duplicate Invoice / Number",
        percentage: 34,
        count: 21,
        avgResolutionTime: "2.1h",
        colorClass: "bg-indigo-600",
      },
      {
        type: "PRICE_DIFFERENCE",
        label: "Price / Rate Variance vs PO",
        percentage: 26,
        count: 16,
        avgResolutionTime: "5.8h",
        colorClass: "bg-amber-500",
      },
      {
        type: "UNKNOWN_VENDOR",
        label: "Unknown / Unverified Vendor",
        percentage: 22,
        count: 14,
        avgResolutionTime: "3.5h",
        colorClass: "bg-sky-500",
      },
      {
        type: "MISSING_PO",
        label: "Missing PO / Unlinked Record",
        percentage: 12,
        count: 7,
        avgResolutionTime: "4.4h",
        colorClass: "bg-neutral-400",
      },
      {
        type: "TAX_DIFFERENCE",
        label: "Tax / GST Mismatch",
        percentage: 6,
        count: 5,
        avgResolutionTime: "2.9h",
        colorClass: "bg-emerald-500",
      },
    ],
    stageSlas: [
      {
        stage: "Receive → Capture & OCR",
        from: "Intake",
        to: "Capture",
        avgDuration: "48 sec",
        targetSla: "< 2 min",
        status: "ON_TRACK",
        automated: true,
      },
      {
        stage: "Capture → 3-Way Match & Validation",
        from: "Validate",
        to: "Matching",
        avgDuration: "2.3 min",
        targetSla: "< 5 min",
        status: "ON_TRACK",
        automated: true,
      },
      {
        stage: "Exception Resolution (Human)",
        from: "Exception",
        to: "Resolved",
        avgDuration: "4.8 hrs",
        targetSla: "< 8 hrs",
        status: "ON_TRACK",
        automated: false,
      },
      {
        stage: "Tiered Approval Sign-Off",
        from: "Waiting Approval",
        to: "Approved",
        avgDuration: "9.2 hrs",
        targetSla: "< 24 hrs",
        status: "ON_TRACK",
        automated: false,
      },
      {
        stage: "Scheduled → ERP Sync & Settlement",
        from: "Scheduled",
        to: "Paid",
        avgDuration: "21.0 hrs",
        targetSla: "< 48 hrs",
        status: "ON_TRACK",
        automated: true,
      },
    ],
    topVendors: [
      {
        id: "v-1",
        vendorName: "Tata Steel Ltd",
        category: "Raw Materials",
        invoiceCount: 280,
        totalSpend: 54100000,
        touchlessRate: 88.2,
        avgCycleHours: 1.3,
      },
      {
        id: "v-2",
        vendorName: "Dell Technologies",
        category: "Hardware / IT",
        invoiceCount: 142,
        totalSpend: 34200000,
        touchlessRate: 81.5,
        avgCycleHours: 2.1,
      },
      {
        id: "v-3",
        vendorName: "BlueDart Express",
        category: "Logistics",
        invoiceCount: 220,
        totalSpend: 23800000,
        touchlessRate: 89.8,
        avgCycleHours: 1.0,
      },
      {
        id: "v-4",
        vendorName: "Siemens Industrial",
        category: "Automation",
        invoiceCount: 110,
        totalSpend: 19500000,
        touchlessRate: 75.4,
        avgCycleHours: 2.8,
      },
    ],
  },

  ytd: {
    kpis: {
      straightThroughRate: {
        title: "Straight-Through Processing (STP)",
        value: "81.9%",
        subtitle: "Annualized straight-through automation rate",
        trend: { value: "+14.2%", isPositive: true },
      },
      avgCycleTime: {
        title: "Intake-to-Schedule Cycle Time",
        value: "1.8 Hours",
        subtitle: "-91% vs pre-Avarta legacy setup",
        trend: { value: "-2.4h", isPositive: true },
      },
      exceptionResolutionTime: {
        title: "Exception Resolution Velocity",
        value: "5.1 Hours",
        subtitle: "Annual average across all exception categories",
        trend: { value: "-6.2h", isPositive: true },
      },
      totalSpendVolume: {
        title: "Total Spend Processed",
        value: "₹ 38,90,00000",
        subtitle: "2,680 total invoices reconciled YTD",
      },
    },
    throughputSeries: [
      { label: "Q1", processed: 840, exceptions: 92, dateStr: "Jan - Mar", totalAmount: 118000000 },
      { label: "Q2", processed: 910, exceptions: 78, dateStr: "Apr - Jun", totalAmount: 132000000 },
      { label: "Q3", processed: 930, exceptions: 62, dateStr: "Jul - Sep", totalAmount: 139000000 },
    ],
    exceptionBreakdown: [
      {
        type: "DUPLICATE_INVOICE",
        label: "Duplicate Invoice / Number",
        percentage: 36,
        count: 83,
        avgResolutionTime: "2.4h",
        colorClass: "bg-indigo-600",
      },
      {
        type: "PRICE_DIFFERENCE",
        label: "Price / Rate Variance vs PO",
        percentage: 28,
        count: 65,
        avgResolutionTime: "6.1h",
        colorClass: "bg-amber-500",
      },
      {
        type: "UNKNOWN_VENDOR",
        label: "Unknown / Unverified Vendor",
        percentage: 19,
        count: 44,
        avgResolutionTime: "3.9h",
        colorClass: "bg-sky-500",
      },
      {
        type: "MISSING_PO",
        label: "Missing PO / Unlinked Record",
        percentage: 11,
        count: 26,
        avgResolutionTime: "4.8h",
        colorClass: "bg-neutral-400",
      },
      {
        type: "TAX_DIFFERENCE",
        label: "Tax / GST Mismatch",
        percentage: 6,
        count: 14,
        avgResolutionTime: "3.2h",
        colorClass: "bg-emerald-500",
      },
    ],
    stageSlas: [
      {
        stage: "Receive → Capture & OCR",
        from: "Intake",
        to: "Capture",
        avgDuration: "50 sec",
        targetSla: "< 2 min",
        status: "ON_TRACK",
        automated: true,
      },
      {
        stage: "Capture → 3-Way Match & Validation",
        from: "Validate",
        to: "Matching",
        avgDuration: "2.4 min",
        targetSla: "< 5 min",
        status: "ON_TRACK",
        automated: true,
      },
      {
        stage: "Exception Resolution (Human)",
        from: "Exception",
        to: "Resolved",
        avgDuration: "5.1 hrs",
        targetSla: "< 8 hrs",
        status: "ON_TRACK",
        automated: false,
      },
      {
        stage: "Tiered Approval Sign-Off",
        from: "Waiting Approval",
        to: "Approved",
        avgDuration: "10.4 hrs",
        targetSla: "< 24 hrs",
        status: "ON_TRACK",
        automated: false,
      },
      {
        stage: "Scheduled → ERP Sync & Settlement",
        from: "Scheduled",
        to: "Paid",
        avgDuration: "22.5 hrs",
        targetSla: "< 48 hrs",
        status: "ON_TRACK",
        automated: true,
      },
    ],
    topVendors: [
      {
        id: "v-1",
        vendorName: "Tata Steel Ltd",
        category: "Raw Materials",
        invoiceCount: 820,
        totalSpend: 158000000,
        touchlessRate: 87.5,
        avgCycleHours: 1.4,
      },
      {
        id: "v-2",
        vendorName: "Dell Technologies",
        category: "Hardware / IT",
        invoiceCount: 410,
        totalSpend: 98000000,
        touchlessRate: 80.2,
        avgCycleHours: 2.2,
      },
      {
        id: "v-3",
        vendorName: "BlueDart Express",
        category: "Logistics",
        invoiceCount: 650,
        totalSpend: 68500000,
        touchlessRate: 89.2,
        avgCycleHours: 1.1,
      },
      {
        id: "v-4",
        vendorName: "Siemens Industrial",
        category: "Automation",
        invoiceCount: 320,
        totalSpend: 54200000,
        touchlessRate: 74.8,
        avgCycleHours: 2.9,
      },
    ],
  },
};
