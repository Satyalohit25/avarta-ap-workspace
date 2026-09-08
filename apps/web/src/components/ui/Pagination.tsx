import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 25, 50],
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <nav
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-neutral-200 dark:border-zinc-800 text-body-sm text-neutral-600 dark:text-zinc-400 select-none",
        className,
      )}
      aria-label="Pagination"
    >
      {/* Left: Summary and Page Size Selector */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <span className="text-caption font-medium">
          Showing <span className="font-semibold text-neutral-900 dark:text-zinc-100 tabular-nums">{startItem}</span>
          –
          <span className="font-semibold text-neutral-900 dark:text-zinc-100 tabular-nums">{endItem}</span> of{" "}
          <span className="font-semibold text-neutral-900 dark:text-zinc-100 tabular-nums">{totalItems}</span> results
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-caption">
            <span className="hidden md:inline text-neutral-500 dark:text-zinc-500">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="px-2 py-1 rounded border border-neutral-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-neutral-800 dark:text-zinc-200 text-caption font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              aria-label="Rows per page"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / page
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className="inline-flex items-center justify-center h-8 px-2.5 rounded-md border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-neutral-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-zinc-800 text-caption font-medium transition-colors shadow-2xs"
        >
          <ChevronLeft size={14} className="mr-1" />
          <span>Prev</span>
        </button>

        <div className="hidden sm:flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-8 h-8 flex items-center justify-center text-neutral-400 dark:text-zinc-600 font-mono text-caption"
                >
                  …
                </span>
              );
            }

            const isCurrent = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={isCurrent ? "page" : undefined}
                className={cn(
                  "h-8 min-w-[32px] px-2 rounded-md font-mono text-caption font-medium transition-colors cursor-pointer",
                  isCurrent
                    ? "bg-indigo-600 text-white dark:bg-indigo-500 dark:text-white shadow-2xs"
                    : "text-neutral-700 dark:text-zinc-300 hover:bg-neutral-100 dark:hover:bg-zinc-800",
                )}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className="inline-flex items-center justify-center h-8 px-2.5 rounded-md border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-neutral-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-zinc-800 text-caption font-medium transition-colors shadow-2xs"
        >
          <span>Next</span>
          <ChevronRight size={14} className="ml-1" />
        </button>
      </div>
    </nav>
  );
}
