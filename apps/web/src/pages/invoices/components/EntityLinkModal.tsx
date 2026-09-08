import { useState, useEffect, useMemo } from "react";
import { Search, Building2, Link2, Check } from "lucide-react";
import { Dialog } from "../../../components/ui/Dialog";
import { Input } from "../../../components/ui/Input";
import { listSuppliers, SupplierListItem } from "../../../api/suppliers";
import { listPurchaseOrders, PurchaseOrderItem } from "../../../api/purchaseOrders";
import { formatCurrency } from "../../../lib/formatters";

export type EntityLinkType = "vendor" | "purchaseOrder";

interface EntityLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: EntityLinkType;
  onLink: (id: string, name: string) => Promise<void> | void;
}

export function EntityLinkModal({
  isOpen,
  onClose,
  type,
  onLink,
}: EntityLinkModalProps) {
  const isVendor = type === "vendor";
  const [searchQuery, setSearchQuery] = useState("");
  const [suppliers, setSuppliers] = useState<SupplierListItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSelectedId(null);
      setSelectedName(null);
      return;
    }

    setLoading(true);
    if (isVendor) {
      listSuppliers()
        .then((res) => setSuppliers(res.data))
        .catch(() => {
          // Fallback sample suppliers if offline/empty
          setSuppliers([
            { id: "sup-1", supplierCode: "VEND-001", displayName: "Acme Industrial Supplies", country: "IND", currency: "INR", status: "ACTIVE", outstandingBalance: "45000.00", openInvoiceCount: 2 },
            { id: "sup-2", supplierCode: "VEND-002", displayName: "Delta Heavy Electricals", country: "IND", currency: "INR", status: "ACTIVE", outstandingBalance: "89000.00", openInvoiceCount: 1 },
            { id: "sup-3", supplierCode: "VEND-003", displayName: "Zenith Fluid Power Ltd", country: "IND", currency: "INR", status: "ACTIVE", outstandingBalance: "120000.00", openInvoiceCount: 3 },
            { id: "sup-4", supplierCode: "VEND-004", displayName: "Apex Precision Tools", country: "IND", currency: "INR", status: "ACTIVE", outstandingBalance: "34000.00", openInvoiceCount: 1 },
          ]);
        })
        .finally(() => setLoading(false));
    } else {
      listPurchaseOrders()
        .then((res) => setPurchaseOrders(res.data))
        .catch(() => {
          // Fallback sample POs
          setPurchaseOrders([
            { id: "po-1", poNumber: "PO-2026-8801", supplierId: "sup-1", vendor: "Acme Industrial Supplies", currency: "INR", totalAmount: "15000.00", utilizedAmount: "0.00", remainingAmount: "15000.00", status: "OPEN", matchingStatus: "UNMATCHED", issueDate: "2026-08-01", createdAt: "2026-08-01", linkedInvoicesCount: 0 },
            { id: "po-2", poNumber: "PO-2026-9022", supplierId: "sup-2", vendor: "Delta Heavy Electricals", currency: "INR", totalAmount: "50000.00", utilizedAmount: "0.00", remainingAmount: "50000.00", status: "OPEN", matchingStatus: "UNMATCHED", issueDate: "2026-08-05", createdAt: "2026-08-05", linkedInvoicesCount: 0 },
            { id: "po-3", poNumber: "PO-2026-7409", supplierId: "sup-3", vendor: "Zenith Fluid Power Ltd", currency: "INR", totalAmount: "85000.00", utilizedAmount: "0.00", remainingAmount: "85000.00", status: "OPEN", matchingStatus: "UNMATCHED", issueDate: "2026-08-10", createdAt: "2026-08-10", linkedInvoicesCount: 0 },
          ]);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, isVendor]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (isVendor) {
      return suppliers.filter(
        (s) =>
          !q ||
          s.displayName.toLowerCase().includes(q) ||
          s.supplierCode.toLowerCase().includes(q)
      );
    } else {
      return purchaseOrders.filter(
        (po) =>
          !q ||
          po.poNumber.toLowerCase().includes(q) ||
          po.vendor.toLowerCase().includes(q)
      );
    }
  }, [isVendor, suppliers, purchaseOrders, searchQuery]);

  async function handleConfirm() {
    if (!selectedId || !selectedName) return;
    setSubmitting(true);
    try {
      await onLink(selectedId, selectedName);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  function handleSelectNonPo() {
    setSelectedId("NON_PO");
    setSelectedName("Direct GL / Non-PO Expense");
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={isVendor ? "Assign Supplier / Vendor" : "Link Purchase Order"}
      description={
        isVendor
          ? "Search and link a vendor from master records or designate as Direct GL expense."
          : "Reconcile this invoice against an open Purchase Order for automated 3-way matching."
      }
      confirmLabel={submitting ? "Linking..." : "Confirm & Link"}
      onConfirm={handleConfirm}
      confirmDisabled={!selectedId || submitting}
    >
      <div className="space-y-4 pt-2">
        {/* Search input */}
        <Input
          id="entity-search-input"
          label={isVendor ? "Search Suppliers" : "Search Purchase Orders"}
          placeholder={isVendor ? "Type vendor name or code..." : "Type PO number or vendor..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search size={15} className="text-neutral-400" />}
          autoFocus
        />

        {/* Results List */}
        <div className="space-y-1.5 max-h-60 overflow-y-auto overscroll-contain pr-1">
          {loading ? (
            <div className="py-8 text-center text-caption text-neutral-400">
              Loading master records...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-6 text-center text-caption text-neutral-400 space-y-1">
              <p>No matching {isVendor ? "suppliers" : "purchase orders"} found.</p>
              {!isVendor && (
                <button
                  type="button"
                  onClick={handleSelectNonPo}
                  className="text-indigo-600 dark:text-indigo-400 font-semibold underline text-body-sm"
                >
                  Classify as Non-PO / Direct GL Expense
                </button>
              )}
            </div>
          ) : (
            filteredItems.map((item) => {
              const id = item.id;
              const name = isVendor
                ? (item as SupplierListItem).displayName
                : (item as PurchaseOrderItem).poNumber;
              const isSelected = selectedId === id;

              return (
                <div
                  key={id}
                  onClick={() => {
                    setSelectedId(id);
                    setSelectedName(name);
                  }}
                  className={`p-3 rounded-lg border text-body-sm cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-neutral-900 dark:text-zinc-100 shadow-2xs"
                      : "border-neutral-200 dark:border-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-800/60 text-neutral-800 dark:text-zinc-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-md bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
                      {isVendor ? (
                        <Building2 size={14} className="text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <Link2 size={14} className="text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold text-neutral-900 dark:text-zinc-100 truncate">
                        {name}
                      </p>
                      <p className="text-caption text-neutral-500 dark:text-zinc-400 font-mono truncate">
                        {isVendor
                          ? `${(item as SupplierListItem).supplierCode} • ${(item as SupplierListItem).currency}`
                          : `${(item as PurchaseOrderItem).vendor} • ${formatCurrency((item as PurchaseOrderItem).totalAmount, (item as PurchaseOrderItem).currency)}`}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isSelected ? (
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check size={13} strokeWidth={2.5} />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-neutral-300 dark:border-zinc-700" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Quick action: Non-PO Option */}
        {!isVendor && (
          <div className="pt-2 border-t border-neutral-100 dark:border-zinc-800 flex items-center justify-between text-caption">
            <span className="text-neutral-500 dark:text-zinc-400">No PO for this invoice?</span>
            <button
              type="button"
              onClick={handleSelectNonPo}
              className={`font-semibold underline ${
                selectedId === "NON_PO"
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-neutral-600 dark:text-zinc-300 hover:text-neutral-900"
              }`}
            >
              Set as Direct GL / Non-PO
            </button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
