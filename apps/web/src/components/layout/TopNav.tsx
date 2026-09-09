import { useEffect, useState } from "react";
import { Bell, Search, User, Sun, Moon, Menu, LogOut, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../app/AuthContext";
import { useTheme } from "../../app/ThemeContext";
import { Command } from "../ui/Command";
import { Separator } from "../ui/Separator";
import { ProductTourModal } from "./ProductTourModal";
import { UserWorkspaceMenu } from "./UserWorkspaceMenu";

interface TopNavProps {
  onOpenMobileMenu?: () => void;
}

export function TopNav({ onOpenMobileMenu }: TopNavProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [commandOpen, setCommandOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    return localStorage.getItem("avarta_user_avatar") || null;
  });

  useEffect(() => {
    function handleAvatarSync() {
      setAvatarUrl(localStorage.getItem("avarta_user_avatar") || null);
    }
    window.addEventListener("avatar_updated", handleAvatarSync);
    return () => window.removeEventListener("avatar_updated", handleAvatarSync);
  }, []);

  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  return (
    <>
      <header className="h-16 shrink-0 sticky top-0 z-40 border-b border-neutral-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 transition-colors gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          {/* Mobile Hamburger Menu Toggle */}
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
            className="md:hidden p-2 text-neutral-600 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-100 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
          >
            <Menu size={20} />
          </button>

          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            aria-label="Search invoices, suppliers, or PO numbers (Ctrl+K)"
            className="flex items-center gap-2.5 bg-neutral-50 dark:bg-zinc-800/60 border border-neutral-200 dark:border-zinc-700/60 rounded-lg px-3 py-1.5 w-full hover:border-neutral-300 dark:hover:border-zinc-600 cursor-pointer transition-colors text-left group"
          >
            <Search size={15} strokeWidth={1.75} className="text-neutral-400 dark:text-zinc-500 group-hover:text-neutral-500 dark:group-hover:text-zinc-400 transition-colors shrink-0" />
            <span className="w-full text-body-sm text-neutral-500 dark:text-zinc-400 truncate">Search invoices, suppliers, or PO numbers...</span>
            <kbd className="hidden sm:inline-flex items-center text-micro font-mono bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-700 text-neutral-600 dark:text-zinc-300 px-1.5 py-0.5 rounded-md shrink-0">
              Ctrl+K
            </kbd>
          </button>

          {import.meta.env.VITE_DEMO_MODE === "true" && (
            <span className="hidden xl:inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 shrink-0">
              DEMO
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Quick Help & Tour Button */}
          <button
            type="button"
            onClick={() => setTourOpen(true)}
            className="p-2 text-neutral-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            title="Product Tour & Guide"
            aria-label="Product Tour & Guide"
          >
            <HelpCircle size={17} strokeWidth={1.75} />
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 text-neutral-500 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-100 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            title={`Switch to ${theme === "light" ? "Dark" : "Light"} mode`}
            aria-label="Toggle Theme"
          >
            {theme === "light" ? <Moon size={17} strokeWidth={1.75} /> : <Sun size={17} strokeWidth={1.75} />}
          </button>

          {/* Notifications Link */}
          <Link
            to="/notifications"
            className="relative p-2 text-neutral-500 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-100 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell size={17} strokeWidth={1.75} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-zinc-900" />
          </Link>

          <Separator orientation="vertical" className="h-4 mx-1" />

          {/* Unified Workspace & User Hub Popover ("The space where everything exists") */}
          <UserWorkspaceMenu
            avatarUrl={avatarUrl}
            onOpenTour={() => setTourOpen(true)}
            onOpenCommand={() => setCommandOpen(true)}
          />

          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-body-sm text-neutral-500 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-100 ml-0.5 px-2 py-1 rounded-md hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors font-medium cursor-pointer"
            title="Sign out of Avarta"
          >
            <LogOut size={14} className="text-neutral-400 dark:text-zinc-500" />
            <span className="hidden md:inline">Sign out</span>
            <span className="sr-only md:not-sr-only">Sign out</span>
          </button>
        </div>
      </header>

      {/* Global Ctrl+K Command Palette Modal */}
      <Command isOpen={commandOpen} onClose={() => setCommandOpen(false)} />

      {/* Interactive Product & Onboarding Tour Modal */}
      <ProductTourModal isOpen={tourOpen} onClose={() => setTourOpen(false)} />
    </>
  );
}
