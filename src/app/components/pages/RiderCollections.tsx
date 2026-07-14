import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js'; // Adjust the import path to your actual supabase client initialization if different
import { CheckCircle, Search, RefreshCw, ClipboardList, Clock, User, DollarSign } from 'lucide-react';

// --- Supabase Client Initialization ---
// Assuming standard environment variables. Replace with your actual client import if available centrally.
declare const process: {
  env: {
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  };
};
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- TypeScript Interfaces ---
interface RiderCollection {
  id: string;
  order_id: string;
  collection_method: string;
  order_amount: number;
  amount_received: number;
  change_returned: number;
  created_at: string;
  transaction_reference: string | null;
  notes: string | null;
  status: string;
  returned_at: string;
  verified_at: string | null;
  orders: {
    id: string;
    order_number: string; // Assuming standard order naming convention
    vendor_id: string;
    subtotal: number;
    total_amount: number;
    payment_method: string;
    customers: {
      customer_name: string;
    } | null;
  } | null;
  riders: {
    rider_name: string;
  } | null;
}

export default function RiderCollections() {
  const [collections, setCollections] = useState<RiderCollection[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // --- Fetch Data ---
  const fetchCollections = useCallback(async () => {
    try {
      setLoading(true);
      
      // Query fetching only 'returned' status items, joining orders, riders, and nested customers
      const { data, error } = await supabase
        .from('rider_collections')
        .select(`
          id, order_id, collection_method, order_amount, amount_received, change_returned, created_at, transaction_reference, notes, status, returned_at, verified_at,
          orders!inner (
            id, order_number, vendor_id, subtotal, total_amount, payment_method,
            customers (
              customer_name
            )
          ),
          riders ( rider_name )
        `)
        .eq('status', 'returned')
        .order('returned_at', { ascending: false });

      if (error) throw error;
      setCollections((data as unknown as RiderCollection[]) || []);
    } catch (error) {
      console.error('Error fetching rider collections:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Realtime Subscription ---
  useEffect(() => {
    fetchCollections();

    // Subscribe to changes on rider_collections
    const collectionChannel = supabase
      .channel('rider_collections_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rider_collections' },
        () => {
          fetchCollections();
        }
      )
      .subscribe();

    // Subscribe to changes on orders
    const ordersChannel = supabase
      .channel('orders_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchCollections();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(collectionChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, [fetchCollections]);

  // --- Toast Trigger Helper ---
  const showSuccessToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  };

  // --- Verification Action ---
  const handleVerifyCash = async (collection: RiderCollection) => {
    if (!collection.orders) return;

    // Confirmation dialog before continuing
    const confirmVerification = window.confirm(
      "Verify Cash Collection\n\nThis will mark the COD payment as PAID and cannot be undone.\n\nClick OK to Verify or Cancel to exit."
    );

    if (!confirmVerification) return;
    
    try {
      setActioningId(collection.id);

      const now = new Date().toISOString();
      const orderId = collection.order_id;
      const vendorId = collection.orders.vendor_id;
      const totalAmount = collection.orders.total_amount;
      const subtotal = collection.orders.subtotal;
      const paymentMethod = collection.orders.payment_method;

      // A) Update rider_collections status
      try {
        const { error: errCollection } = await supabase
          .from('rider_collections')
          .update({ status: 'verified', verified_at: now })
          .eq('id', collection.id);
        if (errCollection) throw errCollection;
      } catch (err) {
        console.error('Database operation failed in table: rider_collections', err);
        throw err;
      }

      // B) Update orders payment status
      try {
        const { error: errOrder } = await supabase
          .from('orders')
          .update({ payment_status: 'paid' })
          .eq('id', orderId);
        if (errOrder) throw errOrder;
      } catch (err) {
        console.error('Database operation failed in table: orders', err);
        throw err;
      }

      // C) If payment_method is COD, check existing payments and conditionally insert
      if (paymentMethod?.toLowerCase() === 'cod') {
        try {
          const { data: existingPayment, error: errCheckPayment } = await supabase
            .from('payments')
            .select('id, payment_status')
            .eq('order_id', orderId)
            .maybeSingle();

          if (errCheckPayment) throw errCheckPayment;

          // Skip if record exists AND payment_status is 'paid'
          if (!(existingPayment && existingPayment.payment_status === 'paid')) {
            const { error: errPayment } = await supabase
              .from('payments')
              .insert({
                order_id: orderId,
                amount: totalAmount,
                payment_method: 'COD',
                payment_status: 'paid',
                created_at: now
              });
            if (errPayment) throw errPayment;
          }
        } catch (err) {
          console.error('Database operation failed in table: payments', err);
          throw err;
        }
      }

      // D) Check existing financial_ledger entries and conditionally insert
      try {
        const { data: existingLedger, error: errCheckLedger } = await supabase
          .from('financial_ledger')
          .select('id')
          .eq('entity_type', 'vendor')
          .eq('reference_id', orderId)
          .eq('transaction_type', 'sale')
          .maybeSingle();

        if (errCheckLedger) throw errCheckLedger;

        if (!existingLedger) {
          const { error: errLedger } = await supabase
            .from('financial_ledger')
            .insert({
              entity_type: 'vendor',
              entity_id: vendorId,
              transaction_type: 'sale',
              amount: subtotal,
              reference_id: orderId,
              remarks: 'COD payment verified by vendor'
            });
          if (errLedger) throw errLedger;
        }
      } catch (err) {
        console.error('Database operation failed in table: financial_ledger', err);
        throw err;
      }

      // Sync data directly from source to ensure absolute alignment
      await fetchCollections();
      showSuccessToast('Cash Verified Successfully');

    } catch (error) {
      console.error('Verification flow completely halted due to error:', error);
      alert('An error occurred during verification. Please try again.');
    } finally {
      setActioningId(null);
    }
  };

  // --- Filtering Logic for Search ---
  const filteredCollections = collections.filter((item) => {
    const orderNumber = item.orders?.order_number?.toLowerCase() || '';
    const riderName = item.riders?.rider_name?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return orderNumber.includes(query) || riderName.includes(query);
  });

  // --- Helper to format timestamps ---
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800">
      {/* Toast Alert Notice */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl transition-all animate-bounce">
          <CheckCircle className="w-5 h-5 mr-2" />
          <span className="font-medium">{toast}</span>
        </div>
      )}

      {/* Header and Controls Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Rider Collections</h1>
          <p className="text-sm text-slate-500 mt-1">Verify handovers and update internal ledgers for returned rider cash.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Order ID or Rider..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>
          <button
            onClick={fetchCollections}
            disabled={loading}
            className="flex items-center justify-center p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 shadow-sm transition-colors disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      {loading && collections.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredCollections.length === 0 ? (
        /* Professional Empty State Layout */
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-white p-12 text-center max-w-xl mx-auto shadow-sm mt-12">
          <div className="p-4 bg-slate-50 rounded-full text-slate-400 mb-4">
            <ClipboardList className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">No pending handovers</h3>
          <p className="text-slate-500 text-sm max-w-xs mt-1">
            No rider collections waiting for verification.
          </p>
        </div>
      ) : (
        /* Cards Container Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCollections.map((collection) => (
            <div 
              key={collection.id} 
              className="bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
            >
              {/* Card Body */}
              <div className="p-5">
                {/* Header block within card */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                    #{collection.orders?.order_number || 'N/A'}
                  </span>
                  <div className="flex items-center text-xs text-slate-400 gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Returned • {collection.returned_at ? formatTime(collection.returned_at) : 'N/A'}</span>
                  </div>
                </div>

                {/* Meta details row blocks */}
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2.5">
                    <User className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Rider</p>
                      <p className="font-medium text-slate-800">{collection.riders?.rider_name || 'Unknown Rider'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <User className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Customer</p>
                      <p className="font-medium text-slate-800">{collection.orders?.customers?.customer_name || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <DollarSign className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div className="w-full">
                      <p className="text-xs text-slate-400 font-medium mb-1">Collection Method ({collection.collection_method})</p>
                      <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg text-xs font-medium">
                        <div>
                          <span className="block text-slate-400 text-[10px]">Order Total</span>
                          <span className="text-slate-700">₹{collection.order_amount.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="block text-slate-400 text-[10px]">Received</span>
                          <span className="text-emerald-600">₹{collection.amount_received.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="block text-slate-400 text-[10px]">Change</span>
                          <span className="text-amber-600">₹{collection.change_returned.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button Strip */}
              <div className="px-5 pb-5 pt-2 border-t border-slate-50 bg-slate-50/50">
                <button
                  onClick={() => handleVerifyCash(collection)}
                  disabled={actioningId === collection.id}
                  className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium text-sm rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  {actioningId === collection.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Verify Cash
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}