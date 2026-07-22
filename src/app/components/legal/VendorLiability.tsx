import React from 'react';
import {
  ArrowLeft,
  ShieldAlert,
  Scale,
  FileText,
  AlertOctagon,
  ShieldCheck,
  Building2,
  Truck,
  HelpCircle,
} from 'lucide-react';

interface VendorLiabilityProps {
  onBack?: () => void;
  onContactSupport?: () => void;
  className?: string;
}

export const VendorLiability: React.FC<VendorLiabilityProps> = ({
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
                <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                  Legal Policy
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Last Updated: July 2026
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                Vendor Liability & Indemnification Policy
              </h1>
            </div>
          </div>

          <div className="hidden sm:flex sm:items-center sm:gap-3">
            <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Binding Terms
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Banner */}
        <div className="mb-8 rounded-2xl bg-gradient-to-br from-slate-900 via-rose-950 to-indigo-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 text-rose-400">
                <ShieldAlert className="h-5 w-5" />
                <span className="text-xs font-semibold tracking-wider uppercase">
                  Risk Allocation Framework
                </span>
              </div>
              <h2 className="text-2xl font-extrabold sm:text-3xl">
                Merchant Liability & Risk Standard
              </h2>
              <p className="text-sm text-slate-200 leading-relaxed sm:text-base">
                This document outlines the allocation of risk, indemnification responsibilities, insurance requirements, and liability caps governing vendor operations on our marketplace platform.
              </p>
            </div>
            <div className="shrink-0">
              <div className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-200 backdrop-blur-sm">
                <Scale className="h-4 w-4 text-rose-400" />
                Legal Framework
              </div>
            </div>
          </div>
        </div>

        {/* Section Cards Container */}
        <div className="space-y-6">
          {/* Section 1 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                1. General Product & Service Liability
              </h3>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                Vendors retain primary liability for all products, goods, or prepared food items listed, packaged, and fulfilled through the platform. The platform serves as a digital intermediary and expressly disclaims direct liability for vendor manufacturing, food preparation quality, labeling errors, or product defects.
              </p>
              <p>
                Vendors must ensure that all items offered comply with local consumer protection laws, health and safety ordinances, labeling requirements, and ingredient/allergen disclosure regulations.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="rounded-lg bg-rose-50 p-2.5 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                2. Vendor Indemnification Obligations
              </h3>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                To the fullest extent permitted by law, vendors agree to defend, indemnify, and hold harmless the Platform, its affiliates, directors, employees, and logistics partners against any third-party claims, losses, damages, fines, or legal expenses arising from:
              </p>
              <ul className="mt-2 space-y-2 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside leading-relaxed bg-slate-50/60 p-4 rounded-xl border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800">
                <li>Personal injury, illness, or property damage resulting from vendor products</li>
                <li>Misrepresentation of product ingredients, expiration dates, or safety hazards</li>
                <li>Breach of third-party intellectual property or trade secret rights</li>
                <li>Failure to maintain mandatory business permits, health certificates, or licenses</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                <AlertOctagon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                3. Limitation of Platform Liability
              </h3>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                In no event shall the Platform or its affiliates be liable to any vendor for indirect, incidental, consequential, special, or punitive damages (including loss of profit, business interruption, or loss of revenue) arising out of or in connection with the platform services.
              </p>
              <p>
                The total cumulative aggregate liability of the Platform to any vendor for direct damages shall be limited to the total merchant commission fees collected by the Platform from that vendor during the <strong>three (3) calendar months</strong> preceding the incident.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <Truck className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                4. Transit Damage & Logistics Liability Division
              </h3>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                Liability for order damage during fulfillment is determined by the point of occurrence:
              </p>
              <div className="grid gap-4 sm:grid-cols-2 mt-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800/80 dark:bg-slate-800/40">
                  <div className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1">
                    Vendor Fault
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Improper packaging, unsealed food containers, missing items, or expired product handed over to delivery personnel.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800/80 dark:bg-slate-800/40">
                  <div className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
                    Logistics / Platform Fault
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Accidents in transit, courier tampering, mishandling post-handover, or severe delivery delays exceeding logistics SLAs.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <Building2 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                5. Mandatory Insurance Requirements
              </h3>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                Depending on merchant category and gross transaction volume, the Platform may require high-volume vendors to maintain commercial general liability insurance or commercial food safety liability coverage.
              </p>
              <p>
                Proof of active insurance policies must be uploaded upon request via the Vendor Portal compliance dashboard.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="rounded-lg bg-purple-50 p-2.5 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                6. Legal & Compliance Contact
              </h3>
            </div>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Need clarification on vendor liability rules or have insurance verification questions?
              </p>
              <button
                type="button"
                onClick={onContactSupport}
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                Contact Legal Team
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default VendorLiability;