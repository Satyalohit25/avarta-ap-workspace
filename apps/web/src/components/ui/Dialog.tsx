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
  isPending?: boolean;
  confirmDisabled?: boolean;
  children?: ReactNode;
  className?: string;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel,
  onConfirm,
  variant = "primary",
  isPending = false,
  confirmDisabled = false,
  children,
  className,
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-neutral-950/50 dark:bg-zinc-950/75 backdrop-blur-sm transition-opacity duration-200" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl p-6 max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl focus:outline-none transition-all duration-200 overflow-hidden",
            className
          )}
        >
          <div className="border-b border-neutral-200/60 dark:border-zinc-800 pb-3">
            <DialogPrimitive.Title className="text-h3 text-neutral-900 dark:text-zinc-100 font-semibold tracking-tight whitespace-nowrap truncate min-w-0">
              {title}
            </DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="text-body-sm text-neutral-500 dark:text-zinc-400 mt-1 leading-relaxed">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
          {children}
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
