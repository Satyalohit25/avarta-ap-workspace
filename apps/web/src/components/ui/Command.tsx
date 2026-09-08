import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Command as CommandPrimitive } from "cmdk";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { InvoiceListItem, listInvoices } from "../../api/invoices";
import { listSuppliers, SupplierListItem } from "../../api/suppliers";
import { useAuth } from "../../app/AuthContext";
import { DEMO_ACCOUNTS } from "../../lib/constants";
import { Search, FileText, Building2, UserCheck, ArrowRight } from "lucide-react";
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
  const { user, login } = useAuth();

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

  const filteredAccounts = DEMO_ACCOUNTS.filter(
    (acc) => !q || acc.name.toLowerCase().includes(q) || acc.role.toLowerCase().includes(q)
  );

  async function handleSwitchPersona(email: string, password: string) {
    if (email === user?.email) {
      onClose();
      return;
    }
    try {
      await login(email, password);
      onClose();
      window.location.reload();
    } catch (err) {
      console.error("Persona switch failed:", err);
    }
  }

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-neutral-950/60 dark:bg-zinc-950/80 backdrop-blur-xs transition-opacity duration-150" />
        <DialogPrimitive.Content
          aria-label="Command Search Palette"
          className="fixed left-1/2 top-20 z-50 -translate-x-1/2 max-w-xl w-full p-4 focus:outline-none"
        >
          <CommandPrimitive
            className={cn(
              "relative bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all duration-150"
            )}
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-200 dark:border-zinc-800">
              <Search
                size={18}
                strokeWidth={1.75}
                className="text-neutral-400 dark:text-zinc-500 shrink-0"
              />
              <CommandPrimitive.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search invoices, suppliers, or switch persona..."
                aria-label="Command search input"
                className="w-full text-body bg-transparent text-neutral-900 dark:text-zinc-100 placeholder:text-neutral-400 dark:placeholder:text-zinc-500 focus:outline-none"
              />
              <kbd className="text-micro font-mono bg-neutral-100 dark:bg-zinc-800 text-neutral-500 dark:text-zinc-400 px-2 py-0.5 rounded-md border border-neutral-200/50 dark:border-zinc-700/50 shrink-0">
                ESC
              </kbd>
            </div>

            <CommandPrimitive.List className="max-h-96 overflow-y-auto p-2 space-y-3">
              {filteredInvoices.length === 0 && filteredSuppliers.length === 0 && filteredAccounts.length === 0 && (
                <CommandPrimitive.Empty className="p-6 text-center text-body-sm text-neutral-500 dark:text-zinc-400">
                  No matching records or actions found.
                </CommandPrimitive.Empty>
              )}

              {/* 1. Invoices Navigation */}
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

              {/* 2. Suppliers Navigation */}
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
                        navigate(`/suppliers`);
                        onClose();
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-zinc-800 focus:bg-neutral-100 dark:focus:bg-zinc-800 focus:outline-none cursor-pointer text-body-sm transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Building2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
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

              {/* 3. Demo Persona Switcher */}
              {filteredAccounts.length > 0 && (
                <CommandPrimitive.Group
                  heading="Switch Demo Persona"
                  className="text-micro uppercase font-semibold tracking-wider text-neutral-400 dark:text-zinc-500 px-2 space-y-1"
                >
                  {filteredAccounts.map((acc) => {
                    const isActive = acc.email === user?.email;
                    return (
                      <CommandPrimitive.Item
                        key={acc.email}
                        value={`persona-${acc.name}-${acc.role}`}
                        onSelect={() => handleSwitchPersona(acc.email, acc.password)}
                        className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-zinc-800 focus:bg-neutral-100 dark:focus:bg-zinc-800 focus:outline-none cursor-pointer text-body-sm transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <UserCheck size={15} className="text-neutral-500 dark:text-zinc-400 shrink-0" />
                          <span className="font-medium text-neutral-900 dark:text-zinc-100">
                            {acc.name}
                          </span>
                          <span className={`text-micro font-mono font-semibold px-1.5 py-0.5 rounded ${acc.bgColor} ${acc.color}`}>
                            {acc.role}
                          </span>
                        </div>
                        {isActive ? (
                          <span className="text-micro font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                            Active
                          </span>
                        ) : (
                          <span className="text-micro font-mono text-neutral-400">
                            Switch →
                          </span>
                        )}
                      </CommandPrimitive.Item>
                    );
                  })}
                </CommandPrimitive.Group>
              )}
            </CommandPrimitive.List>

            {/* Pinned Keyboard Shortcuts Footer (Astryx-inspired) */}
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
