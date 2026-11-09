import { useEffect, useState } from "react";
import { Users, UserPlus, Shield, UserX, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { useToast } from "../../../components/ui/ToastContext";
import { useAuth } from "../../../app/AuthContext";
import {
  deactivateTeamMember,
  fetchTeamMembers,
  inviteTeamMember,
  TeamMemberRecord,
  TeamRole,
} from "../../../api/auth";
import { fetchTenantUsage } from "../../../api/billing";

const ROLE_LABELS: Record<string, string> = {
  ADMINISTRATOR: "Administrator",
  FINANCE_MANAGER: "Finance Manager",
  FINANCE_EXECUTIVE: "Finance Executive",
  APPROVER: "Approver",
  READ_ONLY: "Read Only",
};

export function TeamManagementCard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [team, setTeam] = useState<TeamMemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<TeamRole>("FINANCE_EXECUTIVE");
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [seats, setSeats] = useState<{ used: number; limit: number | null } | null>(null);

  const canInvite =
    user?.role?.toUpperCase() === "ADMINISTRATOR" ||
    user?.role?.toUpperCase() === "FINANCE_MANAGER";
  const canDeactivate = user?.role?.toUpperCase() === "ADMINISTRATOR";

  const activeSeats = team.filter((m) => m.status === "ACTIVE").length;

  async function loadTeam() {
    setLoading(true);
    setLoadError(null);
    try {
      const members = await fetchTeamMembers();
      setTeam(members);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load team members.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeam();
    fetchTenantUsage()
      .then((usage) =>
        setSeats({ used: usage.usage.seatsUsed, limit: usage.usage.seatsLimit })
      )
      .catch(() => setSeats(null));
  }, []);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName) return;

    if (seats?.limit !== null && seats?.limit !== undefined && seats.used >= seats.limit) {
      toast({
        type: "error",
        title: `Team seat limit reached (${seats.used}/${seats.limit}). Upgrade your plan to add more members.`,
      });
      return;
    }

    setInviting(true);
    try {
      const result = await inviteTeamMember({
        email: newEmail.trim().toLowerCase(),
        fullName: newName.trim(),
        role: newRole,
      });

      setInviteLink(result.inviteUrl || null);
      setNewEmail("");
      setNewName("");
      setIsInviteOpen(false);

      toast({
        type: result.emailSent ? "success" : "warning",
        title: result.emailSent
          ? `Invitation email sent to ${result.email}.`
          : "Invitation created — email connector not configured.",
        description: result.emailSent ? undefined : result.message,
      });

      await loadTeam();
    } catch (err) {
      toast({
        type: "error",
        title: "Invitation Failed",
        description: err instanceof Error ? err.message : "Could not create the invitation.",
      });
    } finally {
      setInviting(false);
    }
  };

  const handleDeactivate = async (userId: string, name: string) => {
    if (!canDeactivate) return;
    const confirmed = window.confirm(
      `Deactivate ${name}? Their historical audit actions are preserved and the account is never deleted.`
    );
    if (!confirmed) return;

    try {
      await deactivateTeamMember(userId);
      setTeam((prev) =>
        prev.map((m) => (m.id === userId ? { ...m, status: "DEACTIVATED" } : m))
      );
      toast({
        type: "info",
        title: `${name}'s account has been deactivated. Historical audit actions remain preserved.`,
      });
    } catch (err) {
      toast({
        type: "error",
        title: "Deactivation Failed",
        description: err instanceof Error ? err.message : "Could not deactivate the member.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-md bg-white dark:bg-zinc-900 border border-neutral-200/80 dark:border-zinc-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
              <Users size={22} />
            </div>
            <div>
              <h3 className="text-body font-semibold text-neutral-900 dark:text-zinc-100">
                Team Members & Role Access Control
              </h3>
              <p className="text-caption text-neutral-500 dark:text-zinc-400">
                Role-based segregation of duties enforcing maker-checker and dual sign-off principles.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-caption font-mono text-neutral-500 dark:text-zinc-400">
              Seats:{" "}
              <strong className="text-neutral-900 dark:text-zinc-100">
                {activeSeats}
                {seats?.limit != null ? ` / ${seats.limit}` : " / Unlimited"}
              </strong>
            </span>
            {canInvite && (
              <Button
                type="button"
                variant="primary"
                onClick={() => setIsInviteOpen(true)}
                className="text-caption font-semibold flex items-center gap-1.5"
              >
                <UserPlus size={15} />
                <span>Invite Teammate</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {inviteLink && (
        <div className="p-4 rounded-md bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-2">
          <div className="flex items-center gap-2 text-body-sm font-semibold text-amber-900 dark:text-amber-200">
            <CheckCircle2 size={16} />
            <span>Share this single-use invitation link securely</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <code className="flex-1 px-3 py-2 rounded-md bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-900/60 font-mono text-micro break-all">
              {inviteLink}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(inviteLink);
                  toast.success("Invitation link copied to clipboard.");
                } catch {
                  toast.error("Could not copy the link. Select and copy it manually.");
                }
              }}
            >
              <Copy size={13} />
              <span>Copy</span>
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setInviteLink(null)}
            className="text-micro text-amber-700 dark:text-amber-300 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {isInviteOpen && (
        <form
          onSubmit={handleInviteSubmit}
          className="p-5 rounded-md bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/80 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-indigo-200/50 dark:border-indigo-800/50 pb-3">
            <span className="font-semibold text-body-sm text-neutral-900 dark:text-zinc-100">
              Invite New Team Member
            </span>
            <button
              type="button"
              onClick={() => setIsInviteOpen(false)}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-300 text-caption font-medium"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label htmlFor="team-member-name" className="text-micro font-medium text-neutral-600 dark:text-zinc-300">Full Name</label>
              <input
                id="team-member-name"
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Rohini Sen"
                className="w-full px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-caption text-neutral-900 dark:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="team-member-email" className="text-micro font-medium text-neutral-600 dark:text-zinc-300">Corporate Email</label>
              <input
                id="team-member-email"
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="rohini@company.com"
                className="w-full px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-caption text-neutral-900 dark:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="team-member-role" className="text-micro font-medium text-neutral-600 dark:text-zinc-300">Assigned Role</label>
              <select
                id="team-member-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as TeamRole)}
                className="w-full px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-caption text-neutral-900 dark:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <option value="FINANCE_EXECUTIVE">Finance Executive (Ingestion & Match)</option>
                <option value="APPROVER">Approver (Invoice Sign-off)</option>
                <option value="FINANCE_MANAGER">Finance Manager (Threshold Overrides)</option>
                <option value="ADMINISTRATOR">Administrator (Full Control)</option>
                <option value="READ_ONLY">Read Only (Auditor)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={inviting}
              className="text-caption font-semibold"
            >
              {inviting ? "Sending Invite..." : "Send Invitation"}
            </Button>
          </div>
        </form>
      )}

      <div className="p-6 rounded-md bg-white dark:bg-zinc-900 border border-neutral-200/80 dark:border-zinc-800 space-y-4">
        {loading ? (
          <p className="text-caption text-neutral-500 dark:text-zinc-400">Loading team members…</p>
        ) : loadError ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-caption text-red-600 dark:text-red-400">{loadError}</p>
            <Button type="button" variant="outline" size="sm" onClick={loadTeam}>
              Retry
            </Button>
          </div>
        ) : team.length === 0 ? (
          <p className="text-caption text-neutral-500 dark:text-zinc-400">No team members yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-zinc-800 text-caption font-medium text-neutral-500 dark:text-zinc-400">
                  <th className="py-2.5">Team Member</th>
                  <th className="py-2.5">Email Address</th>
                  <th className="py-2.5">System Role</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-zinc-800 text-caption">
                {team.map((member) => (
                  <tr key={member.id} className="hover:bg-neutral-50/50 dark:hover:bg-zinc-800/30">
                    <td className="py-3 font-medium text-neutral-900 dark:text-zinc-100">
                      {member.fullName}
                    </td>
                    <td className="py-3 font-mono text-neutral-600 dark:text-zinc-300">
                      {member.email}
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-zinc-800 font-medium text-neutral-800 dark:text-zinc-200 text-micro">
                        <Shield size={12} className="text-indigo-600 dark:text-indigo-400" />
                        {ROLE_LABELS[member.role] ?? member.role}
                      </span>
                    </td>
                    <td className="py-3">
                      {member.status === "ACTIVE" ? (
                        <Badge variant="success" className="text-[10px]">ACTIVE</Badge>
                      ) : (
                        <Badge variant="neutral" className="text-[10px]">DEACTIVATED</Badge>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {member.status === "ACTIVE" &&
                      member.role !== "ADMINISTRATOR" &&
                      canDeactivate ? (
                        <button
                          type="button"
                          onClick={() => handleDeactivate(member.id, member.fullName)}
                          className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline font-medium text-micro"
                        >
                          <UserX size={12} />
                          <span>Deactivate</span>
                        </button>
                      ) : (
                        <span className="font-mono text-micro text-neutral-400 dark:text-zinc-500">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
