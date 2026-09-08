import { ReactNode } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "../../lib/utils";

export interface TooltipProps {
  content: string;
  children: ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <span className="inline-block cursor-default">{children}</span>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side="top"
            align="center"
            className={cn(
              "z-50 overflow-hidden rounded-xs bg-neutral-900 dark:bg-neutral-100 px-2 py-1 text-micro font-medium text-white dark:text-neutral-900 shadow-xs animate-in fade-in-0 zoom-in-95",
              className
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-neutral-900 dark:fill-neutral-100" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
