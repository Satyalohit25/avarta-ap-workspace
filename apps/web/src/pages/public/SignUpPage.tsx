import { FormEvent, useState, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Building2, User, Mail } from "lucide-react";
import { useAuth } from "../../app/AuthContext";
import { fetchAuthConfig } from "../../api/auth";
import { ApiRequestError } from "../../api/client";
import { Card, CardContent } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { AvartaCrest } from "../../components/brand/AvartaCrest";

function evaluatePasswordStrength(pass: string): {
  score: number;
  label: string;
  colorCls: string;
} {
  if (!pass) return { score: 0, label: "Enter password", colorCls: "bg-neutral-200 dark:bg-zinc-700" };
  let s = 0;
  if (pass.length >= 8) s += 1;
  if (pass.length >= 12) s += 1;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) s += 1;
  if (/[0-9]/.test(pass)) s += 1;
  if (/[^A-Za-z0-9]/.test(pass)) s += 1;

  if (s <= 1) return { score: 1, label: "Weak", colorCls: "bg-rose-500" };
  if (s <= 3) return { score: 2, label: "Fair", colorCls: "bg-amber-500" };
  if (s <= 4) return { score: 3, label: "Good", colorCls: "bg-indigo-500" };
  return { score: 4, label: "Strong", colorCls: "bg-emerald-500" };
}

