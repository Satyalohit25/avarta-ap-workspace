import { CreditCard, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function RefundPolicyPage() {
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
            <CreditCard size={20} />
            <span className="font-semibold text-body-sm">Avarta AP Workspace</span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Cancellation & Refund Policy</h1>
          <p className="text-caption text-neutral-500 dark:text-zinc-400">
            Last Updated: October 13, 2026 | Enterprise SaaS Subscription Terms
          </p>
        </div>

        <div className="space-y-6 text-body-sm leading-relaxed text-neutral-700 dark:text-zinc-300">
          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-zinc-100">1. Subscription Cancellation</h2>
            <p>
              You may cancel your monthly or annual subscription at any time directly through the <strong>Settings → Subscription & Usage Quotas</strong> tab or by contacting <a href="mailto:billing@avarta.dev" className="text-indigo-600 dark:text-indigo-400 underline">billing@avarta.dev</a>.
            </p>
            <p>
              Upon cancellation, your subscription remains active until the end of the current paid billing cycle. You will not be charged for subsequent billing periods.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-zinc-100">2. Refund Eligibility & 14-Day Guarantee</h2>
            <p>
              We stand behind the performance of Avarta AP Workspace:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Initial 14-Day Money-Back Guarantee:</strong> New subscribers to Starter or Growth plans may request a full 100% refund within 14 calendar days of first subscription if our 3-way matching or OCR ingestion fails to meet their operational requirements.</li>
              <li><strong>Service Level Downtime Credits:</strong> If our availability drops below our 99.9% uptime SLA during any calendar month, subscribers receive pro-rated service credits credited toward the following cycle.</li>
              <li><strong>Enterprise Agreements:</strong> Enterprise Sovereignty plans follow custom terms set forth in their Master Services Agreement (MSA).</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-zinc-100">3. Data Export Upon Cancellation</h2>
            <p>
              In accordance with our core non-negotiable rule, <strong>nothing is abruptly deleted</strong>. You will have full access for 30 calendar days following cancellation to export all general ledger records, audit logs, and invoice attachments via the immutable Archive Vault.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-zinc-100">4. Processing Time & Support Contact</h2>
            <p>
              Approved refunds are returned to the original payment method (Credit Card, Net Banking, or UPI) within 5–7 business days via Stripe or Razorpay.
            </p>
            <p>
              For inquiries regarding invoices, GST credit notes, or refund status, email <a href="mailto:billing@avarta.dev" className="text-indigo-600 dark:text-indigo-400 underline font-medium">billing@avarta.dev</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
