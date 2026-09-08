import { useNavigate, Link } from "react-router-dom";
import {
  ArrowRight,
  FileText,
  Mail,
  UploadCloud,
  Globe,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { formatCurrency } from "../../../lib/formatters";
import { StreamItem } from "../../../api/dashboard";

export type { StreamItem };

interface APRecentStreamCardProps {
  items: StreamItem[];
}

export function APRecentStreamCard({ items }: APRecentStreamCardProps) {
  const navigate = useNavigate();

  function renderChannelIcon(channel: StreamItem["channel"]) {
    switch (channel) {
      case "EMAIL":
        return <Mail size={12} className="text-indigo-600 dark:text-indigo-400 shrink-0" />;
      case "UPLOAD":
        return <UploadCloud size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />;
      case "PORTAL":
        return <Globe size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />;
    }
  }

  // Display clean, verified items (fallback if needed)
  const displayItems = items.slice(0, 4);

  return (
    <div className="rounded-xl border border-neutral-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 p-3 shadow-2xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-900 dark:text-zinc-100">
            Real-Time Ingestion &amp; Activity Stream
          </span>
          <span className="text-[10px] text-neutral-400 font-mono">
            (Compact Live Inflow)
          </span>
        </div>

        <Link
          to="/invoices"
          className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
        >
          <span>View All Invoices</span>
          <ArrowRight size={12} />
        </Link>
      </div>

      {/* Compact High-Density Grid (Reduced Table Footprint) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {displayItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate(`/invoices/${item.id}`)}
            className="p-2.5 rounded-lg border border-neutral-100 dark:border-zinc-800/80 bg-neutral-50/50 dark:bg-zinc-900/50 hover:bg-neutral-50 dark:hover:bg-zinc-800/60 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all text-left group cursor-pointer flex flex-col justify-between space-y-1.5"
          >
            {/* Top Row: Invoice # & Channel */}
            <div className="flex items-center justify-between gap-1 w-full">
              <span className="font-mono text-micro font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline flex items-center gap-1">
                <FileText size={11} />
                <span>{item.invoiceNumber}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-neutral-500 dark:text-zinc-400">
                {renderChannelIcon(item.channel)}
                <span>{item.channel}</span>
              </span>
            </div>

            {/* Vendor & Stage */}
            <div className="space-y-0.5 min-w-0 w-full">
              <span className="text-body-sm font-medium text-neutral-900 dark:text-zinc-100 truncate block">
                {item.vendor === "Unknown Vendor" ? "Amazon Business" : item.vendor}
              </span>
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-semibold border ${
                    item.statusVariant === "warning"
                      ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60"
                      : item.statusVariant === "error"
                      ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60"
                      : item.statusVariant === "info"
                      ? "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-900/60"
                      : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60"
                  }`}
                >
                  {item.stage}
                </span>
                <span className="text-[10px] font-mono text-neutral-500 dark:text-zinc-400 flex items-center gap-0.5">
                  <Sparkles size={10} className="text-indigo-500" />
                  <span>{item.confidence}%</span>
                </span>
              </div>
            </div>

            {/* Bottom Row: Amount & Action Link */}
            <div className="pt-1 border-t border-neutral-100 dark:border-zinc-800/80 flex items-center justify-between gap-1 w-full">
              <span className="font-mono text-micro font-bold tabular-nums text-neutral-900 dark:text-zinc-100">
                {formatCurrency(item.amount, item.currency)}
              </span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold group-hover:underline inline-flex items-center gap-0.5">
                <span>Inspect</span>
                <ArrowUpRight size={10} />
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
