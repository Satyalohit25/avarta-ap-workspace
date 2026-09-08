import { ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}

/**
 * SegmentedControl primitive inspired by Astryx Segmented Control.
 * Ideal for dense toggle controls (timeframes, view modes, linear filters).
 */
export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = "md",
  className,
  ariaLabel = "View options",
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center rounded-lg bg-neutral-100 dark:bg-zinc-800/80 p-0.5 text-neutral-600 dark:text-zinc-400 border border-neutral-200/60 dark:border-zinc-700/50",
        className
      )}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-all duration-150 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
              size === "sm" ? "px-2.5 py-1 text-micro" : "px-3 py-1.5 text-body-sm",
              isSelected
                ? "bg-white dark:bg-zinc-900 text-neutral-900 dark:text-zinc-100 font-semibold shadow-xs"
                : "hover:text-neutral-900 dark:hover:text-zinc-200 hover:bg-neutral-200/50 dark:hover:bg-zinc-700/50",
              option.disabled && "opacity-40 cursor-not-allowed"
            )}
          >
            {option.icon && (
              <span
                className={cn(
                  "shrink-0",
                  isSelected
                    ? "text-neutral-900 dark:text-zinc-100"
                    : "text-neutral-500 dark:text-zinc-400"
                )}
              >
                {option.icon}
              </span>
            )}
            <span>{option.label}</span>
            {option.badge !== undefined && (
              <span
                className={cn(
                  "ml-1 px-1.5 py-0.2 rounded-full font-mono text-[10px] leading-tight",
                  isSelected
                    ? "bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300"
                    : "bg-neutral-200/60 dark:bg-zinc-700/60 text-neutral-500 dark:text-zinc-400"
                )}
              >
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
