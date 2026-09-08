import { useState, FormEvent } from "react";
import { useAuth } from "../../app/AuthContext";
import {
  User,
  Plus,
  ShieldOff,
  ShieldCheck,
  Key,
  Lock,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Camera,
  Upload,
  Trash2,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { PageHeader } from "../../components/layout/PageHeader";
import { Dialog } from "../../components/ui/Dialog";
import { useToast } from "../../components/ui/ToastContext";

interface ApiToken {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: string;
  lastUsed: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  const [fullName, setFullName] = useState(user?.name ?? "Finance User");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [tokens, setTokens] = useState<ApiToken[]>([
    {
      id: "tok-1",
      name: "CLI Integration Token",
      tokenPrefix: "avarta_live_99a8...",
      createdAt: "12 Jan 2026",
      lastUsed: "2 hours ago",
    },
    {
      id: "tok-2",
      name: "Local Script Automation",
      tokenPrefix: "avarta_live_44d1...",
      createdAt: "05 Feb 2026",
      lastUsed: "Yesterday",
    },
  ]);
  const [newTokenName, setNewTokenName] = useState("");
  const [showNewTokenModal, setShowNewTokenModal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    return localStorage.getItem("avarta_user_avatar") || null;
  });

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File Too Large", "Please select an avatar image under 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const res = event.target?.result as string;
      setAvatarUrl(res);
      localStorage.setItem("avarta_user_avatar", res);
      window.dispatchEvent(new Event("avatar_updated"));
      toast.success("Display Picture Updated", "Your profile photo has been synchronized.");
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveAvatar() {
    setAvatarUrl(null);
    localStorage.removeItem("avarta_user_avatar");
    window.dispatchEvent(new Event("avatar_updated"));
    toast.success("Display Picture Removed", "Reverted to standard account initials.");
  }

  function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    setSaved(true);
    toast.success("Profile Updated", "Your personal details have been saved.");
    setTimeout(() => setSaved(false), 3000);
  }

  function handleCreateToken(e: FormEvent) {
    e.preventDefault();
    if (!newTokenName.trim()) return;
    const newToken: ApiToken = {
      id: `tok-${Date.now()}`,
      name: newTokenName.trim(),
      tokenPrefix: `avarta_live_${Math.random().toString(36).substring(2, 6)}...`,
      createdAt: "Just now",
      lastUsed: "Never",
    };
    setTokens([newToken, ...tokens]);
    setNewTokenName("");
    setShowNewTokenModal(false);
    toast.success("API Token Generated", `New token "${newToken.name}" is now active.`);
  }

  function handleRevokeToken(id: string, name: string) {
    setTokens((prev) => prev.filter((t) => t.id !== id));
    toast.success("API Token Revoked", `Token "${name}" has been permanently revoked.`);
  }

  function handleCopyPrefix(prefix: string) {
    navigator.clipboard.writeText(prefix);
    setCopiedToken(prefix);
    toast.success("Token Identifier Copied", prefix);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  // Get human-readable role capabilities
  const roleCapabilities: Record<string, string[]> = {
    ADMINISTRATOR: [
      "Full Tenant Administration",
      "Configure Financial Thresholds & Matching Tolerances",
      "User Access Management",
      "ERP Connector Configuration",
    ],
    FINANCE_MANAGER: [
      "Approve Invoices up to ₹5,00,000",
      "Authorize & Disburse Bank Settlement Batches",
      "Resolve Line Item & PO Variances",
      "Supplier Master Record Management",
    ],
    FINANCE_EXECUTIVE: [
      "Inbound Invoice Intake & OCR Review",
      "3-Way Matching Line Item Inspection",
      "Exception Flagging & Supplier Communication",
    ],
    APPROVER: [
      "Review & Sign-Off Assigned Invoices",
      "Reject Discrepant Purchases with Comments",
      "Inspect 3-Way Reconciliation Evidence",
    ],
  };

  const userRole = user?.role || "FINANCE_MANAGER";
  const currentCapabilities = roleCapabilities[userRole] || roleCapabilities["FINANCE_MANAGER"];

  return (
    <div className="space-y-6 w-full pb-16">
      <PageHeader
        title="User Profile & Security"
        subtitle="Manage personal identity, corporate authentication, session health, and developer API credentials."
      />

      {saved && (
        <Alert type="success" title="Profile Updated">
          Your personal profile details have been saved.
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── Left Column: Personal Identity & Role Privileges (7 Cols) ── */}
        <div className="lg:col-span-7 space-y-5">
          {/* User Information Card */}
          <Card level="surface">
            <CardHeader
              title="Personal Details"
              description="Your authenticated account identity in Avarta AP Workspace."
            />
            <CardContent className="p-5">
              <form onSubmit={handleSaveProfile} className="space-y-5">
                {/* User Display Picture Section */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-neutral-50/60 dark:bg-zinc-850/50">
                  <div className="relative group shrink-0">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-indigo-500/40 dark:border-indigo-500/50 shadow-sm bg-neutral-200 dark:bg-zinc-700 flex items-center justify-center">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center text-xl font-bold font-mono tracking-tight">
                          {fullName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .substring(0, 2)
                            .toUpperCase() || "AV"}
                        </div>
                      )}
                    </div>
                    <label
                      htmlFor="avatar-upload-input"
                      className="absolute bottom-0 right-0 p-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer transition-transform hover:scale-105"
                      title="Upload new display picture"
                    >
                      <Camera size={13} />
                      <input
                        id="avatar-upload-input"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="flex-1 text-center sm:text-left space-y-1.5 min-w-0">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <h4 className="text-body font-semibold text-neutral-900 dark:text-zinc-100">
                        Profile Display Picture
                      </h4>
                      <span className="text-micro font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                        Active Avatar
                      </span>
                    </div>
                    <p className="text-caption text-neutral-500 dark:text-zinc-400">
                      Upload a square JPG, PNG or WEBP image. Visible on approvals, audit trail signatures, and header navigation.
                    </p>
                    <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                      <label
                        htmlFor="avatar-upload-input"
                        className="px-2.5 py-1 text-caption font-medium rounded-md border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-750 text-indigo-600 dark:text-indigo-400 cursor-pointer transition-colors shadow-2xs inline-flex items-center gap-1.5"
                      >
                        <Upload size={12} />
                        <span>Change Photo</span>
                      </label>
                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="px-2.5 py-1 text-caption font-medium rounded-md border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition-colors shadow-2xs inline-flex items-center gap-1.5"
                        >
                          <Trash2 size={12} />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    leftIcon={<User size={15} />}
                  />
                  <Input
                    label="Corporate Email Address"
                    value={user?.email ?? "manager@avarta.dev"}
                    disabled
                    helpText="Managed by corporate SAML / SSO directory."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-label text-neutral-700 dark:text-zinc-300 block mb-1">
                      Assigned System Role
                    </label>
                    <div className="h-9 flex items-center px-3 rounded-md border border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-800/40 text-body-sm font-semibold text-indigo-700 dark:text-indigo-300">
                      {user?.role?.replace(/_/g, " ") ?? "Finance Manager"}
                    </div>
                  </div>

                  <div>
                    <label className="text-label text-neutral-700 dark:text-zinc-300 block mb-1">
                      Tenant Organization
                    </label>
                    <div className="h-9 flex items-center px-3 rounded-md border border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-800/40 text-body-sm font-medium text-neutral-900 dark:text-zinc-100">
                      Acme Manufacturing Pvt Ltd (ORG-ACME-IN)
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit">Save Changes</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Role Capabilities & Authorizations */}
          <Card level="surface">
            <CardHeader
              title="Role Authorization & Capabilities"
              description={`Statutory permissions granted under the ${userRole.replace(/_/g, " ")} policy`}
            />
            <CardContent className="p-5 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentCapabilities.map((cap, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-neutral-100 dark:border-zinc-800 bg-neutral-50/50 dark:bg-zinc-900 flex items-center gap-2 text-caption text-neutral-800 dark:text-zinc-200"
                  >
                    <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{cap}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right Column: Security Health & API Credentials (5 Cols) ── */}
        <div className="lg:col-span-5 space-y-5">
          {/* Security & Active Session Health */}
          <Card level="surface">
            <CardHeader
              title="Security & Session Health"
              description="Corporate authentication standards and active connection profile"
            />
            <CardContent className="p-5 space-y-3.5">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="text-body-sm font-medium text-neutral-900 dark:text-zinc-100">
                    SSO / MFA Status
                  </span>
                </div>
                <span className="text-micro font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Enforced (SAML 2.0)
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <Laptop size={16} className="text-neutral-500" />
                  <span className="text-body-sm font-medium text-neutral-900 dark:text-zinc-100">
                    Active Session IP
                  </span>
                </div>
                <span className="font-mono text-micro text-neutral-600 dark:text-zinc-400">
                  192.168.1.42 (Pune, IN)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Lock size={16} className="text-neutral-500" />
                  <span className="text-body-sm font-medium text-neutral-900 dark:text-zinc-100">
                    Session Timeout
                  </span>
                </div>
                <span className="font-mono text-micro text-neutral-600 dark:text-zinc-400">
                  8 Hours (Idle 30m)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Personal API Tokens */}
          <Card level="surface">
            <CardHeader
              title="Personal API Tokens"
              description="Developer credentials for automated CLI and webhook integrations"
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowNewTokenModal(true)}
                  className="gap-1 h-7 text-[11px]"
                >
                  <Plus size={12} />
                  <span>New Token</span>
                </Button>
              }
            />
            <CardContent className="p-4 space-y-2.5">
              {tokens.length === 0 ? (
                <p className="text-caption text-neutral-400 text-center py-4">
                  No active API tokens generated yet.
                </p>
              ) : (
                tokens.map((tok) => (
                  <div
                    key={tok.id}
                    className="p-3 rounded-lg border border-neutral-200/80 dark:border-zinc-800 bg-neutral-50/40 dark:bg-zinc-900/60 flex items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <span className="font-medium text-body-sm text-neutral-900 dark:text-zinc-100 block truncate">
                        {tok.name}
                      </span>
                      <div className="flex items-center gap-1.5 text-micro font-mono text-neutral-500">
                        <span>{tok.tokenPrefix}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyPrefix(tok.tokenPrefix)}
                          className="hover:text-neutral-800 dark:hover:text-zinc-200 cursor-pointer"
                          title="Copy prefix"
                        >
                          {copiedToken === tok.tokenPrefix ? (
                            <Check size={11} className="text-emerald-600" />
                          ) : (
                            <Copy size={11} />
                          )}
                        </button>
                        <span>•</span>
                        <span>Used {tok.lastUsed}</span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRevokeToken(tok.id, tok.name)}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 h-7 px-2 text-[11px]"
                    >
                      Revoke
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Generate API Token Modal */}
      <Dialog
        isOpen={showNewTokenModal}
        onClose={() => setShowNewTokenModal(false)}
        title="Generate New API Token"
        description="Creates a personal bearer token scoped to your user permissions."
      >
        <form onSubmit={handleCreateToken} className="space-y-4 pt-2">
          <Input
            label="Token Description / Application Name"
            placeholder="e.g., Python Sync Script or CI/CD Runner"
            value={newTokenName}
            onChange={(e) => setNewTokenName(e.target.value)}
            required
            autoFocus
          />

          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-caption text-amber-800 dark:text-amber-300">
            <strong>Security Notice:</strong> Tokens grant full programmatic access within your role limits. Keep your generated secrets secure.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowNewTokenModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Generate Token</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
