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
  helperText = "Click any highlighted field to inspect extracted data",
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
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-caption font-medium transition-all ${
            isEnabled
              ? "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold shadow-2xs"
              : "bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400 border border-neutral-200 dark:border-zinc-700 hover:text-neutral-900 dark:hover:text-zinc-200"
          }`}
          title="Toggle field location highlights on the document preview"
        >
          {isEnabled ? (
            <Eye size={13} className="text-indigo-600 dark:text-indigo-400" />
          ) : (
            <EyeOff size={13} />
          )}
          <span>Field Highlights: {isEnabled ? "ON" : "OFF"}</span>
        </button>

        {isEnabled && (
          <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-neutral-200 dark:border-zinc-700 text-caption">
            <span className="text-neutral-500 dark:text-zinc-400 flex items-center gap-1 mr-1 text-micro">
              <Filter size={11} /> Confidence:
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
        <div className="flex items-center gap-2 text-caption">
          <span className="inline-flex items-center gap-1 text-neutral-600 dark:text-zinc-300 bg-neutral-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-neutral-200 dark:border-zinc-700 text-micro font-medium">
            <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
            <span>{anchoredCount} Fields Mapped</span>
          </span>
          <span className="text-neutral-500 dark:text-zinc-400 hidden md:inline text-micro">
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
 * DOM-native field anchor for responsive Digital Voucher representations.
 * Renders quiet, unobtrusive highlights that NEVER block document text.
 * High-confidence fields stay quiet; exceptions and active selections illuminate prominently.
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

  // Quiet success: High confidence items show NO harsh border when unhovered.
  // Exceptions (medium/low) show gentle warning/alert indicators.
  const ringClasses = isHighlighted
    ? "ring-2 ring-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/60 shadow-xs"
    : band === "MEDIUM"
      ? "ring-1 ring-amber-400/80 bg-amber-50/30 dark:bg-amber-950/30"
      : band === "LOW"
        ? "ring-1 ring-rose-400/80 bg-rose-50/30 dark:bg-rose-950/30"
        : "hover:bg-neutral-100/70 dark:hover:bg-zinc-800/60 hover:ring-1 hover:ring-indigo-300 dark:hover:ring-indigo-700/60";

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
      className={`relative rounded transition-all duration-150 cursor-pointer ${ringClasses} ${className}`}
      title={`${label}: ${score}% Confidence (Click to inspect and edit)`}
      aria-label={`${label} field marker, ${score}% confidence`}
    >
      {/* Floating indicator: Rendered ONLY on hover or active, positioned clear of the text */}
      {isHighlighted && (
        <span
          className="absolute -top-3 right-0 z-20 bg-indigo-700 text-white text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded shadow-sm pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
        >
          {displayTag || `${label}: ${score}%`}
        </span>
      )}

      {/* Exception indicator: Rendered if low/medium confidence when NOT highlighted */}
      {!isHighlighted && band !== "HIGH" && (
        <span
          className={`absolute -top-1.5 -right-1.5 z-10 w-2.5 h-2.5 rounded-full pointer-events-none ring-2 ring-white dark:ring-zinc-900 ${
            band === "MEDIUM" ? "bg-amber-500" : "bg-rose-500"
          }`}
          title={`Needs review: ${score}% confidence`}
        />
      )}

      {children}
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
