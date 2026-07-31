import React, { useEffect, useState } from 'react';
import { supabase } from "../../../lib/supabase";
import { 
  Search, 
  FileText, 
  RefreshCw, 
  Eye, 
  ArrowLeft, 
  Printer, 
  Building2, 
  User, 
  Hash,
  ShieldCheck
} from 'lucide-react';
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
  created_at?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  customer?: any;
  customer_addresses?: any;
}

interface EnrichedInvoice extends Invoice {
  order?: OrderData;
  customer?: any;
  customer_addresses?: any;
}

interface VendorProfile {
  id?: string;
  shop_name?: string;
  store_name?: string;
  business_name?: string;
  owner_name?: string;
  address?: string;
  phone?: string;
  gstin?: string;
  fssai_number?: string;
  fssai?: string;
  email?: string;
}

interface BuyerProfile {
  customer_name?: string;
  name?: string;
  address_line1?: string;
  address_line2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pin_code?: string;
  phone?: string;
  email?: string;
  gstin?: string;
}

interface OrderItem {
  id: string;
  product_id?: string;
  product_name?: string;
  name?: string;
  quantity: number;
  qty?: number;
  price: number;
  unit_price?: number;
  mrp?: number;
  selling_rate?: number;
  hsn_code?: string;
  hsn?: string;
  batch_number?: string;
  batch?: string;
  expiry_date?: string;
  expiry?: string;
  packing?: string;
  unit?: string;
  gst_rate?: number;
  gst_percentage?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  taxable_amount?: number;
  line_total?: number;
  manufacturer?: string;
  barcode?: string;
  sku?: string;
  ptr?: number;
  pts?: number;
  purchase_rate?: number;
  scheme?: string;
  scheme_discount?: number;
  net_rate?: number;
  manufacturing_date?: string;
  weight?: string;
}

