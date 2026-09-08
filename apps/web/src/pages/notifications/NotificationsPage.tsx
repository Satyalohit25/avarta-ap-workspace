import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  AlertTriangle,
  FileText,
  Wallet,
  CheckCheck,
  Bell,
  Sliders,
  Webhook,
  Mail,
  Clock,
  ShieldCheck,
  Send,
  Radio,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card, CardHeader, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Tabs } from "../../components/ui/Tabs";
import { EmptyState } from "../../components/EmptyState";
import { useToast } from "../../components/ui/ToastContext";

interface NotificationItem {
  id: string;
  type: "APPROVAL_REQUEST" | "EXCEPTION_RAISED" | "PAYMENT_SCHEDULED" | "SYSTEM";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  severity: "info" | "warning" | "success" | "critical";
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    type: "APPROVAL_REQUEST",
    title: "Executive Sign-off Required (Tier 2)",
    message: "Invoice INV-2026-1007 from Tata Steel (INR 3,54,000.00) requires Finance Manager authorization.",
    timestamp: "12 mins ago",
    read: false,
    actionUrl: "/approvals",
    actionLabel: "Review Approval",
    severity: "warning",
  },
  {
    id: "notif-2",
    type: "EXCEPTION_RAISED",
    title: "Duplicate Invoice Detected",
    message: "Invoice INV-2026-1004 from Tata Steel (INR 2,36,000.00) matches previously settled invoice INV-2026-0900.",
    timestamp: "45 mins ago",
    read: false,
    actionUrl: "/exceptions",
    actionLabel: "Triage Exception",
    severity: "critical",
  },
  {
    id: "notif-3",
    type: "EXCEPTION_RAISED",
    title: "Missing Purchase Order Threshold Exceeded",
    message: "Invoice INV-2026-1003 from Amazon Business (INR 8,600.00) exceeds standard ₹5,000 threshold without a linked PO.",
    timestamp: "2 hours ago",
    read: false,
    actionUrl: "/exceptions",
    actionLabel: "Resolve PO",
    severity: "warning",
  },
  {
    id: "notif-4",
    type: "PAYMENT_SCHEDULED",
    title: "Electronic Bank Settlement Queued",
    message: "Invoice INV-2026-1009 for BlueDart Express (INR 85,000.00) scheduled for electronic RBI transfer.",
    timestamp: "4 hours ago",
    read: true,
    actionUrl: "/payments",
    actionLabel: "View Payment Queue",
    severity: "info",
  },
  {
    id: "notif-5",
    type: "SYSTEM",
    title: "Tally Prime ERP Synchronization Completed",
    message: "Bi-directional ledger sync completed: 14 purchase vouchers synchronized with 0 reconciliation errors.",
    timestamp: "Yesterday",
    read: true,
    actionUrl: "/archive",
    actionLabel: "View Archive",
    severity: "success",
  },
];

