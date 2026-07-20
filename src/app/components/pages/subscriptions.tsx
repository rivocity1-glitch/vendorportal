import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from "../../../lib/supabase";
import { 
  CreditCard, 
  Percent, 
  BarChart3,
  Check, 
  X, 
  AlertCircle, 
  Loader2,
  CheckCircle2
} from 'lucide-react';

// ==========================================
// DATA TYPE DEFINITIONS
// ==========================================
interface Subscription {
  id: string;
  vendor_id: string;
  plan_name: 'free' | 'basic' | 'growth' | 'pro';
  commission_percent: number;
  start_date: string;
  end_date: string | null;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  plan_code: string | null;
  is_trial: boolean;
  subscription_type: 'trial' | 'free' | 'paid';
  trial_decision: 'pending' | 'free' | 'basic';
  monthly_settlement_request_limit: number | null;
  max_profile_banners: number | null;
}

interface PaymentRequest {
  id: string;
  vendor_id: string;
  plan_name: string;
  amount: number;
  utr_number: string;
  payment_screenshot_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approved_at: string | null;
  remarks: string | null;
}

interface PlatformConfig {
  subscription_upi_id: string;
  subscription_qr_url: string;
}

interface CardConfig {
  name: string;
  priceLabel: string;
  description: string;
  pros: string[];
  cons?: string[];
  tagline: string;
  isComingSoon?: boolean;
}

interface DbPlanConfig {
  plan_name: string;
  display_name: string | null;
  monthly_price: number | null;
  commission_percent: number | null;
  monthly_settlement_request_limit: number | null;
  max_profile_banners: number | null;
  is_active: boolean | null;
}

