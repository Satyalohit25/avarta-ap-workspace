import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  User,
  LogOut,
  Building2,
  Compass,
  Command,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
  Settings,
} from "lucide-react";
import { useAuth } from "../../app/AuthContext";
import { useTheme } from "../../app/ThemeContext";

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  ADMINISTRATOR: "Administrator",
  FINANCE_MANAGER: "Finance Manager",
  FINANCE_EXECUTIVE: "Finance Executive",
  APPROVER: "Approver",
  READ_ONLY: "Read Only",
};

function formatRoleName(role?: string): string {
  if (!role) return "Finance";
  if (ROLE_DISPLAY_NAMES[role]) return ROLE_DISPLAY_NAMES[role];
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

interface UserWorkspaceMenuProps {
  avatarUrl: string | null;
  onOpenTour: () => void;
  onOpenCommand: () => void;
}

export function UserWorkspaceMenu({
  avatarUrl,
  onOpenTour,
  onOpenCommand,
}: UserWorkspaceMenuProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayRole = formatRoleName(user?.role);
  const orgName = user?.organizationName ?? "Your Organization";

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button in TopNav */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`User menu for ${user?.name ?? "User"} (${displayRole})`}
        className={`flex items-center gap-2 py-1 px-2 rounded-lg border transition-colors duration-100 cursor-pointer ${
          isOpen
            ? "bg-neutral-100 dark:bg-zinc-800 border-indigo-500/40 dark:border-indigo-400/40 shadow-xs"
            : "border-transparent hover:border-neutral-200 dark:hover:border-zinc-700/80 hover:bg-neutral-100/70 dark:hover:bg-zinc-800/60"
        }`}
      >
        <span className="relative h-7 w-7 rounded-full overflow-hidden bg-neutral-200 dark:bg-zinc-700 ring-1.5 ring-indigo-500/30 flex items-center justify-center font-medium text-caption shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={user?.name ?? "Account"}
              width={28}
              height={28}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <User size={14} strokeWidth={2} className="text-neutral-600 dark:text-zinc-300" />
          )}
        </span>

        <div className="flex flex-col text-left">
          <span className="font-semibold text-neutral-900 dark:text-zinc-100 leading-tight text-[12.5px]">
            {user?.name ?? "Account"}
          </span>
          <span className="text-[10px] text-neutral-500 dark:text-zinc-400 font-mono tracking-tight leading-none mt-0.5">
            {displayRole}
          </span>
        </div>

        <ChevronDown
          size={14}
          className={`text-neutral-400 dark:text-zinc-500 transition-transform duration-200 ml-0.5 ${
            isOpen ? "rotate-180 text-indigo-600 dark:text-indigo-400" : ""
          }`}
        />
      </button>

      {/* The Space Where Everything Exists: Dropdown / Popover Hub */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[420px] sm:w-[480px] bg-white dark:bg-zinc-900 border border-neutral-200/90 dark:border-zinc-800 rounded-lg shadow-lg z-50 overflow-hidden text-neutral-800 dark:text-zinc-200 divide-y divide-neutral-100 dark:divide-zinc-800/80">
          {/* Section 1: User & Organization Identity */}
          <div className="p-4 bg-neutral-50/70 dark:bg-zinc-900/50">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span className="h-10 w-10 rounded-full overflow-hidden bg-neutral-100 dark:bg-zinc-800 ring-2 ring-indigo-500/20 flex items-center justify-center shrink-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={user?.name ?? "Account User"}
                      width={40}
                      height={40}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={20} className="text-neutral-500 dark:text-zinc-400" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-neutral-900 dark:text-zinc-100 text-body-sm truncate">
                      {user?.name ?? "Account User"}
                    </span>
                    <span className="text-micro font-mono font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {displayRole}
                    </span>
                  </div>
                    {user?.email ?? ""}
                  <div className="flex items-center gap-1.5 mt-1.5 text-micro text-neutral-600 dark:text-zinc-400">
                    <Building2 size={12} className="text-neutral-400 shrink-0" />
                    <span className="truncate font-medium">{orgName}</span>
                  </div>
                </div>
              </div>

              {/* Quick Theme Switcher Button */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle Theme"
                className="flex items-center gap-1.5 px-2.5 py-1 text-micro font-medium rounded-lg border border-neutral-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-850 text-neutral-700 dark:text-zinc-300 hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0 shadow-2xs"
                title={`Switch to ${theme === "light" ? "Dark" : "Light"} mode`}
              >
                {theme === "light" ? <Moon size={12} /> : <Sun size={12} />}
                <span className="capitalize">{theme === "light" ? "Dark" : "Light"}</span>
              </button>
            </div>

            <div className="mt-3 pt-2.5 border-t border-neutral-200/60 dark:border-zinc-800/60 flex items-center justify-between gap-2">
              <Link
                to="/settings"
                onClick={() => setIsOpen(false)}
                className="text-micro font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1.5 transition-colors group"
              >
                <Settings size={12} className="shrink-0" />
                <span>Organization Settings</span>
                <ChevronRight size={12} />
              </Link>
              <Link
                to="/profile"
                onClick={() => setIsOpen(false)}
                className="text-micro font-semibold text-neutral-600 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-100 flex items-center gap-1 transition-colors"
              >
                <User size={12} className="shrink-0" />
                <span>My Profile</span>
              </Link>
            </div>
          </div>


          <div className="p-2.5 grid grid-cols-2 gap-2 bg-neutral-50/40 dark:bg-zinc-900/40">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenTour();
              }}
              className="flex items-center gap-2.5 p-2 rounded-sm text-body-sm font-medium text-neutral-700 dark:text-zinc-300 hover:bg-neutral-100 dark:hover:bg-zinc-800 hover:text-neutral-900 dark:hover:text-zinc-100 transition-colors cursor-pointer group border border-transparent hover:border-neutral-200 dark:hover:border-zinc-700"
            >
              <Compass size={16} className="text-neutral-600 dark:text-zinc-400 shrink-0" />
              <div className="flex-1 text-left min-w-0">
                <span className="block text-caption font-semibold leading-tight truncate">Product Tour</span>
                <span className="text-micro text-neutral-500 dark:text-zinc-400 truncate block mt-0.5">60s walkthrough</span>
              </div>
              <span className="text-micro font-mono bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300 px-1.5 py-0.5 rounded-sm font-semibold shrink-0 border border-neutral-200 dark:border-zinc-700">
                Tour
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenCommand();
              }}
              className="flex items-center gap-2.5 p-2 rounded-sm text-body-sm font-medium text-neutral-700 dark:text-zinc-300 hover:bg-neutral-100 dark:hover:bg-zinc-800 hover:text-neutral-900 dark:hover:text-zinc-100 transition-colors cursor-pointer group border border-transparent hover:border-neutral-200 dark:hover:border-zinc-700"
            >
              <Command size={16} className="text-neutral-500 dark:text-zinc-400 shrink-0" />
              <div className="flex-1 text-left min-w-0">
                <span className="block text-caption font-semibold leading-tight truncate">Command Bar</span>
                <span className="text-micro text-neutral-500 dark:text-zinc-400 font-mono truncate block mt-0.5">Search &amp; jump</span>
              </div>
              <kbd className="text-micro font-mono bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-600 dark:text-zinc-300 px-1.5 py-0.5 rounded shrink-0">
                Ctrl+K
              </kbd>
            </button>
          </div>

          {/* Section 4: Session Status & Sign Out */}
          <div className="p-2.5 px-3.5 bg-neutral-50/70 dark:bg-zinc-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2 text-micro font-mono text-neutral-500 dark:text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>TLS 1.3 Corporate Session</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="inline-flex items-center gap-1.5 text-caption font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
            >
              <LogOut size={13} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
