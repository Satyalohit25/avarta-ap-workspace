import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building,
  CreditCard,
  Users,
  CheckCircle2,
  Circle,
  Cpu,
  UploadCloud,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  actionText: string;
  route: string;
  icon: React.ElementType;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: "first_invoice",
    title: "Add your first invoice",
    description: "Upload a vendor invoice PDF to experience split-screen review and live AI OCR extraction.",
    actionText: "Upload Invoice",
    route: "/inbox",
    icon: UploadCloud,
  },
  {
    id: "connect_erp",
    title: "Connect ERP or import vendors",
    description: "Sync your master data (Suppliers, POs, Items) from Tally, QuickBooks, Xero, or CSV files.",
    actionText: "Connect System",
    route: "/settings",
    icon: Building,
  },
  {
    id: "payment_gateway",
    title: "Connect payment gateway or bank",
    description: "Connect your RazorpayX, Cashfree, Stripe, or bank file format for secure batch releases.",
    actionText: "Configure Gateway",
    route: "/settings",
    icon: CreditCard,
  },
  {
    id: "invite_team",
    title: "Invite finance team & approvers",
    description: "Add team members with predefined roles: Finance Manager, Executive, or Approver.",
    actionText: "Invite Team",
    route: "/settings",
    icon: Users,
  },
];

interface EmptyDashboardChecklistProps {
  onOpenTour?: () => void;
}

export function EmptyDashboardChecklist({ onOpenTour }: EmptyDashboardChecklistProps) {
  const navigate = useNavigate();

  const [completedIds, setCompletedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("avarta_checklist_completed");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const toggleComplete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      localStorage.setItem("avarta_checklist_completed", JSON.stringify(next));
      return next;
    });
  };

  const progressPct = Math.round((completedIds.length / CHECKLIST_ITEMS.length) * 100);

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-4">
      {/* ── Welcome Banner ── */}
      <div className="rounded-md border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-sm text-micro font-semibold uppercase tracking-wider bg-neutral-100 dark:bg-zinc-800 text-neutral-800 dark:text-zinc-200 border border-neutral-200 dark:border-zinc-700">
                Workspace Initialized
              </span>
              <span className="text-[11px] text-neutral-500 dark:text-zinc-400">
                Honest start • Production workspace
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-zinc-50">
              Welcome to your Accounts Payable Workspace
            </h2>
            <p className="text-body-sm text-neutral-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
              Avarta operates on a clean slate. Follow this quick checklist to configure your pipeline,
              or jump straight in by uploading your first live invoice.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-col items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <Button
              variant="primary"
              onClick={() => navigate("/inbox")}
              className="w-full sm:w-auto h-10 px-5 font-semibold text-body-sm gap-2 rounded-sm"
            >
              <UploadCloud size={16} />
              <span>Add Your First Invoice</span>
            </Button>
            {onOpenTour && (
              <button
                type="button"
                onClick={onOpenTour}
                className="w-full sm:w-auto text-[11px] font-medium text-neutral-600 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-200 hover:underline flex items-center justify-center gap-1.5 py-1"
              >
                <Cpu size={13} />
                <span>Take a 2-minute tour</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Setup Progress Bar ── */}
        <div className="mt-6 pt-5 border-t border-neutral-200 dark:border-zinc-800">
          <div className="flex items-center justify-between text-body-sm mb-2">
            <span className="font-semibold text-neutral-800 dark:text-zinc-200">
              Workspace Setup Progress
            </span>
            <span className="font-mono font-medium text-neutral-600 dark:text-zinc-400">
              {completedIds.length} of {CHECKLIST_ITEMS.length} completed ({progressPct}%)
            </span>
          </div>
          <div className="w-full h-1.5 bg-neutral-200 dark:bg-zinc-800 rounded-xs overflow-hidden">
            <div
              className="h-full bg-neutral-900 dark:bg-zinc-100 transition-colors duration-100 rounded-xs"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Interactive Checklist Items ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CHECKLIST_ITEMS.map((item, idx) => {
          const isDone = completedIds.includes(item.id);
          const Icon = item.icon;

          return (
            <Card
              key={item.id}
              level="surface"
              className={`border transition-colors duration-100 cursor-pointer group rounded-md ${
                isDone
                  ? "border-emerald-200/70 dark:border-emerald-900/40 bg-neutral-50/50 dark:bg-zinc-850/50"
                  : "border-neutral-200 dark:border-zinc-800 hover:border-neutral-300 dark:hover:border-zinc-700"
              }`}
              onClick={() => navigate(item.route)}
            >
              <CardContent className="p-5 flex items-start gap-3.5">
                <button
                  type="button"
                  onClick={(e) => toggleComplete(item.id, e)}
                  className="mt-0.5 shrink-0 text-neutral-400 hover:text-neutral-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors focus:outline-none"
                  aria-label={isDone ? `Mark ${item.title} as incomplete` : `Mark ${item.title} as completed`}
                  title={isDone ? "Click to uncheck" : "Click to mark done / skip"}
                >
                  {isDone ? (
                    <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Circle size={20} />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={15} className="text-neutral-600 dark:text-zinc-400 shrink-0" />
                    <span className="text-micro font-mono font-semibold text-neutral-400 dark:text-zinc-500">
                      STEP 0{idx + 1}
                    </span>
                    <h3
                      className={`text-body font-semibold truncate ${
                        isDone
                          ? "line-through text-neutral-500 dark:text-zinc-500"
                          : "text-neutral-900 dark:text-zinc-100"
                      }`}
                    >
                      {item.title}
                    </h3>
                  </div>

                  <p className="text-caption text-neutral-600 dark:text-zinc-400 leading-snug mb-3">
                    {item.description}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-semibold text-neutral-700 dark:text-zinc-300 flex items-center gap-1 transition-colors">
                      {item.actionText} <ChevronRight size={13} />
                    </span>
                    <span
                      onClick={(e) => toggleComplete(item.id, e)}
                      className="text-[10px] text-neutral-400 dark:text-zinc-500 hover:text-neutral-700 dark:hover:text-zinc-300 font-medium"
                    >
                      {isDone ? "Completed" : "Mark done / Skip"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
