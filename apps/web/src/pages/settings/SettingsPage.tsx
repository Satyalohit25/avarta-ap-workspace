import { useState, FormEvent } from "react";
import { Card, CardHeader, CardContent } from "../../components/ui/Card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "../../components/ui/table";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Tabs } from "../../components/ui/Tabs";
import { Alert } from "../../components/ui/Alert";
import { PageHeader } from "../../components/layout/PageHeader";
import { useToast } from "../../components/ui/ToastContext";
import {
  ShieldCheck,
  ArrowRight,
  Building2,
  RefreshCw,
  FileCheck2,
  CheckCircle2,
  Database,
} from "lucide-react";
import { AvartaCrest } from "../../components/brand/AvartaCrest";

const CANONICAL_AUDIT_LOGS = [
  {
    id: "aud-001",
    timestamp: "2026-09-01T10:45:22Z",
    actor: "Manav Manager",
    role: "Finance Manager",
    action: "POLICY_UPDATE",
    details: "Activated Tier 2 Dual Sign-Off for ₹1,00,001 – ₹5,00,000",
    ipAddress: "192.168.1.42 (Pune, IN)",
    status: "SUCCESS",
  },
  {
    id: "aud-002",
    timestamp: "2026-09-01T09:12:05Z",
    actor: "System Engine",
    role: "Automated Engine",
    action: "ERP_SYNC_DISPATCH",
    details: "Synchronized 14 paid invoice records to Tally Prime XML Gateway",
    ipAddress: "Internal Worker (us-east-1)",
    status: "SUCCESS",
  },
  {
    id: "aud-003",
    timestamp: "2026-08-31T16:30:00Z",
    actor: "Priya Executive",
    role: "Finance Executive",
    action: "EXCEPTION_RESOLVE",
    details: "Resolved UNKNOWN_VENDOR on INV-2026-1009 via Supplier Match",
    ipAddress: "103.21.14.88 (Mumbai, IN)",
    status: "SUCCESS",
  },
  {
    id: "aud-004",
    timestamp: "2026-08-31T14:15:10Z",
    actor: "Administrator User",
    role: "Administrator",
    action: "USER_PERMISSION_CHANGE",
    details: "Assigned role APPROVER to Vikram Director",
    ipAddress: "49.207.210.12 (Delhi, IN)",
    status: "SUCCESS",
  },
  {
    id: "aud-005",
    timestamp: "2026-08-30T11:00:45Z",
    actor: "Vikram Director",
    role: "Approver",
    action: "BATCH_APPROVAL",
    details: "Executed sign-off on payment batch #PB-2026-084 (₹ 18,40,000)",
    ipAddress: "115.112.89.5 (Bengaluru, IN)",
    status: "SUCCESS",
  },
];