export default function SignUpPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [signupEnabled, setSignupEnabled] = useState<boolean | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("IN");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchAuthConfig()
      .then((cfg) => {
        if (mounted) {
          setSignupEnabled(cfg.signupEnabled);
          setLoadingConfig(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setSignupEnabled(true);
          setLoadingConfig(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDuplicateEmail, setIsDuplicateEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const strength = useMemo(() => evaluatePasswordStrength(password), [password]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setFullNameError(null);
    setEmailError(null);
    setPasswordError(null);
    setCompanyError(null);
    setTermsError(null);
    setError(null);
    setIsDuplicateEmail(false);

    let hasValidationErr = false;

    if (!fullName.trim()) {
      setFullNameError("Full name is required");
      hasValidationErr = true;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError("Work email is required");
      hasValidationErr = true;
    } else if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setEmailError("Please enter a valid work email address");
      hasValidationErr = true;
    }

    if (!companyName.trim()) {
      setCompanyError("Company name is required");
      hasValidationErr = true;
    }

    if (!password) {
      setPasswordError("Password is required");
      hasValidationErr = true;
    } else if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      hasValidationErr = true;
    }

    if (!termsAccepted) {
      setTermsError("You must accept the Terms of Service and Privacy Policy to create a workspace");
      hasValidationErr = true;
    }

    if (hasValidationErr) return;

    setSubmitting(true);
    try {
      await signup({
        fullName: fullName.trim(),
        email: trimmedEmail,
        password,
        companyName: companyName.trim(),
        country,
        termsAccepted,
      });
      // A1-1: Creates one workspace and one Administrator, then opens the empty dashboard
      navigate("/overview");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.status === 409 || err.message.toLowerCase().includes("already exists")) {
          setIsDuplicateEmail(true);
          setError("An account with this email already exists.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Unable to create workspace. Please check your details and try again.");
      }
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
        <div className="absolute w-[600px] h-[600px] rounded-full bg-radial from-indigo-500/8 dark:from-indigo-400/10 via-transparent to-transparent blur-2xl" />
        <div className="w-[780px] max-w-[94vw] aspect-square opacity-[0.07] dark:opacity-[0.11] transition-opacity duration-300 transform scale-105 sm:scale-110 contain-layout">
          <AvartaCrest variant="full" glow className="w-full h-full" />
        </div>
      </div>

      {/* ── Foreground Content ── */}
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 
            className="font-old-english text-5xl sm:text-6xl text-neutral-900 dark:text-zinc-50 font-normal leading-none mb-1 tracking-wide"
            style={{ letterSpacing: "0.06em" }}
          >
            Avarta
          </h1>
          <p className="text-micro font-semibold uppercase tracking-[0.24em] font-mono text-neutral-500 dark:text-zinc-400 mt-1.5">
            Create Your Workspace
          </p>
          <p className="text-[11px] font-serif italic text-neutral-400 dark:text-zinc-500 mt-1">
            Accounts Payable Workspace for Growing Enterprises
          </p>
        </div>

        <Card 
          level="surface" 
          className="relative border border-neutral-200/80 dark:border-zinc-800/90 bg-white/95 dark:bg-zinc-900/85 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden"
        >
          <CardContent className="p-6 md:p-8">
            {loadingConfig ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-neutral-400 dark:text-zinc-500">
                <div className="w-6 h-6 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-body-sm">Checking workspace availability...</span>
              </div>
            ) : signupEnabled === false ? (
              <div className="space-y-5 py-2 text-center" data-testid="signup-disabled-container">
                <Alert type="info">
                  <span className="text-body-sm text-neutral-800 dark:text-zinc-200">
                    Self-service signup is not available. Contact your administrator for an invitation.
                  </span>
                </Alert>
                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="w-full h-10 font-semibold text-body-sm rounded-md"
                  >
                    Back to sign in
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {error && (
                  <Alert type="error">
                    <div className="flex flex-col gap-2">
                      <span>{error}</span>
                      <Link
                        to="/login"
                        className="font-semibold underline hover:text-indigo-600 dark:hover:text-indigo-400 text-body-sm inline-flex items-center gap-1"
                      >
                        Back to sign in →
                      </Link>
                    </div>
                  </Alert>
                )}

              <Input
                id="signupFullName"
                name="fullName"
                type="text"
                autoComplete="name"
                label="Full Name"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (fullNameError) setFullNameError(null);
                }}
                error={fullNameError ?? undefined}
                placeholder="Ramesh Iyer"
                leftIcon={<User size={16} />}
                required
              />

              <Input
                id="signupEmail"
                name="email"
                type="email"
                autoComplete="email"
                label="Work Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                  if (isDuplicateEmail) setIsDuplicateEmail(false);
                }}
                error={emailError ?? undefined}
                placeholder="ramesh@company.com"
                leftIcon={<Mail size={16} />}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  id="signupCompanyName"
                  name="companyName"
                  type="text"
                  autoComplete="organization"
                  label="Company Name"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    if (companyError) setCompanyError(null);
                  }}
                  error={companyError ?? undefined}
                  placeholder="Apex Industrials"
                  leftIcon={<Building2 size={16} />}
                  required
                />

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="signupCountry" className="text-body-sm font-medium text-neutral-700 dark:text-zinc-300">
                    Country
                  </label>
                  <div className="relative">
                    <select
                      id="signupCountry"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full h-10 px-3 pr-8 rounded-lg border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-body-sm text-neutral-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                    >
                      <option value="IN">India (₹ INR / GST)</option>
                      <option value="US">United States ($ USD)</option>
                      <option value="GB">United Kingdom (£ GBP / VAT)</option>
                      <option value="EU">European Union (€ EUR / VAT)</option>
                      <option value="SG">Singapore (S$ SGD)</option>
                      <option value="AE">UAE (AED / VAT)</option>
                    </select>
                  </div>
                  <span className="text-[10px] text-neutral-500 dark:text-zinc-400">
                    Sets default currency and tax rules
                  </span>
                </div>
              </div>

              <div>
                <Input
                  id="signupPassword"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
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
                      className="text-neutral-400 hover:text-neutral-600 dark:text-zinc-500 dark:hover:text-zinc-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 rounded p-0.5 transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                  placeholder="At least 8 characters"
                  required
                />

                {/* Password strength bar */}
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-micro text-neutral-500 dark:text-zinc-400">
                      <span>Password strength:</span>
                      <span className="font-semibold text-neutral-700 dark:text-zinc-200">{strength.label}</span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-100 dark:bg-zinc-800 rounded-full overflow-hidden flex gap-0.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`flex-1 transition-all duration-300 ${
                            strength.score >= step ? strength.colorCls : "bg-transparent"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Consent checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer text-[12px] text-neutral-600 dark:text-zinc-400">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => {
                      setTermsAccepted(e.target.checked);
                      if (termsError) setTermsError(null);
                    }}
                    className="mt-0.5 rounded border-neutral-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4 shrink-0"
                    required
                  />
                  <span>
                    I agree to the{" "}
                    <Link to="/terms" target="_blank" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                      Terms of Service
                    </Link>
                    ,{" "}
                    <Link to="/privacy" target="_blank" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                      Privacy Policy
                    </Link>
                    , and{" "}
                    <Link to="/dpa" target="_blank" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                      DPA
                    </Link>
                    .
                  </span>
                </label>
                {termsError && (
                  <p className="text-micro text-rose-600 dark:text-rose-400 mt-1 font-medium">{termsError}</p>
                )}
              </div>

              <Button type="submit" disabled={submitting} className="w-full h-10 font-semibold text-body-sm rounded-md mt-2">
                {submitting ? "Creating workspace..." : "Create Workspace"}
              </Button>

              <div className="text-center pt-2">
                <span className="text-body-sm text-neutral-500 dark:text-zinc-400">
                  Already have a workspace?{" "}
                  <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                    Sign in
                  </Link>
                </span>
              </div>
            </form>
          )}
          </CardContent>
        </Card>

        {/* Footer Links */}
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
          <span>© 2026 Avarta AP Workspace</span>
        </div>
      </div>
    </div>
  );
}