export default function InvoiceManagement() {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<EnrichedInvoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Detailed Vendor Tax Invoice State
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<EnrichedInvoice | null>(null);
  const [sellerDetails, setSellerDetails] = useState<VendorProfile | null>(null);
  const [buyerDetails, setBuyerDetails] = useState<BuyerProfile | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<OrderItem[]>([]);

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
          // Removed non-existent shipping_address column to prevent 400 Bad Request
          const { data: orderData } = await supabase
            .from('orders')
            .select('order_number, subtotal, payment_status, payment_method, order_status, total_amount, created_at')
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

  /**
   * Helper: Extracts buyer info whether nested inside customer, customer_addresses,
   * order, order.customer, order.customer_addresses, or flat on the queried object.
   */
  const extractBuyerProfile = (invData: any, orderInfo: any, customerRes: any, addressRes?: any): BuyerProfile => {
    const custObj = customerRes || invData.customer || orderInfo?.customer || {};
    const addrObj = addressRes || invData.customer_addresses || orderInfo?.customer_addresses || {};

    return {
      customer_name:
        custObj.customer_name ||
        custObj.name ||
        custObj.full_name ||
        addrObj.name ||
        orderInfo?.customer_name ||
        invData.customer_name ||
        '-',
      address_line1:
        addrObj.address_line1 ||
        addrObj.address ||
        orderInfo?.customer_address ||
        custObj.address_line1 ||
        '-',
      address_line2: addrObj.address_line2 || custObj.address_line2 || null,
      landmark: addrObj.landmark || custObj.landmark || null,
      city: addrObj.city || custObj.city || null,
      state: addrObj.state || custObj.state || null,
      pin_code: addrObj.pin_code || addrObj.postal_code || custObj.pin_code || custObj.postal_code || null,
      phone:
        custObj.phone ||
        addrObj.phone ||
        orderInfo?.customer_phone ||
        invData.phone ||
        '-',
      email: custObj.email || addrObj.email || orderInfo?.customer_email || invData.email || '-',
      gstin: custObj.gstin || addrObj.gstin || orderInfo?.customer_gstin || invData.gstin || null,
    };
  };

  const fetchInvoiceDetails = async (invId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const { data: invData, error: invError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invId)
        .single();

      if (invError) throw invError;
      if (!invData) throw new Error('Invoice not found.');

      let orderInfo: any = undefined;
      if (invData.order_id) {
        const { data: orderRes } = await supabase
          .from('orders')
          .select('*')
          .eq('id', invData.order_id)
          .single();
        orderInfo = orderRes || undefined;
      }

      setSelectedInvoice({
        ...invData,
        order: orderInfo
      });

      // Seller details
      if (invData.vendor_id) {
        const { data: vendorRes } = await supabase
          .from('vendors')
          .select('*')
          .eq('id', invData.vendor_id)
          .single();
        setSellerDetails(vendorRes || null);
      }

      // Buyer details mapping (checking customer & customer_addresses)
      let custRes: any = null;
      let addrRes: any = null;

      const customerId = invData.customer_id || orderInfo?.customer_id;
      if (customerId) {
        const { data } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .single();
        custRes = data || null;
      }

      const addressId = orderInfo?.customer_address_id || invData.customer_address_id;
      if (addressId) {
        const { data } = await supabase
          .from('customer_addresses')
          .select('*')
          .eq('id', addressId)
          .single();
        addrRes = data || null;
      }

      const mappedBuyer = extractBuyerProfile(invData, orderInfo, custRes, addrRes);
      setBuyerDetails(mappedBuyer);

      // Order Items & Product Enrichment
      if (invData.order_id) {
        const { data: itemsRes, error: itemsErr } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', invData.order_id);

        if (!itemsErr && itemsRes) {
          const enrichedItems: OrderItem[] = [];
          for (const item of itemsRes) {
            let productDetails: any = {};
            if (item.product_id) {
              const { data: pData } = await supabase
                .from('products')
                .select('*')
                .eq('id', item.product_id)
                .single();
              if (pData) productDetails = pData;
            }
            enrichedItems.push({
              ...productDetails,
              ...item,
              product_name: item.product_name || item.name || productDetails.name || 'Item',
              hsn_code: item.hsn_code || productDetails.hsn_code || productDetails.hsn || null,
              batch_number: item.batch_number || productDetails.batch_number || productDetails.batch || null,
              expiry_date: item.expiry_date || productDetails.expiry_date || productDetails.expiry || null,
              packing: item.packing || productDetails.packing || productDetails.unit || null,
              gst_rate: item.gst_rate || productDetails.gst_rate || productDetails.gst || null,
              mrp: item.mrp || productDetails.mrp || null,
              selling_rate: item.price || item.unit_price || productDetails.selling_rate || productDetails.price || 0,
              quantity: item.quantity || item.qty || 1,
            });
          }
          setInvoiceItems(enrichedItems);
        } else {
          setInvoiceItems([]);
        }
      }
    } catch (err: any) {
      setDetailError(err.message || 'Failed to load invoice details.');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorInvoices();
  }, []);

  useEffect(() => {
    if (selectedInvoiceId) {
      fetchInvoiceDetails(selectedInvoiceId);
    }
  }, [selectedInvoiceId]);

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

  // Vendor Tax Invoice Professional View
  if (selectedInvoiceId) {
    if (detailLoading) {
      return (
        <div className="p-8 max-w-5xl mx-auto min-h-[60vh] flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500 font-medium">Generating Vendor GST Tax Invoice...</p>
        </div>
      );
    }

    if (detailError || !selectedInvoice) {
      return (
        <div className="p-8 max-w-3xl mx-auto text-center space-y-4">
          <div className="p-6 bg-red-50 text-red-600 rounded-xl border border-red-100">
            <h3 className="font-semibold text-lg">Unable to display tax invoice</h3>
            <p className="text-sm mt-1">{detailError || 'Invoice data unavailable.'}</p>
          </div>
          <button
            onClick={() => setSelectedInvoiceId(null)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Invoices
          </button>
        </div>
      );
    }

    // Vendor-specific sales & GST calculations (No platform/delivery fees)
    let summarySubtotal = 0;
    let summaryTaxable = 0;
    let summaryCgst = 0;
    let summarySgst = 0;
    let summaryIgst = 0;

    const computedItems = invoiceItems.map((item) => {
      const qty = Number(item.quantity || 1);
      const sellingRate = Number(item.selling_rate || item.price || item.unit_price || 0);
      const gstRate = Number(item.gst_rate || 0);
      const mrp = item.mrp ? Number(item.mrp) : null;

      const lineTotal = sellingRate * qty;
      const taxableAmount = gstRate > 0 ? lineTotal / (1 + gstRate / 100) : lineTotal;
      const totalTax = lineTotal - taxableAmount;

      const hasIgst = item.igst !== undefined && item.igst !== null && Number(item.igst) > 0;
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
        mrp,
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

    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Navigation & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <button
            onClick={() => setSelectedInvoiceId(null)}
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

        {/* Professional Printable Vendor GST Tax Invoice Sheet */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-10 space-y-8 print:border-none print:shadow-none print:p-0">
          
          {/* Header Title */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-6 gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-semibold uppercase tracking-wider mb-2">
                <ShieldCheck className="w-3.5 h-3.5" /> Vendor Tax Invoice
              </div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                {sellerDetails?.shop_name || sellerDetails?.store_name || sellerDetails?.business_name || 'Vendor GST Invoice'}
              </h1>
            </div>
            <div className="text-left sm:text-right">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusBadgeClass(selectedInvoice.status)}`}>
                {selectedInvoice.status || 'Paid'}
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
                {formatVal(sellerDetails?.shop_name || sellerDetails?.store_name || sellerDetails?.business_name)}
              </p>
              {sellerDetails?.owner_name && (
                <p className="text-gray-600">Owner: {sellerDetails.owner_name}</p>
              )}
              <p className="text-gray-600">{formatVal(sellerDetails?.address)}</p>
              <p className="text-gray-600">Phone: {formatVal(sellerDetails?.phone)}</p>
              <p className="text-gray-600">Email: {formatVal(sellerDetails?.email)}</p>
              <div className="pt-1 border-t border-gray-200/60 mt-2 space-y-1 text-xs">
                <p><span className="font-medium text-gray-700">GSTIN:</span> {formatVal(sellerDetails?.gstin)}</p>
                <p><span className="font-medium text-gray-700">FSSAI Number:</span> {formatVal(sellerDetails?.fssai_number || sellerDetails?.fssai)}</p>
              </div>
            </div>

            {/* Buyer Details */}
            <div className="p-4 rounded-lg bg-gray-50/70 border border-gray-100 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                <User className="w-3.5 h-3.5" /> Buyer Details
              </div>
              <p className="font-semibold text-gray-900">
                {formatVal(buyerDetails?.customer_name || buyerDetails?.name)}
              </p>
              <p className="text-gray-600">
                {formatVal(buyerDetails?.address_line1)}
              </p>
              {buyerDetails?.address_line2 && (
                <p className="text-gray-600">{buyerDetails.address_line2}</p>
              )}
              {buyerDetails?.landmark && (
                <p className="text-gray-500 text-xs italic">Landmark: {buyerDetails.landmark}</p>
              )}
              <p className="text-gray-600">
                {[
                  buyerDetails?.city,
                  buyerDetails?.state,
                ].filter(Boolean).join(', ')}
                {buyerDetails?.pin_code ? ` - ${buyerDetails.pin_code}` : ''}
              </p>
              <p className="text-gray-600">
                Phone: {formatVal(buyerDetails?.phone)}
              </p>
              <p className="text-gray-600">
                Email: {formatVal(buyerDetails?.email)}
              </p>
              {buyerDetails?.gstin && (
                <p className="pt-1 border-t border-gray-200/60 mt-2 text-xs">
                  <span className="font-medium text-gray-700">GSTIN:</span> {buyerDetails.gstin}
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
                <span className="font-semibold text-gray-900">{formatVal(selectedInvoice.invoice_number)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Order Number:</span>
                <span className="font-medium text-gray-900">{formatVal(selectedInvoice.order?.order_number)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Invoice Date:</span>
                <span className="font-medium text-gray-900">
                  {new Date(selectedInvoice.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Method:</span>
                <span className="font-medium text-gray-900 capitalize">
                  {formatVal(selectedInvoice.order?.payment_method)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Status:</span>
                <span className="font-medium text-gray-900 capitalize">
                  {formatVal(selectedInvoice.order?.payment_status)}
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
                    <th className="py-3 px-3 min-w-[200px]">Product</th>
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
                  {computedItems.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-medium text-gray-900 whitespace-normal min-w-[200px]">{formatVal(item.product_name)}</td>
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
          {computedItems.some(i => i.manufacturer || i.barcode || i.sku || i.ptr || i.pts || i.purchase_rate || i.scheme || i.scheme_discount || i.net_rate || i.manufacturing_date || i.weight) && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Additional Information
              </h3>
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-600 uppercase tracking-wider">
                      <th className="py-2.5 px-3 min-w-[200px]">Product</th>
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
                    {computedItems.map((item, idx) => (
                      <tr key={`add-${item.id || idx}`} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-3 font-medium text-gray-900 whitespace-normal min-w-[200px]">{formatVal(item.product_name)}</td>
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
              <p className="font-semibold text-gray-700">For {sellerDetails?.shop_name || 'Seller'}</p>
              <p className="mt-4">Authorized Signatory</p>
            </div>
          </div>

        </div>
      </div>
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