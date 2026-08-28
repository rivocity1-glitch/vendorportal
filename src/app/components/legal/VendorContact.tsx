import React, { useState } from "react";
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
  Star,
  Send,
  Bug,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface VendorContactProps {
  onBack?: () => void;
  className?: string;
}

const feedbackCategories = [
  "General Feedback",
  "Vendor Portal Experience",
  "Orders & Delivery",
  "Products & Inventory",
  "Payments & Settlements",
  "Suggestions",
];

const problemCategories = [
  "Login / Account",
  "Orders",
  "Products / Inventory",
  "Payments / Settlements",
  "Notifications",
  "Store Management",
  "Technical Issue",
  "Other",
];

export const VendorContact: React.FC<VendorContactProps> = ({
  onBack,
  className = "",
}) => {
  const supportEmail = "rivo.cityhelp1@gmail.com";

  const [copied, setCopied] = useState(false);
  const [activeForm, setActiveForm] = useState<"feedback" | "problem" | null>(null);

  const [rating, setRating] = useState(0);
  const [feedbackCategory, setFeedbackCategory] = useState(feedbackCategories[0]);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const [problemCategory, setProblemCategory] = useState(problemCategories[0]);
  const [problemTitle, setProblemTitle] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [problemPriority, setProblemPriority] = useState("medium");

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(supportEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const resetMessages = () => {
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const submitTicket = async (payload: {
    issue_type: string;
    title: string;
    description: string;
    priority: string;
  }) => {
    resetMessages();
    setSubmitting(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData?.user) throw new Error("Your vendor session has expired. Please sign in again.");

      const { data: vendor, error: vendorError } = await supabase
        .from("vendors")
        .select("id")
        .eq("auth_user_id", authData.user.id)
        .maybeSingle();

      if (vendorError) throw vendorError;
      if (!vendor) throw new Error("Vendor profile could not be found.");

      const { error } = await supabase.from("vendor_support_tickets").insert({
        vendor_id: vendor.id,
        issue_type: payload.issue_type,
        title: payload.title.trim(),
        description: payload.description.trim(),
        priority: payload.priority,
        status: "open",
        screenshot_url: null,
      });

      if (error) throw error;

      return true;
    } catch (error: any) {
      console.error("Vendor support submission error:", error);
      setErrorMessage(error?.message || "Unable to submit your request. Please try again.");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitFeedback = async (event: React.FormEvent) => {
    event.preventDefault();

    if (rating < 1) {
      setErrorMessage("Please select a rating from 1 to 5 stars.");
      return;
    }

    if (!feedbackMessage.trim()) {
      setErrorMessage("Please enter your feedback before submitting.");
      return;
    }

    const submitted = await submitTicket({
      issue_type: "feedback",
      title: `Vendor Feedback — ${feedbackCategory}`,
      description: `Rating: ${rating}/5\nCategory: ${feedbackCategory}\n\nFeedback:\n${feedbackMessage.trim()}`,
      priority: "low",
    });

    if (submitted) {
      setFeedbackMessage("");
      setRating(0);
      setFeedbackCategory(feedbackCategories[0]);
      setActiveForm(null);
      setSuccessMessage("Thank you. Your feedback has been submitted to the Rivo team.");
    }
  };

  const handleSubmitProblem = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!problemTitle.trim()) {
      setErrorMessage("Please enter a problem title.");
      return;
    }

    if (!problemDescription.trim()) {
      setErrorMessage("Please describe the problem.");
      return;
    }

    const submitted = await submitTicket({
      issue_type: "problem",
      title: problemTitle,
      description: `Category: ${problemCategory}\nPriority: ${problemPriority}\n\nProblem Description:\n${problemDescription.trim()}`,
      priority: problemPriority,
    });

    if (submitted) {
      setProblemTitle("");
      setProblemDescription("");
      setProblemCategory(problemCategories[0]);
      setProblemPriority("medium");
      setActiveForm(null);
      setSuccessMessage("Problem reported successfully. You can track it in My Support Tickets.");
    }
  };

  return (
    <div
      className={`min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200 ${className}`}
    >
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                  Vendor Support
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">Help Desk & Feedback</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                Vendor Support & Communication
              </h1>
            </div>
          </div>

          <div className="hidden sm:flex sm:items-center sm:gap-3">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Support Active</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 text-indigo-300">
                <Headphones className="h-5 w-5" />
                <span className="text-xs font-semibold tracking-wider uppercase">Official Merchant Assistance</span>
              </div>
              <h2 className="text-2xl font-extrabold sm:text-3xl">We&apos;re Here to Help Your Business</h2>
              <p className="text-sm text-indigo-100/80 leading-relaxed sm:text-base">
                Report a problem, send feedback, or contact the Rivo support team directly.
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

        {successMessage && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
            <Check className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Feedback / Problem entry points */}
        <section className="mb-8 grid gap-5 md:grid-cols-2">
          <button
            type="button"
            onClick={() => { resetMessages(); setActiveForm(activeForm === "feedback" ? null : "feedback"); }}
            className="group rounded-2xl border border-amber-200 bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-xl bg-amber-50 p-3.5 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <Star className="h-6 w-6" />
              </div>
              <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${activeForm === "feedback" ? "rotate-180" : ""}`} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Send Feedback</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Tell us what is working well and what we can improve in the Vendor Portal.
            </p>
          </button>

          <button
            type="button"
            onClick={() => { resetMessages(); setActiveForm(activeForm === "problem" ? null : "problem"); }}
            className="group rounded-2xl border border-red-200 bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-xl bg-red-50 p-3.5 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                <Bug className="h-6 w-6" />
              </div>
              <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${activeForm === "problem" ? "rotate-180" : ""}`} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Report a Problem</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Report a technical issue or anything preventing you from using the portal correctly.
            </p>
          </button>
        </section>

        {activeForm === "feedback" && (
          <form onSubmit={handleSubmitFeedback} className="mb-8 rounded-2xl border border-amber-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"><Star className="h-5 w-5" /></div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Send Feedback</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Your feedback is sent directly to the Rivo support desk.</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Your Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className="rounded-lg p-1 transition-transform hover:scale-110"
                      aria-label={`${value} star rating`}
                    >
                      <Star className={`h-8 w-8 ${value <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"}`} />
                    </button>
                  ))}
                  <span className="ml-2 text-sm font-semibold text-slate-500 dark:text-slate-400">{rating ? `${rating}/5` : "Select a rating"}</span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Category</label>
                <select value={feedbackCategory} onChange={(e) => setFeedbackCategory(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                  {feedbackCategories.map((category) => <option key={category}>{category}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Feedback</label>
                <textarea value={feedbackMessage} onChange={(e) => setFeedbackMessage(e.target.value)} rows={5} maxLength={3000} placeholder="Tell us about your experience or suggestion..." className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                <div className="mt-1 text-right text-[11px] text-slate-400">{feedbackMessage.length}/3000</div>
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setActiveForm(null)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Cancel</button>
                <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit Feedback
                </button>
              </div>
            </div>
          </form>
        )}

        {activeForm === "problem" && (
          <form onSubmit={handleSubmitProblem} className="mb-8 rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="rounded-lg bg-red-50 p-2.5 text-red-600 dark:bg-red-950/40 dark:text-red-400"><Bug className="h-5 w-5" /></div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Report a Problem</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">A support ticket will be created for the Rivo team.</p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Problem Category</label>
                <select value={problemCategory} onChange={(e) => setProblemCategory(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-red-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                  {problemCategories.map((category) => <option key={category}>{category}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Priority</label>
                <select value={problemPriority} onChange={(e) => setProblemPriority(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-red-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Problem Title</label>
                <input value={problemTitle} onChange={(e) => setProblemTitle(e.target.value)} maxLength={160} placeholder="Example: Products page is not loading" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-red-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Describe the Problem</label>
                <textarea value={problemDescription} onChange={(e) => setProblemDescription(e.target.value)} rows={6} maxLength={5000} placeholder="Explain what happened, what you expected, and how we can reproduce the issue..." className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-red-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                <div className="mt-1 text-right text-[11px] text-slate-400">{problemDescription.length}/5000</div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setActiveForm(null)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Cancel</button>
              <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bug className="h-4 w-4" />}
                Report Problem
              </button>
            </div>
          </form>
        )}

        {/* Existing support contact */}
        <div className="mb-6 rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="shrink-0 rounded-xl bg-indigo-50 p-3.5 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"><Mail className="h-6 w-6" /></div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Official Vendor Support</span>
                <h3 className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white">Direct Email Channel</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">For documents, account requests, or cases that need direct email communication.</p>
                <div className="mt-3 text-base font-semibold text-indigo-600 dark:text-indigo-400">{supportEmail}</div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 md:border-t-0 md:pt-0">
              <a href={`mailto:${supportEmail}`} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"><Mail className="h-4 w-4" />Send Email</a>
              <button type="button" onClick={handleCopyEmail} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{copied ? <><Check className="h-4 w-4 text-emerald-500" />Copied</> : <><Copy className="h-4 w-4" />Copy</>}</button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800"><div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"><Clock className="h-5 w-5" /></div><h3 className="text-lg font-bold text-slate-900 dark:text-white">Support Operating Hours</h3></div>
            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p className="leading-relaxed">Our merchant support team reviews and resolves ticket submissions during standard operational windows.</p>
              <ul className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/40">
                <li className="flex justify-between"><span>Monday – Saturday</span><strong className="text-slate-900 dark:text-white">9:00 AM – 9:00 PM IST</strong></li>
                <li className="flex justify-between border-t border-slate-200/60 pt-2 dark:border-slate-700/60"><span>Sunday & Public Holidays</span><strong className="text-slate-900 dark:text-white">10:00 AM – 6:00 PM IST</strong></li>
                <li className="flex justify-between border-t border-slate-200/60 pt-2 dark:border-slate-700/60"><span>Live Order Emergencies</span><strong className="text-emerald-600 dark:text-emerald-400">24/7 Portal Priority</strong></li>
              </ul>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800"><div className="rounded-lg bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"><MessageSquare className="h-5 w-5" /></div><h3 className="text-lg font-bold text-slate-900 dark:text-white">Common Query Categories</h3></div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50"><strong className="block text-slate-900 dark:text-white">Payouts & Settlements</strong>Bank account changes and settlement issues.</div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50"><strong className="block text-slate-900 dark:text-white">Order Disputes</strong>Refund appeals and order-related cases.</div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50"><strong className="block text-slate-900 dark:text-white">Catalog & Pricing</strong>Products, inventory and pricing issues.</div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50"><strong className="block text-slate-900 dark:text-white">Legal & Compliance</strong>License and policy verification.</div>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800"><div className="rounded-lg bg-purple-50 p-2.5 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400"><HelpCircle className="h-5 w-5" /></div><h3 className="text-lg font-bold text-slate-900 dark:text-white">Tips for Faster Resolution</h3></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30"><div className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white"><FileText className="h-4 w-4 text-indigo-500" />Include relevant IDs</div><p className="text-xs text-slate-600 dark:text-slate-300">Include order, product, or account references whenever applicable.</p></div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30"><div className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white"><AlertCircle className="h-4 w-4 text-amber-500" />Describe what happened</div><p className="text-xs text-slate-600 dark:text-slate-300">Tell us what you expected, what actually happened, and when it occurred.</p></div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30"><div className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white"><ShieldCheck className="h-4 w-4 text-emerald-500" />Track your ticket</div><p className="text-xs text-slate-600 dark:text-slate-300">Reported problems appear under My Support Tickets in Settings.</p></div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default VendorContact;
