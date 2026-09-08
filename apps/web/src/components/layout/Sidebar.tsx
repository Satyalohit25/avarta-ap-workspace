import { useCallback, useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  Inbox,
  FileText,
  AlertTriangle,
  CheckSquare,
  Wallet,
  Building2,
  ClipboardList,
  BarChart3,
  Archive,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { listExceptions } from "../../api/exceptions";
import { listInvoices } from "../../api/invoices";
import { listApprovals } from "../../api/approvals";
import { useAuth } from "../../app/AuthContext";
import { AvartaCrest } from "../brand/AvartaCrest";

interface NavItemDef {
  to: string;
  label: string;
  icon: typeof LayoutGrid;
  badgeKey?: "inbox" | "exceptions" | "approvals";
}

interface NavSection {
  title: string;
  items: NavItemDef[];
}

// Canonical 11-item navigation strictly ordered and grouped by lifecycle per AGENTS.md & Doc 18 §18.2
const NAV_SECTIONS: NavSection[] = [
  {
    title: "Core Workspace",
    items: [
      { to: "/overview", label: "Overview", icon: LayoutGrid },
      { to: "/inbox", label: "Inbox", icon: Inbox, badgeKey: "inbox" },
      { to: "/invoices", label: "Invoices", icon: FileText },
      {
        to: "/exceptions",
        label: "Exceptions",
        icon: AlertTriangle,
        badgeKey: "exceptions",
      },
      {
        to: "/approvals",
        label: "Approvals",
        icon: CheckSquare,
        badgeKey: "approvals",
      },
      { to: "/payments", label: "Payments", icon: Wallet },
    ],
  },
  {
    title: "Vendors & Procurement",
    items: [
      { to: "/suppliers", label: "Suppliers", icon: Building2 },
      { to: "/purchase-orders", label: "Purchase Orders", icon: ClipboardList },
    ],
  },
  {
    title: "Intelligence & Compliance",
    items: [
      { to: "/reports", label: "Reports", icon: BarChart3 },
      { to: "/archive", label: "Archive", icon: Archive },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

interface SidebarProps {
  isCollapsed?: boolean;
  isRail?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  isCollapsed = false,
  isRail: isRailProp,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const isRail = (isRailProp ?? isCollapsed) && !isMobileOpen;
  const [counts, setCounts] = useState<Record<string, number>>({});
  const { user } = useAuth();
  const location = useLocation();

  const loadCounts = useCallback(async () => {
    try {
      const [excRes, invRes, appRes] = await Promise.all([
        listExceptions().catch(() => ({ data: [] })),
        listInvoices({ status: "RECEIVED" }).catch(() => ({ data: [] })),
        listApprovals().catch(() => ({ data: [] })),
      ]);

      const openExceptions = excRes.data.filter(
        (e: { status: string }) => e.status === "OPEN",
      ).length;
      const inboxReceived = invRes.data.length;
      const pendingApprovals = appRes.data.filter(
        (a: { status: string }) => a.status === "PENDING",
      ).length;

      setCounts({
        exceptions: openExceptions,
        inbox: inboxReceived,
        approvals: pendingApprovals,
      });
    } catch {
      // Counts are best-effort
    }
  }, []);

  useEffect(() => {
    loadCounts();
    const handleUpdate = () => loadCounts();
    window.addEventListener("avarta-update-counts", handleUpdate);
    const interval = setInterval(loadCounts, 30_000);
    return () => {
      window.removeEventListener("avarta-update-counts", handleUpdate);
      clearInterval(interval);
    };
  }, [loadCounts]);

  const isCurrent = (to: string) => {
    if (to === "/overview") return location.pathname === "/overview";
    return location.pathname.startsWith(to);
  };

  // Auto-close mobile drawer on route navigation
  useEffect(() => {
    onCloseMobile?.();
  }, [location.pathname, onCloseMobile]);

  return (
    <aside
      className={`
        shrink-0 border-r border-neutral-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 flex flex-col transition-all duration-200 z-30 select-none
        ${isMobileOpen ? "fixed inset-y-0 left-0 w-60 shadow-2xl z-50 flex" : "hidden md:flex"}
        ${isRail ? "w-16" : "w-60"}
      `}
    >
      {/* Brand Header */}
      {isRail ? (
        <div className="h-16 flex items-center justify-center border-b border-neutral-200/80 dark:border-zinc-800/80 shrink-0">
          <button
            type="button"
            className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-zinc-800 flex items-center justify-center text-neutral-900 dark:text-zinc-100 shrink-0 shadow-2xs border border-neutral-200/80 dark:border-zinc-700/80 cursor-pointer hover:bg-neutral-200/60 dark:hover:bg-zinc-700/60 transition-colors group"
            title="Avarta AP Workspace — Expand Sidebar"
            onClick={onToggleCollapse}
          >
            <span className="font-old-english text-[26px] leading-none pt-0.5 select-none font-normal group-hover:scale-105 transition-transform">
              A
            </span>
          </button>
        </div>
      ) : (
        <>
          {/* Expanded Brand Header with Background Crest Watermark */}
          <div className="h-[96px] w-full flex flex-col items-center justify-center border-b border-neutral-200/80 dark:border-zinc-800/80 shrink-0 relative px-4 overflow-hidden select-none">
            {/* Background Crest Watermark */}
            <div 
              className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0"
              aria-hidden="true"
            >
              <div className="w-[220px] h-auto opacity-[0.08] dark:opacity-[0.13] transition-opacity duration-200 transform scale-110">
                <AvartaCrest
                  variant="full"
                  glow
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* Foreground Brand Typography */}
            <div className="relative z-10 flex flex-col items-center text-center">
              <span
                className="font-old-english font-normal text-neutral-900 dark:text-zinc-50 text-[38px] leading-none select-none text-center"
                style={{ letterSpacing: "0.06em" }}
              >
                Avarta
              </span>
              <span className="text-[8.5px] font-mono tracking-[0.24em] text-neutral-500 dark:text-zinc-400 uppercase font-semibold select-none text-center mt-1.5">
                Accounts Payable Workspace
              </span>
            </div>

            {isMobileOpen && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="md:hidden absolute right-3 top-3 p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-zinc-200 rounded-md transition-colors z-20"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </>
      )}

      {/* Navigation Sections — Clean custom scrollbar / no-scrollbar */}
      <nav
        className={`flex-1 overflow-y-auto overflow-x-hidden no-scrollbar ${
          isRail ? "px-2 py-3 space-y-1.5" : "px-3 py-3 space-y-3"
        }`}
      >
        {NAV_SECTIONS.map((section, sectionIdx) => (
          <div key={section.title} className="space-y-0.5">
            {/* Section Header (Expanded Mode) */}
            {!isRail && (
              <h4 className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-zinc-500 font-sans select-none">
                {section.title}
              </h4>
            )}

            {/* Subtle Divider (Rail Mode) */}
            {isRail && sectionIdx > 0 && (
              <div className="w-5 mx-auto border-t border-neutral-200/70 dark:border-zinc-800/80 my-2" />
            )}

            {/* Navigation Items */}
            <div className="space-y-1">
              {section.items.map(({ to, label, icon: Icon, badgeKey }) => {
                const badgeCount = badgeKey ? counts[badgeKey] : undefined;
                const badgeTitle =
                  badgeCount && badgeCount > 0
                    ? `${label} (${badgeCount} pending)`
                    : label;

                const isItemActive =
                  location.pathname === to ||
                  (to !== "/overview" &&
                    location.pathname.startsWith(`${to}/`));

                return (
                  <NavLink
                    key={to}
                    to={to}
                    title={isRail ? badgeTitle : undefined}
                    aria-label={badgeTitle}
                    className={() => {
                      if (isRail) {
                        return `group relative flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-all duration-150 ${
                          isItemActive
                            ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold ring-1 ring-indigo-500/30 dark:ring-indigo-400/30 shadow-2xs"
                            : "text-neutral-600 dark:text-zinc-400 hover:bg-neutral-100/80 dark:hover:bg-zinc-800/60 hover:text-neutral-900 dark:hover:text-zinc-100"
                        }`;
                      }
                      return `group relative flex items-center justify-between h-10 px-3 rounded-lg text-body-sm font-medium transition-all duration-150 ${
                        isItemActive
                          ? "bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold ring-1 ring-indigo-500/20 dark:ring-indigo-400/25 shadow-2xs"
                          : "text-neutral-600 dark:text-zinc-400 hover:bg-neutral-100/80 dark:hover:bg-zinc-800/60 hover:text-neutral-900 dark:hover:text-zinc-100"
                      }`;
                    }}
                  >
                    {() => (
                      <>
                        <div
                          className={`flex items-center ${
                            isRail ? "justify-center" : "gap-3 min-w-0"
                          }`}
                        >
                          {/* Icon Container with subtle active glow */}
                          <div className="relative flex items-center justify-center shrink-0">
                            <Icon
                              size={18}
                              strokeWidth={isItemActive ? 2 : 1.75}
                              className={
                                isItemActive
                                  ? "text-indigo-600 dark:text-indigo-400"
                                  : "text-neutral-400 dark:text-zinc-500 group-hover:text-neutral-700 dark:group-hover:text-zinc-300 transition-colors"
                              }
                            />
                          </div>

                          {!isRail && (
                            <span className="truncate leading-normal">
                              {label}
                            </span>
                          )}
                        </div>

                        {/* Numeric Badge (Expanded Mode) */}
                        {!isRail &&
                          badgeCount !== undefined &&
                          badgeCount > 0 && (
                            <span
                              className={`text-[11px] font-mono min-w-[20px] text-center px-1.5 py-0.5 rounded-full font-semibold ${
                                badgeKey === "exceptions"
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25"
                                  : badgeKey === "approvals"
                                    ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/25"
                                    : "bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400 border border-neutral-200 dark:border-zinc-700"
                              }`}
                            >
                              {badgeCount}
                            </span>
                          )}

                        {/* Status Pip (Collapsed Rail Mode) — Crisp, non-overlapping pip */}
                        {isRail &&
                          badgeCount !== undefined &&
                          badgeCount > 0 && (
                            <span
                              className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ring-2 ring-white dark:ring-zinc-900 ${
                                badgeKey === "exceptions"
                                  ? "bg-amber-500"
                                  : badgeKey === "approvals"
                                    ? "bg-indigo-500"
                                    : "bg-neutral-400 dark:bg-zinc-500"
                              }`}
                            />
                          )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Pinned Bottom: Settings & Single-Row Collapse Icon */}
      <div className="p-2.5 border-t border-neutral-200/80 dark:border-zinc-800/80 shrink-0">
        {isRail ? (
          <div className="space-y-1">
            <NavLink
              to="/settings"
              title="Settings"
              aria-label="Settings"
              className={({ isActive }) =>
                `flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-all duration-150 ${
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold ring-1 ring-indigo-500/30 dark:ring-indigo-400/30 shadow-2xs"
                    : "text-neutral-600 dark:text-zinc-400 hover:bg-neutral-100/80 dark:hover:bg-zinc-800/60 hover:text-neutral-900 dark:hover:text-zinc-100"
                }`
              }
            >
              {({ isActive }) => (
                <Settings
                  size={18}
                  strokeWidth={isActive ? 2 : 1.75}
                  className={
                    isActive
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-neutral-400 dark:text-zinc-500"
                  }
                />
              )}
            </NavLink>

            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden md:flex items-center justify-center w-10 h-10 mx-auto rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-neutral-100/80 dark:hover:bg-zinc-800/60 transition-colors"
                aria-label="Expand sidebar"
                title="Expand sidebar"
              >
                <PanelLeftOpen
                  size={17}
                  className="text-neutral-400 dark:text-zinc-500"
                />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <NavLink
              to="/settings"
              title="Settings"
              aria-label="Settings"
              className={({ isActive }) =>
                `flex-1 flex items-center gap-3 h-10 px-3 rounded-lg text-body-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold ring-1 ring-indigo-500/20 dark:ring-indigo-400/25 shadow-2xs"
                    : "text-neutral-600 dark:text-zinc-400 hover:bg-neutral-100/80 dark:hover:bg-zinc-800/60 hover:text-neutral-900 dark:hover:text-zinc-100"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center justify-center shrink-0">
                    <Settings
                      size={18}
                      strokeWidth={isActive ? 2 : 1.75}
                      className={
                        isActive
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-neutral-400 dark:text-zinc-500"
                      }
                    />
                  </div>
                  <span className="leading-normal">Settings</span>
                </>
              )}
            </NavLink>

            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden md:flex items-center justify-center w-9 h-10 rounded-lg text-neutral-400 hover:text-neutral-900 dark:text-zinc-500 dark:hover:text-zinc-100 hover:bg-neutral-100/80 dark:hover:bg-zinc-800/60 transition-colors shrink-0"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <PanelLeftClose size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
