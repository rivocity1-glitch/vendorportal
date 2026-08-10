import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ArrowLeft, Upload, Loader2, Save } from "lucide-react";
import { runImportPipeline } from '../../../smart-imports/pipeline';
import { ReviewItem, ImportSummary } from '../../../smart-imports/types';
// Assuming your client instantiation lives here. Update if your project path differs.
import { supabase } from "../../../lib/supabase"; 

interface SmartImportProps {
  onNavigate: (page: string) => void;
}

interface DatabaseCategory {
  id: string;
  name: string;
}

export default function SmartImport({ onNavigate }: SmartImportProps) {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [categories, setCategories] = useState<DatabaseCategory[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  const handleTopScroll = () => {
    if (bottomScrollRef.current && topScrollRef.current) {
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  const handleBottomScroll = () => {
    if (topScrollRef.current && bottomScrollRef.current) {
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
  };

  // Load inventory catalog tracking categories from database on initialization mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const { data, error: sbError } = await supabase
          .from("product_categories")
          .select("id, name")
          .order("name");

        if (sbError) throw sbError;
        if (data) {
          setCategories(data);
        }
      } catch (err: any) {
        console.error("Failed to load inventory product categories:", err?.message);
      }
    }
    fetchCategories();
  }, []);

  const validateSelectedFile = (selectedFile: File): boolean => {
    const fileName = selectedFile.name.toLowerCase();
    const SUPPORTED_EXTENSIONS = ['.pdf', '.csv', '.jpg', '.jpeg', '.png', '.webp'];
    const isSupported = SUPPORTED_EXTENSIONS.some(ext => fileName.endsWith(ext));
    
    if (!isSupported) {
      setError("Unsupported file format. Please upload a PDF, CSV, JPG, JPEG, PNG or WEBP invoice.");
      return false;
    }
    setError(null);
    return true;
  };

  const handleFileSubmit = async (file: File) => {
    if (!validateSelectedFile(file)) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await runImportPipeline(file);
      setItems(result.items);
      setSummary(result.summary);
    } catch (err: any) {
      setError(err?.message || 'Failed to process the invoice document.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSubmit(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSubmit(e.target.files[0]);
    }
  };

  const updateItemField = (id: string, field: keyof ReviewItem, value: any) => {
    setItems((prevItems) =>
      prevItems.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const toggleSelectAll = (checked: boolean) => {
    setItems((prevItems) => prevItems.map((item) => ({ ...item, selected: checked })));
  };

  const handleCancel = () => {
    setItems([]);
    setSummary(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportSelected = async () => {
    const selectedItems = items.filter((item) => item.selected);
    if (selectedItems.length === 0) return;

    setIsLoading(true);
    setError(null);

    let importedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    try {
      // 1. Get the logged-in user context
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Authentication failed: No active profile session detected.");
      }

      // 2. Resolve vendor id mapping linked to the auth user profile
      const { data: vendor, error: vendorError } = await supabase
        .from("vendors")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (vendorError || !vendor) {
        throw new Error("Failed to map inventory profile: Vendor catalog entry not found.");
      }

      // 3. Process records iteratively, securing structural loops against total failures
      for (const item of selectedItems) {
        if (!item.name) {
          failedCount++;
          console.log("Failed:", "Unnamed product line rejected.");
          continue;
        }

        try {
          // 4. Duplicate validation matching composite vendor_id + text name keys
          const { data: existingProduct, error: checkError } = await supabase
            .from("products")
            .select("id")
            .eq("vendor_id", vendor.id)
            .eq("name", item.name.trim())
            .maybeSingle();

          if (checkError) throw checkError;

          if (existingProduct) {
            skippedCount++;
            console.log("Skipped:", item.name);
            continue;
          }

          // 5. Structure payload fields matching inventory layout schemas precisely
          const { error: insertError } = await supabase.from("products").insert({
            vendor_id: vendor.id,
            name: item.name.trim(),
            description: "",
            category_id: item.category || null,
            subcategory: (item as any).subcategory ?? null,
            // products.price is NOT NULL. Prefer an explicit selling price, then MRP,
            // and finally purchase/cost price for CSVs without a selling-price field.
            price:
              item.sellingPrice != null && Number(item.sellingPrice) > 0
                ? Number(item.sellingPrice)
                : item.mrp != null && Number(item.mrp) > 0
                  ? Number(item.mrp)
                  : item.costPrice != null && Number(item.costPrice) > 0
                    ? Number(item.costPrice)
                    : null,
            cost_price: item.costPrice ?? null,
            mrp: item.mrp ?? null,
            stock: item.stock ?? 0,
            image_url: null,
            low_stock_threshold: 5,
            status: "active",
            barcode: item.barcode ?? null,
            sku: item.sku ?? null,
            manufacturer: item.manufacturer ?? null,
            batch_number: item.batch ?? null,
            expiry_date: item.expiry ?? null,
            manufacturing_date: item.manufacturingDate ?? null,
            weight: item.weight ?? null,
            unit: item.unit ?? null,
            purchase_rate: item.purchaseRate ?? item.costPrice ?? null,
            selling_rate: item.sellingPrice ?? null,
            ptr: item.ptr ?? null,
            pts: item.pts ?? null,
            scheme: item.scheme ?? null,
            scheme_discount: item.schemeDiscount ?? null,
            net_rate: item.netRate ?? null,
            hsn_code: item.hsn ?? item.hsnCode ?? null,
            gst_rate: item.gst ?? item.gstRate ?? null,
            gst_slab: item.gstSlab ?? null,
            cgst: item.cgst ?? null,
            sgst: item.sgst ?? null,
            igst: item.igst ?? null,
            invoice_raw: item.rawText ?? item.invoiceRaw ?? null
          });

          if (insertError) throw insertError;

          importedCount++;
          console.log("Imported:", item.name);
        } catch (itemErr) {
          failedCount++;
          console.error("Failed:", item.name, itemErr);
        }
      }

      // 8. Generate definitive completion reporting logs 
      alert(`Import complete:\n- Imported ${importedCount} products\n- Skipped ${skippedCount} duplicates\n- Failed ${failedCount} products`);
      
      // 9 & 10. Clear states and automatically trigger parent container catalog refreshes
      handleCancel();
      onNavigate("products");
    } catch (err: any) {
      setError(err?.message || "An error occurred while importing products.");
    } finally {
      setIsLoading(false);
    }
  };

  const liveSummary = useMemo(() => {
    if (!summary) return null;
    return {
      total: items.length,
      newProducts: items.filter((i) => i.status === 'New').length,
      existingProducts: items.filter((i) => i.status === 'Match Found').length,
      needsReview: items.filter((i) => i.status === 'Needs Review').length,
    };
  }, [items, summary]);

  const statusStyles: Record<string, string> = {
    "Match Found": "bg-[#D1FAE5] text-[#065F46]",
    "New": "bg-[#EFF6FF] text-[#1D4ED8]",
    "Needs Review": "bg-[#FEE2E2] text-[#991B1B]",
  };

  return (
    <div className="w-full px-[24px] py-6 bg-background text-foreground min-h-screen space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button 
          type="button"
          onClick={() => onNavigate("products")}
          className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-foreground">Smart Product Import</h2>
          <p className="text-xs text-muted-foreground">Upload supplier invoices or CSVs to automatically add products.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[#FEE2E2] text-[#991B1B] rounded-xl text-sm font-medium border border-[#FEE2E2]">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-12 bg-card border border-border rounded-xl shadow-sm text-xs text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#10B981]" />
          <span>Processing catalog synchronization operations...</span>
        </div>
      )}

      {/* Upload Screen */}
      {!isLoading && items.length === 0 && (
        <div className="max-w-xl mx-auto">
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-3 min-h-[260px] ${
              dragActive ? "border-[#10B981] bg-[#10B981]/5" : "border-border hover:border-[#10B981] bg-card shadow-sm"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,.csv,text/csv,application/csv,application/vnd.ms-excel"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="w-8 h-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Drag and drop your invoice or CSV here, or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">Supports PDF, CSV, JPG, JPEG, PNG, WEBP</p>
            </div>
            <button 
              type="button" 
              className="mt-2 h-9 px-4 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold transition-colors"
            >
              Choose File
            </button>
          </div>
        </div>
      )}

      {/* Review Screen */}
      {!isLoading && items.length > 0 && liveSummary && (
        <div className="space-y-6 w-full">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Products Found</div>
              <div className="text-2xl font-bold text-foreground mt-1">{liveSummary.total}</div>
            </div>
            <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-[#1D4ED8]">New Products</div>
              <div className="text-2xl font-bold text-[#1D4ED8] mt-1">{liveSummary.newProducts}</div>
            </div>
            <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-[#065F46]">Existing Products</div>
              <div className="text-2xl font-bold text-[#065F46] mt-1">{liveSummary.existingProducts}</div>
            </div>
            <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-[#991B1B]">Needs Review</div>
              <div className="text-2xl font-bold text-[#991B1B] mt-1">{liveSummary.needsReview}</div>
            </div>
          </div>

          {/* Table Header and Control Buttons */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <p className="text-xs text-muted-foreground">
              Verify values extracted from the document layout before completing your catalog synchronization.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="h-9 px-4 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportSelected}
                disabled={items.filter((i) => i.selected).length === 0}
                className="h-9 px-4 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Import Selected ({items.filter((i) => i.selected).length})
              </button>
            </div>
          </div>

          {/* Editable Review Table Container with Top & Bottom Scrollbars */}
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm w-full">
            {/* Top Scrollbar Container */}
            <div 
              ref={topScrollRef} 
              onScroll={handleTopScroll}
              className="overflow-x-auto overflow-y-hidden border-b border-border bg-muted/20"
              style={{ height: '14px' }}
            >
              <div style={{ width: '3100px', height: '1px' }} />
            </div>

            {/* Main Scrollable Table Container */}
            <div 
              ref={bottomScrollRef} 
              onScroll={handleBottomScroll}
              className="overflow-x-auto w-full relative"
            >
              <table className="w-full whitespace-nowrap border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {/* Sticky Group 1: Checkbox, Product, Category */}
                    <th className="px-4 py-3 text-left w-12 sticky left-0 z-30 bg-card border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      <input
                        type="checkbox"
                        checked={items.every((i) => i.selected)}
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        className="rounded border-border text-[#10B981] focus:ring-[#10B981]/10 cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 text-left sticky left-[48px] z-30 bg-card border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[200px]">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left sticky left-[248px] z-30 bg-card border-r-2 border-border/80 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.1)] min-w-[170px]">
                      Category
                    </th>

                    {/* Group: Inventory */}
                    <th className="px-4 py-3 text-left w-24">Stock</th>
                    <th className="px-4 py-3 text-left w-28 border-r-2 border-border/80">Packing</th>

                    {/* Group: Tax */}
                    <th className="px-4 py-3 text-left w-32">HSN Code</th>
                    <th className="px-4 py-3 text-left w-28">GST %</th>
                    <th className="px-4 py-3 text-left w-28">GST Slab</th>
                    <th className="px-4 py-3 text-left w-28">CGST</th>
                    <th className="px-4 py-3 text-left w-28">SGST</th>
                    <th className="px-4 py-3 text-left w-28 border-r-2 border-border/80">IGST</th>

                    {/* Group: Batch */}
                    <th className="px-4 py-3 text-left w-32">Batch No</th>
                    <th className="px-4 py-3 text-left w-32">Expiry Date</th>
                    <th className="px-4 py-3 text-left w-32 border-r-2 border-border/80">Manufacturing Date</th>

                    {/* Group: Product Details */}
                    <th className="px-4 py-3 text-left w-36">Manufacturer</th>
                    <th className="px-4 py-3 text-left w-32">Barcode</th>
                    <th className="px-4 py-3 text-left w-32">SKU</th>
                    <th className="px-4 py-3 text-left w-28">Weight</th>
                    <th className="px-4 py-3 text-left w-32 border-r-2 border-border/80">Subcategory</th>

                    {/* Group: Pricing */}
                    <th className="px-4 py-3 text-left w-32">Cost Price</th>
                    <th className="px-4 py-3 text-left w-32">Purchase Rate</th>
                    <th className="px-4 py-3 text-left w-28">PTR</th>
                    <th className="px-4 py-3 text-left w-28">PTS</th>
                    <th className="px-4 py-3 text-left w-32">Scheme</th>
                    <th className="px-4 py-3 text-left w-32">Scheme Discount</th>
                    <th className="px-4 py-3 text-left w-32">Net Rate</th>
                    <th className="px-4 py-3 text-left w-32">Selling Rate</th>
                    <th className="px-4 py-3 text-left w-32 border-r-2 border-border/80">MRP</th>

                    {/* Status */}
                    <th className="px-4 py-3 text-left w-36">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr key={item.id} className={`hover:bg-muted/15 transition-colors ${item.selected ? 'bg-[#ECFDF5]/5' : ''}`}>
                      {/* Sticky Group 1: Checkbox, Product, Category */}
                      <td className="px-4 py-3 sticky left-0 z-20 bg-card border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={(e) => updateItemField(item.id, 'selected', e.target.checked)}
                          className="rounded border-border text-[#10B981] focus:ring-[#10B981]/10 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-2 sticky left-[48px] z-20 bg-card border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <input
                          type="text"
                          value={item.name || ''}
                          placeholder="Unnamed Product"
                          onChange={(e) => updateItemField(item.id, 'name', e.target.value || null)}
                          className={`w-48 h-9 px-2 text-sm border rounded-lg bg-background focus:outline-none focus:border-[#10B981] ${
                            !item.name ? 'border-[#EF4444] bg-[#FEE2E2]/10' : 'border-transparent hover:border-border'
                          }`}
                        />
                      </td>
                      <td className="px-4 py-2 sticky left-[248px] z-20 bg-card border-r-2 border-border/80 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.1)]">
                        <select
                          value={item.category || ''}
                          onChange={(e) => updateItemField(item.id, 'category', e.target.value || null)}
                          className="w-40 h-9 px-2 text-sm border border-transparent hover:border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981] cursor-pointer"
                        >
                          <option value="">Select Category</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Group: Inventory */}
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={item.stock ?? ''}
                          placeholder="—"
                          onChange={(e) => updateItemField(item.id, 'stock', e.target.value !== '' ? parseInt(e.target.value, 10) : null)}
                          className="w-24 h-9 px-2 text-sm border border-transparent hover:border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                        />
                      </td>
                      <td className="px-4 py-2 border-r-2 border-border/80">
                        <input
                          type="text"
                          value={item.unit ?? ''}
                          placeholder="—"
                          onChange={(e) => updateItemField(item.id, 'unit', e.target.value || null)}
                          className="w-28 h-9 px-2 text-sm border border-transparent hover:border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                        />
                      </td>

                      {/* Group: Tax */}
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.hsn ?? item.hsnCode ?? ''}
                          placeholder="—"
                          onChange={(e) => {
                            updateItemField(item.id, 'hsn', e.target.value || null);
                            updateItemField(item.id, 'hsnCode', e.target.value || null);
                          }}
                          className="w-32 h-9 px-2 text-sm border border-transparent hover:border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.gst ?? item.gstRate ?? ''}
                          placeholder="—"
                          onChange={(e) => {
                            const val = e.target.value !== '' ? parseFloat(e.target.value) : null;
                            updateItemField(item.id, 'gst', val);
                            updateItemField(item.id, 'gstRate', val);
                          }}
                          className="w-28 h-9 px-2 text-sm border border-transparent hover:border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.gstSlab ?? ''}
                          placeholder="—"
                          onChange={(e) => updateItemField(item.id, 'gstSlab', e.target.value || null)}
                          className="w-28 h-9 px-2 text-sm border border-transparent hover:border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.cgst ?? ''}
                          placeholder="—"
                          onChange={(e) => updateItemField(item.id, 'cgst', e.target.value !== '' ? parseFloat(e.target.value) : null)}
                          className="w-28 h-9 px-2 text-sm border border-transparent hover:border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.sgst ?? ''}
                          placeholder="—"
                          onChange={(e) => updateItemField(item.id, 'sgst', e.target.value !== '' ? parseFloat(e.target.value) : null)}
                          className="w-28 h-9 px-2 text-sm border border-transparent hover:border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                        />
                      </td>
                      <td className="px-4 py-2 border-r-2 border-border/80">
                        <input
                          type="number"
                          step="0.01"
                          value={item.igst ?? ''}
                          placeholder="—"
                          onChange={(e) => updateItemField(item.id, 'igst', e.target.value !== '' ? parseFloat(e.target.value) : null)}
                          className="w-28 h-9 px-2 text-sm border border-transparent hover:border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                        />
                      </td>

                      {/* Group: Batch */}
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.batch ?? ''}
                          placeholder="—"
                          onChange={(e) => updateItemField(item.id, 'batch', e.target.value || null)}
                          className="w-32 h-9 px-2 text-sm border border-transparent hover:border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.expiry ?? ''}
                          placeholder="—"
                          onChange={(e) => updateItemField(item.id, 'expiry', e.target.value || null)}
                          className="w-32 h-9 px-2 text-sm border border-transparent hover:border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                        />
                      </td>
                      <td className="px-4 py-2 border-r-2 border-border/80">
                        <input
                          type="text"
                          value={item.manufacturingDate ?? ''}
                          placeholder="—"
                          onChange={(e) => updateItemField(item.id, 'manufacturingDate', e.target.value || null)}
                          className="w-32 h-9 px-2 text-sm border border-transparent hover:border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                        />
                      </td>

                      {/* Group: Product Details */}
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.manufacturer ?? ''}
                          placeholder="—"
                          onChange={(e) => updateItemField(item.id, 'manufacturer', e.target.value || null)}
                          className="w-36 h-9 px-2 text-sm border border-transparent hover:border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.barcode ?? ''}
                          placeholder="—"
                          onChange={(e) => updateItemField(item.id, 'barcode', e.target.value || null)}
                          className="w-32 h-9 px-2 text-sm border border-transparent hover:border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.sku ?? ''}
                          placeholder="—"
                          onChange={(e) => updateItemField(item.id, 'sku', e.target.value || null)}
                          className="w-32 h-9 px-2 text-sm border border-transparent hover:border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.weight ?? ''}
                          placeholder="—"
                          onChange={(e) => updateItemField(item.id, 'weight', e.target.value || null)}
                          className="w-28 h-9 px-2 text-sm border border-transparent hover:border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                        />
                      </td>
                      <td className="px-4 py-2 border-r-2 border-border/80">
                        <input
                          type="text"
                          value={(item as any).subcategory ?? ''}
                          placeholder="—"
                          onChange={(e) => updateItemField(item.id, 'subcategory' as keyof ReviewItem, e.target.value || null)}
                          className="w-32 h-9 px-2 text-sm border border-transparent hover:border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                        />
                      </td>

                      {/* Group: Pricing */}
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.costPrice ?? ''}
                          placeholder="—"
                          onChange={(e) => updateItemField(item.id, 'costPrice', e.target.value !== '' ? parseFloat(e.target.value) : null)}
                          className={`w-32 h-9 px-2 text-sm border rounded-lg bg-background focus:outline-none focus:border-[#10B981] ${
                            item.costPrice === null ? 'border-[#EF4444] bg-[#FEE2E2]/10' : 'border-transparent hover:border-border'
                          }`}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.purchaseRate ?? ''}
                          placeholder="—"
                          onChange={(e) => updateItemField(item.id, 'purchaseRate', e.target.value !== '' ? parseFloat(e.target.value) : null)}
                          className="w-32 h-9 px-2 text-sm border border-transparent hover:border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.ptr ?? ''}
                          placeholder="—"
                          onChange={(e) => updateItemField(item.id, 'ptr', e.target.value !== '' ? parseFloat(e.target.value) : null)}
                          className="w-28 h-9 px-2 text-sm border border-transparent hover:border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.pts ?? ''}
                          placeholder="—"
                          onChange={(e) => updateItemField(item.id, 'pts', e.target.value !== '' ? parseFloat(e.target.value) : null)}
                          className="w-28 h-9 px-2 text-sm border border-transparent hover:border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.scheme ?? ''}
                          placeholder="—"
                          onChange={(e) => updateItemField(item.id, 'scheme', e.target.value || null)}
                          className="w-32 h-9 px-2 text-sm border border-transparent hover:border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.schemeDiscount ?? ''}
                          placeholder="—"
                          onChange={(e) => updateItemField(item.id, 'schemeDiscount', e.target.value !== '' ? parseFloat(e.target.value) : null)}
                          className="w-32 h-9 px-2 text-sm border border-transparent hover:border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.netRate ?? ''}
                          placeholder="—"
                          onChange={(e) => updateItemField(item.id, 'netRate', e.target.value !== '' ? parseFloat(e.target.value) : null)}
                          className="w-32 h-9 px-2 text-sm border border-transparent hover:border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.sellingPrice ?? ''}
                          placeholder="—"
                          onChange={(e) => updateItemField(item.id, 'sellingPrice', e.target.value !== '' ? parseFloat(e.target.value) : null)}
                          className="w-32 h-9 px-2 text-sm border border-transparent hover:border-border rounded-lg bg-background focus:outline-none focus:border-[#10B981]"
                        />
                      </td>
                      <td className="px-4 py-2 border-r-2 border-border/80">
                        <input
                          type="number"
                          step="0.01"
                          value={item.mrp ?? ''}
                          placeholder="—"
                          onChange={(e) => updateItemField(item.id, 'mrp', e.target.value !== '' ? parseFloat(e.target.value) : null)}
                          className={`w-32 h-9 px-2 text-sm border rounded-lg bg-background focus:outline-none focus:border-[#10B981] ${
                            item.mrp === null ? 'border-[#EF4444] bg-[#FEE2E2]/10' : 'border-transparent hover:border-border'
                          }`}
                        />
                      </td>

                      {/* Status Tag */}
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-block ${statusStyles[item.status] || "bg-muted text-foreground"}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}