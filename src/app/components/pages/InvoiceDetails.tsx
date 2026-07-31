import React, { useEffect, useState } from 'react';
import { supabase } from "../../../lib/supabase";
import { 
  ArrowLeft, 
  RefreshCw, 
  FileText, 
  Printer, 
  Building2, 
  User, 
  Hash, 
  ShieldCheck 
} from 'lucide-react';

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
  customer_id?: string;
  customer_address_id: string;
  order_status: string;
  payment_method: string;
  payment_status: string;
  delivered_at?: string;
  subtotal: number;
  total_amount: number;
  created_at?: string;
  customer?: any;
  customer_addresses?: any;
}

interface Vendor {
  id?: string;
  shop_name?: string;
  store_name?: string;
  business_name?: string;
  owner_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  fssai_number?: string;
  fssai?: string;
}

interface CustomerInfo {
  customer_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  address_line1?: string;
  address_line2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pin_code?: string;
  gstin?: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  qty?: number;
  unit_price: number;
  price?: number;
  hsn_code?: string;
  gst_rate?: number;
  taxable_value?: number;
  gst_amount?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  product_name?: string;
}

interface EnrichedItem extends OrderItem {
  product_name: string;
  name?: string;
  mrp?: number | null;
  selling_rate?: number;
  hsn?: string | null;
  batch_number?: string | null;
  batch?: string | null;
  expiry_date?: string | null;
  expiry?: string | null;
  packing?: string | null;
  unit?: string | null;
  manufacturer?: string | null;
  barcode?: string | null;
  sku?: string | null;
  ptr?: number | null;
  pts?: number | null;
  purchase_rate?: number | null;
  scheme?: string | null;
  scheme_discount?: number | null;
  net_rate?: number | null;
  manufacturing_date?: string | null;
  weight?: string | null;
}

