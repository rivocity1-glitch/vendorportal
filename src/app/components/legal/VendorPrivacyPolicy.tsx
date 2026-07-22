import React from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  FileText,
  Mail,
  Building2,
  Database,
  CreditCard,
  Smartphone,
  ShoppingBag,
  Receipt,
  MessageSquare,
  HelpCircle,
  Eye,
  Layers,
  CheckCircle2,
} from 'lucide-react';

export interface PrivacySection {
  title: string;
  content: string[];
}

export const vendorPrivacyPolicyContent: PrivacySection[] = [
  {
    title: "1. Introduction",
    content: [
      "Rivo Network Systems values the privacy and corporate data integrity of our merchant partners. This Vendor Privacy Policy describes how we capture, protect, process, and retain your data structures.",
      "This framework strictly isolates merchant parameters and handles data associated exclusively with business entities, store owners, and managers using the Rivo Vendor Portal."
    ]
  },
  {
    title: "2. Information We Collect",
    content: [
      "We collect data essential to confirm your retail legitimacy, process financial settlements, optimize catalog layouts, and safeguard communication channels from security anomalies."
    ]
  },
  {
    title: "3. Business Information",
    content: [
      "We log official legal entities names, registered commercial addresses, tax identification parameters (GST/VAT/EIN), operational contact structures, and corporate registry details."
    ]
  },
  {
    title: "4. Identity Verification Documents",
    content: [
      "To comply with anti-fraud frameworks, we collect uploaded identity documentation of principal store operators, managers, or authorized signatories, including corporate incorporation certificates."
    ]
  },
  {
    title: "5. Bank Details",
    content: [
      "To complete recurring automated payouts, we collect and store encrypted corporate bank routing keys, account configurations, financial institution branches, and settlement currency preferences."
    ]
  },
  {
    title: "6. Store Information",
    content: [
      "We record details concerning physical operational layout metrics, geographical coordinates, operational hours, product lists, inventory allocations, pricing histories, and brand logo elements."
    ]
  },
  {
    title: "7. Device Information",
    content: [
      "We trace incoming terminal connections, capturing specialized hardware metrics, diagnostic operating system versions, browser footprints, portal log data, and authorization token IDs."
    ]
  },
  {
    title: "8. Order Information",
    content: [
      "We track volume frequencies, order acceptance latencies, package preparation timestamps, cancellation tracking parameters, item modifications, and overall fulfillment scores."
    ]
  },
  {
    title: "9. Payment Information",
    content: [
      "We log total platform handling fees, collected commissions, subscription billing historical logs, settlement batch distributions, adjustments, and reconciliation items."
    ]
  },
  {
    title: "10. Communication Records",
    content: [
      "We maintain logs of standard operational tickets, diagnostic interactions, phone assistance files, and updates exchanged with our administrative merchant support networks."
    ]
  },
  {
    title: "11. How We Use Information",
    content: [
      "To evaluate store profiles, initialize secure portal systems, calculate accurate operational payout cycles, provide notifications of system milestones, mitigate system vulnerabilities, and meet regional corporate legal reporting codes."
    ]
  },
  {
    title: "12. Sharing Information",
    content: [
      "Merchant data is shared with secure payment gateways for automated payouts, compliance auditing regulators, third-party logistics integrations assigned to your coordinate matrices, and our unified infrastructure host engines.",
      "We never sell proprietary vendor metrics or inventory pipeline datasets to competitor retail aggregators."
    ]
  },
  {
    title: "13. Data Security",
    content: [
      "All vendor parameters are guarded utilizing advanced secure transport encryptions (TLS/SSL), automated system access policies, tokenized entry points, and isolated database architecture frameworks."
    ]
  },
  {
    title: "14. Data Retention",
    content: [
      "We store operational merchant data structures as long as your store layout remains registered on the system. When decommissioned, historical bookkeeping metadata is retained to comply with legal auditing windows."
    ]
  },
  {
    title: "15. Vendor Rights",
    content: [
      "Store owners can adjust operational listings, edit specific profile metadata, change localized banking records, or submit requests to pull a complete archival profile of collected enterprise details."
    ]
  },
  {
    title: "16. Cookies",
    content: [
      "The Vendor Portal utilizes security cookies and performance tracking storage strictly to remember active session access parameters, store UI configurations, and accelerate operational script speeds."
    ]
  },
  {
    title: "17. Updates to Policy",
    content: [
      "We may update this privacy structure periodically to account for new security methods or regulatory guidelines. Modifications will be signaled via dashboard banners or explicit updates."
    ]
  },
  {
    title: "18. Contact",
    content: [
      "For localized privacy management issues or data system audits, please route your query through the internal portal help system or send direct communications to merchant-privacy@rivo.city."
    ]
  }
];

