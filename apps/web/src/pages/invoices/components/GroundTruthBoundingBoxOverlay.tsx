import { useState } from "react";
import {
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

export interface GroundTruthToolbarProps {
  isEnabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  filterBand: "ALL" | ConfidenceBand;
  onFilterBandChange: (band: "ALL" | ConfidenceBand) => void;
  anchoredCount: number;
  helperText?: string;
  className?: string;
}

/**
 * Clean, decoupled Ground-Truth Controls Toolbar.
 * Positioned independently above document viewers to prevent coordinate overlay bleed.
 */
export function GroundTruthToolbar({
  isEnabled,
  onToggleEnabled,
  filterBand,
  onFilterBandChange,
  anchoredCount,
  helperText = "Click highlighted field to inspect extraction",
  className = "",
}: GroundTruthToolbarProps) {
  return (
    <div
      className={`bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-b border-neutral-200 dark:border-zinc-800 px-3 py-2 flex items-center justify-between gap-2 flex-wrap text-caption z-10 shrink-0 ${className}`}
    >
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
          {isEnabled ? (
            <Eye size={12} className="text-indigo-600 dark:text-indigo-400" />
          ) : (
            <EyeOff size={12} />
          )}
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
                onClick={() => onFilterBandChange(band)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  filterBand === band
                    ? "bg-neutral-800 dark:bg-zinc-200 text-white dark:text-zinc-900 font-semibold"
                    : "text-neutral-500 dark:text-zinc-400 hover:text-neutral-800 dark:hover:text-zinc-200"
                }`}
              >
                {band === "ALL"
                  ? "All"
                  : band === "HIGH"
                    ? "≥95%"
                    : band === "MEDIUM"
                      ? "80-94%"
                      : "<80%"}
              </button>
            ))}
          </div>
        )}
      </div>

      {isEnabled && (
        <div className="flex items-center gap-2 text-micro">
          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900">
            <CheckCircle2 size={11} />
            <span>{anchoredCount} Coordinates Anchored</span>
          </span>
          <span className="text-neutral-400 dark:text-zinc-500 hidden md:inline">
            {helperText}
          </span>
        </div>
      )}
    </div>
  );
}

export interface VoucherAnchorProps {
  fieldKey: string;
  box?: GroundTruthBox;
  isEnabled: boolean;
  filterBand?: "ALL" | ConfidenceBand;
  activeFieldId?: string | null;
  hoveredFieldId?: string | null;
  onSelectField: (fieldKey: string) => void;
  onHoverField: (fieldKey: string | null) => void;
  children: React.ReactNode;
  className?: string;
  badgePlacement?: "top-right" | "top-left" | "inline";
  displayTag?: string;
}

/**
 * DOM-native ground-truth anchor for responsive Digital Voucher representations.
 * Renders directly onto the HTML element hierarchy to ensure zero coordinate drift,
 * complete scroll synchronization, and no collision with toolbars or table data.
 */
export function VoucherAnchor({
  fieldKey,
  box,
  isEnabled,
  filterBand = "ALL",
  activeFieldId,
  hoveredFieldId,
  onSelectField,
  onHoverField,
  children,
  className = "",
  badgePlacement = "top-right",
  displayTag,
}: VoucherAnchorProps) {
  if (!isEnabled) {
    return <>{children}</>;
  }

  const band = box?.confidenceBand ?? "HIGH";
  const isBandVisible = filterBand === "ALL" || band === filterBand;

  if (!isBandVisible) {
    return (
      <div className={`opacity-60 transition-opacity ${className}`}>
        {children}
      </div>
    );
  }

  const isActive = activeFieldId === fieldKey;
  const isHovered = hoveredFieldId === fieldKey;
  const isHighlighted = isActive || isHovered;
  const score = box?.confidence ?? 98;
  const label = box?.label ?? fieldKey;

  const ringClasses = isHighlighted
    ? "ring-2 ring-indigo-600 dark:ring-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/60 shadow-xs"
    : band === "HIGH"
      ? "ring-1.5 ring-emerald-500/60 dark:ring-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/20 hover:ring-emerald-500 dark:hover:ring-emerald-400"
      : band === "MEDIUM"
        ? "ring-1.5 ring-amber-500/60 dark:ring-amber-500/40 bg-amber-50/25 dark:bg-amber-950/25 hover:ring-amber-500 dark:hover:ring-amber-400"
        : "ring-1.5 ring-rose-500/60 dark:ring-rose-500/40 bg-rose-50/25 dark:bg-rose-950/25 hover:ring-rose-500 dark:hover:ring-rose-400";

  const badgeBg = isHighlighted
    ? "bg-indigo-600 text-white"
    : band === "HIGH"
      ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-zinc-950"
      : band === "MEDIUM"
        ? "bg-amber-600 text-white dark:bg-amber-500 dark:text-zinc-950"
        : "bg-rose-600 text-white dark:bg-rose-500 dark:text-zinc-950";

  const badgePositionClass =
    badgePlacement === "top-left"
      ? "absolute -top-2 left-1 z-10"
      : badgePlacement === "inline"
        ? "inline-flex items-center ml-1.5"
        : "absolute -top-2 right-1 z-10";

  return (
    <div
      role="button"
      tabIndex={0}
      data-anchor={fieldKey}
      onClick={(e) => {
        e.stopPropagation();
        onSelectField(fieldKey);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectField(fieldKey);
        }
      }}
      onMouseEnter={() => onHoverField(fieldKey)}
      onMouseLeave={() => onHoverField(null)}
      className={`relative rounded-md transition-all duration-150 cursor-pointer ${ringClasses} ${className}`}
      title={`${label}: ${score}% Confidence (Click to focus extraction field)`}
      aria-label={`${label} anchor, ${score}% confidence`}
    >
      {badgePlacement !== "inline" && (
        <span
          className={`${badgePositionClass} ${badgeBg} text-[10px] font-mono font-bold leading-none px-1.5 py-0.5 rounded shadow-2xs pointer-events-none transition-transform ${
            isHighlighted ? "scale-105 ring-1 ring-white dark:ring-zinc-900" : ""
          }`}
        >
          {displayTag || `${score}%`}
        </span>
      )}

      {children}

      {badgePlacement === "inline" && (
        <span
          className={`${badgePositionClass} ${badgeBg} text-[10px] font-mono font-bold leading-none px-1.5 py-0.5 rounded shadow-2xs pointer-events-none`}
        >
          {displayTag || `${score}%`}
        </span>
      )}
    </div>
  );
}

export interface GroundTruthSvgOverlayProps {
  boxes: GroundTruthBox[];
  activeFieldId?: string | null;
  hoveredFieldId?: string | null;
  onSelectField: (fieldKey: string) => void;
  onHoverField: (fieldKey: string | null) => void;
  filterBand: "ALL" | ConfidenceBand;
}

/**
 * Viewport-scoped SVG Coordinate Canvas Overlay.
 * Designed strictly for static PDF and Scanned Image preview containers,
 * keeping bounding boxes strictly bounded inside the document viewer frame.
 */
export function GroundTruthSvgOverlay({
  boxes,
  activeFieldId,
  hoveredFieldId,
  onSelectField,
  onHoverField,
  filterBand,
}: GroundTruthSvgOverlayProps) {
  const [localHoveredBoxId, setLocalHoveredBoxId] = useState<string | null>(null);
  const effectiveHoveredId = hoveredFieldId ?? localHoveredBoxId;

  const visibleBoxes = boxes.filter((box) => {
    if (filterBand === "ALL") return true;
    return box.confidenceBand === filterBand;
  });

  return (
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

          const rx = box.x * 1000;
          const ry = box.y * 1000;
          const rw = box.width * 1000;
          const rh = box.height * 1000;

          // Safe badge Y: clamp inside bounds so it never clips top
          const badgeY = ry > 20 ? ry - 6 : ry + 16;

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

              {/* Indicator Anchor Badge */}
              <g transform={`translate(${rx + 4}, ${badgeY})`}>
                <rect
                  x="0"
                  y="-12"
                  width={Math.min(rw - 8, isHighlighted ? 180 : 80)}
                  height="18"
                  rx="4"
                  fill={isHighlighted ? "#4F46E5" : "#1E293B"}
                  opacity="0.95"
                />
                <text
                  x="6"
                  y="1"
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

      {/* Active / Hovered Field Floating Card Overlay */}
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
  );
}

export interface GroundTruthBoundingBoxOverlayProps {
  boxes: GroundTruthBox[];
  activeFieldId?: string | null;
  hoveredFieldId?: string | null;
  onSelectField: (fieldKey: string) => void;
  onHoverField: (fieldKey: string | null) => void;
  isEnabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  filterBand?: "ALL" | ConfidenceBand;
  onFilterBandChange?: (band: "ALL" | ConfidenceBand) => void;
}

/**
 * Backward-compatible composite wrapper that renders GroundTruthToolbar + GroundTruthSvgOverlay.
 */
export function GroundTruthBoundingBoxOverlay({
  boxes,
  activeFieldId,
  hoveredFieldId,
  onSelectField,
  onHoverField,
  isEnabled,
  onToggleEnabled,
  filterBand: externalFilterBand,
  onFilterBandChange: externalOnFilterBandChange,
}: GroundTruthBoundingBoxOverlayProps) {
  const [internalFilterBand, setInternalFilterBand] = useState<"ALL" | ConfidenceBand>("ALL");
  const filterBand = externalFilterBand ?? internalFilterBand;
  const onFilterBandChange = externalOnFilterBandChange ?? setInternalFilterBand;

  const visibleBoxes = boxes.filter((box) => {
    if (filterBand === "ALL") return true;
    return box.confidenceBand === filterBand;
  });

  return (
    <>
      <GroundTruthToolbar
        isEnabled={isEnabled}
        onToggleEnabled={onToggleEnabled}
        filterBand={filterBand}
        onFilterBandChange={onFilterBandChange}
        anchoredCount={visibleBoxes.length}
      />
      {isEnabled && (
        <GroundTruthSvgOverlay
          boxes={boxes}
          activeFieldId={activeFieldId}
          hoveredFieldId={hoveredFieldId}
          onSelectField={onSelectField}
          onHoverField={onHoverField}
          filterBand={filterBand}
        />
      )}
    </>
  );
}
