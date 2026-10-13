import { FileText, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function DpaPage() {
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
          <h1 className="text-3xl font-bold tracking-tight">Data Processing Agreement (DPA)</h1>
          <p className="text-caption text-neutral-500 dark:text-zinc-400">
            Last Updated: October 13, 2026 | Standard Contractual Terms for Enterprise Customers
          </p>
        </div>

        <div className="space-y-6 text-body-sm leading-relaxed text-neutral-700 dark:text-zinc-300">
          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-zinc-100">1. Scope and Relationship</h2>
            <p>
              This Data Processing Agreement ("DPA") governs the processing of customer personal and financial data by Avarta AP Workspace in providing accounts payable workflow services. Customer is the Data Controller, and Avarta AP Workspace acts solely as the Data Processor under GDPR Article 28, the Indian DPDP Act 2023, and applicable data protection legislation.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-zinc-100">2. Technical & Organizational Security Measures (TOMs)</h2>
            <p>Processor implements robust enterprise safeguards including:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-neutral-50 dark:bg-zinc-800/50 border border-neutral-200/60 dark:border-zinc-700/60">
                <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" size={16} />
                <span className="text-caption"><strong>AES-256-GCM Encryption:</strong> Master encryption at rest for customer secrets and tokens.</span>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-neutral-50 dark:bg-zinc-800/50 border border-neutral-200/60 dark:border-zinc-700/60">
                <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" size={16} />
                <span className="text-caption"><strong>Database-Level Isolation:</strong> Strict multi-tenant query filters enforced on every database transaction.</span>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-neutral-50 dark:bg-zinc-800/50 border border-neutral-200/60 dark:border-zinc-700/60">
                <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" size={16} />
                <span className="text-caption"><strong>TLS 1.3 In Transit:</strong> All HTTP traffic strictly forced over HTTPS with HSTS preloading.</span>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-neutral-50 dark:bg-zinc-800/50 border border-neutral-200/60 dark:border-zinc-700/60">
                <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" size={16} />
                <span className="text-caption"><strong>Immutable Audit Trails:</strong> Every workflow advance and sensitive action recorded with actor UUID & timestamp.</span>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-zinc-100">3. Subprocessors</h2>
            <p>
              Customer grants general written authorization to Processor to engage subprocessors for hosting, caching, and infrastructure. Processor maintains an up-to-date <Link to="/subprocessors" className="text-indigo-600 dark:text-indigo-400 underline font-medium">Subprocessor Registry</Link> and provides minimum 30 days prior notice before onboarding new infrastructure subprocessors.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-zinc-100">4. Incident Notification & Breach Response</h2>
            <p>
              In the event of a confirmed Personal Data Breach impacting Customer data, Processor shall notify Customer without undue delay and in any event within <strong>72 hours</strong> of becoming aware of the incident, providing details of the breach, affected records, and remediation measures taken.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-zinc-100">5. Data Subject Rights & Deletion</h2>
            <p>
              Processor provides self-serve capabilities for export and archiving. Upon contract termination or formal deletion request, Processor will securely deprovision tenant records within 30 days, retaining only statutory accounting logs required by applicable tax authorities.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-zinc-100">6. Contact Data Protection Officer</h2>
            <p>
              For DPA counter-signing, standard contractual clauses (SCCs), or compliance inquiries:
              <br />
              <strong>Email:</strong> <a href="mailto:dpo@avarta.dev" className="text-indigo-600 dark:text-indigo-400 underline">dpo@avarta.dev</a> | <strong>Legal:</strong> <a href="mailto:legal@avarta.dev" className="text-indigo-600 dark:text-indigo-400 underline">legal@avarta.dev</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
