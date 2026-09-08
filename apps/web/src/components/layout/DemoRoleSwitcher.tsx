/**
 * Demo-only role switcher — allows one-click persona switching during live demos.
 * Only rendered when VITE_DEMO_MODE=true. Must never appear in production.
 */
import { useState } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import { useAuth } from "../../app/AuthContext";
import { DEMO_ACCOUNTS } from "../../lib/constants";
import { Dialog } from "../ui/Dialog";

export function DemoRoleSwitcher() {
  const { user, login } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // Only show in demo mode
  if (import.meta.env.VITE_DEMO_MODE !== "true") return null;

  const currentAccount =
    DEMO_ACCOUNTS.find(
      (a) => a.email === user?.email || a.email.split("@")[0] === user?.email.split("@")[0]
    ) ?? DEMO_ACCOUNTS[1];

  async function handleResetDemo() {
    setResetting(true);
    try {
      // Clear demo caches / session tokens
      localStorage.removeItem("avarta_demo_user");
      localStorage.removeItem("clearops_demo_user");
      localStorage.removeItem("avarta_token");
      localStorage.removeItem("clearops_token");
      // Keep theme & sidebar state intact, reload clean baseline
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
      // Reload to reset all page state
      window.location.reload();
    } catch (err) {
      console.error("Demo role switch failed:", err);
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="relative bg-neutral-50 dark:bg-zinc-900 border-b border-neutral-200 dark:border-zinc-800 px-4 sm:px-6 py-1.5 flex items-center justify-between z-50">
      <div className="flex items-center gap-2">
        <span className="text-micro font-mono font-semibold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
          DEMO MODE
        </span>
        <span className="text-caption text-neutral-500 dark:text-zinc-400 hidden sm:inline">
          Switch personas to explore different role perspectives
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowResetModal(true)}
          disabled={resetting}
          title="Reset workspace state and reload fresh pipeline"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-neutral-100 dark:hover:bg-zinc-750 text-neutral-600 dark:text-zinc-300 text-caption font-medium transition-colors shadow-xs"
        >
          <RotateCcw size={12} className={resetting ? "animate-spin text-indigo-600" : "text-neutral-400"} />
          <span className="hidden sm:inline">Reset Demo State</span>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            disabled={switching}
            aria-label={`Current persona: ${currentAccount.name}, ${currentAccount.role}. Click to switch.`}
            title="Switch user persona"
            className="flex items-center gap-2 px-3 py-1 rounded-md border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-750 transition-colors text-body-sm shadow-xs"
          >
            <span className="text-neutral-500 dark:text-zinc-400 font-medium">Viewing as:</span>
            <span className="font-semibold text-neutral-900 dark:text-zinc-100">
              {switching ? "Switching..." : currentAccount.name}
            </span>
            <span className={`text-micro font-mono font-semibold px-1.5 py-0.5 rounded ${currentAccount.bgColor} ${currentAccount.color}`}>
              {currentAccount.role}
            </span>
            <ChevronDown size={14} className={`text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
              role="button"
              tabIndex={-1}
              aria-label="Close demo persona dropdown"
            />

            {/* Dropdown */}
            <div className="absolute right-0 top-full mt-1 w-72 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-lg shadow-lg z-50 py-1 overflow-hidden">
              <div className="px-3 py-2 border-b border-neutral-100 dark:border-zinc-800">
                <span className="text-micro font-semibold uppercase tracking-wider text-neutral-400 dark:text-zinc-500">
                  Switch Demo Persona
                </span>
              </div>
              {DEMO_ACCOUNTS.map((account) => {
                const isActive = account.email === user?.email;
                const AccountIcon = account.icon;
                return (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => handleSwitch(account)}
                    disabled={switching}
                    aria-label={`Switch to ${account.name} (${account.role})`}
                    className={`w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors ${
                      isActive
                        ? "bg-indigo-50 dark:bg-indigo-950/30"
                        : "hover:bg-neutral-50 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center ${account.bgColor}`}>
                      <AccountIcon size={14} className={account.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-body-sm font-semibold text-neutral-900 dark:text-zinc-100">
                          {account.name}
                        </span>
                        {isActive && (
                          <span className="text-micro font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-caption text-neutral-500 dark:text-zinc-400 font-mono truncate">
                          {account.email}
                        </span>
                        <span className={`text-micro font-mono font-semibold px-1 py-0.5 rounded ${account.bgColor} ${account.color}`}>
                          {account.role}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
        </div>
      </div>

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
