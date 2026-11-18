import { Shield, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "../../../components/ui/Button";
import { Alert } from "../../../components/ui/Alert";

interface MfaEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnrollComplete?: () => void;
}

export function MfaEnrollmentModal({
  isOpen,
  onClose,
}: MfaEnrollmentModalProps) {
  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-neutral-950/60 dark:bg-zinc-950/80 transition-opacity" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 max-h-[90vh] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-lg border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-lg focus:outline-none">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Shield size={18} />
              </div>
              <div>
                <DialogPrimitive.Title className="text-body font-bold text-neutral-900 dark:text-zinc-100">
                  Two-Factor Authentication (MFA)
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-micro text-neutral-500 dark:text-zinc-400">
                  Implementation in progress (Backlog item T-105)
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

          <div className="py-5 space-y-4">
            <Alert type="warning">
              <div className="space-y-1">
                <span className="font-semibold block">MFA Enrollment Currently Unavailable</span>
                <span>
                  Self-service MFA enrollment controls have been suspended until production server-side TOTP validation and encrypted secret storage (T-105) are deployed.
                </span>
              </div>
            </Alert>

            <div className="text-caption text-neutral-600 dark:text-zinc-400 space-y-2">
              <p>
                To prevent false security guarantees, client-side simulated enrollment has been deactivated. Your account remains protected by authenticated session tokens, bcrypt password hashing, and login rate limiting.
              </p>
              <p>
                When T-105 ships, you will be able to configure standard TOTP apps (Google Authenticator, Microsoft Authenticator, 1Password) with server-verified one-time backup recovery codes.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
