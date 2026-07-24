import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  X,
  FileText,
  ShieldCheck,
  UserCheck,
  Ban,
  CreditCard,
  PackageCheck,
  RotateCcw,
  Scale,
  AlertTriangle,
  Lock,
  Database,
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
  Sparkles,
  Mail,
  LucideIcon,
} from 'lucide-react';

export interface VendorTermsProps {
  onBack?: () => void;
  onClose?: () => void;
  onAcknowledgeComplete?: () => void;
  onContactSupport?: () => void;
  className?: string;
}

interface SectionItem {
  id: string;
  title: string;
  icon: LucideIcon;
  content: React.ReactNode;
}

export const VendorTerms: React.FC<VendorTermsProps> = ({
  onBack,
  onClose,
  onAcknowledgeComplete,
  onContactSupport,
  className = '',
}) => {
  const [hasReachedBottom, setHasReachedBottom] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const lastUpdated = 'July 22, 2026';

  const handleCloseModal = () => {
    if (onClose) {
      onClose();
    } else if (onBack) {
      onBack();
    }
  };

  const handleAccept = () => {
    if (onAcknowledgeComplete) {
      onAcknowledgeComplete();
    }
    if (onClose) {
      onClose();
    }
  };

  const handleScroll = () => {
    const el = contentRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const maxScroll = scrollHeight - clientHeight;

    if (maxScroll <= 0) {
      setScrollProgress(100);
      setHasReachedBottom(true);
      return;
    }

    const progress = Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100));
    setScrollProgress(progress);

    // Consider reached bottom if within 30px of bottom
    if (scrollTop + clientHeight >= scrollHeight - 30) {
      setHasReachedBottom(true);
    }
  };

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    // Check if content fits without scrolling
    if (el.scrollHeight <= el.clientHeight) {
      setHasReachedBottom(true);
      setScrollProgress(100);
    }
  }, []);

  const sections: SectionItem[] = [
    {
      id: 'welcome',
      title: '1. Welcome to Rivo Merchant Network',
      icon: Sparkles,
      content: (
        <p className="text-neutral-600 leading-relaxed text-sm">
          Welcome to the Rivo Merchant Portal. By registering your commercial enterprise or listing products and services on Rivo.City, you agree to comply with and be bound by these Vendor Terms & Conditions. These terms establish a legally binding agreement between your store (&quot;Vendor&quot;) and Rivo.City. Please read these provisions carefully before proceeding.
        </p>
      ),
    },
    {
      id: 'terms-conditions',
      title: '2. Terms & Conditions Acceptance',
      icon: ShieldCheck,
      content: (
        <p className="text-neutral-600 leading-relaxed text-sm">
          Access to the Rivo Merchant Portal and platform fulfillment services is conditioned on your complete acceptance of and compliance with these terms. If you do not agree to all terms set forth herein, you must immediately halt the registration sequence and refrain from utilizing platform features.
        </p>
      ),
    },
    {
      id: 'vendor-responsibilities',
      title: '3. Vendor Responsibilities',
      icon: UserCheck,
      content: (
        <div className="space-y-3 text-neutral-600 text-sm leading-relaxed">
          <p>As an active Vendor on the Rivo network, you agree to maintain rigorous operational standards, including:</p>
          <ul className="list-disc pl-5 space-y-2 text-neutral-600">
            <li>Providing accurate, truthful, and up-to-date business credentials, store addresses, and contact parameters.</li>
            <li>Keeping active product pricing, inventory levels, and operational hours synchronized in real time.</li>
            <li>Fulfilling customer orders within declared preparation timeframes with reasonable packaging and hygiene standards.</li>
            <li>Maintaining valid municipal, trade, and industry licenses (including pharmaceutical licenses where applicable).</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'prohibited-activities',
      title: '4. Prohibited Activities',
      icon: Ban,
      content: (
        <div className="space-y-3 text-neutral-600 text-sm leading-relaxed">
          <p>Vendors are strictly prohibited from engaging in any of the following platform violations:</p>
          <ul className="list-disc pl-5 space-y-2 text-neutral-600">
            <li>Listing expired, counterfeit, illicit, or unauthorized goods and controlled substances.</li>
            <li>Attempting to divert platform customers to off-platform payment methods or unverified transaction channels.</li>
            <li>Manipulating customer ratings, submitting false feedback, or misrepresenting product origins.</li>
            <li>Sharing merchant dashboard credentials with unauthorized third parties.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'payments-settlements',
      title: '5. Payments & Settlements',
      icon: CreditCard,
      content: (
        <div className="space-y-3 text-neutral-600 text-sm leading-relaxed">
          <p>Platform financial settlements and commission fee structures operate under the following parameters:</p>
          <ul className="list-disc pl-5 space-y-2 text-neutral-600">
            <li>Customer payments are escrowed securely until order delivery confirmation or pickup completion.</li>
            <li>Platform service fees and applicable transactional deductions are automatically computed prior to settlement disbursement.</li>
            <li>Disbursements are remitted to registered merchant bank accounts according to standard weekly payout schedules.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'order-responsibilities',
      title: '6. Order Responsibilities',
      icon: PackageCheck,
      content: (
        <p className="text-neutral-600 leading-relaxed text-sm">
          Vendors must acknowledge order dispatches promptly upon notification. Orders must be packed safely to prevent transit damage or spillage. Discrepancies between listed items and delivered goods remain the full operational responsibility of the vendor.
        </p>
      ),
    },
    {
      id: 'cancellation-policy',
      title: '7. Cancellation Policy',
      icon: RotateCcw,
      content: (
        <p className="text-neutral-600 leading-relaxed text-sm">
          Frequent vendor-initiated cancellations degrade customer experience and may result in temporary visibility reductions or administrative fees. Vendors must maintain accurate stock counts to prevent unfulfillable orders.
        </p>
      ),
    },
    {
      id: 'platform-rules',
      title: '8. Platform Rules & Fair Conduct',
      icon: Scale,
      content: (
        <p className="text-neutral-600 leading-relaxed text-sm">
          All participating merchants must maintain professional communication with delivery partners and platform support personnel. Discriminatory conduct, abusive behavior, or fraudulent claims will result in immediate policy enforcement.
        </p>
      ),
    },
    {
      id: 'account-suspension',
      icon: AlertTriangle,
      title: '9. Account Suspension & Termination',
      content: (
        <p className="text-neutral-600 leading-relaxed text-sm">
          Rivo reserves the right to suspend or terminate vendor portal access in cases of repeated policy violations, expired legal licenses, customer safety concerns, or fraudulent activities. Pending legitimate balances will be settled following account audits.
        </p>
      ),
    },
    {
      id: 'privacy',
      title: '10. Privacy & Customer Confidentiality',
      icon: Lock,
      content: (
        <p className="text-neutral-600 leading-relaxed text-sm">
          Customer delivery addresses, contact numbers, and order histories provided to vendors must be used solely for order fulfillment purposes. Storage, exporting, or marketing to customer data outside Rivo channels is strictly prohibited.
        </p>
      ),
    },
    {
      id: 'data-usage',
      title: '11. Data Usage & Analytics',
      icon: Database,
      content: (
        <p className="text-neutral-600 leading-relaxed text-sm">
          Rivo collects anonymized store performance data, category trend metrics, and operational response times to optimize dispatch routing and customer discovery algorithms.
        </p>
      ),
    },
    {
      id: 'liability',
      title: '12. Liability & Indemnification',
      icon: ShieldAlert,
      content: (
        <p className="text-neutral-600 leading-relaxed text-sm">
          Vendors agree to indemnify and hold harmless Rivo.City, its affiliates, and delivery networks against any third-party claims, damages, or legal expenses arising from defective products, inaccurate listings, or regulatory non-compliance.
        </p>
      ),
    },
    {
      id: 'contact-support',
      title: '13. Legal Contact & Merchant Support',
      icon: HelpCircle,
      content: (
        <div className="space-y-3 text-neutral-600 text-sm leading-relaxed">
          <p>
            If you have inquiries regarding merchant compliance, policy updates, or operational agreements, please contact our Legal & Merchant Compliance team:
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={onContactSupport}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 mr-2 text-[#2ECC71]" />
              Contact Legal Compliance Team
            </button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-neutral-950/70 backdrop-blur-sm animate-fade-in ${className}`}>
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-neutral-200 flex flex-col overflow-hidden">
        
        {/* Sticky Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#2ECC71]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#0F172A] tracking-tight">Vendor Terms & Conditions</h1>
              <p className="text-[11px] text-neutral-400 font-medium">Merchant Portal Operating Agreement &middot; Updated {lastUpdated}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCloseModal}
              className="p-2 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Indicator Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-100">
            <div
              className="h-full bg-[#2ECC71] transition-all duration-150 ease-out"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>
        </header>

        {/* Scrollable Content Container */}
        <div
          ref={contentRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-8 space-y-8 divide-y divide-neutral-100"
        >
          {/* Hero Header Card */}
          <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] rounded-xl p-6 text-white space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-emerald-400 text-[11px] font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Official Merchant Agreement</span>
            </div>
            <h2 className="text-xl font-black tracking-tight">Rivo Vendor Portal Terms of Service</h2>
            <p className="text-neutral-300 text-xs font-light leading-relaxed max-w-2xl">
              Please scroll through and read the complete document below. Completion of this agreement is required to activate merchant privileges and accept store orders.
            </p>
          </div>

          {/* Sections List */}
          <div className="pt-6 space-y-8">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <section key={section.id} className="space-y-3 pt-6 first:pt-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-neutral-100 text-[#0F172A] shrink-0">
                      <Icon className="w-4 h-4 text-[#2ECC71]" />
                    </div>
                    <h3 className="text-sm font-bold text-[#0F172A] tracking-tight">{section.title}</h3>
                  </div>
                  <div className="pl-11">{section.content}</div>
                </section>
              );
            })}
          </div>
        </div>

        {/* Sticky Footer */}
        <footer className="sticky bottom-0 z-20 bg-neutral-50 border-t border-neutral-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center justify-center px-3.5 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Back
              </button>
            )}
            <div className="text-xs">
              {hasReachedBottom ? (
                <span className="inline-flex items-center text-emerald-600 font-bold gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  You&apos;ve reached the end.
                </span>
              ) : (
                <span className="text-neutral-500 font-medium">
                  Please read the complete Terms &amp; Conditions to continue.
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={!hasReachedBottom}
            onClick={handleAccept}
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-[#2ECC71] hover:bg-[#27AE60] disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-md shadow-[#2ECC71]/10 active:scale-[0.98] cursor-pointer"
          >
            I have read &amp; agree
          </button>
        </footer>
      </div>
    </div>
  );
};

export default VendorTerms;