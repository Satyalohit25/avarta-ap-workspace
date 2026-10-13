import { useState } from "react";
import { Users, UserPlus, Shield, Mail, CheckCircle2, UserX } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { useToast } from "../../../components/ui/ToastContext";

interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: "ADMINISTRATOR" | "FINANCE_MANAGER" | "FINANCE_EXECUTIVE" | "APPROVER" | "READ_ONLY";
  status: "ACTIVE" | "DEACTIVATED";
  joinedDate: string;
}

const INITIAL_TEAM: TeamMember[] = [
  {
    id: "usr_01",
    fullName: "Arjun Verma",
    email: "arjun.verma@tatachemicals.com",
    role: "ADMINISTRATOR",
    status: "ACTIVE",
    joinedDate: "12 Aug 2026",
  },
  {
    id: "usr_02",
    fullName: "Priya Sundaram",
    email: "priya.s@tatachemicals.com",
    role: "FINANCE_MANAGER",
    status: "ACTIVE",
    joinedDate: "18 Aug 2026",
  },
  {
    id: "usr_03",
    fullName: "Kavita Nair",
    email: "kavita.n@tatachemicals.com",
    role: "FINANCE_EXECUTIVE",
    status: "ACTIVE",
    joinedDate: "02 Sep 2026",
  },
  {
    id: "usr_04",
    fullName: "Vikram Mehta",
    email: "vikram.m@tatachemicals.com",
    role: "APPROVER",
    status: "ACTIVE",
    joinedDate: "15 Sep 2026",
  },
];

const ROLE_LABELS: Record<string, string> = {
  ADMINISTRATOR: "Administrator",
  FINANCE_MANAGER: "Finance Manager",
  FINANCE_EXECUTIVE: "Finance Executive",
  APPROVER: "Approver",
  READ_ONLY: "Read Only",
};

export function TeamManagementCard() {
  const { toast } = useToast();
  const [team, setTeam] = useState<TeamMember[]>(INITIAL_TEAM);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<TeamMember["role"]>("FINANCE_EXECUTIVE");
  const [inviting, setInviting] = useState(false);

  const activeSeats = team.filter((m) => m.status === "ACTIVE").length;
  const maxSeats = 10; // On Growth Plan

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName) return;

    if (activeSeats >= maxSeats) {
      toast({
        type: "error",
        message: "Team seat quota reached (10/10). Please upgrade your subscription plan to add more members.",
      });
      return;
    }

    setInviting(true);
    setTimeout(() => {
      const newMember: TeamMember = {
        id: `usr_${Date.now()}`,
        fullName: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        role: newRole,
        status: "ACTIVE",
        joinedDate: "Just now",
      };
      setTeam((prev) => [...prev, newMember]);
      setNewEmail("");
      setNewName("");
      setIsInviteOpen(false);
      setInviting(false);
      toast({
        type: "success",
        message: `Invitation email sent to ${newMember.email} with ${ROLE_LABELS[newMember.role]} privileges.`,
      });
    }, 500);
  };

  const handleDeactivate = (userId: string, name: string) => {
    setTeam((prev) =>
      prev.map((m) => (m.id === userId ? { ...m, status: "DEACTIVATED" as const } : m))
    );
    toast({
      type: "info",
      message: `${name}'s account has been deactivated. Historical audit actions remain preserved.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Team Quota Header */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-neutral-200/80 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
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
              Seats: <strong className="text-neutral-900 dark:text-zinc-100">{activeSeats} / {maxSeats}</strong>
            </span>
            <Button
              type="button"
              variant="primary"
              onClick={() => setIsInviteOpen(true)}
              className="text-caption font-semibold flex items-center gap-1.5"
            >
              <UserPlus size={15} />
              <span>Invite Teammate</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Invite Modal / Card */}
      {isInviteOpen && (
        <form
          onSubmit={handleInviteSubmit}
          className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/80 shadow-xs space-y-4"
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
              <label className="text-micro font-medium text-neutral-600 dark:text-zinc-300">Full Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Rohini Sen"
                className="w-full px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-caption text-neutral-900 dark:text-zinc-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-micro font-medium text-neutral-600 dark:text-zinc-300">Corporate Email</label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="rohini@company.com"
                className="w-full px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-caption text-neutral-900 dark:text-zinc-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-micro font-medium text-neutral-600 dark:text-zinc-300">Assigned Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as TeamMember["role"])}
                className="w-full px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-caption text-neutral-900 dark:text-zinc-100"
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

      {/* Team Roster Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-neutral-200/80 dark:border-zinc-800 shadow-xs space-y-4">
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
                      {ROLE_LABELS[member.role]}
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
                    {member.status === "ACTIVE" && member.role !== "ADMINISTRATOR" ? (
                      <button
                        type="button"
                        onClick={() => handleDeactivate(member.id, member.fullName)}
                        className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline font-medium text-micro"
                      >
                        <UserX size={12} />
                        <span>Deactivate</span>
                      </button>
                    ) : (
                      <span className="text-micro text-neutral-400 dark:text-zinc-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
