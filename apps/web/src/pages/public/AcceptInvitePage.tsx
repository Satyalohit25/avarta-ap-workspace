import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Shield, Lock, CheckCircle2, UserCheck, Mail } from "lucide-react";
import { Card, CardContent } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { acceptInvite } from "../../api/auth";

export default function AcceptInvitePage() {
  useDocumentTitle("Accept Invitation", "Accept organization invite and join your team's Avarta AP Workspace.");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "your invited email";
  const role = searchParams.get("role") || "FINANCE_EXECUTIVE";

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("This invitation link is missing its token. Ask your administrator for a new invite.");
      return;
    }
    if (password.length < 12) {
      setError("Password must be at least 12 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await acceptInvite({ token, fullName, password });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not accept the invitation. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400">
          <Shield size={28} />
          <span className="font-bold text-xl tracking-tight text-neutral-900 dark:text-zinc-100">
            Avarta AP Workspace
          </span>
        </div>
        <h2 className="text-center text-h2 font-semibold text-neutral-900 dark:text-zinc-100">
          Accept Workspace Invitation
        </h2>
        <p className="mt-1 text-center text-caption text-neutral-500 dark:text-zinc-400">
          You have been invited to join the tenant with assigned role credentials.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card level="surface" className="border-neutral-200/80 dark:border-zinc-800 shadow-sm">
          <CardContent className="p-6">
            {success ? (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-body font-semibold text-neutral-900 dark:text-zinc-100">
                    Invitation Accepted
                  </h3>
                  <p className="text-caption text-neutral-600 dark:text-zinc-400">
                    Your account has been activated and your credentials configured. You can now log in to the workspace.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center w-full h-10 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-body-sm transition-colors"
                  >
                    Proceed to Sign In
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <Alert type="error">{error}</Alert>}

                <div className="p-3 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-900/50 space-y-2">
                  <div className="flex items-center justify-between text-caption">
                    <span className="text-neutral-500 flex items-center gap-1.5">
                      <Mail size={13} /> Invited Email
                    </span>
                    <span className="font-medium text-neutral-900 dark:text-zinc-100">{email}</span>
                  </div>
                  <div className="flex items-center justify-between text-caption">
                    <span className="text-neutral-500 flex items-center gap-1.5">
                      <UserCheck size={13} /> Assigned Role
                    </span>
                    <Badge variant="neutral" size="sm">
                      {role.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>

                <Input
                  label="Your Full Name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                />

                <Input
                  label="Set Password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 12 characters"
                  leftIcon={<Lock size={16} />}
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  leftIcon={<Lock size={16} />}
                />

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={submitting}
                    className="w-full justify-center h-10"
                  >
                    {submitting ? "Activating Account..." : "Accept & Join Workspace"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
