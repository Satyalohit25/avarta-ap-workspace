import { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  width?: string;
}

export function Sheet({ isOpen, onClose, title, subtitle, children, width = "max-w-lg" }: SheetProps) {
  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-neutral-950/50 dark:bg-zinc-950/75 backdrop-blur-sm transition-opacity duration-300" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-y-0 right-0 z-50 w-full sm:w-auto",
            width,
            "bg-white dark:bg-zinc-900 border-l border-neutral-200 dark:border-zinc-800 shadow-xl flex flex-col focus:outline-none transition-transform duration-300 ease-in-out"
          )}
        >
          <div className="p-5 border-b border-neutral-200 dark:border-zinc-800 flex items-center justify-between bg-neutral-50 dark:bg-zinc-800/50 gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="text-h3 text-neutral-900 dark:text-zinc-100 font-semibold tracking-tight whitespace-nowrap truncate min-w-0">
                {title}
              </DialogPrimitive.Title>
              {subtitle && (
                <DialogPrimitive.Description className="text-body-sm text-neutral-500 dark:text-zinc-400 mt-0.5 whitespace-nowrap truncate min-w-0">
                  {subtitle}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              onClick={onClose}
              className="p-1.5 rounded-md text-neutral-400 dark:text-zinc-500 hover:text-neutral-700 dark:hover:text-zinc-200 hover:bg-neutral-200/60 dark:hover:bg-zinc-700/60 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label="Close panel"
            >
              <X size={18} strokeWidth={1.75} aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-neutral-900 dark:text-zinc-100">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
