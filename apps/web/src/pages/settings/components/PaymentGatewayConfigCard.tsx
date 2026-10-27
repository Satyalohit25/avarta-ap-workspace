import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { useToast } from "../../../components/ui/ToastContext";
import {
  CreditCard,
  Building,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Activity,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  testPaymentGatewayConnection,
  fetchIntegrationsStatus,
  PaymentGatewayTestResponse,
} from "../../../api/integrations";

type GatewayProvider = "RAZORPAYX" | "CASHFREE" | "STRIPE" | "MANUAL_BANK_TRANSFER";

interface GatewayOption {
  id: GatewayProvider;
  name: string;
  badge: string;
  tagline: string;
  supportedCurrencies: string[];
  keyLabel: string;
  secretLabel: string;
}

const GATEWAY_OPTIONS: GatewayOption[] = [
  {
    id: "RAZORPAYX",
    name: "RazorpayX Corporate Payouts",
    badge: "Direct API",
    tagline: "Automated vendor disbursements via NEFT, RTGS, IMPS, and UPI",
    supportedCurrencies: ["INR"],
    keyLabel: "Key ID (rzp_live_* / rzp_test_*)",
    secretLabel: "Key Secret",
  },
  {
    id: "CASHFREE",
    name: "Cashfree Payouts",
    badge: "Instant Payouts",
    tagline: "Batch vendor payouts with sub-second bank settlement confirmation",
    supportedCurrencies: ["INR", "USD"],
    keyLabel: "Client ID (appId)",
    secretLabel: "Client Secret",
  },
  {
    id: "STRIPE",
    name: "Stripe Connect / Treasury",
    badge: "Global Treasury",
    tagline: "Cross-border vendor payouts in USD, EUR, GBP with automated FX",
    supportedCurrencies: ["USD", "EUR", "GBP", "CAD", "SGD"],
    keyLabel: "Publishable Key (pk_*)",
    secretLabel: "Secret Key (sk_live_* / sk_test_*)",
  },
  {
    id: "MANUAL_BANK_TRANSFER",
    name: "Direct Corporate Banking",
    badge: "Maker-Checker",
    tagline: "Disbursements via your bank portal with verified UTR & advice match",
    supportedCurrencies: ["All Currencies"],
    keyLabel: "Primary Corporate Account Number",
    secretLabel: "Bank IFSC / SWIFT / Routing Code",
  },
];

