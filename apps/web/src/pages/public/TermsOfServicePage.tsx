import { FileText, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-zinc-950 text-neutral-900 dark:text-zinc-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8 bg-white dark:bg-zinc-900 p-8 sm:p-12 rounded-2xl border border-neutral-200/80 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-zinc-800 pb-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-body-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <ArrowLeft size={16} />
            <span>Back to Login</span>
          </Link>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <FileText size={20} />
            <span className="font-semibold text-body-sm">Avarta AP Workspace</span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
          <p className="text-caption text-neutral-500 dark:text-zinc-400">
            Last Updated: October 13, 2026 | Enterprise SaaS Master Subscription Terms
          </p>
        </div>

        <div className="space-y-6 text-body-sm leading-relaxed text-neutral-700 dark:text-zinc-300">
          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-zinc-100">1. Acceptance & Permitted Use</h2>
            <p>
              By accessing or using Avarta AP Workspace ("the Service"), your organization agrees to these Terms of Service. The Service is provided as an operational accounts payable workbench designed to complement your existing general ledger and ERP systems (such as QuickBooks, Xero, Tally Prime, SAP, and NetSuite).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-zinc-100">2. Customer Data & Intellectual Property</h2>
            <p>
              You retain all ownership, title, and intellectual property rights in and to all invoices, vendor catalogs, financial figures, purchase orders, and payment records uploaded or processed through the Service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-zinc-100">3. Financial Workflow & Human-in-the-Loop Governance</h2>
            <p>
              The Service employs machine learning and heuristic models to assist in data extraction and 3-way matching. In accordance with system policy:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>AI suggests, humans decide:</strong> Extracted fields, confidence bands, and matching proposals are recommendations that require explicit human review and authorization.</li>
              <li>Your designated approvers are solely responsible for executing final approval sign-offs and releasing payment batches to your financial institutions.</li>
              <li>Idempotency keys are mandatory for all disbursement and payment batch executions to guarantee single-effect processing.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-zinc-100">4. Service Level & Uptime Commitments</h2>
            <p>
              We target 99.9% uptime for core API and workstation access, excluding scheduled maintenance. Emergency security patches will be announced via system notifications.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-zinc-100">5. Termination & Data Portability</h2>
            <p>
              Upon termination or cancellation of your subscription, you may export all historical general ledger entries, audit timelines, and original invoice PDFs via our immutable Archive Vault. In accordance with our non-negotiable compliance rules, records are never abruptly purged without structured export.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-zinc-100">6. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India and applicable commercial statutes, without regard to conflict of law principles.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
