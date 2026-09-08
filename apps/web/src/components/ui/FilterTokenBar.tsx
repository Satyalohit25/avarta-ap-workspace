import { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

export interface FilterToken {
  id: string;
  category: string;
  label: ReactNode;
  onRemove: () => void;
}

export interface FilterTokenBarProps {
  tokens: FilterToken[];
  onClearAll?: () => void;
  className?: string;
  count?: number;
}

/**
 * FilterTokenBar primitive inspired by Astryx Filterable Table progressive filtering token bar.
 * Renders active filters as dismissible chips with category labels and a global clear action.
 */
export function FilterTokenBar({
  tokens,
  onClearAll,
  className,
  count,
}: FilterTokenBarProps) {
  if (tokens.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Active filters"
      className={cn(
        "flex flex-wrap items-center gap-2 py-1.5 px-3 rounded-lg bg-neutral-50 dark:bg-zinc-900/60 border border-neutral-200/70 dark:border-zinc-800 text-body-sm transition-all",
        className
      )}
    >
      <span className="text-micro font-semibold uppercase tracking-wider text-neutral-400 dark:text-zinc-500 mr-1">
        Active Filters {count !== undefined && `(${count})`}:
      </span>

      {tokens.map((token) => (
        <span
          key={token.id}
          className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700/80 text-micro text-neutral-800 dark:text-zinc-200 shadow-2xs group animate-in fade-in zoom-in-95 duration-100"
        >
          <span className="font-semibold text-neutral-500 dark:text-zinc-400">
            {token.category}:
          </span>
          <span className="font-medium text-neutral-900 dark:text-zinc-100 font-mono">
            {token.label}
          </span>
          <button
            type="button"
            onClick={token.onRemove}
            aria-label={`Remove filter ${token.category} ${token.label}`}
            className="p-0.5 rounded hover:bg-neutral-100 dark:hover:bg-zinc-700 text-neutral-400 hover:text-neutral-700 dark:hover:text-zinc-200 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <X size={12} strokeWidth={2.5} />
          </button>
        </span>
      ))}

      {onClearAll && tokens.length > 0 && (
        <button
          type="button"
          onClick={onClearAll}
          className="ml-auto text-micro font-medium text-indigo-600 dark:text-indigo-400 hover:underline hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors focus:outline-none"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