export function PaymentGatewayConfigCard() {
  const { toast } = useToast();
  const [selectedProvider, setSelectedProvider] = useState<GatewayProvider>("RAZORPAYX");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string>("CONNECTED");
  const [accountName, setAccountName] = useState<string | undefined>();
  const [maskedKey, setMaskedKey] = useState<string | undefined>();
  const [lastTestedAt, setLastTestedAt] = useState<string | undefined>();
  const [testResult, setTestResult] = useState<PaymentGatewayTestResponse | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const data = await fetchIntegrationsStatus();
      if (data?.paymentGateway) {
        setSelectedProvider((data.paymentGateway.provider as GatewayProvider) || "RAZORPAYX");
        setStatus(data.paymentGateway.status);
        setAccountName(data.paymentGateway.accountName);
        setMaskedKey(data.paymentGateway.maskedKey);
        setLastTestedAt(data.paymentGateway.lastTestedAt);
      }
    } catch {
      // Offline fallback
    }
  }

  async function handleTest(save: boolean) {
    if (selectedProvider !== "MANUAL_BANK_TRANSFER" && !apiSecret && !maskedKey) {
      toast.warning("Credentials Required", "Please enter your gateway API key and secret.");
      return;
    }

    if (save) setIsSaving(true);
    else setIsTesting(true);

    try {
      const res = await testPaymentGatewayConnection({
        provider: selectedProvider,
        config: {
          apiKey: apiKey.trim(),
          apiSecret: apiSecret.trim(),
          accountNumber: accountNumber.trim(),
        },
        save,
      });

      setTestResult(res);
      if (res.success) {
        setStatus("CONNECTED");
        if (res.accountName) setAccountName(res.accountName);
        setLastTestedAt(new Date().toISOString());
        if (save) {
          toast.success("Payment Gateway Saved", `Connected ${selectedProvider} for automated vendor payouts.`);
          setApiSecret("");
          loadStatus();
        } else {
          toast.success("Connection Verified", res.message);
        }
      } else {
        setStatus("ERROR");
        toast.error("Gateway Test Failed", res.message);
      }
    } catch (err: unknown) {
      setStatus("ERROR");
      const msg = err instanceof Error ? err.message : "Failed to connect to payment gateway.";
      toast.error("Gateway Error", msg);
    } finally {
      setIsTesting(false);
      setIsSaving(false);
    }
  }

  const currentOption = GATEWAY_OPTIONS.find((o) => o.id === selectedProvider) || GATEWAY_OPTIONS[0];

  return (
    <Card level="surface" className="border-neutral-200/80 dark:border-zinc-800 shadow-sm">
      <CardHeader
        title="Connect Your Payment Gateway (BYOPG)"
        description="Choose your preferred payment gateway for vendor payouts, direct bank remittances, and automated UTR reconciliation."
        action={
          <div className="flex items-center gap-2">
            <span
              title={lastTestedAt ? `Verified: ${new Date(lastTestedAt).toLocaleString()}` : "Gateway status"}
              className={`inline-flex items-center gap-1.5 text-micro font-mono font-semibold px-2.5 py-1 rounded-full ${
                status === "CONNECTED"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                  : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
              }`}
            >
              {status === "CONNECTED" ? (
                <>
                  <CheckCircle2 size={12} />
                  <span>Gateway Active</span>
                </>
              ) : (
                <>
                  <AlertCircle size={12} />
                  <span>Gateway Error</span>
                </>
              )}
            </span>
          </div>
        }
      />
      <CardContent className="space-y-6 pt-2">
        {/* Gateway Selection Tabs */}
        <div>
          <h4 className="block text-body-sm font-semibold text-neutral-900 dark:text-zinc-100 mb-2">
            Select Payment Provider (Bring Your Own Gateway)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {GATEWAY_OPTIONS.map((option) => {
              const isSelected = selectedProvider === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setSelectedProvider(option.id);
                    setTestResult(null);
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-colors duration-100 relative ${
                    isSelected
                      ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-600 dark:ring-indigo-500"
                      : "border-neutral-200 dark:border-zinc-800 hover:border-neutral-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-body-sm text-neutral-900 dark:text-zinc-100">
                      {option.name.split(" ")[0]}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400">
                      {option.badge}
                    </span>
                  </div>
                  <p className="text-micro text-neutral-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {option.tagline}
                  </p>
                  <div className="mt-2.5 flex items-center gap-1 text-[11px] font-mono text-neutral-400 dark:text-zinc-500">
                    <CreditCard size={11} />
                    <span>{option.supportedCurrencies.join(", ")}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Credentials Form */}
        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-zinc-950/60 border border-neutral-200/80 dark:border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building size={16} className="text-indigo-600 dark:text-indigo-400" />
              <h4 className="font-semibold text-body-sm text-neutral-900 dark:text-zinc-100">
                {currentOption.name} Credentials
              </h4>
            </div>
            {accountName && (
              <span className="text-micro font-mono text-neutral-500 dark:text-zinc-400">
                Account: <strong className="text-neutral-700 dark:text-zinc-300">{accountName}</strong>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={currentOption.keyLabel}
              type="text"
              placeholder={maskedKey || "Enter API identifier"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="font-mono text-body-sm"
            />

            <div className="space-y-1.5">
              <label htmlFor="gateway-secret-input" className="block text-caption font-medium text-neutral-700 dark:text-zinc-300">
                {currentOption.secretLabel}
              </label>
              <div className="relative">
                <input
                  id="gateway-secret-input"
                  type={showSecret ? "text" : "password"}
                  placeholder={maskedKey ? "•••••••••••••••• (Encrypted at rest)" : "Enter secret key"}
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  className="w-full h-9 px-3 pr-10 rounded-lg border border-neutral-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-body-sm text-neutral-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-300"
                  tabIndex={-1}
                >
                  {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>

          {selectedProvider === "RAZORPAYX" && (
            <div>
              <Input
                label="Registered Payout Account Number (Optional)"
                type="text"
                placeholder="e.g. 2323230001234567"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="font-mono text-body-sm"
              />
            </div>
          )}

          {/* Test Feedback Result */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border text-caption flex items-start gap-2.5 ${
                testResult.success
                  ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300"
                  : "bg-red-50/60 dark:bg-red-950/30 border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-300"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <p className="font-semibold">{testResult.message}</p>
                {testResult.availableBalance !== undefined && (
                  <p className="text-micro font-mono text-neutral-600 dark:text-zinc-400">
                    Live Balance: {testResult.balanceCurrency} {testResult.availableBalance.toLocaleString()} • Latency: {testResult.latencyMs}ms
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-micro text-neutral-500 dark:text-zinc-400 font-mono">
              <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span>AES-256 GCM encrypted at rest per Doc 08 & Doc 11 standards</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleTest(false)}
                disabled={isTesting || isSaving}
              >
                {isTesting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin mr-1.5" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <Activity size={13} className="mr-1.5" />
                    <span>Test Gateway</span>
                  </>
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleTest(true)}
                disabled={isTesting || isSaving}
              >
                {isSaving ? (
                  <>
                    <RefreshCw size={13} className="animate-spin mr-1.5" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Zap size={13} className="mr-1.5" />
                    <span>Save Configuration</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
