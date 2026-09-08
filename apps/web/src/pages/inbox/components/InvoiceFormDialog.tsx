import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SupplierListItem } from "../../../api/suppliers";
import { InvoiceForm, InvoiceFormMode } from "./InvoiceForm";
import { InvoiceFormValues } from "../validation";
import { cn } from "../../../lib/utils";

export interface InvoiceFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: InvoiceFormMode;
  initialData?: Partial<InvoiceFormValues>;
  sourceInvoiceId?: string;
  suppliers: SupplierListItem[];
  onSubmit: (values: InvoiceFormValues) => Promise<void>;
  submitting?: boolean;
}

export function InvoiceFormDialog({
  isOpen,
  onClose,
  mode,
  initialData,
  sourceInvoiceId,
  suppliers,
  onSubmit,
  submitting = false,
}: InvoiceFormDialogProps) {
  const navigate = useNavigate();
  const isCreate = mode === "create";

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-neutral-950/60 dark:bg-zinc-950/80 backdrop-blur-sm transition-opacity duration-200" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            "bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl",
            "p-6 max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 focus:outline-none transition-all duration-200"
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-neutral-200/70 dark:border-zinc-800 pb-3.5 gap-4 min-w-0">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="text-h3 text-neutral-900 dark:text-zinc-100 font-semibold tracking-tight whitespace-nowrap truncate min-w-0">
                {isCreate
                  ? "Quick Manual Invoice Entry"
                  : `Inspect & Review Invoice: ${initialData?.invoiceNumber || "Queued Document"}`}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-body-sm text-neutral-500 dark:text-zinc-400 mt-1 truncate min-w-0">
                {isCreate
                  ? "Enter vendor details, itemized lines, and verify real-time accounting reconciliation."
                  : "Review OCR-extracted fields and lines before pushing the invoice through validation & matching."}
              </DialogPrimitive.Description>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!isCreate && sourceInvoiceId && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/invoices/${sourceInvoiceId}`);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-medium border border-neutral-200 dark:border-zinc-700 bg-neutral-50 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-200 hover:bg-neutral-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                  title="Open full workspace with side-by-side document comparison & 3-way matching"
                >
                  <span>Open Full Workspace</span>
                  <ExternalLink size={13} />
                </button>
              )}

              <DialogPrimitive.Close
                asChild
                className="rounded-lg p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-zinc-200 hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <button type="button" aria-label="Close dialog">
                  <X size={18} />
                </button>
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Shared Form Component */}
          <InvoiceForm
            key={`${mode}-${sourceInvoiceId ?? "new"}`}
            mode={mode}
            initialData={initialData}
            sourceInvoiceId={sourceInvoiceId}
            suppliers={suppliers}
            onSubmit={onSubmit}
            onCancel={onClose}
            submitting={submitting}
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
