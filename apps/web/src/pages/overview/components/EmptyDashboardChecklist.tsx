import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building,
  CreditCard,
  Users,
  CheckCircle2,
  Circle,
  Sparkles,
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
      <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/70 via-white to-neutral-50 dark:from-indigo-950/30 dark:via-zinc-900 dark:to-zinc-900 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-micro font-semibold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                Workspace Initialized
              </span>
              <span className="text-[11px] text-neutral-500 dark:text-zinc-400">
                Honest start • No fake demo data
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
              className="w-full sm:w-auto h-10 px-5 font-semibold text-body-sm shadow-sm gap-2"
            >
              <UploadCloud size={16} />
              <span>Add Your First Invoice</span>
            </Button>
            {onOpenTour && (
              <button
                type="button"
                onClick={onOpenTour}
                className="w-full sm:w-auto text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-center gap-1.5 py-1"
              >
                <Sparkles size={13} />
                <span>Take a 2-minute tour</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Setup Progress Bar ── */}
        <div className="mt-6 pt-5 border-t border-indigo-100 dark:border-indigo-900/40">
          <div className="flex items-center justify-between text-body-sm mb-2">
            <span className="font-semibold text-neutral-800 dark:text-zinc-200">
              Workspace Setup Progress
            </span>
            <span className="font-mono font-medium text-neutral-600 dark:text-zinc-400">
              {completedIds.length} of {CHECKLIST_ITEMS.length} completed ({progressPct}%)
            </span>
          </div>
          <div className="w-full h-2 bg-neutral-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-500 rounded-full"
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
              className={`border transition-all cursor-pointer group ${
                isDone
                  ? "border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10"
                  : "border-neutral-200/80 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700/60"
              }`}
              onClick={() => navigate(item.route)}
            >
              <CardContent className="p-5 flex items-start gap-3.5">
                <button
                  type="button"
                  onClick={(e) => toggleComplete(item.id, e)}
                  className="mt-0.5 shrink-0 text-neutral-400 hover:text-indigo-600 dark:text-zinc-500 dark:hover:text-indigo-400 transition-colors focus:outline-none"
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
                    <Icon size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="text-micro font-mono font-semibold text-neutral-400 dark:text-zinc-500">
                      STEP 0{idx + 1}
                    </span>
                    <h3
                      className={`text-body font-semibold truncate ${
                        isDone
                          ? "line-through text-neutral-500 dark:text-zinc-500"
                          : "text-neutral-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                      }`}
                    >
                      {item.title}
                    </h3>
                  </div>

                  <p className="text-caption text-neutral-600 dark:text-zinc-400 leading-snug mb-3">
                    {item.description}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
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
