import React, { useEffect, useState } from 'react';
import { supabase } from "../../../lib/supabase";
import { Search, FileText, RefreshCw, Eye } from 'lucide-react';
import InvoiceDetails from './InvoiceDetails';

interface Invoice {
  id: string;
  order_id: string;
  vendor_id: string;
  customer_id: string;
  invoice_number: string;
  invoice_url: string;
  created_at: string;
  status: string;
}

interface OrderData {
  order_number: string;
  subtotal?: number;
  payment_status: string;
  payment_method: string;
  order_status: string;
  total_amount: number;
}

interface EnrichedInvoice extends Invoice {
  order?: OrderData;
}

export default function InvoiceManagement() {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<EnrichedInvoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const fetchVendorInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('User session not found.');

      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (vendorError) throw vendorError;
      if (!vendorData) throw new Error('Vendor profile not identified.');

      const vendorId = vendorData.id;

      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;

      const enriched: EnrichedInvoice[] = [];
      for (const inv of (invoicesData || [])) {
        if (inv.order_id) {
          const { data: orderData } = await supabase
            .from('orders')
            .select('order_number, subtotal, payment_status, payment_method, order_status, total_amount')
            .eq('id', inv.order_id)
            .single();

          enriched.push({
            ...inv,
            order: orderData || undefined
          });
        } else {
          enriched.push(inv);
        }
      }

      setInvoices(enriched);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while loading your invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorInvoices();
  }, []);

  if (selectedInvoiceId) {
    return (
      <InvoiceDetails
        invoiceId={selectedInvoiceId}
        onBack={() => setSelectedInvoiceId(null)}
      />
    );
  }

  const filteredInvoices = invoices.filter((item) => {
    const matchesStatus =
      statusFilter === 'All' ||
      item.status?.toLowerCase() === statusFilter.toLowerCase();

    const cleanSearch = searchTerm.toLowerCase();
    const matchesSearch =
      item.invoice_number?.toLowerCase().includes(cleanSearch) ||
      item.order?.order_number?.toLowerCase().includes(cleanSearch);

    return matchesStatus && matchesSearch;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border border-red-200';
      default:
        return 'bg-gray-50 text-gray-600 border border-gray-200';
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Invoices</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage all invoices generated for your completed orders.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by Invoice or Order Number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 w-full md:w-auto self-start md:self-auto">
          {['All', 'Paid', 'Pending', 'Cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-1.5 text-xs font-medium rounded-md border transition-all ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <div className="grid grid-cols-8 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <div key={rowIndex} className="p-4 grid grid-cols-8 gap-4 items-center">
                {Array.from({ length: 8 }).map((_, colIndex) => (
                  <div key={colIndex} className="h-4 bg-gray-100 rounded animate-pulse"></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center max-w-md mx-auto">
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">Failed to load content</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">{error}</p>
          <button
            onClick={fetchVendorInvoices}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition shadow-sm"
          >
            <RefreshCw className="w-4 h-4" /> Retry Connection
          </button>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No invoices available.</h3>
          <p className="text-sm text-gray-400 mt-1">
            No document histories matched your selected tracking filter criteria.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="py-3.5 px-4 font-semibold">Invoice Number</th>
                  <th className="py-3.5 px-4 font-semibold">Order Number</th>
                  <th className="py-3.5 px-4 font-semibold">Created Date</th>
                  <th className="py-3.5 px-4 font-semibold">Payment Method</th>
                  <th className="py-3.5 px-4 font-semibold">Payment Status</th>
                  <th className="py-3.5 px-4 font-semibold">Invoice Status</th>
                  <th className="py-3.5 px-4 font-semibold">Selling Amount</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-600">
                {filteredInvoices.map((invoice) => {
                  const sellingAmount = invoice.order?.subtotal ?? invoice.order?.total_amount ?? 0;
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-4 font-medium text-gray-900 whitespace-nowrap">
                        {invoice.invoice_number}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        {invoice.order?.order_number || 'N/A'}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        {new Date(invoice.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap capitalize">
                        {invoice.order?.payment_method || 'N/A'}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap capitalize">
                        {invoice.order?.payment_status || 'N/A'}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadgeClass(invoice.status)}`}>
                          {invoice.status || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap font-medium text-gray-900">
                        ₹{sellingAmount.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setSelectedInvoiceId(invoice.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}