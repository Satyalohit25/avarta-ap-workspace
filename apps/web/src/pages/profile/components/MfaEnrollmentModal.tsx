import { useState, useEffect } from "react";
import {
  Shield,
  Key,
  Download,
  Copy,
  Check,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Alert } from "../../../components/ui/Alert";
import { useToast } from "../../../components/ui/ToastContext";
import { enrollMfa, enableMfa } from "../../../api/auth";
import { ApiRequestError } from "../../../api/client";

interface MfaEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnrollComplete?: () => void;
}

type Step = "setup" | "recovery_codes";

export function MfaEnrollmentModal({
  isOpen,
  onClose,
  onEnrollComplete,
}: MfaEnrollmentModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("setup");
  const [loadingEnroll, setLoadingEnroll] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [secret, setSecret] = useState<string>("");
  const [otpauthUri, setOtpauthUri] = useState<string>("");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setStep("setup");
      setVerificationCode("");
      setCodeError(null);
      setEnrollError(null);
      setSubmitting(false);
      setLoadingEnroll(true);

      enrollMfa()
        .then((res) => {
          setSecret(res.secret);
          setOtpauthUri(res.otpauthUri);
        })
        .catch((err) => {
          setEnrollError(
            err instanceof ApiRequestError
              ? err.message
              : "Failed to initiate MFA setup. Please try again."
          );
        })
        .finally(() => {
          setLoadingEnroll(false);
        });
    }
  }, [isOpen]);

  const handleCopySecret = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError(null);

    const cleanCode = verificationCode.trim().replace(/\s+/g, "");
    if (!/^\d{6}$/.test(cleanCode)) {
      setCodeError("Please enter a valid 6-digit numeric verification code");
      return;
    }

    setSubmitting(true);
    try {
      const res = await enableMfa(secret, cleanCode);
      setRecoveryCodes(res.recoveryCodes);
      setStep("recovery_codes");
      toast.success(
        "MFA Enabled",
        "Two-factor authentication is now active for your account."
      );
    } catch (err) {
      setCodeError(
        err instanceof ApiRequestError
          ? err.message
          : "Invalid verification code. Please check your app and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadRecoveryCodes = () => {
    const text =
      `AVARTA AP WORKSPACE - MFA RECOVERY CODES\n` +
      `Generated: ${new Date().toISOString()}\n\n` +
      recoveryCodes.map((c, i) => `${i + 1}. ${c}`).join("\n") +
      `\n\nKeep these codes in a secure password manager. Each code can be used once.`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "avarta-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(
      "Recovery Codes Downloaded",
      "Save this file in your corporate password manager."
    );
  };

  const handleCompleteEnrollment = () => {
    if (onEnrollComplete) onEnrollComplete();
    onClose();
  };

  // Format secret into 4-char groups for easier manual entry
  const formattedSecret = secret
    ? secret.match(/.{1,4}/g)?.join(" ") || secret
    : "";

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-neutral-950/60 dark:bg-zinc-950/80 transition-opacity" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 max-h-[90vh] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-lg border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-lg focus:outline-none">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Shield size={18} />
              </div>
              <div>
                <DialogPrimitive.Title className="text-body font-bold text-neutral-900 dark:text-zinc-100">
                  Two-Factor Authentication Setup
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-micro text-neutral-500 dark:text-zinc-400">
                  Protect your corporate account with TOTP authentication
                </DialogPrimitive.Description>
              </div>
            </div>
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-300 rounded-lg"
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </DialogPrimitive.Close>
          </div>

          <div className="py-5">
            {loadingEnroll && (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <Loader2 size={28} className="animate-spin text-indigo-600" />
                <span className="text-body-sm text-neutral-500 dark:text-zinc-400">
                  Generating secure TOTP secret key...
                </span>
              </div>
            )}

            {!loadingEnroll && enrollError && (
              <div className="space-y-4">
                <Alert type="error">{enrollError}</Alert>
                <div className="flex justify-end">
                  <Button variant="outline" onClick={onClose}>
                    Close
                  </Button>
                </div>
              </div>
            )}

            {!loadingEnroll && !enrollError && step === "setup" && (
              <div className="space-y-5">
                <div className="space-y-3">
                  <span className="text-body-sm font-semibold text-neutral-900 dark:text-zinc-100 block">
                    1. Add to Authenticator App
                  </span>
                  <p className="text-caption text-neutral-600 dark:text-zinc-400">
                    Open your authenticator app (Google Authenticator, 1Password, Microsoft Authenticator) and enter this setup key manually:
                  </p>

                  <div className="p-3.5 rounded-md border border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-800/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-micro uppercase font-semibold text-neutral-500 dark:text-zinc-400">
                        Manual Entry Secret Key
                      </span>
                      <button
                        type="button"
                        onClick={handleCopySecret}
                        className="inline-flex items-center gap-1.5 text-micro font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        {copiedSecret ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        <span>{copiedSecret ? "Copied" : "Copy Key"}</span>
                      </button>
                    </div>
                    <div className="font-mono text-body font-semibold tracking-widest text-neutral-900 dark:text-zinc-100 select-all">
                      {formattedSecret}
                    </div>
                    {otpauthUri && (
                      <div className="text-[11px] text-neutral-400 dark:text-zinc-500 truncate pt-1">
                        URI: {otpauthUri}
                      </div>
                    )}
                  </div>
                </div>

                <form onSubmit={handleVerifyCode} className="space-y-4 pt-2 border-t border-neutral-100 dark:border-zinc-800">
                  <div className="space-y-2">
                    <span className="text-body-sm font-semibold text-neutral-900 dark:text-zinc-100 block">
                      2. Enter Verification Code
                    </span>
                    <p className="text-caption text-neutral-600 dark:text-zinc-400">
                      Enter the 6-digit numeric code displayed in your authenticator app to confirm setup:
                    </p>
                  </div>

                  {codeError && <Alert type="error">{codeError}</Alert>}

                  <Input
                    id="mfaVerificationCode"
                    label="6-Digit Verification Code"
                    value={verificationCode}
                    onChange={(e) => {
                      setVerificationCode(e.target.value);
                      if (codeError) setCodeError(null);
                    }}
                    placeholder="123456"
                    maxLength={8}
                    className="font-mono text-center tracking-widest text-lg"
                    required
                  />

                  <div className="flex items-center justify-between pt-2">
                    <Button variant="ghost" type="button" onClick={onClose} className="text-neutral-500 text-caption">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting} className="gap-2">
                      {submitting ? "Verifying..." : "Verify & Activate MFA"}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {!loadingEnroll && !enrollError && step === "recovery_codes" && (
              <div className="space-y-4">
                <Alert type="warning">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-caption text-amber-900 dark:text-amber-200">
                      <strong>Important:</strong> Save these one-time recovery codes now. They are only displayed once and allow access if you lose your phone.
                    </div>
                  </div>
                </Alert>

                <div className="grid grid-cols-2 gap-2 p-3 rounded-md border border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-950 font-mono text-body-sm text-neutral-800 dark:text-zinc-200">
                  {recoveryCodes.map((c, i) => (
                    <div
                      key={i}
                      className="p-1.5 border border-dashed border-neutral-300 dark:border-zinc-800 rounded flex items-center justify-between"
                    >
                      <span className="text-neutral-400 text-micro">{i + 1}.</span>
                      <span className="font-semibold">{c}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownloadRecoveryCodes}
                    className="w-full gap-2 text-caption"
                  >
                    <Download size={14} />
                    <span>Download Codes (.txt)</span>
                  </Button>
                </div>

                <div className="pt-3 border-t border-neutral-100 dark:border-zinc-800 flex justify-end">
                  <Button type="button" onClick={handleCompleteEnrollment}>
                    I have saved my codes • Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
