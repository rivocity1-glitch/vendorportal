import React from 'react';
import {
  ArrowLeft,
  AlertTriangle,
  Scale,
  ShieldAlert,
  Server,
  Building2,
  FileCheck,
  HelpCircle,
} from 'lucide-react';

interface VendorDisclaimerProps {
  onBack?: () => void;
  onContactSupport?: () => void;
  className?: string;
}

export const VendorDisclaimer: React.FC<VendorDisclaimerProps> = ({
  onBack,
  onContactSupport,
  className = '',
}) => {
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
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                  Legal Disclaimer
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Last Updated: July 2026
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                Vendor Platform Disclaimer
              </h1>
            </div>
          </div>

          <div className="hidden sm:flex sm:items-center sm:gap-3">
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 ring-4 ring-amber-500/20" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Standard Terms
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Banner */}
        <div className="mb-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-xs font-semibold tracking-wider uppercase">
                  Limitation of Liability
                </span>
              </div>
              <h2 className="text-2xl font-extrabold sm:text-3xl">
                Important Legal & Operational Notices
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed sm:text-base">
                This legal notice defines the scope of platform liability, operational guarantees, independent contractor relationships, and merchant responsibilities across all platform services.
              </p>
            </div>
            <div className="shrink-0">
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-xs font-medium text-slate-300 backdrop-blur-sm">
                <Scale className="h-4 w-4 text-amber-400" />
                Merchant Agreement Addendum
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer Cards */}
        <div className="space-y-6">
          {/* Card 1 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                <Building2 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                1. Marketplace Intermediary Status
              </h3>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                The Platform operates strictly as a digital marketplace intermediary connecting third-party vendor partners with consumers. The Platform does not assume ownership of, manufacture, inspect, or guarantee the quality, safety, or legality of items listed by vendors.
              </p>
              <p>
                Vendors remain sole product owners and service providers responsible for regulatory compliance, food safety, inventory management, tax collection, and product accuracy.
              </p>
            </div>
          </section>

          {/* Card 2 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <Server className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                2. Platform Availability & Technical Services
              </h3>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                While we strive for maximum uptime and seamless merchant portal tools, all software, dispatch connections, and API services are provided on an <strong>&quot;AS IS&quot;</strong> and <strong>&quot;AS AVAILABLE&quot;</strong> basis without warranties of any kind.
              </p>
              <p>
                We do not guarantee uninterrupted operational availability, error-free order routing, or immediate resolution of temporary network connectivity issues.
              </p>
            </div>
          </section>

          {/* Card 3 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="rounded-lg bg-rose-50 p-2.5 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                3. Warranties & Revenue Projections Disclaimer
              </h3>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                Any estimates, sales forecasts, or earning projections communicated during merchant onboarding or in promotional materials are non-binding estimates. Actual sales volume depends on consumer demand, pricing competitive factors, geographic location, and vendor fulfillment performance.
              </p>
              <p>
                The Platform disclaims all implied warranties including, but not limited to, fitness for a particular commercial purpose, merchantability, and non-infringement.
              </p>
            </div>
          </section>

          {/* Card 4 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                <FileCheck className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                4. Compliance, Licenses & Permits
              </h3>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                Vendor partners are solely responsible for obtaining and maintaining all mandatory municipal licenses, health permits, tax registrations, and regulatory authorizations required to offer their products or services.
              </p>
              <p>
                Failure to maintain valid operational documentation may result in immediate suspension of vendor listing privileges without prior notice.
              </p>
            </div>
          </section>

          {/* Card 5 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="rounded-lg bg-purple-50 p-2.5 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                5. Legal Questions & Merchant Legal Support
              </h3>
            </div>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                If you have legal inquiries regarding platform policies or merchant terms of service, reach out to our legal compliance team.
              </p>
              <button
                type="button"
                onClick={onContactSupport}
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Contact Legal Counsel
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default VendorDisclaimer;