import { useEffect, useState } from "react";
import { CreditCard, ArrowUpRight, FileText, AlertCircle } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { useToast } from "../../../components/ui/ToastContext";
import {
  BillingPlan,
  BillingReceipt,
  fetchBillingPlans,
  fetchBillingReceipts,
  fetchTenantUsage,
  TenantUsage,
  upgradeTenantPlan,
} from "../../../api/billing";

const FEATURE_LABELS: Record<string, string> = {
  byokAi: "BYOK AI model choice",
  byodbSovereignty: "BYODB database sovereignty",
  erpXmlGateway: "ERP / Tally XML gateway",
  threeWayMatching: "Automated 3-way matching",
  advancedApprovals: "Advanced approval thresholds",
  auditExport: "Audit trail export",
  customSla: "Custom SLA & support",
};

function formatLimit(value: number | null): string {
  return value === null ? "Unlimited" : value.toLocaleString("en-IN");
}

export function BillingPlanCard() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [usage, setUsage] = useState<TenantUsage | null>(null);
  const [receipts, setReceipts] = useState<BillingReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const [planList, currentUsage, receiptList] = await Promise.all([
        fetchBillingPlans(),
        fetchTenantUsage(),
        fetchBillingReceipts(),
      ]);
      setPlans(planList);
      setUsage(currentUsage);
      setReceipts(receiptList);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load subscription details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSelectPlan(planId: "STARTER" | "GROWTH" | "ENTERPRISE") {
    if (!usage || planId === usage.plan.id) return;
    const confirmed = window.confirm(
      `Switch the workspace to the ${planId} plan? This changes invoice and seat entitlements immediately.`
    );
    if (!confirmed) return;

    setUpgrading(planId);
    try {
      const updated = await upgradeTenantPlan(planId);
      setUsage(updated);
      toast.success("Subscription Updated", `Workspace is now on the ${updated.plan.name} plan.`);
    } catch (err) {
      toast.error(
        "Plan Change Failed",
        err instanceof Error ? err.message : "Could not update the subscription."
      );
    } finally {
      setUpgrading(null);
    }
  }

  if (loading) {
    return (
      <div className="p-6 rounded-md bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800">
        <p className="text-caption text-neutral-500 dark:text-zinc-400">Loading subscription details…</p>
      </div>
    );
  }

  if (loadError || !usage) {
    return (
      <div className="p-6 rounded-md bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 flex items-center justify-between gap-3">
        <p className="text-caption text-red-600 dark:text-red-400 flex items-center gap-1.5">
          <AlertCircle size={14} />
          {loadError || "Subscription details are unavailable."}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={load}>
          Retry
        </Button>
      </div>
    );
  }

  const invoicePercentage =
    usage.usage.invoicesLimit === null || usage.usage.invoicesLimit === 0
      ? 0
      : Math.min(100, Math.round((usage.usage.invoicesUsed / usage.usage.invoicesLimit) * 100));
  const seatPercentage =
    usage.usage.seatsLimit === null || usage.usage.seatsLimit === 0
      ? 0
      : Math.min(100, Math.round((usage.usage.seatsUsed / usage.usage.seatsLimit) * 100));

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-md bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 dark:border-zinc-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
              <CreditCard size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-body font-semibold text-neutral-900 dark:text-zinc-100 text-balance">
                  {usage.plan.name} Plan
                </h3>
                <Badge
                  variant={usage.status === "ACTIVE" ? "success" : "neutral"}
                  className="text-[10px] uppercase font-semibold"
                >
                  {usage.status}
                </Badge>
              </div>
              <p className="text-caption text-neutral-500 dark:text-zinc-400">
                Current period ends on{" "}
                <strong>{new Date(usage.periodEnd).toLocaleDateString("en-IN")}</strong>
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xl font-bold font-mono text-neutral-900 dark:text-zinc-100 tabular-nums">
              ₹{usage.plan.priceMonthlyInr.toLocaleString("en-IN")}
            </span>
            <span className="text-caption text-neutral-500 dark:text-zinc-400"> / month</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-zinc-800/40 border border-neutral-200/60 dark:border-zinc-700/60 space-y-3">
            <div className="flex justify-between items-center text-body-sm">
              <span className="font-medium text-neutral-700 dark:text-zinc-300">Monthly Invoices Processed</span>
              <span className="font-mono font-medium text-neutral-900 dark:text-zinc-100 tabular-nums">
                {usage.usage.invoicesUsed} / {formatLimit(usage.usage.invoicesLimit)}
              </span>
            </div>
            <div className="w-full bg-neutral-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-colors duration-100 ${
                  invoicePercentage > 85 ? "bg-amber-500" : "bg-indigo-600 dark:bg-indigo-500"
                }`}
                style={{ width: `${usage.usage.invoicesLimit === null ? 10 : invoicePercentage}%` }}
              />
            </div>
            <p className="text-micro text-neutral-500 dark:text-zinc-400 flex items-center justify-between">
              <span>
                {usage.usage.invoicesRemaining === null
                  ? "Unlimited volume enabled"
                  : `${usage.usage.invoicesRemaining} remaining this cycle`}
              </span>
              <span>
                {usage.usage.invoicesLimit === null ? "Fair use policy" : `${invoicePercentage}% utilized`}
              </span>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-zinc-800/40 border border-neutral-200/60 dark:border-zinc-700/60 space-y-3">
            <div className="flex justify-between items-center text-body-sm">
              <span className="font-medium text-neutral-700 dark:text-zinc-300">Active Team Seats</span>
              <span className="font-mono font-medium text-neutral-900 dark:text-zinc-100 tabular-nums">
                {usage.usage.seatsUsed} / {formatLimit(usage.usage.seatsLimit)}
              </span>
            </div>
            <div className="w-full bg-neutral-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-colors duration-100"
                style={{ width: `${usage.usage.seatsLimit === null ? 10 : seatPercentage}%` }}
              />
            </div>
            <p className="text-micro text-neutral-500 dark:text-zinc-400 flex items-center justify-between">
              <span>
                {usage.usage.seatsRemaining === null
                  ? "Unlimited enterprise seats"
                  : `${usage.usage.seatsRemaining} seats available`}
              </span>
              <span>
                {usage.usage.seatsLimit === null ? "RBAC enforced" : `${seatPercentage}% utilized`}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-md overflow-hidden">
        <div className="px-5 py-3.5 border-b border-neutral-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-neutral-50/70 dark:bg-zinc-850/50">
          <div>
            <h3 className="text-body font-semibold text-neutral-900 dark:text-zinc-100 text-balance">
              Workspace Subscription & Entitlements
            </h3>
            <p className="text-caption text-neutral-500 dark:text-zinc-400">
              Contract capacity, processing limits, and feature gates
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
                {plans.map((plan) => (
                  <th key={plan.id} className="py-2.5 px-4 font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-neutral-900 dark:text-zinc-100">{plan.name}</span>
                      {plan.id === usage.plan.id && (
                        <span className="text-[9px] font-mono uppercase bg-neutral-200 dark:bg-zinc-700 text-neutral-800 dark:text-zinc-200 px-1 rounded-xs font-semibold">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-neutral-500 font-mono text-micro font-normal">
                      ₹{plan.priceMonthlyInr.toLocaleString("en-IN")}/mo
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-zinc-800 text-neutral-700 dark:text-zinc-300">
              <tr>
                <td className="py-2.5 px-4 font-medium text-neutral-900 dark:text-zinc-100">Monthly Invoices Quota</td>
                {plans.map((plan) => (
                  <td key={plan.id} className="py-2.5 px-4 font-mono">
                    {plan.monthlyInvoiceLimit == null
                      ? "Unlimited"
                      : `${plan.monthlyInvoiceLimit.toLocaleString("en-IN")} invoices`}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-neutral-900 dark:text-zinc-100">Authorized Team Seats</td>
                {plans.map((plan) => (
                  <td key={plan.id} className="py-2.5 px-4 font-mono">
                    {plan.seatLimit == null
                      ? "Unlimited"
                      : `${plan.seatLimit} seats`}
                  </td>
                ))}
              </tr>
              {Object.keys(FEATURE_LABELS).map((feature) => (
                <tr key={feature}>
                  <td className="py-2.5 px-4 font-medium text-neutral-900 dark:text-zinc-100">
                    {FEATURE_LABELS[feature]}
                  </td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="py-2.5 px-4 font-mono">
                      {plan.features[feature] ? (
                        <span className="text-emerald-600 dark:text-emerald-400">Included</span>
                      ) : (
                        <span className="text-neutral-400 dark:text-zinc-500">Not included</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="bg-neutral-50/60 dark:bg-zinc-850/30">
                <td className="py-3 px-4 font-medium text-neutral-900 dark:text-zinc-100">Workspace Tier Allocation</td>
                {plans.map((plan) => {
                  const isCurrent = plan.id === usage.plan.id;
                  return (
                    <td key={plan.id} className="py-3 px-4">
                      <Button
                        type="button"
                        variant={isCurrent ? "outline" : "primary"}
                        disabled={isCurrent || Boolean(upgrading)}
                        onClick={() => handleSelectPlan(plan.id)}
                        className="text-micro font-semibold h-8 w-full rounded-sm"
                      >
                        {isCurrent
                          ? "Active Tier"
                          : upgrading === plan.id
                            ? "Switching…"
                            : `Switch to ${plan.name}`}
                      </Button>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-6 rounded-md bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-neutral-500 dark:text-zinc-400" />
            <h3 className="text-body font-semibold text-neutral-900 dark:text-zinc-100 text-balance">
              Billing History & Tax Invoices
            </h3>
          </div>
        </div>

        {receipts.length === 0 ? (
          <p className="text-caption text-neutral-500 dark:text-zinc-400 py-4">
            No billing receipts yet. Receipts appear here after a payment provider confirms a charge.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-zinc-800 text-caption font-medium text-neutral-500 dark:text-zinc-400">
                  <th className="py-2.5">Invoice #</th>
                  <th className="py-2.5">Billing Date</th>
                  <th className="py-2.5">Amount</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-zinc-800 text-caption">
                {receipts.map((receipt) => (
                  <tr key={receipt.id}>
                    <td className="py-3 font-mono font-medium text-neutral-900 dark:text-zinc-100">
                      {receipt.invoiceNumber}
                    </td>
                    <td className="py-3 text-neutral-500 dark:text-zinc-400">
                      {new Date(receipt.date).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-3 font-mono tabular-nums text-neutral-900 dark:text-zinc-100">
                      ₹{receipt.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3">
                      <Badge variant={receipt.status === "PAID" ? "success" : "neutral"} className="text-[10px]">
                        {receipt.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      {receipt.pdfDownloadUrl ? (
                        <a
                          href={receipt.pdfDownloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                        >
                          <span>Download PDF</span>
                          <ArrowUpRight size={12} />
                        </a>
                      ) : (
                        <span className="text-neutral-400 dark:text-zinc-500">Unavailable</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
