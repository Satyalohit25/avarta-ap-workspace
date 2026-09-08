import { LucideIcon, Sparkles, User, CheckCircle2, AlertTriangle, FileText, ArrowRight, ShieldCheck } from "lucide-react";

export interface TimelineEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details?: string;
  type?: "info" | "success" | "warning" | "error";
}

export interface TimelineProps {
  events: TimelineEvent[];
}

function getEventMeta(evt: TimelineEvent): {
  icon: LucideIcon;
  bgColor: string;
  textColor: string;
  borderColor: string;
} {
  const isAI = evt.actor?.toLowerCase().includes("ai") || evt.actor?.toLowerCase().includes("ocr") || evt.actor?.toLowerCase().includes("engine");
  
  if (isAI) {
    return {
      icon: Sparkles,
      bgColor: "bg-indigo-50 dark:bg-indigo-950/60",
      textColor: "text-indigo-600 dark:text-indigo-400",
      borderColor: "border-indigo-200 dark:border-indigo-800",
    };
  }

  if (evt.type === "success" || evt.action.toLowerCase().includes("approved") || evt.action.toLowerCase().includes("resolved")) {
    return {
      icon: CheckCircle2,
      bgColor: "bg-emerald-50 dark:bg-emerald-950/60",
      textColor: "text-emerald-600 dark:text-emerald-400",
      borderColor: "border-emerald-200 dark:border-emerald-800",
    };
  }

  if (evt.type === "warning" || evt.type === "error" || evt.action.toLowerCase().includes("flag") || evt.action.toLowerCase().includes("exception")) {
    return {
      icon: AlertTriangle,
      bgColor: "bg-amber-50 dark:bg-amber-950/60",
      textColor: "text-amber-600 dark:text-amber-400",
      borderColor: "border-amber-200 dark:border-amber-800",
    };
  }

  return {
    icon: User,
    bgColor: "bg-neutral-100 dark:bg-zinc-800",
    textColor: "text-neutral-700 dark:text-zinc-300",
    borderColor: "border-neutral-200 dark:border-zinc-700",
  };
}

export function Timeline({ events }: TimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="py-6 text-center text-body-sm text-neutral-400 dark:text-zinc-500 font-mono">
        No audit activity recorded yet.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-neutral-200 dark:before:bg-zinc-800">
      {events.map((evt) => {
        const meta = getEventMeta(evt);
        const IconComponent = meta.icon;
        const formattedDate = new Date(evt.timestamp).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <div key={evt.id} className="relative flex items-start gap-3.5 group">
            {/* Avatar / Icon Badge */}
            <div
              className={`absolute -left-6 top-0.5 w-6 h-6 rounded-full flex items-center justify-center ${meta.bgColor} ${meta.textColor} ring-4 ring-white dark:ring-zinc-900 border ${meta.borderColor} shadow-xs shrink-0`}
            >
              <IconComponent size={12} strokeWidth={2} />
            </div>

            {/* Event Content Box */}
            <div className="flex-1 bg-white dark:bg-zinc-900/90 border border-neutral-200 dark:border-zinc-800 rounded-lg p-3.5 space-y-1.5 shadow-xs hover:border-neutral-300 dark:hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between gap-2 min-w-0 flex-nowrap">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className="font-semibold text-neutral-900 dark:text-zinc-100 text-body-sm truncate"
                    title={evt.action}
                  >
                    {evt.action}
                  </span>
                  <span
                    className={`text-micro font-mono font-medium px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${meta.bgColor} ${meta.textColor} ${meta.borderColor}`}
                  >
                    {evt.actor}
                  </span>
                </div>
                <span className="text-micro font-mono text-neutral-400 dark:text-zinc-500 shrink-0 whitespace-nowrap">
                  {formattedDate}
                </span>
              </div>

              {evt.details && (
                <p className="text-caption text-neutral-600 dark:text-zinc-400 bg-neutral-50 dark:bg-zinc-800/50 p-2 rounded border border-neutral-100 dark:border-zinc-800/80">
                  {evt.details}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
