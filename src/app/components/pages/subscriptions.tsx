import React, { useEffect, useState } from 'react';
import { supabase } from "../../../lib/supabase"; // Adjust path based on your architecture[cite: 2]
import { 
  CreditCard, 
  Percent, 
  TrendingUp, 
  Calendar, 
  CheckCircle,
  AlertCircle,
  Info,
  Loader2,
  Copy,
  X,
  ArrowRight
} from 'lucide-react'; //[cite: 5]

// --- TYPES ---
interface Subscription {
  id: string;
  vendor_id: string;
  plan_name: string;
  commission_percent: number;
  start_date: string;
  end_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
} //[cite: 5]

interface PlatformSettings {
  subscription_upi_id: string;
  subscription_qr_url: string;
} //[cite: 5]

export default function Subscriptions() {
  // --- STATES ---
  const [loading, setLoading] = useState<boolean>(true); //[cite: 5]
  const [activeSub, setActiveSub] = useState<Subscription | null>(null); //[cite: 5]
  const [totalSales, setTotalSales] = useState<number>(0); //[cite: 5]
  const [actionLoading, setActionLoading] = useState<boolean>(false); //[cite: 5]
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null); //[cite: 5]
  
  // --- SUB-STATES FOR MODAL AND PAYMENT ---
  const [currentVendorId, setCurrentVendorId] = useState<string | null>(null); //[cite: 5]
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false); //[cite: 5]
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null); //[cite: 5]
  const [settingsLoading, setSettingsLoading] = useState<boolean>(false); //[cite: 5]
  const [hasPendingRequest, setHasPendingRequest] = useState<boolean>(false); //[cite: 5]
  
  // Form Inputs
  const [utrNumber, setUtrNumber] = useState<string>(''); //[cite: 5]

  // --- INITIALIZATION ---
  const fetchSubscriptionAndSalesData = async () => {
    try {
      setLoading(true); //[cite: 5]
      
      const { data: { session }, error: authError } = await supabase.auth.getSession(); //[cite: 5]
      if (authError || !session) throw new Error('Unauthorized'); //[cite: 5]
      
      const authUserId = session.user.id; //[cite: 5]

      const { data: vendor, error: vendorError } = await supabase //[cite: 5]
        .from("vendors") //[cite: 5]
        .select("id") //[cite: 5]
        .eq("auth_user_id", authUserId) //[cite: 5]
        .single(); //[cite: 5]

      if (vendorError || !vendor) { //[cite: 5]
        throw new Error("Vendor not found"); //[cite: 5]
      } //[cite: 5]

      const resolvedVendorId = vendor.id; //[cite: 5]
      setCurrentVendorId(resolvedVendorId); //[cite: 5]

      // Check for pending verification requests
      const { data: pendingReq, error: pendingError } = await supabase //[cite: 5]
        .from('subscription_payment_requests') //[cite: 5]
        .select('id') //[cite: 5]
        .eq('vendor_id', resolvedVendorId) //[cite: 5]
        .eq('status', 'pending') //[cite: 5]
        .maybeSingle(); //[cite: 5]

      if (!pendingError && pendingReq) { //[cite: 5]
        setHasPendingRequest(true); //[cite: 5]
      } else {
        setHasPendingRequest(false); //[cite: 5]
      }

      // 1. Fetch Current Active Subscription
      const { data: subData, error: subError } = await supabase //[cite: 5]
        .from('subscriptions') //[cite: 5]
        .select('*') //[cite: 5]
        .eq('vendor_id', resolvedVendorId) //[cite: 5]
        .eq('status', 'active') //[cite: 5]
        .maybeSingle(); //[cite: 5]

      if (subError) throw subError; //[cite: 5]
      if (subData) setActiveSub(subData); //[cite: 5]

      // 2. Fetch Delivered Orders for Sales Calculations
      const { data: orderData, error: orderError } = await supabase //[cite: 5]
        .from('orders') //[cite: 5]
        .select('total_amount') //[cite: 5]
        .eq('vendor_id', resolvedVendorId) //[cite: 5]
        .eq('order_status', 'Delivered'); //[cite: 5]

      if (orderError) throw orderError; //[cite: 5]

      if (orderData) { //[cite: 5]
        const salesAccumulator = orderData.reduce((sum, order) => sum + (order.total_amount || 0), 0); //[cite: 5]
        setTotalSales(salesAccumulator); //[cite: 5]
      } //[cite: 5]

    } catch (error: any) { //[cite: 5]
      console.error('Error loading subscription data:', error); //[cite: 5]
      showToast(error.message || 'Failed to sync data.', 'error'); //[cite: 5]
    } finally { //[cite: 5]
      setLoading(false); //[cite: 5]
    } //[cite: 5]
  };

  useEffect(() => {
    fetchSubscriptionAndSalesData(); //[cite: 5]
  }, []); //[cite: 5]

  // --- HELPER FUNCTIONS ---
  const showToast = (message: string, type: 'success' | 'error') => { //[cite: 5]
    setToast({ message, type }); //[cite: 5]
    setTimeout(() => setToast(null), 4000); //[cite: 5]
  }; //[cite: 5]

  const calculateDaysRemaining = (endDateStr: string | null | undefined): number => { //[cite: 2, 5]
    if (!endDateStr) return 0; //[cite: 2, 5]
    const end = new Date(endDateStr); //[cite: 2, 5]
    const today = new Date(); //[cite: 2, 5]
    const diffTime = end.getTime() - today.getTime(); //[cite: 2, 5]
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); //[cite: 2, 5]
    return diffDays > 0 ? diffDays : 0; //[cite: 2, 5]
  }; //[cite: 2, 5]

  const handleCopyUpi = async (upiId: string) => { //[cite: 5]
    try {
      await navigator.clipboard.writeText(upiId); //[cite: 5]
      showToast('UPI ID copied', 'success'); //[cite: 5]
    } catch (err) {
      showToast('Failed to copy text.', 'error'); //[cite: 5]
    }
  }; //[cite: 5]

  const openUpgradeModal = async () => { //[cite: 5]
    setShowPaymentModal(true); //[cite: 5]
    setSettingsLoading(true); //[cite: 5]
    try {
      const { data: settings, error: settingsError } = await supabase //[cite: 5]
        .from('platform_settings') //[cite: 5]
        .select('subscription_upi_id, subscription_qr_url') //[cite: 5]
        .eq('setting_key', 'subscription_config') //[cite: 5]
        .maybeSingle(); //[cite: 5]

      if (settingsError) throw settingsError; //[cite: 5]
      setPlatformSettings(settings); //[cite: 5]
    } catch (err: any) { //[cite: 5]
      console.error('Error loading configuration parameters:', err); //[cite: 5]
      showToast('Failed to load gateway configuration settings.', 'error'); //[cite: 5]
    } finally {
      setSettingsLoading(false); //[cite: 5]
    }
  };

  // --- MUTATION ACTIONS ---
  const handlePaymentSubmit = async (e: React.FormEvent) => { //[cite: 5]
    e.preventDefault(); //[cite: 5]
    if (!currentVendorId) return; //[cite: 5]
    
    if (hasPendingRequest) { //[cite: 5]
      showToast('Your payment request is already under review.', 'error'); //[cite: 5]
      return; //[cite: 5]
    }

    if (!utrNumber.trim()) { //[cite: 5]
      showToast('Please enter a valid UTR Number.', 'error'); //[cite: 5]
      return; //[cite: 5]
    }

    setActionLoading(true); //[cite: 5]
    try {
      const { error: insertError } = await supabase //[cite: 5]
        .from('subscription_payment_requests') //[cite: 5]
        .insert([{ //[cite: 5]
          vendor_id: currentVendorId, //[cite: 5]
          plan_name: '499', //[cite: 5]
          amount: 499, //[cite: 5]
          utr_number: utrNumber.trim(), //[cite: 5]
          status: 'pending', //[cite: 5]
          created_at: new Date().toISOString() //[cite: 5]
        }]); //[cite: 5]

      if (insertError) throw insertError; //[cite: 5]

      showToast('Subscription payment request submitted successfully.', 'success'); //[cite: 5]
      setShowPaymentModal(false); //[cite: 5]
      setUtrNumber(''); //[cite: 5]
      
      await fetchSubscriptionAndSalesData(); //[cite: 5]
    } catch (err: any) { //[cite: 5]
      console.error('Submission failed:', err); //[cite: 5]
      showToast(err.message || 'Submission failed.', 'error'); //[cite: 5]
    } finally {
      setActionLoading(false); //[cite: 5]
    }
  };

  const handleSwitchToFree = async () => { //[cite: 5]
    setActionLoading(true); //[cite: 5]
    try {
      if (!activeSub) throw new Error('No subscription found'); //[cite: 5]
      
      // Update local subscription to active FREE tier
      const { error } = await supabase //[cite: 5]
        .from('subscriptions') //[cite: 5]
        .update({ //[cite: 5]
          plan_name: 'FREE', //[cite: 5]
          commission_percent: 5, //[cite: 5]
          updated_at: new Date().toISOString() //[cite: 5]
        }) //[cite: 5]
        .eq('id', activeSub.id); //[cite: 5]

      if (error) throw error; //[cite: 5]
      showToast('Switched to Free Plan (5% commission).', 'success'); //[cite: 5]
      await fetchSubscriptionAndSalesData(); //[cite: 5]
    } catch (error: any) { //[cite: 5]
      showToast(error.message || 'Action failed.', 'error'); //[cite: 5]
    } finally {
      setActionLoading(false); //[cite: 5]
    }
  };

  const handleCancelSubscription = async () => { //[cite: 5]
    setActionLoading(true); //[cite: 5]
    try {
      if (!activeSub) throw new Error('No subscription asset selected'); //[cite: 5]
      
      const { error } = await supabase //[cite: 5]
        .from('subscriptions') //[cite: 5]
        .update({  //[cite: 5]
          status: 'cancelled', //[cite: 5]
          updated_at: new Date().toISOString() //[cite: 5]
        }) //[cite: 5]
        .eq('id', activeSub.id); //[cite: 5]

      if (error) throw error; //[cite: 5]
      showToast('Your subscription has been cancelled successfully.', 'success'); //[cite: 5]
      await fetchSubscriptionAndSalesData(); //[cite: 5]
    } catch (error: any) { //[cite: 5]
      showToast(error.message || 'Cancellation failed.', 'error'); //[cite: 5]
    } finally {
      setActionLoading(false); //[cite: 5]
    }
  };

  // --- DERIVED RENDER VARIABLES ---
  const planName = activeSub?.plan_name?.toUpperCase() || "FREE"; //[cite: 5]
  const isTrial = planName === "TRIAL"; //[cite: 5]
  const isBasic = planName === "499"; //[cite: 5]
  const isFree = planName === "FREE"; //[cite: 5]

  const daysRemaining = calculateDaysRemaining(activeSub?.end_date); //[cite: 5]
  const isTrialExpired = isTrial && daysRemaining === 0; //[cite: 5]

  const displayPlanName = //[cite: 5]
    isTrial ? (isTrialExpired ? "EXPIRED TRIAL" : "TRIAL PLAN") : //[cite: 5]
    isBasic ? "RIVO BASIC" : //[cite: 5]
    "FREE PLAN"; //[cite: 5]

  const currentCommission = activeSub?.commission_percent ?? 5; //[cite: 2, 5]

  if (loading) { //[cite: 5]
    return ( //[cite: 5]
      <div className="flex h-96 w-full items-center justify-center bg-background"> {/* profile theme background */}
        <Loader2 className="h-10 w-10 animate-spin text-[#10B981]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-background text-foreground border-border min-h-screen antialiased transition-all">
      
      {/* TOAST SYSTEM */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-md text-white font-medium transition-all duration-300 ${
          toast.type === 'success' ? 'bg-[#0F172A] border border-[#10B981]/30' : 'bg-rose-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={18} className="text-[#10B981]" /> : <AlertCircle size={18} />} {/*[cite: 4, 5] */}
          <span className="text-sm">{toast.message}</span> {/*[cite: 5] */}
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="pb-2 border-b border-border/40"> {/* profile theme subtle border */}
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Subscriptions</h1> {/*[cite: 5] */}
        <p className="text-muted-foreground text-sm mt-1">Manage your Rivo subscription plan</p> {/*[cite: 5] */}
      </div>

      {/* HERO SUBSCRIPTION MODULE PANELS */}
      <div className="relative">
        
        {/* CASE A: ACTIVE VALID RUNNING TRIAL */}
        {isTrial && !isTrialExpired && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-[#10B981] via-[#059669] to-teal-900 text-white rounded-xl p-6 shadow-sm border border-border relative overflow-hidden"> {/* profile green sync */}
              <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div> {/*[cite: 5] */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10"> {/*[cite: 5] */}
                <div>
                  <span className="text-emerald-100 bg-emerald-950/40 border border-white/20 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"> {/*[cite: 5] */}
                    Current Subscription
                  </span>
                  <h2 className="text-3xl font-black mt-4 tracking-tight">TRIAL PLAN</h2> {/*[cite: 5] */}
                  <p className="text-emerald-100/90 font-medium mt-1">60 Day Free Trial</p> {/*[cite: 5] */}
                  <div className="mt-6 flex flex-wrap items-center gap-3"> {/*[cite: 5] */}
                    <div className="inline-flex items-center gap-2 bg-emerald-950/30 px-3 py-1.5 rounded-lg text-sm border border-emerald-500/20"> {/*[cite: 5] */}
                      <span className="font-semibold">0% Commission</span> {/*[cite: 5] */}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 md:gap-4 border-t border-white/10 pt-4 md:pt-0 md:border-t-0"> {/*[cite: 5] */}
                  <div className="bg-emerald-950/40 border border-white/10 px-5 py-3.5 rounded-xl min-w-[120px]"> {/*[cite: 5] */}
                    <p className="text-[10px] text-emerald-200 font-bold uppercase tracking-widest">Days Remaining</p> {/*[cite: 5] */}
                    <p className="text-2xl font-black mt-1">{daysRemaining} Days</p> {/*[cite: 5] */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CASE B: EXPIRED TRIAL CHOOSE INTERACTION GRID CARD */}
        {isTrialExpired && (
          <div className="bg-card border-2 border-dashed border-border rounded-2xl p-6 shadow-sm relative overflow-hidden space-y-5 animate-in fade-in duration-200"> {/* profile text/card components */}
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl shrink-0">
                <AlertCircle size={22} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground tracking-tight">Your Trial Plan Has Expired</h2> {/*[cite: 5] */}
                <p className="text-sm text-muted-foreground mt-0.5">Please choose how you want to proceed to keep accepting customer orders on Rivo.City.</p> {/*[cite: 5] */}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Option 1: Move to Free */}
              <div className="bg-background border border-border rounded-xl p-5 flex flex-col justify-between space-y-4"> {/* profile frame */}
                <div>
                  <h4 className="font-bold text-foreground text-sm">Option A: Stay on Free Plan</h4> {/*[cite: 5] */}
                  <p className="text-xs text-muted-foreground mt-1">Accept unlimited orders with no fixed fees. Pay a flat commission fee per shipment.</p> {/*[cite: 5] */}
                  <div className="mt-3 text-lg font-black text-foreground">5% <span className="text-xs font-normal text-muted-foreground">per order</span></div> {/*[cite: 5] */}
                </div>
                <button
                  onClick={handleSwitchToFree}
                  disabled={actionLoading} //[cite: 5]
                  className="w-full py-2 bg-card border border-border text-foreground hover:bg-background rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  Stay on Free Plan <ArrowRight size={13} /> {/*[cite: 5] */}
                </button>
              </div>

              {/* Option 2: Upgrade to Basic */}
              <div className="bg-[#10B981]/5 border border-[#10B981]/30 rounded-xl p-5 flex flex-col justify-between space-y-4"> {/* profile conditional active style mapping */}
                <div>
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-foreground text-sm">Option B: Upgrade to RIVO BASIC</h4> {/*[cite: 5] */}
                    <span className="bg-[#10B981]/20 text-[#10B981] text-[9px] font-extrabold px-2 py-0.5 rounded-md tracking-wider">RECOMMENDED</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Keep maximizing your payout profits. Pay flat monthly fees and eliminate commission logic.</p> {/*[cite: 5] */}
                  <div className="mt-3 text-lg font-black text-[#10B981]">0% <span className="text-xs font-normal text-muted-foreground">Commission</span></div> {/*[cite: 5] */}
                </div>
                <button
                  onClick={openUpgradeModal}
                  className="w-full py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-xs font-bold transition-all shadow-sm text-center"
                >
                  Upgrade to RIVO BASIC (₹499) {/*[cite: 5] */}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CASE C: ACTIVE FIXED FREE PLAN TIER VIEW */}
        {isFree && (
          <div className="bg-[#0F172A] border border-border text-white rounded-xl p-6 shadow-sm relative overflow-hidden animate-in fade-in duration-200"> {/* profile profile banner box */}
            <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 w-64 h-64 bg-slate-700/10 rounded-full blur-3xl"></div> {/*[cite: 5] */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10"> {/*[cite: 5] */}
              <div>
                <span className="text-slate-400 bg-slate-800 border border-slate-700 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"> {/*[cite: 5] */}
                  Current Subscription
                </span>
                <h2 className="text-3xl font-black mt-4 tracking-tight">FREE PLAN</h2> {/*[cite: 5] */}
                <p className="text-slate-400 font-medium mt-1">5% Commission Per Order</p> {/*[cite: 5] */}
                <div className="mt-6 inline-flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg text-sm border border-slate-700"> {/*[cite: 5] */}
                  <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse"></span>
                  <span className="font-semibold text-slate-300">Status Active</span> {/*[cite: 5] */}
                </div>
              </div>
              <div>
                <button
                  onClick={openUpgradeModal}
                  className="bg-[#10B981] hover:bg-[#059669] text-white text-sm font-bold px-6 py-3 rounded-xl shadow-xs transition flex items-center gap-2 w-full md:w-auto justify-center"
                >
                  Upgrade To RIVO BASIC
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CASE D: ACTIVE RIVO BASIC (₹499) PLAN TIER VIEW */}
        {isBasic && (
          <div className="bg-gradient-to-br from-amber-500/20 via-amber-600/10 to-transparent border border-amber-500/40 shadow-sm text-foreground rounded-xl p-6 relative overflow-hidden animate-in fade-in duration-200">
            <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl"></div> {/*[cite: 5] */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10"> {/*[cite: 5] */}
              <div>
                <span className="text-amber-600 bg-amber-500/10 border border-amber-500/20 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Current Subscription
                </span>
                <h2 className="text-3xl font-black mt-4 tracking-tight text-foreground">RIVO BASIC</h2> {/*[cite: 5] */}
                <p className="text-muted-foreground font-medium mt-1">₹499 / Month</p> {/*[cite: 5] */}
                <div className="mt-6 inline-flex items-center gap-2 bg-amber-500/10 px-3 py-1.5 rounded-lg text-sm border border-amber-500/20"> {/*[cite: 5] */}
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span> {/*[cite: 5] */}
                  <span className="font-semibold text-amber-600">0% Commission</span>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4"> {/*[cite: 5] */}
                <div className="flex gap-3"> {/*[cite: 5] */}
                  <div className="bg-card border border-border px-4 py-3 rounded-xl min-w-[120px]">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Renewal Date</p> {/*[cite: 5] */}
                    <p className="text-base font-black mt-1 text-foreground"> {/*[cite: 5] */}
                      {activeSub?.end_date ? new Date(activeSub.end_date).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : 'N/A'} {/*[cite: 5] */}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2"> {/*[cite: 5] */}
                  <button
                    onClick={openUpgradeModal}
                    className="bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold px-4 py-2 rounded-lg transition text-center"
                  >
                    Renew Subscription {/*[cite: 5] */}
                  </button>
                  <button
                    onClick={handleCancelSubscription}
                    disabled={actionLoading} //[cite: 5]
                    className="bg-card hover:bg-background text-muted-foreground border border-border text-xs font-bold px-4 py-2 rounded-lg transition text-center" //[cite: 5]
                  >
                    Cancel Subscription {/*[cite: 5] */}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2 - STATS SECTION */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center justify-between"> {/* profile standard card context */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Plan</p> {/*[cite: 5] */}
            <p className="text-xl font-bold text-foreground mt-1">{displayPlanName}</p> {/*[cite: 5] */}
          </div>
          <div className={`p-3 rounded-xl bg-background text-muted-foreground border border-border`}>
            <CreditCard size={20} /> {/*[cite: 5] */}
          </div>
        </div>
        
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center justify-between"> {/*[cite: 5] */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Commission Rate</p> {/*[cite: 5] */}
            <p className="text-xl font-bold text-foreground mt-1">{currentCommission}%</p> {/*[cite: 5] */}
          </div>
          <div className="p-3 bg-background border border-border text-[#10B981] rounded-xl">
            <Percent size={20} /> {/*[cite: 5] */}
          </div>
        </div>
        
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center justify-between"> {/*[cite: 5] */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Sales</p> {/*[cite: 5] */}
            <p className="text-xl font-bold text-foreground mt-1">₹{totalSales.toLocaleString('en-IN')}</p> {/*[cite: 5] */}
          </div>
          <div className="p-3 bg-background border border-border text-[#10B981] rounded-xl">
            <TrendingUp size={20} /> {/*[cite: 5] */}
          </div>
        </div>
      </div>

      {/* SECTION 7 - AVAILABLE PLANS SECTION */}
      <div className="space-y-4 pt-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Available Plans</h3> {/*[cite: 5] */}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CARD: TRIAL PLAN */}
          <div className={`bg-card border rounded-xl p-6 flex flex-col justify-between shadow-sm relative ${
            isTrial ? 'ring-2 ring-[#10B981] border-transparent' : 'border-border' //[cite: 4, 5]
          }`}>
            <div>
              <div className="flex justify-between items-start"> {/*[cite: 5] */}
                <h4 className="font-bold text-foreground text-base">TRIAL PLAN</h4> {/*[cite: 5] */}
                {isTrial && <span className="bg-[#10B981]/10 text-[#10B981] text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full border border-[#10B981]/20">ACTIVE</span>} {/*[cite: 5] */}
              </div>
              <div className="mt-4 flex items-baseline text-foreground"> {/*[cite: 5] */}
                <span className="text-2xl font-black tracking-tight">₹0</span> {/*[cite: 5] */}
              </div>
              <ul className="mt-6 space-y-3 border-t border-border/40 pt-4 text-sm text-muted-foreground"> {/*[cite: 4, 5] */}
                <li className="flex items-center gap-2"><CheckCircle size={15} className="text-[#10B981] shrink-0" /> 60 Day Trial</li> {/*[cite: 5] */}
                <li className="flex items-center gap-2"><CheckCircle size={15} className="text-[#10B981] shrink-0" /> 0% Commission</li> {/*[cite: 5] */}
                <li className="flex items-center gap-2"><CheckCircle size={15} className="text-[#10B981] shrink-0" /> Premium Features</li> {/*[cite: 5] */}
              </ul>
            </div>
            <button 
              disabled 
              className="w-full mt-6 bg-background text-muted-foreground/40 border border-border py-2 rounded-xl text-sm font-bold cursor-not-allowed" //[cite: 5]
            >
              Current Plan {/*[cite: 5] */}
            </button>
          </div>

          {/* CARD: FREE PLAN */}
          <div className={`bg-card border rounded-xl p-6 flex flex-col justify-between shadow-sm relative ${
            isFree ? 'ring-2 ring-border border-transparent' : 'border-border' //[cite: 5]
          }`}>
            <div>
              <div className="flex justify-between items-start"> {/*[cite: 5] */}
                <h4 className="font-bold text-foreground text-base">FREE PLAN</h4> {/*[cite: 5] */}
                {isFree && <span className="bg-background text-foreground text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full border border-border">ACTIVE</span>} {/*[cite: 5] */}
              </div>
              <div className="mt-4 flex items-baseline text-foreground"> {/*[cite: 5] */}
                <span className="text-2xl font-black tracking-tight">₹0</span> {/*[cite: 5] */}
              </div>
              <ul className="mt-6 space-y-3 border-t border-border/40 pt-4 text-sm text-muted-foreground"> {/*[cite: 4, 5] */}
                <li className="flex items-center gap-2"><CheckCircle size={15} className="text-[#10B981] shrink-0" /> 5% Commission</li> {/*[cite: 5] */}
                <li className="flex items-center gap-2"><CheckCircle size={15} className="text-[#10B981] shrink-0" /> Unlimited Orders</li> {/*[cite: 5] */}
                <li className="flex items-center gap-2"><CheckCircle size={15} className="text-[#10B981] shrink-0" /> Unlimited Products</li> {/*[cite: 5] */}
              </ul>
            </div>
            <button 
              onClick={handleSwitchToFree}
              disabled={isFree || isTrialExpired || actionLoading} //[cite: 5]
              className={`w-full mt-6 py-2 rounded-xl text-sm font-bold transition ${
                isFree 
                  ? 'bg-background text-muted-foreground/40 border border-border cursor-not-allowed' //[cite: 5]
                  : 'bg-card border border-border text-foreground hover:bg-background' //[cite: 5]
              }`}
            >
              {isFree ? 'Current Plan' : 'Switch To Free'} {/*[cite: 5] */}
            </button>
          </div>

          {/* CARD: RIVO BASIC */}
          <div className={`bg-card border rounded-xl p-6 flex flex-col justify-between shadow-sm relative ${
            isBasic ? 'ring-2 ring-amber-500 border-transparent shadow-sm' : 'border-border' //[cite: 5]
          }`}>
            <div>
              <div className="flex justify-between items-start"> {/*[cite: 5] */}
                <h4 className="font-bold text-foreground text-base">RIVO BASIC</h4> {/*[cite: 5] */}
                {isBasic && <span className="bg-amber-500/10 text-amber-500 text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full border border-amber-500/20">ACTIVE</span>} {/*[cite: 5] */}
              </div>
              <div className="mt-4 flex items-baseline text-foreground"> {/*[cite: 5] */}
                <span className="text-2xl font-black tracking-tight">₹499</span> {/*[cite: 5] */}
                <span className="ml-1 text-xs font-semibold text-muted-foreground">/ Month</span> {/*[cite: 5] */}
              </div>
              <ul className="mt-6 space-y-3 border-t border-border/40 pt-4 text-sm text-muted-foreground"> {/*[cite: 4, 5] */}
                <li className="flex items-center gap-2"><CheckCircle size={15} className="text-[#10B981] shrink-0" /> 0% Commission</li> {/*[cite: 5] */}
                <li className="flex items-center gap-2"><CheckCircle size={15} className="text-[#10B981] shrink-0" /> Unlimited Orders</li> {/*[cite: 5] */}
                <li className="flex items-center gap-2"><CheckCircle size={15} className="text-[#10B981] shrink-0" /> Unlimited Products</li> {/*[cite: 5] */}
                <li className="flex items-center gap-2"><CheckCircle size={15} className="text-[#10B981] shrink-0" /> Priority Support</li> {/*[cite: 5] */}
              </ul>
            </div>
            <button 
              onClick={openUpgradeModal}
              disabled={isBasic} //[cite: 5]
              className={`w-full mt-6 py-2 rounded-xl text-sm font-bold transition ${
                isBasic 
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 cursor-not-allowed' //[cite: 5]
                  : 'bg-[#10B981] text-white hover:bg-[#059669]' //[cite: 5]
              }`}
            >
              Upgrade Now {/*[cite: 5] */}
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 9 - ADMIN REQUEST NOTE */}
      <div className="bg-card border border-border p-4 rounded-xl flex items-start gap-3 mt-6"> {/*[cite: 5] */}
        <Info size={18} className="text-muted-foreground mt-0.5 shrink-0" /> {/*[cite: 5] */}
        <span className="text-xs text-muted-foreground font-medium leading-relaxed"> {/*[cite: 5] */}
          Plan upgrades and renewals are reviewed by Rivo Admin. Once approved, your subscription is activated automatically. {/*[cite: 5] */}
        </span>
      </div>

      {/* SUBSCRIPTION UPGRADE MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-card rounded-2xl max-w-md w-full border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-150 p-6 space-y-5 my-8">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div>
                <h2 className="text-xl font-black text-foreground tracking-tight">RIVO BASIC</h2> {/*[cite: 5] */}
                <p className="text-sm font-bold text-[#10B981] mt-0.5">₹499 / Month</p> {/*[cite: 5] */}
              </div>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-background transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {settingsLoading ? ( //[cite: 5]
              <div className="flex flex-col items-center justify-center py-10 space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-[#10B981]" />
                <span className="text-xs font-medium text-muted-foreground">Loading Payment Details...</span> {/*[cite: 5] */}
              </div>
            ) : (
              <form onSubmit={handlePaymentSubmit} className="space-y-5"> {/*[cite: 5] */}
                
                {/* Payment Instructions */}
                <div className="bg-background border border-border rounded-xl p-3.5 space-y-2 text-xs text-muted-foreground"> {/* profile component matching */}
                  <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px]">Payment Instructions</h4> {/*[cite: 5] */}
                  <ol className="list-decimal list-inside space-y-1 font-medium"> {/*[cite: 5] */}
                    <li>Scan QR and pay ₹499</li> {/*[cite: 5] */}
                    <li>Or pay using UPI ID</li> {/*[cite: 5] */}
                    <li>After payment enter UTR number</li> {/*[cite: 5] */}
                    <li>Submit request for admin verification</li> {/*[cite: 5] */}
                  </ol> {/*[cite: 5] */}
                </div>

                {/* Scan QR To Pay */}
                {platformSettings?.subscription_qr_url && ( //[cite: 5]
                  <div className="text-center space-y-2 pt-1">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Scan QR To Pay</h4> {/*[cite: 5] */}
                    <div className="flex items-center justify-center bg-white border border-border p-4 rounded-2xl max-w-[240px] mx-auto shadow-sm"> {/* White container forced for scannability */}
                      <img 
                        src={platformSettings.subscription_qr_url} //[cite: 5]
                        alt="Subscription Payment QR Code" //[cite: 5]
                        className="w-full h-auto object-contain rounded-md select-none pointer-events-none" //[cite: 5]
                      />
                    </div>
                  </div>
                )}

                {/* UPI ID Presentation Row Block */}
                {platformSettings?.subscription_upi_id && ( //[cite: 5]
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">UPI ID</label> {/*[cite: 5] */}
                    <div className="flex items-center justify-between gap-2 bg-background border border-border rounded-xl p-2 pl-3"> {/* profile dark field context mapping */}
                      <span className="text-sm font-mono font-bold text-foreground select-all truncate">
                        {platformSettings.subscription_upi_id} {/*[cite: 5] */}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyUpi(platformSettings.subscription_upi_id)} //[cite: 5]
                        className="px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground hover:text-foreground hover:bg-background shadow-2xs flex items-center gap-1 text-xs font-bold shrink-0 transition-colors"
                      >
                        <Copy size={13} /> Copy UPI {/*[cite: 5] */}
                      </button>
                    </div>
                  </div>
                )}

                {/* UTR Number Input Block (Required) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider block">UTR Number</label> {/*[cite: 4, 5] */}
                  <input
                    type="text"
                    required //[cite: 5]
                    placeholder="Enter payment UTR number" //[cite: 5]
                    value={utrNumber} //[cite: 5]
                    onChange={(e) => setUtrNumber(e.target.value)} //[cite: 5]
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-mono font-medium focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/10 placeholder-muted-foreground/60 text-foreground" // profile input field system match[cite: 4]
                  />
                </div>

                {/* Warning message if duplicate request exists */}
                {hasPendingRequest && ( //[cite: 5]
                  <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-xs text-amber-500 font-semibold shadow-2xs"> {/* dark mode notice formatting */}
                    <AlertCircle size={15} className="shrink-0 text-amber-500" />
                    <span>Your payment request is already under review.</span> {/*[cite: 5] */}
                  </div>
                )}

                {/* Modal Controls Footer Layout */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/40 text-xs font-semibold"> {/*[cite: 4, 5] */}
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)} //[cite: 5]
                    className="flex-1 h-10 rounded-xl border border-border bg-card text-foreground hover:bg-background transition-colors" //[cite: 5]
                  >
                    Cancel {/*[cite: 5] */}
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || hasPendingRequest} //[cite: 5]
                    className="flex-1 h-10 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white shadow-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" //[cite: 4, 5]
                  >
                    {actionLoading && <Loader2 size={14} className="animate-spin" />} {/*[cite: 5] */}
                    Submit Request {/*[cite: 5] */}
                  </button>
                </div>

              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}