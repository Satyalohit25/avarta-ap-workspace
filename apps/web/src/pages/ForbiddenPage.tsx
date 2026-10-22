import { Link, useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, Home, Mail } from "lucide-react";
import { Button } from "../components/ui/Button";

export default function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center mb-6 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 shadow-inner">
        <ShieldAlert size={36} strokeWidth={1.5} />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-mono text-caption font-semibold mb-3">
        <span>ERROR 403 • ACCESS RESTRICTED</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-zinc-50 mb-2">
        Permission Required
      </h1>

      <p className="text-body text-neutral-600 dark:text-zinc-400 max-w-md mb-6 leading-relaxed">
        Your current role does not have permission to access this screen or perform this operation.
        Access can be granted by an <strong>Administrator</strong> in Settings → Team & Roles.
      </p>

      <div className="p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-900 max-w-sm w-full mb-8 text-left space-y-2">
        <div className="text-micro font-semibold text-neutral-500 uppercase tracking-wider">
          Workspace Administrators
        </div>
        <div className="flex items-center justify-between text-caption">
          <span className="font-medium text-neutral-800 dark:text-zinc-200">Tenant Administrator</span>
          <a
            href="mailto:admin@company.com?subject=Access%20Request%20for%20Avarta%20AP"
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
          >
            <Mail size={13} />
            <span>Request Access</span>
          </a>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="gap-2"
        >
          <ArrowLeft size={15} />
          <span>Go Back</span>
        </Button>

        <Link to="/overview">
          <Button variant="primary" className="gap-2">
            <Home size={15} />
            <span>Return to Overview</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
