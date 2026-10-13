import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Cookie, ShieldCheck, X } from "lucide-react";
import { Button } from "./Button";

const CONSENT_STORAGE_KEY = "avarta_cookie_consent_v1";

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (!stored) {
        setIsVisible(true);
      }
    } catch {
      // In case of restricted localStorage
    }
  }, []);

  function handleAcceptAll() {
    try {
      localStorage.setItem(
        CONSENT_STORAGE_KEY,
        JSON.stringify({ essential: true, analytics: true, timestamp: Date.now() })
      );
    } catch {}
    setIsVisible(false);
  }

  function handleEssentialOnly() {
    try {
      localStorage.setItem(
        CONSENT_STORAGE_KEY,
        JSON.stringify({ essential: true, analytics: false, timestamp: Date.now() })
      );
    } catch {}
    setIsVisible(false);
  }

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Cookie consent banner"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-lg z-50 p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-xl text-neutral-900 dark:text-zinc-100 space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-300 contain-layout contain-paint will-change-transform"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
            <Cookie size={18} aria-hidden="true" />
          </div>
          <div>
            <h4 className="text-body-sm font-semibold flex items-center gap-1.5">
              <span>Privacy & Cookie Preferences</span>
              <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            </h4>
            <p className="text-caption text-neutral-500 dark:text-zinc-400 mt-0.5">
              We use strictly necessary cookies to keep you signed in securely and manage your financial sessions.
            </p>
          </div>
        </div>
        <button
          onClick={handleEssentialOnly}
          className="text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-200 p-1"
          aria-label="Dismiss cookie notice"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-zinc-800 text-caption">
        <Link
          to="/privacy"
          className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium text-micro"
        >
          Read Privacy Policy ↗
        </Link>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleEssentialOnly}
            className="text-micro h-7.5 px-2.5"
          >
            Essential Only
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={handleAcceptAll}
            className="text-micro h-7.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Accept All
          </Button>
        </div>
      </div>
    </aside>
  );
}
