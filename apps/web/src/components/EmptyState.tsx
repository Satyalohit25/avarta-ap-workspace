import { Inbox } from "lucide-react";
import { Button } from "./ui/Button";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

// Doc 08 §8.24 pattern — reassuring, not apologetic.
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="h-12 w-12 rounded-full bg-neutral-100 dark:bg-zinc-800 border border-neutral-200/60 dark:border-zinc-700/60 flex items-center justify-center text-neutral-400 dark:text-zinc-500 mb-3 shadow-2xs">
        <Inbox size={22} strokeWidth={1.5} />
      </div>
      <p className="text-body font-semibold text-neutral-900 dark:text-zinc-100">{title}</p>
      {description && <p className="text-body-sm text-neutral-500 dark:text-zinc-400 mt-1 max-w-sm">{description}</p>}
      {action && (
        <Button size="sm" className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