// Helper to map dynamic section icons based on title
const getSectionIcon = (index: number) => {
  const icons = [
    <FileText key="1" className="h-5 w-5" />,
    <ShieldCheck key="2" className="h-5 w-5" />,
    <Building2 key="3" className="h-5 w-5" />,
    <Eye key="4" className="h-5 w-5" />,
    <CreditCard key="5" className="h-5 w-5" />,
    <Layers key="6" className="h-5 w-5" />,
    <Smartphone key="7" className="h-5 w-5" />,
    <ShoppingBag key="8" className="h-5 w-5" />,
    <Receipt key="9" className="h-5 w-5" />,
    <MessageSquare key="10" className="h-5 w-5" />,
    <CheckCircle2 key="11" className="h-5 w-5" />,
    <Database key="12" className="h-5 w-5" />,
    <Lock key="13" className="h-5 w-5" />,
    <FileText key="14" className="h-5 w-5" />,
    <ShieldCheck key="15" className="h-5 w-5" />,
    <Layers key="16" className="h-5 w-5" />,
    <HelpCircle key="17" className="h-5 w-5" />,
    <Mail key="18" className="h-5 w-5" />,
  ];
  return icons[index] || <FileText className="h-5 w-5" />;
};

interface VendorPrivacyPolicyProps {
  onBack?: () => void;
  onContactSupport?: () => void;
  className?: string;
}

export const VendorPrivacyPolicyContent: React.FC<VendorPrivacyPolicyProps> = ({
  onBack,
  onContactSupport,
  className = '',
}) => {
  return (
    <div
      className={`min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200 ${className}`}
    >
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                  Data Governance
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Last Updated: July 2026
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                Vendor Privacy Policy
              </h1>
            </div>
          </div>

          <div className="hidden sm:flex sm:items-center sm:gap-3">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Isolated Enterprise Data
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Banner */}
        <div className="mb-8 rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-950 to-indigo-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 text-emerald-400">
                <Lock className="h-5 w-5" />
                <span className="text-xs font-semibold tracking-wider uppercase">
                  Enterprise Data Protection
                </span>
              </div>
              <h2 className="text-2xl font-extrabold sm:text-3xl">
                Merchant Data Safety & Governance
              </h2>
              <p className="text-sm text-slate-200 leading-relaxed sm:text-base">
                How Rivo Network Systems captures, stores, encrypts, and handles business parameters and corporate entity records across the Vendor Portal.
              </p>
            </div>
            <div className="shrink-0">
              <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-200 backdrop-blur-sm">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                SSL/TLS Encrypted Storage
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Section Cards */}
        <div className="space-y-6">
          {vendorPrivacyPolicyContent.map((section, idx) => (
            <section
              key={idx}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                  {getSectionIcon(idx)}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {section.title}
                </h3>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {section.content.map((paragraph, pIdx) => (
                  <p key={pIdx}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}

          {/* Action Footer Card */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Have specific privacy inquiries or need to submit a data audit request?
              </p>
              <button
                type="button"
                onClick={
                  onContactSupport ||
                  (() => {
                    window.location.href = 'mailto:merchant-privacy@rivo.city';
                  })
                }
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                Contact Data Protection Officer
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default VendorPrivacyPolicyContent;