import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { useToast } from "../../../components/ui/ToastContext";
import {
  Database,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Server,
  RefreshCw,
  Activity,
} from "lucide-react";
import { testByodbConnection, fetchIntegrationsStatus, ByodbTestResponse } from "../../../api/integrations";

export function ByodbConfigCard() {
  const { toast } = useToast();
  const [mode, setMode] = useState<"MANAGED" | "CUSTOM">("MANAGED");
  const [connectionUrl, setConnectionUrl] = useState("");
  const [showUrl, setShowUrl] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [maskedUrl, setMaskedUrl] = useState<string | undefined>();
  const [latencyMs, setLatencyMs] = useState<number>(12);
  const [lastTestResult, setLastTestResult] = useState<ByodbTestResponse | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const data = await fetchIntegrationsStatus();
      if (data?.byodb) {
        setMode(data.byodb.mode);
        setMaskedUrl(data.byodb.maskedUrl);
        if (data.byodb.latencyMs) setLatencyMs(data.byodb.latencyMs);
      }
    } catch {
      // Offline fallback
    }
  }

  async function handleTest(save: boolean) {
    if (!connectionUrl.trim() && !maskedUrl) {
      toast.warning("Connection URL Required", "Please enter a PostgreSQL connection URL to test.");
      return;
    }

    setIsTesting(true);
    try {
      const res = await testByodbConnection({
        connectionUrl: connectionUrl.trim(),
        save,
      });

      setLastTestResult(res);
      if (res.success) {
        setLatencyMs(res.latencyMs);
        toast.success(
          save ? "Database Connected & Saved" : "Connection Test Passed",
          res.message
        );
        if (save) {
          setConnectionUrl("");
          await loadStatus();
        }
      } else {
        toast.error("Database Connection Failed", res.message);
      }
    } catch (err: unknown) {
      toast.error("Test Error", err instanceof Error ? err.message : "Failed to connect to database.");
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <Card level="surface" className="border border-neutral-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
      <CardHeader
        title="Connect Your Database (BYODB) — Data Sovereignty"
        description="Store your company financial records, invoices, and audit logs directly in your own PostgreSQL instance."
        action={
          <span className="inline-flex items-center gap-1.5 text-micro font-mono px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold">
            <Activity size={12} />
            <span>Mode: {mode === "CUSTOM" ? "Dedicated PostgreSQL" : "Managed Cloud"} ({latencyMs}ms)</span>
          </span>
        }
      />
      <CardContent className="p-5 space-y-5">
        {/* Mode Selector Toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode("MANAGED")}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              mode === "MANAGED"
                ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500"
                : "border-neutral-200 dark:border-zinc-800 bg-neutral-50/40 dark:bg-zinc-800/40 hover:bg-neutral-100 dark:hover:bg-zinc-800"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Server size={16} className={mode === "MANAGED" ? "text-indigo-600 dark:text-indigo-400" : "text-neutral-500"} />
              <span className="font-semibold text-body-sm text-neutral-900 dark:text-zinc-100">
                Managed Cloud (Instant Start)
              </span>
            </div>
            <p className="text-caption text-neutral-500 dark:text-zinc-400">
              Zero configuration. Fully managed PostgreSQL cluster with automated daily encrypted backups and tenant isolation.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMode("CUSTOM")}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              mode === "CUSTOM"
                ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500"
                : "border-neutral-200 dark:border-zinc-800 bg-neutral-50/40 dark:bg-zinc-800/40 hover:bg-neutral-100 dark:hover:bg-zinc-800"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Database size={16} className={mode === "CUSTOM" ? "text-indigo-600 dark:text-indigo-400" : "text-neutral-500"} />
              <span className="font-semibold text-body-sm text-neutral-900 dark:text-zinc-100">
                Dedicated PostgreSQL / Supabase / RDS
              </span>
            </div>
            <p className="text-caption text-neutral-500 dark:text-zinc-400">
              Complete data sovereignty. All invoice, vendor, and payment records persist directly in your private database.
            </p>
          </button>
        </div>

        {mode === "CUSTOM" && (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-caption font-semibold text-neutral-800 dark:text-zinc-200">
                  PostgreSQL Connection String URL
                </label>
                {maskedUrl && (
                  <span className="text-micro font-mono text-neutral-500">
                    Active: <code className="bg-neutral-100 dark:bg-zinc-800 px-1 py-0.5 rounded">{maskedUrl}</code>
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showUrl ? "text" : "password"}
                  placeholder={
                    maskedUrl
                      ? "Enter new connection URL to update..."
                      : "postgresql://username:password@db.supabase.co:5432/postgres?sslmode=require"
                  }
                  value={connectionUrl}
                  onChange={(e) => setConnectionUrl(e.target.value)}
                  className="pr-10 font-mono text-body-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowUrl(!showUrl)}
                  className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-200"
                >
                  {showUrl ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Quick links to popular cloud databases */}
            <div className="p-3 rounded-lg bg-neutral-50 dark:bg-zinc-800/60 border border-neutral-200/80 dark:border-zinc-700/80 flex flex-wrap items-center justify-between gap-3 text-caption">
              <span className="font-semibold text-neutral-700 dark:text-zinc-300">
                Connect in 1-click from your cloud provider:
              </span>
              <div className="flex items-center gap-4 text-body-sm">
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                >
                  <span>Supabase ↗</span>
                </a>
                <a
                  href="https://console.neon.tech"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 font-semibold hover:underline"
                >
                  <span>Neon ↗</span>
                </a>
                <a
                  href="https://console.aws.amazon.com/rds"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold hover:underline"
                >
                  <span>AWS RDS ↗</span>
                </a>
              </div>
            </div>

            {/* Live Diagnostics Card */}
            {lastTestResult && (
              <div
                className={`p-3.5 rounded-lg border text-caption flex items-start gap-2.5 ${
                  lastTestResult.success
                    ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                    : "bg-red-50/60 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
                }`}
              >
                {lastTestResult.success ? (
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                )}
                <div className="space-y-1">
                  <p className="font-semibold">{lastTestResult.message}</p>
                  {lastTestResult.success && (
                    <div className="flex items-center gap-3 font-mono text-micro text-emerald-700 dark:text-emerald-400">
                      <span>Database: {lastTestResult.databaseName}</span>
                      <span>•</span>
                      <span>Server: {lastTestResult.serverVersion}</span>
                      <span>•</span>
                      <span>Latency: {lastTestResult.latencyMs}ms</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                disabled={isTesting || (!connectionUrl && !maskedUrl)}
                onClick={() => handleTest(false)}
                className="gap-1.5"
              >
                <RefreshCw size={13} className={isTesting ? "animate-spin" : ""} />
                <span>Test Connection Only</span>
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={isTesting || !connectionUrl}
                onClick={() => handleTest(true)}
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <span>Save & Connect Database</span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
