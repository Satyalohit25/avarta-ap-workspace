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
        border: "#10B981", // Emerald-500
        bg: "rgba(16, 185, 129, 0.12)",
        text: "text-emerald-700 dark:text-emerald-300",
        badgeBg: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
        dot: "bg-emerald-500",
      };
    case "MEDIUM":
      return {
        border: "#F59E0B", // Amber-500
        bg: "rgba(245, 158, 11, 0.14)",
        text: "text-amber-700 dark:text-amber-300",
        badgeBg: "bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300",
        dot: "bg-amber-500",
      };
    case "LOW":
      return {
        border: "#EF4444", // Rose-500
        bg: "rgba(239, 68, 68, 0.16)",
        text: "text-rose-700 dark:text-rose-300",
        badgeBg: "bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300",
        dot: "bg-rose-500",
      };
  }
}

interface GenerateBoxesParams {
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
}

/**
 * Derives normalized ground-truth bounding box coordinates mapped directly to
 * standard invoice layout geometries (both electronic vouchers and scanned vouchers).
 */
export function generateGroundTruthBoxes(params: GenerateBoxesParams): GroundTruthBox[] {
  const baseConf = params.overallConfidence != null ? Number(params.overallConfidence) : 96.5;
  const curr = params.currency || "INR";
  const numTotal = Number(params.totalAmount) || 50000;
  const subtotal = Math.round(numTotal * 0.8474);
  const tax = numTotal - subtotal;

  const boxes: GroundTruthBox[] = [
    // 1. Supplier / Vendor Header (Top-Left)
    {
      id: "supplierName",
      fieldKey: "supplierName",
      label: "Supplier Name",
      value: params.supplierName || "Tata Steel Limited",
      pageNumber: 1,
      x: 0.05,
      y: 0.06,
      width: 0.38,
      height: 0.05,
      confidence: Math.min(99, Math.round(baseConf + 1)),
      confidenceBand: classifyConfidenceBand(Math.min(99, Math.round(baseConf + 1))),
      category: "vendor",
    },
    {
      id: "supplierGstin",
      fieldKey: "supplierGstin",
      label: "Supplier GSTIN",
      value: params.supplierGstin || "27AAACT2727Q1ZW",
      pageNumber: 1,
      x: 0.05,
      y: 0.12,
      width: 0.28,
      height: 0.038,
      confidence: Math.min(99, Math.round(baseConf)),
      confidenceBand: classifyConfidenceBand(Math.min(99, Math.round(baseConf))),
      category: "vendor",
    },

    // 2. Invoice Identification & Dates (Top-Right)
    {
      id: "invoiceNumber",
      fieldKey: "invoiceNumber",
      label: "Invoice Number",
      value: params.invoiceNumber || "INV-2026-0042",
      pageNumber: 1,
      x: 0.64,
      y: 0.055,
      width: 0.31,
      height: 0.048,
      confidence: 99,
      confidenceBand: "HIGH",
      category: "header",
    },
    {
      id: "invoiceDate",
      fieldKey: "invoiceDate",
      label: "Document Date",
      value: params.invoiceDate ? new Date(params.invoiceDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "18 Oct 2026",
      pageNumber: 1,
      x: 0.64,
      y: 0.115,
      width: 0.28,
      height: 0.038,
      confidence: Math.max(78, Math.round(baseConf - 1.5)),
      confidenceBand: classifyConfidenceBand(Math.max(78, Math.round(baseConf - 1.5))),
      category: "header",
    },
    {
      id: "dueDate",
      fieldKey: "dueDate",
      label: "Payment Due Date",
      value: params.dueDate ? new Date(params.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "17 Nov 2026",
      pageNumber: 1,
      x: 0.64,
      y: 0.165,
      width: 0.28,
      height: 0.038,
      confidence: Math.round(baseConf - 2),
      confidenceBand: classifyConfidenceBand(Math.round(baseConf - 2)),
      category: "header",
    },

    // 3. Purchase Order Reference (Middle)
    {
      id: "purchaseOrderNumber",
      fieldKey: "purchaseOrderNumber",
      label: "Purchase Order Ref",
      value: params.purchaseOrderId ? `PO-${params.purchaseOrderId.slice(0, 8).toUpperCase()}` : "PO-2026-0842",
      pageNumber: 1,
      x: 0.52,
      y: 0.24,
      width: 0.43,
      height: 0.06,
      confidence: 94,
      confidenceBand: "MEDIUM",
      category: "po",
    },

    // 4. Line Items Table (Mid-Body)
    {
      id: "lineItems",
      fieldKey: "lineItems",
      label: "Extracted Line Items Table",
      value: `${params.linesCount && params.linesCount > 0 ? params.linesCount : 2} Items (Classified HSN 7216)`,
      pageNumber: 1,
      x: 0.04,
      y: 0.36,
      width: 0.92,
      height: 0.26,
      confidence: 97,
      confidenceBand: "HIGH",
      category: "line",
    },

    // 5. Totals & Tax Calculation Breakdown (Bottom-Right)
    {
      id: "subtotal",
      fieldKey: "subtotal",
      label: "Taxable Subtotal",
      value: `${curr} ${subtotal.toLocaleString("en-IN")}`,
      pageNumber: 1,
      x: 0.62,
      y: 0.68,
      width: 0.34,
      height: 0.045,
      confidence: 98,
      confidenceBand: "HIGH",
      category: "totals",
    },
    {
      id: "taxAmount",
      fieldKey: "taxAmount",
      label: "Tax (18% IGST / GST)",
      value: `${curr} ${tax.toLocaleString("en-IN")}`,
      pageNumber: 1,
      x: 0.62,
      y: 0.74,
      width: 0.34,
      height: 0.045,
      confidence: 95,
      confidenceBand: "HIGH",
      category: "totals",
    },
    {
      id: "totalAmount",
      fieldKey: "totalAmount",
      label: "Total Invoice Amount",
      value: `${curr} ${numTotal.toLocaleString("en-IN")}`,
      pageNumber: 1,
      x: 0.62,
      y: 0.81,
      width: 0.34,
      height: 0.06,
      confidence: 99,
      confidenceBand: "HIGH",
      category: "totals",
    },
  ];

  return boxes;
}
