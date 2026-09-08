import { HTMLAttributes, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Info, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "../../lib/utils";

export const alertVariants = cva(
  "p-4 border rounded-xl flex items-start gap-3 transition-colors shadow-2xs",
  {
    variants: {
      type: {
        info: "bg-neutral-50/80 dark:bg-zinc-900 border-neutral-200/80 dark:border-zinc-800 text-neutral-800 dark:text-zinc-200",
        success: "bg-success-50/60 dark:bg-success-950/30 border-success-500/20 dark:border-success-500/30 text-success-700 dark:text-success-300",
        warning: "bg-warning-50/60 dark:bg-warning-950/30 border-warning-500/20 dark:border-warning-500/30 text-warning-700 dark:text-warning-300",
        error: "bg-error-50/60 dark:bg-error-950/30 border-error-500/20 dark:border-error-500/30 text-error-700 dark:text-error-300",
      },
    },
    defaultVariants: {
      type: "info",
    },
  }
);

export interface AlertProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  type?: "info" | "success" | "warning" | "error";
  title?: string;
  action?: ReactNode;
}

export function Alert({ type = "info", title, children, action, className, ...props }: AlertProps) {
  const IconComponent =
    type === "success"
      ? CheckCircle2
      : type === "warning"
      ? AlertTriangle
      : type === "error"
      ? XCircle
      : Info;

  return (
    <div className={cn(alertVariants({ type, className }))} role="alert" {...props}>
      <IconComponent size={18} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex-1 text-body-sm">
        {title && <AlertTitle>{title}</AlertTitle>}
        {typeof children === "string" ? <AlertDescription>{children}</AlertDescription> : children}
      </div>
      {action && <div className="ml-auto flex-shrink-0">{action}</div>}
    </div>
  );
}

export function AlertTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h4 className={cn("font-semibold mb-0.5 leading-none tracking-tight", className)} {...props}>
      {children}
    </h4>
  );
}

export function AlertDescription({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <div className={cn("leading-relaxed", className)} {...props}>
      {children}
    </div>
  );
}
