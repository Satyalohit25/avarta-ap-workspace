import { useState, FormEvent } from "react";
import { Dialog } from "../../../components/ui/Dialog";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Alert } from "../../../components/ui/Alert";
import { recordGoodsReceipt, PurchaseOrderDetail } from "../../../api/purchaseOrders";
import { PackageCheck, AlertTriangle, Plus, Trash2, ShieldCheck, CornerDownRight } from "lucide-react";

export interface GrnIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: PurchaseOrderDetail;
  onSuccess: () => void;
}

interface GrnLineDraft {
  lineNumber: number;
  description: string;
  itemCode?: string;
  receivedQuantity: number;
  unitOfMeasure: string;
  status: "ACCEPTED" | "RETURNED" | "INSPECTION_PENDING";
  inspectionNotes?: string;
}

const REJECTION_PRESETS = [
  { label: "-- Select Rejection / Inspection Preset --", value: "" },
  { label: "Damaged in Transit (Defective packaging / torn containers)", value: "Damaged in transit - rejected at dock" },
  { label: "Failed Quality Inspection (Substandard chemical/physical spec)", value: "Quality specification non-compliance (failed QC inspection)" },
  { label: "Short Shipment (Partial receipt recorded, remainder pending)", value: "Short shipment - partial receipt recorded" },
  { label: "Wrong Catalog Item Delivered", value: "Incorrect catalog specification delivered" },
  { label: "Expired Shelf Life / Inadequate Expiry Buffer", value: "Material rejected due to insufficient remaining shelf life" },
];

