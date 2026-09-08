import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../app/AuthContext";
import { ApiRequestError } from "../../api/client";
import { Card, CardContent } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { AvartaCrest } from "../../components/brand/AvartaCrest";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("manager@avarta.dev");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setEmailError(null);
    setPasswordError(null);
    setError(null);

    let hasValidationErr = false;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError("Email is required");
      hasValidationErr = true;
    } else if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setEmailError("Please enter a valid email address");
      hasValidationErr = true;
    }

    if (!password) {
      setPasswordError("Password is required");
      hasValidationErr = true;
    }

    if (hasValidationErr) return;

    setSubmitting(true);
    try {
      await login(trimmedEmail, password);
      navigate("/overview");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Invalid demo credentials. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuickDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("password123");
    setEmailError(null);
    setPasswordError(null);
    setError(null);
    setSubmitting(true);
    try {
      await login(demoEmail, "password123");
      navigate("/overview", { replace: true });
    } catch (err) {
      setError((err as Error).message || "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background text-foreground px-4 py-12 overflow-hidden select-none">
      {/* ── Atmospheric Heraldic Crest Background Watermark ── */}
      <div 
        className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0"
        aria-hidden="true"
      >
        {/* Ambient radial lighting behind crest */}
        <div className="absolute w-[600px] h-[600px] rounded-full bg-radial from-indigo-500/8 dark:from-indigo-400/10 via-transparent to-transparent blur-2xl" />
        
        {/* Large Grand Crest Watermark */}
        <div className="w-[780px] max-w-[94vw] h-auto opacity-[0.07] dark:opacity-[0.11] transition-opacity duration-300 transform scale-105 sm:scale-110">
          <AvartaCrest 
            variant="full" 
            glow 
            className="w-full h-auto" 
          />
        </div>
      </div>

      {/* ── Foreground Login Content ── */}
      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 
            className="font-old-english text-6xl text-neutral-900 dark:text-zinc-50 font-normal leading-none mb-1 tracking-wide"
            style={{ letterSpacing: "0.06em" }}
          >
            Avarta
          </h1>
          <p className="text-micro font-semibold uppercase tracking-[0.24em] font-mono text-neutral-500 dark:text-zinc-400 mt-1.5">
            Accounts Payable Workspace
          </p>
          <p className="text-[11px] font-serif italic text-neutral-400 dark:text-zinc-500 mt-1">
            आत्मानं विद्धि • Know Thyself
          </p>
        </div>

        <Card 
          level="surface" 
          className="relative border border-neutral-200/80 dark:border-zinc-800/90 bg-white/95 dark:bg-zinc-900/85 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden"
        >
          <CardContent className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Input
                id="loginEmail"
                type="email"
                label="Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                error={emailError ?? undefined}
                placeholder="manager@avarta.dev"
                aria-label="Email address"
                required
              />

              <Input
                id="loginPassword"
                type={showPassword ? "text" : "password"}
                label="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                error={passwordError ?? undefined}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-neutral-400 hover:text-neutral-600 dark:text-zinc-500 dark:hover:text-zinc-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 dark:focus-visible:ring-zinc-400 rounded p-0.5 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                placeholder="••••••••"
                aria-label="Password"
                required
              />

              {error && <Alert type="error">{error}</Alert>}

              <Button type="submit" disabled={submitting} className="w-full h-10 font-semibold text-body-sm rounded-md">
                {submitting ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 1-Tap Quick Demo Launchers for Mobile & Client Presentations */}
        <div className="mt-4 p-3 rounded-2xl bg-white/70 dark:bg-zinc-900/70 border border-neutral-200/80 dark:border-zinc-800/80 shadow-xs backdrop-blur-xs text-center">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 dark:text-zinc-400 font-semibold">
              ⚡ Instant 1-Tap Demo Sign-in
            </span>
            <span className="text-[10px] font-mono text-neutral-400 dark:text-zinc-500">
              pwd: password123
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleQuickDemo("manager@avarta.dev")}
              className="px-2.5 py-1.5 rounded-lg text-left bg-indigo-50/80 hover:bg-indigo-100/80 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 border border-indigo-200/60 dark:border-indigo-800/50 transition-colors group cursor-pointer"
            >
              <div className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
                <span>Finance Manager</span>
                <span className="text-[9px] opacity-70 group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
              <span className="text-[9.5px] text-indigo-900/60 dark:text-indigo-400/70 font-mono block truncate">
                Full AP Workspace
              </span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleQuickDemo("approver@avarta.dev")}
              className="px-2.5 py-1.5 rounded-lg text-left bg-amber-50/80 hover:bg-amber-100/80 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 border border-amber-200/60 dark:border-amber-800/50 transition-colors group cursor-pointer"
            >
              <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 flex items-center justify-between">
                <span>Approver</span>
                <span className="text-[9px] opacity-70 group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
              <span className="text-[9.5px] text-amber-900/60 dark:text-amber-400/70 font-mono block truncate">
                Queue & Sign-off
              </span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleQuickDemo("executive@avarta.dev")}
              className="px-2.5 py-1.5 rounded-lg text-left bg-emerald-50/80 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-200/60 dark:border-emerald-800/50 transition-colors group cursor-pointer"
            >
              <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                <span>Executive</span>
                <span className="text-[9px] opacity-70 group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
              <span className="text-[9.5px] text-emerald-900/60 dark:text-emerald-400/70 font-mono block truncate">
                Ingest & Matching
              </span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleQuickDemo("admin@avarta.dev")}
              className="px-2.5 py-1.5 rounded-lg text-left bg-neutral-100/80 hover:bg-neutral-200/80 dark:bg-zinc-800/60 dark:hover:bg-zinc-700/60 border border-neutral-200/80 dark:border-zinc-700/80 transition-colors group cursor-pointer"
            >
              <div className="text-[11px] font-semibold text-neutral-700 dark:text-zinc-200 flex items-center justify-between">
                <span>Administrator</span>
                <span className="text-[9px] opacity-70 group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
              <span className="text-[9.5px] text-neutral-500 dark:text-zinc-400 font-mono block truncate">
                Governance & Setup
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
