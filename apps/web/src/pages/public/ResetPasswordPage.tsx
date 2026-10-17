import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Shield, Lock, CheckCircle2, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { apiRequest, ApiRequestError } from "../../api/client";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Invalid or missing password reset token. Please request a new recovery link.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest("/auth/reset-password", {
        method: "POST",
        body: { token, newPassword },
      });
      setSuccess(true);
    } catch (err: unknown) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Failed to reset password. The recovery link may be expired or invalid."
      );
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
          Create new password
        </h2>
        <p className="mt-1 text-center text-caption text-neutral-500 dark:text-zinc-400">
          Choose a strong password with minimum 8 characters to secure your workspace.
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
                    Password updated successfully
                  </h3>
                  <p className="text-caption text-neutral-600 dark:text-zinc-400">
                    Your credentials have been securely updated. You may now log in to your account.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center w-full h-10 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-body-sm transition-colors"
                  >
                    Proceed to Sign in
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <Alert type="error">{error}</Alert>}

                <Input
                  label="New Password"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  leftIcon={<Lock size={16} />}
                />

                <Input
                  label="Confirm New Password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  leftIcon={<Lock size={16} />}
                />

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-10 font-semibold text-body-sm"
                >
                  {submitting ? "Updating Password..." : "Update Password"}
                </Button>

                <div className="text-center pt-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1 text-caption text-neutral-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                  >
                    <ArrowLeft size={14} />
                    <span>Cancel and return to login</span>
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
