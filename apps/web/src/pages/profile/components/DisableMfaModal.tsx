import { useState } from "react";
import { ShieldAlert, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Alert } from "../../../components/ui/Alert";
import { useToast } from "../../../components/ui/ToastContext";
import { disableMfa } from "../../../api/auth";
import { ApiRequestError } from "../../../api/client";

interface DisableMfaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDisabled?: () => void;
}

export function DisableMfaModal({
  isOpen,
  onClose,
  onDisabled,
}: DisableMfaModalProps) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleReset = () => {
    setPassword("");
    setCode("");
    setError(null);
    setSubmitting(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError("Account password is required");
      return;
    }

    const cleanCode = code.trim();
    if (!cleanCode) {
      setError("Verification code or recovery code is required");
      return;
    }

    setSubmitting(true);
    try {
      await disableMfa(password, cleanCode);
      toast.success(
        "MFA Disabled",
        "Two-factor authentication has been removed from your account."
      );
      if (onDisabled) onDisabled();
      handleReset();
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Failed to disable MFA. Please verify your password and code."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && handleReset()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-neutral-950/60 dark:bg-zinc-950/80 transition-opacity" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 max-h-[90vh] w-full max-w-md translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-lg border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-lg focus:outline-none">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
                <ShieldAlert size={18} />
              </div>
              <div>
                <DialogPrimitive.Title className="text-body font-bold text-neutral-900 dark:text-zinc-100">
                  Disable Two-Factor Authentication
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-micro text-neutral-500 dark:text-zinc-400">
                  Verify your identity to remove 2FA protection
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

          <form onSubmit={handleSubmit} className="py-5 space-y-4">
            <Alert type="warning">
              Disabling MFA lowers your account security. Active sessions will be terminated and you will only need your password to sign in.
            </Alert>

            {error && <Alert type="error">{error}</Alert>}

            <Input
              id="disableMfaPassword"
              name="password"
              type="password"
              label="Account Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="••••••••"
              required
            />

            <Input
              id="disableMfaCode"
              name="code"
              type="text"
              label="Verification Code or Recovery Code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (error) setError(null);
              }}
              placeholder="6-digit code or 8-char recovery code"
              className="font-mono text-center tracking-wider"
              required
            />

            <div className="pt-3 border-t border-neutral-100 dark:border-zinc-800 flex items-center justify-between">
              <Button variant="ghost" type="button" onClick={handleReset} className="text-neutral-500 text-caption">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700"
              >
                {submitting ? "Disabling..." : "Disable MFA"}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
