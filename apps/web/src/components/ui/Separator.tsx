import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "../../lib/utils";

export interface SeparatorProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Separator({ orientation = "horizontal", className }: SeparatorProps) {
  return (
    <SeparatorPrimitive.Root
      orientation={orientation}
      className={cn(
        "shrink-0 bg-neutral-200 dark:bg-zinc-800",
        orientation === "horizontal" ? "h-px w-full" : "w-px self-stretch",
        className
      )}
    />
  );
}