export default function InvoiceDetails({ invoiceId, onBack }: InvoiceDetailsProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
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
        // Step 3: Fetch Vendor Profile
        const targetVendorId = orderData.vendor_id || invoiceData.vendor_id;
        if (targetVendorId) {
          const { data: vendorData } = await supabase
            .from('vendors')
            .select('*')
            .eq('id', targetVendorId)
            .single();
          setVendor(vendorData || null);
        }

        // Step 4: Fetch Buyer / Customer details (handling top-level and nested structures)
        const targetCustomerId = orderData.customer_id || invoiceData.customer_id;
        let custData: any = null;

        if (targetCustomerId) {
          const { data } = await supabase
            .from('customers')
            .select('*')
            .eq('id', targetCustomerId)
            .single();
          custData = data || null;
        }

        let addressData: any = null;
        if (orderData.customer_address_id) {
          const { data } = await supabase
            .from('customer_addresses')
            .select('*')
            .eq('id', orderData.customer_address_id)
            .single();
          addressData = data || null;
        }

        const custObj = custData || orderData.customer || (invoiceData as any).customer || orderData || invoiceData || {};
        const addrObj = addressData || orderData.customer_addresses || (invoiceData as any).customer_addresses || orderData || invoiceData || {};

        const customerInfo: CustomerInfo = {
          customer_name:
            custObj.customer_name ||
            custObj.name ||
            custObj.full_name ||
            addrObj.name ||
            '-',
          email: custObj.email || addrObj.email || '-',
          phone: custObj.phone || addrObj.phone || '-',
          address_line1: addrObj.address_line1 || addrObj.address || custObj.address_line1 || '-',
          address_line2: addrObj.address_line2 || custObj.address_line2 || null,
          landmark: addrObj.landmark || custObj.landmark || null,
          city: addrObj.city || custObj.city || null,
          state: addrObj.state || custObj.state || null,
          pin_code: addrObj.pin_code || addrObj.postal_code || custObj.pin_code || custObj.postal_code || null,
          gstin: custObj.gstin || addrObj.gstin || null,
        };

        setCustomer(customerInfo);

        // Step 5: Fetch Order Items & Enrich with Product Table Data
        const { data: itemsData, error: itemsErr } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderData.id);

        if (itemsErr) throw itemsErr;

        const enrichedItemsList: EnrichedItem[] = [];
        if (itemsData && itemsData.length > 0) {
          for (const item of itemsData) {
            let productDetails: any = {};
            if (item.product_id) {
              const { data: prodData } = await supabase
                .from('products')
                .select('*')
                .eq('id', item.product_id)
                .single();
              if (prodData) {
                productDetails = prodData;
              }
            }
            enrichedItemsList.push({
              ...productDetails,
              ...item,
              product_name: item.product_name || productDetails.name || 'Unknown Product',
              hsn_code: item.hsn_code || productDetails.hsn_code || productDetails.hsn || null,
              batch_number: productDetails.batch_number || productDetails.batch || null,
              expiry_date: productDetails.expiry_date || productDetails.expiry || null,
              packing: productDetails.packing || productDetails.unit || null,
              gst_rate: item.gst_rate ?? productDetails.gst_rate ?? 0,
              mrp: productDetails.mrp ?? null,
              selling_rate: item.unit_price || item.price || productDetails.selling_rate || productDetails.price || 0,
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

  const formatVal = (val: any, isCurrency = false): string => {
    if (val === null || val === undefined || val === '' || Number.isNaN(val)) {
      return '-';
    }
    if (typeof val === 'number') {
      if (val === 0) return isCurrency ? '₹0.00' : '0';
      return isCurrency ? `₹${val.toFixed(2)}` : val.toString();
    }
    return String(val);
  };

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

  // Calculate Vendor-Specific Sales & GST Breakdown (Excluding Platform & Delivery Fees)
  let summarySubtotal = 0;
  let summaryTaxable = 0;
  let summaryCgst = 0;
  let summarySgst = 0;
  let summaryIgst = 0;

  const computedItems = items.map((item) => {
    const qty = Number(item.quantity || item.qty || 1);
    const sellingRate = Number(item.selling_rate || item.unit_price || 0);
    const gstRate = Number(item.gst_rate || 0);

    const lineTotal = sellingRate * qty;
    const taxableAmount = gstRate > 0 ? lineTotal / (1 + gstRate / 100) : lineTotal;
    const totalTax = lineTotal - taxableAmount;

    const hasIgst = item.igst_amount !== undefined && item.igst_amount !== null && Number(item.igst_amount) > 0;
    const cgstVal = hasIgst ? 0 : totalTax / 2;
    const sgstVal = hasIgst ? 0 : totalTax / 2;
    const igstVal = hasIgst ? totalTax : 0;

    summarySubtotal += lineTotal;
    summaryTaxable += taxableAmount;
    summaryCgst += cgstVal;
    summarySgst += sgstVal;
    summaryIgst += igstVal;

    return {
      ...item,
      qty,
      sellingRate,
      gstRate,
      taxableAmount,
      cgstVal,
      sgstVal,
      igstVal,
      lineTotal,
      hasIgst
    };
  });

  const summaryTotalGst = summaryCgst + summarySgst + summaryIgst;
  const summaryGrandTotal = summaryTaxable + summaryTotalGst;

  const hasAdditionalInfo = computedItems.some(
    i => i.manufacturer || i.barcode || i.sku || i.ptr || i.pts || i.purchase_rate || i.scheme || i.scheme_discount || i.net_rate || i.manufacturing_date || i.weight || i.packing
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Action & Navigation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
          >
            <Printer className="w-4 h-4" /> Print Tax Invoice
          </button>
        </div>
      </div>

      {/* Printable Vendor GST Tax Invoice Sheet */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-10 space-y-8 print:border-none print:shadow-none print:p-0">
        
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-6 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-semibold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5" /> Vendor Tax Invoice
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {vendor?.shop_name || vendor?.store_name || vendor?.business_name || 'Vendor GST Invoice'}
            </h1>
          </div>
          <div className="text-left sm:text-right">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusBadgeClass(invoice.status)}`}>
              {invoice.status || 'Paid'}
            </span>
            <p className="text-xs text-gray-400 mt-1">Original for Recipient</p>
          </div>
        </div>

        {/* Section 1 & 2: Seller Details, Buyer Details, Invoice Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          
          {/* Seller Details */}
          <div className="p-4 rounded-lg bg-gray-50/70 border border-gray-100 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              <Building2 className="w-3.5 h-3.5" /> Seller Details
            </div>
            <p className="font-semibold text-gray-900">
              {formatVal(vendor?.shop_name || vendor?.store_name || vendor?.business_name)}
            </p>
            {vendor?.owner_name && (
              <p className="text-gray-600">Owner: {vendor.owner_name}</p>
            )}
            <p className="text-gray-600">{formatVal(vendor?.address)}</p>
            <p className="text-gray-600">Phone: {formatVal(vendor?.phone)}</p>
            <p className="text-gray-600">Email: {formatVal(vendor?.email)}</p>
            <div className="pt-1 border-t border-gray-200/60 mt-2 space-y-1 text-xs">
              <p><span className="font-medium text-gray-700">GSTIN:</span> {formatVal(vendor?.gstin)}</p>
              <p><span className="font-medium text-gray-700">FSSAI Number:</span> {formatVal(vendor?.fssai_number || vendor?.fssai)}</p>
            </div>
          </div>

          {/* Buyer Details */}
          <div className="p-4 rounded-lg bg-gray-50/70 border border-gray-100 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              <User className="w-3.5 h-3.5" /> Buyer Details
            </div>
            <p className="font-semibold text-gray-900">
              {formatVal(customer?.customer_name || customer?.name)}
            </p>
            <p className="text-gray-600">
              {formatVal(customer?.address_line1)}
            </p>
            {customer?.address_line2 && (
              <p className="text-gray-600">{customer.address_line2}</p>
            )}
            {customer?.landmark && (
              <p className="text-gray-500 text-xs italic">Landmark: {customer.landmark}</p>
            )}
            <p className="text-gray-600">
              {[
                customer?.city,
                customer?.state,
              ].filter(Boolean).join(', ')}
              {customer?.pin_code ? ` - ${customer.pin_code}` : ''}
            </p>
            <p className="text-gray-600">
              Phone: {formatVal(customer?.phone)}
            </p>
            <p className="text-gray-600">
              Email: {formatVal(customer?.email)}
            </p>
            {customer?.gstin && (
              <p className="pt-1 border-t border-gray-200/60 mt-2 text-xs">
                <span className="font-medium text-gray-700">GSTIN:</span> {customer.gstin}
              </p>
            )}
          </div>

          {/* Invoice Details */}
          <div className="p-4 rounded-lg bg-gray-50/70 border border-gray-100 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              <Hash className="w-3.5 h-3.5" /> Invoice Details
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Invoice Number:</span>
              <span className="font-semibold text-gray-900">{formatVal(invoice.invoice_number)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Order Number:</span>
              <span className="font-medium text-gray-900">{formatVal(order?.order_number)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Invoice Date:</span>
              <span className="font-medium text-gray-900">
                {new Date(invoice.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Payment Method:</span>
              <span className="font-medium text-gray-900 capitalize">
                {formatVal(order?.payment_method)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Payment Status:</span>
              <span className="font-medium text-gray-900 capitalize">
                {formatVal(order?.payment_status)}
              </span>
            </div>
          </div>

        </div>

        {/* Section 4: Product Details Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Product Details
          </h3>
          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-3 min-w-[180px]">Product</th>
                  <th className="py-3 px-3">HSN Code</th>
                  <th className="py-3 px-3">Batch</th>
                  <th className="py-3 px-3">Expiry</th>
                  <th className="py-3 px-3">Packing</th>
                  <th className="py-3 px-3 text-right">Qty</th>
                  <th className="py-3 px-3 text-right">MRP</th>
                  <th className="py-3 px-3 text-right">Selling Rate</th>
                  <th className="py-3 px-3 text-right">GST %</th>
                  <th className="py-3 px-3 text-right">Taxable Amount</th>
                  <th className="py-3 px-3 text-right">CGST</th>
                  <th className="py-3 px-3 text-right">SGST</th>
                  <th className="py-3 px-3 text-right">IGST</th>
                  <th className="py-3 px-3 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-700">
                {computedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-3 font-medium text-gray-900 whitespace-normal min-w-[180px]">{formatVal(item.product_name)}</td>
                    <td className="py-3 px-3">{formatVal(item.hsn_code)}</td>
                    <td className="py-3 px-3">{formatVal(item.batch_number)}</td>
                    <td className="py-3 px-3">{formatVal(item.expiry_date)}</td>
                    <td className="py-3 px-3">{formatVal(item.packing)}</td>
                    <td className="py-3 px-3 text-right font-medium">{formatVal(item.qty)}</td>
                    <td className="py-3 px-3 text-right">{formatVal(item.mrp, true)}</td>
                    <td className="py-3 px-3 text-right">{formatVal(item.sellingRate, true)}</td>
                    <td className="py-3 px-3 text-right">
                      {item.gstRate > 0 ? `${item.gstRate}%` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right">{formatVal(item.taxableAmount, true)}</td>
                    <td className="py-3 px-3 text-right">
                      {item.hasIgst ? '-' : (item.cgstVal > 0 ? `₹${item.cgstVal.toFixed(2)} (${item.gstRate / 2}%)` : '-')}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {item.hasIgst ? '-' : (item.sgstVal > 0 ? `₹${item.sgstVal.toFixed(2)} (${item.gstRate / 2}%)` : '-')}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {item.hasIgst ? `₹${item.igstVal.toFixed(2)} (${item.gstRate}%)` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-gray-900">
                      {formatVal(item.lineTotal, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 5: Additional Information (Only shown when fields are present) */}
        {hasAdditionalInfo && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Additional Information
            </h3>
            <div className="border border-gray-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-600 uppercase tracking-wider">
                    <th className="py-2.5 px-3 min-w-[180px]">Product</th>
                    <th className="py-2.5 px-3">Manufacturer</th>
                    <th className="py-2.5 px-3">Barcode</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3 text-right">PTR</th>
                    <th className="py-2.5 px-3 text-right">PTS</th>
                    <th className="py-2.5 px-3 text-right">Purchase Rate</th>
                    <th className="py-2.5 px-3 text-right">Selling Rate</th>
                    <th className="py-2.5 px-3">Scheme</th>
                    <th className="py-2.5 px-3 text-right">Scheme Discount</th>
                    <th className="py-2.5 px-3 text-right">Net Rate</th>
                    <th className="py-2.5 px-3">Mfg Date</th>
                    <th className="py-2.5 px-3">Expiry Date</th>
                    <th className="py-2.5 px-3">Weight</th>
                    <th className="py-2.5 px-3">Packing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-700">
                  {computedItems.map((item) => (
                    <tr key={`add-${item.id}`} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-3 font-medium text-gray-900 whitespace-normal min-w-[180px]">{formatVal(item.product_name)}</td>
                      <td className="py-2.5 px-3">{formatVal(item.manufacturer)}</td>
                      <td className="py-2.5 px-3">{formatVal(item.barcode)}</td>
                      <td className="py-2.5 px-3">{formatVal(item.sku)}</td>
                      <td className="py-2.5 px-3 text-right">{formatVal(item.ptr, true)}</td>
                      <td className="py-2.5 px-3 text-right">{formatVal(item.pts, true)}</td>
                      <td className="py-2.5 px-3 text-right">{formatVal(item.purchase_rate, true)}</td>
                      <td className="py-2.5 px-3 text-right">{formatVal(item.sellingRate, true)}</td>
                      <td className="py-2.5 px-3">{formatVal(item.scheme)}</td>
                      <td className="py-2.5 px-3 text-right">{formatVal(item.scheme_discount, true)}</td>
                      <td className="py-2.5 px-3 text-right">{formatVal(item.net_rate, true)}</td>
                      <td className="py-2.5 px-3">{formatVal(item.manufacturing_date)}</td>
                      <td className="py-2.5 px-3">{formatVal(item.expiry_date)}</td>
                      <td className="py-2.5 px-3">{formatVal(item.weight)}</td>
                      <td className="py-2.5 px-3">{formatVal(item.packing)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 6: Tax Summary Footer */}
        <div className="flex flex-col md:flex-row justify-end items-end pt-4 border-t border-gray-200">
          <div className="w-full md:w-80 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span className="font-medium text-gray-900">₹{summarySubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Taxable Amount</span>
              <span className="font-medium text-gray-900">₹{summaryTaxable.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>CGST</span>
              <span className="font-medium text-gray-900">₹{summaryCgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>SGST</span>
              <span className="font-medium text-gray-900">₹{summarySgst.toFixed(2)}</span>
            </div>
            {summaryIgst > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>IGST</span>
                <span className="font-medium text-gray-900">₹{summaryIgst.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600 border-t border-gray-100 pt-2">
              <span>Total GST</span>
              <span className="font-medium text-gray-900">₹{summaryTotalGst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-2">
              <span>Grand Total</span>
              <span>₹{summaryGrandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer Signature Bar */}
        <div className="pt-8 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
          <div>
            <p>This is a computer-generated GST Tax Invoice and does not require a physical signature.</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-gray-700">For {vendor?.shop_name || vendor?.store_name || 'Seller'}</p>
            <p className="mt-4">Authorized Signatory</p>
          </div>
        </div>

      </div>
    </div>
  );
}