import { Role } from "../../middleware/permissions";

export interface ApprovalTier {
  name: string;
  minAmount: number;
  maxAmount: number | null; // null for unlimited
  allowedRoles: Role[];
}

/**
 * AGENTS.md / Blueprint default approval tiers for SME AP workflow.
 * Tier 1 (<= ₹1,00,000): Standard approvers, finance managers, admins.
 * Tier 2 (₹1,00,000.01 - ₹5,00,000): Finance managers and admins only.
 * Tier 3 (> ₹5,00,000): Administrators only.
 */
export const DEFAULT_APPROVAL_TIERS: ApprovalTier[] = [
  {
    name: "Tier 1 (Standard)",
    minAmount: 0,
    maxAmount: 100_000,
    allowedRoles: ["APPROVER", "FINANCE_MANAGER", "ADMINISTRATOR"],
  },
  {
    name: "Tier 2 (Elevated)",
    minAmount: 100_000.01,
    maxAmount: 500_000,
    allowedRoles: ["FINANCE_MANAGER", "ADMINISTRATOR"],
  },
  {
    name: "Tier 3 (Executive)",
    minAmount: 500_000.01,
    maxAmount: null,
    allowedRoles: ["ADMINISTRATOR"],
  },
];

export function getTierForAmount(amount: number): ApprovalTier {
  for (const tier of DEFAULT_APPROVAL_TIERS) {
    if (tier.maxAmount === null) {
      if (amount >= tier.minAmount) return tier;
    } else if (amount <= tier.maxAmount) {
      return tier;
    }
  }
  return DEFAULT_APPROVAL_TIERS[DEFAULT_APPROVAL_TIERS.length - 1];
}

export function getAllowedRolesForAmount(amount: number): Role[] {
  return getTierForAmount(amount).allowedRoles;
}

export function canRoleApproveAmount(role: Role, amount: number): boolean {
  const allowed = getAllowedRolesForAmount(amount);
  return allowed.includes(role);
}
