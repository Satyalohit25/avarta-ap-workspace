import { ReactNode } from "react";
import { cn } from "../../lib/utils";

export type StatusDotVariant = "success" | "warning" | "error" | "info" | "neutral" | "brand";

export interface StatusDotProps {
  variant?: StatusDotVariant;
  label?: ReactNode;
  pulse?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const DOT_COLORS: Record<StatusDotVariant, { dot: string; ping?: string; ring?: string }> = {
  success: {
    dot: "bg-emerald-500",
    ping: "bg-emerald-400",
    ring: "ring-emerald-500/20",
  },
  warning: {
    dot: "bg-amber-500",
    ping: "bg-amber-400",
    ring: "ring-amber-500/20",
  },
  error: {
    dot: "bg-rose-500",
    ping: "bg-rose-400",
    ring: "ring-rose-500/20",
  },
  info: {
    dot: "bg-blue-500",
    ping: "bg-blue-400",
    ring: "ring-blue-500/20",
  },
  brand: {
    dot: "bg-indigo-600 dark:bg-indigo-400",
    ping: "bg-indigo-400",
    ring: "ring-indigo-500/20",
  },
  neutral: {
    dot: "bg-neutral-400 dark:bg-zinc-500",
    ring: "ring-neutral-400/20",
  },
};

/**
 * StatusDot primitive inspired by Astryx Status Dot.
 * Lightweight, accessible indicator ideal for high-density tables and compact rows.
 */
export function StatusDot({
  variant = "neutral",
  label,
  pulse = false,
  size = "md",
  className,
}: StatusDotProps) {
  const styles = DOT_COLORS[variant];
  const dotSize = size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";

  return (
    <span className={cn("inline-flex items-center gap-2 select-none", className)}>
      <span className="relative flex shrink-0 items-center justify-center">
        {pulse && styles.ping && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              styles.ping
            )}
          />
        )}
        <span
          className={cn(
            "relative inline-flex rounded-full ring-2",
            dotSize,
            styles.dot,
            styles.ring
          )}
        />
      </span>
      {label && (
        <span className="text-body-sm font-medium text-neutral-700 dark:text-zinc-300">
          {label}
        </span>
      )}
    </span>
  );
}
