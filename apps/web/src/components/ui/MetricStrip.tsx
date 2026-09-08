import { ReactNode } from "react";
import { Card } from "./Card";

export interface MetricItem {
  id: string;
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  isPrimaryValue?: boolean;
}

export interface MetricStripProps {
  items: MetricItem[];
}

export function MetricStrip({ items }: MetricStripProps) {
  return (
    <Card level="surface" className="p-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-neutral-200 dark:divide-zinc-800">
        {items.map((item, idx) => (
          <div key={item.id} className={idx === 0 ? "" : "pt-3 md:pt-0 md:pl-4"}>
            <div className="flex items-center gap-1.5 mb-1">
              {item.icon && <div className="text-neutral-400 dark:text-zinc-500 shrink-0">{item.icon}</div>}
              <span className="text-micro font-semibold uppercase tracking-wider text-neutral-500 dark:text-zinc-400">
                {item.label}
              </span>
            </div>
            {typeof item.value === "string" || typeof item.value === "number" ? (
              <span
                className={
                  item.isPrimaryValue
                    ? "text-2xl text-neutral-900 dark:text-zinc-50 font-semibold font-mono tabular-nums block"
                    : "text-body font-semibold text-neutral-900 dark:text-zinc-100 block truncate"
                }
              >
                {item.value}
              </span>
            ) : (
              item.value
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
