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

export const DEFAULT_EMPTY_OPERATIONAL_DATASET: OperationalReportDataset = {
  kpis: {
    straightThroughRate: {
      title: "Straight-Through Processing (STP)",
      value: "100.0%",
      subtitle: "Touchless match rate",
    },
    avgCycleTime: {
      title: "Intake-to-Schedule Cycle Time",
      value: "0.0 Hours",
      subtitle: "Intake to approval duration",
    },
    exceptionResolutionTime: {
      title: "Exception Resolution Velocity",
      value: "0.0 Hours",
      subtitle: "Median resolution turnaround",
    },
    totalSpendVolume: {
      title: "Total Spend Processed",
      value: "₹ 0",
      subtitle: "0 invoices in period",
    },
  },
  throughputSeries: [],
  exceptionBreakdown: [],
  stageSlas: [],
  topVendors: [],
};
