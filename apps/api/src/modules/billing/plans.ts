export type PlanTier = "STARTER" | "GROWTH" | "ENTERPRISE";

export interface PlanFeatures {
  byokAi: boolean;
  byodbSovereignty: boolean;
  erpXmlGateway: boolean; // Tally Prime XML
  threeWayMatching: boolean;
  advancedApprovals: boolean; // Dual sign-off, tiered thresholds
  auditExport: boolean;
  customSla: boolean;
}

export interface PlanDefinition {
  id: PlanTier;
  name: string;
  tagline: string;
  priceMonthlyInr: number;
  priceMonthlyUsd: number;
  monthlyInvoiceLimit: number;
  seatLimit: number;
  features: PlanFeatures;
}

export const SAAS_PLANS: Record<PlanTier, PlanDefinition> = {
  STARTER: {
    id: "STARTER",
    name: "Starter",
    tagline: "For small teams automating their initial accounts payable workflows",
    priceMonthlyInr: 4999,
    priceMonthlyUsd: 59,
    monthlyInvoiceLimit: 50,
    seatLimit: 2,
    features: {
      byokAi: false,
      byodbSovereignty: false,
      erpXmlGateway: false,
      threeWayMatching: false,
      advancedApprovals: false,
      auditExport: true,
      customSla: false,
    },
  },
  GROWTH: {
    id: "GROWTH",
    name: "Growth",
    tagline: "For scaling mid-market enterprises with automated 3-way matching and ERP integrations",
    priceMonthlyInr: 19999,
    priceMonthlyUsd: 249,
    monthlyInvoiceLimit: 500,
    seatLimit: 10,
    features: {
      byokAi: true,
      byodbSovereignty: false,
      erpXmlGateway: true,
      threeWayMatching: true,
      advancedApprovals: true,
      auditExport: true,
      customSla: false,
    },
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    name: "Enterprise Sovereignty",
    tagline: "Complete database sovereignty (BYODB), custom AI keys (BYOK), and unlimited throughput",
    priceMonthlyInr: 59999,
    priceMonthlyUsd: 799,
    monthlyInvoiceLimit: Infinity,
    seatLimit: Infinity,
    features: {
      byokAi: true,
      byodbSovereignty: true,
      erpXmlGateway: true,
      threeWayMatching: true,
      advancedApprovals: true,
      auditExport: true,
      customSla: true,
    },
  },
};
