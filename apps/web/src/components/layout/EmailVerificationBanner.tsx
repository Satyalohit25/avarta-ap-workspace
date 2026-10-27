import { useState, useEffect } from "react";
import { Mail, Clock, CheckCircle2, AlertCircle, X } from "lucide-react";
import { useAuth } from "../../app/AuthContext";
import { useToast } from "../ui/ToastContext";

export function EmailVerificationBanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [resending, setResending] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isVerified, setIsVerified] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("avarta_email_verified") === "true";
  });

  // Calculate days remaining in 3-day verification window
  const [daysRemaining] = useState(() => {
    if (typeof window === "undefined") return 3;
    const createdAtStr = localStorage.getItem("avarta_signup_time");
    if (!createdAtStr) return 3;
    const createdTime = parseInt(createdAtStr, 10);
    const elapsedDays = Math.floor((Date.now() - createdTime) / (1000 * 60 * 60 * 24));
    return Math.max(1, 3 - elapsedDays);
  });

  if (!user || isVerified || dismissed) return null;

  const handleResend = async () => {
    setResending(true);
    try {
      // Simulate/trigger verification email dispatch
      await new Promise((res) => setTimeout(res, 600));
      toast.success(
        "Verification Link Sent",
        `We've sent a fresh verification link to ${user.email}.`
      );
    } catch {
      toast.error("Dispatch Failed", "Unable to resend verification link at this time.");
    } finally {
      setResending(false);
    }
  };

  const handleSimulateVerify = () => {
    localStorage.setItem("avarta_email_verified", "true");
    setIsVerified(true);
    toast.success("Email Verified", "Your workspace email has been verified successfully. All features unlocked.");
  };

  return (
    <div 
      role="status" 
      aria-label="Email verification notice"
      className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-800/60 px-4 py-2 text-caption text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2 transition-colors z-30"
    >
      <div className="flex items-center gap-2">
        <Mail size={15} className="text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
        <span>
          Please verify your email address (<strong>{user.email}</strong>). You have{" "}
          <strong className="font-semibold text-amber-950 dark:text-amber-100">
            {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left
          </strong>{" "}
          in your verification window. Inviting team members and live ERP sync are gated until verified.
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="px-2.5 py-1 text-micro font-semibold rounded bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 transition-colors disabled:opacity-50"
        >
          {resending ? "Sending..." : "Resend Link"}
        </button>

        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={handleSimulateVerify}
            className="px-2 py-1 text-micro font-mono rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-200 transition-colors"
            title="Dev: Mark verified"
          >
            Verify Now (Dev)
          </button>
        )}

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 rounded"
          aria-label="Dismiss banner"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
