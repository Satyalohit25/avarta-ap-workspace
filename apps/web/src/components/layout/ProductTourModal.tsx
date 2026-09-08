import { useState } from "react";
import { Link } from "react-router-dom";
import {
  HelpCircle,
  X,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Wallet,
  Building2,
  RefreshCw,
  Archive,
  Sparkles,
  Layers,
  Users,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "../../lib/utils";
import { AvartaCrest } from "../brand/AvartaCrest";

interface ProductTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "lifecycle" | "roles" | "ai" | "features";

export function ProductTourModal({ isOpen, onClose }: ProductTourModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("lifecycle");
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      num: "01",
      title: "Intake & Document Capture",
      route: "/inbox",
      tag: "Inbox (/inbox)",
      icon: FileText,
      desc: "Drag-and-drop multi-page invoice PDFs. Avarta instantly parses line items, tax numbers, and vendor details side-by-side with the original scanned file.",
      highlight: "Split-screen review • High-density OCR extraction • Non-PO bills",
    },
    {
      num: "02",
      title: "AI Confidence Verification",
      route: "/invoices",
      tag: "Invoices (/invoices)",
      icon: Sparkles,
      desc: "Every field is tagged with a confidence score. High confidence (≥95%) enables 1-click accept; low confidence (<80%) flags for quick human verification.",
      highlight: "AI suggests, humans decide • Zero autonomous posting • 100% human-verified",
    },
    {
      num: "03",
      title: "3-Way Line-Item PO Matching",
      route: "/purchase-orders",
      tag: "Purchase Orders (/purchase-orders)",
      icon: Layers,
      desc: "Automatically compares invoice lines against Purchase Orders. Catches quantity and price discrepancies with real-time variance badges.",
      highlight: "Line-by-line comparison • Tolerance checks • Committed spend budget tracking",
    },
    {
      num: "04",
      title: "14 Exception Resolvers",
      route: "/exceptions",
      tag: "Exceptions (/exceptions)",
      icon: AlertTriangle,
      desc: "Discrepant invoices temporarily branch into dedicated queues (Price Diff, Missing PO, Duplicate Invoice, Invalid GST) without blocking the main workflow.",
      highlight: "Isolated resolution • Root-cause tags • Never permanently forks",
    },
    {
      num: "05",
      title: "Multi-Tier Approvals",
      route: "/approvals",
      tag: "Approvals (/approvals)",
      icon: CheckCircle2,
      desc: "Authorized managers review complete line breakdowns and sign off with full audit accountability and mandatory rejection reasoning.",
      highlight: "Threshold routing • Department sign-off • Mandatory comments",
    },
    {
      num: "06",
      title: "Treasury & Bank Disbursements",
      route: "/payments",
      tag: "Payments (/payments)",
      icon: Wallet,
      desc: "Batch schedule and disburse payments in INR, USD, EUR, GBP, or CAD. Generates institutional Host-to-Host (H2H) settlement advice receipts.",
      highlight: "H2H settlement reference • Bank audit receipts • Multi-currency",
    },
    {
      num: "07",
      title: "ERP Sync & Legal Archive",
      route: "/archive",
      tag: "Archive & ERP Sync (/archive)",
      icon: Archive,
      desc: "Locked sync pushes clean sub-ledger data directly to Tally, SAP, QuickBooks, or NetSuite, while records are preserved in an 8-year compliance archive.",
      highlight: "No double-posting • Matrix GL ready • Statutory compliance",
    },
  ];

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-neutral-950/60 dark:bg-zinc-950/80 backdrop-blur-sm transition-opacity duration-200" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            "bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-2xl",
            "max-w-3xl w-[95vw] max-h-[90vh] flex flex-col shadow-2xl focus:outline-none transition-all duration-200 overflow-hidden"
          )}
        >
          {/* Background Crest Watermark */}
          <div
            className="absolute -right-16 -top-16 w-80 h-80 opacity-[0.04] dark:opacity-[0.07] pointer-events-none select-none overflow-hidden"
            aria-hidden="true"
          >
            <AvartaCrest variant="full" className="w-full h-auto" />
          </div>

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-neutral-200 dark:border-zinc-800 relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-old-english text-2xl text-neutral-900 dark:text-zinc-100 font-normal">
                Avarta
              </span>
              <span className="text-[10px] font-mono tracking-widest uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded font-semibold border border-indigo-200/60 dark:border-indigo-800/60">
                Interactive Product Tour
              </span>
            </div>
            <h2 className="text-body-lg font-semibold text-neutral-900 dark:text-zinc-100">
              Welcome to the Accounts Payable Workspace
            </h2>
            <p className="text-body-sm text-neutral-500 dark:text-zinc-400 mt-0.5">
              Everything you need to know about the linear workflow, roles, and automated controls in 60 seconds.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-zinc-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close guide"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-neutral-200 dark:border-zinc-800 bg-neutral-50/60 dark:bg-zinc-900/60 flex gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("lifecycle")}
            className={`px-4 py-2.5 text-body-sm font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "lifecycle"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 font-semibold"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <RefreshCw size={15} />
            <span>Linear AP Lifecycle</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("roles")}
            className={`px-4 py-2.5 text-body-sm font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "roles"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 font-semibold"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <Users size={15} />
            <span>Roles & Permissions</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`px-4 py-2.5 text-body-sm font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "ai"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 font-semibold"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <Sparkles size={15} />
            <span>AI Governance & Trust</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("features")}
            className={`px-4 py-2.5 text-body-sm font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "features"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 font-semibold"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <Layers size={15} />
            <span>Quick Nav Directory</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: LIFECYCLE STEPPER */}
          {activeTab === "lifecycle" && (
            <div className="space-y-6">
              {/* Stepper Buttons */}
              <div className="grid grid-cols-7 gap-1 bg-neutral-100 dark:bg-zinc-800/80 p-1.5 rounded-xl">
                {steps.map((s, idx) => {
                  const Icon = s.icon;
                  const isActive = activeStep === idx;
                  return (
                    <button
                      key={s.num}
                      type="button"
                      onClick={() => setActiveStep(idx)}
                      className={`flex flex-col items-center py-2 px-1 rounded-lg text-center transition-all cursor-pointer ${
                        isActive
                          ? "bg-white dark:bg-zinc-900 shadow-xs text-indigo-600 dark:text-indigo-400 font-semibold scale-102"
                          : "text-neutral-500 hover:text-neutral-800 dark:text-zinc-400 hover:bg-neutral-200/50 dark:hover:bg-zinc-700/50"
                      }`}
                    >
                      <span className="text-[10px] font-mono mb-0.5">{s.num}</span>
                      <Icon size={16} className="mb-1" />
                      <span className="text-[10px] leading-tight truncate w-full hidden sm:block">
                        {s.title.split(" ")[0]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Step Details Card */}
              {(() => {
                const cur = steps[activeStep];
                const Icon = cur.icon;
                return (
                  <div className="p-5 rounded-2xl border border-indigo-100 dark:border-indigo-950 bg-gradient-to-br from-indigo-50/40 via-white to-neutral-50/50 dark:from-indigo-950/20 dark:via-zinc-900 dark:to-zinc-900 shadow-xs relative overflow-hidden">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-body-md shadow-xs">
                          {cur.num}
                        </div>
                        <div>
                          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                            {cur.tag}
                          </span>
                          <h3 className="text-body-lg font-bold text-neutral-900 dark:text-zinc-100">
                            {cur.title}
                          </h3>
                        </div>
                      </div>

                      <Link
                        to={cur.route}
                        onClick={onClose}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-body-sm font-semibold transition-colors shadow-2xs cursor-pointer"
                      >
                        <span>Open Screen</span>
                        <ArrowRight size={14} />
                      </Link>
                    </div>

                    <p className="text-body-md text-neutral-700 dark:text-zinc-300 leading-relaxed mb-4">
                      {cur.desc}
                    </p>

                    <div className="p-3 rounded-xl bg-white/80 dark:bg-zinc-800/80 border border-neutral-200/80 dark:border-zinc-700/80 text-[11.5px] font-mono text-neutral-600 dark:text-zinc-300 flex items-center justify-between">
                      <span className="font-semibold text-neutral-900 dark:text-zinc-100">
                        Operational Guarantee:
                      </span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                        {cur.highlight}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mt-5 pt-3 border-t border-neutral-200/60 dark:border-zinc-800">
                      <button
                        type="button"
                        disabled={activeStep === 0}
                        onClick={() => setActiveStep((p) => Math.max(0, p - 1))}
                        className="text-body-sm font-medium text-neutral-500 hover:text-neutral-900 dark:text-zinc-400 disabled:opacity-40 cursor-pointer"
                      >
                        ← Previous Step
                      </button>

                      <span className="text-caption font-mono text-neutral-400">
                        Step {activeStep + 1} of {steps.length}
                      </span>

                      <button
                        type="button"
                        disabled={activeStep === steps.length - 1}
                        onClick={() => setActiveStep((p) => Math.min(steps.length - 1, p + 1))}
                        className="text-body-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 disabled:opacity-40 cursor-pointer"
                      >
                        Next Step →
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 2: ROLES & RESPONSIBILITIES */}
          {activeTab === "roles" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-body-md text-indigo-900 dark:text-indigo-200">
                    Finance Manager
                  </h4>
                  <span className="text-[10px] font-mono bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded font-semibold">
                    Primary Persona
                  </span>
                </div>
                <p className="text-body-sm text-neutral-600 dark:text-zinc-400 leading-relaxed mb-3">
                  Oversees the entire AP workspace, monitors processing velocity, executes treasury disbursements, and signs off on escalated exceptions.
                </p>
                <div className="text-[11px] font-mono text-neutral-500 dark:text-zinc-400">
                  Account: <span className="font-semibold text-neutral-800 dark:text-zinc-200">manager@avarta.dev</span> (pwd: password123)
                </div>
              </div>

              <div className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-body-md text-amber-900 dark:text-amber-200">
                    Approver
                  </h4>
                  <span className="text-[10px] font-mono bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded font-semibold">
                    Department Head
                  </span>
                </div>
                <p className="text-body-sm text-neutral-600 dark:text-zinc-400 leading-relaxed mb-3">
                  Reviews matched invoice line items against budgets, verifies supplier delivery, and approves or rejects payables with mandatory audit reasons.
                </p>
                <div className="text-[11px] font-mono text-neutral-500 dark:text-zinc-400">
                  Account: <span className="font-semibold text-neutral-800 dark:text-zinc-200">approver@avarta.dev</span> (pwd: password123)
                </div>
              </div>

              <div className="p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-body-md text-emerald-900 dark:text-emerald-200">
                    Finance Executive
                  </h4>
                  <span className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded font-semibold">
                    Invoice Clerk
                  </span>
                </div>
                <p className="text-body-sm text-neutral-600 dark:text-zinc-400 leading-relaxed mb-3">
                  Handles daily invoice intake in `/inbox`, runs OCR extraction verification, executes 3-way line item matching, and resolves price/quantity exceptions.
                </p>
                <div className="text-[11px] font-mono text-neutral-500 dark:text-zinc-400">
                  Account: <span className="font-semibold text-neutral-800 dark:text-zinc-200">executive@avarta.dev</span> (pwd: password123)
                </div>
              </div>

              <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-zinc-700/80 bg-neutral-50 dark:bg-zinc-800/40">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-body-md text-neutral-900 dark:text-zinc-100">
                    Administrator
                  </h4>
                  <span className="text-[10px] font-mono bg-neutral-200 dark:bg-zinc-700 text-neutral-700 dark:text-zinc-300 px-2 py-0.5 rounded font-semibold">
                    System Owner
                  </span>
                </div>
                <p className="text-body-sm text-neutral-600 dark:text-zinc-400 leading-relaxed mb-3">
                  Governs system approval threshold rules, manages user permissions, monitors immutable audit logs, and registers verified vendors.
                </p>
                <div className="text-[11px] font-mono text-neutral-500 dark:text-zinc-400">
                  Account: <span className="font-semibold text-neutral-800 dark:text-zinc-200">admin@avarta.dev</span> (pwd: password123)
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI CONFIDENCE BANDS */}
          {activeTab === "ai" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/60">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck size={18} className="text-indigo-600 dark:text-indigo-400" />
                  <h4 className="font-semibold text-body-md text-indigo-950 dark:text-indigo-200">
                    The Non-Negotiable Rule: AI Suggests, Humans Decide
                  </h4>
                </div>
                <p className="text-body-sm text-neutral-700 dark:text-zinc-300 leading-relaxed">
                  Unlike black-box automated accounting tools that post phantom transactions, no confidence level, ever, causes AI to write a ledger value or advance workflow state without an explicit human click.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
                    High Confidence (≥ 95%)
                  </div>
                  <h5 className="font-semibold text-body-sm text-neutral-900 dark:text-zinc-100 mb-1">
                    Pre-fill + 1-Click Accept
                  </h5>
                  <p className="text-caption text-neutral-600 dark:text-zinc-400">
                    Field is pre-populated in green. The human reviewer verifies and clicks once to accept.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                    Medium Confidence (80–94%)
                  </div>
                  <h5 className="font-semibold text-body-sm text-neutral-900 dark:text-zinc-100 mb-1">
                    Recommended Suggestion
                  </h5>
                  <p className="text-caption text-neutral-600 dark:text-zinc-400">
                    Field is marked with an amber badge. Requires explicit human confirmation of value.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 mb-1">
                    Low Confidence (&lt; 80%)
                  </div>
                  <h5 className="font-semibold text-body-sm text-neutral-900 dark:text-zinc-100 mb-1">
                    Manual Verification
                  </h5>
                  <p className="text-caption text-neutral-600 dark:text-zinc-400">
                    Nothing is pre-filled. Human clerk manually inspects the side-by-side original PDF.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: QUICK NAV DIRECTORY */}
          {activeTab === "features" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { name: "Overview", to: "/overview", desc: "Live financial horizon & queue counts" },
                { name: "Inbox", to: "/inbox", desc: "Batch PDF upload & document capture" },
                { name: "Invoices", to: "/invoices", desc: "Line items & side-by-side extraction" },
                { name: "Exceptions", to: "/exceptions", desc: "14 discrepancy resolution queues" },
                { name: "Approvals", to: "/approvals", desc: "Multi-tier sign-off and audit logs" },
                { name: "Payments", to: "/payments", desc: "Disbursement modal & H2H wire receipts" },
                { name: "Suppliers", to: "/suppliers", desc: "Vendor master, GSTINs & balances" },
                { name: "Purchase Orders", to: "/purchase-orders", desc: "PO creation & 3-way matching" },
                { name: "Reports", to: "/reports", desc: "CFO ROI Simulator & DPO metrics" },
                { name: "Archive", to: "/archive", desc: "8-year legal statutory compliance" },
                { name: "Settings", to: "/settings", desc: "Approval rules & organization setup" },
              ].map((item) => (
                <Link
                  key={item.name}
                  to={item.to}
                  onClick={onClose}
                  className="p-3 rounded-xl border border-neutral-200/80 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700 bg-neutral-50/50 dark:bg-zinc-800/40 hover:bg-white dark:hover:bg-zinc-850 transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-body-sm text-neutral-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {item.name}
                    </span>
                    <ChevronRight size={14} className="text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <span className="text-caption text-neutral-500 dark:text-zinc-400">
                    {item.desc}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-900/90 flex items-center justify-between text-caption font-mono text-neutral-500 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <span>Shortcut:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-700 dark:text-zinc-300">
              Ctrl+K
            </kbd>
            <span>Search Palette</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-body-sm font-semibold hover:bg-neutral-800 dark:hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            Start Exploring
          </button>
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
  );
}
