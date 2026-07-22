import React from 'react';
import {
  ArrowLeft,
  FileText,
  ShieldCheck,
  UserCheck,
  PackageCheck,
  DollarSign,
  Truck,
  Ban,
  Copyright,
  AlertTriangle,
  Scale,
  RefreshCw,
  Mail,
  HelpCircle,
} from 'lucide-react';

export interface VendorTermsProps {
  onBack?: () => void;
  onContactSupport?: () => void;
  className?: string;
}

export const VendorTerms: React.FC<VendorTermsProps> = ({
  onBack,
  onContactSupport,
  className = '',
}) => {
  const lastUpdated = 'July 22, 2026';

  const sections = [
    {
      id: 'acceptance',
      icon: ShieldCheck,
      title: '1. Acceptance of Terms',
      content: (
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          By registering as a vendor, creating a merchant profile, or listing products and services on our platform, you agree to be bound by these Vendor Terms & Conditions. If you do not agree to all of the terms set forth herein, you must not access or use the platform as a vendor. These terms constitute a legally binding agreement between you (the "Vendor") and our company.
        </p>
      ),
    },
    {
      id: 'eligibility',
      icon: UserCheck,
      title: '2. Vendor Eligibility',
      content: (
        <div className="space-y-3 text-gray-600 dark:text-gray-300 leading-relaxed">
          <p>
            To qualify for and maintain an active vendor account, you must satisfy the following criteria:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-300">
            <li>Be at least 18 years of age or the legal age of majority in your jurisdiction.</li>
            <li>Possess a valid business registration, tax identification number, and required operating licenses where applicable.</li>
            <li>Maintain an accurate, complete, and up-to-date business profile, including corporate structure and beneficial ownership information.</li>
            <li>Pass all mandatory Know Your Customer (KYC) and Anti-Money Laundering (AML) verification checks.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'responsibilities',
      icon: FileText,
      title: '3. Vendor Responsibilities',
      content: (
        <div className="space-y-3 text-gray-600 dark:text-gray-300 leading-relaxed">
          <p>
            As an authorized Vendor on our platform, you agree to uphold high standards of business conduct, including:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-300">
            <li>Providing truthful, transparent, and accurate information regarding your business and offered goods.</li>
            <li>Complying with all applicable local, national, and international laws, regulations, and industry standards.</li>
            <li>Maintaining reasonable customer service response times (within 24–48 hours) for customer inquiries and complaints.</li>
            <li>Fulfilling customer orders promptly and adhering strictly to promised delivery timelines.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'product-listings',
      icon: PackageCheck,
      title: '4. Product Listings',
      content: (
        <div className="space-y-3 text-gray-600 dark:text-gray-300 leading-relaxed">
          <p>
            All product listings submitted to the marketplace must adhere to the following guidelines:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-300">
            <li>Descriptions, specifications, and images must accurately depict the physical item being sold.</li>
            <li>Listings must not contain misleading, deceptive, or fraudulent statements regarding item condition or origin.</li>
            <li>Stock levels must be updated in real time to prevent stockout cancellations and unfulfilled orders.</li>
            <li>All items must meet relevant safety standards, quality certifications, and regulatory compliance rules.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'pricing-payments',
      icon: DollarSign,
      title: '5. Pricing & Payments',
      content: (
        <div className="space-y-3 text-gray-600 dark:text-gray-300 leading-relaxed">
          <p>
            Vendors retain full discretion over setting product prices, subject to applicable fair pricing policies and commission structures:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-300">
            <li>All prices must include relevant mandatory fees or clearly outline applicable sales taxes and duties at checkout.</li>
            <li>Platform transaction fees, commissions, and payment processing charges will be deducted automatically from payout settlements according to your subscription tier.</li>
            <li>Payouts are processed on a scheduled cycle (e.g., weekly or bi-weekly) following successful delivery confirmation and escrow clearance.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'orders-fulfillment',
      icon: Truck,
      title: '6. Orders & Fulfillment',
      content: (
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          Vendors are responsible for packaging, shipping, and ensuring the safe delivery of sold goods to buyers. Valid tracking information must be uploaded to the platform dashboard upon dispatch. Failure to meet shipping deadlines, high rates of order cancellation, or recurring damaged goods claims may result in penalties, escrow delays, or account restrictions.
        </p>
      ),
    },
    {
      id: 'prohibited-activities',
      icon: Ban,
      title: '7. Prohibited Activities',
      content: (
        <div className="space-y-3 text-gray-600 dark:text-gray-300 leading-relaxed">
          <p>
            Vendors are strictly prohibited from engaging in any of the following activities:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-300">
            <li>Selling counterfeit, illegal, stolen, or restricted items.</li>
            <li>Attempting to divert customers away from the platform to complete off-platform transactions.</li>
            <li>Manipulating customer reviews, ratings, or feedback through incentivized or artificial means.</li>
            <li>Engaging in fraudulent refund claims, wash trading, or unauthorized access attempts.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'intellectual-property',
      icon: Copyright,
      title: '8. Intellectual Property',
      content: (
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          Vendors represent and warrant that they possess all necessary rights, licenses, and permissions for any content, logos, trademarks, and imagery uploaded to the platform. By listing items, Vendors grant the platform a non-exclusive, worldwide, royalty-free license to display, promote, and market the listed content for promotional and operational purposes.
        </p>
      ),
    },
    {
      id: 'suspension-termination',
      icon: AlertTriangle,
      title: '9. Account Suspension & Termination',
      content: (
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          We reserve the right to suspend or terminate any Vendor account, with or without prior notice, in the event of material breach of these terms, excessive buyer disputes, fraudulent activity, or legal compulsion. Upon termination, active listings will be delisted, and remaining clear funds will be settled after deducting pending chargebacks and liabilities.
        </p>
      ),
    },
    {
      id: 'governing-law',
      icon: Scale,
      title: '10. Governing Law',
      content: (
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          These Vendor Terms & Conditions shall be governed by and construed in accordance with the applicable laws of the jurisdiction in which our corporate headquarters operates, without giving effect to any principles of conflicts of law. Any disputes arising hereunder shall be submitted to binding arbitration or competent courts within said jurisdiction.
        </p>
      ),
    },
    {
      id: 'changes-to-terms',
      icon: RefreshCw,
      title: '11. Changes to Terms',
      content: (
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          We reserve the right to amend or update these Vendor Terms at any time. Notice of substantial revisions will be provided via email or through prominent notifications within the Vendor Portal. Continued access to or use of the marketplace following such updates constitutes express acceptance of the revised terms.
        </p>
      ),
    },
    {
      id: 'contact-info',
      icon: Mail,
      title: '12. Contact Information',
      content: (
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          If you have questions, feedback, or legal inquiries regarding these Vendor Terms & Conditions, please contact our Legal & Compliance department at{' '}
          <a
            href="mailto:legal@vendorplatform.com"
            className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
          >
            legal@vendorplatform.com
          </a>.
        </p>
      ),
    },
  ];

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 ${className}`}>
      {/* Sticky Top Header Navigation */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {onBack && (
              <button
                onClick={onBack}
                className="inline-flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Go back to Settings"
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                <span className="text-sm font-medium">Back</span>
              </button>
            )}
            <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block" />
            <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              Vendor Terms & Conditions
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Last Updated: {lastUpdated}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Hero Banner Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 text-white p-8 sm:p-12 shadow-xl">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-indigo-100 text-xs font-semibold tracking-wide uppercase">
              <FileText className="w-4 h-4" />
              <span>Merchant Agreement</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Terms & Conditions for Marketplace Vendors
            </h2>
            <p className="text-indigo-100 text-base sm:text-lg leading-relaxed">
              Please review these terms carefully before listing products or offering services on our platform. They outline vendor standards, operational requirements, and key policies.
            </p>
          </div>
        </div>

        {/* Legal Cards Container */}
        <div className="grid grid-cols-1 gap-6">
          {sections.map((section) => {
            const IconComponent = section.icon;
            return (
              <section
                key={section.id}
                id={section.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {section.title}
                    </h3>
                    <div className="text-sm sm:text-base">
                      {section.content}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        {/* Bottom Contact / Support Callout */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <HelpCircle className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            Have Questions About Our Terms?
          </h3>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto text-sm sm:text-base">
            Our specialized legal and compliance team is here to assist you with any questions regarding vendor agreements, policies, or compliance guidelines.
          </p>
          <div className="pt-2">
            <button
              onClick={onContactSupport}
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              <Mail className="w-5 h-5 mr-2" />
              Contact Legal Team
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VendorTerms;