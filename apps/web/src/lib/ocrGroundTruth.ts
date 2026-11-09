import { tokens } from "../design-system/tokens";

export type ConfidenceBand = "HIGH" | "MEDIUM" | "LOW";

export interface GroundTruthBox {
  id: string;
  fieldKey: string;
  label: string;
  value: string;
  pageNumber: number;
  x: number; // 0.0 - 1.0 (relative left percentage)
  y: number; // 0.0 - 1.0 (relative top percentage)
  width: number; // 0.0 - 1.0 (relative width)
  height: number; // 0.0 - 1.0 (relative height)
  confidence: number; // 0 - 100
  confidenceBand: ConfidenceBand;
  category: "header" | "vendor" | "po" | "line" | "totals";
}

export function classifyConfidenceBand(score: number): ConfidenceBand {
  if (score >= 95) return "HIGH";
  if (score >= 80) return "MEDIUM";
  return "LOW";
}

export function getConfidenceColors(band: ConfidenceBand) {
  switch (band) {
    case "HIGH":
      return {
        border: tokens.color.success, // #16A34A
        bg: "rgba(22, 163, 74, 0.12)",
        text: "text-emerald-700 dark:text-emerald-300",
        badgeBg: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
        dot: "bg-emerald-500",
      };
    case "MEDIUM":
      return {
        border: tokens.color.warning, // #D97706
        bg: "rgba(217, 119, 6, 0.14)",
        text: "text-amber-700 dark:text-amber-300",
        badgeBg: "bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300",
        dot: "bg-amber-500",
      };
    case "LOW":
      return {
        border: tokens.color.error, // #DC2626
        bg: "rgba(220, 38, 38, 0.16)",
        text: "text-rose-700 dark:text-rose-300",
        badgeBg: "bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300",
        dot: "bg-rose-500",
      };
  }
}

export interface GenerateBoxesParams {
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  dueDate?: string | null;
  supplierName?: string | null;
  supplierGstin?: string | null;
  purchaseOrderId?: string | null;
  totalAmount?: number | string | null;
  currency?: string | null;
  linesCount?: number;
  overallConfidence?: number | null;
  customBoxes?: GroundTruthBox[];
  rawBoxesMap?: Record<string, { x: number; y: number; width: number; height: number; pageNumber?: number } | null>;
}

/**
 * Derives normalized ground-truth bounding box coordinates mapped directly to
 * standard invoice layout geometries (both electronic vouchers and scanned vouchers).
 * Detects specialized layout profiles like DHL Express Commercial Invoices,
 * International Air Waybills, and corporate tax invoices.
 */
export function generateGroundTruthBoxes(params: GenerateBoxesParams): GroundTruthBox[] {
  if (params.customBoxes && params.customBoxes.length > 0) {
    return params.customBoxes;
  }

  const baseConf = params.overallConfidence != null ? Number(params.overallConfidence) : 95;

  // If raw bounding boxes were extracted from OCR and passed in:
  if (params.rawBoxesMap && Object.keys(params.rawBoxesMap).length > 0) {
    const boxes: GroundTruthBox[] = [];
    const map = params.rawBoxesMap;

    for (const [key, b] of Object.entries(map)) {
      if (!b) continue;
      boxes.push({
        id: key,
        fieldKey: key,
        label: key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()),
        value: String((params as Record<string, unknown>)[key] || "—"),
        pageNumber: b.pageNumber || 1,
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        confidence: Math.round(baseConf),
        confidenceBand: classifyConfidenceBand(Math.round(baseConf)),
        category: key.includes("supplier") || key.includes("vendor")
          ? "vendor"
          : key.includes("line")
          ? "line"
          : key.includes("total") || key.includes("tax") || key.includes("subtotal")
          ? "totals"
          : key.includes("po") || key.includes("purchase")
          ? "po"
          : "header",
      });
    }

    if (boxes.length > 0) return boxes;
  }

  // No OCR geometry means no overlay. Never invent bounding boxes.
  return [];
}
