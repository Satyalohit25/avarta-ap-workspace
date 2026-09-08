import { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  badge,
  action,
  className = "",
}: PageHeaderProps) {
  return (
    <header
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 dark:border-zinc-800 pb-4 mb-6 ${className}`}
    >
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-h1 text-neutral-900 dark:text-zinc-100 font-semibold tracking-tight">
            {title}
          </h1>
          {badge && <div>{badge}</div>}
        </div>
        {subtitle && (
          <p className="text-body-sm text-neutral-500 dark:text-zinc-400 mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </header>
  );
}
