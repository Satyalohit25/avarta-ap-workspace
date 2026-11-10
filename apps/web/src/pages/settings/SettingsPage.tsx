import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useEffect, useMemo, useState, FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
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
import { useAuth } from "../../app/AuthContext";
import {
  ShieldCheck,
  ArrowRight,
  Building2,
  RefreshCw,
  FileCheck2,
  CheckCircle2,
  Database,
  Users,
  KeyRound,
  HardDrive,
  CreditCard,
  Lock,
  Landmark,
  Mail,
  Code2,
} from "lucide-react";
import { ByokConfigCard } from "./components/ByokConfigCard";
import { ByodbConfigCard } from "./components/ByodbConfigCard";
import { ErpConnectorsCard } from "./components/ErpConnectorsCard";
import { PaymentGatewayConfigCard } from "./components/PaymentGatewayConfigCard";
import { EmailConfigCard } from "./components/EmailConfigCard";
import { ApiKeysCard } from "./components/ApiKeysCard";
import { BillingPlanCard } from "./components/BillingPlanCard";
import { TeamManagementCard } from "./components/TeamManagementCard";
import BankAccountsPage from "../bank-accounts/BankAccountsPage";
import { fetchOrganizationSettings, updateOrganizationSettings } from "../../api/organization";
import { fetchAuditLogs, AuditLogItem } from "../../api/audit";
import { fetchTeamMembers, TeamMemberRecord } from "../../api/auth";

interface CanonicalRoleSpec {
  name: string;
  role: string;
  scope: string;
  color: string;
  bgColor: string;
}

const CANONICAL_ROLE_SPECS: CanonicalRoleSpec[] = [
  {
    name: "Administrator",
    role: "Administrator",
    scope: "Full tenant administration, BYOK/BYODB sovereignty, tier 3 approvals (> ₹5L)",
    color: "text-red-700 dark:text-red-300",
    bgColor: "bg-red-50 dark:bg-red-950/40",
  },
  {
    name: "Finance Manager",
    role: "Finance Manager",
    scope: "Complete operational AP supervision, batch payment execution, tier 2 approvals",
    color: "text-purple-700 dark:text-purple-300",
    bgColor: "bg-purple-50 dark:bg-purple-950/40",
  },
  {
    name: "Finance Executive",
    role: "Finance Executive",
    scope: "Invoice capture triage, variance investigation, supplier master maintenance",
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-50 dark:bg-blue-950/40",
  },
  {
    name: "Approver",
    role: "Approver",
    scope: "Line-item cost center review, receipt verification, tier 1 approvals (≤ ₹1L)",
    color: "text-amber-700 dark:text-amber-300",
    bgColor: "bg-amber-50 dark:bg-amber-950/40",
  },
  {
    name: "Read Only",
    role: "Read Only",
    scope: "Read-only ledger visibility, immutable audit log verification, reporting",
    color: "text-neutral-700 dark:text-zinc-300",
    bgColor: "bg-neutral-100 dark:bg-zinc-800",
  },
];

interface ApprovalRuleItem {
  id: string;
  tier: string;
  name: string;
  threshold: string;
  description: string;
  signers: string[];
  badgeColor: string;
}

const READONLY_APPROVAL_RULES: ApprovalRuleItem[] = [
  {
    id: "tier-1",
    tier: "Tier 1: Standard Invoices",
    name: "Operational Spending",
    threshold: "≤ ₹1,00,000 / $10,000",
    description:
      "Automated 3-way match validation → Sign-off by Approver, Finance Manager, or Administrator.",
    signers: ["Approver", "Finance Manager", "Administrator"],
    badgeColor:
      "bg-neutral-200/60 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300",
  },
  {
    id: "tier-2",
    tier: "Tier 2: Mid-Value Invoices",
    name: "Department Budget Review",
    threshold: "₹1,00,001 – ₹5,00,000 / $10,001 – $50,000",
    description:
      "Elevated spend review required before entering scheduled payment batch.",
    signers: ["Finance Manager", "Administrator"],
    badgeColor:
      "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
  },
  {
    id: "tier-3",
    tier: "Tier 3: Executive High-Value Threshold",
    name: "Capital & Asset Procurement",
    threshold: "> ₹5,00,000 / $50,000",
    description:
      "High-value executive threshold sign-off strictly restricted to Administrator.",
    signers: ["Administrator"],
    badgeColor:
      "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300",
  },
];

