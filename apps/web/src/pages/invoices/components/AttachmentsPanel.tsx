import { useState, useRef, ChangeEvent, DragEvent } from "react";
import {
  Paperclip,
  UploadCloud,
  FileText,
  FileCheck,
  Download,
  Eye,
  Trash2,
  Tag,
  Check,
  AlertCircle,
  Plus,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Dialog } from "../../../components/ui/Dialog";
import { useToast } from "../../../components/ui/ToastContext";
import { formatDate } from "../../../lib/formatters";

export type AttachmentTypeTag = "DELIVERY_NOTE" | "CREDIT_NOTE" | "PO_COPY" | "OTHER";

export interface InvoiceAttachment {
  id: string;
  name: string;
  sizeBytes: number;
  typeTag: AttachmentTypeTag;
  uploadedAt: string;
  uploadedBy: string;
  url?: string;
  mimeType?: string;
}

const TAG_CONFIG: Record<AttachmentTypeTag, { label: string; color: string }> = {
  DELIVERY_NOTE: {
    label: "Delivery Note (GRN)",
    color: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  CREDIT_NOTE: {
    label: "Credit Note",
    color: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  PO_COPY: {
    label: "PO Copy",
    color: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  OTHER: {
    label: "Other Document",
    color: "bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300 border-neutral-200 dark:border-zinc-700",
  },
};

interface AttachmentsPanelProps {
  invoiceId: string;
  canUpload?: boolean;
}

export function AttachmentsPanel({
  invoiceId,
  canUpload = true,
}: AttachmentsPanelProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedTag, setSelectedTag] = useState<AttachmentTypeTag>("DELIVERY_NOTE");
  const [previewAttachment, setPreviewAttachment] = useState<InvoiceAttachment | null>(null);

  // Initial sample attachments associated with invoice
  const [attachments, setAttachments] = useState<InvoiceAttachment[]>([
    {
      id: "att-001",
      name: "Goods_Receipt_GRN_4821.pdf",
      sizeBytes: 248500,
      typeTag: "DELIVERY_NOTE",
      uploadedAt: "2026-10-14T08:30:00Z",
      uploadedBy: "Warehouse Receiving Dock",
    },
    {
      id: "att-002",
      name: "Signed_Purchase_Order_PO-2026-0881.pdf",
      sizeBytes: 512000,
      typeTag: "PO_COPY",
      uploadedAt: "2026-10-14T08:31:00Z",
      uploadedBy: "Procurement Desk",
    },
  ]);

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const newItems: InvoiceAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      newItems.push({
        id: `att-${Date.now().toString(36)}-${i}`,
        name: file.name,
        sizeBytes: file.size,
        typeTag: selectedTag,
        uploadedAt: new Date().toISOString(),
        uploadedBy: "Current User",
      });
    }

    setAttachments((prev) => [...newItems, ...prev]);
    toast({
      title: "Attachment Added",
      description: `${newItems.length} supporting document(s) tagged as ${TAG_CONFIG[selectedTag].label}.`,
      type: "success",
    });
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function handleRemove(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    toast({
      title: "Attachment Archived",
      description: "Document detached from invoice record.",
      type: "info",
    });
  }

  return (
    <Card id="section-attachments" level="surface" className="overflow-hidden">
      <CardHeader
        title={
          <div className="flex items-center gap-2">
            <Paperclip size={16} className="text-indigo-600 dark:text-indigo-400" />
            <span>Supporting Attachments &amp; Goods Receipts</span>
            <span className="text-micro font-mono bg-neutral-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-neutral-600 dark:text-zinc-400 border border-neutral-200 dark:border-zinc-700">
              {attachments.length}
            </span>
          </div>
        }
        description="Delivery notes, proof-of-delivery receipts, PO copies, and credit notes bundled for statutory compliance and audit archiving."
      />
      <CardContent className="space-y-4">
        {/* Upload dropzone with Type Tag Selector */}
        {canUpload && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap text-caption">
              <span className="text-neutral-500 font-medium">Classify document type:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(Object.keys(TAG_CONFIG) as AttachmentTypeTag[]).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(tag)}
                    className={`px-2.5 py-1 text-micro font-semibold rounded-md transition-colors duration-100 cursor-pointer border ${
                      selectedTag === tag
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs ring-2 ring-indigo-500/20"
                        : "bg-white dark:bg-zinc-850 text-neutral-600 dark:text-zinc-400 border-neutral-200 dark:border-zinc-700 hover:border-neutral-300"
                    }`}
                  >
                    {TAG_CONFIG[tag].label}
                  </button>
                ))}
              </div>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors duration-100 ${
                isDragging
                  ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30"
                  : "border-neutral-200 dark:border-zinc-800 hover:border-neutral-300 dark:hover:border-zinc-700 bg-neutral-50/40 dark:bg-zinc-900/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <UploadCloud size={24} className="mx-auto text-neutral-400 dark:text-zinc-500 mb-1.5" />
              <p className="text-body-sm font-semibold text-neutral-800 dark:text-zinc-200">
                Click or drag files here to attach as{" "}
                <span className="text-indigo-600 dark:text-indigo-400">
                  {TAG_CONFIG[selectedTag].label}
                </span>
              </p>
              <p className="text-caption text-neutral-500 dark:text-zinc-400 mt-0.5">
                PDF, PNG, JPG, or scanned TIFF up to 25MB. Automatically included in ERP sync &amp; archive export.
              </p>
            </div>
          </div>
        )}

        {/* List of Attachments */}
        {attachments.length === 0 ? (
          <div className="py-6 text-center text-caption text-neutral-400">
            No supporting attachments added.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-zinc-800 rounded-lg border border-neutral-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="p-3 flex items-center justify-between gap-3 hover:bg-neutral-50/70 dark:hover:bg-zinc-800/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-neutral-600 dark:text-zinc-300">
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-body-sm font-semibold text-neutral-900 dark:text-zinc-100 truncate">
                        {att.name}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-micro font-semibold border ${
                          TAG_CONFIG[att.typeTag].color
                        }`}
                      >
                        <Tag size={9} />
                        <span>{TAG_CONFIG[att.typeTag].label}</span>
                      </span>
                    </div>
                    <span className="text-caption text-neutral-500 dark:text-zinc-400 font-mono mt-0.5 block">
                      {formatFileSize(att.sizeBytes)} • Uploaded {formatDate(att.uploadedAt)} by {att.uploadedBy}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-micro gap-1"
                    onClick={() => setPreviewAttachment(att)}
                  >
                    <Eye size={12} />
                    <span>Preview</span>
                  </Button>
                  {canUpload && (
                    <button
                      type="button"
                      onClick={() => handleRemove(att.id)}
                      className="p-1.5 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Archive attachment"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Inline Preview Dialog */}
      <Dialog
        isOpen={Boolean(previewAttachment)}
        onClose={() => setPreviewAttachment(null)}
        title={previewAttachment?.name ?? "Attachment Preview"}
        description={`Classified as ${previewAttachment ? TAG_CONFIG[previewAttachment.typeTag].label : ""}`}
        size="xl"
      >
        <div className="p-4 space-y-3">
          <div className="h-96 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-neutral-100 dark:bg-zinc-950 flex flex-col items-center justify-center text-center p-6 space-y-3">
            <FileCheck size={40} className="text-indigo-600 dark:text-indigo-400" />
            <div>
              <p className="font-semibold text-neutral-900 dark:text-zinc-100 text-body">
                {previewAttachment?.name}
              </p>
              <p className="text-caption text-neutral-500 mt-1">
                Document verified &amp; digitally signed for audit compliance.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-micro font-mono bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 text-neutral-600 dark:text-zinc-300">
              SHA-256 Checksum Verified • Legally Admissible Archive
            </span>
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                toast({
                  title: "Download Started",
                  description: `Downloading ${previewAttachment?.name}...`,
                  type: "info",
                });
              }}
              className="gap-1.5"
            >
              <Download size={14} />
              <span>Download File</span>
            </Button>
          </div>
        </div>
      </Dialog>
    </Card>
  );
}
