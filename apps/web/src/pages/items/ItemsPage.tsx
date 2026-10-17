import { useState, useEffect, useMemo, FormEvent } from "react";
import {
  Package,
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  Tag,
  DollarSign,
  FileText,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  PowerOff,
  RotateCcw,
} from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Dialog } from "../../components/ui/Dialog";
import { Sheet } from "../../components/ui/Sheet";
import { EmptyState } from "../../components/EmptyState";
import { SkeletonRows } from "../../components/Skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "../../components/ui/table";
import { useToast } from "../../components/ui/ToastContext";
import { formatCurrency, formatDate } from "../../lib/formatters";
import {
  Item,
  listItems,
  createItem,
  toggleItemStatus,
  CreateItemInput,
} from "../../api/items";

const CATEGORIES = [
  "Raw Materials",
  "Electricals",
  "Machinery Spares",
  "IT Hardware",
  "Professional Services",
  "Packaging",
  "Office Supplies",
];

const UNITS_OF_MEASURE = ["Pcs", "MT", "Kg", "Mtr", "Units", "Days", "Hours", "Boxes"];

export default function ItemsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Drawer & Modal state
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState(CATEGORIES[0]);
  const [formHsn, setFormHsn] = useState("");
  const [formUom, setFormUom] = useState(UNITS_OF_MEASURE[0]);
  const [formPrice, setFormPrice] = useState("");
  const [formDesc, setFormDesc] = useState("");

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await listItems();
      setItems(res.data);
    } catch {
      toast({
        title: "Error Loading Items",
        description: "Failed to fetch master item catalogue.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const matchesSearch =
        !searchQuery ||
        it.itemCode.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        it.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        it.hsnSac.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        it.category.toLowerCase().includes(searchQuery.toLowerCase().trim());

      const matchesCategory =
        selectedCategory === "ALL" || it.category === selectedCategory;

      const matchesStatus =
        selectedStatus === "ALL" || it.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, searchQuery, selectedCategory, selectedStatus]);

  const activeCount = items.filter((it) => it.status === "ACTIVE").length;
  const inactiveCount = items.length - activeCount;

  const handleOpenDrawer = (item: Item) => {
    setActiveItem(item);
    setDrawerOpen(true);
  };

  const handleToggleStatus = async (item: Item) => {
    try {
      const updated = await toggleItemStatus(item.id);
      setItems((prev) => prev.map((it) => (it.id === item.id ? updated : it)));
      if (activeItem?.id === item.id) {
        setActiveItem(updated);
      }
      toast({
        title: updated.status === "ACTIVE" ? "Item Activated" : "Item Deactivated",
        description: `${updated.itemCode} is now ${updated.status.toLowerCase()}.`,
        type: "info",
      });
    } catch {
      toast({
        title: "Status Update Failed",
        description: "Could not alter item status.",
        type: "error",
      });
    }
  };

  const handleCreateItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formName.trim() || !formHsn.trim() || !formPrice) {
      toast({
        title: "Required Fields Missing",
        description: "Item code, name, HSN/SAC, and standard price are required.",
        type: "error",
      });
      return;
    }

    setSubmitting(true);
    try {
      const input: CreateItemInput = {
        itemCode: formCode,
        name: formName,
        category: formCategory,
        hsnSac: formHsn,
        unitOfMeasure: formUom,
        standardPrice: parseFloat(formPrice) || 0,
        currency: "INR",
        description: formDesc,
      };

      const created = await createItem(input);
      setItems((prev) => [created, ...prev]);
      setAddModalOpen(false);
      resetForm();
      toast({
        title: "Item Added to Catalogue",
        description: `${created.itemCode} is ready for line-item matching.`,
        type: "success",
      });
    } catch {
      toast({
        title: "Creation Failed",
        description: "Could not register item in master directory.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormCode("");
    setFormName("");
    setFormCategory(CATEGORIES[0]);
    setFormHsn("");
    setFormUom(UNITS_OF_MEASURE[0]);
    setFormPrice("");
    setFormDesc("");
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Page Header with Quick Action */}
      <PageHeader
        title="Items Catalogue"
        subtitle="Master directory of goods, services, HSN/SAC tax codes, and standard price benchmarks for automated 3-way matching."
        action={
          <Button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-1.5 shadow-2xs"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Add Item</span>
          </Button>
        }
      />

      {/* Metric Quick Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border border-neutral-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <span className="text-micro uppercase font-semibold text-neutral-400 dark:text-zinc-500">
            Total Items
          </span>
          <p className="text-h2 font-mono font-bold text-neutral-900 dark:text-zinc-100 mt-0.5">
            {items.length}
          </p>
        </div>
        <div className="p-3 rounded-xl border border-neutral-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <span className="text-micro uppercase font-semibold text-emerald-600 dark:text-emerald-400">
            Active for Matching
          </span>
          <p className="text-h2 font-mono font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
            {activeCount}
          </p>
        </div>
        <div className="p-3 rounded-xl border border-neutral-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <span className="text-micro uppercase font-semibold text-neutral-400 dark:text-zinc-500">
            Deactivated
          </span>
          <p className="text-h2 font-mono font-bold text-neutral-600 dark:text-zinc-400 mt-0.5">
            {inactiveCount}
          </p>
        </div>
        <div className="p-3 rounded-xl border border-neutral-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <span className="text-micro uppercase font-semibold text-indigo-600 dark:text-indigo-400">
            Price Benchmark Rule
          </span>
          <p className="text-body-sm font-semibold text-neutral-800 dark:text-zinc-200 mt-1">
            ±5% Variance Allowance
          </p>
        </div>
      </div>

      {/* Search, Filter Bar, and Table */}
      <Card level="surface" className="overflow-hidden">
        <div className="p-4 border-b border-neutral-100 dark:border-zinc-800/80 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex-1 max-w-md">
            <Input
              id="item-search-query"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code, item name, HSN/SAC, or category..."
              leftIcon={<Search size={14} className="text-neutral-400" />}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Dropdown Filter */}
            <div className="w-44">
              <Select
                id="item-category-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                options={[
                  { value: "ALL", label: "All Categories" },
                  ...CATEGORIES.map((cat) => ({ value: cat, label: cat })),
                ]}
              />
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center rounded-lg border border-neutral-200/80 dark:border-zinc-700 p-0.5 bg-neutral-50 dark:bg-zinc-800/60">
              <button
                type="button"
                onClick={() => setSelectedStatus("ALL")}
                className={`px-2.5 py-1 text-micro font-medium rounded-md transition-colors ${
                  selectedStatus === "ALL"
                    ? "bg-white dark:bg-zinc-900 text-neutral-900 dark:text-zinc-100 shadow-2xs"
                    : "text-neutral-500 hover:text-neutral-800 dark:text-zinc-400"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus("ACTIVE")}
                className={`px-2.5 py-1 text-micro font-medium rounded-md transition-colors ${
                  selectedStatus === "ACTIVE"
                    ? "bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-2xs"
                    : "text-neutral-500 hover:text-neutral-800 dark:text-zinc-400"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus("INACTIVE")}
                className={`px-2.5 py-1 text-micro font-medium rounded-md transition-colors ${
                  selectedStatus === "INACTIVE"
                    ? "bg-white dark:bg-zinc-900 text-neutral-700 dark:text-zinc-200 shadow-2xs"
                    : "text-neutral-500 hover:text-neutral-800 dark:text-zinc-400"
                }`}
              >
                Deactivated
              </button>
            </div>
          </div>
        </div>

        {/* Master Table */}
        {loading ? (
          <div className="p-4">
            <SkeletonRows count={5} />
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title={searchQuery ? "No items match your search" : "No items registered"}
            description={
              searchQuery
                ? `No items found matching "${searchQuery}". Clear query to restore list.`
                : "Add your first item to build your master catalogue for 3-way matching."
            }
            action={
              searchQuery
                ? { label: "Clear Search", onClick: () => setSearchQuery("") }
                : { label: "Add Master Item", onClick: () => setAddModalOpen(true) }
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Item Code</TableHead>
                  <TableHead>Description &amp; Specifications</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="font-mono">HSN / SAC</TableHead>
                  <TableHead>UoM</TableHead>
                  <TableHead className="text-right">Standard Price</TableHead>
                  <TableHead className="text-center w-28">Status</TableHead>
                  <TableHead className="w-16 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className="hover:bg-neutral-50/80 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                    onClick={() => handleOpenDrawer(item)}
                  >
                    <TableCell className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {item.itemCode}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-neutral-900 dark:text-zinc-100 block">
                        {item.name}
                      </span>
                      {item.description && (
                        <span className="text-caption text-neutral-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                          {item.description}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-micro font-medium bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300 border border-neutral-200 dark:border-zinc-700">
                        {item.category}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-neutral-600 dark:text-zinc-400 text-caption">
                      {item.hsnSac}
                    </TableCell>
                    <TableCell className="text-caption font-medium text-neutral-700 dark:text-zinc-300">
                      {item.unitOfMeasure}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold tabular-nums text-neutral-900 dark:text-zinc-100">
                      {formatCurrency(item.standardPrice, item.currency)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-semibold border ${
                          item.status === "ACTIVE"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60"
                            : "bg-neutral-100 dark:bg-zinc-800 text-neutral-500 border-neutral-200 dark:border-zinc-700"
                        }`}
                      >
                        {item.status === "ACTIVE" ? (
                          <>
                            <CheckCircle2 size={10} />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={10} />
                            <span>Inactive</span>
                          </>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleOpenDrawer(item)}
                        className="p-1.5 text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors"
                        title="View Item Drawer"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Row Drawer for Item Details (Opens beside table per Standard §5) */}
      <Sheet
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={activeItem?.name ?? "Item Details"}
        subtitle={`Catalogue Code: ${activeItem?.itemCode ?? ""}`}
        width="max-w-md"
      >
        {activeItem && (
          <div className="p-6 space-y-6">
            {/* Status and Action Strip */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-200/80 dark:border-zinc-800 bg-neutral-50/70 dark:bg-zinc-850">
              <div className="space-y-0.5">
                <span className="text-micro uppercase font-semibold text-neutral-400">
                  Item Status
                </span>
                <p className="text-body-sm font-semibold text-neutral-900 dark:text-zinc-100">
                  {activeItem.status === "ACTIVE" ? "Active for 3-Way Matching" : "Deactivated / Read-Only"}
                </p>
              </div>
              <Button
                size="sm"
                variant={activeItem.status === "ACTIVE" ? "outline" : "primary"}
                onClick={() => handleToggleStatus(activeItem)}
                className="gap-1.5 text-micro"
              >
                {activeItem.status === "ACTIVE" ? (
                  <>
                    <PowerOff size={12} />
                    <span>Deactivate</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={12} />
                    <span>Reactivate</span>
                  </>
                )}
              </Button>
            </div>

            {/* Key Specifications */}
            <div className="space-y-3">
              <h4 className="text-micro font-bold uppercase tracking-wider text-neutral-400">
                Master Data Properties
              </h4>
              <div className="grid grid-cols-2 gap-3 text-caption">
                <div className="p-3 rounded-lg border border-neutral-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <span className="text-neutral-400 block text-micro">Category</span>
                  <span className="font-semibold text-neutral-800 dark:text-zinc-200 mt-0.5 block">
                    {activeItem.category}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-neutral-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <span className="text-neutral-400 block text-micro">HSN / SAC Code</span>
                  <span className="font-mono font-semibold text-neutral-800 dark:text-zinc-200 mt-0.5 block">
                    {activeItem.hsnSac}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-neutral-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <span className="text-neutral-400 block text-micro">Unit of Measure</span>
                  <span className="font-semibold text-neutral-800 dark:text-zinc-200 mt-0.5 block">
                    {activeItem.unitOfMeasure}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-neutral-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <span className="text-neutral-400 block text-micro">Standard Benchmark</span>
                  <span className="font-mono font-bold text-neutral-900 dark:text-zinc-100 mt-0.5 block">
                    {formatCurrency(activeItem.standardPrice, activeItem.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            {activeItem.description && (
              <div className="space-y-1.5">
                <h4 className="text-micro font-bold uppercase tracking-wider text-neutral-400">
                  Technical Specifications
                </h4>
                <p className="text-body-sm text-neutral-700 dark:text-zinc-300 bg-neutral-50 dark:bg-zinc-800/40 p-3 rounded-lg border border-neutral-100 dark:border-zinc-800">
                  {activeItem.description}
                </p>
              </div>
            )}

            {/* Matching Rules Info */}
            <div className="p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-1 text-caption text-indigo-900 dark:text-indigo-200">
              <span className="font-semibold flex items-center gap-1.5 text-body-sm">
                <ShieldCheck size={14} className="text-indigo-600 dark:text-indigo-400" />
                <span>Automated PO Price Match Policy</span>
              </span>
              <p className="text-micro text-neutral-600 dark:text-zinc-400 mt-1">
                Invoices matched against purchase orders with line items matching this SKU are tolerated within a ±5% price variance window before triggering a `PRICE_DIFFERENCE` exception.
              </p>
            </div>
          </div>
        )}
      </Sheet>

      {/* Add Item Modal */}
      <Dialog
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Register Master Item"
        description="Add a new catalogued product or service SKU to enable automated line-item matching."
        size="lg"
      >
        <form onSubmit={handleCreateItem} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="item-form-code"
              label="Item Code (SKU) *"
              placeholder="e.g. ITM-STL-007"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
              required
            />
            <div className="space-y-1">
              <label htmlFor="item-form-cat" className="text-caption font-semibold text-neutral-800 dark:text-zinc-200">
                Category *
              </label>
              <Select
                id="item-form-cat"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
            </div>
          </div>

          <Input
            id="item-form-name"
            label="Item Name / Description *"
            placeholder="e.g. High-Tensile Fasteners M12x50mm"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              id="item-form-hsn"
              label="HSN / SAC Code *"
              placeholder="e.g. 7318.15.00"
              value={formHsn}
              onChange={(e) => setFormHsn(e.target.value)}
              required
            />
            <div className="space-y-1">
              <label htmlFor="item-form-uom" className="text-caption font-semibold text-neutral-800 dark:text-zinc-200">
                Unit of Measure *
              </label>
              <Select
                id="item-form-uom"
                value={formUom}
                onChange={(e) => setFormUom(e.target.value)}
                options={UNITS_OF_MEASURE.map((u) => ({ value: u, label: u }))}
              />
            </div>
            <Input
              id="item-form-price"
              label="Standard Benchmark Price (₹) *"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="item-form-desc" className="text-caption font-semibold text-neutral-800 dark:text-zinc-200">
              Technical Description / Specs
            </label>
            <textarea
              id="item-form-desc"
              rows={2}
              className="w-full rounded-lg border border-neutral-300 dark:border-zinc-700 bg-white dark:bg-zinc-850 px-3 py-2 text-body-sm text-neutral-900 dark:text-zinc-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
              placeholder="Grade, material standard, or manufacturer part number..."
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAddModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving SKU..." : "Save to Catalogue"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
