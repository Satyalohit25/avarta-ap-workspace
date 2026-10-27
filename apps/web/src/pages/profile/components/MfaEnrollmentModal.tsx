import { useState } from "react";
import {
  Shield,
  Key,
  Download,
  AlertCircle,
  Copy,
  Check,
  X,
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Alert } from "../../../components/ui/Alert";
import { useToast } from "../../../components/ui/ToastContext";

interface MfaEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnrollComplete?: () => void;
}

type Step = "setup" | "verify" | "recovery_codes";

export function MfaEnrollmentModal({
  isOpen,
  onClose,
  onEnrollComplete,
}: MfaEnrollmentModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("setup");
  const [method, setMethod] = useState<"totp" | "passkey">("totp");
  const [totpSecret] = useState("AVAR-TA26-MFAP-ROD9");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const recoveryCodes = [
    "9A2B-4C8D-1E3F",
    "7H8J-2K3L-5M6N",
    "4P5Q-8R9S-1T2U",
    "3V4W-6X7Y-9Z0A",
    "8B9C-1D2E-4F5G",
    "2H3J-5K6L-7M8N",
  ];

  const handleCopySecret = () => {
    navigator.clipboard.writeText(totpSecret);
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
    setTimeout(() => {
      setSubmitting(false);
      // Valid verification
      setStep("recovery_codes");
    }, 500);
  };

  const handleDownloadRecoveryCodes = () => {
    const text = `AVARTA AP WORKSPACE - MFA RECOVERY CODES\nGenerated: ${new Date().toISOString()}\n\n` +
      recoveryCodes.map((c, i) => `${i + 1}. ${c}`).join("\n") +
      `\n\nKeep these codes in a secure vault. Each code can be used once.`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "avarta-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Recovery Codes Downloaded", "Save this file in your corporate password manager.");
  };

  const handleCompleteEnrollment = () => {
    localStorage.setItem("avarta_mfa_enrolled", "true");
    toast.success("MFA Enrolled", "Multi-factor authentication is now active for your account.");
    if (onEnrollComplete) onEnrollComplete();
    handleReset();
  };

  const handleReset = () => {
    setStep("setup");
    setVerificationCode("");
    setCodeError(null);
    onClose();
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && handleReset()}>
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
                  Two-Factor Authentication Setup (A5)
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-micro text-neutral-500 dark:text-zinc-400">
                  Required for approving invoices and releasing financial disbursements
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

          <div className="py-4">
            {step === "setup" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 dark:bg-zinc-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setMethod("totp")}
                    className={`py-1.5 text-caption font-semibold rounded-md transition-colors ${
                      method === "totp"
                        ? "bg-white dark:bg-zinc-900 text-neutral-900 dark:text-zinc-100 shadow-2xs"
                        : "text-neutral-600 dark:text-zinc-400"
                    }`}
                  >
                    Authenticator App
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod("passkey")}
                    className={`py-1.5 text-caption font-semibold rounded-md transition-colors ${
                      method === "passkey"
                        ? "bg-white dark:bg-zinc-900 text-neutral-900 dark:text-zinc-100 shadow-2xs"
                        : "text-neutral-600 dark:text-zinc-400"
                    }`}
                  >
                    Hardware Key / Passkey
                  </button>
                </div>

                {method === "totp" ? (
                  <div className="space-y-4">
                    <p className="text-caption text-neutral-600 dark:text-zinc-400">
                      Scan the QR code with your authenticator app (Google Authenticator, Microsoft Authenticator, 1Password):
                    </p>

                    {/* QR Code Placeholder Graphic */}
                    <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-950/40">
                      <div className="w-36 h-36 bg-white p-2 rounded-lg border border-neutral-300 dark:border-zinc-700 shadow-2xs flex items-center justify-center">
                        <svg viewBox="0 0 100 100" className="w-full h-full" fill="currentColor">
                          <path d="M10 10h30v30h-30z M20 20h10v10h-10z M60 10h30v30h-30z M70 20h10v10h-10z M10 60h30v30h-30z M20 70h10v10h-10z M60 60h10v10h-10z M80 60h10v10h-10z M70 70h10v10h-10z M60 80h10v10h-10z M80 80h10v10h-10z" />
                        </svg>
                      </div>
                      <span className="text-[11px] font-mono text-neutral-500 dark:text-zinc-400 mt-2">
                        Scan with your mobile authenticator app
                      </span>
                    </div>

                    <div className="p-3 rounded-lg border border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-800/40 space-y-1">
                      <span className="text-micro text-neutral-500 dark:text-zinc-400 block font-medium">
                        Manual entry code:
                      </span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-body-sm font-semibold tracking-wider text-neutral-900 dark:text-zinc-100">
                          {totpSecret}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopySecret}
                          className="px-2 py-1 text-micro font-medium rounded border border-neutral-200 dark:border-zinc-700 hover:bg-neutral-100 dark:hover:bg-zinc-700 flex items-center gap-1 transition-colors"
                        >
                          {copiedSecret ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                          <span>{copiedSecret ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center space-y-3 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-800/40">
                    <Key size={32} className="text-indigo-600 dark:text-indigo-400 mx-auto" />
                    <h4 className="text-body font-semibold text-neutral-900 dark:text-zinc-100">
                      FIDO2 / WebAuthn Hardware Key
                    </h4>
                    <p className="text-caption text-neutral-500 dark:text-zinc-400 max-w-xs mx-auto">
                      Use a YubiKey, Apple Touch ID, or Windows Hello to protect your high-value releases.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <Button variant="ghost" onClick={handleReset} className="text-neutral-500 text-caption">
                    Remind me later
                  </Button>
                  <Button variant="primary" onClick={() => setStep("verify")} className="gap-2">
                    <span>Continue to Verification</span>
                  </Button>
                </div>
              </div>
            )}

            {step === "verify" && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <p className="text-caption text-neutral-600 dark:text-zinc-400">
                  Enter the 6-digit code shown in your authenticator app to confirm setup:
                </p>

                {codeError && <Alert type="error">{codeError}</Alert>}

                <Input
                  label="6-Digit Verification Code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  required
                  placeholder="123456"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="text-center font-mono text-xl tracking-widest"
                />

                <div className="flex items-center justify-between pt-2">
                  <Button variant="outline" onClick={() => setStep("setup")}>
                    Back
                  </Button>
                  <Button type="submit" variant="primary" disabled={submitting}>
                    {submitting ? "Verifying..." : "Verify & Enable MFA"}
                  </Button>
                </div>
              </form>
            )}

            {step === "recovery_codes" && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/30">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-caption text-amber-900 dark:text-amber-200">
                      <strong>Important:</strong> Save these one-time recovery codes now. They are only displayed once and allow access if you lose your phone.
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-950 font-mono text-body-sm text-neutral-800 dark:text-zinc-200">
                  {recoveryCodes.map((c, i) => (
                    <div key={i} className="p-1.5 border border-dashed border-neutral-300 dark:border-zinc-800 rounded">
                      <span className="text-neutral-400 mr-2 text-micro">{i + 1}.</span>
                      <span>{c}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownloadRecoveryCodes}
                    className="w-full sm:w-auto gap-2"
                  >
                    <Download size={14} />
                    <span>Download Codes (.txt)</span>
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleCompleteEnrollment}
                    className="w-full sm:w-auto flex-1"
                  >
                    I have safely saved my codes
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
