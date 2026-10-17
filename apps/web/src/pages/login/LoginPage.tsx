import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Invalid credentials. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4 py-12 sm:py-16 pb-28 md:pb-16 select-none overflow-x-hidden overflow-y-auto">
      {/* ── Atmospheric Heraldic Crest Background Watermark ── */}
      <div 
        className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0"
        aria-hidden="true"
      >
        {/* Ambient radial lighting behind crest */}
        <div className="absolute w-[600px] h-[600px] rounded-full bg-radial from-indigo-500/8 dark:from-indigo-400/10 via-transparent to-transparent blur-2xl" />
        
        {/* Large Grand Crest Watermark */}
        <div className="w-[780px] max-w-[94vw] aspect-square opacity-[0.07] dark:opacity-[0.11] transition-opacity duration-300 transform scale-105 sm:scale-110 contain-layout">
          <AvartaCrest 
            variant="full" 
            glow 
            className="w-full h-full" 
          />
        </div>
      </div>

      {/* ── Foreground Login Content ── */}
      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 
            className="font-old-english text-6xl text-neutral-900 dark:text-zinc-50 font-normal leading-none mb-1 tracking-wide min-h-[60px]"
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
                name="email"
                type="email"
                autoComplete="username"
                label="Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                error={emailError ?? undefined}
                placeholder="name@company.com"
                aria-label="Email address"
                required
              />

              <Input
                id="loginPassword"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
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
                    {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  </button>
                }
                placeholder="••••••••"
                aria-label="Password"
                required
              />

              <div className="flex justify-end -mt-2">
                <Link
                  to="/forgot-password"
                  className="text-micro font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              {error && <Alert type="error">{error}</Alert>}

              <Button type="submit" disabled={submitting} className="w-full h-10 font-semibold text-body-sm rounded-md">
                {submitting ? "Signing in..." : "Sign in"}
              </Button>

              {import.meta.env.DEV && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("admin@avarta.dev");
                      setPassword("devpassword123");
                      setEmailError(null);
                      setPasswordError(null);
                      setError(null);
                    }}
                    className="w-full py-1.5 px-2 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 text-micro font-mono flex items-center justify-center gap-1.5 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30 transition-colors"
                  >
                    <span>⚡ Fill Master Dev Credentials (admin@avarta.dev)</span>
                  </button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Footer Legal Links */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-micro text-neutral-400 dark:text-zinc-500 pt-4">
          <Link to="/privacy" className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link to="/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline">
            Terms of Service
          </Link>
          <span>•</span>
          <Link to="/dpa" className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline">
            DPA
          </Link>
          <span>•</span>
          <Link to="/subprocessors" className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline">
            Subprocessors
          </Link>
          <span>•</span>
          <Link to="/refund" className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline">
            Refund Policy
          </Link>
          <span>•</span>
          <a href="/.well-known/security.txt" target="_blank" rel="noreferrer noopener" className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline">
            Security.txt
          </a>
          <span>•</span>
          <span>© 2026 Avarta AP Workspace</span>
        </div>
      </div>
    </div>
  );
}
