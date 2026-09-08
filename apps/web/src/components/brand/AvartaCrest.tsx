import React from "react";
import { useTheme } from "../../app/ThemeContext";

export type CrestVariant = "full" | "emblem" | "shield" | "watermark";

export interface AvartaCrestProps {
  /**
   * - `full`: The complete heraldic crest with outer ornamental border & corner rosettes.
   * - `emblem`: Inner coat of arms (lion & tiger supporters, helm & peacock crest, scales shield, lotus, and motto banner).
   * - `shield`: Direct focal crop on the central Escutcheon (Scales of Justice). Perfect for compact icons (24px–48px).
   * - `watermark`: Low-opacity, non-intrusive backdrop with mix-blend modes for documents & certificates.
   */
  variant?: CrestVariant;
  /**
   * Explicit theme override. If omitted, detects current theme from `useTheme()`.
   */
  theme?: "light" | "dark" | "auto";
  /**
   * Additional Tailwind / CSS classes for outer container or image.
   */
  className?: string;
  /**
   * Custom alt text. Defaults to "Avarta Crest — आत्मानं विद्धि".
   */
  alt?: string;
  /**
   * When true, applies a subtle ambient backlight glow in dark mode.
   */
  glow?: boolean;
}

/**
 * AvartaCrest — Single source of truth for the institutional Avarta heraldic seal.
 *
 * Implements a tiered Level of Detail (LOD) system:
 * - full: Formal certificates, login hero, bank disbursement advice.
 * - emblem: Main navigation header, CFO ROI business case.
 * - shield: Rail sidebar icon, verification badges, stamps.
 * - watermark: Background seal on statutory audit records & receipts.
 *
 * Utilizes CSS `mix-blend-mode` (`mix-blend-multiply` in light, `mix-blend-screen` in dark)
 * so the crest lines blend seamlessly into any underlying background.
 */
export function AvartaCrest({
  variant = "full",
  theme: themeOverride = "auto",
  className = "",
  alt = "Avarta Crest — आत्मानं विद्धि",
  glow = false,
}: AvartaCrestProps) {
  const { theme: currentAppTheme } = useTheme();

  const isDark =
    themeOverride === "auto"
      ? currentAppTheme === "dark"
      : themeOverride === "dark";

  // White.png is black lines on white background (for light surfaces)
  // Black.png is white lines on black background (for dark surfaces)
  const imageSrc = isDark ? "/Black.png" : "/White.png";
  const blendModeClass = isDark
    ? "mix-blend-screen"
    : "mix-blend-multiply";

  const glowClass =
    glow && isDark
      ? "drop-shadow-[0_0_20px_rgba(255,255,255,0.18)]"
      : glow
      ? "drop-shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
      : "";

  // 1. Full Crest: Entire artwork including ornate outer border
  if (variant === "full") {
    return (
      <div
        className={`relative inline-flex items-center justify-center overflow-hidden ${className}`}
      >
        <img
          src={imageSrc}
          alt={alt}
          className={`w-full h-full object-contain ${blendModeClass} ${glowClass} transition-opacity duration-200 select-none pointer-events-none`}
          loading="eager"
        />
      </div>
    );
  }

  // 2. Emblem: Inner coat of arms (supporters, helm, shield, lotus, motto) without the outer border
  if (variant === "emblem") {
    return (
      <div
        className={`relative inline-flex items-center justify-center overflow-hidden aspect-square ${className}`}
      >
        {/* Inner container calibrated to fit the 670x660 square emblem with breathing room and 0 clipping */}
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          <img
            src={imageSrc}
            alt={alt}
            style={{
              position: "absolute",
              width: "188%",
              maxWidth: "none",
              height: "108%",
              left: "-52%",
              top: "-3.5%",
            }}
            className={`object-contain ${blendModeClass} ${glowClass} select-none pointer-events-none transition-transform duration-200`}
            loading="eager"
          />
        </div>
      </div>
    );
  }

  // 3. Shield: Focal crop directly on the central Escutcheon & Scales of Justice
  if (variant === "shield") {
    return (
      <div
        className={`relative inline-flex items-center justify-center overflow-hidden aspect-square rounded-md ${className}`}
      >
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          <img
            src={imageSrc}
            alt={alt}
            style={{
              position: "absolute",
              width: "550%",
              maxWidth: "none",
              height: "315%",
              left: "50%",
              top: "50%",
              transform: "translate(-49.9%, -57.7%)",
            }}
            className={`object-contain ${blendModeClass} ${glowClass} select-none pointer-events-none`}
            loading="eager"
          />
        </div>
      </div>
    );
  }

  // 4. Watermark: Subtle low-opacity background watermark for documents
  return (
    <div
      className={`absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden select-none z-0 ${className}`}
      aria-hidden="true"
    >
      <img
        src={imageSrc}
        alt=""
        className={`w-[85%] max-w-[680px] h-auto object-contain opacity-[0.05] dark:opacity-[0.07] ${blendModeClass} filter contrast-125`}
        loading="lazy"
      />
    </div>
  );
}

/**
 * Compact circular/square badge containing the Avarta Scales Shield.
 * Ideal for collapsed rails, small verification marks, and avatar badges.
 */
export function AvartaSealBadge({
  size = 36,
  className = "",
  glow = false,
  title = "Avarta Institutional Trust Seal",
}: {
  size?: number;
  className?: string;
  glow?: boolean;
  title?: string;
}) {
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-zinc-800 border border-neutral-200/80 dark:border-zinc-700/80 shadow-2xs overflow-hidden ${className}`}
      style={{ width: size, height: size }}
      title={title}
    >
      <AvartaCrest variant="shield" glow={glow} className="w-full h-full p-1" />
    </div>
  );
}