const ERP_INTEGRATIONS = [
  {
    id: "tally",
    name: "Tally Prime ERP",
    category: "Accounting & GST Reconciliation",
    status: "CONNECTED",
    lastSync: "Today, 10:12 AM",
    recordsSynced: "1,248 Invoices",
    description:
      "Bi-directional sync of purchase vouchers, GST ledger, and payment status.",
  },
  {
    id: "quickbooks",
    name: "QuickBooks Online",
    category: "Cloud Accounting",
    status: "STANDBY",
    lastSync: "3 days ago",
    recordsSynced: "412 Invoices",
    description:
      "Direct API mapping for bills, vendor profiles, and bank feeds.",
  },
  {
    id: "xero",
    name: "Xero Accounting",
    category: "SME Financials",
    status: "STANDBY",
    lastSync: "Never connected",
    recordsSynced: "0 Invoices",
    description:
      "Automated AP bill creation and multi-currency exchange rate lock.",
  },
  {
    id: "sap",
    name: "SAP S/4HANA / Business One",
    category: "Enterprise ERP",
    status: "AVAILABLE",
    lastSync: "Custom IDoc Connector",
    recordsSynced: "Enterprise Tier",
    description:
      "IDoc / OData RFC gateway for PO 3-way matching and MIRO automation.",
  },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);

  const [formData, setFormData] = useState({
    orgName: "Acme Manufacturing Pvt Ltd",
    gstin: "27AAACA1234F1Z5",
    currency: "INR",
    idempotencyExpiry: "24 Hours",
    matchTolerance: "0.5% (Up to ₹100)",
    autoArchiveDays: "90 Days",
  });

  const [newRule, setNewRule] = useState({
    name: "",
    threshold: "≤ ₹50,000",
    signers: "Finance Manager",
    description: "",
  });

  const [approvalRules, setApprovalRules] = useState([
    {
      id: "tier-1",
      tier: "Tier 1: Standard Invoices",
      name: "Operational Spending",
      threshold: "≤ ₹1,00,000 / $10,000",
      description:
        "Automated 3-way match validation → Single manager sign-off.",
      signers: ["Finance Manager"],
      active: true,
      badgeColor:
        "bg-neutral-200/60 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300",
    },
    {
      id: "tier-2",
      tier: "Tier 2: Mid-Value Invoices",
      name: "Department Budget Review",
      threshold: "₹1,00,001 – ₹5,00,000",
      description:
        "Dual sign-off sequence required before entering scheduled payment batch.",
      signers: ["Finance Executive", "Finance Manager"],
      active: true,
      badgeColor:
        "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
    },
    {
      id: "tier-3",
      tier: "Tier 3: Executive High-Value Threshold",
      name: "Capital & Asset Procurement",
      threshold: "> ₹5,00,000 / $50,000",
      description:
        "Triple-tier sign-off including VP Finance / Director approval.",
      signers: ["Finance Manager", "Approver (Director)"],
      active: true,
      badgeColor:
        "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300",
    },
    {
      id: "tier-fx",
      tier: "Special: Foreign Currency Exposure",
      name: "Cross-Border FX Review",
      threshold: "All non-INR Invoices",
      description:
        "Mandatory treasury review for currency risk & withholding tax compliance.",
      signers: ["Finance Manager"],
      active: true,
      badgeColor:
        "bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-300",
    },
  ]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(true);
    toast.success("Settings Saved", "Financial controls and parameters updated.");
    setTimeout(() => setSaved(false), 3000);
  }

  function handleToggleRule(id: string) {
    setApprovalRules((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const nextActive = !r.active;
          toast.info(
            "Policy Rule Updated",
            `Rule "${r.name}" has been ${nextActive ? "enabled" : "disabled"}.`,
          );
          return { ...r, active: nextActive };
        }
        return r;
      }),
    );
  }

  function handleAddRule(e: FormEvent) {
    e.preventDefault();
    if (!newRule.name) return;
    const ruleName = newRule.name;
    setApprovalRules((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        tier: `Custom: ${newRule.name}`,
        name: newRule.name,
        threshold: newRule.threshold,
        description:
          newRule.description ||
          "Custom threshold policy configured in workspace settings.",
        signers: newRule.signers.split(",").map((s) => s.trim()),
        active: true,
        badgeColor:
          "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300",
      },
    ]);
    setShowAddRuleModal(false);
    setNewRule({
      name: "",
      threshold: "≤ ₹50,000",
      signers: "Finance Manager",
      description: "",
    });
    setSaved(true);
    toast.success("Approval Policy Added", `Policy "${ruleName}" is now active.`);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Settings & Workspace Configuration"
        subtitle="Manage organization financial controls, approval policies, ERP integrations, and audit logs."
      />

      {saved && (
        <Alert type="success" title="Settings Saved">
          Workspace configuration updated successfully.
        </Alert>
      )}

      <Tabs
        defaultTabId="org"
        variant="line"
        tabs={[
          {
            id: "org",
            label: "Organization & Financial Controls",
            icon: <Building2 size={15} />,
            content: (
              <form onSubmit={handleSubmit} className="pt-2 space-y-4">
                {/* Institutional Authority Seal Card */}
                <Card level="surface" className="relative border border-neutral-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 overflow-hidden shadow-2xs">
                  <AvartaCrest variant="watermark" className="opacity-[0.035] dark:opacity-[0.05]" />
                  <CardContent className="relative z-10 p-5 flex flex-col md:flex-row items-center md:items-start gap-5">
                    <div className="shrink-0 flex items-center justify-center p-2 rounded-xl bg-neutral-50 dark:bg-zinc-850 border border-neutral-200/80 dark:border-zinc-750 shadow-2xs">
                      <AvartaCrest variant="full" glow className="w-48 sm:w-56 h-auto" />
                    </div>
                    <div className="space-y-2 text-center md:text-left flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-micro font-mono font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 block">
                            Institutional Authority Seal
                          </span>
                          <h3 className="text-h3 font-bold text-neutral-900 dark:text-zinc-100 font-sans">
                            {formData.orgName || "Acme Manufacturing Pvt Ltd"}
                          </h3>
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-micro font-mono px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold self-center sm:self-auto">
                          <CheckCircle2 size={12} />
                          <span>Statutory Verified Tenant</span>
                        </span>
                      </div>
                      <p className="text-caption text-neutral-600 dark:text-zinc-400 leading-relaxed">
                        Authorized under the Avarta Institutional AP Governance Charter. Every payment disbursement, 3-way match reconciliation, and statutory audit export from this workspace carries this tamper-evident digital seal.
                      </p>
                      <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-4 text-micro font-mono text-neutral-500 dark:text-zinc-400 border-t border-neutral-100 dark:border-zinc-800">
                        <span>GSTIN: <strong className="text-neutral-800 dark:text-zinc-200">{formData.gstin || "27AAACA1234F1Z5"}</strong></span>
                        <span>•</span>
                        <span>Motto: <strong className="text-neutral-800 dark:text-zinc-200 font-serif">"आत्मानं विद्धि"</strong> (Know Thyself)</span>
                        <span>•</span>
                        <span>Cryptographic Hash: <strong className="text-neutral-800 dark:text-zinc-200 font-mono">SHA-256 / AES-256 GCM</strong></span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card level="surface">
                  <CardHeader
                    title="Tenant Financial Defaults & Matching Rules"
                    description="Controls governing OCR matching tolerances, currency, and idempotency protection"
                  />
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Organization Legal Entity Name"
                        value={formData.orgName}
                        onChange={(e) =>
                          setFormData({ ...formData, orgName: e.target.value })
                        }
                        required
                      />
                      <Input
                        label="Primary GSTIN / Tax ID"
                        value={formData.gstin}
                        onChange={(e) =>
                          setFormData({ ...formData, gstin: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Select
                        label="Default Base Currency"
                        value={formData.currency}
                        onChange={(e) =>
                          setFormData({ ...formData, currency: e.target.value })
                        }
                        options={[
                          { value: "INR", label: "INR (₹) - Indian Rupee" },
                          { value: "USD", label: "USD ($) - US Dollar" },
                          { value: "EUR", label: "EUR (€) - Euro" },
                          { value: "GBP", label: "GBP (£) - British Pound" },
                        ]}
                      />
                      <Select
                        label="3-Way Match Price Variance Tolerance"
                        value={formData.matchTolerance}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            matchTolerance: e.target.value,
                          })
                        }
                        options={[
                          {
                            value: "Exact Match (0.0%)",
                            label: "Exact Match (0.0% variance)",
                          },
                          {
                            value: "0.5% (Up to ₹100)",
                            label: "0.5% or ₹100 (Recommended)",
                          },
                          { value: "1.0% (Up to ₹500)", label: "1.0% or ₹500" },
                        ]}
                      />
                      <Select
                        label="Payment Idempotency Key Expiry"
                        value={formData.idempotencyExpiry}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            idempotencyExpiry: e.target.value,
                          })
                        }
                        options={[
                          { value: "24 Hours", label: "24 Hours (Standard)" },
                          { value: "48 Hours", label: "48 Hours" },
                        ]}
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button type="submit">Save Financial Controls</Button>
                    </div>
                  </CardContent>
                </Card>
              </form>
            ),
          },
          {
            id: "approvals",
            label: "Approval Threshold Matrix",
            icon: <ShieldCheck size={15} />,
            content: (
              <div className="space-y-4 pt-2">
                <Card level="surface">
                  <CardHeader
                    title="MULTI-TIER APPROVAL THRESHOLD MATRIX"
                    description="Delegation of authority & sign-off hierarchy for AP workflow progression"
                    action={
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowAddRuleModal(true)}
                          className="gap-1.5"
                        >
                          <span>+ Add Policy Rule</span>
                        </Button>
                        <span className="inline-flex items-center gap-1 text-micro font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold border border-emerald-300 dark:border-emerald-900/60">
                          <ShieldCheck size={13} />
                          <span>
                            Active (
                            {approvalRules.filter((r) => r.active).length})
                          </span>
                        </span>
                      </div>
                    }
                  />
                  <CardContent className="p-5 space-y-3">
                    {approvalRules.map((rule) => (
                      <div
                        key={rule.id}
                        className={`p-4 rounded-xl border transition-all ${
                          rule.active
                            ? "border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs"
                            : "border-dashed border-neutral-200 dark:border-zinc-800 bg-neutral-50/60 dark:bg-zinc-900/40 opacity-60"
                        } flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-body-sm text-neutral-900 dark:text-zinc-100">
                              {rule.tier}
                            </span>
                            <span
                              className={`font-mono text-micro px-2 py-0.5 rounded font-semibold ${rule.badgeColor}`}
                            >
                              {rule.threshold}
                            </span>
                            {!rule.active && (
                              <span className="text-micro font-mono text-neutral-400 bg-neutral-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-caption text-neutral-500 dark:text-zinc-400">
                            {rule.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-1.5 text-caption font-mono font-semibold text-neutral-800 dark:text-zinc-200">
                            {rule.signers.map((signer, idx) => (
                              <span
                                key={idx}
                                className="flex items-center gap-1.5"
                              >
                                {idx > 0 && (
                                  <ArrowRight
                                    size={13}
                                    className="text-neutral-400"
                                  />
                                )}
                                <span
                                  className={
                                    idx === rule.signers.length - 1
                                      ? "text-indigo-600 dark:text-indigo-400"
                                      : ""
                                  }
                                >
                                  {signer}
                                </span>
                              </span>
                            ))}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleRule(rule.id)}
                            className="text-micro font-mono py-0.5 px-2 h-7"
                          >
                            {rule.active ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Add Custom Rule Modal */}
                {showAddRuleModal && (
                  <div className="fixed inset-0 z-50 bg-neutral-950/60 dark:bg-zinc-950/80 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-xl space-y-4">
                      <div className="border-b border-neutral-100 dark:border-zinc-800 pb-3">
                        <h3 className="text-h3 text-neutral-900 dark:text-zinc-100 font-semibold">
                          Configure New Approval Policy Rule
                        </h3>
                        <p className="text-caption text-neutral-500 dark:text-zinc-400 mt-1">
                          Define spend threshold, approver sequence, and policy
                          description.
                        </p>
                      </div>

                      <form onSubmit={handleAddRule} className="space-y-3.5">
                        <Input
                          label="Policy Name"
                          placeholder="e.g. IT Software Subscriptions"
                          value={newRule.name}
                          onChange={(e) =>
                            setNewRule({ ...newRule, name: e.target.value })
                          }
                          required
                        />

                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            label="Threshold Amount"
                            placeholder="e.g. > $25,000"
                            value={newRule.threshold}
                            onChange={(e) =>
                              setNewRule({
                                ...newRule,
                                threshold: e.target.value,
                              })
                            }
                            required
                          />
                          <Select
                            label="Required Sequence"
                            value={newRule.signers}
                            onChange={(e) =>
                              setNewRule({
                                ...newRule,
                                signers: e.target.value,
                              })
                            }
                            options={[
                              {
                                value: "Finance Manager",
                                label: "Single: Manager",
                              },
                              {
                                value: "Finance Executive, Finance Manager",
                                label: "Dual: Exec → Manager",
                              },
                              {
                                value: "Finance Manager, Approver",
                                label: "Dual: Manager → Approver",
                              },
                            ]}
                          />
                        </div>

                        <Input
                          label="Policy Description"
                          placeholder="e.g. Requires departmental VP sign-off prior to release."
                          value={newRule.description}
                          onChange={(e) =>
                            setNewRule({
                              ...newRule,
                              description: e.target.value,
                            })
                          }
                        />

                        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-zinc-800">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowAddRuleModal(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit">Save Approval Policy</Button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            ),
          },
          {
            id: "erp-sync",
            label: "ERP & Accounting Integrations",
            icon: <Database size={15} />,
            content: (
              <div className="space-y-4 pt-2">
                <Card level="surface">
                  <CardHeader
                    title="Connected Accounting Systems & ERP Gateways"
                    description="Complement your general ledger without replacing it seamlessly."
                  />
                  <CardContent className="p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {ERP_INTEGRATIONS.map((erp) => (
                        <div
                          key={erp.id}
                          className="p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3 flex flex-col justify-between shadow-2xs"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Database
                                  size={16}
                                  className="text-indigo-600 dark:text-indigo-400"
                                />
                                <span className="font-semibold text-body-sm text-neutral-900 dark:text-zinc-100">
                                  {erp.name}
                                </span>
                              </div>
                              <span
                                className={`text-micro font-mono font-semibold px-2 py-0.5 rounded-full ${
                                  erp.status === "CONNECTED"
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-900/60"
                                    : "bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400 border border-neutral-200 dark:border-zinc-700"
                                }`}
                              >
                                {erp.status}
                              </span>
                            </div>
                            <p className="text-caption text-neutral-500 dark:text-zinc-400">
                              {erp.description}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-neutral-100 dark:border-zinc-800 flex items-center justify-between text-micro font-mono text-neutral-500">
                            <span>Last Sync: {erp.lastSync}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-micro font-medium"
                            >
                              {erp.status === "CONNECTED"
                                ? "Configure"
                                : "Connect"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ),
          },
          {
            id: "audit-logs",
            label: "System Audit Log & Security Events",
            icon: <FileCheck2 size={15} />,
            content: (
              <div className="space-y-4 pt-2">
                <Card level="surface">
                  <CardHeader
                    title="Workspace Audit Trail & Event Log"
                    description="Chronological immutable security ledger tracking configuration updates, delegations, and payment batches"
                    action={
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-caption"
                      >
                        <RefreshCw size={13} />
                        <span>Refresh Events</span>
                      </Button>
                    }
                  />
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Actor & Role</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Event Details</TableHead>
                          <TableHead>IP / Origin</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {CANONICAL_AUDIT_LOGS.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-micro text-neutral-500 dark:text-zinc-400">
                              {new Date(log.timestamp).toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell className="text-body-sm">
                              <span className="font-medium text-neutral-900 dark:text-zinc-100 block">
                                {log.actor}
                              </span>
                              <span className="text-micro font-mono text-neutral-400 block">
                                {log.role}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-micro font-semibold text-indigo-600 dark:text-indigo-400">
                              {log.action}
                            </TableCell>
                            <TableCell className="text-caption text-neutral-700 dark:text-zinc-300 max-w-xs">
                              {log.details}
                            </TableCell>
                            <TableCell className="font-mono text-micro text-neutral-500">
                              {log.ipAddress}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                                <CheckCircle2 size={11} />
                                <span>{log.status}</span>
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
