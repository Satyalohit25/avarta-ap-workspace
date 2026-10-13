import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { useToast } from "../../../components/ui/ToastContext";
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Settings,
  Layers,
} from "lucide-react";
import {
  testErpConnection,
  triggerErpSync,
  fetchIntegrationsStatus,
  ErpTestResponse,
} from "../../../api/integrations";

interface ErpConnectorMeta {
  id: string;
  name: string;
  category: string;
  description: string;
  status: "CONNECTED" | "STANDBY" | "ERROR";
  lastSync: string;
}

const DEFAULT_CONNECTORS: ErpConnectorMeta[] = [
  {
    id: "tally",
    name: "Tally Prime ERP",
    category: "Accounting & GST Vouchers",
    status: "CONNECTED",
    lastSync: "Today, 10:12 AM",
    description: "Bi-directional XML sync of purchase vouchers, GST ledgers (CGST/SGST/IGST), and payment status.",
  },
  {
    id: "quickbooks",
    name: "QuickBooks Online",
    category: "Cloud SME Financials",
    status: "STANDBY",
    lastSync: "3 days ago",
    description: "Automated Bill generation, vendor master linkage, and bank feed clearing references via Intuit API.",
  },
  {
    id: "xero",
    name: "Xero Accounting",
    category: "Cloud Accounting",
    status: "STANDBY",
    lastSync: "Never connected",
    description: "Direct sync of Accounts Payable (ACCPAY) bills, invoice attachments, and tracking categories.",
  },
  {
    id: "csv",
    name: "Universal Double-Entry CSV",
    category: "Audit Batch Ledger",
    status: "CONNECTED",
    lastSync: "Always active",
    description: "Standard double-entry General Ledger batch exports compatible with SAP, Oracle, and any ERP.",
  },
];

