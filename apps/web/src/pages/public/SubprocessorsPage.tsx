import { Server, ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface SubprocessorEntry {
  name: string;
  role: string;
  location: string;
  dataProcessed: string;
  securityUrl: string;
}

const SUBPROCESSORS: SubprocessorEntry[] = [
  {
    name: "Amazon Web Services (AWS)",
    role: "Cloud Infrastructure & S3 Document Storage",
    location: "Mumbai, India (ap-south-1) / US East (us-east-1)",
    dataProcessed: "Encrypted invoice PDFs, application servers, backups",
    securityUrl: "https://aws.amazon.com/compliance/",
  },
  {
    name: "Supabase / PostgreSQL",
    role: "Managed Relational Database Services",
    location: "Singapore / Frankfurt / US East",
    dataProcessed: "Structured metadata, workflow state, audit trails",
    securityUrl: "https://supabase.com/security",
  },
  {
    name: "Cloudflare, Inc.",
    role: "Edge CDN, DDoS Mitigation & WAF Protection",
    location: "Global Edge Network",
    dataProcessed: "HTTP request metadata, transient TLS termination",
    securityUrl: "https://www.cloudflare.com/trust-hub/",
  },
  {
    name: "Stripe / Razorpay",
    role: "Subscription Billing & Payment Gateway",
    location: "United States / India",
    dataProcessed: "Subscription status, organization billing details (No raw card data touches our servers)",
    securityUrl: "https://stripe.com/privacy",
  },
  {
    name: "Resend / Amazon SES",
    role: "Transactional Email & Dunning Delivery",
    location: "United States / Ireland",
    dataProcessed: "Work emails, invoice alert notifications, approval links",
    securityUrl: "https://resend.com/security",
  },
];

export default function SubprocessorsPage() {
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
            <Server size={20} />
            <span className="font-semibold text-body-sm">Avarta AP Workspace</span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Third-Party Subprocessor Registry</h1>
          <p className="text-caption text-neutral-500 dark:text-zinc-400">
            Last Updated: October 13, 2026 | Compliant with Article 28 GDPR & DPDP Act 2023
          </p>
        </div>

        <div className="space-y-6 text-body-sm leading-relaxed text-neutral-700 dark:text-zinc-300">
          <p>
            To deliver highly reliable, secure, and low-latency accounts payable workflows, Avarta AP Workspace engages third-party infrastructure and service subprocessors. Each entity undergoes rigorous security assessment and is bound by Data Processing Agreements requiring SOC 2 or ISO 27001 equivalence.
          </p>

          <div className="overflow-x-auto border border-neutral-200 dark:border-zinc-800 rounded-xl">
            <table className="w-full text-left text-body-sm border-collapse">
              <thead>
                <tr className="bg-neutral-100/70 dark:bg-zinc-800/60 text-neutral-900 dark:text-zinc-100 font-semibold border-b border-neutral-200 dark:border-zinc-800">
                  <th className="p-3.5">Subprocessor</th>
                  <th className="p-3.5">Function</th>
                  <th className="p-3.5">Hosting Region</th>
                  <th className="p-3.5">Compliance Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-zinc-800">
                {SUBPROCESSORS.map((sp) => (
                  <tr key={sp.name} className="hover:bg-neutral-50/50 dark:hover:bg-zinc-800/30">
                    <td className="p-3.5 font-medium text-neutral-900 dark:text-zinc-100">{sp.name}</td>
                    <td className="p-3.5 text-neutral-600 dark:text-zinc-300">{sp.role}</td>
                    <td className="p-3.5 text-caption font-mono text-neutral-500 dark:text-zinc-400">{sp.location}</td>
                    <td className="p-3.5">
                      <a
                        href={sp.securityUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 text-caption hover:underline"
                      >
                        <span>Security Trust</span>
                        <ExternalLink size={12} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="space-y-2 pt-4">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-zinc-100">Subprocessor Update Notifications</h2>
            <p>
              Subscribers may subscribe to subprocessor notifications by emailing <a href="mailto:subprocessors@avarta.dev" className="text-indigo-600 dark:text-indigo-400 underline">subprocessors@avarta.dev</a>. Any material changes will be announced minimum 30 days in advance.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