export default function NotificationsPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "ACTION">("ALL");

  // Routing settings state
  const [slackWebhook, setSlackWebhook] = useState("https://hooks.slack.com/services/T000/B000/XXXXXX");
  const [emailDigest, setEmailDigest] = useState("manager@avarta.dev");
  const [slaEscalationHours, setSlaEscalationHours] = useState("48");
  const [savedSettings, setSavedSettings] = useState(false);

  function markAsRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  function markAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("Notifications Cleared", "All alerts have been marked as read.");
  }

  function handleSaveChannels(e: React.FormEvent) {
    e.preventDefault();
    setSavedSettings(true);
    toast.success("Routing Preferences Saved", "Notification channels and SLA triggers updated.");
    setTimeout(() => setSavedSettings(false), 3000);
  }

  function handleTestWebhook() {
    toast.success("Test Webhook Dispatched", "Payload sent to Slack channel #finance-ap-ops (HTTP 200).");
  }

  const filtered = notifications.filter((n) => {
    if (filter === "UNREAD") return !n.read;
    if (filter === "ACTION") return n.type === "APPROVAL_REQUEST" || n.type === "EXCEPTION_RAISED";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  function renderIcon(type: NotificationItem["type"], _severity: NotificationItem["severity"]) {
    switch (type) {
      case "APPROVAL_REQUEST":
        return <FileText size={18} className="text-amber-600 dark:text-amber-400" />;
      case "EXCEPTION_RAISED":
        return <AlertTriangle size={18} className="text-rose-600 dark:text-rose-400" />;
      case "PAYMENT_SCHEDULED":
        return <Wallet size={18} className="text-indigo-600 dark:text-indigo-400" />;
      default:
        return <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />;
    }
  }

  return (
    <div className="space-y-6 w-full pb-16">
      <PageHeader
        title="Notifications & Escalation Center"
        subtitle="Real-time operational alerts, SLA breach escalations, and cross-platform notification routing."
        action={
          unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-1.5 h-8 text-[11px] font-semibold">
              <CheckCheck size={14} />
              <span>Mark All as Read</span>
            </Button>
          )
        }
      />

      <Tabs
        defaultTabId="feed"
        variant="line"
        tabs={[
          {
            id: "feed",
            label: `Operational Alerts Feed (${unreadCount} Unread)`,
            icon: <Bell size={15} />,
            content: (
              <div className="space-y-4 pt-2">
                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-zinc-800/80 p-1 rounded-lg w-fit text-caption">
                  <button
                    type="button"
                    onClick={() => setFilter("ALL")}
                    className={`px-3 py-1 rounded-md transition-all font-medium cursor-pointer ${
                      filter === "ALL"
                        ? "bg-white dark:bg-zinc-700 text-neutral-900 dark:text-zinc-100 shadow-2xs font-semibold"
                        : "text-neutral-500 hover:text-neutral-900 dark:text-zinc-400"
                    }`}
                  >
                    All ({notifications.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter("UNREAD")}
                    className={`px-3 py-1 rounded-md transition-all font-medium cursor-pointer ${
                      filter === "UNREAD"
                        ? "bg-white dark:bg-zinc-700 text-neutral-900 dark:text-zinc-100 shadow-2xs font-semibold"
                        : "text-neutral-500 hover:text-neutral-900 dark:text-zinc-400"
                    }`}
                  >
                    Unread ({unreadCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter("ACTION")}
                    className={`px-3 py-1 rounded-md transition-all font-medium cursor-pointer ${
                      filter === "ACTION"
                        ? "bg-white dark:bg-zinc-700 text-rose-600 dark:text-rose-400 shadow-2xs font-semibold"
                        : "text-neutral-500 hover:text-neutral-900 dark:text-zinc-400"
                    }`}
                  >
                    Action Required
                  </button>
                </div>

                {/* Notifications List */}
                <div className="space-y-2.5">
                  {filtered.length === 0 ? (
                    <EmptyState
                      title="No notifications"
                      description={
                        filter === "UNREAD"
                          ? "You have caught up on all unread notifications."
                          : "No notifications match the selected filter."
                      }
                    />
                  ) : (
                    filtered.map((n) => (
                      <Card
                        key={n.id}
                        level="surface"
                        className={`p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
                          n.read
                            ? "border-neutral-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 opacity-85"
                            : "border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-2xs"
                        }`}
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${
                              n.severity === "critical"
                                ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50"
                                : n.severity === "warning"
                                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50"
                                : "bg-neutral-50 dark:bg-zinc-800/60 border-neutral-200 dark:border-zinc-700"
                            }`}
                          >
                            {renderIcon(n.type, n.severity)}
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-body-sm font-semibold text-neutral-900 dark:text-zinc-100">
                                {n.title}
                              </h4>
                              {!n.read && (
                                <span className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
                              )}
                            </div>
                            <p className="text-caption text-neutral-600 dark:text-zinc-300 leading-relaxed">
                              {n.message}
                            </p>
                            <span className="text-micro font-mono text-neutral-400 dark:text-zinc-500 block">
                              {n.timestamp}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {n.actionUrl && (
                            <Link to={n.actionUrl}>
                              <Button variant="outline" size="sm" className="h-7 text-[11px] font-semibold gap-1">
                                <span>{n.actionLabel ?? "View"}</span>
                                <ExternalLink size={11} />
                              </Button>
                            </Link>
                          )}
                          {!n.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(n.id)}
                              className="h-7 text-[11px] text-neutral-500 hover:text-neutral-900 dark:hover:text-zinc-200"
                            >
                              Mark Read
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            ),
          },
          {
            id: "channels",
            label: "Channel Routing & SLA Rules",
            icon: <Sliders size={15} />,
            content: (
              <form onSubmit={handleSaveChannels} className="space-y-5 pt-2">
                <Card level="surface">
                  <CardHeader
                    title="Cross-Platform Notification Channels"
                    description="Route critical AP approvals, exception spikes, and bank execution confirmations to external channels"
                  />
                  <CardContent className="p-5 space-y-4">
                    <div className="space-y-3">
                      <div>
                        <Input
                          label="Slack / Microsoft Teams Webhook URL"
                          value={slackWebhook}
                          onChange={(e) => setSlackWebhook(e.target.value)}
                          leftIcon={<Webhook size={14} className="text-neutral-400" />}
                          helpText="Dispatches high-urgency notifications directly to your finance operations channel."
                        />
                        <div className="mt-1.5 flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleTestWebhook}
                            className="h-7 text-[11px] font-medium gap-1"
                          >
                            <Send size={11} />
                            <span>Send Test Webhook</span>
                          </Button>
                        </div>
                      </div>

                      <Input
                        label="Finance Manager Daily Digest Email"
                        value={emailDigest}
                        onChange={(e) => setEmailDigest(e.target.value)}
                        leftIcon={<Mail size={14} className="text-neutral-400" />}
                        helpText="Summary sent daily at 08:30 AM with maturing payments and unassigned exceptions."
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card level="surface">
                  <CardHeader
                    title="Automated SLA Breach Escalation"
                    description="Configure automated escalation triggers for invoices waiting approval or resolution"
                  />
                  <CardContent className="p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-label text-neutral-700 dark:text-zinc-300 block mb-1">
                          Approval Turnaround SLA Limit
                        </label>
                        <select
                          value={slaEscalationHours}
                          onChange={(e) => setSlaEscalationHours(e.target.value)}
                          className="w-full h-9 px-3 rounded-md border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-body-sm text-neutral-900 dark:text-zinc-100"
                        >
                          <option value="24">24 Hours (Fast Track)</option>
                          <option value="48">48 Hours (Standard Corporate Policy)</option>
                          <option value="72">72 Hours (Extended)</option>
                        </select>
                        <p className="text-micro text-neutral-500 mt-1">
                          If an approver does not act within {slaEscalationHours} hours, the invoice escalates to their backup director.
                        </p>
                      </div>

                      <div>
                        <label className="text-label text-neutral-700 dark:text-zinc-300 block mb-1">
                          Escalation Action
                        </label>
                        <div className="h-9 flex items-center px-3 rounded-md border border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-800/40 text-body-sm font-medium text-neutral-900 dark:text-zinc-100">
                          Reassign to Arjun Approver (Finance Director)
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button type="submit">Save Channel Routing</Button>
                    </div>
                  </CardContent>
                </Card>
              </form>
            ),
          },
        ]}
      />
    </div>
  );
}