export function ErpConnectorsCard() {
  const { toast } = useToast();
  const [connectors, setConnectors] = useState<ErpConnectorMeta[]>(DEFAULT_CONNECTORS);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [configModalId, setConfigModalId] = useState<string | null>(null);

  // Modal form states
  const [tallyGatewayUrl, setTallyGatewayUrl] = useState("http://localhost:9000");
  const [tallyCompanyName, setTallyCompanyName] = useState("Acme Manufacturing Pvt Ltd");
  const [qboRealmId, setQboRealmId] = useState("");
  const [qboAccessToken, setQboAccessToken] = useState("");
  const [xeroTenantId, setXeroTenantId] = useState("");
  const [xeroAccessToken, setXeroAccessToken] = useState("");

  const [testResult, setTestResult] = useState<{ id: string; res: ErpTestResponse } | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const data = await fetchIntegrationsStatus();
      if (data?.erp) {
        setConnectors((prev) =>
          prev.map((c) => {
            if (c.id === data.erp.provider.toLowerCase()) {
              return {
                ...c,
                status: data.erp.status === "CONNECTED" ? "CONNECTED" : "STANDBY",
                lastSync: data.erp.lastSyncAt ? new Date(data.erp.lastSyncAt).toLocaleTimeString() : c.lastSync,
              };
            }
            return c;
          })
        );
      }
    } catch {
      // Offline fallback
    }
  }

  async function handleTest(providerId: string, save = false) {
    setTestingId(providerId);
    let config: Record<string, string> = {};

    if (providerId === "tally") {
      config = { gatewayUrl: tallyGatewayUrl, companyName: tallyCompanyName };
    } else if (providerId === "quickbooks") {
      config = { realmId: qboRealmId, accessToken: qboAccessToken };
    } else if (providerId === "xero") {
      config = { tenantId: xeroTenantId, accessToken: xeroAccessToken };
    }

    try {
      const res = await testErpConnection({
        provider: providerId,
        config,
        save,
      });

      setTestResult({ id: providerId, res });
      if (res.success) {
        toast.success(
          save ? "ERP Connector Configured" : "Connection Verified",
          res.message
        );
        if (save) {
          setConfigModalId(null);
          await loadStatus();
        }
      } else {
        toast.error("ERP Connection Failed", res.message);
      }
    } catch (err: unknown) {
      toast.error("ERP Verification Error", err instanceof Error ? err.message : "Failed to verify ERP connection.");
    } finally {
      setTestingId(null);
    }
  }

  async function handleSyncNow() {
    setIsSyncing(true);
    try {
      const res = await triggerErpSync();
      toast.success(
        "ERP Batch Synchronized",
        `Dispatched ${res.syncedCount} approved invoice records via ${res.format} ledger batch (${res.batchReference}).`
      );
      await loadStatus();
    } catch (err: unknown) {
      toast.error("ERP Sync Failed", err instanceof Error ? err.message : "Failed to dispatch invoices to ERP.");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <Card level="surface" className="border border-neutral-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
      <CardHeader
        title="Connect Your ERP & Accounting Systems"
        description="Bi-directional ledger synchronization. Avarta posts vouchers and bills to your existing accounting system without replacing it."
        action={
          <Button
            size="sm"
            variant="primary"
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
          >
            <Send size={13} className={isSyncing ? "animate-spin" : ""} />
            <span>{isSyncing ? "Dispatching Ledger..." : "Sync Approved Invoices Now"}</span>
          </Button>
        }
      />
      <CardContent className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {connectors.map((erp) => (
            <div
              key={erp.id}
              className="p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3 flex flex-col justify-between shadow-2xs hover:border-neutral-300 dark:hover:border-zinc-700 transition-colors"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database size={16} className="text-indigo-600 dark:text-indigo-400" />
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
                <p className="text-caption text-neutral-500 dark:text-zinc-400 leading-relaxed">
                  {erp.description}
                </p>
              </div>

              {testResult && testResult.id === erp.id && (
                <div
                  className={`p-2.5 rounded-md border text-micro font-mono flex items-start gap-1.5 ${
                    testResult.res.success
                      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200"
                      : "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 border-red-200"
                  }`}
                >
                  {testResult.res.success ? (
                    <CheckCircle2 size={13} className="shrink-0 mt-0.5 text-emerald-600" />
                  ) : (
                    <AlertCircle size={13} className="shrink-0 mt-0.5 text-red-600" />
                  )}
                  <span>{testResult.res.message}</span>
                </div>
              )}

              <div className="pt-2 border-t border-neutral-100 dark:border-zinc-800 flex items-center justify-between text-micro font-mono text-neutral-500">
                <span>Last Sync: {erp.lastSync}</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTest(erp.id, false)}
                    disabled={testingId === erp.id}
                    className="h-7 text-micro font-medium gap-1"
                  >
                    <RefreshCw size={11} className={testingId === erp.id ? "animate-spin" : ""} />
                    <span>Ping</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfigModalId(erp.id)}
                    className="h-7 text-micro font-medium gap-1"
                  >
                    <Settings size={11} />
                    <span>Configure</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Configuration Modal */}
        {configModalId && (
          <div className="fixed inset-0 z-50 bg-neutral-950/60 dark:bg-zinc-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-xl space-y-4">
              <div className="border-b border-neutral-100 dark:border-zinc-800 pb-3">
                <h3 className="text-h3 text-neutral-900 dark:text-zinc-100 font-semibold flex items-center gap-2">
                  <Layers size={18} className="text-indigo-600" />
                  <span>Configure {connectors.find((c) => c.id === configModalId)?.name}</span>
                </h3>
                <p className="text-caption text-neutral-500 dark:text-zinc-400 mt-1">
                  Specify connection endpoints, credentials, and ledger parameters.
                </p>
              </div>

              {configModalId === "tally" && (
                <div className="space-y-3">
                  <Input
                    label="Tally XML Gateway URL"
                    value={tallyGatewayUrl}
                    onChange={(e) => setTallyGatewayUrl(e.target.value)}
                    placeholder="http://localhost:9000 or http://192.168.1.100:9000"
                  />
                  <Input
                    label="Tally Company Name"
                    value={tallyCompanyName}
                    onChange={(e) => setTallyCompanyName(e.target.value)}
                    placeholder="e.g. Acme Manufacturing Pvt Ltd"
                  />
                  <div className="p-2.5 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 text-caption">
                    Ensure Tally Prime is running and ODBC/XML Server is active in <strong>F1: Help ➔ Settings ➔ Connectivity</strong>.
                  </div>
                </div>
              )}

              {configModalId === "quickbooks" && (
                <div className="space-y-3">
                  <Input
                    label="Intuit Realm ID (Company ID)"
                    value={qboRealmId}
                    onChange={(e) => setQboRealmId(e.target.value)}
                    placeholder="e.g. 913035412345678"
                  />
                  <Input
                    label="OAuth 2.0 Access Token"
                    type="password"
                    value={qboAccessToken}
                    onChange={(e) => setQboAccessToken(e.target.value)}
                    placeholder="Paste Bearer Token or connect via Intuit App"
                  />
                </div>
              )}

              {configModalId === "xero" && (
                <div className="space-y-3">
                  <Input
                    label="Xero Tenant ID"
                    value={xeroTenantId}
                    onChange={(e) => setXeroTenantId(e.target.value)}
                    placeholder="e.g. e4b0f987-1234-5678-abcd"
                  />
                  <Input
                    label="OAuth 2.0 Access Token"
                    type="password"
                    value={xeroAccessToken}
                    onChange={(e) => setXeroAccessToken(e.target.value)}
                    placeholder="Paste Xero Bearer Token"
                  />
                </div>
              )}

              {configModalId === "csv" && (
                <div className="p-3 rounded bg-neutral-50 dark:bg-zinc-800 text-caption text-neutral-600 dark:text-zinc-300 space-y-1">
                  <p className="font-semibold text-neutral-900 dark:text-zinc-100">Standard Double-Entry Format Active</p>
                  <p>All approved and paid invoices are automatically prepared as balanced double-entry General Ledger rows (Operating Expense Debit, Input Tax Debit, Vendor Liability Credit).</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-zinc-800">
                <Button variant="outline" onClick={() => setConfigModalId(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleTest(configModalId, true)}
                  disabled={testingId === configModalId}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {testingId === configModalId ? "Verifying..." : "Save & Verify Connection"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
