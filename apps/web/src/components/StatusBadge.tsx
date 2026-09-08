/**
 * Avarta AP Workspace — Multi-Signal Status Badge Component
 * Traces back to design(2).md §4.3 & AGENTS.md:
 * COLOR IS NEVER THE SOLE STATUS INDICATOR.
 * Every badge MUST pair Icon + Color Pill + Explicit Text Label.
 * NEVER USE EMOJIS — Uses standard Lucide line icons exclusively.
 */
import {
  LucideIcon,
  Inbox,
  FileText,
  RefreshCw,
  Check,
  Clock,
  AlertTriangle,
  X,
  Calendar,
  CreditCard,
  Link2,
  Archive,
  CircleDot,
  Ban,
  ShieldAlert,
} from "lucide-react";

export interface StatusBadgeProps {
  status: string;
  variant?: "success" | "warning" | "error" | "info" | "neutral";
  size?: "sm" | "md";
}

export const STATUS_VARIANT: Record<string, StatusBadgeProps["variant"]> = {
  RECEIVED: "neutral",
  CAPTURED: "info",
  VALIDATING: "info",
  VALIDATED: "info",
  PROCESSING: "info",
  EXCEPTION: "error",
  VALIDATION_FAILED: "error",
  MATCHING_FAILED: "error",
  PENDING_APPROVAL: "warning",
  WAITING_APPROVAL: "warning",
  APPROVED: "success",
  REJECTED: "error",
  SCHEDULED: "info",
  AWAITING_SCHEDULE: "neutral",
  PROCESSING_PAYMENT: "info",
  PAID: "success",
  SYNCED: "success",
  ARCHIVED: "neutral",
  OPEN: "info",
  CLOSED: "success",
  CANCELLED: "neutral",
  ACTIVE: "success",
  BLOCKED: "error",
  FAILED: "error",
  MATCHED: "success",
  UNMATCHED: "neutral",
  PARTIAL_MATCH: "warning",
  DISCREPANCY: "warning",
};

export const STATUS_LABEL: Record<string, string> = {
  RECEIVED: "Received",
  CAPTURED: "Captured",
  VALIDATING: "Validating",
  VALIDATED: "Validated",
  PROCESSING: "Processing",
  EXCEPTION: "Exception",
  VALIDATION_FAILED: "Validation Failed",
  MATCHING_FAILED: "Matching Failed",
  PENDING_APPROVAL: "Waiting Approval",
  WAITING_APPROVAL: "Waiting Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SCHEDULED: "Scheduled",
  AWAITING_SCHEDULE: "Awaiting Schedule",
  PROCESSING_PAYMENT: "Processing Payment",
  PAID: "Paid",
  SYNCED: "Synced",
  ARCHIVED: "Archived",
  OPEN: "Open",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
  ACTIVE: "Active",
  BLOCKED: "Blocked",
  FAILED: "Failed",
  MATCHED: "Matched",
  UNMATCHED: "Unmatched",
  PARTIAL_MATCH: "Partial Match",
  DISCREPANCY: "Discrepancy",
};

export const STATUS_ICON: Record<string, LucideIcon> = {
  RECEIVED: Inbox,
  CAPTURED: FileText,
  VALIDATING: RefreshCw,
  VALIDATED: Check,
  PROCESSING: Clock,
  EXCEPTION: AlertTriangle,
  VALIDATION_FAILED: AlertTriangle,
  MATCHING_FAILED: AlertTriangle,
  PENDING_APPROVAL: Clock,
  WAITING_APPROVAL: Clock,
  APPROVED: Check,
  REJECTED: X,
  SCHEDULED: Calendar,
  AWAITING_SCHEDULE: Clock,
  PROCESSING_PAYMENT: CreditCard,
  PAID: Check,
  SYNCED: Link2,
  ARCHIVED: Archive,
  OPEN: CircleDot,
  CLOSED: Check,
  CANCELLED: Ban,
  ACTIVE: Check,
  BLOCKED: Ban,
  FAILED: X,
  MATCHED: Check,
  UNMATCHED: AlertTriangle,
  PARTIAL_MATCH: Clock,
  DISCREPANCY: AlertTriangle,
};

export const VARIANT_CLASSES: Record<
  NonNullable<StatusBadgeProps["variant"]>,
  { badge: string; dot: string }
