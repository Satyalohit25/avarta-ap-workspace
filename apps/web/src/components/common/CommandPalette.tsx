import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  FileText,
  Building2,
  Package,
  CreditCard,
  AlertTriangle,
  UserCheck,
  Moon,
  Sun,
  Layers,
  ArrowRight,
  Sparkles,
  Command,
  CornerDownLeft,
  X,
  Shield,
  FileDown,
  Filter,
} from "lucide-react";
import { useAuth } from "../../app/AuthContext";
import { useTheme } from "../../app/ThemeContext";
import { useToast } from "../ui/ToastContext";

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "Navigation" | "Records & Search" | "Workflow Actions" | "Persona Switcher";
  keywords?: string[];
  icon: React.ReactNode;
  badge?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { user, setPersonaRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const items: CommandItem[] = useMemo(() => {
    return [
      // ── Category 1: Navigation (All 11 canonical pages per AGENTS.md) ──
      {
        id: "nav-overview",
        title: "Overview Dashboard",
        subtitle: "AP performance KPIs, metrics & daily throughput",
        category: "Navigation",
        keywords: ["dashboard", "home", "metrics", "stats", "kpi"],
        icon: <Layers size={15} className="text-indigo-500" />,
        action: () => {
          navigate("/overview");
          onClose();
        },
      },
      {
        id: "nav-inbox",
        title: "Inbox",
        subtitle: "Unprocessed incoming invoices & OCR staging",
        category: "Navigation",
        keywords: ["inbox", "mail", "unprocessed", "intake"],
        icon: <Layers size={15} className="text-blue-500" />,
        action: () => {
          navigate("/inbox");
          onClose();
        },
      },
      {
        id: "nav-invoices",
        title: "Invoices Workspace",
        subtitle: "Full linear invoice list, lifecycle states & inspection",
        category: "Navigation",
        keywords: ["invoices", "bills", "vouchers", "list"],
        icon: <FileText size={15} className="text-indigo-600" />,
        action: () => {
          navigate("/invoices");
          onClose();
        },
      },
      {
        id: "nav-exceptions",
        title: "Exceptions Workbench",
        subtitle: "Variance reconciliation, PO mismatches & statutory holds",
        category: "Navigation",
        keywords: ["exceptions", "errors", "issues", "discrepancies", "price difference"],
        icon: <AlertTriangle size={15} className="text-amber-500" />,
        badge: "Attention",
        action: () => {
          navigate("/exceptions");
          onClose();
        },
      },
      {
        id: "nav-approvals",
        title: "Approvals Queue",
        subtitle: "Manager authorization chain & approval threshold checks",
        category: "Navigation",
        keywords: ["approvals", "signoff", "manager", "review"],
        icon: <UserCheck size={15} className="text-emerald-500" />,
        action: () => {
          navigate("/approvals");
          onClose();
        },
      },
      {
        id: "nav-payments",
        title: "Payments Terminal",
        subtitle: "Batch release schedules, UTR tracking & banking reconciliation",
        category: "Navigation",
        keywords: ["payments", "schedule", "bank", "utr", "payout"],
        icon: <CreditCard size={15} className="text-purple-500" />,
        action: () => {
          navigate("/payments");
          onClose();
        },
      },
      {
        id: "nav-suppliers",
        title: "Suppliers Directory",
        subtitle: "Vendor master catalog, GSTIN compliance & spend records",
        category: "Navigation",
        keywords: ["suppliers", "vendors", "parties", "gstin"],
        icon: <Building2 size={15} className="text-cyan-500" />,
        action: () => {
          navigate("/suppliers");
          onClose();
        },
      },
      {
        id: "nav-po",
        title: "Purchase Orders",
        subtitle: "PO contracts, line authorizations & GRN links",
        category: "Navigation",
        keywords: ["purchase orders", "po", "orders", "contracts"],
        icon: <Package size={15} className="text-emerald-600" />,
        action: () => {
          navigate("/purchase-orders");
          onClose();
        },
      },
      {
        id: "nav-reports",
        title: "Reports & Auditing",
        subtitle: "Spend analytics, processing velocity & statutory ledger",
        category: "Navigation",
        keywords: ["reports", "analytics", "compliance", "export"],
        icon: <FileText size={15} className="text-neutral-500" />,
        action: () => {
          navigate("/reports");
          onClose();
        },
      },
      {
        id: "nav-archive",
        title: "Archive & Compliance Ledger",
        subtitle: "Immutable tax records & cryptographic audit certificates",
        category: "Navigation",
        keywords: ["archive", "history", "immutable", "soc2"],
        icon: <Shield size={15} className="text-indigo-400" />,
        action: () => {
          navigate("/archive");
          onClose();
        },
      },
      {
        id: "nav-settings",
        title: "System Settings",
        subtitle: "Organization profile, tolerance thresholds & roles",
        category: "Navigation",
        keywords: ["settings", "preferences", "config", "tolerances"],
        icon: <Shield size={15} className="text-neutral-400" />,
        action: () => {
          navigate("/settings");
          onClose();
        },
      },

      // ── Category 2: Instant Records & Search Jump ──
      {
        id: "record-inv-1",
        title: "INV-2026-0042 — Tata Steel Limited",
        subtitle: "₹41,600 • Verified & Matched against PO-2026-0842",
        category: "Records & Search",
        keywords: ["tata", "steel", "41600", "inv-2026-0042"],
        icon: <FileText size={15} className="text-emerald-500" />,
        badge: "Approved",
        action: () => {
          navigate("/invoices");
          onClose();
        },
      },
      {
        id: "record-inv-2",
        title: "INV-2026-0081 — Infosys BPM Enterprise",
        subtitle: "₹84,200 • Scheduled Batch Release for Standard Payment",
        category: "Records & Search",
        keywords: ["infosys", "84200", "inv-2026-0081", "bpm"],
        icon: <FileText size={15} className="text-indigo-500" />,
        badge: "Scheduled",
        action: () => {
          navigate("/invoices");
          onClose();
        },
      },
      {
        id: "record-inv-3",
        title: "INV-2026-0012 — Tata Chemicals Limited",
        subtitle: "₹1,24,000 • Price Difference Exception Flagged (+7.2%)",
        category: "Records & Search",
        keywords: ["chemicals", "124000", "inv-2026-0012", "variance", "price difference"],
        icon: <AlertTriangle size={15} className="text-amber-500" />,
        badge: "Exception",
        action: () => {
          navigate("/exceptions");
          onClose();
        },
      },
      {
        id: "record-po-1",
        title: "PO-FY26-0881 — Enterprise Compute Servers",
        subtitle: "Authorized Rate: ₹4,850/unit • Total: ₹38,800",
        category: "Records & Search",
        keywords: ["po-fy26-0881", "servers", "compute", "4850"],
        icon: <Package size={15} className="text-indigo-600" />,
        badge: "PO Contract",
        action: () => {
          navigate("/purchase-orders");
          onClose();
        },
      },
      {
        id: "record-utr-1",
        title: "UTR-SBIN-20261019-9482 — Payment Batch Clearing",
        subtitle: "State Bank of India Corporate Settlement • ₹3,84,500 Cleared",
        category: "Records & Search",
        keywords: ["utr", "sbin", "bank", "clearing", "9482"],
        icon: <CreditCard size={15} className="text-emerald-500" />,
        badge: "UTR Settled",
        action: () => {
          navigate("/payments");
          onClose();
        },
      },

      // ── Category 3: Quick Workflow Actions ──
      {
        id: "action-filter-approvals",
        title: "Filter Invoices Awaiting Approval",
        subtitle: "Jump directly to pending approval queue",
        category: "Workflow Actions",
        keywords: ["filter", "pending approval", "approve queue"],
        icon: <Filter size={15} className="text-indigo-500" />,
        action: () => {
          navigate("/invoices?status=PENDING_APPROVAL");
          onClose();
        },
      },
      {
        id: "action-price-exceptions",
        title: "Filter Price & Quantity Variance Exceptions",
        subtitle: "Inspect 3-way match discrepancies requiring review",
        category: "Workflow Actions",
        keywords: ["price difference", "variance", "3-way", "shortfall"],
        icon: <AlertTriangle size={15} className="text-amber-500" />,
        action: () => {
          navigate("/exceptions");
          onClose();
        },
      },
      {
        id: "action-export-payments",
        title: "Export Current Payment Batch CSV",
        subtitle: "Generate statutory NACH / NEFT corporate payout manifest",
        category: "Workflow Actions",
        keywords: ["export", "csv", "batch", "payments", "download"],
        icon: <FileDown size={15} className="text-indigo-500" />,
        action: () => {
          toast({
            title: "Payment Batch Exported",
            description: "Batch manifest CLEAROPS-BATCH-FY26-089.csv generated successfully.",
            type: "success",
          });
          onClose();
        },
      },
      {
        id: "action-toggle-theme",
        title: `Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`,
        subtitle: `Currently using ${theme} theme`,
        category: "Workflow Actions",
        keywords: ["theme", "dark", "light", "mode", "color"],
        icon: theme === "dark" ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-400" />,
        action: () => {
          toggleTheme();
          onClose();
        },
      },

      // ── Category 4: Persona Switcher for Demos ──
      {
        id: "persona-admin",
        title: "Switch Persona: Administrator",
        subtitle: "Full workspace authority, tenant configuration & user management",
        category: "Persona Switcher",
        keywords: ["admin", "administrator", "role", "persona"],
        icon: <Shield size={15} className="text-indigo-600" />,
        badge: user?.role === "Administrator" ? "Current Role" : undefined,
        action: () => {
          setPersonaRole("Administrator");
          toast({
            title: "Persona Switched: Administrator",
            description: "Operating with full administrative authority.",
            type: "info",
          });
          onClose();
        },
      },
      {
        id: "persona-finance-manager",
        title: "Switch Persona: Finance Manager",
        subtitle: "Tolerance threshold approvals, exception resolution & batch payment releases",
        category: "Persona Switcher",
        keywords: ["manager", "finance manager", "threshold", "approval"],
        icon: <UserCheck size={15} className="text-emerald-600" />,
        badge: user?.role === "Finance Manager" ? "Current Role" : undefined,
        action: () => {
          setPersonaRole("Finance Manager");
          toast({
            title: "Persona Switched: Finance Manager",
            description: "Operating with manager-level exception signoff permissions.",
            type: "info",
          });
          onClose();
        },
      },
      {
        id: "persona-finance-exec",
        title: "Switch Persona: Finance Executive",
        subtitle: "Invoice intake verification, PO 3-way matching, & scheduling payments",
        category: "Persona Switcher",
        keywords: ["executive", "clerk", "finance executive", "matching"],
        icon: <FileText size={15} className="text-blue-600" />,
        badge: user?.role === "Finance Executive" ? "Current Role" : undefined,
        action: () => {
          setPersonaRole("Finance Executive");
          toast({
            title: "Persona Switched: Finance Executive",
            description: "Operating with daily processing & matching privileges.",
            type: "info",
          });
          onClose();
        },
      },
      {
        id: "persona-approver",
        title: "Switch Persona: Department Approver",
        subtitle: "Business budget owner responsible for purchase order line sign-offs",
        category: "Persona Switcher",
        keywords: ["approver", "budget owner", "signoff"],
        icon: <UserCheck size={15} className="text-purple-600" />,
        badge: user?.role === "Approver" ? "Current Role" : undefined,
        action: () => {
          setPersonaRole("Approver");
          toast({
            title: "Persona Switched: Approver",
            description: "Operating with budget holder approval view.",
            type: "info",
          });
          onClose();
        },
      },
      {
        id: "persona-readonly",
        title: "Switch Persona: Read Only Auditor",
        subtitle: "Compliance inspection & read-only reporting access (No mutations)",
        category: "Persona Switcher",
        keywords: ["readonly", "auditor", "read only", "audit"],
        icon: <Shield size={15} className="text-neutral-500" />,
        badge: user?.role === "Read Only" ? "Current Role" : undefined,
        action: () => {
          setPersonaRole("Read Only");
          toast({
            title: "Persona Switched: Read Only",
            description: "Operating in read-only audit observation mode.",
            type: "info",
          });
          onClose();
        },
      },
    ];
  }, [navigate, onClose, user, setPersonaRole, theme, toggleTheme, toast]);

  // Filter items based on search query & active category filter
  const filteredItems = useMemo(() => {
    let list = items;
    if (activeCategory !== "ALL") {
      list = list.filter((i) => i.category === activeCategory);
    }
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.subtitle && i.subtitle.toLowerCase().includes(q)) ||
          i.keywords?.some((k) => k.toLowerCase().includes(q))
      );
    }
    return list;
  }, [items, query, activeCategory]);

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  // Keyboard navigation inside palette
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredItems.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : Math.max(0, filteredItems.length - 1)
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Workspace Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-neutral-200 dark:border-zinc-800 gap-3 bg-white dark:bg-zinc-900">
          <Search size={18} className="text-neutral-400 dark:text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, search invoices, vendors, POs, or switch role..."
            className="flex-1 bg-transparent text-body-sm text-neutral-900 dark:text-zinc-100 placeholder-neutral-400 dark:placeholder-zinc-500 outline-none font-sans"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-300"
            >
              <X size={14} />
            </button>
          )}
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-neutral-100 dark:bg-zinc-800 text-neutral-500 dark:text-zinc-400 border border-neutral-200 dark:border-zinc-700">
            ESC
          </span>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-neutral-100 dark:border-zinc-800/80 bg-neutral-50/70 dark:bg-zinc-900/60 overflow-x-auto text-micro">
          {(["ALL", "Navigation", "Records & Search", "Workflow Actions", "Persona Switcher"] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-micro font-medium transition-colors shrink-0 ${
                activeCategory === cat
                  ? "bg-indigo-600 text-white font-semibold shadow-2xs"
                  : "text-neutral-600 dark:text-zinc-400 hover:bg-neutral-200/60 dark:hover:bg-zinc-800"
              }`}
            >
              {cat === "ALL" ? "All Commands" : cat}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 divide-y divide-neutral-100 dark:divide-zinc-800/60 flex-1">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 dark:text-zinc-400 space-y-2">
              <Search size={26} className="mx-auto text-neutral-400 dark:text-zinc-500 stroke-1" />
              <p className="text-body-sm font-medium">No commands or records found</p>
              <p className="text-caption text-neutral-400 dark:text-zinc-500">
                Try searching for "Tata", "PO-2026", "Manager", or "Approvals"
              </p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-100 ${
                    isSelected
                      ? "bg-indigo-50 dark:bg-indigo-950/60 border-l-3 border-indigo-600 dark:border-indigo-400 pl-3.5"
                      : "hover:bg-neutral-50/80 dark:hover:bg-zinc-800/40"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected
                          ? "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300"
                          : "bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-body-sm font-medium text-neutral-900 dark:text-zinc-100 truncate">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${
                              item.badge === "Approved" || item.badge === "UTR Settled"
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                : item.badge === "Exception"
                                  ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                  : "bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-300"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-caption text-neutral-500 dark:text-zinc-400 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-[10px] font-mono text-neutral-400 dark:text-zinc-500 uppercase tracking-wider hidden sm:inline">
                      {item.category}
                    </span>
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-600 dark:text-indigo-400 bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                        <CornerDownLeft size={10} />
                        <span>Select</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-4 py-2.5 bg-neutral-50 dark:bg-zinc-950 border-t border-neutral-200 dark:border-zinc-800 flex items-center justify-between text-micro text-neutral-500 dark:text-zinc-400 font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded text-[10px]">
                ↑↓
              </kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded text-[10px]">
                ↵
              </kbd>
              <span>Execute</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded text-[10px]">
                ESC
              </kbd>
              <span>Close</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Sparkles size={11} className="text-indigo-500" />
            <span>Power-User Command Bar</span>
          </div>
        </div>
      </div>
    </div>
  );
}
