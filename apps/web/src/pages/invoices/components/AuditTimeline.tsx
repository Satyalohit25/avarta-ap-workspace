import React from "react";
import { Timeline, TimelineEvent } from "../../../components/ui/Timeline";

interface AuditTimelineProps {
  events: TimelineEvent[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({
  events,
  isLoading = false,
  onRefresh,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-zinc-800">
        <span className="text-caption font-medium text-neutral-600 dark:text-zinc-400">
          Immutable Audit Trail ({events.length} records)
        </span>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="text-micro font-medium text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        )}
      </div>

      {events.length === 0 ? (
        <div className="py-8 text-center text-caption text-neutral-500">
          No audit entries recorded yet.
        </div>
      ) : (
        <Timeline events={events} />
      )}
    </div>
  );
};
