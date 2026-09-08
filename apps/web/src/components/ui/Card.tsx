import { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  level?: "surface" | "raised" | "muted";
}

export function Card({ level = "surface", className, children, ...props }: CardProps) {
  const levelClasses = {
    surface: "bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 shadow-2xs",
    raised: "bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 shadow-xs",
    muted: "bg-neutral-50 dark:bg-zinc-800/40 border border-neutral-200/60 dark:border-zinc-800/60",
  }[level];

  return (
    <div className={cn("rounded-lg text-neutral-900 dark:text-zinc-100 transition-colors", levelClasses, className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
  children,
  ...props
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "title">) {
  if (children) {
    return (
      <div className={cn("p-5 border-b border-neutral-200 dark:border-zinc-800 flex items-center justify-between", className)} {...props}>
        {children}
      </div>
    );
  }

  return (
    <div className={cn("p-5 border-b border-neutral-200 dark:border-zinc-800 flex items-center justify-between", className)} {...props}>
      <div>
        {title && <h3 className="text-h3 text-neutral-900 dark:text-zinc-100 font-semibold tracking-tight">{title}</h3>}
        {description && <p className="text-body-sm text-neutral-500 dark:text-zinc-400 mt-0.5">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-h3 text-neutral-900 dark:text-zinc-100 font-semibold tracking-tight", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-body-sm text-neutral-500 dark:text-zinc-400 mt-0.5", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-5", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-5 border-t border-neutral-200 dark:border-zinc-800 flex items-center", className)} {...props}>
      {children}
    </div>
  );
}
