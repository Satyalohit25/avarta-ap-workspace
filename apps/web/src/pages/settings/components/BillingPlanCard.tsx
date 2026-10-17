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
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-neutral-200/80 dark:border-zinc-800 shadow-xs space-y-6">
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
                className={`h-full rounded-full transition-all duration-500 ${
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
                className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-500"
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
      <div>
        <h3 className="text-body font-semibold text-neutral-900 dark:text-zinc-100 mb-1">
          Available Subscription Plans
        </h3>
        <p className="text-caption text-neutral-500 dark:text-zinc-400 mb-4">
          Upgrade or modify your tier. All plans include automated 3-way matching, audit logs, and WCAG AA accessibility.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {AVAILABLE_PLANS.map((plan) => {
            const isCurrent = plan.id === activePlanId;
            return (
              <div
                key={plan.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isCurrent
                    ? "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-500/80 ring-2 ring-indigo-500/20 dark:ring-indigo-500/30"
                    : "bg-white dark:bg-zinc-900 border-neutral-200/80 dark:border-zinc-800 hover:border-neutral-300 dark:hover:border-zinc-700"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-body text-neutral-900 dark:text-zinc-100">{plan.name}</span>
                    {isCurrent && (
                      <Badge variant="indigo" className="text-[10px] uppercase font-bold">
                        Current Plan
                      </Badge>
                    )}
                  </div>

                  <p className="text-caption text-neutral-500 dark:text-zinc-400 min-h-[36px]">{plan.tagline}</p>

                  <div className="border-t border-b border-neutral-100 dark:border-zinc-800 py-3">
                    <span className="text-2xl font-bold font-mono text-neutral-900 dark:text-zinc-100 tabular-nums">
                      ₹{plan.priceMonthlyInr.toLocaleString("en-IN")}
                    </span>
                    <span className="text-caption text-neutral-500 dark:text-zinc-400"> / month</span>
                  </div>

                  <ul className="space-y-2 pt-1 text-caption text-neutral-600 dark:text-zinc-300">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6">
                  <Button
                    type="button"
                    variant={isCurrent ? "outline" : "primary"}
                    disabled={isCurrent || isUpgrading}
                    onClick={() => handleSelectPlan(plan.id)}
                    className="w-full text-caption font-semibold"
                  >
                    {isCurrent ? "Active Plan" : `Upgrade to ${plan.name}`}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Billing Invoices & Receipts */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-neutral-200/80 dark:border-zinc-800 shadow-xs space-y-4">
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
