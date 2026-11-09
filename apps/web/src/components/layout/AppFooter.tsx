import { Link } from "react-router-dom";
import { ShieldCheck, Mail, Phone } from "lucide-react";
import { AvartaCrest } from "../brand/AvartaCrest";

export function AppFooter() {
  const currentYear = new Date().getFullYear();
  const supportEmail = (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined)?.trim();
  const supportPhone = (import.meta.env.VITE_SUPPORT_PHONE as string | undefined)?.trim();
  const hasSupportContact = Boolean(supportEmail || supportPhone);

  return (
    <footer className="mt-auto border-t border-neutral-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/60 text-micro text-neutral-500 dark:text-zinc-400 py-3.5 px-4 sm:px-6 lg:px-8 select-none transition-colors">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Left: Brand & Status */}
        <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-start">
          <Link
            to="/overview"
            aria-label="Avarta Overview"
            className="flex items-center gap-1.5 font-old-english text-sm text-neutral-800 dark:text-zinc-200 hover:opacity-80 transition-opacity"
          >
            <AvartaCrest variant="shield" className="w-3.5 h-3.5 opacity-80" />
            <span>Avarta</span>
          </Link>
          <span className="text-neutral-300 dark:text-zinc-700">|</span>
          <div className="flex items-center gap-1.5 text-neutral-600 dark:text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
            <span className="font-mono text-[10.5px]">Ledger Operational</span>
          </div>
          <span className="text-neutral-300 dark:text-zinc-700 hidden sm:inline">|</span>
          <span>© {currentYear} Avarta AP Workspace</span>
        </div>

        {/* Center: Configured Support Email & Phone (Hidden if unconfigured) */}
        {hasSupportContact && (
          <div className="flex items-center gap-3 font-mono text-[11px] flex-wrap justify-center">
            {supportEmail && (
              <a
                href={`mailto:${supportEmail}`}
                className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors"
                title="Email Operations Support Desk"
              >
                <Mail size={12} className="text-neutral-400" />
                <span>{supportEmail}</span>
              </a>
            )}
            {supportEmail && supportPhone && (
              <span className="text-neutral-300 dark:text-zinc-700">•</span>
            )}
            {supportPhone && (
              <a
                href={`tel:${supportPhone.replace(/\s+/g, "")}`}
                className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors"
                title="Call Operations Support Desk"
              >
                <Phone size={12} className="text-neutral-400" />
                <span>{supportPhone}</span>
              </a>
            )}
          </div>
        )}

        {/* Right: Workspace Compliance & Legal Notice */}
        <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-end text-[11px]">
          <Link to="/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors">
            Terms
          </Link>
          <span className="text-neutral-300 dark:text-zinc-700">•</span>
          <Link to="/privacy" className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors">
            Privacy
          </Link>
          <span className="text-neutral-300 dark:text-zinc-700">•</span>
          <Link to="/dpa" className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors">
            DPA
          </Link>
          <span className="text-neutral-300 dark:text-zinc-700">•</span>
          <Link to="/subprocessors" className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors">
            Subprocessors
          </Link>
        </div>
      </div>
    </footer>
  );
}
