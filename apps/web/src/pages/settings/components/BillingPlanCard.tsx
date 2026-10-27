import { useState } from "react";
import { CreditCard, CheckCircle2, ArrowUpRight, FileText } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { useToast } from "../../../components/ui/ToastContext";

interface PlanTierInfo {
  id: "STARTER" | "GROWTH" | "ENTERPRISE";
  name: string;
  tagline: string;
  priceMonthlyInr: number;
  monthlyInvoiceLimit: number | "Unlimited";
  seatLimit: number | "Unlimited";
  features: string[];
}

const AVAILABLE_PLANS: PlanTierInfo[] = [
  {
    id: "STARTER",
    name: "Starter",
    tagline: "Small teams automating linear invoice flows",
    priceMonthlyInr: 4999,
    monthlyInvoiceLimit: 50,
    seatLimit: 2,
    features: ["50 Invoices / Month", "2 Team Seats", "Standard AI Extraction", "CSV Export", "Email & Chat Support"],
  },
  {
    id: "GROWTH",
    name: "Growth",
    tagline: "Scaling finance departments with ERP & 3-way matching",
    priceMonthlyInr: 19999,
    monthlyInvoiceLimit: 500,
    seatLimit: 10,
    features: [
      "500 Invoices / Month",
      "10 Team Seats",
      "3-Way PO & GRN Matching",
      "Tally Prime / QBO / Xero Sync",
      "Custom Approval Thresholds",
      "BYOK AI Model Choice",
    ],
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise Sovereignty",
    tagline: "Dedicated database sovereignty and unlimited volume",
    priceMonthlyInr: 59999,
    monthlyInvoiceLimit: "Unlimited",
    seatLimit: "Unlimited",
    features: [
      "Unlimited Invoices & Seats",
      "BYODB Database Sovereignty",
      "Custom SLA & 99.99% Uptime",
      "Dedicated Technical Account Manager",
      "Custom ERP Connectors (SAP/Oracle)",
      "Strict SOC 2 & DPA Agreements",
    ],
  },
];