export function GrnIntakeModal({ isOpen, onClose, po, onSuccess }: GrnIntakeModalProps) {
  const [grnNumber, setGrnNumber] = useState(`GRN-${Date.now().toString().slice(-6)}`);
  const [vendorDeliveryNote, setVendorDeliveryNote] = useState("");
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<string>("ACCEPTED");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize lines from PO lines or fallback
  const [lines, setLines] = useState<GrnLineDraft[]>(() => {
    if (po.lineItems && po.lineItems.length > 0) {
      return po.lineItems.map((l, idx) => ({
        lineNumber: idx + 1,
        description: l.description || `Item #${idx + 1}`,
        itemCode: l.hsnSac || undefined,
        receivedQuantity: l.quantity,
        unitOfMeasure: l.unitOfMeasure || "Unit",
        status: "ACCEPTED",
        inspectionNotes: "Inspected and accepted at receiving bay",
      }));
    }
    return [
      {
        lineNumber: 1,
        description: "Primary Goods Delivery",
        receivedQuantity: 100,
        unitOfMeasure: "Unit",
        status: "ACCEPTED",
        inspectionNotes: "Inspected at dock",
      },
    ];
  });

  function handleLineChange(idx: number, field: keyof GrnLineDraft, value: unknown) {
    setLines((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  }

  function handleAddLine() {
    setLines((prev) => [
      ...prev,
      {
        lineNumber: prev.length + 1,
        description: "Additional Line Item / Quality Return Line",
        receivedQuantity: 0,
        unitOfMeasure: "Unit",
        status: "ACCEPTED",
        inspectionNotes: "",
      },
    ]);
  }

  function handleRemoveLine(idx: number) {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  function applyPreset(presetComment: string) {
    if (!presetComment) return;
    setComments((prev) => (prev ? `${prev} | ${presetComment}` : presetComment));
    setStatus("SUBJECT_TO_INSPECTION");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!grnNumber.trim()) {
      setError("GRN number is required");
      return;
    }
    if (lines.length === 0) {
      setError("At least one line item must be recorded");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await recordGoodsReceipt(po.id, {
        grnNumber: grnNumber.trim(),
        vendorDeliveryNote: vendorDeliveryNote.trim() || undefined,
        comments: comments.trim() || undefined,
        status,
        lines: lines.map((l, idx) => ({
          lineNumber: idx + 1,
          description: l.description,
          itemCode: l.itemCode,
          receivedQuantity: Number(l.receivedQuantity) || 0,
          unitOfMeasure: l.unitOfMeasure,
          status: l.status,
          inspectionNotes: l.inspectionNotes,
        })),
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record Goods Receipt Note");
    } finally {
      setSubmitting(false);
    }
  }

  const netBillableQty = lines.reduce((acc, curr) => acc + (Number(curr.receivedQuantity) || 0), 0);
  const acceptedLines = lines.filter((l) => Number(l.receivedQuantity) > 0);
  const returnLines = lines.filter((l) => Number(l.receivedQuantity) < 0 || l.status === "RETURNED");

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Record Physical Goods Receipt Note (GRN)"
      description={`Record incoming physical delivery & dock intake for Purchase Order ${po.poNumber} (${po.vendor}). Supports positive receipts and negative quality returns per Tata Chemicals standard.`}
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <Alert type="error" className="text-body-sm">
            {error}
          </Alert>
        )}

        {/* 1. Header Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            id="grnNumber"
            name="grnNumber"
            label="GRN Number"
            value={grnNumber}
            onChange={(e) => setGrnNumber(e.target.value)}
            required
            placeholder="GRN-5000000882"
          />
          <Input
            id="vendorDeliveryNote"
            name="vendorDeliveryNote"
            label="Vendor Delivery Note / DC #"
            value={vendorDeliveryNote}
            onChange={(e) => setVendorDeliveryNote(e.target.value)}
            placeholder="DC-90422 / Waybill #12"
          />
          <Input
            id="receiptDate"
            name="receiptDate"
            type="date"
            label="Receipt Date"
            value={receiptDate}
            onChange={(e) => setReceiptDate(e.target.value)}
            required
          />
        </div>

        {/* 2. Inspection Status & Presets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-neutral-50/70 dark:bg-zinc-800/40 border border-neutral-200 dark:border-zinc-800">
          <div>
            <label htmlFor="grn-overall-status" className="block text-micro font-semibold text-neutral-700 dark:text-zinc-300 mb-1">
              Overall Inspection Disposition
            </label>
            <select
              id="grn-overall-status"
              aria-label="Overall Inspection Disposition"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full text-body-sm h-9 px-3 rounded-lg border border-neutral-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-neutral-900 dark:text-zinc-100"
            >
              <option value="ACCEPTED">ACCEPTED (Cleared for Invoicing & Payment)</option>
              <option value="SUBJECT_TO_INSPECTION">SUBJECT_TO_INSPECTION (Pending QC Clearance)</option>
              <option value="RETURNED">RETURNED (Rejected at Dock / Defect Return)</option>
            </select>
          </div>

          <div>
            <label htmlFor="grn-rejection-preset" className="block text-micro font-semibold text-neutral-700 dark:text-zinc-300 mb-1">
              Quick Rejection / Inspection Presets
            </label>
            <select
              id="grn-rejection-preset"
              aria-label="Quick Rejection / Inspection Presets"
              onChange={(e) => applyPreset(e.target.value)}
              className="w-full text-body-sm h-9 px-3 rounded-lg border border-neutral-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-neutral-900 dark:text-zinc-100"
              defaultValue=""
            >
              {REJECTION_PRESETS.map((p, idx) => (
                <option key={idx} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <Input
              id="comments"
              name="comments"
              label="Dock Receiving & Inspection Remarks"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="e.g. Received at Pune Warehouse Bay 4. Sample sent to QA lab."
            />
          </div>
        </div>

        {/* 3. Physical Line Intake Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-micro font-semibold uppercase tracking-wider text-neutral-500 dark:text-zinc-400">
              Delivered Line Quantities ({lines.length} items)
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLine}
              className="gap-1 h-7 text-caption"
            >
              <Plus size={13} />
              <span>Add Line / Return Deduction</span>
            </Button>
          </div>

          <div className="rounded-xl border border-neutral-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
            <table className="w-full text-micro font-mono">
              <thead className="bg-neutral-50 dark:bg-zinc-800/60 border-b border-neutral-200 dark:border-zinc-800">
                <tr>
                  <th className="text-left px-3 py-2 text-neutral-500 dark:text-zinc-400">#</th>
                  <th className="text-left px-3 py-2 text-neutral-500 dark:text-zinc-400">Description</th>
                  <th className="text-right px-3 py-2 text-neutral-500 dark:text-zinc-400">Recv Qty (±)</th>
                  <th className="text-left px-3 py-2 text-neutral-500 dark:text-zinc-400">UOM</th>
                  <th className="text-left px-3 py-2 text-neutral-500 dark:text-zinc-400">Line Status</th>
                  <th className="text-left px-3 py-2 text-neutral-500 dark:text-zinc-400">Inspection Note</th>
                  <th className="px-2 py-2 text-center w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-zinc-800">
                {lines.map((line, idx) => (
                  <tr key={idx} className={line.receivedQuantity < 0 ? "bg-rose-50/40 dark:bg-rose-950/20" : ""}>
                    <td className="px-3 py-2 text-neutral-400">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => handleLineChange(idx, "description", e.target.value)}
                        className="w-full text-micro px-2 py-1 rounded border border-neutral-200 dark:border-zinc-700 bg-transparent font-sans"
                        placeholder="Item description"
                        required
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        step="any"
                        value={line.receivedQuantity}
                        onChange={(e) => handleLineChange(idx, "receivedQuantity", parseFloat(e.target.value) || 0)}
                        className={`w-20 text-micro text-right px-2 py-1 rounded border font-mono ${
                          line.receivedQuantity < 0
                            ? "border-rose-400 text-rose-700 dark:text-rose-300 font-bold bg-rose-50/50"
                            : "border-neutral-200 dark:border-zinc-700 text-neutral-900 dark:text-zinc-100"
                        }`}
                        title="Negative values indicate returned or rejected goods deduction"
                        required
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={line.unitOfMeasure}
                        onChange={(e) => handleLineChange(idx, "unitOfMeasure", e.target.value)}
                        className="w-14 text-micro px-2 py-1 rounded border border-neutral-200 dark:border-zinc-700 bg-transparent text-center font-sans"
                        placeholder="Pcs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={line.status}
                        onChange={(e) => handleLineChange(idx, "status", e.target.value)}
                        className="text-micro px-2 py-1 rounded border border-neutral-200 dark:border-zinc-700 bg-transparent font-sans"
                      >
                        <option value="ACCEPTED">ACCEPTED</option>
                        <option value="RETURNED">RETURNED</option>
                        <option value="INSPECTION_PENDING">QC PENDING</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={line.inspectionNotes || ""}
                        onChange={(e) => handleLineChange(idx, "inspectionNotes", e.target.value)}
                        className="w-full text-micro px-2 py-1 rounded border border-neutral-200 dark:border-zinc-700 bg-transparent font-sans"
                        placeholder="e.g. Inspected at bay"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        disabled={lines.length <= 1}
                        className="text-neutral-400 hover:text-rose-600 disabled:opacity-30 p-1"
                        aria-label="Remove line"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Net Reconciliation Callout Strip */}
        <div className="p-3 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between text-caption font-mono">
          <div className="flex items-center gap-2">
            <PackageCheck size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-neutral-700 dark:text-zinc-300">
              Accepted Lines: <strong className="text-neutral-900 dark:text-zinc-100">{acceptedLines.length}</strong> | Quality Return Deductions: <strong className="text-rose-600 dark:text-rose-400">{returnLines.length}</strong>
            </span>
          </div>
          <div className="text-right">
            <span className="text-micro text-neutral-500 dark:text-zinc-400 block font-sans">Net Billable Received Qty:</span>
            <span className="text-body font-bold text-indigo-700 dark:text-indigo-300">{netBillableQty.toFixed(2)} Units</span>
          </div>
        </div>

        {/* 5. Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-zinc-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting} className="gap-1.5 font-semibold">
            <ShieldCheck size={16} />
            <span>{submitting ? "Recording GRN..." : "Confirm & Commit Goods Receipt"}</span>
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
