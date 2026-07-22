import React from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  FileText,
  RefreshCcw,
  CreditCard,
  Scale,
  HelpCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';

interface VendorRefundPolicyProps {
  onBack?: () => void;
  onContactSupport?: () => void;
  className?: string;
}

export const VendorRefundPolicy: React.FC<VendorRefundPolicyProps> = ({
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
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
                  Vendor Partner Terms
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Last Updated: July 2026
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                Vendor Refund & Cancellation Policy
              </h1>
            </div>
          </div>

          <div className="hidden sm:flex sm:items-center sm:gap-3">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Active Agreement
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Banner Card */}
        <div className="mb-8 rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 text-indigo-300">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-xs font-semibold tracking-wider uppercase">
                  Merchant Fulfillment Standards
                </span>
              </div>
              <h2 className="text-2xl font-extrabold sm:text-3xl">
                Fair & Transparent Refund Governance
              </h2>
              <p className="text-sm text-indigo-100/80 leading-relaxed sm:text-base">
                This agreement governs vendor responsibilities, customer refund handling,
                payout clawbacks, commission adjustments, and dispute protocols for cancelled or returned orders.
              </p>
            </div>
            <div className="shrink-0">
              <div className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-3 text-xs font-medium text-indigo-200 backdrop-blur-sm">
                <Clock className="h-4 w-4 text-indigo-400" />
                Dispute Window: 7 Days
              </div>
            </div>
          </div>
        </div>

        {/* Policy Section Cards */}
        <div className="space-y-6">
          {/* Section 1 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                1. Overview & General Policy Scope
              </h3>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                As a vendor partner on our platform, you agree to uphold our customer satisfaction standards. All refund requests generated through the Customer App are processed in accordance with our unified consumer policy, adapted herein for merchant fulfillment responsibilities.
              </p>
              <p>
                Vendors are expected to prepare orders accurately, fulfill within designated SLAs, and ensure product quality matches listed descriptions. Failure to meet these obligations may result in customer refund eligibility and associated merchant liability.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <RefreshCcw className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                2. Order Cancellations & Customer Refunds
              </h3>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-5 dark:border-slate-800/80 dark:bg-slate-800/40">
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Vendor-Responsible Refunds
                </div>
                <ul className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside leading-relaxed">
                  <li>Incorrect or missing items in customer order</li>
                  <li>Expired, damaged, or defective goods delivered</li>
                  <li>Unreasonable delay in order preparation</li>
                  <li>Order cancellation due to vendor stockout</li>
                </ul>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-5 dark:border-slate-800/80 dark:bg-slate-800/40">
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                  <XCircle className="h-4 w-4 text-rose-500" />
                  Platform-Covered Refunds
                </div>
                <ul className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside leading-relaxed">
                  <li>Damage occurring solely during logistics transit</li>
                  <li>Customer address error outside vendor fault</li>
                  <li>Platform system outages or double billing</li>
                  <li>Customer change-of-mind prior to acceptance</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                <CreditCard className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                3. Financial Adjustments & Payout Clawbacks
              </h3>
            </div>
            <div className="mt-4 space-y-4 text-sm text-slate-600 dark:text-slate-300">
              <p className="leading-relaxed">
                When a customer refund is approved due to vendor error, the refunded amount is deducted from the vendor's upcoming payout statement.
              </p>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <tr>
                      <th className="px-4 py-3.5 font-semibold">Scenario</th>
                      <th className="px-4 py-3.5 font-semibold">Vendor Payout Impact</th>
                      <th className="px-4 py-3.5 font-semibold">Platform Fee Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    <tr>
                      <td className="px-4 py-3 font-medium">Full Order Refund (Vendor Fault)</td>
                      <td className="px-4 py-3 text-rose-600 dark:text-rose-400 font-medium">100% Deducted from Payout</td>
                      <td className="px-4 py-3">Commission charged</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium">Partial Item Refund (Missing/Damaged)</td>
                      <td className="px-4 py-3 text-amber-600 dark:text-amber-400 font-medium">Item Value Deducted</td>
                      <td className="px-4 py-3">Commission adjusted pro-rata</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium">Cancelled Before Vendor Acceptance</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">No Net Change</td>
                      <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-medium">No Fee Charged</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <Scale className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                4. Vendor Dispute & Appeal Process
              </h3>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                If you believe a refund deduction was issued erroneously or due to customer fraud, you may lodge an appeal through your Vendor Portal within <strong>7 business days</strong> of notification.
              </p>

              <div className="rounded-xl bg-blue-50/50 p-4 text-xs text-blue-900 dark:bg-blue-950/30 dark:text-blue-200 border border-blue-100 dark:border-blue-900/40">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Required Supporting Evidence:
                </div>
                <ul className="mt-2 list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                  <li>Time-stamped prep photos or CCTV video logs</li>
                  <li>Dispatch weight tickets or tamper-seal confirmations</li>
                  <li>Handover receipts signed by courier personnel</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="rounded-lg bg-purple-50 p-2.5 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                5. Assistance & Partner Support
              </h3>
            </div>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Need help resolving a dispute or reviewing an line-item adjustment on your latest settlement?
              </p>
              <button
                type="button"
                onClick={onContactSupport}
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                Contact Partner Support
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default VendorRefundPolicy;