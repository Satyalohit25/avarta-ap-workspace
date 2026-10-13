import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardContent } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [demoToken, setDemoToken] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setSubmitting(true);
    // Simulate API call to /api/auth/forgot-password
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      // In development/demo, generate a test token for instant testing
      setDemoToken("demo_reset_tok_" + Math.random().toString(36).slice(-8));
    }, 600);
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
          Reset your password
        </h2>
        <p className="mt-1 text-center text-caption text-neutral-500 dark:text-zinc-400">
          Enter your registered enterprise email address to receive recovery instructions.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card level="surface" className="border-neutral-200/80 dark:border-zinc-800 shadow-sm">
          <CardContent className="p-6">
            {submitted ? (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-body font-semibold text-neutral-900 dark:text-zinc-100">
                    Check your corporate inbox
                  </h3>
                  <p className="text-caption text-neutral-600 dark:text-zinc-400 leading-relaxed">
                    If an active account exists for <strong>{email}</strong>, a single-use recovery link has been dispatched. Links expire in 60 minutes.
                  </p>
                </div>

                {demoToken && (
                  <div className="p-3 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 text-left space-y-1">
                    <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300">
                      Sandbox Fast-Track Link:
                    </span>
                    <Link
                      to={`/reset-password?token=${demoToken}`}
                      className="block text-micro font-mono text-indigo-600 dark:text-indigo-400 underline truncate"
                    >
                      Click here to simulate reset token
                    </Link>
                  </div>
                )}

                <div className="pt-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-body-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <ArrowLeft size={16} />
                    <span>Return to Login</span>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Corporate Email Address"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  leftIcon={<Mail size={16} />}
                />

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-10 font-semibold text-body-sm"
                >
                  {submitting ? "Dispatching Link..." : "Send Recovery Instructions"}
                </Button>

                <div className="text-center pt-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1 text-caption text-neutral-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                  >
                    <ArrowLeft size={14} />
                    <span>Back to sign in</span>
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