export default function Subscriptions() {
  // Core Sync States
  const [loading, setLoading] = useState<boolean>(true);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [history, setHistory] = useState<PaymentRequest[]>([]);
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [totalSales, setTotalSales] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  
  // Master Configuration memory space store
  const [masterPlans, setMasterPlans] = useState<DbPlanConfig[]>([]);

  // Modal & Form States
  const [payModal, setPayModal] = useState<{ open: boolean; planName: string; price: number }>({ open: false, planName: '', price: 0 });
  const [showReminder, setShowReminder] = useState<boolean>(false);
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Day Counter Calculation
  const daysRemaining = useMemo(() => {
    if (!subscription?.end_date) return 0;
    const diff = new Date(subscription.end_date).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }, [subscription]);

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // DATA PIPELINE SYNC ENGINE
  const syncData = useCallback(async (targetVendorId: string) => {
    if (!targetVendorId) return;
    try {
      console.log("[Realtime Sync Engine] Executing complete data pull for vendor:", targetVendorId);
      const { data: settings } = await supabase
        .from('platform_settings')
        .select('subscription_upi_id, subscription_qr_url')
        .eq('setting_key', 'subscription_config')
        .maybeSingle();

      const parsedConfig: PlatformConfig = {
        subscription_upi_id: settings?.subscription_upi_id || '',
        subscription_qr_url: settings?.subscription_qr_url || ''
      };

      // Query master layout parameters setup from subscription_plans instead of user mapping histories table
      const { data: plansData } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true);

      const activePlans = (plansData || []) as DbPlanConfig[];
      setMasterPlans(activePlans);

      const [subResponse, historyResponse, salesResponse] = await Promise.all([
        supabase.from('subscriptions').select('id, vendor_id, plan_name, commission_percent, start_date, end_date, status, created_at, updated_at, plan_code, is_trial, subscription_type, trial_decision, monthly_settlement_request_limit, max_profile_banners').eq('vendor_id', targetVendorId).eq('status', 'active').maybeSingle(),
        supabase.from('subscription_payment_requests').select('*').eq('vendor_id', targetVendorId).order('created_at', { ascending: false }),
        supabase.from('orders').select('total_amount').eq('vendor_id', targetVendorId).eq('order_status', 'delivered')
      ]);

      const subData = subResponse.data as Subscription | null;
      const historyData = (historyResponse.data || []) as PaymentRequest[];
      const totalSalesCalculated = (salesResponse.data || []).reduce((sum, order) => sum + (order.total_amount || 0), 0);

      setSubscription(subData);
      setHistory(historyData);
      setTotalSales(totalSalesCalculated);
      setConfig(parsedConfig);

      if (subData && subData.subscription_type === 'trial') {
        const end = new Date(subData.end_date || '');
        const remaining = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        if (remaining <= 0) {
          if (subData.trial_decision === 'free' || subData.trial_decision === 'pending') {
            const masterFree = activePlans.find(p => String(p.plan_name).toLowerCase() === 'free');

            await supabase
              .from('subscriptions')
              .update({
                plan_name: 'free',
                subscription_type: 'free',
                is_trial: false,
                commission_percent: masterFree?.commission_percent ?? 5,
                monthly_settlement_request_limit: masterFree?.monthly_settlement_request_limit ?? 3,
                max_profile_banners: masterFree?.max_profile_banners ?? 2,
                end_date: null,
                updated_at: new Date().toISOString()
              })
              .eq('id', subData.id);

            const { data: updatedSub } = await supabase.from('subscriptions').select('id, vendor_id, plan_name, commission_percent, start_date, end_date, status, created_at, updated_at, plan_code, is_trial, subscription_type, trial_decision, monthly_settlement_request_limit, max_profile_banners').eq('vendor_id', targetVendorId).eq('status', 'active').maybeSingle();
            setSubscription(updatedSub as Subscription | null);
          }
        }
      }
    } catch (err) {
      console.error('Data layer synchronization fault:', err);
    }
  }, []);

  // Initialization Hook
  useEffect(() => {
    async function initialize() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: vendor } = await supabase
          .from('vendors')
          .select('id')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();

        if (vendor?.id) {
          setVendorId(vendor.id);
          await syncData(vendor.id);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    }
    initialize();
  }, [syncData]);

  // FIXED REALTIME SYSTEM LAYER
  useEffect(() => {
    if (!vendorId) return;

    console.log("[Realtime Channel] Initializing engine channel listener pipeline for vendor:", vendorId);

    const channel = supabase
      .channel(`realtime_vendor_sub_channel_${vendorId}`)
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'subscriptions' }, 
        (payload) => {
          console.log("[Realtime Engine] Raw broadcast event captured from subscriptions:", payload);
          const oldRow = payload.old as Partial<Subscription> | null;
          const newRow = payload.new as Partial<Subscription> | null;
          
          if ((newRow && newRow.vendor_id === vendorId) || (oldRow && oldRow.vendor_id === vendorId)) {
            console.log("[Realtime Match] Event confirmed for current vendor workspace. Executing syncData().");
            syncData(vendorId);
          }
        }
      )
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'subscription_payment_requests' }, 
        (payload) => {
          console.log("[Realtime Engine] Raw broadcast event captured from requests log:", payload);
          const oldRow = payload.old as Partial<PaymentRequest> | null;
          const newRow = payload.new as Partial<PaymentRequest> | null;
          
          if ((newRow && newRow.vendor_id === vendorId) || (oldRow && oldRow.vendor_id === vendorId)) {
            console.log("[Realtime Match] Event confirmed for transaction requests log. Executing syncData().");
            syncData(vendorId);
          }
        }
      );

    channel.subscribe((status, error) => {
      console.log(`[Realtime Gateway Pipeline Status Report]: ${status}`);
      if (error) console.error("[Realtime Subscription Fault]:", error);
    });

    return () => {
      console.log("[Realtime Channel] Unmounting component view. Cleaning up active channel pipeline stream.");
      supabase.removeChannel(channel);
    };
  }, [vendorId, syncData]);

  useEffect(() => {
    if (subscription?.subscription_type === 'trial' && daysRemaining <= 5 && daysRemaining > 0) {
      const lastSeen = localStorage.getItem('trial_popup_last_seen');
      const now = Date.now();
      const threeHours = 1000 * 60 * 60 * 3;

      if (!lastSeen || now - parseInt(lastSeen, 10) > threeHours) {
        setShowReminder(true);
        localStorage.setItem('trial_popup_last_seen', now.toString());
      }
    }
  }, [subscription, daysRemaining]);

  const handleSelectPlan = async (planName: string, price: number) => {
    if (planName === 'free') {
      setActionLoading(true);
      try {
        if (subscription) {
          if (subscription.subscription_type === 'trial') {
            await supabase
              .from('subscriptions')
              .update({ trial_decision: 'free', updated_at: new Date().toISOString() })
              .eq('id', subscription.id);
            triggerToast('Request submitted. You will switch to the Free plan automatically when your trial ends.');
          } else {
            await supabase
              .from('subscription_payment_requests')
              .insert([{
                vendor_id: vendorId,
                plan_name: 'free',
                amount: 0,
                utr_number: 'DOWNGRADE_REQUEST',
                status: 'pending',
                created_at: new Date().toISOString()
              }]);
            triggerToast('Request submitted. Downgrade is pending admin approval.');
          }
          if (vendorId) await syncData(vendorId);
        }
      } catch (err) {
        console.error(err);
        triggerToast('Failed to submit plan request.', 'error');
      } finally {
        setActionLoading(false);
      }
      return;
    }

    setPaymentError('');
    setUtrNumber('');
    setPayModal({ open: true, planName, price });
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId || !subscription || !utrNumber.trim()) return;

    setActionLoading(true);
    setPaymentError('');
    try {
      const targetPlanLower = payModal.planName.toLowerCase();
      
      // Load specific plan profile constraints configuration cleanly from subscription_plans master definitions
      const planMasterSpec = masterPlans.find(p => String(p.plan_name).toLowerCase() === targetPlanLower);

      if (!planMasterSpec) {
        throw new Error(`Master configuration profile for plan '${payModal.planName}' was not established inside the database mappings data.`);
      }

      const { error: reqError } = await supabase
        .from('subscription_payment_requests')
        .insert([{
          vendor_id: vendorId,
          plan_name: payModal.planName,
          amount: payModal.price,
          utr_number: utrNumber.trim(),
          status: 'pending',
          created_at: new Date().toISOString()
        }]);

      if (reqError) throw reqError;

      if (subscription.subscription_type === 'trial') {
        await supabase
          .from('subscriptions')
          .update({ trial_decision: payModal.planName as 'free' | 'basic', updated_at: new Date().toISOString() })
          .eq('id', subscription.id);
      } else {
        // Cascade changes safely parsing structural properties definitions directly from subscription_plans row metadata mappings
        await supabase
          .from('subscriptions')
          .update({
            plan_name: targetPlanLower,
            commission_percent: planMasterSpec.commission_percent ?? 0,
            monthly_settlement_request_limit: planMasterSpec.monthly_settlement_request_limit,
            max_profile_banners: planMasterSpec.max_profile_banners,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);
      }

      setPayModal({ open: false, planName: '', price: 0 });
      triggerToast('Request submitted successfully. Waiting for admin verification.');
      await syncData(vendorId);
    } catch (err: any) {
      setPaymentError(err.message || 'Error executing request sequence.');
      triggerToast('Failed to submit verification request.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const catalog: CardConfig[] = useMemo(() => {
    const freePlanSpec = masterPlans.find(p => String(p.plan_name).toLowerCase() === 'free');
    const basicPlanSpec = masterPlans.find(p => String(p.plan_name).toLowerCase() === 'basic');
    const growthPlanSpec = masterPlans.find(p => String(p.plan_name).toLowerCase() === 'growth');
    const proPlanSpec = masterPlans.find(p => String(p.plan_name).toLowerCase() === 'pro');

    const freeRequests = freePlanSpec?.monthly_settlement_request_limit ?? 0;
    const freeCommission = freePlanSpec?.commission_percent ?? 5;
    const freePrice = freePlanSpec?.monthly_price ?? 0;

    const basicRequests = basicPlanSpec?.monthly_settlement_request_limit ?? 0;
    const basicCommission = basicPlanSpec?.commission_percent ?? 0;
    const basicPrice = basicPlanSpec?.monthly_price ?? 499;

    const growthPrice = growthPlanSpec?.monthly_price ?? 999;
    const proPrice = proPlanSpec?.monthly_price ?? 1999;

    return [
      {
        name: 'free',
        priceLabel: `₹${freePrice}`,
        description: 'Start selling locally with no monthly subscription costs.',
        pros: [
          'Unlimited Products',
          'Unlimited Orders',
          'Weekly Settlements',
          `Up to ${freeRequests} Settlement Requests per Month`,
          'Standard Support'
        ],
        cons: [
          `${freeCommission}% commission on every completed order`
        ],
        tagline: 'Ideal for businesses getting started.'
      },
      {
        name: 'basic',
        priceLabel: `₹${basicPrice}`,
        description: 'Remove order commissions in exchange for a simple monthly flat rate.',
        pros: [
          `${basicCommission}% Commission on completed orders`,
          'Unlimited Products',
          'Unlimited Orders',
          'Weekly Settlements',
          `Up to ${basicRequests} Settlement Requests per Month`,
          'Priority Support'
        ],
        tagline: 'Best for businesses that want zero commission.'
      },
      {
        name: 'growth',
        priceLabel: `₹${growthPrice}`,
        description: 'Unlock advanced multi-outlet sales routing and metrics dashboard tools.',
        pros: ['Everything in Basic', 'Advanced Analytics metrics dashboards', '24/7 Phone support lines'],
        tagline: 'Scale up operational capabilities.',
        isComingSoon: true
      },
      {
        name: 'pro',
        priceLabel: `₹${proPrice}`,
        description: 'Complete multi-vendor workspace system configurations for networks.',
        pros: ['Everything in Growth', 'Custom dedicated system APIs', 'Dedicated account strategist'],
        tagline: 'Unrestricted storefront scaling frameworks.',
        isComingSoon: true
      }
    ];
  }, [masterPlans]);

  const heroData = useMemo(() => {
    if (!subscription) return { name: 'No Active Strategy', details: '—', comm: '—', exp: '—' };
    
    if (subscription.subscription_type === 'trial') {
      return {
        name: 'Basic Trial',
        details: 'FREE',
        comm: '0% Commission',
        exp: `${daysRemaining} Days Remaining`
      };
    }
    if (subscription.plan_name === 'free') {
      const freePlanSpec = masterPlans.find(p => String(p.plan_name).toLowerCase() === 'free');
      const freeCommission = freePlanSpec?.commission_percent ?? 5;
      const freePrice = freePlanSpec?.monthly_price ?? 0;
      return {
        name: 'Free Plan',
        details: `₹${freePrice} / Month`,
        comm: `${freeCommission}% Commission`,
        exp: 'Lifetime Validity'
      };
    }
    
    const currentPlanSpec = masterPlans.find(p => String(p.plan_name).toLowerCase() === String(subscription.plan_name).toLowerCase());
    const currentCommission = currentPlanSpec?.commission_percent ?? 0;
    const currentPrice = currentPlanSpec?.monthly_price ?? 499;
    const currentDisplayName = currentPlanSpec?.display_name || 'Basic Premium';

    return {
      name: currentDisplayName,
      details: `₹${currentPrice} / Month`,
      comm: `${currentCommission}% Commission`,
      exp: subscription.end_date ? `Next Renewal: ${new Date(subscription.end_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}` : 'Active'
    };
  }, [subscription, daysRemaining, masterPlans]);

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto bg-gray-50/50 min-h-screen antialiased text-slate-800 relative">
      
      {/* GLOBAL TOAST FEEDBACK */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-white font-medium animate-in fade-in slide-in-from-top-4 duration-200 ${
          toast.type === 'success' ? 'bg-slate-900 border-emerald-500/30' : 'bg-rose-600 border-transparent'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-white" />}
          <span className="text-xs tracking-wide">{toast.message}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="pb-3 border-b border-gray-200">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Subscriptions</h1>
        <p className="text-xs text-slate-500 mt-0.5">Manage your dynamic platform subscription architecture</p>
      </div>

      {/* DYNAMIC HERO PLACEMENT */}
      {subscription && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Current Plan Profile
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-2.5">
                {heroData.name} &middot; <span className="text-neutral-500 font-medium">{heroData.details}</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-1">{heroData.comm}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-lg text-left sm:text-right min-w-[140px]">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Subscription Status</span>
              <span className="text-xs font-bold text-slate-700 block mt-0.5">{heroData.exp}</span>
            </div>
          </div>
        </div>
      )}

      {/* STATS OVERVIEW SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between shadow-3xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Identity</p>
            <p className="text-base font-bold text-slate-900 mt-1 uppercase">
              {subscription?.subscription_type === 'trial' ? 'Basic Trial' : subscription?.plan_name || 'None'}
            </p>
          </div>
          <div className="p-2 rounded-md bg-gray-50 border border-gray-200 text-slate-400"><CreditCard size={16} /></div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between shadow-3xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Commission Rate</p>
            <p className="text-base font-bold text-slate-900 mt-1">{subscription?.commission_percent ?? 0}%</p>
          </div>
          <div className="p-2 rounded-md bg-gray-50 border border-gray-200 text-slate-400"><Percent size={16} /></div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between shadow-3xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Storefront Sales</p>
            <p className="text-base font-bold text-slate-900 mt-1">₹{totalSales.toLocaleString('en-IN')}</p>
          </div>
          <div className="p-2 rounded-md bg-gray-50 border border-gray-200 text-slate-400"><BarChart3 size={16} /></div>
        </div>
      </div>

      {/* CARDS SUBSCRIPTION TIER GRID */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Available Subscription Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          
          {/* TEMPORARY FREE TRIAL CARD PANEL */}
          {subscription?.subscription_type === 'trial' && (
            <div className="bg-white border-2 border-emerald-600 rounded-2xl p-6 flex flex-col justify-between shadow-xs relative">
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-lg">Free Trial</h4>
                  <span className="text-[9px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded uppercase tracking-wider">
                    CURRENT PLAN
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 font-normal">Introductory evaluate-mode operational strategy window parameters.</p>
                <div className="mt-4 border-b border-gray-100 pb-4">
                  <span className="text-3xl font-bold text-slate-900 tracking-tight">FREE</span>
                  <span className="text-xs font-medium text-slate-400 ml-0.5">/30 days</span>
                </div>
                <div className="mt-4 space-y-2.5 text-xs font-medium text-slate-600">
                  <p className="text-[10px] font-bold tracking-wider text-emerald-600 uppercase">PROS</p>
                  <div className="flex items-center gap-2"><Check size={14} className="text-emerald-500 shrink-0" /> <span>0% Platform Commission</span></div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-emerald-500 shrink-0" /> <span>Full Catalog Upload Matrix</span></div>
                </div>
              </div>
              <div className="mt-8">
                <div className="w-full text-center py-2 bg-gray-50 text-slate-400 font-mono text-xs font-bold border border-gray-200 rounded-lg select-none">
                  {daysRemaining} Days Left
                </div>
              </div>
            </div>
          )}

          {/* SYSTEM CATALOG ENGINES */}
          {catalog.map((plan) => {
            const isActivePlan = subscription?.plan_name === plan.name && subscription?.subscription_type !== 'trial';
            
            if (plan.isComingSoon) {
              return (
                <div key={plan.name} className="bg-white border border-gray-200/60 rounded-2xl p-6 flex flex-col justify-between opacity-50 select-none pointer-events-none shadow-3xs">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-400 text-lg">{plan.name}</h4>
                      <span className="text-[9px] font-bold text-slate-300 border border-gray-100 bg-gray-50 px-2 py-0.5 rounded uppercase">Coming Soon</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1.5 font-light">{plan.description}</p>
                  </div>
                  <div className="mt-6">
                    <button type="button" disabled className="w-full py-2 text-xs font-bold uppercase tracking-wider bg-gray-50 border border-gray-200 text-slate-300 rounded-lg cursor-not-allowed">
                      Locked
                    </button>
                  </div>
                </div>
              );
            }

            let buttonText = 'Upgrade Plan';
            let disabled = isActivePlan;

            if (isActivePlan) {
              buttonText = 'Current Plan';
            } else if (plan.name === 'free') {
              buttonText = subscription?.subscription_type === 'trial'
                ? (subscription?.trial_decision === 'free' ? 'Selected Free Plan' : 'Stay on Free after Trial') 
                : 'Downgrade to Free';
              disabled = (subscription?.subscription_type === 'trial' && subscription?.trial_decision === 'free') || actionLoading;
            } else if (subscription?.subscription_type === 'trial' && plan.name === 'basic') {
              buttonText = subscription?.trial_decision === 'basic' ? 'Basic Processing' : 'Continue with Basic';
            }

            const masterSpec = masterPlans.find(p => String(p.plan_name).toLowerCase() === plan.name);
            const priceVal = masterSpec?.monthly_price ?? (plan.name === 'basic' ? 499 : 0);

            return (
              <div key={plan.name} className={`bg-white border border-gray-200 rounded-2xl p-6 flex flex-col justify-between hover:border-gray-300 transition-all shadow-3xs ${isActivePlan ? 'ring-2 ring-emerald-600/5 border-emerald-600' : ''}`}>
                <div>
                  <h4 className="font-bold text-slate-900 text-lg capitalize">{plan.name}</h4>
                  <p className="text-xs text-slate-500 mt-1 font-normal leading-relaxed">{plan.description}</p>
                  
                  <div className="mt-4 border-b border-gray-100 pb-4 flex items-baseline text-slate-900">
                    <span className="text-3xl font-bold tracking-tight">{plan.priceLabel}</span>
                    <span className="text-xs font-medium text-slate-400 ml-0.5">/mo</span>
                  </div>

                  <div className="mt-5 space-y-2">
                    <p className="text-[9px] font-bold tracking-wider text-emerald-600 uppercase">PROS</p>
                    {plan.pros.map((pro, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs font-medium text-slate-600 leading-normal">
                        <Check size={14} className="text-emerald-500 shrink-0" /> 
                        <span>{pro}</span>
                      </div>
                    ))}
                  </div>

                  {plan.cons && plan.cons.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-[9px] font-bold tracking-wider text-rose-600 uppercase">CONS</p>
                      {plan.cons.map((con, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs font-medium text-slate-600 leading-normal">
                          <X size={14} className="text-rose-500 shrink-0 mt-0.5" /> 
                          <span>{con}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-8 space-y-4">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handleSelectPlan(plan.name, priceVal)}
                    className={`w-full py-2 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all cursor-pointer ${
                      isActivePlan 
                        ? 'bg-gray-50 text-slate-400 border-gray-200 cursor-not-allowed'
                        : plan.name === 'basic'
                          ? 'bg-emerald-600 text-white border-transparent hover:bg-emerald-700 shadow-3xs'
                          : 'bg-white border-gray-200 text-slate-700 hover:bg-gray-50'
                    }`}
                  >
                    {buttonText}
                  </button>

                  <p className="text-center text-[11px] italic text-slate-400 select-none block">
                    {plan.tagline}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TRANSACTION REQUESTS LOG TABLE */}
      <div className="space-y-3 pt-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Transaction Requests Log</h3>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-3xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                <th className="p-3.5 pl-4">Date</th>
                <th className="p-3.5">Plan Requested</th>
                <th className="p-3.5">Amount</th>
                <th className="p-3.5">UTR Reference</th>
                <th className="p-3.5">Remarks</th>
                <th className="p-3.5 text-right pr-4">Status</th>
              </tr>
            </thead>
            <tbody className="text-xs font-medium text-slate-700 divide-y divide-gray-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400 font-normal italic">
                    No historical verification logs matched this workspace profile.
                  </td>
                </tr>
              ) : (
                history.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50/40 transition-colors">
                    <td className="p-3.5 pl-4 text-slate-400 font-normal">
                      {new Date(req.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-3.5 uppercase font-bold text-slate-900">{req.plan_name}</td>
                    <td className="p-3.5 text-slate-600">₹{req.amount}</td>
                    <td className="p-3.5 font-mono text-slate-500 text-[11px] tracking-tight">{req.utr_number}</td>
                    <td className="p-3.5 text-slate-400 font-normal max-w-xs truncate">{req.remarks || '—'}</td>
                    <td className="p-3.5 text-right pr-4">
                      <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded border uppercase tracking-wider ${
                        req.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        req.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TWO-COLUMN SPLIT PAYMENT SCREEN MODAL */}
      {payModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 animate-in fade-in zoom-in-95 duration-150">
            
            {/* LEFT COLUMN: DEDICATED EXTENDED QR CONTAINER */}
            <div className="md:col-span-6 bg-gray-50 border-r border-gray-200 p-8 flex flex-col justify-center items-center text-center space-y-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Official Gateway QR</span>
              
              {config?.subscription_qr_url ? (
                <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs max-w-[280px] md:max-w-[320px] w-full transition-all">
                  <img 
                    src={config.subscription_qr_url} 
                    alt="Payment Gateway QR Target Asset" 
                    className="w-full h-auto object-contain select-none rounded"
                  />
                </div>
              ) : (
                <div className="w-64 h-64 bg-gray-100 border border-dashed border-gray-200 rounded-xl flex items-center justify-center text-xs text-slate-400 animate-pulse">
                  Loading asset...
                </div>
              )}
              
              <p className="text-xs font-medium text-slate-400 max-w-[240px] leading-normal">
                Open any UPI supported payment system to complete transmission scan.
              </p>
            </div>

            {/* RIGHT COLUMN: ACTIONS & FORM CONTROLS */}
            <div className="md:col-span-6 p-6 flex flex-col justify-between space-y-5 bg-white">
              <div className="flex items-start justify-between pb-2 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Requesting {payModal.planName} Upgrade</h3>
                  <p className="text-xs font-semibold text-emerald-600 mt-0.5">Amount Due: ₹{payModal.price}</p>
                </div>
                <button 
                  onClick={() => setPayModal({ open: false, planName: '', price: 0 })} 
                  className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded hover:bg-gray-50"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-[11px] text-slate-500 space-y-1.5 leading-relaxed">
                    <p className="font-bold text-slate-700 uppercase tracking-wide text-[9px]">Instructions:</p>
                    <ol className="list-decimal list-inside space-y-0.5 font-medium">
                      <li>Scan the matching gateway QR display container on the left panel</li>
                      <li>Transfer exactly the specified amount: <span className="font-bold text-slate-900">₹{payModal.price}</span></li>
                      <li>Provide the generated 12-digit transaction matching UTR sequence</li>
                    </ol>
                  </div>

                  {config?.subscription_upi_id && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">UPI Destination Address</label>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 font-mono text-xs text-slate-600 select-all break-all text-center">
                        {config.subscription_upi_id}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-455 uppercase tracking-wider block">Transaction UTR / Reference Key</label>
                    <input
                      type="text"
                      required
                      placeholder="Input 12-digit transaction sequence text"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-xs bg-gray-50 focus:outline-none focus:bg-white focus:border-emerald-600 transition-all font-mono text-center"
                    />
                  </div>
                  
                  {paymentError && <p className="text-[11px] font-medium text-rose-600">{paymentError}</p>}
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-gray-100 text-xs font-bold uppercase tracking-wider mt-4">
                  <button 
                    type="button" 
                    onClick={() => setPayModal({ open: false, planName: '', price: 0 })} 
                    className="flex-1 h-10 border border-gray-200 rounded-lg text-slate-400 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={actionLoading} 
                    className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-3xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {actionLoading && <Loader2 size={12} className="animate-spin" />} Submit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* STATIC TRIAL EXPIRY REMINDER MODAL */}
      {showReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-gray-200 rounded-xl max-w-sm w-full shadow-xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle size={18} className="shrink-0" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Trial Expiry Notice</h3>
              </div>
              <button onClick={() => setShowReminder(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            
            <p className="text-xs text-slate-500 font-normal leading-relaxed">
              Your Rivo Free Trial window is concluding in <span className="font-bold text-slate-900">{daysRemaining} days</span>. 
              Please verify your workflow tier changes immediately to ensure continuous storefront configuration matching parameters.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowReminder(false)}
                className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-3xs transition-colors cursor-pointer"
              >
                Acknowledge Info
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}