import { Shield, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-zinc-950 text-neutral-900 dark:text-zinc-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8 bg-white dark:bg-zinc-900 p-8 sm:p-12 rounded-lg border border-neutral-200/80 dark:border-zinc-800">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-zinc-800 pb-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-body-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <ArrowLeft size={16} />
            <span>Back to Login</span>
          </Link>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Shield size={20} />
            <span className="font-semibold text-body-sm">Avarta AP Workspace</span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-caption text-neutral-500 dark:text-zinc-400">
            Last Updated: October 13, 2026 | Effective for Avarta AP Workspace Customers & Tenants
          </p>
        </div>

        <div className="space-y-6 text-body-sm leading-relaxed text-neutral-700 dark:text-zinc-300">
          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-zinc-100">1. Overview & Data Sovereignty</h2>
            <p>
              Avarta AP Workspace ("we", "our", or "the Platform") provides accounts payable workflow software for small and medium-sized enterprises. We are committed to complete transparency, tenant isolation, and strict compliance with the Indian Digital Personal Data Protection (DPDP) Act, EU General Data Protection Regulation (GDPR), and applicable privacy laws.
            </p>
            <p>
              Under our <strong>Bring Your Own Database (BYODB)</strong> and <strong>Bring Your Own Key (BYOK)</strong> models, enterprise customers retain sovereign ownership and control over where their invoice images, financial records, and vendor details reside.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-zinc-100">2. Information We Process</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account Credentials:</strong> Name, work email address, hashed passwords, and assigned organizational role (Administrator, Finance Manager, Finance Executive, Approver, Read Only).</li>
              <li><strong>Invoice & Commercial Documents:</strong> Vendor invoices, purchase orders, goods receipt notes (GRNs), bill amounts, tax identifiers (GSTIN/EIN/VAT), and payment terms.</li>
              <li><strong>Audit & Security Records:</strong> Immutable chronological logs recording actor IDs, IP addresses, timestamps, and workflow transitions.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-zinc-100">3. Artificial Intelligence & Document Extraction</h2>
            <p>
              <strong>We do not use your proprietary invoices or business transactions to train public artificial intelligence models.</strong>
            </p>
            <p>
              When Document AI extraction runs:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>If you provide a BYOK key (Google Gemini, OpenAI, or AWS Textract), your documents are processed strictly under your existing cloud agreement with that provider.</li>
              <li>Zero customer data is shared with unauthorized third parties.</li>
              <li>In accordance with our core invariant, <em>AI suggests, humans decide</em>: AI predictions never execute financial disbursements or alter records without explicit human confirmation.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-zinc-100">4. Security & Cryptographic Protection</h2>
            <p>
              All customer credentials and external API keys are encrypted at rest using <strong>AES-256-GCM</strong> authenticated encryption. All web traffic is strictly transmitted over HTTPS with TLS 1.3, protected by Content Security Policy (CSP), HTTP Strict Transport Security (HSTS), and X-Frame-Options clickjacking defense.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-zinc-100">5. Tenant Isolation & Data Retention</h2>
            <p>
              Every database query enforces multi-tenant scoping matching the authenticated session. Customer data is retained during the active subscription period and may be archived or exported in standard CSV, JSON, and PDF audit bundles upon request.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-zinc-100">6. Contact & Data Protection Officer</h2>
            <p>
              If you have inquiries regarding your personal data or wish to exercise statutory data rights under the DPDP Act or GDPR, contact our security office at <code>privacy@avarta.dev</code>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
