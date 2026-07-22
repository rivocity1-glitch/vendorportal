import React, { useState } from 'react';
import {
  ArrowLeft,
  Mail,
  Clock,
  MessageSquare,
  Copy,
  Check,
  ShieldCheck,
  HelpCircle,
  FileText,
  AlertCircle,
  Headphones,
} from 'lucide-react';

interface VendorContactProps {
  onBack?: () => void;
  className?: string;
}

export const VendorContact: React.FC<VendorContactProps> = ({
  onBack,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const supportEmail = 'rivo.cityhelp1@gmail.com';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(supportEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200 ${className}`}
    >
      {/* Premium Header */}
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
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
                  Partner Support
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Help Desk & Contact
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                Vendor Support & Communication
              </h1>
            </div>
          </div>

          <div className="hidden sm:flex sm:items-center sm:gap-3">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Support Active
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Banner */}
        <div className="mb-8 rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 text-indigo-300">
                <Headphones className="h-5 w-5" />
                <span className="text-xs font-semibold tracking-wider uppercase">
                  Official Merchant Assistance
                </span>
              </div>
              <h2 className="text-2xl font-extrabold sm:text-3xl">
                We&apos;re Here to Help Your Business
              </h2>
              <p className="text-sm text-indigo-100/80 leading-relaxed sm:text-base">
                Get direct assistance for order issues, payout inquiries, dashboard troubleshooting, store menu updates, and compliance support.
              </p>
            </div>
            <div className="shrink-0">
              <div className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-3 text-xs font-medium text-indigo-200 backdrop-blur-sm">
                <Clock className="h-4 w-4 text-indigo-400" />
                Avg. Response: Within 24 Hrs
              </div>
            </div>
          </div>
        </div>

        {/* Primary Contact Card */}
        <div className="mb-6 rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-indigo-50 p-3.5 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 shrink-0">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Official Vendor Support
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  Direct Email Channel
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  Send us your queries, order dispute documents, or account adjustment requests.
                </p>
                <div className="mt-3 inline-flex items-center gap-2 text-base font-semibold text-indigo-600 dark:text-indigo-400">
                  <a
                    href={`mailto:${supportEmail}`}
                    className="hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                  >
                    {supportEmail}
                  </a>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
              <a
                href={`mailto:${supportEmail}`}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                <Mail className="h-4 w-4" />
                Send Email
              </a>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Copy email to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="space-y-6">
          {/* Support Information & Hours */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Business Hours Card */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Support Operating Hours
                </h3>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <p className="leading-relaxed">
                  Our merchant support team reviews and resolves ticket submissions during standard operational windows:
                </p>
                <ul className="space-y-2 text-xs bg-slate-50/60 p-4 rounded-xl border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800">
                  <li className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                    <span className="font-medium">Monday &ndash; Saturday</span>
                    <span className="font-semibold text-slate-900 dark:text-white">9:00 AM &ndash; 9:00 PM IST</span>
                  </li>
                  <li className="flex justify-between items-center text-slate-700 dark:text-slate-300 border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
                    <span className="font-medium">Sunday & Public Holidays</span>
                    <span className="font-semibold text-slate-900 dark:text-white">10:00 AM &ndash; 6:00 PM IST</span>
                  </li>
                  <li className="flex justify-between items-center text-slate-700 dark:text-slate-300 border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
                    <span className="font-medium">Live Order Emergencies</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">24/7 Portal Priority</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* Assistance Scope Card */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Common Query Categories
                </h3>
              </div>
              <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                  To ensure faster processing, please mention your Vendor ID and relevant Order ID in the subject line for:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-900 dark:text-white block">Payouts & Settlements</span>
                    Bank account changes, missing settlements, fee breakdowns.
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-900 dark:text-white block">Order Disputes</span>
                    Refund appeals, transit damage claims, customer disputes.
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-900 dark:text-white block">Catalog & Pricing</span>
                    Menu item approval, inventory synchronization, stock updates.
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-900 dark:text-white block">Legal & Compliance</span>
                    FSSAI/GST license updates, contract renewal, policy verification.
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Quick Help Guidelines */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="rounded-lg bg-purple-50 p-2.5 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Tips for Expedited Resolution
              </h3>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/30">
                <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white mb-1">
                  <FileText className="h-4 w-4 text-indigo-500" />
                  Include Vendor ID
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Always provide your registered merchant business name and account ID in your email header.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/30">
                <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white mb-1">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Attach Photos/Invoices
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Attach dispatch weight slips, packaging proof, or billing statements directly to your email.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/30">
                <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white mb-1">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Single Email Thread
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Reply within the same email thread for ongoing cases to avoid duplicating support tickets.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default VendorContact;