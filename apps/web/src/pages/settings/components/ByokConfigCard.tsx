import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { useToast } from "../../../components/ui/ToastContext";
import {
  KeyRound,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { testByokKey, fetchIntegrationsStatus, ByokTestResponse } from "../../../api/integrations";

export function ByokConfigCard() {
  const toast = useToast();
  const [provider, setProvider] = useState<"GEMINI" | "OPENAI" | "TEXTRACT">("GEMINI");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [activeStatus, setActiveStatus] = useState<string>("TRIAL");
  const [maskedKey, setMaskedKey] = useState<string | undefined>();
  const [models, setModels] = useState<string[]>([]);
  const [lastTestResult, setLastTestResult] = useState<ByokTestResponse | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const data = await fetchIntegrationsStatus();
      if (data?.byok) {
        setActiveStatus(data.byok.provider);
        setMaskedKey(data.byok.maskedKey);
        setModels(data.byok.modelsAvailable || []);
        if (data.byok.provider === "GEMINI" || data.byok.provider === "OPENAI" || data.byok.provider === "TEXTRACT") {
          setProvider(data.byok.provider as "GEMINI" | "OPENAI" | "TEXTRACT");
        }
      }
    } catch {
      // In development or offline, keep default trial status
    }
  }

  async function handleTest(save: boolean) {
    if (!apiKey.trim() && !maskedKey) {
      toast.warning("API Key Required", "Please enter an API key to test.");
      return;
    }

    setIsTesting(true);
    try {
      const res = await testByokKey({
        provider,
        apiKey: apiKey.trim(),
        save,
      });

      setLastTestResult(res);
      if (res.success) {
        toast.success(
          save ? "BYOK Key Saved & Verified" : "Key Test Succeeded",
          res.message
        );
        if (save) {
          setApiKey("");
          await loadStatus();
        }
      } else {
        toast.error("Validation Failed", res.message);
      }
    } catch (err: unknown) {
      toast.error("Verification Error", err instanceof Error ? err.message : "Failed to verify API key.");
    } finally {
      setIsTesting(false);
    }
  }

  const getProviderLink = () => {
    switch (provider) {
      case "GEMINI":
        return {
          title: "Get Free Google Gemini Key",
          url: "https://aistudio.google.com/app/apikey",
          desc: "Free tier available. Supports high-speed Multimodal Flash OCR & extraction.",
        };
      case "OPENAI":
        return {
          title: "Get OpenAI Platform Key",
          url: "https://platform.openai.com/api-keys",
          desc: "Supports GPT-4o Vision for complex line-item and table extraction.",
        };
      case "TEXTRACT":
        return {
          title: "AWS Textract Console",
          url: "https://console.aws.amazon.com/textract",
          desc: "Amazon AnalyzeExpense OCR engine with bounding boxes.",
        };
    }
  };

  const linkInfo = getProviderLink();

  return (
    <Card level="surface" className="border border-neutral-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
      <CardHeader
        title="Bring Your Own Key (BYOK) — AI & OCR Engine"
        description="Connect your private AI accounts with zero markup on model tokens and guaranteed data privacy."
        action={
          <span className="inline-flex items-center gap-1.5 text-micro font-mono px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold">
            <Sparkles size={12} />
            <span>Active: {activeStatus}</span>
          </span>
        }
      />
      <CardContent className="p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-caption font-semibold text-neutral-800 dark:text-zinc-200">
              AI / OCR Provider
            </label>
            <Select
              value={provider}
              onChange={(e) => setProvider(e.target.value as "GEMINI" | "OPENAI" | "TEXTRACT")}
              options={[
                { value: "GEMINI", label: "Google Gemini (Flash Multimodal - Recommended)" },
                { value: "OPENAI", label: "OpenAI (GPT-4o Vision)" },
                { value: "TEXTRACT", label: "AWS Textract (Analyze Expense)" },
              ]}
            />
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-caption font-semibold text-neutral-800 dark:text-zinc-200">
                API Secret Key
              </label>
              {maskedKey && (
                <span className="text-micro font-mono text-neutral-500">
                  Current: <code className="bg-neutral-100 dark:bg-zinc-800 px-1 py-0.5 rounded">{maskedKey}</code>
                </span>
              )}
            </div>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                placeholder={maskedKey ? "Enter new key to replace existing..." : "Paste your API key here (e.g. AIzaSy... or sk-proj-...)"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10 font-mono text-body-sm"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-200"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Deep link helper */}
        <div className="p-3 rounded-lg bg-neutral-50 dark:bg-zinc-800/60 border border-neutral-200/80 dark:border-zinc-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-caption">
          <div className="space-y-0.5">
            <div className="font-semibold text-neutral-900 dark:text-zinc-100 flex items-center gap-1.5">
              <KeyRound size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span>Need an API key?</span>
            </div>
            <p className="text-neutral-500 dark:text-zinc-400">{linkInfo.desc}</p>
          </div>
          <a
            href={linkInfo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
          >
            <span>{linkInfo.title}</span>
            <ExternalLink size={13} />
          </a>
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
              {lastTestResult.modelsAvailable && lastTestResult.modelsAvailable.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1 font-mono text-micro">
                  <span>Available Models:</span>
                  {lastTestResult.modelsAvailable.map((m) => (
                    <span key={m} className="px-1.5 py-0.5 rounded bg-white/80 dark:bg-zinc-800 border border-emerald-300 dark:border-emerald-700">
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-zinc-800">
          <div className="text-micro font-mono text-neutral-500">
            {models.length > 0 && <span>Active Models: {models.join(", ")}</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isTesting || (!apiKey && !maskedKey)}
              onClick={() => handleTest(false)}
              className="gap-1.5"
            >
              <RefreshCw size={13} className={isTesting ? "animate-spin" : ""} />
              <span>Test Connection Only</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={isTesting || !apiKey}
              onClick={() => handleTest(true)}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <span>Save & Activate BYOK</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
