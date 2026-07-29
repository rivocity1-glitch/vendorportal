import React, { useEffect, useState } from 'react';
import { supabase } from "../../../lib/supabase";
import { ArrowLeft, RefreshCw, FileText, ShoppingBag } from 'lucide-react';

interface InvoiceDetailsProps {
  invoiceId: string;
  onBack: () => void;
}

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

interface Order {
  id: string;
  order_number: string;
  vendor_id: string;
  customer_address_id: string;
  order_status: string;
  payment_method: string;
  payment_status: string;
  delivered_at?: string;
  subtotal: number;
  total_amount: number;
}

interface Vendor {
  store_name?: string;
  owner_name?: string;
  phone?: string;
}

interface CustomerAddress {
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  landmark?: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
}

interface EnrichedItem extends OrderItem {
  product_name: string;
}

export default function InvoiceDetails({ invoiceId, onBack }: InvoiceDetailsProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [address, setAddress] = useState<CustomerAddress | null>(null);
  const [items, setItems] = useState<EnrichedItem[]>([]);

  const loadAllInvoiceData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Step 1: Fetch Invoice
      const { data: invoiceData, error: invoiceErr } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (invoiceErr) throw invoiceErr;
      if (!invoiceData) {
        setInvoice(null);
        setLoading(false);
        return;
      }
      setInvoice(invoiceData);

      // Step 2: Fetch Order
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .select('*')
        .eq('id', invoiceData.order_id)
        .single();

      if (orderErr) throw orderErr;
      setOrder(orderData);

      if (orderData) {
        // Step 3: Fetch Vendor Profile using order.vendor_id
        if (orderData.vendor_id) {
          const { data: vendorData } = await supabase
            .from('vendors')
            .select('*')
            .eq('id', orderData.vendor_id)
            .single();
          setVendor(vendorData);
        }

        // Step 4: Fetch Customer Address using order.customer_address_id
        if (orderData.customer_address_id) {
          const { data: addressData } = await supabase
            .from('customer_addresses')
            .select('*')
            .eq('id', orderData.customer_address_id)
            .single();
          setAddress(addressData);
        }

        // Step 5: Fetch Order Items
        const { data: itemsData, error: itemsErr } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderData.id);

        if (itemsErr) throw itemsErr;

        // Step 6: Fetch Product Names
        const enrichedItemsList: EnrichedItem[] = [];
        if (itemsData && itemsData.length > 0) {
          for (const item of itemsData) {
            let pName = 'Unknown Product';
            if (item.product_id) {
              const { data: prodData } = await supabase
                .from('products')
                .select('name')
                .eq('id', item.product_id)
                .single();
              if (prodData?.name) {
                pName = prodData.name;
              }
            }
            enrichedItemsList.push({
              ...item,
              product_name: pName,
            });
          }
        }
        setItems(enrichedItemsList);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while building the invoice view.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllInvoiceData();
  }, [invoiceId]);

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

  // Vendor Selling Subtotal
  const vendorSubtotal = items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
  const totalSellingAmount = order?.subtotal && order.subtotal > 0 ? order.subtotal : vendorSubtotal;

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-32 bg-gray-200 rounded-lg"></div>
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <div className="h-6 w-1/4 bg-gray-200 rounded"></div>
          <div className="h-10 w-1/2 bg-gray-200 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-100 p-6 h-36"></div>
          <div className="bg-white rounded-xl border border-gray-100 p-6 h-36"></div>
          <div className="bg-white rounded-xl border border-gray-100 p-6 h-36"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-md mx-auto text-center bg-white rounded-xl border border-gray-100 shadow-sm mt-12">
        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-gray-900">Failed to load invoice</h3>
        <p className="text-sm text-gray-500 mt-1 mb-4">{error}</p>
        <div className="flex justify-center gap-3">
          <button onClick={onBack} className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
            Back
          </button>
          <button onClick={loadAllInvoiceData} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-8 max-w-md mx-auto text-center bg-white rounded-xl border border-gray-100 shadow-sm mt-12">
        <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">Invoice not found.</h3>
        <p className="text-sm text-gray-400 mt-1 mb-4">The requested document configuration could not be loaded.</p>
        <button onClick={onBack} className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Controls Button */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </button>
      </div>

      {/* Main Top Header Block Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest font-extrabold text-indigo-600">RIVO</span>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">Tax Invoice</h1>
          <p className="text-sm text-gray-500 mt-1">
            Invoice Number: <span className="font-semibold text-gray-700">{invoice.invoice_number}</span>
          </p>
        </div>
        <div className="md:text-right space-y-1.5 self-start md:self-auto">
          <div className="text-xs text-gray-400">
            Invoice Date: <span className="font-medium text-gray-600">{new Date(invoice.created_at).toLocaleDateString()}</span>
          </div>
          <div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadgeClass(invoice.status)}`}>
              {invoice.status || 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      {/* Directory Meta Columns Details Segment Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Vendor Container */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Vendor Info</h3>
          <div className="space-y-1 text-sm text-gray-600">
            {vendor?.store_name && <p className="font-semibold text-gray-900">{vendor.store_name}</p>}
            {vendor?.owner_name && <p><span className="text-gray-400 text-xs">Owner:</span> {vendor.owner_name}</p>}
            {vendor?.phone && <p><span className="text-gray-400 text-xs">Phone:</span> {vendor.phone}</p>}
          </div>
        </div>

        {/* Customer Target Container */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Customer Delivery Address</h3>
          <div className="space-y-1 text-sm text-gray-600">
            {address?.address_line1 && <p className="text-gray-900 font-medium">{address.address_line1}</p>}
            {address?.address_line2 && <p>{address.address_line2}</p>}
            <p>
              {[address?.city, address?.state].filter(Boolean).join(', ')}
              {address?.postal_code && ` - ${address.postal_code}`}
            </p>
            {address?.landmark && (
              <p className="text-xs text-gray-400 italic mt-1">
                Landmark: {address.landmark}
              </p>
            )}
          </div>
        </div>

        {/* Core Order Info Box */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Order Information</h3>
          <div className="space-y-1.5 text-sm text-gray-600">
            <p><span className="text-gray-400 text-xs">Order Number:</span> <span className="font-medium text-gray-900">{order?.order_number || 'N/A'}</span></p>
            <p><span className="text-gray-400 text-xs">Order Status:</span> <span className="capitalize text-gray-700 font-medium">{order?.order_status || 'N/A'}</span></p>
            <p><span className="text-gray-400 text-xs">Payment Method:</span> <span className="capitalize text-gray-700">{order?.payment_method || 'N/A'}</span></p>
            <p><span className="text-gray-400 text-xs">Payment Status:</span> <span className="capitalize text-gray-700">{order?.payment_status || 'N/A'}</span></p>
            {order?.delivered_at && (
              <p><span className="text-gray-400 text-xs">Delivered Date:</span> <span className="text-gray-700">{new Date(order.delivered_at).toLocaleDateString()}</span></p>
            )}
          </div>
        </div>
      </div>

      {/* Items Table Presentation Layout Section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700">Line Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/30 border-b border-gray-100 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4 text-center">Quantity</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-600">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/30 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-gray-900">{item.product_name}</td>
                  <td className="py-3.5 px-4 text-center font-medium">{item.quantity}</td>
                  <td className="py-3.5 px-4 text-right">₹{item.unit_price.toFixed(2)}</td>
                  <td className="py-3.5 px-4 text-right font-medium text-gray-900">
                    ₹{(item.quantity * item.unit_price).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Summary: Vendor Selling Amount Only */}
      <div className="flex justify-end">
        <div className="w-full md:w-80 bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3 text-sm text-gray-600">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-900 text-base">Total Selling Amount</span>
            <span className="font-bold text-indigo-600 text-lg">₹{totalSellingAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* System Legal Context Footer Notice Area */}
      <div className="text-center py-6 border-t border-gray-100 text-xs text-gray-400 space-y-1">
        <p className="font-medium text-gray-500">Thank you for choosing Rivo.</p>
        <p>This is a system generated invoice.</p>
      </div>
    </div>
  );
}