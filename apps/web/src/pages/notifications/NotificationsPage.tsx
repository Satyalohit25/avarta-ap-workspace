import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  Send,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card, CardHeader, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Tabs } from "../../components/ui/Tabs";
import { EmptyState } from "../../components/EmptyState";
import { useToast } from "../../components/ui/ToastContext";
import { useAuth } from "../../app/AuthContext";
import {
  fetchNotificationPreferences,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationPreferences,
  NotificationRecord,
  sendTestNotificationEmail,
  sendTestSlackWebhook,
  updateNotificationPreferences,
} from "../../api/notifications";

type Severity = "info" | "warning" | "success" | "critical";

function severityFor(type: string): Severity {
  switch (type) {
    case "APPROVAL_REQUEST":
      return "warning";
    case "EXCEPTION_RAISED":
      return "critical";
    case "PAYMENT_SCHEDULED":
    case "PAYMENT_PAID":
      return "info";
    default:
      return "success";
  }
}

function actionLabelFor(type: string): string {
  switch (type) {
    case "APPROVAL_REQUEST":
      return "Review Invoice";
    case "EXCEPTION_RAISED":
      return "Open Exceptions";
    case "PAYMENT_SCHEDULED":
    case "PAYMENT_PAID":
      return "Open Payments";
    default:
      return "View";
  }
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  useDocumentTitle(
    "Notifications",
    "Operational activity alerts, invoice status transitions, and exception assignments.",
  );
  const { user } = useAuth();
  const { toast } = useToast();

  const role = user?.role?.toUpperCase();
  const canManageRouting = role === "ADMINISTRATOR" || role === "FINANCE_MANAGER";

  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "ACTION">("ALL");
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);

  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  const [slackWebhook, setSlackWebhook] = useState("");
  const [emailDigest, setEmailDigest] = useState("");
  const [slaEscalationHours, setSlaEscalationHours] = useState("48");
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [testRecipient, setTestRecipient] = useState("");

  const loadFeed = useCallback(async () => {
    setFeedLoading(true);
    setFeedError(null);
    try {
      const result = await fetchNotifications({ pageSize: 100 });
      setNotifications(result.data);
    } catch (err) {
      setFeedError(err instanceof Error ? err.message : "Failed to load notifications.");
    } finally {
      setFeedLoading(false);
    }
  }, []);

  const loadPreferences = useCallback(async () => {
    setPreferencesLoading(true);
    setPreferencesError(null);
    try {
      const data = await fetchNotificationPreferences();
      setPreferences(data);
      setEmailDigest(data.digestEmail || user?.email || "");
      setSlaEscalationHours(String(data.slaEscalationHours));
      setEmailEnabled(data.emailEnabled);
      setSlackEnabled(data.slackEnabled);
      setSlackWebhook("");
    } catch (err) {
      setPreferencesError(
        err instanceof Error ? err.message : "Failed to load notification routing."
      );
    } finally {
      setPreferencesLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    if (canManageRouting) loadPreferences();
  }, [canManageRouting, loadPreferences]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === "UNREAD") return !n.read;
      if (filter === "ACTION")
        return n.type === "APPROVAL_REQUEST" || n.type === "EXCEPTION_RAISED";
      return true;
    });
  }, [notifications, filter]);

  async function markAsRead(id: string) {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, status: "READ" } : n))
      );
    } catch (err) {
      toast.error(
        "Could Not Update Notification",
        err instanceof Error ? err.message : "The notification could not be marked as read."
      );
    }
  }

  async function markAllAsRead() {
    try {
      const result = await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, status: "READ" }))
      );
      toast.success(
        "Notifications Cleared",
        `${result.updated} alert${result.updated === 1 ? "" : "s"} marked as read.`
      );
    } catch (err) {
      toast.error(
        "Could Not Clear Notifications",
        err instanceof Error ? err.message : "The notifications could not be updated."
      );
    }
  }

  async function handleSaveChannels(e: React.FormEvent) {
    e.preventDefault();
    setSavingPreferences(true);
    try {
      const payload: Parameters<typeof updateNotificationPreferences>[0] = {
        digestEmail: emailDigest.trim(),
        slaEscalationHours: Number(slaEscalationHours),
        emailEnabled,
        slackEnabled,
      };
      // An empty field means "keep the stored webhook"; only send when the
      // administrator typed a replacement.
      if (slackWebhook.trim()) payload.slackWebhookUrl = slackWebhook.trim();

      const updated = await updateNotificationPreferences(payload);
      setPreferences(updated);
      setSlackWebhook("");
      toast.success(
        "Routing Preferences Saved",
        "Notification channels and SLA triggers updated."
      );
    } catch (err) {
      toast.error(
        "Save Failed",
        err instanceof Error ? err.message : "Routing preferences could not be saved."
      );
    } finally {
      setSavingPreferences(false);
    }
  }

  async function handleTestWebhook() {
    if (!slackWebhook.trim() && !preferences?.slackWebhookUrlMasked) {
      toast.error("No Webhook Configured", "Save a Slack or Teams webhook URL first.");
      return;
    }
    setTestingWebhook(true);
    try {
      const result = await sendTestSlackWebhook();
      if (result.sent) toast.success("Test Webhook Delivered", result.message);
      else toast.error("Test Webhook Failed", result.message);
    } catch (err) {
      toast.error(
        "Test Webhook Failed",
        err instanceof Error ? err.message : "The webhook could not be reached."
      );
    } finally {
      setTestingWebhook(false);
    }
  }

  async function handleTestEmail() {
    const recipient = testRecipient.trim() || emailDigest.trim() || user?.email || "";
    if (!recipient) {
      toast.error("Recipient Required", "Enter an email address to receive the test message.");
      return;
    }
    setTestingEmail(true);
    try {
      const result = await sendTestNotificationEmail(recipient);
      if (result.sent) toast.success("Test Email Delivered", result.message);
      else toast.error("Test Email Failed", result.message);
    } catch (err) {
      toast.error(
        "Test Email Failed",
        err instanceof Error ? err.message : "The email could not be delivered."
      );
    } finally {
      setTestingEmail(false);
    }
  }

  function renderIcon(type: string, severity: Severity) {
    switch (type) {
      case "APPROVAL_REQUEST":
        return <FileText size={18} className="text-amber-600 dark:text-amber-400" />;
      case "EXCEPTION_RAISED":
        return <AlertTriangle size={18} className="text-rose-600 dark:text-rose-400" />;
      case "PAYMENT_SCHEDULED":
      case "PAYMENT_PAID":
        return <Wallet size={18} className="text-indigo-600 dark:text-indigo-400" />;
      default:
        return severity === "critical" ? (
          <AlertTriangle size={18} className="text-rose-600 dark:text-rose-400" />
        ) : (
          <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
        );
    }
  }

  const channelsTab = canManageRouting ? (
    <form onSubmit={handleSaveChannels} className="space-y-5 pt-2">
      <Card level="surface">
        <CardHeader
          title="Cross-Platform Notification Channels"
          description="Route critical AP approvals, exception spikes, and payment confirmations to external channels"
        />
        <CardContent className="p-5 space-y-4">
          {preferencesLoading ? (
            <p className="text-caption text-neutral-500 dark:text-zinc-400">
              Loading routing configuration…
            </p>
          ) : preferencesError ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-caption text-red-600 dark:text-red-400">{preferencesError}</p>
              <Button type="button" variant="outline" size="sm" onClick={loadPreferences}>
                Retry
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div>
                  <Input
                    label="Slack / Microsoft Teams Webhook URL"
                    value={slackWebhook}
                    onChange={(e) => setSlackWebhook(e.target.value)}
                    placeholder={
                      preferences?.slackWebhookUrlMasked
                        ? `Saved: ${preferences.slackWebhookUrlMasked} — leave blank to keep`
                        : "https://hooks.slack.com/services/…"
                    }
                    leftIcon={<Webhook size={14} className="text-neutral-400" />}
                    helpText="Dispatches high-urgency notifications directly to your finance operations channel. URLs are encrypted at rest."
                  />
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-caption text-neutral-600 dark:text-zinc-300">
                      <input
                        type="checkbox"
                        checked={slackEnabled}
                        onChange={(e) => setSlackEnabled(e.target.checked)}
                        className="rounded border-neutral-300"
                      />
                      Send Slack / Teams alerts
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleTestWebhook}
                      disabled={testingWebhook}
                      className="h-7 text-[11px] font-medium gap-1"
                    >
                      <Send size={11} />
                      <span>{testingWebhook ? "Sending…" : "Send Test Webhook"}</span>
                    </Button>
                  </div>
                </div>

                <div>
                  <Input
                    label="Finance Manager Daily Digest Email"
                    type="email"
                    value={emailDigest}
                    onChange={(e) => setEmailDigest(e.target.value)}
                    leftIcon={<Mail size={14} className="text-neutral-400" />}
                    helpText="Summary sent daily at 08:30 AM with maturing payments and unassigned exceptions. Delivered through your configured email connector."
                  />
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-caption text-neutral-600 dark:text-zinc-300">
                      <input
                        type="checkbox"
                        checked={emailEnabled}
                        onChange={(e) => setEmailEnabled(e.target.checked)}
                        className="rounded border-neutral-300"
                      />
                      Send email notifications
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleTestEmail}
                      disabled={testingEmail}
                      className="h-7 text-[11px] font-medium gap-1"
                    >
                      <Send size={11} />
                      <span>{testingEmail ? "Sending…" : "Send Test Email"}</span>
                    </Button>
                  </div>
                  <div className="mt-2">
                    <Input
                      label="Test Recipient (optional)"
                      type="email"
                      value={testRecipient}
                      onChange={(e) => setTestRecipient(e.target.value)}
                      placeholder={emailDigest || user?.email || "you@company.com"}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
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
              <Select
                id="sla-escalation-hours"
                name="slaEscalationHours"
                label="Approval Turnaround SLA Limit"
                value={slaEscalationHours}
                onValueChange={setSlaEscalationHours}
                options={[
                  { value: "24", label: "24 Hours (Fast Track)" },
                  { value: "48", label: "48 Hours (Standard Corporate Policy)" },
                  { value: "72", label: "72 Hours (Extended)" },
                  { value: "168", label: "168 Hours (Weekly)" },
                ]}
              />
              <p className="text-micro text-neutral-500 mt-1.5">
                If an approver does not act within {slaEscalationHours} hours, the invoice
                escalates to their backup director.
              </p>
            </div>

            <div>
              <label className="text-label text-neutral-700 dark:text-zinc-300 block mb-1">
                Escalation Action
              </label>
              <div className="h-9 flex items-center px-3 rounded-md border border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-800/40 text-body-sm font-medium text-neutral-900 dark:text-zinc-100">
                Reassign to Approver
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="submit" disabled={savingPreferences || preferencesLoading}>
              {savingPreferences ? "Saving…" : "Save Channel Routing"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  ) : (
    <Card level="surface" className="mt-2">
      <CardContent className="p-6">
        <p className="text-caption text-neutral-500 dark:text-zinc-400">
          Notification routing is managed by an Administrator or Finance Manager.
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 w-full pb-16">
      <PageHeader
        title="Notifications & Escalation Center"
        subtitle="Real-time operational alerts, SLA breach escalations, and cross-platform notification routing."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadFeed}
              disabled={feedLoading}
              className="gap-1.5 h-8 text-[11px] font-semibold"
            >
              <RefreshCw size={13} className={feedLoading ? "animate-spin" : ""} />
              <span>{feedLoading ? "Refreshing…" : "Refresh"}</span>
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="gap-1.5 h-8 text-[11px] font-semibold"
              >
                <CheckCheck size={14} />
                <span>Mark All as Read</span>
              </Button>
            )}
          </div>
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
                <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-zinc-800/80 p-1 rounded-lg w-fit text-caption">
                  <button
                    type="button"
                    onClick={() => setFilter("ALL")}
                    className={`px-3 py-1 rounded-md transition-colors duration-100 font-medium cursor-pointer ${
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
                    className={`px-3 py-1 rounded-md transition-colors duration-100 font-medium cursor-pointer ${
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
                    className={`px-3 py-1 rounded-md transition-colors duration-100 font-medium cursor-pointer ${
                      filter === "ACTION"
                        ? "bg-white dark:bg-zinc-700 text-rose-600 dark:text-rose-400 shadow-2xs font-semibold"
                        : "text-neutral-500 hover:text-neutral-900 dark:text-zinc-400"
                    }`}
                  >
                    Action Required
                  </button>
                </div>

                <div className="space-y-2.5">
                  {feedLoading ? (
                    <Card level="surface" className="p-6">
                      <p className="text-caption text-neutral-500 dark:text-zinc-400">
                        Loading notifications…
                      </p>
                    </Card>
                  ) : feedError ? (
                    <Card level="surface" className="p-6 flex items-center justify-between gap-3">
                      <p className="text-caption text-red-600 dark:text-red-400">{feedError}</p>
                      <Button variant="outline" size="sm" onClick={loadFeed}>
                        Retry
                      </Button>
                    </Card>
                  ) : filtered.length === 0 ? (
                    <EmptyState
                      title="No notifications"
                      description={
                        filter === "UNREAD"
                          ? "You have caught up on all unread notifications."
                          : "No notifications match the selected filter."
                      }
                    />
                  ) : (
                    filtered.map((n) => {
                      const severity = severityFor(n.type);
                      return (
                        <Card
                          key={n.id}
                          level="surface"
                          className={`p-4 transition-colors duration-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
                            n.read
                              ? "border-neutral-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 opacity-85"
                              : "border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-2xs"
                          }`}
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${
                                severity === "critical"
                                  ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50"
                                  : severity === "warning"
                                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50"
                                    : "bg-neutral-50 dark:bg-zinc-800/60 border-neutral-200 dark:border-zinc-700"
                              }`}
                            >
                              {renderIcon(n.type, severity)}
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
                                {formatTimestamp(n.createdAt)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {n.actionUrl && (
                              <Link to={n.actionUrl}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[11px] font-semibold gap-1"
                                >
                                  <span>{actionLabelFor(n.type)}</span>
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
                      );
                    })
                  )}
                </div>
              </div>
            ),
          },
          {
            id: "channels",
            label: "Channel Routing & SLA Rules",
            icon: <Sliders size={15} />,
            content: channelsTab,
          },
        ]}
      />
    </div>
  );
}