export function BillingPlanCard() {
  const { toast } = useToast();
  const [activePlanId, setActivePlanId] = useState<"STARTER" | "GROWTH" | "ENTERPRISE">("GROWTH");
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Mocked live usage metrics
  const usage = {
    invoicesUsed: 142,
    invoicesLimit: 500,
    seatsUsed: 4,
    seatsLimit: 10,
    periodEnd: "November 13, 2026",
    status: "ACTIVE",
  };

  const invoicePercentage = Math.round((usage.invoicesUsed / usage.invoicesLimit) * 100);
  const seatPercentage = Math.round((usage.seatsUsed / usage.seatsLimit) * 100);

  const handleSelectPlan = (planId: "STARTER" | "GROWTH" | "ENTERPRISE") => {
    if (planId === activePlanId) return;
    setIsUpgrading(true);
    setTimeout(() => {
      setActivePlanId(planId);
      setIsUpgrading(false);
      toast({
        type: "success",
        title: `Plan upgraded to ${planId === "ENTERPRISE" ? "Enterprise Sovereignty" : planId}! New limits are now active.`,
      });
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      <div className="p-6 rounded-md bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 dark:border-zinc-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
              <CreditCard size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-body font-semibold text-neutral-900 dark:text-zinc-100">
                  {AVAILABLE_PLANS.find((p) => p.id === activePlanId)?.name} Plan
                </h3>
                <Badge variant="success" className="text-[10px] uppercase font-semibold">
                  Active Subscription
                </Badge>
              </div>
              <p className="text-caption text-neutral-500 dark:text-zinc-400">
                Next billing cycle renews on <strong>{usage.periodEnd}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-2xl font-bold font-mono text-neutral-900 dark:text-zinc-100 tabular-nums">
                ₹{AVAILABLE_PLANS.find((p) => p.id === activePlanId)?.priceMonthlyInr.toLocaleString("en-IN")}
              </span>
              <span className="text-caption text-neutral-500 dark:text-zinc-400"> / month</span>
            </div>
          </div>
        </div>

        {/* Live Quota Meters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-zinc-800/40 border border-neutral-200/60 dark:border-zinc-700/60 space-y-3">
            <div className="flex justify-between items-center text-body-sm">
              <span className="font-medium text-neutral-700 dark:text-zinc-300">Monthly Invoices Processed</span>
              <span className="font-mono font-medium text-neutral-900 dark:text-zinc-100 tabular-nums">
                {usage.invoicesUsed} / {activePlanId === "ENTERPRISE" ? "∞" : usage.invoicesLimit}
              </span>
            </div>
            <div className="w-full bg-neutral-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-colors duration-100 duration-500 ${
                  invoicePercentage > 85 ? "bg-amber-500" : "bg-indigo-600 dark:bg-indigo-500"
                }`}
                style={{ width: `${activePlanId === "ENTERPRISE" ? 15 : invoicePercentage}%` }}
              />
            </div>
            <p className="text-micro text-neutral-500 dark:text-zinc-400 flex items-center justify-between">
              <span>{activePlanId === "ENTERPRISE" ? "Unlimited volume enabled" : `${usage.invoicesLimit - usage.invoicesUsed} remaining this cycle`}</span>
              <span>{activePlanId === "ENTERPRISE" ? "Fair Use Policy" : `${invoicePercentage}% utilized`}</span>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-zinc-800/40 border border-neutral-200/60 dark:border-zinc-700/60 space-y-3">
            <div className="flex justify-between items-center text-body-sm">
              <span className="font-medium text-neutral-700 dark:text-zinc-300">Active Team Seats</span>
              <span className="font-mono font-medium text-neutral-900 dark:text-zinc-100 tabular-nums">
                {usage.seatsUsed} / {activePlanId === "ENTERPRISE" ? "∞" : usage.seatsLimit}
              </span>
            </div>
            <div className="w-full bg-neutral-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-colors duration-100 duration-500"
                style={{ width: `${activePlanId === "ENTERPRISE" ? 20 : seatPercentage}%` }}
              />
            </div>
            <p className="text-micro text-neutral-500 dark:text-zinc-400 flex items-center justify-between">
              <span>{activePlanId === "ENTERPRISE" ? "Unlimited enterprise seats" : `${usage.seatsLimit - usage.seatsUsed} seats available`}</span>
              <span>{activePlanId === "ENTERPRISE" ? "RBAC Enforced" : `${seatPercentage}% utilized`}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Plan Tiers Matrix */}
      <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-md overflow-hidden">
        <div className="px-5 py-3.5 border-b border-neutral-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-neutral-50/70 dark:bg-zinc-850/50">
          <div>
            <h3 className="text-body font-semibold text-neutral-900 dark:text-zinc-100">
              Workspace Subscription & Entitlements
            </h3>
            <p className="text-caption text-neutral-500 dark:text-zinc-400">
              Contract capacity, OCR throughput limits, and compliance SLA tier
            </p>
          </div>
          <span className="font-mono text-xs px-2 py-0.5 bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300 border border-neutral-200 dark:border-zinc-700 rounded-sm">
            Billing Currency: INR (₹)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-caption tabular-nums">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-zinc-800 bg-neutral-50/40 dark:bg-zinc-900 text-neutral-500 dark:text-zinc-400">
                <th className="py-2.5 px-4 font-medium w-2/5">Entitlement Parameter</th>
                {AVAILABLE_PLANS.map((plan) => (
                  <th key={plan.id} className="py-2.5 px-4 font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-neutral-900 dark:text-zinc-100">{plan.name}</span>
                      {plan.id === activePlanId && (
                        <span className="text-[9px] font-mono uppercase bg-neutral-200 dark:bg-zinc-700 text-neutral-800 dark:text-zinc-200 px-1 py-0.2 rounded-xs font-semibold">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-neutral-500 font-mono text-[11px] font-normal">
                      ₹{plan.priceMonthlyInr.toLocaleString("en-IN")}/mo
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-zinc-800 text-neutral-700 dark:text-zinc-300">
              <tr>
                <td className="py-2.5 px-4 font-medium text-neutral-900 dark:text-zinc-100">Monthly Invoices Quota</td>
                <td className="py-2.5 px-4 font-mono">50 invoices</td>
                <td className="py-2.5 px-4 font-mono">500 invoices</td>
                <td className="py-2.5 px-4 font-mono font-semibold text-neutral-900 dark:text-zinc-100">Unlimited (Dedicated Queue)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-neutral-900 dark:text-zinc-100">Authorized Team Seats</td>
                <td className="py-2.5 px-4 font-mono">2 seats</td>
                <td className="py-2.5 px-4 font-mono">10 seats</td>
                <td className="py-2.5 px-4 font-mono font-semibold text-neutral-900 dark:text-zinc-100">Unlimited (RBAC Multi-Tier)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-neutral-900 dark:text-zinc-100">3-Way PO & GRN Matching</td>
                <td className="py-2.5 px-4 font-mono text-neutral-400">Manual / Standard</td>
                <td className="py-2.5 px-4 font-mono">Automated 3-Way</td>
                <td className="py-2.5 px-4 font-mono font-semibold text-neutral-900 dark:text-zinc-100">Custom Tolerances + Direct ERP</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-neutral-900 dark:text-zinc-100">BYOK AI Model Choice</td>
                <td className="py-2.5 px-4 font-mono text-neutral-400">N/A</td>
                <td className="py-2.5 px-4 font-mono">Included (OpenAI/Anthropic)</td>
                <td className="py-2.5 px-4 font-mono font-semibold text-neutral-900 dark:text-zinc-100">Custom Vault / Sovereign Endpoints</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-neutral-900 dark:text-zinc-100">ERP Sub-Ledger Connectors</td>
                <td className="py-2.5 px-4 font-mono text-neutral-400">CSV Export Only</td>
                <td className="py-2.5 px-4 font-mono">Tally Prime, QBO, Xero</td>
                <td className="py-2.5 px-4 font-mono font-semibold text-neutral-900 dark:text-zinc-100">SAP S/4HANA, NetSuite, Oracle</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-neutral-900 dark:text-zinc-100">Data Sovereignty & BYODB</td>
                <td className="py-2.5 px-4 font-mono text-neutral-400">Multi-tenant Cloud</td>
                <td className="py-2.5 px-4 font-mono text-neutral-400">Multi-tenant Cloud</td>
                <td className="py-2.5 px-4 font-mono font-semibold text-emerald-600 dark:text-emerald-400">Dedicated Sovereign DB (PostgreSQL)</td>
              </tr>
              <tr className="bg-neutral-50/60 dark:bg-zinc-850/30">
                <td className="py-3 px-4 font-medium text-neutral-900 dark:text-zinc-100">Workspace Tier Allocation</td>
                {AVAILABLE_PLANS.map((plan) => {
                  const isCurrent = plan.id === activePlanId;
                  return (
                    <td key={plan.id} className="py-3 px-4">
                      <Button
                        type="button"
                        variant={isCurrent ? "outline" : "primary"}
                        disabled={isCurrent || isUpgrading}
                        onClick={() => handleSelectPlan(plan.id)}
                        className="text-micro font-semibold h-8 w-full rounded-sm"
                      >
                        {isCurrent ? "Active Tier" : `Switch to ${plan.name}`}
                      </Button>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Billing Invoices & Receipts */}
      <div className="p-6 rounded-md bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-neutral-500 dark:text-zinc-400" />
            <h3 className="text-body font-semibold text-neutral-900 dark:text-zinc-100">Billing History & Tax Invoices</h3>
          </div>
          <span className="text-micro text-neutral-400 dark:text-zinc-500">GSTIN: 27AAACA1234F1Z8</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-body-sm">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-zinc-800 text-caption font-medium text-neutral-500 dark:text-zinc-400">
                <th className="py-2.5">Invoice #</th>
                <th className="py-2.5">Billing Date</th>
                <th className="py-2.5">Amount (INR)</th>
                <th className="py-2.5">Status</th>
                <th className="py-2.5 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-zinc-800 text-caption">
              <tr>
                <td className="py-3 font-mono font-medium text-neutral-900 dark:text-zinc-100">AV-2026-8910</td>
                <td className="py-3 text-neutral-500 dark:text-zinc-400">13 Oct 2026</td>
                <td className="py-3 font-mono tabular-nums text-neutral-900 dark:text-zinc-100">₹19,999.00</td>
                <td className="py-3">
                  <Badge variant="success" className="text-[10px]">PAID</Badge>
                </td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => toast({ type: "info", title: "Receipt AV-2026-8910 downloaded (PDF)." })}
                    className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    <span>Download PDF</span>
                    <ArrowUpRight size={12} />
                  </button>
                </td>
              </tr>
              <tr>
                <td className="py-3 font-mono font-medium text-neutral-900 dark:text-zinc-100">AV-2026-7840</td>
                <td className="py-3 text-neutral-500 dark:text-zinc-400">13 Sep 2026</td>
                <td className="py-3 font-mono tabular-nums text-neutral-900 dark:text-zinc-100">₹19,999.00</td>
                <td className="py-3">
                  <Badge variant="success" className="text-[10px]">PAID</Badge>
                </td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => toast({ type: "info", title: "Receipt AV-2026-7840 downloaded (PDF)." })}
                    className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    <span>Download PDF</span>
                    <ArrowUpRight size={12} />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
