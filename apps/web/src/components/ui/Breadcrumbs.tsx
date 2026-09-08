import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { cn } from "../../lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showBackButton?: boolean;
  backHref?: string;
  backLabel?: string;
  onBack?: () => void;
  className?: string;
}

export function Breadcrumbs({
  items,
  showBackButton = false,
  backHref,
  backLabel = "Back",
  onBack,
  className,
}: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-3 text-body-sm select-none", className)}
    >
      {showBackButton && (
        <>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1 text-neutral-500 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-100 transition-colors font-medium mr-1 py-1 cursor-pointer"
              aria-label={backLabel}
            >
              <ArrowLeft size={14} />
              <span className="text-caption">{backLabel}</span>
            </button>
          ) : backHref ? (
            <Link
              to={backHref}
              className="inline-flex items-center gap-1 text-neutral-500 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-100 transition-colors font-medium mr-1 py-1"
              aria-label={backLabel}
            >
              <ArrowLeft size={14} />
              <span className="text-caption">{backLabel}</span>
            </Link>
          ) : null}
          <span className="text-neutral-300 dark:text-zinc-700 select-none">|</span>
        </>
      )}

      <ol className="flex items-center gap-1.5 flex-wrap">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;

          return (
            <li key={`${item.label}-${idx}`} className="inline-flex items-center gap-1.5">
              {idx > 0 && (
                <ChevronRight
                  size={13}
                  className="text-neutral-400 dark:text-zinc-600 shrink-0"
                  aria-hidden="true"
                />
              )}
              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  className="text-neutral-600 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-100 transition-colors font-medium"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "font-medium truncate max-w-[240px]",
                    isLast
                      ? "text-neutral-900 dark:text-zinc-100 font-semibold"
                      : "text-neutral-600 dark:text-zinc-400",
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
