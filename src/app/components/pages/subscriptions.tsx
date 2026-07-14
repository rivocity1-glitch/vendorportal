import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from "../../../lib/supabase";
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
  ArrowRight,
  Sparkles,
  Lock
} from 'lucide-react';

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
}

interface PlanFeatures {
  [key: string]: boolean;
}

interface PlanConfig {
  price: number;
  commission_percent: number;
  features: PlanFeatures;
  isComingSoon?: boolean;
}

interface PlatformSettings {
  subscription_upi_id: string;
  subscription_qr_url: string;
  plans?: Record<string, PlanConfig>;
  config?: { plans: Record<string, PlanConfig> };
  setting_value?: { plans: Record<string, PlanConfig> };
}

interface PaymentRequest {
  id: string;
  vendor_id: string;
  plan_name: string;
  status: string;
}

export default function Subscriptions() {
  // --- STATES ---
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSub, setActiveSub] = useState<Subscription | null>(null);
  const [totalSales, setTotalSales] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // --- SUB-STATES FOR MODAL AND PAYMENT ---
  const [currentVendorId, setCurrentVendorId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; config: PlanConfig } | null>(null);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PaymentRequest[]>([]);
  
  // Form Inputs
  const [utrNumber, setUtrNumber] = useState<string>('');

  // --- HELPER FUNCTIONS ---
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const calculateDaysRemaining = (endDateStr: string | null | undefined): number => {
    if (!endDateStr) return 0;
    const end = new Date(endDateStr);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const formatFeatureName = (key: string): string => {
    return key
      .split(/[_-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleCopyUpi = async (upiId: string) => {
    try {
      await navigator.clipboard.writeText(upiId);
      showToast('UPI ID copied', 'success');
    } catch (err) {
      showToast('Failed to copy text.', 'error');
    }
  };

  // --- DATA FETCHING ---
  const fetchSubscriptionAndSalesData = async () => {
    try {
      setLoading(true);
      
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session) throw new Error('Unauthorized');
      
      const authUserId = session.user.id;

      const { data: vendor, error: vendorError } = await supabase
        .from("vendors")
        .select("id")
        .eq("auth_user_id", authUserId)
        .single();

      if (vendorError || !vendor) {
        throw new Error("Vendor not found");
      }

      const resolvedVendorId = vendor.id;
      setCurrentVendorId(resolvedVendorId);

      // Fetch Platform Settings for configuration and payment gateways
      const { data: settings, error: settingsError } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('setting_key', 'subscription_config')
        .maybeSingle();

      if (settingsError) throw settingsError;
      if (settings) setPlatformSettings(settings);

      // Fetch pending verification requests
      const { data: pendingReqs, error: pendingError } = await supabase
        .from('subscription_payment_requests')
        .select('id, vendor_id, plan_name, status')
        .eq('vendor_id', resolvedVendorId)
        .eq('status', 'pending');

      if (!pendingError && pendingReqs) {
        setPendingRequests(pendingReqs);
      }

      // Fetch Current Active Subscription
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('vendor_id', resolvedVendorId)
        .eq('status', 'active')
        .maybeSingle();

      if (subError) throw subError;
      
      // Backward compatibility normalizing mapping definitions
      if (subData) {
        let normalizedPlan = subData.plan_name;
        if (normalizedPlan === "499") normalizedPlan = "basic";
        if (normalizedPlan === "FREE") normalizedPlan = "free";
        subData.plan_name = normalizedPlan;
      }
      setActiveSub(subData);

      // Fetch Delivered Orders for Sales Calculations using correct lowercase value 'delivered'
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('vendor_id', resolvedVendorId)
        .eq('order_status', 'delivered');

      if (orderError) throw orderError;

      if (orderData) {
        const salesAccumulator = orderData.reduce((sum, order) => sum + (order.total_amount || 0), 0);
        setTotalSales(salesAccumulator);
      }

    } catch (error) {
      console.error('Error loading subscription data:', error);
      showToast(error instanceof Error ? error.message : 'Failed to sync data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionAndSalesData();
  }, []);

  // --- REALTIME SUBSCRIPTIONS ---
  useEffect(() => {
    if (!currentVendorId) return;

    const subscriptionChannel = supabase
      .channel('subscription-realtime-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions', filter: `vendor_id=eq.${currentVendorId}` },
        () => { fetchSubscriptionAndSalesData(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscription_payment_requests', filter: `vendor_id=eq.${currentVendorId}` },
        () => { fetchSubscriptionAndSalesData(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscriptionChannel);
    };
  }, [currentVendorId]);

  // --- MEMOIZED DERIVED VALUES ---
  const plansList = useMemo(() => {
    // Overriding structure with the explicit target launch plans
    return [
      {
        name: "free",
        config: {
          price: 0,
          commission_percent: 5,
          features: { 
            "no_monthly_fee": true, 
            "unlimited_orders": true, 
            "basic_analytics": true, 
            "standard_support": true,
            "fixed_monthly_fee": false,
            "zero_commission": false,
            "premium_analytics": false,
            "priority_support": false,
            "custom_branding": false,
            "marketing_tools": false,
            "route_multipliers": false,
            "enterprise_suite": false,
            "vip_manager": false,
            "api_integration": false,
            "unlimited_everything": false
          }
        }
      },
      {
        name: "basic",
        config: {
          price: 499,
          commission_percent: 0,
          features: { 
            "fixed_monthly_fee": true, 
            "zero_commission": true, 
            "unlimited_orders": true, 
            "premium_analytics": true,
            "no_monthly_fee": false,
            "basic_analytics": false,
            "standard_support": false,
            "priority_support": false,
            "custom_branding": false,
            "marketing_tools": false,
            "route_multipliers": false,
            "enterprise_suite": false,
            "vip_manager": false,
            "api_integration": false,
            "unlimited_everything": false
          }
        }
      },
      {
        name: "growth",
        config: {
          price: 999,
          commission_percent: 0,
          isComingSoon: true,
          features: { 
            "priority_support": true, 
            "custom_branding": true, 
            "marketing_tools": true, 
            "route_multipliers": true,
            "no_monthly_fee": false,
            "unlimited_orders": false,
            "basic_analytics": false,
            "standard_support": false,
            "fixed_monthly_fee": false,
            "zero_commission": false,
            "premium_analytics": false,
            "enterprise_suite": false,
            "vip_manager": false,
            "api_integration": false,
            "unlimited_everything": false
          }
        }
      },
      {
        name: "pro",
        config: {
          price: 1499,
          commission_percent: 0,
          isComingSoon: true,
          features: { 
            "enterprise_suite": true, 
            "vip_manager": true, 
            "api_integration": true, 
            "unlimited_everything": true,
            "no_monthly_fee": false,
            "unlimited_orders": false,
            "basic_analytics": false,
            "standard_support": false,
            "fixed_monthly_fee": false,
            "zero_commission": false,
            "premium_analytics": false,
            "priority_support": false,
            "custom_branding": false,
            "marketing_tools": false,
            "route_multipliers": false
          }
        }
      }
    ];
  }, []);

  const activePlanConfig = useMemo(() => {
    if (!activeSub || plansList.length === 0) return null;
    return plansList.find(p => p.name.toLowerCase() === activeSub.plan_name.toLowerCase())?.config || null;
  }, [activeSub, plansList]);

  const daysRemaining = useMemo(() => {
    return calculateDaysRemaining(activeSub?.end_date);
  }, [activeSub]);

  // --- MUTATION ACTIONS ---
  const handlePlanAction = async (planName: string, planConfig: PlanConfig) => {
    if (planConfig.isComingSoon) return;

    // Payment modal only opens for basic plan
    if (planName === "basic") {
      setSelectedPlan({ name: planName, config: planConfig });
      setShowPaymentModal(true);
      return;
    }

    // Direct transition logic for free tier bypassing payment inputs
    if (planName === "free") {
      const confirmSwitch = window.confirm("Are you sure you want to switch to the FREE plan?");
      if (!confirmSwitch) return;

      setActionLoading(true);
      try {
        const { error: insertError } = await supabase
          .from('subscription_payment_requests')
          .insert([{
            vendor_id: currentVendorId,
            plan_name: 'free',
            amount: 0,
            utr_number: 'FREE_TIER',
            status: 'pending',
            created_at: new Date().toISOString()
          }]);

        if (insertError) throw insertError;

        showToast('Subscription request submitted successfully.', 'success');
        await fetchSubscriptionAndSalesData();
      } catch (err) {
        console.error('Submission failed:', err);
        showToast(err instanceof Error ? err.message : 'Submission failed.', 'error');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVendorId || !selectedPlan || selectedPlan.name !== "basic") return;
    
    const hasPendingForThisPlan = pendingRequests.some(r => r.plan_name.toLowerCase() === selectedPlan.name.toLowerCase());
    if (hasPendingForThisPlan) {
      showToast('Your payment request for this plan is already under review.', 'error');
      return;
    }

    if (!utrNumber.trim()) {
      showToast('Please enter a valid UTR Number.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const { error: insertError } = await supabase
        .from('subscription_payment_requests')
        .insert([{
          vendor_id: currentVendorId,
          plan_name: 'basic',
          amount: 499,
          utr_number: utrNumber.trim(),
          status: 'pending',
          created_at: new Date().toISOString()
        }]);

      if (insertError) throw insertError;

      showToast('Subscription request submitted successfully.', 'success');
      setShowPaymentModal(false);
      setUtrNumber('');
      await fetchSubscriptionAndSalesData();
    } catch (err) {
      console.error('Submission failed:', err);
      showToast(err instanceof Error ? err.message : 'Submission failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!activeSub) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({  
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', activeSub.id);

      if (error) throw error;
      showToast('Your subscription has been cancelled successfully.', 'success');
      await fetchSubscriptionAndSalesData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Cancellation failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const getPlanDisplayName = (name: string): string => {
    return name.toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center bg-background">
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
          {toast.type === 'success' ? <CheckCircle size={18} className="text-[#10B981]" /> : <AlertCircle size={18} />}
          <span className="text-sm">{toast.message}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="pb-2 border-b border-border/40">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Subscriptions</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your dynamic platform subscription architecture</p>
      </div>

      {/* CURRENT ACTIVE SUBSCRIPTION MODULE PANEL */}
      {activeSub ? (
        <div className="bg-gradient-to-br from-[#10B981] via-[#059669] to-teal-900 text-white rounded-xl p-6 shadow-sm border border-border relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <span className="text-emerald-100 bg-emerald-950/40 border border-white/20 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                Active Subscription
              </span>
              <h2 className="text-3xl font-black mt-4 tracking-tight uppercase">{getPlanDisplayName(activeSub.plan_name)} Plan</h2>
              <p className="text-emerald-100/90 font-medium mt-1">
                Price: ₹{activePlanConfig?.price ?? 0} | Commission: {activeSub.commission_percent}%
              </p>
              
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-emerald-100/80 border-t border-white/10 pt-4">
                <div>
                  <span className="block font-bold opacity-70">START DATE</span>
                  <span className="font-mono font-medium">{new Date(activeSub.start_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                </div>
                <div>
                  <span className="block font-bold opacity-70">END DATE</span>
                  <span className="font-mono font-medium">
                    {activeSub.plan_name === "free" || !activeSub.end_date ? 'Lifetime / Continuous' : new Date(activeSub.end_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </span>
                </div>
                <div>
                  <span className="block font-bold opacity-70">STATUS</span>
                  <span className="capitalize bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-400/30">{activeSub.status}</span>
                </div>
                <div>
                  <span className="block font-bold opacity-70">DAYS REMAINING</span>
                  <span className="font-bold text-white text-sm">{activeSub.plan_name === "free" ? 'Unlimited' : `${daysRemaining} Days`}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={handleCancelSubscription}
                disabled={actionLoading}
                className="bg-emerald-950/40 hover:bg-emerald-950/60 text-white border border-white/20 text-xs font-bold px-4 py-2 rounded-lg transition text-center disabled:opacity-50"
              >
                Cancel Subscription
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card border-2 border-dashed border-border rounded-2xl p-6 text-center space-y-2">
          <AlertCircle className="mx-auto text-muted-foreground" size={32} />
          <h3 className="text-md font-bold text-foreground">No Active Subscription</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">Please select one of our dynamically mapped subscription plan tiers below to get started.</p>
        </div>
      )}

      {/* STATS SECTION */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Plan</p>
            <p className="text-xl font-bold text-foreground mt-1 uppercase">{activeSub ? getPlanDisplayName(activeSub.plan_name) : "None"}</p>
          </div>
          <div className="p-3 rounded-xl bg-background text-muted-foreground border border-border">
            <CreditCard size={20} />
          </div>
        </div>
        
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Commission Rate</p>
            <p className="text-xl font-bold text-foreground mt-1">{activeSub?.commission_percent ?? 0}%</p>
          </div>
          <div className="p-3 bg-background border border-border text-[#10B981] rounded-xl">
            <Percent size={20} />
          </div>
        </div>
        
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Sales</p>
            <p className="text-xl font-bold text-foreground mt-1">₹{totalSales.toLocaleString('en-IN')}</p>
          </div>
          <div className="p-3 bg-background border border-border text-[#10B981] rounded-xl">
            <TrendingUp size={20} />
          </div>
        </div>
      </div>

      {/* AVAILABLE DYNAMIC PLANS SECTION */}
      <div className="space-y-4 pt-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Available Subscription Plans</h3>
          <p className="text-xs text-muted-foreground">Dynamically loaded from platform engine configurations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plansList.map(({ name, config }) => {
            const isCurrent = activeSub?.plan_name?.toLowerCase() === name.toLowerCase();
            const pendingReq = pendingRequests.find(r => r.plan_name.toLowerCase() === name.toLowerCase());
            
            // Layout naming override logic maps text correctly
            let cardLabel = getPlanDisplayName(name);
            if (name === "basic") cardLabel = "₹499 BASIC";
            if (name === "growth") cardLabel = "₹999 GROWTH";
            if (name === "pro") cardLabel = "₹1499 PRO";

            return (
              <div 
                key={name}
                className={`bg-card border rounded-xl p-6 flex flex-col justify-between shadow-sm relative transition-all ${
                  isCurrent ? 'ring-2 ring-[#10B981] border-transparent' : 'border-border'
                } ${config.isComingSoon ? 'opacity-75' : ''}`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-foreground text-sm uppercase tracking-tight">{cardLabel}</h4>
                    {isCurrent && (
                      <span className="bg-[#10B981]/10 text-[#10B981] text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full border border-[#10B981]/20">
                        ACTIVE
                      </span>
                    )}
                    {config.isComingSoon && (
                      <span className="bg-muted text-muted-foreground text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full border border-border">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-4 flex items-baseline text-foreground">
                    <span className="text-2xl font-black tracking-tight">₹{config.price}</span>
                    <span className="ml-1 text-xs font-semibold text-muted-foreground">{name === "free" ? "" : "/ Month"}</span>
                  </div>

                  <div className="mt-2 text-xs font-bold text-emerald-600 dark:text-[#10B981]">
                    {config.commission_percent}% Commission Rate
                  </div>

                  {/* Dynamic Features List Mapping */}
                  <ul className="mt-6 space-y-3 border-t border-border/40 pt-4 text-sm text-muted-foreground">
                    {Object.entries(config.features || {}).map(([featureKey, isEnabled]) => (
                      <li key={featureKey} className="flex items-center gap-2">
                        <CheckCircle 
                          size={15} 
                          className={`shrink-0 ${isEnabled ? 'text-[#10B981]' : 'text-muted-foreground/30'}`} 
                        /> 
                        <span className={isEnabled ? 'text-foreground/90 font-medium' : 'line-through opacity-40'}>
                          {formatFeatureName(featureKey)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Contextual Action Button Logic */}
                <button 
                  type="button"
                  onClick={() => handlePlanAction(name, config)}
                  disabled={isCurrent || !!pendingReq || actionLoading || config.isComingSoon} 
                  className={`w-full mt-6 py-2 rounded-xl text-sm font-bold transition-all border ${
                    config.isComingSoon
                      ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                      : isCurrent 
                        ? 'bg-background text-muted-foreground/40 border-border cursor-not-allowed'
                        : pendingReq 
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 cursor-not-allowed animate-pulse'
                          : name === "basic" && activeSub?.plan_name === "free"
                            ? 'bg-[#10B981] text-white hover:bg-[#059669] border-transparent'
                            : 'bg-card border-border text-foreground hover:bg-background'
                  }`}
                >
                  {config.isComingSoon
                    ? 'Coming Soon'
                    : isCurrent 
                      ? 'Current Plan' 
                      : pendingReq 
                        ? 'Waiting For Approval' 
                        : name === "free"
                          ? 'Switch to Free'
                          : activeSub?.plan_name === "free"
                            ? 'Upgrade'
                            : 'Select Plan'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ADMIN REQUEST NOTE */}
      <div className="bg-card border border-border p-4 rounded-xl flex items-start gap-3 mt-6">
        <Info size={18} className="text-muted-foreground mt-0.5 shrink-0" />
        <span className="text-xs text-muted-foreground font-medium leading-relaxed">
          Plan updates, upgrades, and structural tier configurations are synchronized in real-time. Paid items undergo admin pipeline verifications.
        </span>
      </div>

      {/* DYNAMIC SUBSCRIPTION UPGRADE / TRANSACTION MODAL */}
      {showPaymentModal && selectedPlan && selectedPlan.name === "basic" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-card rounded-2xl max-w-md w-full border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-150 p-6 space-y-5 my-8">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div>
                <h2 className="text-xl font-black text-foreground tracking-tight uppercase">{getPlanDisplayName(selectedPlan.name)} Tier Request</h2>
                <p className="text-sm font-bold text-[#10B981] mt-0.5">₹{selectedPlan.config.price} / Month</p>
              </div>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-background transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-5">
              
              <div className="bg-background border border-border rounded-xl p-3.5 space-y-2 text-xs text-muted-foreground">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px]">Payment Instructions</h4>
                <ol className="list-decimal list-inside space-y-1 font-medium">
                  <li>Scan QR and transfer exactly ₹{selectedPlan.config.price}</li>
                  <li>Or authorize to the platform destination UPI ID</li>
                  <li>Extract and paste your financial gateway UTR tracking reference below</li>
                </ol>
              </div>

              {/* Scan QR To Pay */}
              {platformSettings?.subscription_qr_url && (
                <div className="text-center space-y-2 pt-1">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Scan QR To Pay</h4>
                  <div className="flex items-center justify-center bg-white border border-border p-4 rounded-2xl max-w-[240px] mx-auto shadow-sm">
                    <img 
                      src={platformSettings.subscription_qr_url}
                      alt="Platform Gateway Code Asset"
                      className="w-full h-auto object-contain rounded-md select-none"
                    />
                  </div>
                </div>
              )}

              {/* UPI ID Presentation Block */}
              {platformSettings?.subscription_upi_id && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">UPI ID</label>
                  <div className="flex items-center justify-between gap-2 bg-background border border-border rounded-xl p-2 pl-3">
                    <span className="text-sm font-mono font-bold text-foreground select-all truncate">
                      {platformSettings.subscription_upi_id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyUpi(platformSettings.subscription_upi_id!)}
                      className="px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-background shadow-2xs flex items-center gap-1 text-xs font-bold shrink-0 transition-colors"
                    >
                      <Copy size={13} /> Copy UPI
                    </button>
                  </div>
                </div>
              )}

              {/* UTR Number Input Block */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider block">UTR / Transaction Reference Number</label>
                <input
                  type="text"
                  required
                  placeholder="Enter the 12-digit payment UTR key"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-mono font-medium focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/10 text-foreground"
                />
              </div>

              {/* Warning notice if duplicate check returns validation locks */}
              {pendingRequests.some(r => r.plan_name.toLowerCase() === selectedPlan.name.toLowerCase()) && (
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-xs text-amber-500 font-semibold shadow-2xs">
                  <AlertCircle size={15} className="shrink-0 text-amber-500" />
                  <span>A request for {selectedPlan.name} is already under verification review.</span>
                </div>
              )}

              {/* Footer Controls */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/40 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 h-10 rounded-xl border border-border bg-card text-foreground hover:bg-background transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || pendingRequests.some(r => r.plan_name.toLowerCase() === selectedPlan.name.toLowerCase())}
                  className="flex-1 h-10 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white shadow-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {actionLoading && <Loader2 size={14} className="animate-spin" />}
                  Submit Request
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}