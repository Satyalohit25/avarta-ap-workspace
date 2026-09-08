import { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

export interface StepItem {
  id: string | number;
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: StepItem[];
  currentStep: number; // 1-indexed
  status?: "info" | "warning" | "error" | "success";
  className?: string;
  onStepClick?: (stepIndex: number) => void;
}

/**
 * Astryx-inspired Stepper Component
 * Features connected track lines, completed checkmark nodes, illuminated current node,
 * and integrated typography labels with WCAG 2.2 AA compliant contrast.
 */
export function Stepper({
  steps,
  currentStep,
  status = "info",
  className,
  onStepClick,
}: StepperProps) {
  const statusColors = {
    info: {
      activeRing: "ring-indigo-500/30 border-indigo-600 bg-indigo-600 text-white shadow-xs shadow-indigo-500/20",
      activeText: "text-indigo-900 dark:text-indigo-200 font-bold",
      completedLine: "bg-indigo-600 dark:bg-indigo-500",
      completedNode: "bg-indigo-50 dark:bg-indigo-950/70 border-indigo-600 dark:border-indigo-500 text-indigo-700 dark:text-indigo-300",
    },
    success: {
      activeRing: "ring-emerald-500/30 border-emerald-600 bg-emerald-600 text-white shadow-xs shadow-emerald-500/20",
      activeText: "text-emerald-900 dark:text-emerald-200 font-bold",
      completedLine: "bg-emerald-600 dark:bg-emerald-500",
      completedNode: "bg-emerald-50 dark:bg-emerald-950/70 border-emerald-600 dark:border-emerald-500 text-emerald-700 dark:text-emerald-300",
    },
    warning: {
      activeRing: "ring-amber-500/30 border-amber-600 bg-amber-500 text-white shadow-xs shadow-amber-500/20",
      activeText: "text-amber-900 dark:text-amber-200 font-bold",
      completedLine: "bg-amber-600 dark:bg-amber-500",
      completedNode: "bg-amber-50 dark:bg-amber-950/70 border-amber-600 dark:border-amber-500 text-amber-700 dark:text-amber-300",
    },
    error: {
      activeRing: "ring-rose-500/30 border-rose-600 bg-rose-600 text-white shadow-xs shadow-rose-500/20",
      activeText: "text-rose-900 dark:text-rose-200 font-bold",
      completedLine: "bg-rose-600 dark:bg-rose-500",
      completedNode: "bg-rose-50 dark:bg-rose-950/70 border-rose-600 dark:border-rose-500 text-rose-700 dark:text-rose-300",
    },
  }[status];

  return (
    <nav
      aria-label="Workflow progress"
      className={cn("w-full overflow-x-auto py-0.5 scrollbar-none", className)}
    >
      <ol className="flex items-center min-w-max sm:min-w-0 w-full justify-between">
        {steps.map((step, idx) => {
          const stepNumber = idx + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isLast = idx === steps.length - 1;

          return (
            <li
              key={step.id}
              className={cn(
                "flex items-center relative",
                !isLast && "flex-1"
              )}
            >
              {/* Step Node & Label */}
              <button
                type="button"
                disabled={!onStepClick}
                onClick={() => onStepClick?.(stepNumber)}
                className={cn(
                  "flex items-center gap-1.5 group text-left select-none transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded p-0.5",
                  onStepClick ? "cursor-pointer" : "cursor-default"
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                {/* Indicator Circle */}
                <div
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-semibold transition-all shrink-0 border",
                    isCompleted && cn("border-1.5", statusColors.completedNode),
                    isCurrent &&
                      cn(
                        "ring-3 border-1.5 scale-105",
                        statusColors.activeRing
                      ),
                    !isCompleted &&
                      !isCurrent &&
                      "bg-neutral-100 dark:bg-zinc-800/80 border-neutral-300 dark:border-zinc-700 text-neutral-500 dark:text-zinc-500"
                  )}
                >
                  {isCompleted ? (
                    <Check size={11} strokeWidth={3} className="shrink-0" />
                  ) : (
                    <span>{stepNumber}</span>
                  )}
                </div>

                {/* Label text */}
                <span
                  className={cn(
                    "text-[11px] tracking-tight whitespace-nowrap transition-colors",
                    isCurrent && statusColors.activeText,
                    isCompleted &&
                      "text-neutral-700 dark:text-zinc-300 font-medium",
                    !isCompleted &&
                      !isCurrent &&
                      "text-neutral-400 dark:text-zinc-500 font-normal"
                  )}
                >
                  {step.label}
                </span>
              </button>

              {/* Connecting Line to next step */}
              {!isLast && (
                <div
                  aria-hidden="true"
                  className={cn(
                    "h-[1.5px] flex-1 mx-1.5 transition-colors duration-300 rounded-full",
                    isCompleted
                      ? statusColors.completedLine
                      : "bg-neutral-200 dark:bg-zinc-800"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