interface SettingsFormState {
  orgName: string;
  gstin: string;
  currency: string;
  tolerancePercent: string;
  toleranceCap: string;
  idempotencyHours: string;
  autoArchiveDays: string;
}

const EMPTY_FORM: SettingsFormState = {
  orgName: "",
  gstin: "",
  currency: "INR",
  tolerancePercent: "0.5",
  toleranceCap: "100",
  idempotencyHours: "24",
  autoArchiveDays: "90",
};

export default function SettingsPage() {
  useDocumentTitle("Settings & Preferences", "Organization settings, member access roles, matching tolerances, and workflow configurations.");
  const { toast } = useToast();
  const { user } = useAuth();
  const role = user?.role?.toUpperCase();
  const isAdmin = role === "ADMINISTRATOR";
  const canManageBilling = isAdmin || role === "FINANCE_MANAGER";
  const canViewAudit = isAdmin || role === "FINANCE_MANAGER";

  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const restrictedTabIds = ["byok", "byodb", "erp-sync", "payment-gateway", "email", "api-keys"];
  const sanitizedTabParam =
    !isAdmin && restrictedTabIds.includes(tabParam || "") ? "org" : tabParam;
  const defaultTab =
    sanitizedTabParam === "users" || sanitizedTabParam === "team"
      ? "users"
      : sanitizedTabParam || "org";

  const [formData, setFormData] = useState<SettingsFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMemberRecord[]>([]);

  const userNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of teamMembers) map.set(member.id, member.fullName);
    return map;
  }, [teamMembers]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const profile = await fetchOrganizationSettings();
        if (cancelled) return;
        setFormData({
          orgName: profile.name,
          gstin: profile.gstin || "",
          currency: profile.defaultCurrency,
          tolerancePercent: String(profile.settings.priceTolerancePercent),
          toleranceCap: String(profile.settings.priceToleranceCap),
          idempotencyHours: String(profile.settings.idempotencyExpiryHours),
          autoArchiveDays: String(profile.settings.autoArchiveDays),
        });
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load organization settings.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    fetchTeamMembers()
      .then((members) => {
        if (!cancelled) setTeamMembers(members);
      })
      .catch(() => {
        // Non-admins may still read the team directory; failure is non-fatal.
      });

    if (canViewAudit) {
      setAuditLoading(true);
      fetchAuditLogs({ pageSize: 25 })
        .then((result) => {
          if (!cancelled) {
            setAuditLogs(result.data);
            setAuditError(null);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setAuditError(err instanceof Error ? err.message : "Failed to load audit events.");
          }
        })
        .finally(() => {
          if (!cancelled) setAuditLoading(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [canViewAudit]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateOrganizationSettings({
        name: formData.orgName.trim(),
        gstin: formData.gstin.trim() ? formData.gstin.trim().toUpperCase() : null,
        defaultCurrency: formData.currency,
        settings: {
          priceTolerancePercent: Number(formData.tolerancePercent),
          priceToleranceCap: Number(formData.toleranceCap),
          idempotencyExpiryHours: Number(formData.idempotencyHours),
          autoArchiveDays: Number(formData.autoArchiveDays),
        },
      });
      setSaved(true);
      toast.success("Settings Saved", "Financial controls and organization profile updated.");
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error(
        "Save Failed",
        err instanceof Error ? err.message : "Could not persist workspace settings."
      );
    } finally {
      setSaving(false);
    }
  }

  async function refreshAudit() {
    setAuditLoading(true);
    try {
      const result = await fetchAuditLogs({ pageSize: 25 });
      setAuditLogs(result.data);
      setAuditError(null);
    } catch (err) {
      setAuditError(err instanceof Error ? err.message : "Failed to refresh audit events.");
    } finally {
      setAuditLoading(false);
    }
  }

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      <PageHeader
        title="Settings & Workspace Configuration"
        subtitle="Manage organization financial controls, approval policies, ERP integrations, and audit logs."
      />

      {saved && (
        <Alert type="success" title="Settings Saved">
          Workspace configuration updated successfully.
        </Alert>
      )}

      {loading ? (
        <Card level="surface">
          <CardContent className="p-6">
            <p className="text-caption text-neutral-500 dark:text-zinc-400">
              Loading workspace settings…
            </p>
          </CardContent>
        </Card>
      ) : loadError ? (
        <Alert type="error" title="Could not load settings">
          {loadError}
        </Alert>
      ) : (
        <Tabs
          defaultTabId={defaultTab}
          variant="line"
          tabs={[
            {
              id: "org",
              label: "Organization & Financial Controls",
              icon: <Building2 size={15} />,
              content: (
                <form onSubmit={handleSubmit} className="pt-2 space-y-4">
                  <Card level="surface" className="border border-neutral-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
                    <CardContent className="p-5 flex flex-col md:flex-row items-center md:items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
                        <Building2 size={24} />
                      </div>
                      <div className="space-y-1.5 text-center md:text-left flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-micro font-mono font-semibold uppercase tracking-wider text-neutral-500 dark:text-zinc-400 block">
                              Tenant Organization
                            </span>
                            <h3 className="text-h3 font-bold text-neutral-900 dark:text-zinc-100 font-sans text-balance">
                              {formData.orgName || "Your organization"}
                            </h3>
                          </div>
                          <span className="inline-flex items-center gap-1.5 text-micro font-mono px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold self-center sm:self-auto">
                            <CheckCircle2 size={12} />
                            <span>Active Tenant</span>
                          </span>
                        </div>
                        <p className="text-caption text-neutral-600 dark:text-zinc-400 leading-relaxed">
                          Workspace configuration for Accounts Payable operations, approval hierarchies, and reconciliation policies.
                        </p>
                        <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-4 text-micro font-mono text-neutral-500 dark:text-zinc-400 border-t border-neutral-100 dark:border-zinc-800">
                          <span>GSTIN: <strong className="text-neutral-800 dark:text-zinc-200">{formData.gstin || "Not set"}</strong></span>
                          <span>•</span>
                          <span>Base Currency: <strong className="text-neutral-800 dark:text-zinc-200 font-mono">{formData.currency}</strong></span>
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
                          disabled={!isAdmin}
                        />
                        <Input
                          label="Primary GSTIN / Tax ID"
                          value={formData.gstin}
                          onChange={(e) =>
                            setFormData({ ...formData, gstin: e.target.value.toUpperCase() })
                          }
                          placeholder="27AAACA1234F1Z5"
                          maxLength={15}
                          disabled={!isAdmin}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Select
                          label="Default Base Currency"
                          value={formData.currency}
                          onChange={(e) =>
                            setFormData({ ...formData, currency: e.target.value })
                          }
                          disabled={!isAdmin}
                          options={[
                            { value: "INR", label: "INR (₹) - Indian Rupee" },
                            { value: "USD", label: "USD ($) - US Dollar" },
                            { value: "EUR", label: "EUR (€) - Euro" },
                            { value: "GBP", label: "GBP (£) - British Pound" },
                            { value: "SGD", label: "SGD (S$) - Singapore Dollar" },
                            { value: "AED", label: "AED (د.إ) - UAE Dirham" },
                          ]}
                        />
                        <Input
                          label="Price Variance Tolerance (%)"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={formData.tolerancePercent}
                          onChange={(e) =>
                            setFormData({ ...formData, tolerancePercent: e.target.value })
                          }
                          disabled={!isAdmin}
                        />
                        <Input
                          label="Tolerance Cap (amount)"
                          type="number"
                          min="0"
                          step="1"
                          value={formData.toleranceCap}
                          onChange={(e) =>
                            setFormData({ ...formData, toleranceCap: e.target.value })
                          }
                          disabled={!isAdmin}
                        />
                        <Select
                          label="Payment Idempotency Key Expiry"
                          value={formData.idempotencyHours}
                          onChange={(e) =>
                            setFormData({ ...formData, idempotencyHours: e.target.value })
                          }
                          disabled={!isAdmin}
                          options={[
                            { value: "24", label: "24 Hours (Standard)" },
                            { value: "48", label: "48 Hours" },
                            { value: "72", label: "72 Hours" },
                          ]}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Select
                          label="Archive After Payment (days)"
                          value={formData.autoArchiveDays}
                          onChange={(e) =>
                            setFormData({ ...formData, autoArchiveDays: e.target.value })
                          }
                          disabled={!isAdmin}
                          options={[
                            { value: "30", label: "30 Days" },
                            { value: "60", label: "60 Days" },
                            { value: "90", label: "90 Days (Recommended)" },
                            { value: "180", label: "180 Days" },
                          ]}
                        />
                      </div>

                      {isAdmin && (
                        <div className="pt-2 flex justify-end">
                          <Button type="submit" disabled={saving}>
                            {saving ? "Saving…" : "Save Financial Controls"}
                          </Button>
                        </div>
                      )}
                      {!isAdmin && (
                        <p className="text-micro text-neutral-500 dark:text-zinc-400">
                          Only an Administrator can change organization financial controls.
                        </p>
                      )}
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
                          <span className="inline-flex items-center gap-1.5 text-micro font-mono bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300 px-2.5 py-1 rounded-sm border border-neutral-200 dark:border-zinc-700 font-semibold">
                            <Lock size={12} />
                            <span>Deployment Configuration (Read-Only)</span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-micro font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold border border-emerald-300 dark:border-emerald-900/60">
                            <ShieldCheck size={13} />
                            <span>Active ({READONLY_APPROVAL_RULES.length})</span>
                          </span>
                        </div>
                      }
                    />
                    <CardContent className="p-5 space-y-3">
                      {READONLY_APPROVAL_RULES.map((rule) => (
                        <div
                          key={rule.id}
                          className="p-4 rounded-xl border transition-colors duration-100 border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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
                            <span className="inline-flex items-center gap-1 text-micro font-mono px-2 py-0.5 rounded-full font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                              <CheckCircle2 size={11} />
                              <span>Enforced</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              ),
            },
            ...(isAdmin
              ? [
                  {
                    id: "byok",
                    label: "AI & Storage Keys (BYOK)",
                    icon: <KeyRound size={15} />,
                    content: (
                      <div className="space-y-4 pt-2">
                        <ByokConfigCard />
                      </div>
                    ),
                  },
                  {
                    id: "byodb",
                    label: "Database Sovereignty (BYODB)",
                    icon: <HardDrive size={15} />,
                    content: (
                      <div className="space-y-4 pt-2">
                        <ByodbConfigCard />
                      </div>
                    ),
                  },
                  {
                    id: "erp-sync",
                    label: "ERP & Accounting Integrations",
                    icon: <Database size={15} />,
                    content: (
                      <div className="space-y-4 pt-2">
                        <ErpConnectorsCard />
                      </div>
                    ),
                  },
                  {
                    id: "payment-gateway",
                    label: "Payment Gateway (BYOPG)",
                    icon: <CreditCard size={15} />,
                    content: (
                      <div className="space-y-4 pt-2">
                        <PaymentGatewayConfigCard />
                      </div>
                    ),
                  },
                  {
                    id: "email",
                    label: "Email & Notifications",
                    icon: <Mail size={15} />,
                    content: (
                      <div className="space-y-4 pt-2">
                        <EmailConfigCard />
                      </div>
                    ),
                  },
                  {
                    id: "api-keys",
                    label: "API Keys",
                    icon: <Code2 size={15} />,
                    content: (
                      <div className="space-y-4 pt-2">
                        <ApiKeysCard />
                      </div>
                    ),
                  },
                ]
              : []),
            ...(canManageBilling
              ? [
                  {
                    id: "billing",
                    label: "Subscription & Usage",
                    icon: <CreditCard size={15} />,
                    content: (
                      <div className="space-y-4 pt-2">
                        <BillingPlanCard />
                      </div>
                    ),
                  },
                ]
              : []),
            ...(canViewAudit
              ? [
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
                                onClick={refreshAudit}
                                disabled={auditLoading}
                              >
                                <RefreshCw size={13} className={auditLoading ? "animate-spin" : ""} />
                                <span>{auditLoading ? "Refreshing…" : "Refresh Events"}</span>
                              </Button>
                            }
                          />
                          <CardContent className="p-0">
                            {auditError ? (
                              <p className="p-5 text-caption text-red-600 dark:text-red-400">{auditError}</p>
                            ) : auditLogs.length === 0 ? (
                              <p className="p-5 text-caption text-neutral-500 dark:text-zinc-400">
                                No audit events recorded yet.
                              </p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Timestamp</TableHead>
                                    <TableHead>Actor</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Entity</TableHead>
                                    <TableHead className="text-right">Result</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {auditLogs.map((log) => (
                                    <TableRow key={log.id}>
                                      <TableCell className="font-mono text-micro text-neutral-500 dark:text-zinc-400">
                                        {new Date(log.createdAt).toLocaleString("en-IN")}
                                      </TableCell>
                                      <TableCell className="text-body-sm">
                                        <span className="font-medium text-neutral-900 dark:text-zinc-100 block">
                                          {log.userId
                                            ? userNames.get(log.userId) || log.userId.slice(0, 8)
                                            : "System Engine"}
                                        </span>
                                      </TableCell>
                                      <TableCell className="font-mono text-micro font-semibold text-indigo-600 dark:text-indigo-400">
                                        {log.action}
                                      </TableCell>
                                      <TableCell className="font-mono text-micro text-neutral-500">
                                        {log.entityType}:{log.entityId.slice(0, 8)}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <span className="inline-flex items-center gap-1 text-micro font-mono px-2 py-0.5 rounded-full font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                                          <CheckCircle2 size={11} />
                                          <span>{log.result}</span>
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    ),
                  },
                ]
              : []),
            {
              id: "users",
              label: "Team & Workspace Governance",
              icon: <Users size={15} />,
              content: (
                <div className="space-y-6 pt-2">
                  <TeamManagementCard />

                  <Card level="surface">
                    <CardHeader
                      title="Persona Accounts & Role Hierarchy Reference"
                      description="Standard enterprise roles and segregation of duties rules"
                    />
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Role Title</TableHead>
                            <TableHead>Canonical Role Key</TableHead>
                            <TableHead>Authorized Scope & Segregation of Duties</TableHead>
                            <TableHead className="text-right">Policy Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {CANONICAL_ROLE_SPECS.map((spec) => (
                            <TableRow key={spec.role}>
                              <TableCell className="text-body-sm">
                                <span className="font-semibold text-neutral-900 dark:text-zinc-100">{spec.name}</span>
                              </TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center gap-1 text-micro font-mono px-2 py-0.5 rounded-full font-semibold ${spec.bgColor} ${spec.color}`}>
                                  {spec.role}
                                </span>
                              </TableCell>
                              <TableCell className="text-caption text-neutral-600 dark:text-zinc-400">
                                {spec.scope}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="inline-flex items-center gap-1 text-micro font-mono px-2 py-0.5 rounded-full font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                                  <CheckCircle2 size={11} />
                                  <span>Active Policy</span>
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card level="surface" className="border-neutral-200/80 dark:border-zinc-800 bg-neutral-50/20 dark:bg-zinc-900/10">
                    <CardHeader
                      title="Tenant Infrastructure & Data Integrity"
                      description="Enterprise security posture, database isolation, and transactional backup guarantees"
                    />
                    <CardContent className="p-5 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                          <span className="text-micro font-semibold uppercase tracking-wider text-neutral-500 dark:text-zinc-400 block mb-1">
                            Tenant Isolation
                          </span>
                          <span className="text-body-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 size={14} /> Strict JWT Scoped
                          </span>
                          <p className="text-caption text-neutral-500 dark:text-zinc-400 mt-1 leading-relaxed">
                            Row-level multi-tenant isolation automatically enforced across all repositories.
                          </p>
                        </div>
                        <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                          <span className="text-micro font-semibold uppercase tracking-wider text-neutral-500 dark:text-zinc-400 block mb-1">
                            Secret Encryption
                          </span>
                          <span className="text-body-sm font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                            <ShieldCheck size={14} /> AES-256-GCM
                          </span>
                          <p className="text-caption text-neutral-500 dark:text-zinc-400 mt-1 leading-relaxed">
                            External API keys and BYODB database connection credentials encrypted at rest.
                          </p>
                        </div>
                        <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                          <span className="text-micro font-semibold uppercase tracking-wider text-neutral-500 dark:text-zinc-400 block mb-1">
                            Audit Trail &amp; Retention
                          </span>
                          <span className="text-body-sm font-semibold text-neutral-900 dark:text-zinc-100 flex items-center gap-1.5">
                            <FileCheck2 size={14} /> Append-Only Immutable
                          </span>
                          <p className="text-caption text-neutral-500 dark:text-zinc-400 mt-1 leading-relaxed">
                            Zero deletions per AGENTS.md Rule 3. Financial audit trail permanently preserved.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ),
            },
            {
              id: "bank-accounts",
              label: "Bank Accounts",
              icon: <Landmark size={15} />,
              content: (
                <div className="pt-2">
                  <BankAccountsPage />
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
