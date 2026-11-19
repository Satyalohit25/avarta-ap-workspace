/**
 * Avarta AP Workspace — Canonical Permissions & Role Gates
 * Traces to AGENTS.md §Canonical vocabulary & T-403:
 *   Roles (5): Administrator, Finance Manager, Finance Executive, Approver, Read Only.
 *
 * Frontend role checks read from this same canonical source.
 */

export const CANONICAL_ROLES = [
  "ADMINISTRATOR",
  "FINANCE_MANAGER",
  "FINANCE_EXECUTIVE",
  "APPROVER",
  "READ_ONLY",
] as const;

export type Role = (typeof CANONICAL_ROLES)[number];

export function canApprove(role?: string | null): boolean {
  return role === "ADMINISTRATOR" || role === "FINANCE_MANAGER" || role === "APPROVER";
}

export function isAdmin(role?: string | null): boolean {
  return role === "ADMINISTRATOR";
}

export function canExecutePayments(role?: string | null): boolean {
  return role === "ADMINISTRATOR" || role === "FINANCE_MANAGER";
}

export function canManageBilling(role?: string | null): boolean {
  return role === "ADMINISTRATOR" || role === "FINANCE_MANAGER";
}

export function canViewAudit(role?: string | null): boolean {
  return role === "ADMINISTRATOR" || role === "FINANCE_MANAGER";
}

export function canCreateInvoices(role?: string | null): boolean {
  return role === "ADMINISTRATOR" || role === "FINANCE_MANAGER" || role === "FINANCE_EXECUTIVE";
}

export function canResolveExceptions(role?: string | null): boolean {
  return role === "ADMINISTRATOR" || role === "FINANCE_MANAGER" || role === "FINANCE_EXECUTIVE";
}

export function isMutatingMethod(method: string): boolean {
  const m = method.toUpperCase();
  return m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE";
}
