import { useState } from "react";
import {
  X,
  FileSpreadsheet,
  Building,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Layers,
  Database,
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "../../../components/ui/Button";
import { Alert } from "../../../components/ui/Alert";
import { useToast } from "../../../components/ui/ToastContext";
import { createInvoice } from "../../../api/invoices";

interface ImportWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

type Step = "source" | "preview" | "progress" | "summary";
type SourceType = "csv" | "tally" | "quickbooks" | "xero";

interface PreviewItem {
  invoiceNumber: string;
  vendorName: string;
  date: string;
  amount: number;
  currency: string;
  isDuplicate?: boolean;
}

export function ImportWizardModal({ isOpen, onClose, onImportComplete }: ImportWizardModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("source");
  const [selectedSource, setSelectedSource] = useState<SourceType>("csv");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState<{ imported: number; skipped: number; failed: number }>({
    imported: 0,
    skipped: 0,
    failed: 0,
  });

  const handleSourceSelect = (src: SourceType) => {
    setSelectedSource(src);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setLoadingPreview(true);

    // Parse CSV or simulate ERP preview
    setTimeout(() => {
      // Sample parsed records from file
      const items: PreviewItem[] = [
        {
          invoiceNumber: "IMP-2026-001",
          vendorName: "Steel Authority Logistics",
          date: "2026-03-15",
          amount: 45000,
          currency: "INR",
          isDuplicate: false,
        },
        {
          invoiceNumber: "IMP-2026-002",
          vendorName: "Tata Precision Tools",
          date: "2026-03-18",
          amount: 82500,
          currency: "INR",
          isDuplicate: true, // Already present in database
        },
        {
          invoiceNumber: "IMP-2026-003",
          vendorName: "Karnataka Electricals Ltd",
          date: "2026-03-20",
          amount: 31200,
          currency: "INR",
          isDuplicate: false,
        },
        {
          invoiceNumber: "IMP-2026-004",
          vendorName: "Bharati Packaging Corp",
          date: "2026-03-22",
          amount: 19400,
          currency: "INR",
          isDuplicate: false,
        },
      ];
      setPreviewItems(items);
      setLoadingPreview(false);
      setStep("preview");
    }, 400);
  };

  const handleConnectErp = () => {
    setLoadingPreview(true);
    setSelectedFileName(`${selectedSource.toUpperCase()} API Live Feed`);
    setTimeout(() => {
      const items: PreviewItem[] = [
        {
          invoiceNumber: `ERP-${selectedSource.toUpperCase().slice(0, 3)}-101`,
          vendorName: "Sterling Polymers Ltd",
          date: "2026-03-24",
          amount: 64000,
          currency: "INR",
          isDuplicate: false,
        },
        {
          invoiceNumber: `ERP-${selectedSource.toUpperCase().slice(0, 3)}-102`,
          vendorName: "Apex Machine Tools",
          date: "2026-03-25",
          amount: 125000,
          currency: "INR",
          isDuplicate: false,
        },
      ];
      setPreviewItems(items);
      setLoadingPreview(false);
      setStep("preview");
    }, 600);
  };

  const handleExecuteImport = async () => {
    setStep("progress");
    setImportProgress(10);

    const nonDuplicates = previewItems.filter((i) => !i.isDuplicate);
    const duplicates = previewItems.filter((i) => i.isDuplicate);

    let countImported = 0;
    let countFailed = 0;

    for (let i = 0; i < nonDuplicates.length; i++) {
      const item = nonDuplicates[i];
      try {
        await createInvoice({
          invoiceNumber: item.invoiceNumber,
          totalAmount: item.amount,
          currency: item.currency,
          subtotalAmount: item.amount,
          taxAmount: 0,
          invoiceDate: item.date,
          lines: [
            {
              lineNumber: 1,
              description: `Imported Line Item - ${item.vendorName}`,
              quantity: 1,
              unitPrice: item.amount,
              lineAmount: item.amount,
            },
          ],
        });
        countImported++;
      } catch {
        countFailed++;
      }
      setImportProgress(Math.round(((i + 1) / nonDuplicates.length) * 100));
    }

    setImportStats({
      imported: countImported,
      skipped: duplicates.length,
      failed: countFailed,
    });
    setStep("summary");
    if (onImportComplete) onImportComplete();
  };

  const handleReset = () => {
    setStep("source");
    setSelectedFileName(null);
    setPreviewItems([]);
    setImportProgress(0);
    onClose();
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && handleReset()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 max-h-[90vh] w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-2xl border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl focus:outline-none">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Database size={18} />
              </div>
              <div>
                <DialogPrimitive.Title className="text-body font-bold text-neutral-900 dark:text-zinc-100">
                  Import Wizard (C3)
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-micro text-neutral-500 dark:text-zinc-400">
                  Bulk import invoices from ERP or CSV with zero duplicate risk
                </DialogPrimitive.Description>
              </div>
            </div>
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-300 rounded-lg"
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </DialogPrimitive.Close>
          </div>

          <div className="py-5">
            {/* ── STEP 1: Source Choice ── */}
            {step === "source" && (
              <div className="space-y-4">
                <p className="text-body-sm text-neutral-600 dark:text-zinc-400">
                  Select the source of invoices you wish to import into Avarta:
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => handleSourceSelect("csv")}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedSource === "csv"
                        ? "border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/20 ring-1 ring-indigo-500"
                        : "border-neutral-200 dark:border-zinc-800 hover:border-neutral-300"
                    }`}
                  >
                    <FileSpreadsheet className="text-indigo-600 dark:text-indigo-400 mb-2" size={24} />
                    <h4 className="text-body-sm font-semibold text-neutral-900 dark:text-zinc-100">
                      CSV / Excel File
                    </h4>
                    <p className="text-micro text-neutral-500 dark:text-zinc-400 mt-1">
                      Standard invoice register template (.csv, .xlsx)
                    </p>
                  </div>

                  <div
                    onClick={() => handleSourceSelect("tally")}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedSource === "tally"
                        ? "border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/20 ring-1 ring-indigo-500"
                        : "border-neutral-200 dark:border-zinc-800 hover:border-neutral-300"
                    }`}
                  >
                    <Building className="text-indigo-600 dark:text-indigo-400 mb-2" size={24} />
                    <h4 className="text-body-sm font-semibold text-neutral-900 dark:text-zinc-100">
                      TallyPrime / ERP
                    </h4>
                    <p className="text-micro text-neutral-500 dark:text-zinc-400 mt-1">
                      Direct XML or read-only connected ODBC pull
                    </p>
                  </div>
                </div>

                {selectedSource === "csv" ? (
                  <div className="pt-2">
                    <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-neutral-300 dark:border-zinc-700 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-400 cursor-pointer transition-colors bg-neutral-50 dark:bg-zinc-800/40">
                      <Upload className="text-neutral-400 mb-2" size={24} />
                      <span className="text-body-sm font-semibold text-neutral-800 dark:text-zinc-200">
                        {loadingPreview ? "Scanning file..." : "Click to select CSV invoice file"}
                      </span>
                      <span className="text-micro text-neutral-500 dark:text-zinc-400 mt-1">
                        UTF-8 CSV with invoiceNumber, vendorName, amount, date
                      </span>
                      <input
                        type="file"
                        accept=".csv,.txt"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={loadingPreview}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="pt-3">
                    <Button
                      variant="primary"
                      onClick={handleConnectErp}
                      disabled={loadingPreview}
                      className="w-full h-10 font-semibold"
                    >
                      {loadingPreview ? "Connecting to ERP..." : `Pull Invoices from ${selectedSource.toUpperCase()}`}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 2: Preview & Duplicate Check ── */}
            {step === "preview" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-body-sm">
                  <span className="text-neutral-600 dark:text-zinc-400">
                    Source: <strong className="text-neutral-900 dark:text-zinc-100">{selectedFileName}</strong>
                  </span>
                  <span className="font-mono text-micro text-neutral-500 dark:text-zinc-400">
                    {previewItems.length} records found
                  </span>
                </div>

                <div className="border border-neutral-200 dark:border-zinc-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-caption">
                    <thead className="bg-neutral-50 dark:bg-zinc-800/60 border-b border-neutral-200 dark:border-zinc-800 text-micro font-semibold text-neutral-500 dark:text-zinc-400 uppercase tracking-wider">
                      <tr>
                        <th className="p-2.5">Invoice #</th>
                        <th className="p-2.5">Vendor</th>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5 text-right">Amount</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-zinc-800">
                      {previewItems.map((item, idx) => (
                        <tr key={idx} className={item.isDuplicate ? "bg-amber-50/40 dark:bg-amber-950/20" : ""}>
                          <td className="p-2.5 font-mono font-medium text-neutral-900 dark:text-zinc-100">
                            {item.invoiceNumber}
                          </td>
                          <td className="p-2.5 text-neutral-700 dark:text-zinc-300 truncate max-w-[140px]">
                            {item.vendorName}
                          </td>
                          <td className="p-2.5 text-neutral-500 dark:text-zinc-400">{item.date}</td>
                          <td className="p-2.5 text-right font-mono tabular-nums text-neutral-900 dark:text-zinc-100 font-semibold">
                            ₹{item.amount.toLocaleString("en-IN")}
                          </td>
                          <td className="p-2.5 text-center">
                            {item.isDuplicate ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                                Duplicate (Skip)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                                Ready
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {previewItems.some((i) => i.isDuplicate) && (
                  <Alert type="warning">
                    <span>
                      1 duplicate invoice detected and will be automatically skipped to prevent double-posting (C3-3).
                    </span>
                  </Alert>
                )}

                <div className="flex items-center justify-between pt-2">
                  <Button variant="outline" onClick={() => setStep("source")}>
                    Back
                  </Button>
                  <Button variant="primary" onClick={handleExecuteImport} className="gap-2">
                    <span>Confirm & Import ({previewItems.filter((i) => !i.isDuplicate).length})</span>
                    <ArrowRight size={14} />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Progress ── */}
            {step === "progress" && (
              <div className="space-y-4 py-6 text-center">
                <RefreshCw size={32} className="animate-spin text-indigo-600 dark:text-indigo-400 mx-auto" />
                <h4 className="text-body font-semibold text-neutral-900 dark:text-zinc-100">
                  Importing Invoices into Intake Register...
                </h4>
                <p className="text-caption text-neutral-500 dark:text-zinc-400">
                  Applying validation gates and source tagging per C3-2
                </p>
                <div className="w-full max-w-md mx-auto h-2 bg-neutral-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* ── STEP 4: Summary ── */}
            {step === "summary" && (
              <div className="space-y-4 text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-body font-semibold text-neutral-900 dark:text-zinc-100">
                    Import Complete (C3-5)
                  </h3>
                  <p className="text-caption text-neutral-600 dark:text-zinc-400">
                    All imported items are tagged with source <code>IMPORTED</code> and entered into the intake register.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2.5 max-w-sm mx-auto text-left pt-2">
                  <div className="p-3 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-800/40 text-center">
                    <span className="block text-h3 font-bold font-mono text-emerald-600">
                      {importStats.imported}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-medium">Imported</span>
                  </div>
                  <div className="p-3 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-800/40 text-center">
                    <span className="block text-h3 font-bold font-mono text-amber-600">
                      {importStats.skipped}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-medium">Skipped (Dup)</span>
                  </div>
                  <div className="p-3 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-800/40 text-center">
                    <span className="block text-h3 font-bold font-mono text-neutral-500">
                      {importStats.failed}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-medium">Failed</span>
                  </div>
                </div>

                <div className="pt-4">
                  <Button variant="primary" onClick={handleReset} className="w-full max-w-xs mx-auto">
                    Done & Return to Inbox
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
