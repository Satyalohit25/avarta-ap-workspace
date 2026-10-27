import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, FileQuestion, Home, Layers } from "lucide-react";
import { Button } from "../components/ui/Button";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-12 h-12 rounded-md bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 flex items-center justify-center mb-6 text-neutral-500 dark:text-zinc-400">
        <FileQuestion size={28} strokeWidth={1.5} />
      </div>

      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-700 dark:text-zinc-300 font-mono text-caption font-medium mb-3">
        <span>ERROR 404</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-zinc-50 mb-2">
        Page not found
      </h1>

      <p className="text-body text-neutral-600 dark:text-zinc-400 max-w-md mb-8">
        The workspace location or resource you requested doesn't exist, has been moved, or requires elevated authorization.
      </p>

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

        <Link to="/invoices">
          <Button variant="ghost" className="gap-2">
            <Layers size={15} />
            <span>Invoices Queue</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
