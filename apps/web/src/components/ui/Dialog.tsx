import { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "./Button";
import { cn } from "../../lib/utils";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  variant?: "primary" | "destructive";
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
  isPending?: boolean;
  confirmDisabled?: boolean;
  children?: ReactNode;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<DialogProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-xl",
  xl: "max-w-2xl",
  "2xl": "max-w-4xl",
  "3xl": "max-w-5xl",
  full: "max-w-[96vw]",
};

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel,
  onConfirm,
  variant = "primary",
  size = "md",
  isPending = false,
  confirmDisabled = false,
  children,
  className,
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-neutral-950/60 dark:bg-zinc-950/80 backdrop-blur-sm transition-opacity duration-200" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 w-[95vw] max-h-[90vh] flex flex-col shadow-2xl focus:outline-none transition-all duration-200 overflow-hidden",
            SIZE_CLASSES[size],
            className
          )}
        >
          {/* Header with Title & Close Button */}
          <div className="border-b border-neutral-200/70 dark:border-zinc-800 pb-3.5 flex items-start justify-between gap-4 shrink-0">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="text-h3 text-neutral-900 dark:text-zinc-100 font-semibold tracking-tight truncate min-w-0">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-body-sm text-neutral-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>

            <DialogPrimitive.Close asChild>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-zinc-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0 -mr-1.5 -mt-1"
                aria-label="Close dialog"
              >
                <span className="text-lg leading-none font-bold select-none">&times;</span>
              </button>
            </DialogPrimitive.Close>
          </div>

          {/* Comfortable Scrollable Body */}
          <div className="flex-1 overflow-y-auto py-4 px-0.5 space-y-4 pr-1.5 focus:outline-none min-h-0">
            {children}
          </div>
          {onConfirm && (
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button
                variant={variant === "destructive" ? "destructive" : "primary"}
                onClick={onConfirm}
                disabled={isPending || confirmDisabled}
              >
                {isPending ? "Confirming..." : confirmLabel}
              </Button>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
