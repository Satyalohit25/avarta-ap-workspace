import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Badge } from "../../../components/ui/Badge";
import { useToast } from "../../../components/ui/ToastContext";
import { KeyRound, Plus, Copy, Trash2, ShieldCheck, AlertTriangle } from "lucide-react";
import {
  ApiKeyRecord,
  createApiKey,
  fetchApiKeys,
  revokeApiKey,
} from "../../../api/apiKeys";

export function ApiKeysCard() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  async function loadKeys() {
    setLoading(true);
    setLoadError(null);
    try {
      setKeys(await fetchApiKeys());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load API keys.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadKeys();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const created = await createApiKey({ name: newKeyName.trim() });
      setRevealedKey(created.key || null);
      setNewKeyName("");
      setIsCreating(false);
      toast.success("API Key Created", "Copy it now — it is shown only once.");
      await loadKeys();
    } catch (err) {
      toast.error(
        "API Key Creation Failed",
        err instanceof Error ? err.message : "Could not create the API key."
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(key: ApiKeyRecord) {
    const confirmed = window.confirm(
      `Revoke API key "${key.name}"? Applications using it will lose access immediately.`
    );
    if (!confirmed) return;
    try {
      await revokeApiKey(key.id);
      toast.info("API key revoked.");
      await loadKeys();
    } catch (err) {
      toast.error(
        "Revocation Failed",
        err instanceof Error ? err.message : "Could not revoke the API key."
      );
    }
  }

  async function copyKey(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("API key copied to clipboard.");
    } catch {
      toast.error("Could not copy the key. Select and copy it manually.");
    }
  }

  return (
    <Card level="surface">
      <CardHeader
        title="Workspace API Access"
        description="Create scoped API keys for invoice ingestion, supplier sync, and read-only ledger access. Keys inherit the creating administrator's role."
        action={
          <Button
            type="button"
            size="sm"
            onClick={() => setIsCreating(true)}
            className="gap-1.5"
          >
            <Plus size={14} />
            <span>New API Key</span>
          </Button>
        }
      />
      <CardContent className="p-5 space-y-5">
        <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-zinc-800/50 border border-neutral-200 dark:border-zinc-700 text-caption flex items-start gap-2.5">
          <ShieldCheck size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-neutral-800 dark:text-zinc-200">
              Send requests with <code className="font-mono bg-white dark:bg-zinc-900 px-1 rounded">Authorization: Bearer apk_…</code>
            </p>
            <p className="text-neutral-500 dark:text-zinc-400">
              API keys cannot change workspace settings, billing, integrations, or credentials. Only the SHA-256 hash is stored server-side.
            </p>
          </div>
        </div>

        {revealedKey && (
          <div className="p-4 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-2">
            <div className="flex items-center gap-2 text-body-sm font-semibold text-amber-900 dark:text-amber-200">
              <AlertTriangle size={15} />
              <span>Copy this key now — it will never be shown again</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <code className="flex-1 px-3 py-2 rounded-md bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-900/60 font-mono text-micro break-all">
                {revealedKey}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyKey(revealedKey)}
                className="gap-1.5 shrink-0"
              >
                <Copy size={13} />
                <span>Copy</span>
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setRevealedKey(null)}
              className="text-micro text-amber-700 dark:text-amber-300 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {isCreating && (
          <form
            onSubmit={handleCreate}
            className="p-4 rounded-lg border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3"
          >
            <Input
              label="Key Name"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g. ERP Nightly Sync"
              required
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={creating}>
                {creating ? "Creating…" : "Create Key"}
              </Button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-caption text-neutral-500 dark:text-zinc-400">Loading API keys…</p>
        ) : loadError ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-caption text-red-600 dark:text-red-400">{loadError}</p>
            <Button type="button" variant="outline" size="sm" onClick={loadKeys}>
              Retry
            </Button>
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <KeyRound size={28} className="mx-auto text-neutral-300 dark:text-zinc-600" />
            <p className="text-caption text-neutral-500 dark:text-zinc-400">
              No API keys yet. Create one to connect your ERP, scripts, or intake pipeline.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-zinc-800 text-caption font-medium text-neutral-500 dark:text-zinc-400">
                  <th className="py-2.5">Name</th>
                  <th className="py-2.5">Key Prefix</th>
                  <th className="py-2.5">Scopes</th>
                  <th className="py-2.5">Last Used</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-zinc-800 text-caption">
                {keys.map((key) => (
                  <tr key={key.id}>
                    <td className="py-3 font-medium text-neutral-900 dark:text-zinc-100">{key.name}</td>
                    <td className="py-3 font-mono text-neutral-600 dark:text-zinc-300">
                      {key.keyPrefix}…
                    </td>
                    <td className="py-3 font-mono text-micro text-neutral-500 dark:text-zinc-400">
                      {key.scopes.join(", ")}
                    </td>
                    <td className="py-3 font-mono text-micro text-neutral-500 dark:text-zinc-400">
                      {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString("en-IN") : "Never"}
                    </td>
                    <td className="py-3">
                      <Badge
                        variant={key.status === "ACTIVE" ? "success" : "neutral"}
                        className="text-[10px]"
                      >
                        {key.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      {key.status === "ACTIVE" ? (
                        <button
                          type="button"
                          onClick={() => handleRevoke(key)}
                          className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline font-medium text-micro"
                        >
                          <Trash2 size={12} />
                          <span>Revoke</span>
                        </button>
                      ) : (
                        <span className="font-mono text-micro text-neutral-400 dark:text-zinc-500">
                          Revoked
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
