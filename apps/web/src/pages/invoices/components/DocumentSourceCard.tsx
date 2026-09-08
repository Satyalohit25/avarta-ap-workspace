import { useState, useRef, DragEvent, ChangeEvent } from "react";
import {
  FileText,
  Download,
  ExternalLink,
  AlertCircle,
  UploadCloud,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { API_URL, getAccessToken } from "../../../api/client";
import { DocumentItem } from "../../../api/invoices";

interface DocumentSourceCardProps {
  invoiceId: string;
  source?: string;
  documents?: DocumentItem[];
  canUploadDocument?: boolean;
  onUploadDocument?: (file: File) => Promise<void> | void;
  isUploading?: boolean;
}

export function DocumentSourceCard({
  invoiceId,
  source,
  documents,
  canUploadDocument = true,
  onUploadDocument,
  isUploading = false,
}: DocumentSourceCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const primaryDoc = documents && documents.length > 0 ? documents[0] : null;
  const sourceLabel =
    source === "UPLOAD"
      ? "Captured via Upload"
      : source === "PORTAL"
        ? "Captured via Portal"
        : `Captured via ${source ?? "Portal"}`;

  const [previewError, setPreviewError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function handleFileSelected(file: File) {
    setUploadError(null);
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.type)) {
      setUploadError("Invalid file type. Supported: PDF, PNG, JPG.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File size exceeds 10 MB maximum limit.");
      return;
    }

    if (onUploadDocument) {
      void onUploadDocument(file);
    }
  }

  function handleLoadSamplePdf() {
    const sampleBlob = new Blob(
      [
        "%PDF-1.4 Mock Invoice Document for Avarta AP Workspace Demo\n1 0 obj\n<< /Title (Invoice INV-603270) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF",
      ],
      { type: "application/pdf" },
    );
    const sampleFile = new File(
      [sampleBlob],
      `INV-${invoiceId.slice(0, 6).toUpperCase()}_Acme_Invoice.pdf`,
      {
        type: "application/pdf",
      },
    );
    handleFileSelected(sampleFile);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  }

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  }

  const isPdf = primaryDoc?.mimeType.includes("pdf");
  const isImage = primaryDoc?.mimeType.startsWith("image/");
  const authToken = typeof window !== "undefined" ? getAccessToken() : null;
  const previewUrl = primaryDoc
    ? `${API_URL}/invoices/${invoiceId}/documents/${primaryDoc.id}/file${authToken ? `?token=${encodeURIComponent(authToken)}` : ""}`
    : null;

  return (
    <Card
      id="invoice-document-dropzone"
      level="surface"
      className="flex flex-col overflow-hidden h-full"
    >
      <div className="p-4 border-b border-neutral-200 dark:border-zinc-800 flex items-center justify-between">
        <div>
          <h3 className="text-h3 text-neutral-900 dark:text-zinc-100 font-semibold">
            Document Source
          </h3>
          <p className="text-caption text-neutral-500 dark:text-zinc-400">
            {primaryDoc
              ? "Original verified invoice file & captured artifacts"
              : "Source file intake & document attachment"}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {primaryDoc && (
            <span className="text-micro font-mono bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400 px-1.5 py-0.5 rounded">
              {formatBytes(primaryDoc.fileSize)}
            </span>
          )}
          <span className="text-micro font-mono bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400 px-1.5 py-0.5 rounded">
            {sourceLabel}
          </span>
        </div>
      </div>

      <CardContent className="p-0 flex-1 flex flex-col">
        {primaryDoc && previewUrl && !previewError ? (
          <div className="flex-1 flex flex-col">
            {/* Embedded Document Preview */}
            {isPdf ? (
              <iframe
                src={previewUrl}
                title={`Preview: ${primaryDoc.fileName}`}
                className="w-full flex-1 min-h-[480px] border-0 bg-neutral-50 dark:bg-zinc-800/40"
                onError={() => setPreviewError(true)}
              />
            ) : isImage ? (
              <div className="flex-1 min-h-[480px] bg-neutral-50 dark:bg-zinc-800/40 flex items-center justify-center p-4">
                <img
                  src={previewUrl}
                  alt={primaryDoc.fileName}
                  className="max-w-full max-h-full object-contain rounded-sm"
                  onError={() => setPreviewError(true)}
                />
              </div>
            ) : (
              <PreviewUnavailable
                fileName={primaryDoc.fileName}
                previewUrl={previewUrl}
              />
            )}

            {/* Document Action bar */}
            <div className="p-3 border-t border-neutral-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900">
              <div className="flex items-center gap-2 min-w-0">
                <FileText
                  size={15}
                  className="text-indigo-600 dark:text-indigo-400 shrink-0"
                />
                <span className="text-micro font-mono text-neutral-700 dark:text-zinc-300 truncate max-w-[220px]">
                  {primaryDoc.fileName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-8 text-body-sm"
                  >
                    <ExternalLink size={13} />
                    <span>Open</span>
                  </Button>
                </a>
                <a href={previewUrl} download={primaryDoc.fileName}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-8 text-body-sm"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </Button>
                </a>
              </div>
            </div>
          </div>
        ) : primaryDoc && previewError ? (
          <PreviewUnavailable
            fileName={primaryDoc.fileName}
            previewUrl={previewUrl}
          />
        ) : canUploadDocument ? (
          /* Active Document Dropzone in Intake State */
          <div className="p-6 flex-1 flex flex-col items-center justify-center text-center bg-neutral-50/50 dark:bg-zinc-900/40">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full max-w-md border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40 scale-[1.01]"
                  : "border-neutral-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-white dark:bg-zinc-900"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileInputChange}
                className="hidden"
                aria-label="Upload invoice source document"
              />
              <div className="flex flex-col items-center justify-center gap-2.5">
                <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-900/50">
                  <UploadCloud size={22} strokeWidth={1.85} />
                </div>
                <div>
                  <h4 className="text-body font-semibold text-neutral-900 dark:text-zinc-100">
                    {isUploading
                      ? "Uploading Document..."
                      : "Attach Source Document"}
                  </h4>
                  <p className="text-caption text-neutral-500 dark:text-zinc-400 mt-1">
                    Drag &amp; drop PDF or image invoice here, or{" "}
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold underline underline-offset-2">
                      browse
                    </span>
                  </p>
                </div>
                <span className="text-micro font-mono text-neutral-400 dark:text-zinc-500 mt-1">
                  PDF, PNG, JPG ≤ 10 MB
                </span>
              </div>
            </div>

            {/* Demo Accelerator Button */}
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLoadSamplePdf();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-micro font-medium bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300 border border-neutral-200 dark:border-zinc-700 transition-colors"
                title="Load a realistic demo PDF invoice"
              >
                <Zap size={12} className="text-indigo-500" />
                <span> Load Sample Invoice PDF</span>
              </button>
            </div>

            {uploadError && (
              <p className="text-caption text-error-600 dark:text-error-400 font-medium mt-3">
                {uploadError}
              </p>
            )}
          </div>
        ) : (
          /* Missing document warning in downstream state */
          <div className="p-6 flex-1 flex flex-col items-center justify-center text-center bg-amber-50/30 dark:bg-amber-950/20">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
              <AlertCircle size={22} />
            </div>
            <h4 className="text-body font-semibold text-neutral-900 dark:text-zinc-100 mb-1">
              No Source Document Attached
            </h4>
            <p className="text-caption text-neutral-600 dark:text-zinc-300 max-w-xs mb-3">
              This invoice was entered via manual direct intake without an
              attached file.
            </p>
            <span className="text-micro font-mono bg-neutral-200/60 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400 px-2 py-0.5 rounded-full">
              Manual Direct Entry
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PreviewUnavailable({
  fileName,
  previewUrl,
}: {
  fileName: string;
  previewUrl?: string | null;
}) {
  return (
    <div className="p-6 flex-1 flex flex-col items-center justify-center text-center bg-neutral-50 dark:bg-zinc-800/40 min-h-[360px]">
      <div className="w-14 h-14 rounded-full bg-white dark:bg-zinc-900 shadow-xs flex items-center justify-center mb-3 border border-neutral-200 dark:border-zinc-700">
        <AlertCircle
          size={24}
          strokeWidth={1.5}
          className="text-neutral-400 dark:text-zinc-500"
        />
      </div>
      <h4 className="text-body font-semibold text-neutral-800 dark:text-zinc-100 mb-1">
        Preview Unavailable
      </h4>
      <p className="text-caption text-neutral-500 dark:text-zinc-400 max-w-xs mb-4">
        Document stored in enterprise storage. Preview rendering requires the
        file stream.
      </p>
      <p className="text-micro font-mono text-neutral-400 dark:text-zinc-500 truncate max-w-[260px]">
        {fileName}
      </p>
      {previewUrl && (
        <a href={previewUrl} download={fileName} className="mt-3">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download size={13} />
            <span>Download</span>
          </Button>
        </a>
      )}
    </div>
  );
}
