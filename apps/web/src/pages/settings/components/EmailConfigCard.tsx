import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { useToast } from "../../../components/ui/ToastContext";
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Send,
  Unplug,
  ShieldCheck,
} from "lucide-react";
import {
  disconnectIntegration,
  EmailProvider,
  fetchIntegrationsStatus,
  IntegrationsStatusData,
  testEmailConnection,
} from "../../../api/integrations";

interface EmailFormState {
  provider: EmailProvider;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  smtpHost: string;
  smtpPort: string;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  apiKey: string;
  domain: string;
}

const EMPTY_FORM: EmailFormState = {
  provider: "SMTP",
  fromName: "",
  fromEmail: "",
  replyTo: "",
  smtpHost: "",
  smtpPort: "587",
  smtpSecure: false,
  smtpUser: "",
  smtpPassword: "",
  apiKey: "",
  domain: "",
};

export function EmailConfigCard() {
  const { toast } = useToast();
  const [form, setForm] = useState<EmailFormState>(EMPTY_FORM);
  const [status, setStatus] = useState<IntegrationsStatusData["email"] | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [testRecipient, setTestRecipient] = useState("");
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string; latencyMs: number } | null>(null);

  async function loadStatus() {
    try {
      const data = await fetchIntegrationsStatus();
      if (data?.email) {
        setStatus(data.email);
        setForm((prev) => ({
          ...prev,
          provider: (data.email?.provider as EmailProvider) || "SMTP",
          fromName: data.email?.fromName || "",
          fromEmail: data.email?.fromEmail || "",
          replyTo: data.email?.replyTo || "",
        }));
      }
    } catch {
      // The settings page already surfaces auth/network errors elsewhere.
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  function update<K extends keyof EmailFormState>(key: K, value: EmailFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleTest(save: boolean) {
    setIsTesting(true);
    try {
      const config: Record<string, unknown> = {
        fromName: form.fromName,
        fromEmail: form.fromEmail,
        replyTo: form.replyTo || undefined,
      };
      if (form.provider === "SMTP") {
        config.smtpHost = form.smtpHost;
        config.smtpPort = Number(form.smtpPort);
        config.smtpSecure = form.smtpSecure;
        config.smtpUser = form.smtpUser;
        config.smtpPassword = form.smtpPassword;
      } else {
        config.apiKey = form.apiKey;
        if (form.provider === "MAILGUN") config.domain = form.domain;
      }

      const result = await testEmailConnection({
        provider: form.provider,
        config,
        save,
        testRecipient: testRecipient.trim() || undefined,
      });

      setLastResult(result);
      if (result.success) {
        toast.success(
          save ? "Email Connector Saved" : "Email Test Passed",
          result.message
        );
        if (save) {
          setForm((prev) => ({
            ...prev,
            smtpPassword: "",
            apiKey: "",
          }));
          await loadStatus();
        }
      } else {
        toast.error("Email Connector Failed", result.message);
      }
    } catch (err) {
      toast.error(
        "Email Test Error",
        err instanceof Error ? err.message : "Could not reach the email provider."
      );
    } finally {
      setIsTesting(false);
    }
  }

  async function handleDisconnect() {
    if (!status || status.provider === "NONE") return;
    const confirmed = window.confirm(
      "Disconnect this email connector? Transactional email will stop until a new connector is configured."
    );
    if (!confirmed) return;
    setIsDisconnecting(true);
    try {
      await disconnectIntegration("EMAIL", status.provider);
      toast.success("Email connector disconnected.");
      setStatus(null);
      setLastResult(null);
    } catch (err) {
      toast.error(
        "Disconnect Failed",
        err instanceof Error ? err.message : "Could not disconnect the email connector."
      );
    } finally {
      setIsDisconnecting(false);
    }
  }

  return (
    <Card level="surface">
      <CardHeader
        title="Transactional Email Connector (BYO Email)"
        description="Send invitations, password resets, and notification digests through your own SMTP server or email API provider."
        action={
          <span
            className={`inline-flex items-center gap-1.5 text-micro font-mono px-2.5 py-1 rounded-full font-semibold border ${
              status?.status === "CONNECTED"
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                : "bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-300 border-neutral-200 dark:border-zinc-700"
            }`}
          >
            {status?.status === "CONNECTED" ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            <span>
              {status?.status === "CONNECTED"
                ? `${status.provider} connected`
                : "Not configured"}
            </span>
          </span>
        }
      />
      <CardContent className="p-5 space-y-5">
        {status?.status === "CONNECTED" && (
          <div className="p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 text-caption flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck size={14} />
                <span>
                  Active sender: {status.fromName ? `${status.fromName} ` : ""}
                  &lt;{status.fromEmail}&gt;
                </span>
              </p>
              <p className="font-mono text-micro text-emerald-700 dark:text-emerald-400">
                Provider: {status.provider}
                {status.maskedKey ? ` · Credential ${status.maskedKey}` : ""}
                {status.replyTo ? ` · Reply-To ${status.replyTo}` : ""}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="gap-1.5 shrink-0"
            >
              <Unplug size={13} />
              <span>{isDisconnecting ? "Disconnecting…" : "Disconnect"}</span>
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Email Provider"
            value={form.provider}
            onChange={(e) => update("provider", e.target.value as EmailProvider)}
            options={[
              { value: "SMTP", label: "SMTP (your mail server)" },
              { value: "RESEND", label: "Resend" },
              { value: "SENDGRID", label: "SendGrid" },
              { value: "POSTMARK", label: "Postmark" },
              { value: "MAILGUN", label: "Mailgun" },
            ]}
          />
          <Input
            label="Sender Display Name"
            value={form.fromName}
            onChange={(e) => update("fromName", e.target.value)}
            placeholder="Avarta Finance"
          />
          <Input
            label="Sender Email Address"
            type="email"
            value={form.fromEmail}
            onChange={(e) => update("fromEmail", e.target.value)}
            placeholder="ap@yourcompany.com"
            required
          />
          <Input
            label="Reply-To (optional)"
            type="email"
            value={form.replyTo}
            onChange={(e) => update("replyTo", e.target.value)}
            placeholder="finance@yourcompany.com"
          />
        </div>

        {form.provider === "SMTP" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="SMTP Host"
              value={form.smtpHost}
              onChange={(e) => update("smtpHost", e.target.value)}
              placeholder="smtp.yourcompany.com"
            />
            <Input
              label="SMTP Port"
              type="number"
              value={form.smtpPort}
              onChange={(e) => update("smtpPort", e.target.value)}
              placeholder="587"
            />
            <Input
              label="SMTP Username"
              value={form.smtpUser}
              onChange={(e) => update("smtpUser", e.target.value)}
              autoComplete="off"
            />
            <Input
              label="SMTP Password"
              type="password"
              value={form.smtpPassword}
              onChange={(e) => update("smtpPassword", e.target.value)}
              placeholder={status?.maskedKey ? "Leave blank to keep the saved password" : ""}
              autoComplete="new-password"
            />
            <label className="flex items-center gap-2 text-caption text-neutral-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={form.smtpSecure}
                onChange={(e) => update("smtpSecure", e.target.checked)}
                className="rounded border-neutral-300"
              />
              Use implicit TLS (port 465)
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={`${form.provider} API Key`}
              type="password"
              value={form.apiKey}
              onChange={(e) => update("apiKey", e.target.value)}
              placeholder={status?.maskedKey ? "Leave blank to keep the saved key" : ""}
              autoComplete="new-password"
            />
            {form.provider === "MAILGUN" && (
              <Input
                label="Mailgun Sending Domain"
                value={form.domain}
                onChange={(e) => update("domain", e.target.value)}
                placeholder="mg.yourcompany.com"
              />
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-neutral-100 dark:border-zinc-800 pt-4">
          <Input
            label="Send Test To (optional)"
            type="email"
            value={testRecipient}
            onChange={(e) => setTestRecipient(e.target.value)}
            placeholder={form.fromEmail || "you@yourcompany.com"}
            helpText="SMTP verifies credentials; API providers send a real test message."
          />
        </div>

        {lastResult && (
          <div
            className={`p-3.5 rounded-lg border text-caption flex items-start gap-2.5 ${
              lastResult.success
                ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                : "bg-red-50/60 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
            }`}
          >
            {lastResult.success ? (
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <p className="font-semibold">{lastResult.message}</p>
              <p className="font-mono text-micro opacity-80">
                Latency: {lastResult.latencyMs}ms
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-zinc-800">
          <Button
            type="button"
            variant="outline"
            disabled={isTesting}
            onClick={() => handleTest(false)}
            className="gap-1.5 w-full sm:w-auto"
          >
            <Send size={13} />
            <span>Test Only</span>
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={isTesting}
            onClick={() => handleTest(true)}
            className="gap-1.5 w-full sm:w-auto"
          >
            <Mail size={13} />
            <span>{isTesting ? "Testing…" : "Save & Connect Email"}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
