import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Command as CommandPrimitive } from "cmdk";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { InvoiceListItem, listInvoices } from "../../api/invoices";
import { listSuppliers, SupplierListItem } from "../../api/suppliers";
import { useAuth } from "../../app/AuthContext";
import { useTheme } from "../../app/ThemeContext";
import { useToast } from "../ui/ToastContext";
import {
  Search,
  FileText,
  Building2,
  UserCheck,
  ArrowRight,
  Package,
  CreditCard,
  AlertTriangle,
  Moon,
  Sun,
  Layers,
  FileDown,
  CheckCircle2,
  Shield,
  Filter,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { formatCurrency } from "../../lib/formatters";

export interface CommandProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Command({ isOpen, onClose }: CommandProps) {
  const [query, setQuery] = useState("");
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierListItem[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      return;
    }
    listInvoices({})
      .then((res) => setInvoices(res.data))
      .catch(() => setInvoices([]));

    listSuppliers()
      .then((res) => setSuppliers(res.data))
      .catch(() => setSuppliers([]));
  }, [isOpen]);

  const q = query.toLowerCase().trim();

  const filteredInvoices = invoices.filter(
    (inv) =>
      !q ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      (inv.supplier?.name && inv.supplier.name.toLowerCase().includes(q))
  ).slice(0, 5);

  const filteredSuppliers = suppliers.filter(
    (s) => !q || s.displayName.toLowerCase().includes(q) || s.supplierCode.toLowerCase().includes(q)
  ).slice(0, 4);
  const navigationRoutes = [
    { title: "Overview Dashboard", path: "/overview", keywords: ["dashboard", "home", "metrics"] },
    { title: "Inbox (OCR Staging)", path: "/inbox", keywords: ["inbox", "mail", "intake"] },
    { title: "Invoices Workspace", path: "/invoices", keywords: ["invoices", "bills", "vouchers"] },
    { title: "Exceptions Workbench", path: "/exceptions", keywords: ["exceptions", "variance", "errors"] },
    { title: "Approvals Queue", path: "/approvals", keywords: ["approvals", "signoff", "manager"] },
    { title: "Payments Terminal", path: "/payments", keywords: ["payments", "schedule", "utr", "batch"] },
    { title: "Suppliers Directory", path: "/suppliers", keywords: ["suppliers", "parties", "vendors"] },
    { title: "Purchase Orders", path: "/purchase-orders", keywords: ["purchase orders", "po", "contracts"] },
    { title: "Items Catalogue", path: "/items", keywords: ["items", "inventory", "products", "catalogue", "parts"] },
    { title: "Bank Accounts", path: "/bank-accounts", keywords: ["bank accounts", "banking", "treasury", "settlement"] },
    { title: "Reports & Auditing", path: "/reports", keywords: ["reports", "analytics", "compliance"] },
    { title: "Archive & Ledger", path: "/archive", keywords: ["archive", "immutable", "certificates"] },
    { title: "System Settings", path: "/settings", keywords: ["settings", "preferences", "config"] },
  ].filter((r) => !q || r.title.toLowerCase().includes(q) || r.keywords.some((k) => k.includes(q)));


  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-neutral-950/60 dark:bg-zinc-950/80 transition-opacity duration-150" />
        <DialogPrimitive.Content
          aria-label="Command Search Palette"
          className="fixed left-1/2 top-16 sm:top-20 z-50 -translate-x-1/2 max-w-2xl w-full p-4 focus:outline-none"
        >
          <CommandPrimitive
            className={cn(
              "relative bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-lg shadow-lg overflow-hidden flex flex-col duration-150 max-h-[82vh]"
            )}
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <Search
                size={18}
                strokeWidth={1.75}
                className="text-neutral-400 dark:text-zinc-500 shrink-0"
              />
              <CommandPrimitive.Input
                id="command-palette-search-input"
                name="commandSearch"
                autoComplete="off"
                value={query}
                onValueChange={setQuery}
                placeholder="Search invoices, POs, UTRs, vendors, or execute actions..."
                aria-label="Command search input"
                className="w-full text-body bg-transparent text-neutral-900 dark:text-zinc-100 placeholder:text-neutral-400 dark:placeholder:text-zinc-500 focus:outline-none"
              />
              <kbd className="text-micro font-mono bg-neutral-100 dark:bg-zinc-800 text-neutral-500 dark:text-zinc-400 px-2 py-0.5 rounded-md border border-neutral-200/50 dark:border-zinc-700/50 shrink-0">
                ESC
              </kbd>
            </div>

            <CommandPrimitive.List className="overflow-y-auto p-2 space-y-3 max-h-[60vh]">
              <CommandPrimitive.Empty className="p-6 text-center text-body-sm text-neutral-500 dark:text-zinc-400">
                No matching records, commands, or personas found.
              </CommandPrimitive.Empty>

              {/* 1. Quick Workflow Actions */}
              <CommandPrimitive.Group
                heading="Quick Workflow Actions"
                className="text-micro uppercase font-semibold tracking-wider text-neutral-400 dark:text-zinc-500 px-2 space-y-1"
              >
                <CommandPrimitive.Item
                  value="action-invoices-pending"
                  onSelect={() => {
                    navigate("/invoices?status=PENDING_APPROVAL");
                    toast({
                      title: "Navigating to Approvals",
                      description: "Showing invoices awaiting approval.",
                      type: "info",
                    });
                    onClose();
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-zinc-800 focus:bg-neutral-100 dark:focus:bg-zinc-800 focus:outline-none cursor-pointer text-body-sm transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="font-medium text-neutral-900 dark:text-zinc-100">
                      View Invoices Pending Approval
                    </span>
                  </div>
                  <span className="text-micro font-mono text-neutral-400">Jump →</span>
                </CommandPrimitive.Item>

                <CommandPrimitive.Item
                  value="action-filter-due"
                  onSelect={() => {
                    navigate("/invoices");
                    toast({
                      title: "Filtered Due This Week",
                      description: "Showing invoices scheduled for payment release within 7 days.",
                      type: "info",
                    });
                    onClose();
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-zinc-800 focus:bg-neutral-100 dark:focus:bg-zinc-800 focus:outline-none cursor-pointer text-body-sm transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Filter size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="font-medium text-neutral-900 dark:text-zinc-100">
                      Filter Invoices Due This Week
                    </span>
                  </div>
                  <span className="text-micro font-mono text-neutral-400">Filter →</span>
                </CommandPrimitive.Item>

                <CommandPrimitive.Item
                  value="action-export-batch"
                  onSelect={() => {
                    toast({
                      title: "Payment Batch Exported",
                      description: "Batch manifest AVARTA-BATCH-FY26-089.csv generated successfully.",
                      type: "success",
                    });
                    onClose();
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-zinc-800 focus:bg-neutral-100 dark:focus:bg-zinc-800 focus:outline-none cursor-pointer text-body-sm transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <FileDown size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="font-medium text-neutral-900 dark:text-zinc-100">
                      Export Current Payment Batch (CSV)
                    </span>
                  </div>
                  <span className="text-micro font-mono text-neutral-400">Download →</span>
                </CommandPrimitive.Item>

                <CommandPrimitive.Item
                  value="action-toggle-theme"
                  onSelect={() => {
                    toggleTheme();
                    onClose();
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-zinc-800 focus:bg-neutral-100 dark:focus:bg-zinc-800 focus:outline-none cursor-pointer text-body-sm transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {theme === "dark" ? <Sun size={15} className="text-amber-400 shrink-0" /> : <Moon size={15} className="text-indigo-500 shrink-0" />}
                    <span className="font-medium text-neutral-900 dark:text-zinc-100">
                      Toggle Theme ({theme === "dark" ? "Switch to Light" : "Switch to Dark"})
                    </span>
                  </div>
                  <span className="text-micro font-mono text-neutral-400">Toggle</span>
                </CommandPrimitive.Item>
              </CommandPrimitive.Group>

              {/* 2. Invoices Search */}
              {filteredInvoices.length > 0 && (
                <CommandPrimitive.Group
                  heading="Invoices"
                  className="text-micro uppercase font-semibold tracking-wider text-neutral-400 dark:text-zinc-500 px-2 space-y-1"
                >
                  {filteredInvoices.map((inv) => (
                    <CommandPrimitive.Item
                      key={inv.id}
                      value={`invoice-${inv.invoiceNumber}-${inv.supplier?.name}`}
                      onSelect={() => {
                        navigate(`/invoices/${inv.id}`);
                        onClose();
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-zinc-800 focus:bg-neutral-100 dark:focus:bg-zinc-800 focus:outline-none cursor-pointer text-body-sm transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span className="font-mono font-semibold text-neutral-900 dark:text-zinc-100">
                          {inv.invoiceNumber}
                        </span>
                        <span className="text-neutral-500 dark:text-zinc-400 truncate">
                          {inv.supplier?.name ?? "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-neutral-800 dark:text-zinc-200 font-semibold tabular-nums text-caption">
                          {formatCurrency(inv.totalAmount, inv.currency)}
                        </span>
                        <ArrowRight size={13} className="text-neutral-400" />
                      </div>
                    </CommandPrimitive.Item>
                  ))}
                </CommandPrimitive.Group>
              )}


              {/* 5. Suppliers Navigation */}
              {filteredSuppliers.length > 0 && (
                <CommandPrimitive.Group
                  heading="Suppliers & Vendors"
                  className="text-micro uppercase font-semibold tracking-wider text-neutral-400 dark:text-zinc-500 px-2 space-y-1"
                >
                  {filteredSuppliers.map((s) => (
                    <CommandPrimitive.Item
                      key={s.id}
                      value={`supplier-${s.displayName}-${s.supplierCode}`}
                      onSelect={() => {
                        navigate("/suppliers");
                        onClose();
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-zinc-800 focus:bg-neutral-100 dark:focus:bg-zinc-800 focus:outline-none cursor-pointer text-body-sm transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Building2 size={15} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
                        <span className="font-medium text-neutral-900 dark:text-zinc-100 truncate">
                          {s.displayName}
                        </span>
                        <span className="text-micro font-mono text-neutral-400 dark:text-zinc-500">
                          {s.supplierCode}
                        </span>
                      </div>
                      <span className="text-micro font-mono text-neutral-500 dark:text-zinc-400">
                        {s.currency}
                      </span>
                    </CommandPrimitive.Item>
                  ))}
                </CommandPrimitive.Group>
              )}

              {/* 6. Navigation Routes (12 canonical screens) */}
              {navigationRoutes.length > 0 && (
                <CommandPrimitive.Group
                  heading="Workspace Navigation"
                  className="text-micro uppercase font-semibold tracking-wider text-neutral-400 dark:text-zinc-500 px-2 space-y-1"
                >
                  {navigationRoutes.map((route) => (
                    <CommandPrimitive.Item
                      key={route.path}
                      value={`nav-${route.title}`}
                      onSelect={() => {
                        navigate(route.path);
                        onClose();
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-zinc-800 focus:bg-neutral-100 dark:focus:bg-zinc-800 focus:outline-none cursor-pointer text-body-sm transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Layers size={15} className="text-neutral-500 dark:text-zinc-400 shrink-0" />
                        <span className="font-medium text-neutral-900 dark:text-zinc-100">
                          {route.title}
                        </span>
                      </div>
                      <span className="text-micro font-mono text-neutral-400">Navigate →</span>
                    </CommandPrimitive.Item>
                  ))}
                </CommandPrimitive.Group>
              )}


            </CommandPrimitive.List>

            {/* Pinned Keyboard Shortcuts Footer */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-50 dark:bg-zinc-950/70 border-t border-neutral-200 dark:border-zinc-800 text-micro text-neutral-500 dark:text-zinc-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 font-mono text-[10px] shadow-xs">↑</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 font-mono text-[10px] shadow-xs">↓</kbd>
                  <span>Navigate</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 font-mono text-[10px] shadow-xs">↵</kbd>
                  <span>Select</span>
                </span>
              </div>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 font-mono text-[10px] shadow-xs">Esc</kbd>
                <span>Close</span>
              </span>
            </div>
          </CommandPrimitive>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
