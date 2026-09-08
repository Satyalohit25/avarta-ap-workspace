import { Clock, FileCheck, ArrowRight } from "lucide-react";
import { InvoiceListItem } from "../../../api/invoices";
import { Card, CardHeader, CardContent } from "../../../components/ui/Card";
import { formatCurrency, formatDate } from "../../../lib/formatters";

export interface RecentInvoicesPanelProps {
  invoices: InvoiceListItem[];
  loading: boolean;
  onInspect: (invoice: InvoiceListItem) => void;
}

export function RecentInvoicesPanel({ invoices, loading, onInspect }: RecentInvoicesPanelProps) {
  return (
    <Card level="surface" className="flex flex-col h-full">
      <CardHeader
        title="Recent Invoices"
        description="Invoices awaiting capture, review & OCR processing."
        action={
          <span className="text-micro font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
            {invoices.length} Awaiting
          </span>
        }
      />
      <CardContent className="p-4 flex-1 flex flex-col space-y-2.5">
        {loading ? (
          <div className="py-8 text-center text-caption text-neutral-400">
            Loading ingestion queue...
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileCheck size={20} />
            </div>
            <p className="text-body-sm font-medium text-neutral-800 dark:text-zinc-200">
              All caught up!
            </p>
            <p className="text-caption text-neutral-500 max-w-xs mx-auto">
              All received invoices have been processed into matching &amp; validation.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="p-3.5 rounded-lg border border-neutral-200/80 dark:border-zinc-800 bg-neutral-50/40 dark:bg-zinc-900/60 hover:bg-white dark:hover:bg-zinc-900 transition-colors shadow-2xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-semibold text-body-sm text-neutral-900 dark:text-zinc-100">
                        {inv.invoiceNumber}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-200/70 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400 font-medium leading-none">
                        {inv.source ?? "UPLOAD"}
                      </span>
                    </div>
                    <p className="text-caption text-neutral-600 dark:text-zinc-300 font-medium truncate">
                      {inv.supplier?.name ?? "Unknown Vendor"}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-semibold text-body-sm text-neutral-900 dark:text-zinc-100 block tabular-nums">
                      {formatCurrency(inv.totalAmount, inv.currency)}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {inv.invoiceDate ? formatDate(inv.invoiceDate) : "Received today"}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-200/50 dark:border-zinc-800/60 flex items-center justify-between">
                  <span className="text-micro font-mono text-neutral-400 flex items-center gap-1">
                    <Clock size={11} />
                    <span>Status: {inv.status}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => onInspect(inv)}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    <span>Inspect &amp; Process</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
