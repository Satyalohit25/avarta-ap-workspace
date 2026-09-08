import { useEffect, useState } from "react";
import { Bell, Search, User, Sun, Moon, Menu, LogOut, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../app/AuthContext";
import { useTheme } from "../../app/ThemeContext";
import { Command } from "../ui/Command";
import { Separator } from "../ui/Separator";
import { ProductTourModal } from "./ProductTourModal";

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
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
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
            className="flex items-center gap-2.5 bg-neutral-50 dark:bg-zinc-800/60 border border-neutral-200 dark:border-zinc-700/60 rounded-md px-3 py-1.5 w-full hover:border-neutral-300 dark:hover:border-zinc-600 cursor-pointer transition-colors text-left group"
          >
            <Search size={16} strokeWidth={1.75} className="text-neutral-400 dark:text-zinc-500 group-hover:text-neutral-500 dark:group-hover:text-zinc-400 transition-colors shrink-0" />
            <span className="w-full text-body-sm text-neutral-500 dark:text-zinc-400 truncate">Search invoices, suppliers, or PO numbers...</span>
            <kbd className="hidden sm:inline-flex items-center text-micro font-mono bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-700 text-neutral-600 dark:text-zinc-300 px-1.5 py-0.5 rounded-md shrink-0">
              Ctrl+K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Interactive Product & Onboarding Tour Button */}
          <button
            type="button"
            onClick={() => setTourOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-body-sm text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/60 rounded-lg transition-colors font-medium cursor-pointer shadow-2xs group"
            title="Open Interactive Product & Onboarding Guide"
            aria-label="Open Product Tour"
          >
            <HelpCircle size={15} className="text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline font-semibold text-[11.5px] font-mono tracking-tight">Tour Guide</span>
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 text-neutral-500 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-100 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
            title={`Switch to ${theme === "light" ? "Dark" : "Light"} mode`}
            aria-label="Toggle Theme"
          >
            {theme === "light" ? <Moon size={18} strokeWidth={1.75} /> : <Sun size={18} strokeWidth={1.75} />}
          </button>

          <Link to="/notifications" className="relative p-2 text-neutral-500 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-100 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-md transition-colors" aria-label="Notifications">
            <Bell size={18} strokeWidth={1.75} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-zinc-900" />
          </Link>

          <Separator orientation="vertical" className="h-4 mx-1" />

          <Link to="/profile" className="flex items-center gap-2 py-1 px-1.5 rounded-md text-body-sm text-neutral-700 dark:text-zinc-300 hover:bg-neutral-50 dark:hover:bg-zinc-800/80 transition-colors">
            <span className="h-7 w-7 rounded-full overflow-hidden bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-300 ring-1 ring-inset ring-neutral-200 dark:ring-zinc-700 flex items-center justify-center font-medium text-caption shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user?.name ?? "Account"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={14} strokeWidth={1.75} />
              )}
            </span>
            <div className="flex flex-col">
              <span className="font-medium text-neutral-900 dark:text-zinc-100 leading-none text-body-sm">{user?.name ?? "Account"}</span>
              <span className="text-micro text-neutral-500 dark:text-zinc-400 font-mono mt-0.5">{user?.role ?? "Finance"}</span>
            </div>
          </Link>

          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-body-sm text-neutral-500 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-100 ml-1 px-2 py-1 rounded-md hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors font-medium cursor-pointer"
            title="Sign out of Avarta"
          >
            <LogOut size={14} className="text-neutral-400 dark:text-zinc-500" />
            <span>Sign out</span>
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