> = {
  success: {
    badge:
      "bg-success-50/80 dark:bg-zinc-900 text-success-700 dark:text-success-300 border border-success-500/20 dark:border-success-500/30",
    dot: "bg-success-500",
  },
  warning: {
    badge:
      "bg-warning-50/80 dark:bg-zinc-900 text-warning-700 dark:text-warning-300 border border-warning-500/20 dark:border-warning-500/30",
    dot: "bg-warning-500 animate-pulse",
  },
  error: {
    badge:
      "bg-error-50/80 dark:bg-zinc-900 text-error-700 dark:text-error-300 border border-error-500/20 dark:border-error-500/30",
    dot: "bg-error-500",
  },
  info: {
    badge:
      "bg-neutral-100 dark:bg-zinc-900 text-neutral-800 dark:text-zinc-200 border border-neutral-200 dark:border-zinc-800",
    dot: "bg-zinc-400 dark:bg-zinc-400",
  },
  neutral: {
    badge:
      "bg-neutral-100/80 dark:bg-zinc-900 text-neutral-600 dark:text-zinc-300 border border-neutral-200/60 dark:border-zinc-800/60",
    dot: "bg-neutral-400 dark:bg-zinc-500",
  },
};

export function StatusBadge({
  status,
  variant,
  size = "md",
}: StatusBadgeProps) {
  const resolvedVariant = variant ?? STATUS_VARIANT[status] ?? "neutral";
  const label = STATUS_LABEL[status] ?? status;
  const IconComponent = STATUS_ICON[status];
  const styleConfig = VARIANT_CLASSES[resolvedVariant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-medium ${
        size === "sm" ? "px-2 py-0.5 text-micro" : "px-2.5 py-1 text-label"
      } ${styleConfig.badge}`}
    >
      {IconComponent && IconComponent !== CircleDot ? (
        <IconComponent
          size={size === "sm" ? 11 : 12}
          strokeWidth={1.75}
          className="shrink-0"
          aria-hidden="true"
        />
      ) : (
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${styleConfig.dot}`}
          aria-hidden="true"
        />
      )}
      <span className="font-mono tracking-tight">{label}</span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Unified Operational Severity & Urgency Badge Component
// ─────────────────────────────────────────────────────────────
export type UrgencySeverity = "routine" | "warning" | "breached" | "urgent";

export interface UrgencyBadgeProps {
  urgency: UrgencySeverity;
  label: string;
  icon?: LucideIcon;
  size?: "sm" | "md";
}

const URGENCY_STYLES: Record<UrgencySeverity, { badge: string; icon: LucideIcon }> = {
  routine: {
    badge: "bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300 border border-neutral-200 dark:border-zinc-700",
    icon: Clock,
  },
  warning: {
    badge: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
    icon: AlertTriangle,
  },
  breached: {
    badge: "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-semibold",
    icon: ShieldAlert,
  },
  urgent: {
    badge: "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-semibold",
    icon: ShieldAlert,
  },
};

export function UrgencyBadge({ urgency, label, icon, size = "sm" }: UrgencyBadgeProps) {
  const config = URGENCY_STYLES[urgency];
  const IconComponent = icon ?? config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-mono font-medium ${
        size === "sm" ? "px-2.5 py-0.5 text-micro" : "px-3 py-1 text-label"
      } ${config.badge}`}
    >
      <IconComponent size={size === "sm" ? 11 : 13} className="shrink-0" />
      <span>{label}</span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Canonical Vendor-Facing Status Translation Helper
// ─────────────────────────────────────────────────────────────
export interface VendorStatusTranslation {
  stage: number; // 1: Received, 2: Under Review, 3: Approved for Payment, 4: Paid
  label: string;
  description: string;
}

export function getVendorFacingStatus(internalStatus: string): VendorStatusTranslation {
  const normalized = (internalStatus || "").toUpperCase();

  if (normalized === "PAID") {
    return { stage: 4, label: "Paid", description: "Remittance dispatched" };
  }
  if (normalized === "APPROVED" || normalized === "SCHEDULED" || normalized === "SYNCED") {
    return { stage: 3, label: "Approved for Payment", description: "Sign-off complete & scheduled" };
  }
  if (
    normalized === "PROCESSING" ||
    normalized === "PENDING_APPROVAL" ||
    normalized === "WAITING_APPROVAL" ||
    normalized === "EXCEPTION" ||
    normalized === "VALIDATING" ||
    normalized === "MATCHING"
  ) {
    return { stage: 2, label: "Under Review", description: "3-Way verification in progress" };
  }
  return { stage: 1, label: "Received", description: "Logged in ingestion queue" };
}
