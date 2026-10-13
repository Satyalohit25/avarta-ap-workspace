import { Role } from "../../middleware/permissions";

export interface ApprovalTier {
  name: string;
  minAmount: number;
  maxAmount: number | null; // null for unlimited
  allowedRoles: Role[];
  currency: "INR" | "USD" | "ALL";
}

/**
 * Aligned Approval Tiers with zero gaps across INR and USD.
 * INR Thresholds:
 * - Tier 1: <= ₹1,00,000 (Standard: Approver, Finance Manager, Administrator)
 * - Tier 2: ₹1,00,000.01 - ₹5,00,000 (Elevated: Finance Manager, Administrator)
 * - Tier 3: > ₹5,00,000 (Executive: Administrator)
 *
 * USD / Non-INR Thresholds (Fixed document tier gap between $10,000 and $50,000):
 * - Tier 1: <= $10,000 (Standard: Approver, Finance Manager, Administrator)
 * - Tier 2: $10,000.01 - $50,000 (Elevated: Finance Manager, Administrator)
 * - Tier 3: > $50,000 (Executive: Administrator)
 */
export const DEFAULT_INR_TIERS: ApprovalTier[] = [
  {
    name: "Tier 1 (Standard)",
    minAmount: 0,
    maxAmount: 100_000,
    allowedRoles: ["APPROVER", "FINANCE_MANAGER", "ADMINISTRATOR"],
    currency: "INR",
  },
  {
    name: "Tier 2 (Elevated)",
    minAmount: 100_000.01,
    maxAmount: 500_000,
    allowedRoles: ["FINANCE_MANAGER", "ADMINISTRATOR"],
    currency: "INR",
  },
  {
    name: "Tier 3 (Executive)",
    minAmount: 500_000.01,
    maxAmount: null,
    allowedRoles: ["ADMINISTRATOR"],
    currency: "INR",
  },
];

export const DEFAULT_USD_TIERS: ApprovalTier[] = [
  {
    name: "Tier 1 (Standard USD)",
    minAmount: 0,
    maxAmount: 10_000,
    allowedRoles: ["APPROVER", "FINANCE_MANAGER", "ADMINISTRATOR"],
    currency: "USD",
  },
  {
    name: "Tier 2 (Elevated USD)",
    minAmount: 10_000.01,
    maxAmount: 50_000,
    allowedRoles: ["FINANCE_MANAGER", "ADMINISTRATOR"],
    currency: "USD",
  },
  {
    name: "Tier 3 (Executive USD)",
    minAmount: 50_000.01,
    maxAmount: null,
    allowedRoles: ["ADMINISTRATOR"],
    currency: "USD",
  },
];

export function getTierForAmount(amount: number, currency = "INR"): ApprovalTier {
  const tiers = currency.toUpperCase() === "INR" ? DEFAULT_INR_TIERS : DEFAULT_USD_TIERS;

  for (const tier of tiers) {
    if (tier.maxAmount === null) {
      if (amount >= tier.minAmount) return tier;
    } else if (amount <= tier.maxAmount) {
      return tier;
    }
  }
  return tiers[tiers.length - 1];
}

export function getAllowedRolesForAmount(amount: number, currency = "INR"): Role[] {
  return getTierForAmount(amount, currency).allowedRoles;
}

export function canRoleApproveAmount(role: Role, amount: number, currency = "INR"): boolean {
  const allowed = getAllowedRolesForAmount(amount, currency);
  return allowed.includes(role);
}
