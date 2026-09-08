import { useState, useRef, DragEvent } from "react";
import { UploadCloud, Zap, FileText, X } from "lucide-react";
import { Card, CardHeader, CardContent } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Alert } from "../../../components/ui/Alert";
import { createInvoice } from "../../../api/invoices";

export interface QueuedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  invoiceNumber: string;
}

export interface BatchIngestPanelProps {
  onBatchComplete: () => void;
}

export function BatchIngestPanel({ onBatchComplete }: BatchIngestPanelProps) {
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [isBatchDragging, setIsBatchDragging] = useState(false);
  const [batchUploading, setBatchUploading] = useState(false);
  const [batchSuccessCount, setBatchSuccessCount] = useState<number | null>(null);

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function handleBatchFiles(files: FileList | File[]) {
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    const newItems: QueuedFile[] = [];

    Array.from(files).forEach((file, index) => {
      if (allowed.includes(file.type) && file.size <= 10 * 1024 * 1024) {
        const randSuffix = Math.floor(1000 + Math.random() * 9000);
        newItems.push({
          id: `${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
          file,
          name: file.name,
          size: file.size,
          invoiceNumber: `INV-2026-${randSuffix}`,
        });
      }
    });

    if (newItems.length > 0) {
      setQueuedFiles((prev) => [...prev, ...newItems]);
      setBatchSuccessCount(null);
    }
  }

  function handleLoadDemoFiles() {
    const mockFiles: QueuedFile[] = [
      {
        id: `demo-${Date.now()}-1`,
        file: new File(["%PDF-1.4 mock pdf"], "INV-2026-TataSteel.pdf", { type: "application/pdf" }),
        name: "INV-2026-TataSteel.pdf",
        size: 142800,
        invoiceNumber: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      },
      {
        id: `demo-${Date.now()}-2`,
        file: new File(["%PDF-1.4 mock pdf"], "INV-2026-InfosysConsulting.pdf", { type: "application/pdf" }),
        name: "INV-2026-InfosysConsulting.pdf",
        size: 98400,
        invoiceNumber: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      },
      {
        id: `demo-${Date.now()}-3`,
        file: new File(["%PDF-1.4 mock pdf"], "INV-2026-SchneiderElectric.pdf", { type: "application/pdf" }),
        name: "INV-2026-SchneiderElectric.pdf",
        size: 215600,
        invoiceNumber: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      },
    ];
    setQueuedFiles((prev) => [...prev, ...mockFiles]);
    setBatchSuccessCount(null);
  }

  function handleRemoveQueuedFile(id: string) {
    setQueuedFiles((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleProcessBatch() {
    if (queuedFiles.length === 0 || batchUploading) return;
    setBatchUploading(true);

    let completed = 0;
    for (const item of queuedFiles) {
      try {
        await createInvoice({
          invoiceNumber: item.invoiceNumber,
          currency: "INR",
          totalAmount: (Math.floor(Math.random() * 45000) + 5000).toFixed(2),
          file: item.file,
        });
        completed++;
      } catch (err) {
        console.error("Batch upload item error:", err);
      }
    }

    setQueuedFiles([]);
    if (batchFileInputRef.current) batchFileInputRef.current.value = "";
    setBatchUploading(false);
    setBatchSuccessCount(completed);
    window.dispatchEvent(new CustomEvent("avarta-update-counts"));
    onBatchComplete();
  }

  return (
    <Card level="surface" className="flex flex-col h-full">
      <CardHeader
        title="Batch Ingest"
        description="Drag & drop multiple PDF or image invoices for batch AI ingestion."
      />
      <CardContent className="p-5 flex-1 flex flex-col space-y-4">
        {batchSuccessCount !== null && (
          <Alert type="success" title="Batch Ingestion Completed">
            Successfully ingested {batchSuccessCount} invoice(s) into the Received queue.
          </Alert>
        )}

        {/* Multi-File Dropzone */}
        <div
          onDragOver={(e: DragEvent) => {
            e.preventDefault();
            setIsBatchDragging(true);
          }}
          onDragLeave={(e: DragEvent) => {
            e.preventDefault();
            setIsBatchDragging(false);
          }}
          onDrop={(e: DragEvent) => {
            e.preventDefault();
            setIsBatchDragging(false);
            if (e.dataTransfer.files) {
              handleBatchFiles(e.dataTransfer.files);
            }
          }}
          onClick={() => batchFileInputRef.current?.click()}
          className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 min-h-[240px] ${
            isBatchDragging
              ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/30 scale-[1.01]"
              : "border-neutral-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700 bg-neutral-50/40 dark:bg-zinc-900/40"
          }`}
        >
          <input
            ref={batchFileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => {
              if (e.target.files) handleBatchFiles(e.target.files);
            }}
            className="hidden"
            aria-label="Upload multiple invoice files"
          />
          <div className="flex flex-col items-center justify-center gap-2.5">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-900/50">
              <UploadCloud size={24} strokeWidth={1.85} />
            </div>
            <div>
              <p className="text-body font-semibold text-neutral-900 dark:text-zinc-100">
                Drop invoice files here or{" "}
                <span className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2">
                  browse
                </span>
              </p>
              <p className="text-caption text-neutral-500 dark:text-zinc-400 mt-1">
                Supports multiple PDF, PNG, JPG files up to 10 MB each
              </p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadDemoFiles();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-micro font-semibold transition-all shadow-2xs cursor-pointer"
                >
                  <Zap size={13} className="text-amber-500" />
                  <span>Quick-Load 3 Demo Invoices</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Queued Files List */}
        {queuedFiles.length > 0 && (
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between text-caption font-medium text-neutral-600 dark:text-zinc-400">
              <span>Ready to Ingest ({queuedFiles.length} files)</span>
              <button
                type="button"
                onClick={() => {
                  setQueuedFiles([]);
                  if (batchFileInputRef.current) batchFileInputRef.current.value = "";
                }}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-zinc-200 text-micro underline cursor-pointer"
              >
                Clear all
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {queuedFiles.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-body-sm shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900">
                      <FileText size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-900 dark:text-zinc-100 truncate text-[13px]">
                        {item.name}
                      </p>
                      <p className="text-[11px] font-mono text-neutral-500 dark:text-zinc-400">
                        {formatFileSize(item.size)} • #{item.invoiceNumber}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveQueuedFile(item.id)}
                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-300 p-1 cursor-pointer"
                    aria-label={`Remove ${item.name}`}
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Button
                type="button"
                onClick={handleProcessBatch}
                disabled={batchUploading}
                className="w-full h-11 font-semibold text-body-base gap-2.5 shadow-sm rounded-lg"
              >
                <Zap size={16} />
                <span>
                  {batchUploading
                    ? `Ingesting ${queuedFiles.length} Invoices...`
                    : `Ingest & Queue ${queuedFiles.length} Invoices`}
                </span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
