import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from "../../../lib/supabase";
import { getPendingSettlement, getPaidSettlement } from '../../../utils/finance';
import { 
  Building,
  CheckCircle,
  AlertCircle,
  Info,
  Loader2,
  Clock,
  TrendingUp,
  X,
  Edit2,
  Upload
} from 'lucide-react';

// --- TYPES ---
interface Order {
  id: string;
  vendor_earning: number | null;
  settled_vendor: boolean | null;
  order_status?: string | null;
}

interface VendorSettlement {
  id: string;
  vendor_id: string;
  amount: number;
  status: 'pending_request' | 'processing' | 'paid' | 'rejected';
  payment_method: string | null;
  utr_number: string | null;
  remarks: string | null;
  request_date: string;
  paid_date: string | null;
}

interface VendorProfile {
  id: string;
  vendor_id: string;
  account_holder_name: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  upi_id: string | null;
  qr_code_url?: string | null;
}

export function Settlements() {
  // --- STATES ---
  const [loading, setLoading] = useState<boolean>(true);
  const [currentVendorId, setCurrentVendorId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settlements, setSettlements] = useState<VendorSettlement[]>([]);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // --- EDIT BANK DETAILS MODAL STATE ---
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [uploadingQr, setUploadingQr] = useState<boolean>(false);
  const [formHolderName, setFormHolderName] = useState<string>('');
  const [formBankName, setFormBankName] = useState<string>('');
  const [formAccountNum, setFormAccountNum] = useState<string>('');
  const [formIfsc, setFormIfsc] = useState<string>('');
  const [formUpi, setFormUpi] = useState<string>('');
  const [formQrUrl, setFormQrUrl] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- HELPER FUNCTIONS ---
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'pending_request':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'processing':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'rejected':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const formatStatusText = (status: string) => {
    return status.replace('_', ' ').toUpperCase();
  };

  // --- DATA FETCHING ---
  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session) throw new Error('Unauthorized');

      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select('id')
        .eq('auth_user_id', session.user.id)
        .single();

      if (vendorError || !vendor) throw new Error('Vendor workspace not established.');
      const resolvedVendorId = vendor.id;
      setCurrentVendorId(resolvedVendorId);

      // 1. Fetch delivered orders for metrics calculation
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, vendor_earning, settled_vendor, order_status')
        .eq('vendor_id', resolvedVendorId)
        .eq('order_status', 'delivered');

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      // 2. Fetch settlements ledger records
      const { data: settlementsData, error: settlementsError } = await supabase
        .from('vendor_settlements')
        .select('*')
        .eq('vendor_id', resolvedVendorId)
        .order('request_date', { ascending: false });

      if (settlementsError) throw settlementsError;
      setSettlements(settlementsData || []);

      // 3. Fetch vendor banking configurations profiles
      const { data: profileData, error: profileError } = await supabase
        .from('vendor_profiles')
        .select('*')
        .eq('vendor_id', resolvedVendorId)
        .maybeSingle();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Populate Form inputs if profile exists
      if (profileData) {
        setFormHolderName(profileData.account_holder_name || '');
        setFormBankName(profileData.bank_name || '');
        setFormAccountNum(profileData.account_number || '');
        setFormIfsc(profileData.ifsc_code || '');
        setFormUpi(profileData.upi_id || '');
        setFormQrUrl(profileData.qr_code_url || '');
      }

    } catch (err) {
      console.error('Error fetching settlement payload syncs:', err);
      showToast(err instanceof Error ? err.message : 'Synchronization failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- REALTIME LIVE SUBSCRIPTIONS ---
  useEffect(() => {
    if (!currentVendorId) return;

    const realtimeChannel = supabase
      .channel('settlements-realtime-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `vendor_id=eq.${currentVendorId}` },
        () => { fetchData(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vendor_settlements', filter: `vendor_id=eq.${currentVendorId}` },
        () => { fetchData(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }, [currentVendorId]);

  // --- CALCULATIONS & DATA MEMOIZATIONS ---
  const metrics = useMemo(() => {
    const pendingSettlement = getPendingSettlement(orders);
    const paidSettlement = getPaidSettlement(orders);

    const pendingRequestsAmt = settlements
      .filter(s => s.status === 'pending_request')
      .reduce((sum, s) => sum + (s.amount || 0), 0);

    const lastSettlementItem = settlements.find(s => s.status === 'paid');

    return {
      pendingSettlement,
      paidSettlement,
      pendingRequestsAmt,
      lastSettlement: lastSettlementItem ? lastSettlementItem.amount : 0
    };
  }, [orders, settlements]);

  const hasPendingRequest = useMemo(() => {
    return settlements.some(s => s.status === 'pending_request');
  }, [settlements]);

  // --- ACTIONS ---
  const handleRequestSettlement = async () => {
    if (!currentVendorId) return;

    setActionLoading(true);
    try {
      // 1. Fetch active subscription data
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('plan_name, monthly_settlement_request_limit')
        .eq('vendor_id', currentVendorId)
        .eq('status', 'active')
        .maybeSingle();

      if (subError) throw subError;

      const planName = subscription?.plan_name || 'Free';
      const limit = subscription?.monthly_settlement_request_limit ?? 3;

      // 2. Count current calendar month usage requests
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

      const { count: requestsThisMonth, error: countError } = await supabase
        .from('vendor_settlements')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', currentVendorId)
        .in('status', ['pending_request', 'processing', 'paid'])
        .gte('created_at', firstDayOfMonth)
        .lte('created_at', lastDayOfMonth);

      if (countError) throw countError;

      const currentCount = requestsThisMonth || 0;

      // 3. Validation limit threshold check
      if (currentCount >= limit) {
        showToast(
          `Settlement request limit reached. You have already used ${currentCount} of ${limit} settlement requests available in your ${planName} plan this month. Your remaining earnings will automatically be included in the next weekly settlement.`,
          'error'
        );
        return;
      }

      // 1. FIND ELIGIBLE ORDERS & 5. DUPLICATE PROTECTION
      const { data: activeSettlements, error: settlementError } = await supabase
        .from('vendor_settlements')
        .select('order_ids')
        .eq('vendor_id', currentVendorId)
        .in('status', ['pending_request', 'processing']);

      if (settlementError) throw settlementError;

      const restrictedOrderIds: string[] = [];
      if (activeSettlements) {
        activeSettlements.forEach((s) => {
          if (Array.isArray(s.order_ids)) {
            restrictedOrderIds.push(...s.order_ids);
          }
        });
      }

      const { data: eligibleOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id, vendor_earning')
        .eq('vendor_id', currentVendorId)
        .eq('order_status', 'delivered')
        .eq('settled_vendor', false);

      if (ordersError) throw ordersError;

      const finalEligibleOrders = (eligibleOrders || []).filter(
        (order) => !restrictedOrderIds.includes(order.id)
      );

      // 3. VALIDATION: Check if eligible orders exist
      if (finalEligibleOrders.length === 0) {
        showToast('No withdrawable balance available.', 'error');
        return;
      }

      // 2. CALCULATE
      const totalAmount = finalEligibleOrders.reduce(
        (sum, order) => sum + (order.vendor_earning || 0),
        0
      );
      const orderIds = finalEligibleOrders.map((order) => order.id);
      const orderCount = finalEligibleOrders.length;

      // 3. VALIDATION: Check minimum settlement amount
      if (totalAmount < 500) {
        showToast('Minimum settlement amount is ₹500', 'error');
        return;
      }

      // 4. CREATE SETTLEMENT
      const { error: insertError } = await supabase
        .from('vendor_settlements')
        .insert([
          {
            vendor_id: currentVendorId,
            amount: totalAmount,
            status: 'pending_request',
            order_count: orderCount,
            order_ids: orderIds,
            created_at: new Date().toISOString(),
          },
        ]);

      if (insertError) throw insertError;

      // 6. SUCCESS
      showToast('Settlement request submitted successfully.', 'success');
      await fetchData();
    } catch (err) {
      console.error('Request pipeline error context:', err);
      showToast(err instanceof Error ? err.message : 'Dispatch pipeline crash.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // --- FILE UPLOAD LOGIC FOR BUCKET `vendor-QR` ---
  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentVendorId) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please upload a valid image file.', 'error');
      return;
    }

    setUploadingQr(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentVendorId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('vendor-QR')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        if (uploadError.message?.toLowerCase().includes('row-level security')) {
          throw new Error('Storage RLS Policy missing: Please configure insert permissions for bucket "vendor-QR" in Supabase.');
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('vendor-QR')
        .getPublicUrl(filePath);

      setFormQrUrl(publicUrl);
      showToast('QR Code asset successfully loaded from gallery.', 'success');
    } catch (err) {
      console.error('QR Storage Pipeline Failure:', err);
      showToast(err instanceof Error ? err.message : 'Failed to parse image from gallery.', 'error');
    } finally {
      setUploadingQr(false);
    }
  };

  const handleUpdateBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVendorId) return;

    // Strict structural regex check ensuring valid standard global format string (e.g. username@bankcode)
    const upiValue = formUpi.trim();
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    
    if (upiValue && !upiRegex.test(upiValue)) {
      showToast('Please enter an actual, valid UPI ID structure (e.g. merchant@upi)', 'error');
      return;
    }

    setModalLoading(true);
    try {
      if (profile?.id) {
        const { error } = await supabase
          .from('vendor_profiles')
          .update({
            account_holder_name: formHolderName.trim() || null,
            bank_name: formBankName.trim() || null,
            account_number: formAccountNum.trim() || null,
            ifsc_code: formIfsc.trim() || null,
            upi_id: upiValue || null,
            qr_code_url: formQrUrl.trim() || null,
          })
          .eq('id', profile.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vendor_profiles')
          .insert([{
            vendor_id: currentVendorId,
            account_holder_name: formHolderName.trim() || null,
            bank_name: formBankName.trim() || null,
            account_number: formAccountNum.trim() || null,
            ifsc_code: formIfsc.trim() || null,
            upi_id: upiValue || null,
            qr_code_url: formQrUrl.trim() || null,
          }]);

        if (error) throw error;
      }

      showToast('Banking specifications updated successfully.', 'success');
      setShowEditModal(false);
      await fetchData();
    } catch (err) {
      console.error('Error writing banking profile update details:', err);
      showToast(err instanceof Error ? err.message : 'Update failed. Check if column exists.', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-[#10B981]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-background text-foreground min-h-screen antialiased transition-all">
      
      {/* TOAST SYSTEM ELEMENT */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-md text-white font-medium transition-all duration-300 ${
          toast.type === 'success' ? 'bg-[#0F172A] border border-[#10B981]/30' : 'bg-rose-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={18} className="text-[#10B981]" /> : <AlertCircle size={18} />}
          <span className="text-sm">{toast.message}</span>
        </div>
      )}

      {/* COMPONENT HEADER */}
      <div className="pb-2 border-b border-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Settlements</h1>
          <p className="text-muted-foreground text-sm mt-1">Track and monitor earnings transfers, ledger audits, and billing updates</p>
        </div>
        
        <button
          onClick={handleRequestSettlement}
          disabled={actionLoading || hasPendingRequest || metrics.pendingSettlement < 500}
          className="bg-[#10B981] hover:bg-[#059669] text-white disabled:bg-muted disabled:text-muted-foreground/60 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition flex items-center gap-2 justify-center disabled:cursor-not-allowed"
        >
          {actionLoading && <Loader2 size={16} className="animate-spin" />}
          {hasPendingRequest ? 'Awaiting Approval' : 'Request Settlement'}
        </button>
      </div>

      {/* TOP SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card p-6 rounded-xl border border-border shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1 z-10">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Settlement</p>
            <p className="text-2xl font-black text-foreground">₹{metrics.pendingSettlement.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
            <Clock size={22} />
          </div>
        </div>

        <div className="bg-card p-6 rounded-xl border border-border shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1 z-10">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paid Settlement</p>
            <p className="text-2xl font-black text-[#10B981]">₹{metrics.paidSettlement.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-3 bg-[#10B981]/10 text-[#10B981] rounded-xl border border-[#10B981]/20">
            <CheckCircle size={22} />
          </div>
        </div>

        <div className="bg-card p-6 rounded-xl border border-border shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1 z-10">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Requests</p>
            <p className="text-2xl font-black text-foreground">₹{metrics.pendingRequestsAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl border border-blue-500/20">
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="bg-card p-6 rounded-xl border border-border shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1 z-10">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Payout</p>
            <p className="text-2xl font-black text-foreground">₹{metrics.lastSettlement.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl border border-purple-500/20 flex items-center justify-center font-bold text-xl select-none w-11 h-11">
            ₹
          </div>
        </div>
      </div>

      {/* CORE INFO ARCHITECTURE - BANK DETAILS AND RULES GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* BANK PROFILE CARD MODULE */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-xs flex flex-col justify-between space-y-4 lg:col-span-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Building className="text-muted-foreground" size={20} />
                <h3 className="font-bold text-foreground text-base">Settlement Bank Account</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowEditModal(true)}
                className="text-xs text-[#10B981] hover:text-[#059669] font-bold flex items-center gap-1 transition-colors bg-transparent border-0 cursor-pointer"
              >
                Edit Bank Details <Edit2 size={12} />
              </button>
            </div>

            {profile ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-medium">
                <div className="space-y-0.5">
                  <span className="text-xs text-muted-foreground block font-medium">ACCOUNT HOLDER</span>
                  <span className="text-foreground tracking-tight">{profile.account_holder_name || 'Not Provided'}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs text-muted-foreground block font-medium">BANK NAME</span>
                  <span className="text-foreground tracking-tight">{profile.bank_name || 'Not Provided'}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs text-muted-foreground block font-medium">ACCOUNT NUMBER</span>
                  <span className="text-foreground font-mono font-bold tracking-wider">
                    {profile.account_number || 'Not Provided'}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs text-muted-foreground block font-medium">IFSC ROUTING CODE</span>
                  <span className="text-foreground font-mono tracking-wide">{profile.ifsc_code || 'Not Provided'}</span>
                </div>
                <div className="space-y-0.5 sm:col-span-2 border-t border-border/30 pt-3 mt-1">
                  <span className="text-xs text-muted-foreground block font-medium">UPI LINK</span>
                  <span className="text-foreground font-mono select-all text-xs font-semibold bg-background border border-border rounded px-2 py-1 inline-block mt-0.5">
                    {profile.upi_id || 'Not Mapped'}
                  </span>
                </div>
                {profile.qr_code_url && (
                  <div className="space-y-2 sm:col-span-2 pt-2 border-t border-border/20">
                    <span className="text-xs text-muted-foreground block font-medium">QR</span>
                    <div className="max-w-[140px] bg-white p-2 rounded-lg border border-border shadow-xs">
                      <img 
                        src={profile.qr_code_url} 
                        alt="Merchant Transaction Destination Code" 
                        className="w-full h-auto rounded object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-background border border-dashed border-border p-4 rounded-xl text-center text-xs font-medium text-muted-foreground">
                No bank accounts or payout endpoints have been registered to this workspace layout profile yet. Click "Edit Bank Details" to append your configuration mappings.
              </div>
            )}
          </div>
        </div>

        {/* SETTLEMENT RULES CARD PANEL */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-xs flex flex-col justify-between space-y-3">
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-border/40">
              <Info className="text-[#10B981]" size={18} />
              <h3 className="font-bold text-foreground text-sm">Settlement Dispatches Rules</h3>
            </div>
            
            <ul className="text-xs text-muted-foreground space-y-2.5 list-none font-medium">
              <li className="flex items-start gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] mt-1.5 shrink-0"></span>
                <span>Vendor payments will be processed **weekly every Monday** only.[cite: 3]</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] mt-1.5 shrink-0"></span>
                <span>Dispatches operate exclusively within the standard working hours of banks.[cite: 3]</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] mt-1.5 shrink-0"></span>
                <span className="text-amber-600 dark:text-amber-400 font-semibold">Minimum settlement request threshold is ₹500.00. Always check and double-verify your bank details when submitting.[cite: 3]</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] mt-1.5 shrink-0"></span>
                <span>Balances computed completely from final metric workspace configurations. Thank you.[cite: 3]</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* HISTORIC TRANSACTION HISTORY LEDGER TABLE MODULE */}
      <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-border/40">
          <h3 className="font-bold text-foreground text-base">Settlements Ledger History</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Detailed catalog logs of historic settlement verification dispatches</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-background border-b border-border text-muted-foreground font-semibold text-xs tracking-wider uppercase">
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4">Payment Method</th>
                <th className="p-4">UTR Reference</th>
                <th className="p-4">Request Date</th>
                <th className="p-4">Paid Date</th>
                <th className="p-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-medium text-foreground">
              {settlements.length > 0 ? (
                settlements.map((s) => (
                  <tr key={s.id} className="hover:bg-background/40 transition-colors">
                    <td className="p-4 font-black">₹{s.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getStatusBadgeClass(s.status)}`}>
                        {formatStatusText(s.status)}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-xs">{s.payment_method || '—'}</td>
                    <td className="p-4 font-mono text-xs select-all truncate max-w-[150px]">{s.utr_number || '—'}</td>
                    <td className="p-4 text-xs font-mono text-muted-foreground">
                      {new Date(s.request_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="p-4 text-xs font-mono text-muted-foreground">
                      {s.paid_date ? new Date(s.paid_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                    </td>
                    <td className="p-4 text-xs max-w-[200px] truncate text-muted-foreground" title={s.remarks || ''}>
                      {s.remarks || '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-xs text-muted-foreground font-medium">
                    No settlement records found for this workstation workspace profile.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT BANK PROFILE OVERLAY MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-card rounded-2xl max-w-lg w-full border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-150 p-6 space-y-4 my-8 text-foreground">
            
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div>
                <h3 className="text-lg font-black tracking-tight">Edit Bank & Settlement Details</h3>
                <p className="text-xs text-muted-foreground">Add or modify account nodes, UPI tokens or QR locations directly inside the page view</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-background transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateBankDetails} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Account Holder Name</label>
                  <input 
                    type="text"
                    value={formHolderName}
                    onChange={(e) => setFormHolderName(e.target.value)}
                    placeholder="Holder Name"
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:border-[#10B981] text-foreground"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Bank Name</label>
                  <input 
                    type="text"
                    value={formBankName}
                    onChange={(e) => setFormBankName(e.target.value)}
                    placeholder="e.g. HDFC Bank"
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:border-[#10B981] text-foreground"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Account Number</label>
                  <input 
                    type="text"
                    value={formAccountNum}
                    onChange={(e) => setFormAccountNum(e.target.value)}
                    placeholder="Enter full account sequence"
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:border-[#10B981] text-foreground"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">IFSC Code</label>
                  <input 
                    type="text"
                    value={formIfsc}
                    onChange={(e) => setFormIfsc(e.target.value)}
                    placeholder="e.g. HDFC0001234"
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:border-[#10B981] text-foreground"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">UPI Link</label>
                  <input 
                    type="text"
                    value={formUpi}
                    onChange={(e) => setFormUpi(e.target.value)}
                    placeholder="merchant@upi"
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:border-[#10B981] text-foreground"
                  />
                </div>

                {/* GALLERY DISPLAY ROUTER PORT */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">QR Code Media Asset</label>
                  
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingQr}
                      className="h-10 px-4 rounded-xl border border-dashed border-border bg-background text-xs font-bold text-foreground hover:bg-background/80 transition flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                    >
                      {uploadingQr ? (
                        <Loader2 size={14} className="animate-spin text-[#10B981]" />
                      ) : (
                        <Upload size={14} className="text-[#10B981]" />
                      )}
                      Choose from Gallery
                    </button>
                    
                    <input 
                      type="file"
                      ref={fileInputRef}
                      onChange={handleQrUpload}
                      accept="image/*"
                      className="hidden"
                    />

                    <input 
                      type="text"
                      readOnly
                      placeholder="No asset image mapped yet"
                      value={formQrUrl}
                      className="flex-1 h-10 px-3 rounded-xl border border-border bg-background/50 text-xs font-mono text-muted-foreground truncate focus:outline-none select-all"
                    />
                  </div>

                  {formQrUrl && (
                    <div className="mt-2 flex items-center gap-3 bg-background p-2 rounded-xl border border-border max-w-sm">
                      <div className="w-12 h-12 bg-white rounded border border-border p-1 flex items-center justify-center shrink-0">
                        <img src={formQrUrl} alt="Preview" className="max-w-full max-h-full object-contain rounded" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-muted-foreground block uppercase">Asset Location Link</span>
                        <span className="text-xs text-foreground truncate block font-mono">{formQrUrl}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormQrUrl('')}
                        className="p-1 hover:bg-background rounded-lg text-rose-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border/40 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 h-10 rounded-xl border border-border bg-card text-foreground hover:bg-background transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading || uploadingQr}
                  className="flex-1 h-10 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white shadow-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 animate-none"
                >
                  {modalLoading && <Loader2 size={14} className="animate-spin" />}
                  Save Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Settlements;