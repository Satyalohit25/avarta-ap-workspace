import { useState, ReactNode } from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../../lib/utils";

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultTabId?: string;
  variant?: "line" | "pill";
  onChange?: (tabId: string) => void;
}

export function Tabs({ tabs, defaultTabId, variant = "line", onChange }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTabId ?? tabs[0]?.id ?? "");

  function handleTabChange(id: string) {
    setActiveTab(id);
    onChange?.(id);
  }

  return (
    <TabsPrimitive.Root value={activeTab} onValueChange={handleTabChange} className="space-y-4">
      <TabsPrimitive.List
        className={cn(
          variant === "pill"
            ? "inline-flex items-center p-1 bg-neutral-100 dark:bg-zinc-900/90 rounded-lg border border-neutral-200/80 dark:border-zinc-800 shadow-2xs gap-1"
            : "border-b border-neutral-200 dark:border-zinc-800 flex gap-6"
        )}
      >
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.id}
            value={tab.id}
            className={cn(
              "text-body-sm font-medium transition-all duration-fast flex items-center gap-2 focus:outline-none",
              variant === "pill"
                ? tab.id === activeTab
                  ? "h-7 px-3 rounded-md bg-white dark:bg-zinc-800 text-neutral-900 dark:text-zinc-100 font-semibold shadow-2xs"
                  : "h-7 px-3 rounded-md text-neutral-600 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-100"
                : tab.id === activeTab
                ? "pb-2.5 border-b-2 -mb-px border-accent-500 dark:border-accent-400 text-neutral-900 dark:text-zinc-100 font-semibold"
                : "pb-2.5 border-b-2 -mb-px border-transparent text-neutral-500 dark:text-zinc-400 hover:text-neutral-800 dark:hover:text-zinc-200"
            )}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="text-micro font-mono bg-neutral-200/60 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300 px-1.5 py-0.25 rounded-full">
                {tab.badge}
              </span>
            )}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {tabs.map((tab) => (
        <TabsPrimitive.Content key={tab.id} value={tab.id} className="focus:outline-none">
          {tab.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
