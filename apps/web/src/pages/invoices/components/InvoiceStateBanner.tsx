import { useState } from "react";
import {
  AlertTriangle,
  Building2,
  FileText,
  Percent,
  Copy,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { InvoiceWorkflowContext, ActionItem } from "../helpers/workflowContext";
import { Button } from "../../../components/ui/Button";
import { Stepper } from "../../../components/ui/Stepper";

interface InvoiceStateBannerProps {
  context: InvoiceWorkflowContext;
  onActionItemClick?: (type: ActionItem["type"]) => void;
  defaultExpanded?: boolean;
}

const WORKFLOW_STAGES = [
  { step: 1, name: "Intake" },
  { step: 2, name: "Capture" },
  { step: 3, name: "Validation" },
  { step: 4, name: "3-Way Match" },
  { step: 5, name: "Approval" },
  { step: 6, name: "Payment" },
  { step: 7, name: "ERP Sync" },
  { step: 8, name: "Archive" },
];

export function InvoiceStateBanner({
  context,
  onActionItemClick,
  defaultExpanded,
}: InvoiceStateBannerProps) {
  const {
    bannerType,
    bannerDescription,
    actionItems,
    nextStepPrompt,
    stageNumber,
    status,
  } = context;

  const hasBlockingActions = status === "EXCEPTION" || actionItems.length > 0;
  // Compact by default unless blocking exceptions exist or requested
  const [isExpanded, setIsExpanded] = useState<boolean>(
    defaultExpanded !== undefined ? defaultExpanded : hasBlockingActions
  );

  const statusTheme = {
    warning: {
      leftBorder: "border-l-amber-500 dark:border-l-amber-400",
      actionBtn: "hover:border-amber-400 dark:hover:border-amber-500 hover:text-amber-700 dark:hover:text-amber-300",
    },
    error: {
      leftBorder: "border-l-rose-500 dark:border-l-rose-400",
      actionBtn: "hover:border-rose-400 dark:hover:border-rose-500 hover:text-rose-700 dark:hover:text-rose-300",
    },
    success: {
      leftBorder: "border-l-emerald-500 dark:border-l-emerald-400",
      actionBtn: "hover:border-emerald-400 dark:hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300",
    },
    info: {
      leftBorder: "border-l-indigo-500 dark:border-l-indigo-400",
      actionBtn: "hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300",
    },
  }[bannerType];

  function getActionItemIcon(type: ActionItem["type"]) {
    switch (type) {
      case "vendor":
        return <Building2 size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />;
      case "confidence":
        return <Percent size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />;
      case "variance":
        return <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />;
      case "duplicate":
        return <Copy size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />;
      case "doc":
        return <FileText size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />;
      default:
        return <AlertTriangle size={14} className="text-neutral-500 shrink-0" />;
    }
  }

  const currentStageName = WORKFLOW_STAGES[stageNumber - 1]?.name ?? "Verification";

  return (
    <div
      className={`rounded-xl border border-neutral-200/80 dark:border-zinc-800 border-l-4 ${statusTheme.leftBorder} bg-white dark:bg-zinc-900 shadow-2xs transition-all`}
    >
      {/* ── Compact Stage 4/8 Strip ── */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 sm:px-5 sm:py-2">
        <div className="flex items-center gap-3 min-w-0">
          {/* Compact Stage Chip & Progress Indicator */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-caption font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono">
              Stage {stageNumber}/8: {currentStageName}
            </span>

            {/* Mini Progress Bar Line */}
            <div className="hidden sm:flex items-center gap-1">
              {WORKFLOW_STAGES.map((s) => (
                <div
                  key={s.step}
                  className={`h-1.5 rounded-full transition-all ${
                    s.step < stageNumber
                      ? "w-3.5 bg-indigo-600 dark:bg-indigo-400"
                      : s.step === stageNumber
                      ? "w-5 bg-indigo-600 dark:bg-indigo-400"
                      : "w-2 bg-neutral-200 dark:bg-zinc-700"
                  }`}
                  title={`Stage ${s.step}: ${s.name}`}
                />
              ))}
            </div>
          </div>

          <span className="text-caption text-neutral-600 dark:text-zinc-400 truncate hidden md:inline">
            {nextStepPrompt || bannerDescription || "Linear AP progression • Human verification required"}
          </span>
        </div>

        {/* Right-aligned toggle controls */}
        <div className="shrink-0 flex items-center gap-2">
          {actionItems.length > 0 && (
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800 text-micro font-semibold shadow-2xs hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors cursor-pointer"
            >
              <span>Action Required ({actionItems.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1 text-micro text-neutral-500 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-200 px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label={isExpanded ? "Collapse full funnel" : "View full workflow funnel"}
          >
            <span>{isExpanded ? "Collapse Funnel" : "Full Funnel"}</span>
            {isExpanded ? <ChevronUp size={12} strokeWidth={2} /> : <ChevronDown size={12} strokeWidth={2} />}
          </button>
        </div>
      </div>

      {/* ── Expanded Drawer: Full Stepper & Action Items ── */}
      {isExpanded && (
        <div className="px-4 pb-3 sm:px-5 sm:pb-3.5 pt-3 border-t border-neutral-100 dark:border-zinc-800/80 space-y-3 animate-in fade-in-50 duration-100">
          {/* Full Stepper component */}
          <div className="overflow-x-auto py-1">
            <Stepper
              steps={WORKFLOW_STAGES.map((s) => ({ id: s.step, label: s.name }))}
              currentStep={stageNumber}
              status={bannerType}
            />
          </div>

          {/* Action Items List */}
          {actionItems.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-zinc-800/60">
              <span className="text-micro font-mono font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                {actionItems.length === 1 ? "Action Item" : "Action Items"}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {actionItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-neutral-50/70 dark:bg-zinc-900/90 border border-neutral-200/80 dark:border-zinc-800 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1 rounded-md bg-white dark:bg-zinc-800 border border-neutral-200/80 dark:border-zinc-700 shrink-0">
                        {getActionItemIcon(item.type)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-body-sm font-semibold text-neutral-900 dark:text-zinc-100 truncate">
                          {item.title}
                        </p>
                        <p className="text-caption text-neutral-500 dark:text-zinc-400 truncate">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onActionItemClick?.(item.type)}
                      className={`h-7 px-3 text-caption font-semibold rounded-md shrink-0 border-neutral-300 dark:border-zinc-700 ${statusTheme.actionBtn}`}
                    >
                      <span>{item.actionHint || "Resolve"}</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bannerDescription && actionItems.length === 0 && (
            <p className="text-body-sm text-neutral-600 dark:text-zinc-400">
              {bannerDescription}
            </p>
          )}

          {/* Directional Next Step Cue */}
          {nextStepPrompt && (
            <div className="flex items-center gap-2 text-caption text-neutral-500 dark:text-zinc-400 pt-1">
              <ArrowRight size={12} className="text-neutral-400 dark:text-zinc-500 shrink-0" />
              <span>{nextStepPrompt}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
