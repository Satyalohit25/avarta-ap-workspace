import { useState } from "react";
import {
  Sparkles,
  Eye,
  EyeOff,
  Filter,
  CheckCircle2,
  Crosshair,
  ExternalLink,
} from "lucide-react";
import {
  GroundTruthBox,
  ConfidenceBand,
  getConfidenceColors,
} from "../../../lib/ocrGroundTruth";

interface GroundTruthBoundingBoxOverlayProps {
  boxes: GroundTruthBox[];
  activeFieldId?: string | null;
  hoveredFieldId?: string | null;
  onSelectField: (fieldKey: string) => void;
  onHoverField: (fieldKey: string | null) => void;
  isEnabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
}

export function GroundTruthBoundingBoxOverlay({
  boxes,
  activeFieldId,
  hoveredFieldId,
  onSelectField,
  onHoverField,
  isEnabled,
  onToggleEnabled,
}: GroundTruthBoundingBoxOverlayProps) {
  const [filterBand, setFilterBand] = useState<"ALL" | ConfidenceBand>("ALL");
  const [localHoveredBoxId, setLocalHoveredBoxId] = useState<string | null>(null);

  const effectiveHoveredId = hoveredFieldId ?? localHoveredBoxId;

  // Filter boxes by confidence band if selected
  const visibleBoxes = boxes.filter((box) => {
    if (filterBand === "ALL") return true;
    return box.confidenceBand === filterBand;
  });

  return (
    <>
      {/* ── Floating Ground-Truth Controls Toolbar ── */}
      <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-b border-neutral-200 dark:border-zinc-800 px-3 py-2 flex items-center justify-between gap-2 flex-wrap text-caption z-10 shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleEnabled(!isEnabled)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-micro font-medium transition-all ${
              isEnabled
                ? "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold shadow-2xs"
                : "bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400 border border-neutral-200 dark:border-zinc-700 hover:text-neutral-900 dark:hover:text-zinc-200"
            }`}
            title="Toggle interactive AI extraction coordinates overlay on the document"
          >
            {isEnabled ? <Eye size={12} className="text-indigo-600 dark:text-indigo-400" /> : <EyeOff size={12} />}
            <span>Ground Truth Overlay: {isEnabled ? "ON" : "OFF"}</span>
          </button>

          {isEnabled && (
            <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-neutral-200 dark:border-zinc-700 text-micro">
              <span className="text-neutral-400 dark:text-zinc-500 flex items-center gap-1 mr-1">
                <Filter size={11} /> Filter:
              </span>
              {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map((band) => (
                <button
                  key={band}
                  type="button"
                  onClick={() => setFilterBand(band)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                    filterBand === band
                      ? "bg-neutral-800 dark:bg-zinc-200 text-white dark:text-zinc-900 font-semibold"
                      : "text-neutral-500 dark:text-zinc-400 hover:text-neutral-800 dark:hover:text-zinc-200"
                  }`}
                >
                  {band === "ALL" ? "All" : band === "HIGH" ? "≥95%" : band === "MEDIUM" ? "80-94%" : "<80%"}
                </button>
              ))}
            </div>
          )}
        </div>

        {isEnabled && (
          <div className="flex items-center gap-2 text-micro">
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900">
              <CheckCircle2 size={11} />
              <span>{visibleBoxes.length} Coordinates Anchored</span>
            </span>
            <span className="text-neutral-400 dark:text-zinc-500 hidden md:inline">
              Click box to jump to extraction field
            </span>
          </div>
        )}
      </div>

      {/* ── Interactive SVG Coordinate Canvas Overlay ── */}
      {isEnabled && (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          <svg
            className="w-full h-full"
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
          >
            <defs>
              <filter id="box-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {visibleBoxes.map((box) => {
              const isActive = activeFieldId === box.fieldKey;
              const isHovered = effectiveHoveredId === box.fieldKey;
              const isHighlighted = isActive || isHovered;
              const colors = getConfidenceColors(box.confidenceBand);

              // Convert 0.0 - 1.0 relative coordinates to 0 - 1000 svg viewBox units
              const rx = box.x * 1000;
              const ry = box.y * 1000;
              const rw = box.width * 1000;
              const rh = box.height * 1000;

              return (
                <g
                  key={box.id}
                  className="pointer-events-auto cursor-pointer transition-all duration-150"
                  onMouseEnter={() => {
                    setLocalHoveredBoxId(box.fieldKey);
                    onHoverField(box.fieldKey);
                  }}
                  onMouseLeave={() => {
                    setLocalHoveredBoxId(null);
                    onHoverField(null);
                  }}
                  onClick={() => onSelectField(box.fieldKey)}
                >
                  {/* Bounding Box Rect */}
                  <rect
                    x={rx}
                    y={ry}
                    width={rw}
                    height={rh}
                    rx="6"
                    fill={isHighlighted ? "rgba(79, 70, 229, 0.22)" : colors.bg}
                    stroke={isHighlighted ? "#4F46E5" : colors.border}
                    strokeWidth={isHighlighted ? 4 : 2}
                    strokeDasharray={isHighlighted ? "none" : box.confidenceBand === "LOW" ? "6,4" : "none"}
                    className={isHighlighted ? "animate-pulse" : ""}
                    filter={isHighlighted ? "url(#box-glow)" : undefined}
                  />

                  {/* Top-left Indicator Anchor Badge */}
                  <g transform={`translate(${rx + 4}, ${ry - 18 > 0 ? ry - 18 : ry + 16})`}>
                    <rect
                      x="0"
                      y="-12"
                      width={Math.min(rw - 8, isHighlighted ? 180 : 90)}
                      height="20"
                      rx="4"
                      fill={isHighlighted ? "#4F46E5" : "#1E293B"}
                      opacity="0.95"
                    />
                    <text
                      x="6"
                      y="2"
                      fill="#FFFFFF"
                      fontSize="11"
                      fontFamily="Inter, monospace"
                      fontWeight="600"
                    >
                      {isHighlighted ? `${box.label}: ${box.confidence}%` : `${box.confidence}%`}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* ── Active / Hovered Field Floating Card Overlay ── */}
          {effectiveHoveredId && (
            (() => {
              const activeBox = boxes.find((b) => b.fieldKey === effectiveHoveredId);
              if (!activeBox) return null;
              const colors = getConfidenceColors(activeBox.confidenceBand);

              return (
                <div
                  className="absolute pointer-events-auto transition-all duration-200 z-30"
                  style={{
                    left: `${Math.min(75, Math.max(5, activeBox.x * 100))}%`,
                    top: `${Math.min(85, (activeBox.y + activeBox.height) * 100 + 1)}%`,
                  }}
                >
                  <div
                    onClick={() => onSelectField(activeBox.fieldKey)}
                    className="cursor-pointer bg-neutral-900/95 dark:bg-zinc-900/95 text-white border border-indigo-500/80 rounded-lg p-2.5 shadow-xl backdrop-blur-md max-w-xs space-y-1.5 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-neutral-700/80 pb-1 text-micro">
                      <span className="font-semibold text-indigo-300 flex items-center gap-1 font-sans">
                        <Crosshair size={11} className="text-indigo-400" />
                        {activeBox.label}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded font-mono font-bold text-[10px] ${colors.badgeBg}`}>
                        {activeBox.confidence}% Confidence
                      </span>
                    </div>

                    <p className="text-caption font-mono font-medium text-neutral-100 truncate">
                      {activeBox.value}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-0.5">
                      <span>Click to focus card field</span>
                      <span className="text-indigo-400 flex items-center gap-0.5">
                        Inspect <ExternalLink size={9} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}
    </>
  );
}
