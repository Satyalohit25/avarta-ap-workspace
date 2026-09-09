import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  User,
  LogOut,
  Building2,
  Sparkles,
  RotateCcw,
  Check,
  Compass,
  Command,
  Sun,
  Moon,
  ChevronDown,
  Shield,
  Layers,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../../app/AuthContext";
import { useTheme } from "../../app/ThemeContext";
import { DEMO_ACCOUNTS } from "../../lib/constants";
import { Dialog } from "../ui/Dialog";

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
  const { user, logout, login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";

  const currentAccount =
    DEMO_ACCOUNTS.find(
      (a) => a.email === user?.email || a.email.split("@")[0] === user?.email?.split("@")[0]
    ) ?? DEMO_ACCOUNTS[1];

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  async function handleResetDemo() {
    setResetting(true);
    try {
      localStorage.removeItem("avarta_demo_user");
      localStorage.removeItem("clearops_demo_user");
      localStorage.removeItem("avarta_token");
      localStorage.removeItem("clearops_token");
      window.location.reload();
    } finally {
      setTimeout(() => setResetting(false), 800);
    }
  }

  async function handleSwitch(account: (typeof DEMO_ACCOUNTS)[number]) {
    if (account.email === user?.email) {
      setIsOpen(false);
      return;
    }
    setSwitching(true);
    try {
      await login(account.email, account.password);
      setIsOpen(false);
      window.location.reload();
    } catch (err) {
      console.error("Demo role switch failed:", err);
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button in TopNav */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`User menu for ${user?.name ?? "User"} (${user?.role ?? "Finance"})`}
        className={`flex items-center gap-2 py-1 px-2 rounded-lg border transition-all cursor-pointer ${
          isOpen
            ? "bg-neutral-100 dark:bg-zinc-800 border-indigo-500/40 dark:border-indigo-400/40 shadow-xs"
            : "border-transparent hover:border-neutral-200 dark:hover:border-zinc-700/80 hover:bg-neutral-100/70 dark:hover:bg-zinc-800/60"
        }`}
      >
        <span className="relative h-7 w-7 rounded-full overflow-hidden bg-neutral-200 dark:bg-zinc-700 ring-1.5 ring-indigo-500/30 flex items-center justify-center font-medium text-caption shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={user?.name ?? "Account"} className="w-full h-full object-cover" />
          ) : (
            <User size={14} strokeWidth={2} className="text-neutral-600 dark:text-zinc-300" />
          )}
          {isDemoMode && (
            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-indigo-600 ring-1 ring-white dark:ring-zinc-900" />
          )}
        </span>

        <div className="flex flex-col text-left">
          <span className="font-semibold text-neutral-900 dark:text-zinc-100 leading-tight text-[12.5px]">
            {user?.name ?? "Account"}
          </span>
          <span className="text-[10px] text-neutral-500 dark:text-zinc-400 font-mono tracking-tight leading-none mt-0.5">
            {user?.role ?? "FINANCE"}
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
        <div className="absolute right-0 top-full mt-2 w-84 sm:w-92 bg-white dark:bg-zinc-900 border border-neutral-200/90 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-neutral-800 dark:text-zinc-200 divide-y divide-neutral-100 dark:divide-zinc-800/80">
          {/* Section 1: User & Organization Identity */}
          <div className="p-3.5 bg-neutral-50/70 dark:bg-zinc-900/50">
            <div className="flex items-start gap-3">
              <span className="h-10 w-10 rounded-full overflow-hidden bg-neutral-100 dark:bg-zinc-800 ring-2 ring-indigo-500/20 flex items-center justify-center shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={user?.name} className="w-full h-full object-cover" />
                ) : (
                  <User size={20} className="text-neutral-500 dark:text-zinc-400" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-neutral-900 dark:text-zinc-100 text-body-sm truncate">
                    {user?.name ?? "Account User"}
                  </span>
                  <span className="text-micro font-mono font-semibold px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {user?.role ?? "FINANCE"}
                  </span>
                </div>
                <span className="text-caption text-neutral-500 dark:text-zinc-400 font-mono truncate block mt-0.5">
                  {user?.email ?? "manager@avarta.dev"}
                </span>
                <div className="flex items-center gap-1.5 mt-1.5 text-micro text-neutral-600 dark:text-zinc-400">
                  <Building2 size={12} className="text-neutral-400 shrink-0" />
                  <span className="truncate font-medium">Acme Manufacturing Pvt Ltd</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-neutral-200/60 dark:border-zinc-800/60 flex items-center justify-between">
              <Link
                to="/profile"
                onClick={() => setIsOpen(false)}
                className="text-micro font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                <span>Manage Profile & Settings</span>
                <ChevronRight size={12} />
              </Link>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle Theme"
                className="flex items-center gap-1.5 px-2 py-0.5 text-micro font-medium rounded-md text-neutral-600 dark:text-zinc-400 hover:bg-neutral-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title={`Switch to ${theme === "light" ? "Dark" : "Light"} mode`}
              >
                {theme === "light" ? <Moon size={12} /> : <Sun size={12} />}
                <span className="capitalize">{theme === "light" ? "Dark" : "Light"}</span>
              </button>
            </div>
          </div>

          {/* Section 2: Demo Role Switcher & Reset (Only in Demo Mode) */}
          {isDemoMode && (
            <div className="p-3 bg-indigo-50/30 dark:bg-indigo-950/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
                  <span className="text-micro font-mono font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                    Demo Role Switcher
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setShowResetModal(true);
                  }}
                  disabled={resetting}
                  className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                  title="Reset demo data to initial clean state"
                >
                  <RotateCcw size={10} className={resetting ? "animate-spin text-indigo-600" : ""} />
                  <span>Reset Demo</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {DEMO_ACCOUNTS.map((account) => {
                  const isActive = account.email === user?.email;
                  const AccountIcon = account.icon;
                  return (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => handleSwitch(account)}
                      disabled={switching}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isActive
                          ? "bg-white dark:bg-zinc-800 border-indigo-500 shadow-2xs ring-1 ring-indigo-500/20"
                          : "bg-white/60 dark:bg-zinc-850/60 border-neutral-200/80 dark:border-zinc-800 hover:border-neutral-300 dark:hover:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className={`w-5 h-5 rounded flex items-center justify-center ${account.bgColor}`}>
                          <AccountIcon size={12} className={account.color} />
                        </div>
                        {isActive && <Check size={13} className="text-indigo-600 dark:text-indigo-400 font-bold" />}
                      </div>
                      <div className="mt-1.5">
                        <span className="text-caption font-semibold text-neutral-900 dark:text-zinc-100 block truncate leading-tight">
                          {account.name.split(" ")[0]}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-500 dark:text-zinc-400 block truncate">
                          {account.role}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Workspace Tools & Learning Center */}
          <div className="p-2 space-y-0.5">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenTour();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-body-sm font-medium text-neutral-700 dark:text-zinc-300 hover:bg-neutral-100 dark:hover:bg-zinc-800 hover:text-neutral-900 dark:hover:text-zinc-100 transition-colors cursor-pointer group"
            >
              <Compass size={16} className="text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
              <div className="flex-1 text-left">
                <span className="block leading-tight">Interactive Product Tour</span>
                <span className="text-micro text-neutral-500 dark:text-zinc-400 block">Step-by-step walkthrough & workflows</span>
              </div>
              <span className="text-micro font-mono bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-semibold">
                Tour
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenCommand();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-body-sm font-medium text-neutral-700 dark:text-zinc-300 hover:bg-neutral-100 dark:hover:bg-zinc-800 hover:text-neutral-900 dark:hover:text-zinc-100 transition-colors cursor-pointer group"
            >
              <Command size={16} className="text-neutral-500 dark:text-zinc-400 group-hover:scale-110 transition-transform" />
              <div className="flex-1 text-left">
                <span className="block leading-tight">Command Palette</span>
                <span className="text-micro text-neutral-500 dark:text-zinc-400 block">Fast jump to invoices, POs, actions</span>
              </div>
              <kbd className="text-micro font-mono bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-600 dark:text-zinc-300 px-1.5 py-0.5 rounded">
                Ctrl+K
              </kbd>
            </button>
          </div>

          {/* Section 4: Sign Out */}
          <div className="p-2 bg-neutral-50/50 dark:bg-zinc-900/50">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-body-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
            >
              <LogOut size={15} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Demo Reset */}
      <Dialog
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset Workspace Demo State"
        description="This will clear cached session overrides, active search filters, and reload initial baseline demo invoices for Acme Manufacturing Pvt Ltd."
        confirmLabel="Confirm Reset"
        onConfirm={handleResetDemo}
        isPending={resetting}
      />
    </div>
  );
}
