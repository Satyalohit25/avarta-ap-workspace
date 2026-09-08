import { ReactNode } from "react";
import { Card } from "./Card";

export interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  subtitle?: ReactNode;
  icon?: ReactNode;
}

export function StatsCard({ title, value, change, changeType = "neutral", subtitle, icon }: StatsCardProps) {
  return (
    <Card level="surface" className="p-4 flex flex-col justify-between h-full space-y-2 relative overflow-hidden">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-micro font-semibold uppercase tracking-widest text-neutral-500 dark:text-zinc-400">
            {title}
          </span>
          {icon && <div className="text-neutral-400 dark:text-zinc-500">{icon}</div>}
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-2xl text-neutral-900 dark:text-zinc-100 font-semibold font-mono tabular-nums tracking-tight">
            {value}
          </span>
          {change && (
            <span
              className={`text-micro font-medium px-2 py-0.5 rounded-full font-mono shrink-0 ${
                changeType === "positive"
                  ? "bg-success-50 dark:bg-success-950/30 text-success-700 dark:text-success-400"
                  : changeType === "negative"
                  ? "bg-error-50 dark:bg-error-950/30 text-error-700 dark:text-error-400"
                  : "bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400"
              }`}
            >
              {change}
            </span>
          )}
        </div>
      </div>
      {subtitle && (
        <div className="mt-auto pt-1">
          <p className="text-caption text-neutral-500 dark:text-zinc-400 leading-normal">
            {subtitle}
          </p>
        </div>
      )}
    </Card>
  );
}
