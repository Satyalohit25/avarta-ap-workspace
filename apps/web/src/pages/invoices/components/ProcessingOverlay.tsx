import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  FileText,
  ShieldCheck,
  GitMerge,
  Check,
  Loader2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

export type ProcessingStage =
  | "idle"
  | "capturing"
  | "validating"
  | "matching"
  | "complete"
  | "error";

interface ProcessingOverlayProps {
  stage: ProcessingStage;
  isOpen: boolean;
  errorMessage?: string;
  onClose?: () => void;
}

const PIPELINE_STEPS = [
  {
    id: "capturing" as const,
    label: "AI Text Extraction & OCR",
    description: "Extracting invoice fields, line items, and tax data from the source document",
    icon: FileText,
    timing: "~2s",
  },
  {
    id: "validating" as const,
    label: "Field-Level Validation",
    description: "Running compliance checks: vendor match, duplicate detection, GST verification",
    icon: ShieldCheck,
    timing: "~1s",
  },
  {
    id: "matching" as const,
    label: "3-Way PO Matching",
    description: "Matching invoice lines against purchase order and goods receipt records",
    icon: GitMerge,
    timing: "~1s",
  },
];

const STAGE_ORDER: ProcessingStage[] = ["idle", "capturing", "validating", "matching", "complete"];

function getStageIndex(stage: ProcessingStage): number {
  if (stage === "error") return -1;
  return STAGE_ORDER.indexOf(stage);
}

export function ProcessingOverlay({
  stage,
  isOpen,
  errorMessage,
  onClose,
}: ProcessingOverlayProps) {
  const currentIndex = getStageIndex(stage);

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-neutral-950/60 dark:bg-zinc-950/80 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-lg p-6 max-w-lg w-full shadow-2xl focus:outline-none"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center">
              <Sparkles size={20} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <DialogPrimitive.Title className="text-h3 text-neutral-900 dark:text-zinc-100 font-semibold">
                Processing Invoice
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-caption text-neutral-500 dark:text-zinc-400">
                Running AI-powered capture, validation & matching pipeline
              </DialogPrimitive.Description>
            </div>
          </div>

          {/* Pipeline Steps */}
          <div className="space-y-1">
            {PIPELINE_STEPS.map((step, idx) => {
              const stepStageIndex = STAGE_ORDER.indexOf(step.id);
              const isCompleted = stage === "complete" || currentIndex > stepStageIndex;
              const isActive =
                stage !== "error" && stage !== "complete" && currentIndex === stepStageIndex;
              const isErrored = stage === "error" && currentIndex === stepStageIndex;
              const isPending = !isCompleted && !isActive && !isErrored;
              const StepIcon = step.icon;

              return (
                <div key={step.id} className="flex items-start gap-3">
                  {/* Connector Line + Icon */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                        isCompleted
                          ? "bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800"
                          : isActive
                          ? "bg-indigo-100 dark:bg-indigo-950/50 border-2 border-indigo-500 dark:border-indigo-400"
                          : isErrored
                          ? "bg-rose-100 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800"
                          : "bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700"
                      }`}
                    >
                      {isCompleted ? (
                        <Check size={14} strokeWidth={2.5} className="text-emerald-600 dark:text-emerald-400" />
                      ) : isActive ? (
                        <Loader2
                          size={14}
                          strokeWidth={2.5}
                          className="text-indigo-600 dark:text-indigo-400 animate-spin"
                        />
                      ) : isErrored ? (
                        <AlertTriangle size={14} strokeWidth={2} className="text-rose-600 dark:text-rose-400" />
                      ) : (
                        <StepIcon size={14} strokeWidth={1.5} className="text-neutral-400 dark:text-zinc-500" />
                      )}
                    </div>
                    {idx < PIPELINE_STEPS.length - 1 && (
                      <div
                        className={`w-0.5 h-8 transition-colors duration-500 ${
                          isCompleted
                            ? "bg-emerald-300 dark:bg-emerald-800"
                            : "bg-neutral-200 dark:bg-zinc-700"
                        }`}
                      />
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="pt-1 pb-3 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-body-sm font-semibold transition-colors duration-300 ${
                          isCompleted
                            ? "text-emerald-700 dark:text-emerald-400"
                            : isActive
                            ? "text-indigo-700 dark:text-indigo-300"
                            : isErrored
                            ? "text-rose-700 dark:text-rose-400"
                            : "text-neutral-500 dark:text-zinc-400"
                        }`}
                      >
                        {step.label}
                      </span>
                      {isCompleted && (
                        <span className="text-micro font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                          Done
                        </span>
                      )}
                      {isActive && (
                        <span className="text-micro font-mono font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded animate-pulse">
                          Running
                        </span>
                      )}
                      {isPending && (
                        <span className="text-micro font-mono text-neutral-400 dark:text-zinc-500">
                          {step.timing}
                        </span>
                      )}
                      {isErrored && (
                        <span className="text-micro font-mono font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                          Failed
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-caption mt-0.5 transition-colors duration-300 ${
                        isActive
                          ? "text-neutral-600 dark:text-zinc-300"
                          : "text-neutral-400 dark:text-zinc-500"
                      }`}
                    >
                      {step.description}
                    </p>

                    {/* Progress bar for active step */}
                    {isActive && <ProgressBar />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Completed / Error Footer */}
          {stage === "complete" && (
            <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-md flex items-center gap-2.5">
              <Check size={16} strokeWidth={2.5} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-body-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Pipeline complete — invoice advanced to next workflow stage
              </span>
            </div>
          )}
          {stage === "error" && (
            <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-md flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-body-sm font-semibold text-rose-800 dark:text-rose-300 block">
                  Exception detected — invoice routed to exceptions queue
                </span>
                {errorMessage && (
                  <span className="text-caption text-rose-600 dark:text-rose-400 mt-0.5 block">
                    {errorMessage}
                  </span>
                )}
              </div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Animated indeterminate progress bar */
function ProgressBar() {
  return (
    <div className="mt-2 h-1 w-full bg-neutral-200 dark:bg-zinc-700 rounded-full overflow-hidden">
      <div className="h-full w-1/3 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-progress-indeterminate" />
    </div>
  );
}
