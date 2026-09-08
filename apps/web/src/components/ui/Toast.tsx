import React from "react";
import { CheckCircle2, AlertOctagon, AlertTriangle, Info, X, LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const toastStyles: Record<
  ToastType,
  { icon: LucideIcon; border: string; bg: string; iconColor: string }
> = {
  success: {
    icon: CheckCircle2,
    border: "border-emerald-200 dark:border-emerald-800/60",
    bg: "bg-emerald-50/95 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-100",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  error: {
    icon: AlertOctagon,
    border: "border-rose-200 dark:border-rose-800/60",
    bg: "bg-rose-50/95 dark:bg-rose-950/80 text-rose-900 dark:text-rose-100",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-amber-200 dark:border-amber-800/60",
    bg: "bg-amber-50/95 dark:bg-amber-950/80 text-amber-900 dark:text-amber-100",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  info: {
    icon: Info,
    border: "border-indigo-200 dark:border-indigo-800/60",
    bg: "bg-indigo-50/95 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-100",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const style = toastStyles[toast.type] || toastStyles.info;
  const IconComponent = style.icon;

  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      aria-live={toast.type === "error" ? "assertive" : "polite"}
      className={cn(
        "pointer-events-auto flex items-start gap-3 w-full sm:w-96 p-3.5 rounded-lg border shadow-lg backdrop-blur-xs transition-all duration-200",
        style.bg,
        style.border,
      )}
    >
      <IconComponent size={18} className={cn("shrink-0 mt-0.5", style.iconColor)} />
      
      <div className="flex-1 min-w-0 pr-1">
        <p className="text-body-sm font-semibold tracking-tight leading-snug">{toast.title}</p>
        {toast.description && (
          <p className="text-caption opacity-90 mt-1 leading-relaxed">{toast.description}</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-[calc(100vw-2.5rem)] pointer-events-none"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
