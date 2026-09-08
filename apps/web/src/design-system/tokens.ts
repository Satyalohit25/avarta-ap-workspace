/**
 * Avarta AP Workspace — Single Source of Truth for Design Tokens
 * Traces back directly to AGENTS.md and design(2).md (§4.4, §5, §6).
 */
export const tokens = {
  color: {
    // Locked Accent
    primary: "#4F46E5",
    primaryHover: "#4338CA",

    // Locked Semantic Status Colors
    success: "#16A34A",
    warning: "#D97706",
    error: "#DC2626",
    info: "#2563EB",
    neutral: "#6B7280",

    // Surface Hierarchy (§4.5)
    canvas: "#F7F8FA",
    surface: "#FFFFFF",
    surfaceRaised: "#FFFFFF",
    surfaceMuted: "#EEF0F3",

    // Standard shadcn/ui Slate palette
    slate: {
      50: "#F8FAFC",
      100: "#F1F5F9",
      200: "#E2E8F0",
      300: "#CBD5E1",
      400: "#94A3B8",
      500: "#64748B",
      600: "#475569",
      700: "#334155",
      800: "#1E293B",
      900: "#0F172A",
      950: "#020617",
    },

    // Standard shadcn/ui Zinc palette
    zinc: {
      50: "#FAFAFA",
      100: "#F4F4F5",
      200: "#E4E4E7",
      300: "#D4D4D8",
      400: "#A1A1AA",
      500: "#71717A",
      600: "#52525B",
      700: "#3F3F46",
      800: "#27272A",
      900: "#18181B",
      950: "#09090B",
    },

    // Foreground Hierarchy
    foreground: "#111827",
    foregroundMuted: "#6B7280",
    foregroundSecondary: "#374151",

    // Border Hierarchy
    border: "#E2E5EA",
    borderStrong: "#C9CED6",
    focusRing: "#4F46E5",
  },

  // 4px Spacing Grid (§6.1)
  spacing: {
    1: "4px",
    2: "8px",
    3: "12px",
    4: "16px",
    5: "20px",
    6: "24px",
    8: "32px",
    10: "40px",
    12: "48px",
    16: "64px",
  },

  // Locked Radius Scale (§6.3)
  radius: {
    sm: "4px",
    md: "6px",
    lg: "8px",
    xl: "12px",
    full: "9999px",
  },

  // Inter Typography Scale (§5.3)
  typography: {
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
    fontFamilyMono: "ui-monospace, SFMono-Regular, Menlo, monospace",
    display: { size: "32px", lineHeight: "40px", weight: "600" },
    h1: { size: "24px", lineHeight: "32px", weight: "600" },
    h2: { size: "20px", lineHeight: "28px", weight: "600" },
    h3: { size: "16px", lineHeight: "24px", weight: "600" },
    body: { size: "14px", lineHeight: "20px", weight: "400" },
    bodyMedium: { size: "14px", lineHeight: "20px", weight: "500" },
    small: { size: "12px", lineHeight: "16px", weight: "400" },
    label: { size: "12px", lineHeight: "16px", weight: "500" },
    micro: { size: "11px", lineHeight: "16px", weight: "500" },
  },

  // Chart Series Colors (§18.2)
  chartSeries: ["#4F46E5", "#0EA5E9", "#16A34A", "#D97706", "#DC2626", "#6366F1", "#6B7280"],
} as const;

export const classNameVariants = {
  tableCard: "bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl shadow-2xs overflow-hidden",
  moneyText: "text-right font-mono tabular-nums text-neutral-900 dark:text-zinc-100 font-semibold",
  codeBadge: "text-micro font-mono bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400 px-2 py-0.5 rounded-full inline-block",
} as const;
