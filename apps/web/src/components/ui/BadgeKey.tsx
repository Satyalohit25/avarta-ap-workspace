import { ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface BadgeKeyProps {
  children: ReactNode;
  className?: string;
}

export function BadgeKey({ children, className }: BadgeKeyProps) {
  return (
    <span
      className={cn(
        "text-micro font-mono bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400 px-2 py-0.5 rounded-full inline-block",
        className
      )}
    >
      {children}
    </span>
  );
}
