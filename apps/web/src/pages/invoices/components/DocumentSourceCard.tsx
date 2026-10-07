import { useState, useRef, useMemo, DragEvent, ChangeEvent } from "react";
import {
  FileText,
  Download,
  ExternalLink,
  AlertCircle,
  UploadCloud,
  Zap,
  ShieldCheck,
  Building2,
  FileCheck2,
  QrCode,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { API_URL, getAccessToken } from "../../../api/client";
import { DocumentItem } from "../../../api/invoices";
import { formatCurrency, formatDate } from "../../../lib/formatters";
import { generateSupplierLineItems } from "../../../lib/mockCatalogs";
import { generateGroundTruthBoxes, GroundTruthBox, ConfidenceBand } from "../../../lib/ocrGroundTruth";
import {
  GroundTruthToolbar,
  VoucherAnchor,
  GroundTruthSvgOverlay,
} from "./GroundTruthBoundingBoxOverlay";

export interface DocumentSourceCardProps {
  invoiceId: string;
  source?: string;
  documents?: DocumentItem[];
  canUploadDocument?: boolean;
  onUploadDocument?: (file: File) => Promise<void> | void;
  isUploading?: boolean;
  invoiceNumber?: string | null;
  supplierName?: string | null;
  invoiceDate?: string | null;
  dueDate?: string | null;
  totalAmount?: number | string | null;
  currency?: string | null;
  purchaseOrderId?: string | null;
  exceptions?: Array<{ type?: string; description?: string }>;
  aiConfidence?: number | null;
  activeFieldId?: string | null;
  hoveredFieldId?: string | null;
  onSelectField?: (fieldKey: string) => void;
  onHoverField?: (fieldKey: string | null) => void;
}

export function DocumentSourceCard({
  invoiceId,
  source,
  documents,
  canUploadDocument = true,
  onUploadDocument,
  isUploading = false,
  invoiceNumber,
  supplierName,
  invoiceDate,
  dueDate,
  totalAmount,
  currency = "INR",
  purchaseOrderId,
  exceptions = [],
  aiConfidence,
  activeFieldId,
  hoveredFieldId,
  onSelectField = () => {},
  onHoverField = () => {},
}: DocumentSourceCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const primaryDoc = documents && documents.length > 0 ? documents[0] : null;

  // Ground Truth Overlay active toggle state and confidence filter
  const [isOverlayEnabled, setIsOverlayEnabled] = useState(true);
  const [filterBand, setFilterBand] = useState<"ALL" | ConfidenceBand>("ALL");

  // If there's an uploaded file, default to file preview; otherwise default to digital voucher
  const [viewMode, setViewMode] = useState<"preview" | "voucher" | "upload">(
    primaryDoc ? "preview" : "voucher",
  );

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

  // Generate realistic supplier items for digital voucher view
  const totalAmountNum = Number(totalAmount) || 50000;
  const safeCurrency = currency || "INR";
  const lineItems = generateSupplierLineItems(
    supplierName,
    totalAmountNum,
    safeCurrency,
    exceptions,
  );

  const subtotal = Math.round(totalAmountNum * 0.8474);
  const taxAmount = totalAmountNum - subtotal;

  const groundTruthBoxes: GroundTruthBox[] = useMemo(() => {
    return generateGroundTruthBoxes({
      invoiceNumber,
      invoiceDate,
      dueDate,
      supplierName,
      purchaseOrderId,
      totalAmount: totalAmountNum,
      currency: safeCurrency,
      linesCount: lineItems.length,
      overallConfidence: aiConfidence,
    });
  }, [
    invoiceNumber,
    invoiceDate,
    dueDate,
    supplierName,
    purchaseOrderId,
    totalAmountNum,
    safeCurrency,
    lineItems.length,
    aiConfidence,
  ]);

  const boxMap = useMemo(() => {
    const map = new Map<string, GroundTruthBox>();
    for (const b of groundTruthBoxes) {
      map.set(b.fieldKey, b);
    }
    return map;
  }, [groundTruthBoxes]);

  const visibleBoxes = useMemo(() => {
    return groundTruthBoxes.filter((b) => {
      if (filterBand === "ALL") return true;
      return b.confidenceBand === filterBand;
    });
  }, [groundTruthBoxes, filterBand]);

  return (
    <Card
      id="invoice-document-dropzone"
      level="surface"
      className="flex flex-col overflow-hidden h-full"
    >
      {/* Header with Switcher Tabs */}
      <div className="p-4 border-b border-neutral-200 dark:border-zinc-800 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-h3 text-neutral-900 dark:text-zinc-100 font-semibold">
              Document Source
            </h3>
            {primaryDoc ? (
              <span className="text-micro font-mono bg-success-50 dark:bg-success-950/40 text-success-700 dark:text-success-400 border border-success-200 dark:border-success-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <FileCheck2 size={11} /> File Attached
              </span>
            ) : (
              <span className="text-micro font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <ShieldCheck size={11} /> Digital EDI Record
              </span>
            )}
          </div>
          <p className="text-caption text-neutral-500 dark:text-zinc-400 mt-0.5">
            {viewMode === "preview" && primaryDoc
              ? "Original verified invoice file & captured artifacts"
              : viewMode === "voucher"
                ? "Synthesized official tax voucher from structured electronic intake"
                : "Attach physical or scanned PDF invoice file"}
          </p>
        </div>

        {/* View Mode Controller */}
        <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-neutral-200 dark:border-zinc-700">
          {primaryDoc && (
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={`px-2.5 py-1 text-micro font-medium rounded-md transition-all ${
                viewMode === "preview"
                  ? "bg-white dark:bg-zinc-900 text-neutral-900 dark:text-zinc-100 shadow-xs"
                  : "text-neutral-600 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-200"
              }`}
            >
              Original File
            </button>
          )}
          <button
            type="button"
            onClick={() => setViewMode("voucher")}
            className={`px-2.5 py-1 text-micro font-medium rounded-md transition-all ${
              viewMode === "voucher"
                ? "bg-white dark:bg-zinc-900 text-neutral-900 dark:text-zinc-100 shadow-xs"
                : "text-neutral-600 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-200"
            }`}
          >
            Digital Voucher
          </button>
          {canUploadDocument && (
            <button
              type="button"
              onClick={() => setViewMode("upload")}
              className={`px-2.5 py-1 text-micro font-medium rounded-md transition-all ${
                viewMode === "upload"
                  ? "bg-white dark:bg-zinc-900 text-neutral-900 dark:text-zinc-100 shadow-xs"
                  : "text-neutral-600 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-200"
              }`}
            >
              {primaryDoc ? "Replace File" : "Upload File"}
            </button>
          )}
        </div>
      </div>

      <CardContent className="p-0 flex-1 flex flex-col min-h-0">
        {/* MODE 1: Embedded File Preview */}
        {viewMode === "preview" && primaryDoc && previewUrl && !previewError && (
          <div className="flex-1 flex flex-col relative min-h-0">
            <GroundTruthToolbar
              isEnabled={isOverlayEnabled}
              onToggleEnabled={setIsOverlayEnabled}
              filterBand={filterBand}
              onFilterBandChange={setFilterBand}
              anchoredCount={visibleBoxes.length}
            />
            <div className="relative flex-1 min-h-[500px] overflow-hidden">
              {isOverlayEnabled && (
                <GroundTruthSvgOverlay
                  boxes={groundTruthBoxes}
                  activeFieldId={activeFieldId}
                  hoveredFieldId={hoveredFieldId}
                  onSelectField={onSelectField}
                  onHoverField={onHoverField}
                  filterBand={filterBand}
                />
              )}
              {isPdf ? (
                <iframe
                  src={previewUrl}
                  title={`Preview: ${primaryDoc.fileName}`}
                  className="w-full h-full min-h-[500px] border-0 bg-neutral-50 dark:bg-zinc-800/40"
                  onError={() => setPreviewError(true)}
                />
              ) : isImage ? (
                <div className="w-full h-full min-h-[500px] bg-neutral-50 dark:bg-zinc-800/40 flex items-center justify-center p-4">
                  <img
                    src={previewUrl}
                    alt={primaryDoc.fileName}
                    width={800}
                    height={600}
                    loading="lazy"
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
            </div>

            {/* Document Action bar */}
            <div className="p-3 border-t border-neutral-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900">
              <div className="flex items-center gap-2 min-w-0">
                <FileText
                  size={15}
                  className="text-indigo-600 dark:text-indigo-400 shrink-0"
                />
                <span className="text-micro font-mono text-neutral-700 dark:text-zinc-300 truncate max-w-[220px]">
                  {primaryDoc.fileName} ({formatBytes(primaryDoc.fileSize)})
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
        )}

        {viewMode === "preview" && primaryDoc && previewError && (
          <PreviewUnavailable
            fileName={primaryDoc.fileName}
            previewUrl={previewUrl}
          />
        )}

        {/* MODE 2: Digital Tax Voucher (EDI Intake Representation) */}
        {viewMode === "voucher" && (
          <div className="flex-1 flex flex-col relative min-h-0">
            <GroundTruthToolbar
              isEnabled={isOverlayEnabled}
              onToggleEnabled={setIsOverlayEnabled}
              filterBand={filterBand}
              onFilterBandChange={setFilterBand}
              anchoredCount={visibleBoxes.length}
            />
            <div className="p-5 flex-1 flex flex-col bg-neutral-50/70 dark:bg-zinc-900/60 overflow-y-auto relative">
              {/* Paper-style Voucher Container */}
              <div className="relative bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-700 rounded-lg p-5 shadow-xs flex-1 flex flex-col justify-between">
                <div>
                  {/* Header Strip */}
                  <div className="flex items-start justify-between border-b border-neutral-200 dark:border-zinc-800 pb-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-caption font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                          Electronic Tax Voucher
                        </span>
                        <span className="text-micro font-mono text-neutral-400 dark:text-zinc-500">
                          {sourceLabel}
                        </span>
                      </div>

                      {/* Supplier Name Anchor */}
                      <div className="mt-2">
                        <VoucherAnchor
                          fieldKey="supplierName"
                          box={boxMap.get("supplierName")}
                          isEnabled={isOverlayEnabled}
                          filterBand={filterBand}
                          activeFieldId={activeFieldId}
                          hoveredFieldId={hoveredFieldId}
                          onSelectField={onSelectField}
                          onHoverField={onHoverField}
                          className="inline-block p-1 -m-1"
                        >
                          <h4 className="text-h4 font-bold text-neutral-900 dark:text-zinc-100">
                            {supplierName || "—"}
                          </h4>
                        </VoucherAnchor>
                      </div>

                      {/* Supplier Subtitle */}
                      <div className="mt-1">
                        <VoucherAnchor
                          fieldKey="supplierGstin"
                          box={boxMap.get("supplierGstin")}
                          isEnabled={isOverlayEnabled}
                          filterBand={filterBand}
                          activeFieldId={activeFieldId}
                          hoveredFieldId={hoveredFieldId}
                          onSelectField={onSelectField}
                          onHoverField={onHoverField}
                          className="inline-block p-0.5 -m-0.5"
                        >
                          <p className="text-micro text-neutral-500 dark:text-zinc-400 font-mono">
                            {supplierName ? "Tax Invoice Voucher" : "Intake Record"}
                          </p>
                        </VoucherAnchor>
                      </div>
                    </div>

                    {/* Top Right: Invoice Number, Date, Due Date */}
                    <div className="text-right space-y-1">
                      <div>
                        <VoucherAnchor
                          fieldKey="invoiceNumber"
                          box={boxMap.get("invoiceNumber")}
                          isEnabled={isOverlayEnabled}
                          filterBand={filterBand}
                          activeFieldId={activeFieldId}
                          hoveredFieldId={hoveredFieldId}
                          onSelectField={onSelectField}
                          onHoverField={onHoverField}
                          className="inline-block p-0.5 -m-0.5"
                        >
                          <p className="text-caption font-semibold text-neutral-900 dark:text-zinc-100 font-mono">
                            {invoiceNumber || `INV-${invoiceId.slice(0, 8)}`}
                          </p>
                        </VoucherAnchor>
                      </div>

                      <div>
                        <VoucherAnchor
                          fieldKey="invoiceDate"
                          box={boxMap.get("invoiceDate")}
                          isEnabled={isOverlayEnabled}
                          filterBand={filterBand}
                          activeFieldId={activeFieldId}
                          hoveredFieldId={hoveredFieldId}
                          onSelectField={onSelectField}
                          onHoverField={onHoverField}
                          className="inline-block p-0.5 -m-0.5"
                        >
                          <p className="text-micro text-neutral-500 dark:text-zinc-400">
                            Date: {formatDate(invoiceDate)}
                          </p>
                        </VoucherAnchor>
                      </div>

                      {dueDate && (
                        <div>
                          <VoucherAnchor
                            fieldKey="dueDate"
                            box={boxMap.get("dueDate")}
                            isEnabled={isOverlayEnabled}
                            filterBand={filterBand}
                            activeFieldId={activeFieldId}
                            hoveredFieldId={hoveredFieldId}
                            onSelectField={onSelectField}
                            onHoverField={onHoverField}
                            className="inline-block p-0.5 -m-0.5"
                          >
                            <p className="text-micro text-neutral-500 dark:text-zinc-400">
                              Due: {formatDate(dueDate)}
                            </p>
                          </VoucherAnchor>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Billed To / Shipped To Grid */}
                  <div className="grid grid-cols-2 gap-4 pb-4 mb-4 border-b border-neutral-100 dark:border-zinc-800 text-body-sm">
                    <div>
                      <p className="text-micro uppercase tracking-wider text-neutral-400 dark:text-zinc-500 font-medium">
                        Billed To (Buyer)
                      </p>
                      <p className="font-semibold text-neutral-800 dark:text-zinc-200 mt-0.5">
                        Avarta Technologies Pvt Ltd
                      </p>
                      <p className="text-micro text-neutral-500 dark:text-zinc-400 font-mono">
                        GSTIN: 27AABCC1234F1Z8
                      </p>
                      <p className="text-micro text-neutral-500 dark:text-zinc-400">
                        BKC Commercial Complex, Bandra East, Mumbai 400051
                      </p>
                    </div>
                    <div>
                      <p className="text-micro uppercase tracking-wider text-neutral-400 dark:text-zinc-500 font-medium">
                        Purchase Order Ref
                      </p>
                      <VoucherAnchor
                        fieldKey="purchaseOrderNumber"
                        box={boxMap.get("purchaseOrderNumber")}
                        isEnabled={isOverlayEnabled}
                        filterBand={filterBand}
                        activeFieldId={activeFieldId}
                        hoveredFieldId={hoveredFieldId}
                        onSelectField={onSelectField}
                        onHoverField={onHoverField}
                        className="p-1.5 -m-1.5 block mt-0.5"
                      >
                        <p className="font-semibold text-neutral-800 dark:text-zinc-200 font-mono">
                          {purchaseOrderId ? purchaseOrderId : "Not Linked"}
                        </p>
                        <p className="text-micro text-neutral-500 dark:text-zinc-400">
                          Payment Terms: Net 30 Days
                        </p>
                        <p className="text-micro text-neutral-500 dark:text-zinc-400">
                          Place of Supply: Maharashtra (27)
                        </p>
                      </VoucherAnchor>
                    </div>
                  </div>

                  {/* Voucher Item Breakdown Table */}
                  <div className="mb-4">
                    <VoucherAnchor
                      fieldKey="lineItems"
                      box={boxMap.get("lineItems")}
                      isEnabled={isOverlayEnabled}
                      filterBand={filterBand}
                      activeFieldId={activeFieldId}
                      hoveredFieldId={hoveredFieldId}
                      onSelectField={onSelectField}
                      onHoverField={onHoverField}
                      className="p-2 -m-2 block overflow-x-auto"
                      displayTag="Table 97%"
                    >
                      <table className="w-full text-left text-body-sm">
                        <thead>
                          <tr className="border-b border-neutral-200 dark:border-zinc-800 text-micro font-medium uppercase text-neutral-400 dark:text-zinc-500">
                            <th className="py-2 pr-2">Item &amp; Description</th>
                            <th className="py-2 px-2 text-right">HSN/SAC</th>
                            <th className="py-2 px-2 text-right">Qty</th>
                            <th className="py-2 px-2 text-right">Unit Rate</th>
                            <th className="py-2 pl-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-zinc-800/60 font-mono text-micro">
                          {lineItems.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-neutral-50/50 dark:hover:bg-zinc-800/40">
                              <td className="py-2.5 pr-2 font-sans font-medium text-neutral-800 dark:text-zinc-200">
                                <span className="text-neutral-400 mr-1.5">{idx + 1}.</span>
                                {item.description}
                              </td>
                              <td className="py-2.5 px-2 text-right text-neutral-500 dark:text-zinc-400">
                                {item.hsnCode || "—"}
                              </td>
                              <td className="py-2.5 px-2 text-right text-neutral-700 dark:text-zinc-300">
                                {item.quantity}
                              </td>
                              <td className="py-2.5 px-2 text-right text-neutral-700 dark:text-zinc-300">
                                {formatCurrency(item.unitPrice, safeCurrency)}
                              </td>
                              <td className="py-2.5 pl-2 text-right font-semibold text-neutral-900 dark:text-zinc-100">
                                {formatCurrency(item.lineAmount, safeCurrency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </VoucherAnchor>
                  </div>
                </div>

                {/* Totals & Security Verification Seal */}
                <div>
                  <div className="border-t border-neutral-200 dark:border-zinc-800 pt-3 flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Cryptographic Seal */}
                    <div className="flex items-center gap-2.5 bg-neutral-50 dark:bg-zinc-800/70 p-2.5 rounded-lg border border-neutral-200/80 dark:border-zinc-700 text-left w-full sm:w-auto">
                      <QrCode size={30} className="text-neutral-700 dark:text-zinc-300 shrink-0" />
                      <div>
                        <div className="flex items-center gap-1 text-micro font-semibold text-success-700 dark:text-success-400">
                          <ShieldCheck size={12} />
                          <span>Cryptographically Signed Record</span>
                        </div>
                        <p className="text-micro text-neutral-400 dark:text-zinc-500 font-mono">
                          Hash: SHA256:{invoiceId.slice(0, 16)}...
                        </p>
                      </div>
                    </div>

                    {/* Summary Totals */}
                    <div className="w-full sm:w-60 space-y-1 text-caption">
                      {/* Subtotal Anchor */}
                      <VoucherAnchor
                        fieldKey="subtotal"
                        box={boxMap.get("subtotal")}
                        isEnabled={isOverlayEnabled}
                        filterBand={filterBand}
                        activeFieldId={activeFieldId}
                        hoveredFieldId={hoveredFieldId}
                        onSelectField={onSelectField}
                        onHoverField={onHoverField}
                        className="p-1 -m-1 block"
                      >
                        <div className="flex justify-between text-neutral-500 dark:text-zinc-400">
                          <span>Taxable Subtotal:</span>
                          <span className="font-mono">{formatCurrency(subtotal, safeCurrency)}</span>
                        </div>
                      </VoucherAnchor>

                      {/* Tax Amount Anchor */}
                      <VoucherAnchor
                        fieldKey="taxAmount"
                        box={boxMap.get("taxAmount")}
                        isEnabled={isOverlayEnabled}
                        filterBand={filterBand}
                        activeFieldId={activeFieldId}
                        hoveredFieldId={hoveredFieldId}
                        onSelectField={onSelectField}
                        onHoverField={onHoverField}
                        className="p-1 -m-1 block"
                      >
                        <div className="flex justify-between text-neutral-500 dark:text-zinc-400">
                          <span>GST (18% IGST):</span>
                          <span className="font-mono">{formatCurrency(taxAmount, safeCurrency)}</span>
                        </div>
                      </VoucherAnchor>

                      {/* Total Amount Anchor */}
                      <VoucherAnchor
                        fieldKey="totalAmount"
                        box={boxMap.get("totalAmount")}
                        isEnabled={isOverlayEnabled}
                        filterBand={filterBand}
                        activeFieldId={activeFieldId}
                        hoveredFieldId={hoveredFieldId}
                        onSelectField={onSelectField}
                        onHoverField={onHoverField}
                        className="p-1 -m-1 block"
                      >
                        <div className="flex justify-between text-body font-bold text-neutral-900 dark:text-zinc-100 border-t border-neutral-200 dark:border-zinc-800 pt-1">
                          <span>Invoice Total:</span>
                          <span className="font-mono text-indigo-600 dark:text-indigo-400">
                            {formatCurrency(totalAmountNum, safeCurrency)}
                          </span>
                        </div>
                      </VoucherAnchor>
                    </div>
                  </div>

                {/* Subfooter Prompt */}
                {canUploadDocument && (
                  <div className="mt-4 pt-3 border-t border-dashed border-neutral-200 dark:border-zinc-800 flex items-center justify-between text-caption text-neutral-500 dark:text-zinc-400">
                    <span>Have the physical vendor paper/PDF scan?</span>
                    <button
                      type="button"
                      onClick={() => setViewMode("upload")}
                      className="inline-flex items-center gap-1 text-body-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <span>Attach Scanned File</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* MODE 3: Active Document Dropzone */}
        {viewMode === "upload" && canUploadDocument && (
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
                id="invoice-source-replace-upload"
                name="invoiceSourceFile"
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
                      : primaryDoc
                        ? "Replace Source Document"
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

            {/* Quick Demo Accelerator & Return Controls */}
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

              <button
                type="button"
                onClick={() => setViewMode(primaryDoc ? "preview" : "voucher")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-micro font-medium bg-white dark:bg-zinc-900 text-neutral-600 dark:text-zinc-400 hover:bg-neutral-50 dark:hover:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 transition-colors"
              >
                <span>Cancel</span>
              </button>
            </div>

            {uploadError && (
              <p className="text-caption text-error-600 dark:text-error-400 font-medium mt-3">
                {uploadError}
              </p>
            )}
          </div>
        )}

        {/* Quick Anchors Bar (Active in preview and voucher modes) */}
        {(viewMode === "voucher" || viewMode === "preview") && (
          <div className="px-4 py-2 border-t border-neutral-200 dark:border-zinc-800 bg-neutral-50/90 dark:bg-zinc-900/90 flex items-center gap-3 text-micro shrink-0 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0 text-neutral-500 dark:text-zinc-400 font-mono">
              <span className="font-semibold whitespace-nowrap">Anchors:</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 pr-2 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-zinc-700 min-w-0 flex-1">
              {groundTruthBoxes.map((b) => {
                const isSelected = activeFieldId === b.fieldKey || hoveredFieldId === b.fieldKey;
                const isMatchFilter = filterBand === "ALL" || b.confidenceBand === filterBand;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onMouseEnter={() => onHoverField(b.fieldKey)}
                    onMouseLeave={() => onHoverField(null)}
                    onClick={() => onSelectField(b.fieldKey)}
                    className={`px-2 py-0.5 rounded text-micro font-mono border transition-all inline-flex items-center gap-1 shrink-0 whitespace-nowrap ${
                      !isMatchFilter ? "opacity-40 hover:opacity-100" : ""
                    } ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs font-semibold"
                        : "bg-white dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300 border-neutral-200 dark:border-zinc-700 hover:border-indigo-400 dark:hover:border-indigo-500"
                    }`}
                    title={`Click to focus ${b.label} (${b.confidence}% confidence)`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        b.confidenceBand === "HIGH"
                          ? "bg-emerald-500"
                          : b.confidenceBand === "MEDIUM"
                            ? "bg-amber-500"
                            : "bg-rose-500"
                      }`}
                    />
                    <span>{b.label}</span>
                  </button>
                );
              })}
            </div>
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
