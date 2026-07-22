import React from 'react';
import {
  ArrowLeft,
  Store,
  Target,
  Eye,
  Zap,
  ShieldCheck,
  Building2,
  CheckCircle2,
  HeartHandshake,
  Globe,
} from 'lucide-react';

interface VendorAboutProps {
  onBack?: () => void;
  className?: string;
  version?: string;
  appTitle?: string;
}

export const VendorAbout: React.FC<VendorAboutProps> = ({
  onBack,
  className = '',
  version = '2.4.0',
  appTitle = 'Rivo Vendor Portal',
}) => {
  const currentYear = new Date().getFullYear();

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
                  Company Overview
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  v{version}
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                About Rivo
              </h1>
            </div>
          </div>

          <div className="hidden sm:flex sm:items-center sm:gap-3">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Hyperlocal Network
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Banner */}
        <div className="mb-8 rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 text-indigo-300">
                <Store className="h-5 w-5" />
                <span className="text-xs font-semibold tracking-wider uppercase">
                  Empowering Local Commerce
                </span>
              </div>
              <h2 className="text-2xl font-extrabold sm:text-3xl">
                The Next Generation Hyperlocal Platform
              </h2>
              <p className="text-sm text-indigo-100/80 leading-relaxed sm:text-base">
                Rivo connects local neighborhood businesses with nearby consumers through high-speed commerce technology, smart logistics integration, and transparent merchant tooling.
              </p>
            </div>
            <div className="shrink-0">
              <div className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-3 text-xs font-medium text-indigo-200 backdrop-blur-sm">
                <Globe className="h-4 w-4 text-indigo-400" />
                Hyperlocal Mesh Engine
              </div>
            </div>
          </div>
        </div>

        {/* Core Vision & Mission Cards */}
        <div className="mb-6 grid gap-6 md:grid-cols-2">
          {/* Mission */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                <Target className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Our Mission
              </h3>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              To digitize and empower local merchants by providing enterprise-grade ecommerce infrastructure, real-time demand matching, and low-friction fulfillment systems—enabling brick-and-mortar stores to thrive in an instant-delivery economy.
            </p>
          </section>

          {/* Vision */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <Eye className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Our Vision
              </h3>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              To build the world&apos;s most resilient and equitable neighborhood commerce ecosystem where local store owners maintain direct customer relationships, gain sustainable profitability, and deliver fast, reliable local products.
            </p>
          </section>
        </div>

        {/* Section Cards */}
        <div className="space-y-6">
          {/* Hyperlocal Platform Overview */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Hyperlocal Commerce Platform Overview
              </h3>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              <p>
                Rivo bridges physical storefronts with digital consumer demand. By converting inventory into active digital catalogs, Rivo allows surrounding customers to discover, order, and receive goods within hyper-local geographic radiuses.
              </p>
              <div className="grid gap-3 sm:grid-cols-3 mt-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="font-semibold text-xs text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-indigo-500" /> Instant Inventory Sync
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Real-time stock controls and automatic order acceptance tools.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="font-semibold text-xs text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Smart Logistics Mesh
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Automated courier dispatch optimized for rapid neighborhood drop-offs.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="font-semibold text-xs text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-amber-500" /> Transparent Settlements
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Direct payout cycles with clear commission breakdowns and reporting.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Vendor Ecosystem */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <HeartHandshake className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                The Rivo Vendor Ecosystem
              </h3>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              <p>
                Vendors are the cornerstone of the Rivo platform. Whether you operate a grocery market, restaurant, pharmacy, or specialty retail boutique, Rivo equips your business with tailored store controls, promotional tools, and dedicated merchant support.
              </p>
              <ul className="mt-2 space-y-2 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside bg-slate-50/60 p-4 rounded-xl border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800">
                <li><strong>Dedicated Merchant Portal:</strong> Manage menus, stock, payouts, and order disputes from a single interface.</li>
                <li><strong>Fair Growth Rules:</strong> Level playing field driven by merchant quality ratings, fulfillment speeds, and customer satisfaction.</li>
                <li><strong>Compliance & Standard Protection:</strong> Transparent liability guidelines and clear dispute resolution channels.</li>
              </ul>
            </div>
          </section>

          {/* Version & Copyright Footer Card */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-100 p-2.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {appTitle}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Hyperlocal Merchant Solutions
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <ShieldCheck className="h-4 w-4 text-indigo-500" />
                Version {version}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500 dark:text-slate-400">
              <p>&copy; {currentYear} Rivo Technologies Inc. All rights reserved.</p>
              <p className="text-slate-400 dark:text-slate-500">
                Empowering Local Stores Worldwide
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default VendorAbout;