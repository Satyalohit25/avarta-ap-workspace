import { Role } from "../../middleware/permissions";

export interface ApprovalTier {
  name: string;
  minAmount: number;
  maxAmount: number | null; // null for unlimited
  allowedRoles: Role[];
  currency: string;
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

export const DEFAULT_EUR_TIERS: ApprovalTier[] = [
  {
    name: "Tier 1 (Standard EUR)",
    minAmount: 0,
    maxAmount: 9_000,
    allowedRoles: ["APPROVER", "FINANCE_MANAGER", "ADMINISTRATOR"],
    currency: "EUR",
  },
  {
    name: "Tier 2 (Elevated EUR)",
    minAmount: 9_000.01,
    maxAmount: 45_000,
    allowedRoles: ["FINANCE_MANAGER", "ADMINISTRATOR"],
    currency: "EUR",
  },
  {
    name: "Tier 3 (Executive EUR)",
    minAmount: 45_000.01,
    maxAmount: null,
    allowedRoles: ["ADMINISTRATOR"],
    currency: "EUR",
  },
];

export const DEFAULT_GBP_TIERS: ApprovalTier[] = [
  {
    name: "Tier 1 (Standard GBP)",
    minAmount: 0,
    maxAmount: 8_000,
    allowedRoles: ["APPROVER", "FINANCE_MANAGER", "ADMINISTRATOR"],
    currency: "GBP",
  },
  {
    name: "Tier 2 (Elevated GBP)",
    minAmount: 8_000.01,
    maxAmount: 40_000,
    allowedRoles: ["FINANCE_MANAGER", "ADMINISTRATOR"],
    currency: "GBP",
  },
  {
    name: "Tier 3 (Executive GBP)",
    minAmount: 40_000.01,
    maxAmount: null,
    allowedRoles: ["ADMINISTRATOR"],
    currency: "GBP",
  },
];

export const DEFAULT_CONFIGURED_TIERS: Record<string, ApprovalTier[]> = {
  INR: DEFAULT_INR_TIERS,
  USD: DEFAULT_USD_TIERS,
  EUR: DEFAULT_EUR_TIERS,
  GBP: DEFAULT_GBP_TIERS,
};

/**
 * Stored FX rates: value of 1 foreign currency unit in base USD.
 * Used for tier evaluation when a currency does not have dedicated tier definitions.
 */
export const DEFAULT_STORED_FX_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 1.08,
  GBP: 1.27,
  CAD: 0.74,
  SGD: 0.75,
  AUD: 0.65,
  // 10,000 JPY is ~65 USD
  JPY: 0.0065,
  // 10,000 KWD is ~32,500 USD
  KWD: 3.25,
};

// Dynamic runtime configuration stores (T-204)
let customCurrencyTiers: Record<string, ApprovalTier[]> = {};
let customStoredFxRates: Record<string, number> = {};

export function setCurrencyTiers(currency: string, tiers: ApprovalTier[]): void {
  customCurrencyTiers[currency.toUpperCase()] = tiers;
}

export function getCurrencyTiers(currency: string): ApprovalTier[] | undefined {
  const code = currency.toUpperCase();
  return customCurrencyTiers[code] || DEFAULT_CONFIGURED_TIERS[code];
}

export function setStoredFxRate(currency: string, rateToUSD: number): void {
  customStoredFxRates[currency.toUpperCase()] = rateToUSD;
}

export function getStoredFxRate(currency: string): number | undefined {
  const code = currency.toUpperCase();
  return customStoredFxRates[code] ?? DEFAULT_STORED_FX_RATES[code];
}

export function resetThresholdsConfig(): void {
  customCurrencyTiers = {};
  customStoredFxRates = {};
}

function findMatchingTier(amount: number, tiers: ApprovalTier[]): ApprovalTier {
  for (const tier of tiers) {
    if (tier.maxAmount === null) {
      if (amount >= tier.minAmount) return tier;
    } else if (amount <= tier.maxAmount) {
      return tier;
    }
  }
  return tiers[tiers.length - 1];
}

/**
 * Resolves approval tier for a given amount and currency.
 * AGENTS.md / T-204:
 * 1. Checks configured tiers for the currency.
 * 2. If no configured tiers, converts amount using stored FX rate to USD base tiers.
 * 3. If currency is unconfigured and has no FX rate, fails closed to ADMINISTRATOR and logs a warning.
 */
export function getTierForAmount(amount: number, currency = "INR"): ApprovalTier {
  const code = currency.toUpperCase();

  // 1. Configured tiers
  const configuredTiers = getCurrencyTiers(code);
  if (configuredTiers && configuredTiers.length > 0) {
    return findMatchingTier(amount, configuredTiers);
  }

  // 2. Conversion via stored FX rate to USD base tiers
  const fxRate = getStoredFxRate(code);
  if (fxRate !== undefined && fxRate > 0) {
    const amountInUSD = amount * fxRate;
    const usdTier = findMatchingTier(amountInUSD, DEFAULT_USD_TIERS);
    return {
      name: `${usdTier.name} (FX ${code} -> USD)`,
      minAmount: usdTier.minAmount / fxRate,
      maxAmount: usdTier.maxAmount === null ? null : usdTier.maxAmount / fxRate,
      allowedRoles: usdTier.allowedRoles,
      currency: code,
    };
  }

  // 3. Unconfigured currency: fail closed and log warning (T-204 requirement)
  console.warn(
    `[APPROVAL THRESHOLD] Unconfigured currency "${currency}". Failing closed: strictly requiring ADMINISTRATOR approval.`
  );
  return {
    name: `Fail-Closed (${code} Unconfigured - Administrator Only)`,
    minAmount: 0,
    maxAmount: null,
    allowedRoles: ["ADMINISTRATOR"],
    currency: code,
  };
}

export function getAllowedRolesForAmount(amount: number, currency = "INR"): Role[] {
  return getTierForAmount(amount, currency).allowedRoles;
}

export function canRoleApproveAmount(role: Role, amount: number, currency = "INR"): boolean {
  const allowed = getAllowedRolesForAmount(amount, currency);
  return allowed.includes(role);
}
