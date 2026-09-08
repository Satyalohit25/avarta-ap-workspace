import { HTMLAttributes } from "react";
import { cn } from "../lib/utils";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-neutral-100 dark:bg-zinc-800", className)}
      {...props}
    />
  );
}

// Doc 08 §8.25 — skeletons only, never a page-level spinner.
export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-md" />
      ))}
    </div>
  );
}
