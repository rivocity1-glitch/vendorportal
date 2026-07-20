import React, { useState, useRef, UIEvent } from "react";
import { X, ShieldCheck, FileText, ExternalLink, AlertTriangle } from "lucide-react";
import { vendorTermsContent } from "./VendorTermsContent.tsx";
import { vendorPrivacyPolicyContent } from "./VendorPrivacyPolicyContent";

interface VendorTermsProps {
  onClose: () => void;
  onAcknowledgeComplete: () => void;
  initialTermsRead?: boolean;
  initialPrivacyRead?: boolean;
}

export function VendorTerms({ 
  onClose, 
  onAcknowledgeComplete, 
  initialTermsRead = false, 
  initialPrivacyRead = false 
}: VendorTermsProps) {
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">("terms");
  const [termsRead, setTermsRead] = useState(initialTermsRead);
  const [privacyRead, setPrivacyRead] = useState(initialPrivacyRead);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Track scroll reach parameters per distinct pane window
  const handleScrollDetection = (e: UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    // 8px tolerance configuration to safely trigger across variable rendering view heights
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 8;

    if (isAtBottom) {
      if (activeTab === "terms" && !termsRead) {
        setTermsRead(true);
      } else if (activeTab === "privacy" && !privacyRead) {
        setPrivacyRead(true);
      }
    }
  };

  const handleTabToggle = (tab: "terms" | "privacy") => {
    setActiveTab(tab);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  // Compute progress steps matrix
  const completedCount = (termsRead ? 1 : 0) + (privacyRead ? 1 : 0);
  const totalPercent = completedCount * 50;
  const isAllRead = termsRead && privacyRead;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/70 backdrop-blur-sm p-4 md:p-6 selection:bg-[#2ECC71]/20 selection:text-[#0F172A]">
      
      {/* Dynamic Overlay Canvas Shell */}
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl border border-neutral-100 flex flex-col md:flex-row overflow-hidden animate-fade-in relative">
        
        {/* Left Status & Progress Dashboard Terminal Column */}
        <div className="w-full md:w-80 bg-neutral-50 border-b md:border-b-0 md:border-r border-neutral-100 p-6 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#2ECC71]/10 flex items-center justify-center text-[#2ECC71] mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-[#0F172A] tracking-tight">Vendor Legal Centre</h2>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">Please review all legal documents before continuing.</p>
            </div>

            <hr className="border-neutral-200/60" />

            {/* Micro Metrics Section Tracker */}
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Document Milestones</span>
              
              <div onClick={() => handleTabToggle("terms")} className={`p-3 rounded-xl border transition-all cursor-pointer ${activeTab === "terms" ? "bg-white border-[#2ECC71] shadow-sm" : "bg-transparent border-transparent"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-700">Vendor Terms</span>
                  {termsRead ? (
                    <span className="text-[10px] font-bold text-[#2ECC71] bg-[#2ECC71]/10 px-2 py-0.5 rounded-full flex items-center gap-1">✓ Completed</span>
                  ) : (
                    <span className="text-[10px] font-medium text-neutral-400">Pending Scroll</span>
                  )}
                </div>
              </div>

              <div onClick={() => handleTabToggle("privacy")} className={`p-3 rounded-xl border transition-all cursor-pointer ${activeTab === "privacy" ? "bg-white border-[#2ECC71] shadow-sm" : "bg-transparent border-transparent"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-700">Privacy Policy</span>
                  {privacyRead ? (
                    <span className="text-[10px] font-bold text-[#2ECC71] bg-[#2ECC71]/10 px-2 py-0.5 rounded-full flex items-center gap-1">✓ Completed</span>
                  ) : (
                    <span className="text-[10px] font-medium text-neutral-400">Pending Scroll</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Progress Visualization Meter Component Layout */}
          <div className="pt-6 border-t border-neutral-200/60 mt-6 md:mt-0 space-y-2.5">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Overall Progress</span>
              <span className="text-sm font-black text-[#0F172A]">{totalPercent}%</span>
            </div>
            <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#2ECC71] transition-all duration-500 ease-out"
                style={{ width: `${totalPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Active Viewport Documentation Component Layout Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          
          {/* Top Bar Tabs Configuration Selection Layout Grid Matrix */}
          <div className="flex border-b border-neutral-100 bg-white px-4 shrink-0 justify-between items-center">
            <div className="flex">
              <button
                type="button"
                onClick={() => handleTabToggle("terms")}
                className={`flex items-center gap-2 py-4 px-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === "terms" ? "border-[#2ECC71] text-[#2ECC71]" : "border-transparent text-neutral-400 hover:text-neutral-600"
                }`}
              >
                <FileText className="w-4 h-4" />
                Vendor Terms & Conditions
              </button>
              <button
                type="button"
                onClick={() => handleTabToggle("privacy")}
                className={`flex items-center gap-2 py-4 px-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all ml-4 cursor-pointer ${
                  activeTab === "privacy" ? "border-[#2ECC71] text-[#2ECC71]" : "border-transparent text-neutral-400 hover:text-neutral-600"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Vendor Privacy Policy
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 transition-all cursor-pointer mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scroll Inspected Layout Shell Area Container */}
          <div 
            ref={scrollContainerRef}
            onScroll={handleScrollDetection}
            className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scroll-smooth"
          >
            {activeTab === "terms" ? (
              <div className="space-y-6 max-w-3xl">
                {vendorTermsContent.map((section, idx) => (
                  <div key={idx} className="space-y-2.5">
                    <h3 className="text-sm font-black text-[#0F172A] uppercase tracking-wide">{section.title}</h3>
                    {section.content.map((para, pIdx) => (
                      <p key={pIdx} className="text-neutral-500 font-light text-sm leading-relaxed">{para}</p>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6 max-w-3xl">
                {vendorPrivacyPolicyContent.map((section, idx) => (
                  <div key={idx} className="space-y-2.5">
                    <h3 className="text-sm font-black text-[#0F172A] uppercase tracking-wide">{section.title}</h3>
                    {section.content.map((para, pIdx) => (
                      <p key={pIdx} className="text-neutral-500 font-light text-sm leading-relaxed">{para}</p>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Core Panel Actions Matrix Footer Layout Control Configuration */}
          <div className="p-5 border-t border-neutral-100 bg-neutral-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
            <div className="flex items-center gap-2">
              <a
                href="https://rivo-website.pages.dev/legal/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-[#2ECC71] transition-colors"
              >
                Learn More <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <button
              type="button"
              disabled={!isAllRead}
              onClick={() => setShowConfirmDialog(true)}
              className="px-6 h-11 rounded-xl bg-[#2ECC71] hover:bg-[#27AE60] disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-[#2ECC71]/10 disabled:shadow-none"
            >
              I Understand & Agree
            </button>
          </div>
        </div>

        {/* Modal-nested Layer Sub-confirmation Modal Configuration Box Block */}
        {showConfirmDialog && (
          <div className="absolute inset-0 z-50 bg-[#0F172A]/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-2xl border border-neutral-100 p-6 space-y-5 shadow-2xl animate-scale-up">
              <div className="flex items-center gap-3 text-amber-500">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="text-lg font-black text-[#0F172A] tracking-tight">Legal Confirmation</h3>
              </div>
              
              <div className="text-xs text-neutral-500 space-y-2 leading-relaxed">
                <p className="font-medium text-neutral-700">You confirm that:</p>
                <ul className="list-disc pl-4 space-y-1.5">
                  <li>You have reviewed the Vendor Terms & Conditions.</li>
                  <li>You have reviewed the Vendor Privacy Policy.</li>
                  <li>You understand your responsibilities as a Rivo.City Vendor.</li>
                  <li>You agree to comply with all applicable policies while using the platform.</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmDialog(false)}
                  className="px-4 h-9 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onAcknowledgeComplete();
                    onClose();
                  }}
                  className="px-4 h-9 rounded-lg bg-[#2ECC71] hover:bg-[#27AE60] text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  I Understand & Agree
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}