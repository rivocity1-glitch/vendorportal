import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Edit2,
  History,
  Layers,
  Package,
  PlusCircle,
  Printer,
  RefreshCw,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

type TabType = "inventory" | "batches" | "history" | "analytics";
type FilterType = "all" | "low" | "out" | "expired" | "7days" | "30days" | "dead";

type InventoryItem = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  category: string;
  subcategory: string | null;
  stock: number;
  threshold: number;
  unit: string;
  sellingPrice: number;
  purchaseCost: number;
  inventoryValue: number;
  expiryDate: string | null;
  daysLeft: number;
  batchNumber: string | null;
  manufacturingDate: string | null;
  updatedAt: string | null;
  daysWithoutSales: number;
};

function numberValue(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatMoney(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function getExpiryStatus(date: string | null) {
  if (!date) return { label: "No Expiry", days: Infinity, className: "bg-slate-100 text-slate-600" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(date);
  expiry.setHours(0, 0, 0, 0);
  const days = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);

  if (days <= 0) return { label: "Expired", days, className: "bg-red-100 text-red-700" };
  if (days <= 7) return { label: "Expiring Soon", days, className: "bg-orange-100 text-orange-700" };
  if (days <= 30) return { label: "Expiring 30 Days", days, className: "bg-amber-100 text-amber-700" };
  return { label: "Healthy", days, className: "bg-emerald-100 text-emerald-700" };
}

function getStockStatus(stock: number, threshold: number) {
  const safe = threshold > 0 ? threshold : 1;
  if (stock <= 0) return { label: "Out of Stock", className: "bg-red-100 text-red-700" };
  if (stock <= safe * 0.5) return { label: "Critical", className: "bg-red-100 text-red-700" };
  if (stock <= safe) return { label: "Low Stock", className: "bg-amber-100 text-amber-700" };
  return { label: "In Stock", className: "bg-emerald-100 text-emerald-700" };
}

export function Inventory() {
  const [activeTab, setActiveTab] = useState<TabType>("inventory");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [filter, setFilter] = useState<FilterType>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [editStock, setEditStock] = useState("");
  const [editThreshold, setEditThreshold] = useState("");
  const [refillProduct, setRefillProduct] = useState<InventoryItem | null>(null);
  const [refillQuantity, setRefillQuantity] = useState("");
  const [refillCost, setRefillCost] = useState("");
  const [refillBatch, setRefillBatch] = useState("");
  const [refillMfg, setRefillMfg] = useState("");
  const [refillExpiry, setRefillExpiry] = useState("");

  const fetchInventoryData = useCallback(async () => {
    try {
      setError(null);
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Your vendor session could not be found.");

      const { data: vendor, error: vendorError } = await supabase
        .from("vendors")
        .select("id")
        .eq("auth_user_id", authData.user.id)
        .maybeSingle();

      if (vendorError) throw vendorError;
      if (!vendor) throw new Error("Vendor profile was not found for this account.");
      setVendorId(vendor.id);

      const { data: products, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("vendor_id", vendor.id)
        .order("name", { ascending: true });

      if (productError) throw productError;

      const mapped: InventoryItem[] = (products || []).map((p: any) => {
        const expiry = getExpiryStatus(p.expiry_date || null);
        const price = numberValue(p.price ?? p.selling_rate ?? p.mrp);
        const cost = numberValue(p.cost_price ?? p.purchase_rate ?? p.purchase_cost);
        const stock = numberValue(p.stock);
        const threshold = numberValue(p.low_stock_threshold, 5);
        const lastSold = p.last_sold_at ? new Date(p.last_sold_at).getTime() : 0;
        const daysWithoutSales = lastSold ? Math.max(0, Math.floor((Date.now() - lastSold) / 86400000)) : 45;

        return {
          id: p.id,
          name: p.name || "Unnamed Product",
          sku: p.sku || "—",
          barcode: p.barcode || null,
          category: p.category || "General",
          subcategory: p.subcategory || null,
          stock,
          threshold,
          unit: p.unit || p.weight || "pcs",
          sellingPrice: price,
          purchaseCost: cost,
          inventoryValue: stock * price,
          expiryDate: p.expiry_date || null,
          daysLeft: expiry.days,
          batchNumber: p.batch_number || null,
          manufacturingDate: p.manufacturing_date || null,
          updatedAt: p.updated_at || null,
          daysWithoutSales,
        };
      });

      setInventory(mapped);

      const { data: historyRows, error: historyError } = await supabase
        .from("inventory_history")
        .select("*")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (historyError) {
        console.warn("Inventory history could not be loaded:", historyError);
        setHistory([]);
      } else {
        const names = new Map(mapped.map(item => [item.id, item.name]));
        setHistory((historyRows || []).map((row: any) => ({
          ...row,
          productName: row.product_name || names.get(row.product_id) || "Product",
        })));
      }
    } catch (err: any) {
      console.error("Inventory load failed:", err);
      setInventory([]);
      setHistory([]);
      setError(err?.message || "Inventory could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);

  const categories = useMemo(() => {
    return ["all", ...Array.from(new Set(inventory.map(item => item.category).filter(Boolean)))];
  }, [inventory]);

  const metrics = useMemo(() => {
    const expiring7 = inventory.filter(p => p.daysLeft > 0 && p.daysLeft <= 7).length;
    const expiring30 = inventory.filter(p => p.daysLeft > 7 && p.daysLeft <= 30).length;
    return {
      products: inventory.length,
      units: inventory.reduce((sum, p) => sum + p.stock, 0),
      low: inventory.filter(p => p.stock > 0 && p.stock <= p.threshold).length,
      out: inventory.filter(p => p.stock <= 0).length,
      expired: inventory.filter(p => p.daysLeft <= 0).length,
      expiring7,
      expiring30,
      valuation: inventory.reduce((sum, p) => sum + p.inventoryValue, 0),
      dead: inventory.filter(p => p.daysWithoutSales >= 60 && p.stock > 0).length,
    };
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inventory.filter(p => {
      const matchesSearch = !q || [p.name, p.sku, p.barcode || "", p.category, p.subcategory || ""]
        .some(value => value.toLowerCase().includes(q));
      const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
      let matchesFilter = true;
      if (filter === "low") matchesFilter = p.stock > 0 && p.stock <= p.threshold;
      if (filter === "out") matchesFilter = p.stock <= 0;
      if (filter === "expired") matchesFilter = p.daysLeft <= 0;
      if (filter === "7days") matchesFilter = p.daysLeft > 0 && p.daysLeft <= 7;
      if (filter === "30days") matchesFilter = p.daysLeft > 0 && p.daysLeft <= 30;
      if (filter === "dead") matchesFilter = p.daysWithoutSales >= 60 && p.stock > 0;
      return matchesSearch && matchesCategory && matchesFilter;
    });
  }, [inventory, search, categoryFilter, filter]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [search, categoryFilter, filter, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredInventory.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageItems = filteredInventory.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const setActiveFilter = (next: FilterType) => {
    setFilter(next);
    setActiveTab("inventory");
  };

  const refresh = async () => {
    setRefreshing(true);
    await fetchInventoryData();
  };

  const logHistory = async (product: InventoryItem, action: string, change: number, previous: number, next: number) => {
    if (!vendorId) return;
    const { error: logError } = await supabase.from("inventory_history").insert({
      vendor_id: vendorId,
      product_id: product.id,
      product_name: product.name,
      action,
      quantity_change: change,
      previous_stock: previous,
      new_stock: next,
    });
    if (logError) console.warn("Inventory history log failed:", logError);
  };

  const saveStock = async () => {
    if (!editing) return;
    const stock = Number(editStock);
    const threshold = Number(editThreshold);
    if (!Number.isFinite(stock) || stock < 0 || !Number.isFinite(threshold) || threshold < 0) return;

    const { error: updateError } = await supabase
      .from("products")
      .update({ stock, low_stock_threshold: threshold, updated_at: new Date().toISOString() })
      .eq("id", editing.id)
      .eq("vendor_id", vendorId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await logHistory(editing, "Stock updated", stock - editing.stock, editing.stock, stock);
    setEditing(null);
    await fetchInventoryData();
  };

  const saveRefill = async () => {
    if (!refillProduct) return;
    const quantity = Number(refillQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) return;

    const newStock = refillProduct.stock + quantity;
    const payload: any = {
      stock: newStock,
      updated_at: new Date().toISOString(),
    };
    if (refillCost !== "" && Number.isFinite(Number(refillCost))) {
      payload.purchase_rate = Number(refillCost);
      payload.cost_price = Number(refillCost);
    }
    if (refillBatch) payload.batch_number = refillBatch;
    if (refillMfg) payload.manufacturing_date = refillMfg;
    if (refillExpiry) payload.expiry_date = refillExpiry;

    const { error: updateError } = await supabase
      .from("products")
      .update(payload)
      .eq("id", refillProduct.id)
      .eq("vendor_id", vendorId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await logHistory(refillProduct, "Stock replenished", quantity, refillProduct.stock, newStock);
    setRefillProduct(null);
    setRefillQuantity("");
    setRefillCost("");
    setRefillBatch("");
    setRefillMfg("");
    setRefillExpiry("");
    await fetchInventoryData();
  };

  const exportCsv = () => {
    const headers = ["Product", "SKU", "Category", "Stock", "Threshold", "Selling Price", "Cost Price", "Expiry Date", "Batch Number"];
    const rows = filteredInventory.map(p => [p.name, p.sku, p.category, p.stock, p.threshold, p.sellingPrice, p.purchaseCost, p.expiryDate || "", p.batchNumber || ""]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `rivo-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectAll = (checked: boolean) => setSelectedIds(checked ? pageItems.map(p => p.id) : []);

  return (
    <div className="w-full px-6 py-6 bg-background text-foreground min-h-screen space-y-5">
      {error && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1"><X className="w-4 h-4" /></button>
        </div>
      )}

      {(metrics.expiring7 + metrics.expiring30) > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-sm font-bold">{metrics.expiring7 + metrics.expiring30} Product{metrics.expiring7 + metrics.expiring30 === 1 ? "" : "s"} Expiring Soon</p>
              <p className="text-xs text-amber-700">{metrics.expiring7} expiring within 7 days and {metrics.expiring30} within 30 days.</p>
            </div>
          </div>
          <button onClick={() => setActiveFilter("30days")} className="px-3 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold">Review Items</button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendor Inventory System</h1>
          <p className="text-sm text-muted-foreground">Stock tracking, replenishment and inventory history</p>
        </div>
        <button onClick={refresh} disabled={refreshing} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-card text-sm font-semibold hover:bg-muted">
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-3">
        {([
          ["inventory", "Products & Stock", Package],
          ["batches", "Batches", Layers],
          ["history", "Audit History", History],
          ["analytics", "Analytics", BarChart3],
        ] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setActiveTab(id)} className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${activeTab === id ? "bg-[#10B981] text-white" : "border bg-card hover:bg-muted"}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <button onClick={() => setActiveFilter("all")} className="text-left rounded-xl border bg-card p-4 hover:border-emerald-300">
          <p className="text-xs text-muted-foreground">Total Products</p><p className="text-2xl font-bold mt-1">{metrics.products}</p><p className="text-xs text-muted-foreground mt-1">{metrics.units} units in stock</p>
        </button>
        <button onClick={() => setActiveFilter("low")} className="text-left rounded-xl border bg-card p-4 hover:border-amber-300">
          <p className="text-xs text-muted-foreground">Low Stock</p><p className="text-2xl font-bold text-amber-600 mt-1">{metrics.low}</p><p className="text-xs text-muted-foreground mt-1">Below threshold</p>
        </button>
        <button onClick={() => setActiveFilter("out")} className="text-left rounded-xl border bg-card p-4 hover:border-red-300">
          <p className="text-xs text-muted-foreground">Out of Stock</p><p className="text-2xl font-bold text-red-600 mt-1">{metrics.out}</p><p className="text-xs text-muted-foreground mt-1">Immediate action</p>
        </button>
        <button onClick={() => setActiveFilter("expired")} className="text-left rounded-xl border bg-card p-4 hover:border-red-300">
          <p className="text-xs text-muted-foreground">Expired</p><p className="text-2xl font-bold text-red-600 mt-1">{metrics.expired}</p><p className="text-xs text-muted-foreground mt-1">Requires review</p>
        </button>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Valuation</p><p className="text-2xl font-bold text-emerald-600 mt-1">{formatMoney(metrics.valuation)}</p><p className="text-xs text-muted-foreground mt-1">Selling-price value</p>
        </div>
      </div>

      {activeTab === "inventory" && (
        <>
          <div className="rounded-xl border bg-card p-3 flex flex-col lg:flex-row gap-3 lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, SKU, barcode..." className="w-full h-10 pl-9 pr-3 rounded-lg border bg-background text-sm outline-none focus:border-emerald-500" />
            </div>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="h-10 px-3 rounded-lg border bg-background text-sm min-w-[160px]">
              {categories.map(category => <option key={category} value={category}>{category === "all" ? "All Categories" : category}</option>)}
            </select>
            <div className="flex flex-wrap gap-1">
              {([
                ["all", "All"], ["low", "Low Stock"], ["out", "Out"], ["7days", "7 Days"], ["30days", "30 Days"], ["dead", "Dead Stock"],
              ] as const).map(([id, label]) => (
                <button key={id} onClick={() => setFilter(id)} className={`px-2.5 py-1.5 rounded-full border text-[11px] font-medium ${filter === id ? "bg-foreground text-background" : "hover:bg-muted"}`}>{label}</button>
              ))}
            </div>
            <div className="flex gap-1 ml-auto">
              <button onClick={exportCsv} title="Export CSV" className="p-2 rounded-lg border hover:bg-muted"><Download className="w-4 h-4" /></button>
              <button onClick={() => window.print()} title="Print" className="p-2 rounded-lg border hover:bg-muted"><Printer className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="p-3 text-left w-10"><input type="checkbox" checked={pageItems.length > 0 && pageItems.every(p => selectedIds.includes(p.id))} onChange={e => selectAll(e.target.checked)} /></th>
                    <th className="p-3 text-left">Product</th><th className="p-3 text-left">SKU</th><th className="p-3 text-left">Category</th><th className="p-3 text-right">Stock</th><th className="p-3 text-right">Threshold</th><th className="p-3 text-left">Stock Status</th><th className="p-3 text-left">Expiry</th><th className="p-3 text-right">Price</th><th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    <tr><td colSpan={10} className="p-10 text-center text-muted-foreground">Loading inventory...</td></tr>
                  ) : pageItems.length === 0 ? (
                    <tr><td colSpan={10} className="p-12 text-center"><Package className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" /><p className="font-semibold">No products found</p><p className="text-xs text-muted-foreground mt-1">Try clearing the search or selecting All.</p><button onClick={() => { setSearch(""); setCategoryFilter("all"); setFilter("all"); }} className="mt-3 px-3 py-2 rounded-lg bg-emerald-500 text-white text-xs font-semibold">Show All Products</button></td></tr>
                  ) : pageItems.map(item => {
                    const stockStatus = getStockStatus(item.stock, item.threshold);
                    const expiryStatus = getExpiryStatus(item.expiryDate);
                    return (
                      <tr key={item.id} className="hover:bg-muted/30">
                        <td className="p-3"><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, item.id] : prev.filter(id => id !== item.id))} /></td>
                        <td className="p-3"><div className="font-semibold">{item.name}</div>{item.subcategory && <div className="text-[11px] text-muted-foreground">{item.subcategory}</div>}</td>
                        <td className="p-3 font-mono text-xs">{item.sku}</td>
                        <td className="p-3"><span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs">{item.category}</span></td>
                        <td className="p-3 text-right font-semibold">{item.stock} {item.unit}</td>
                        <td className="p-3 text-right text-muted-foreground">{item.threshold}</td>
                        <td className="p-3"><span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${stockStatus.className}`}>{stockStatus.label}</span></td>
                        <td className="p-3"><div className="flex flex-col gap-1"><span>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString("en-IN") : "—"}</span><span className={`w-fit px-2 py-0.5 rounded-full text-[10px] ${expiryStatus.className}`}>{expiryStatus.label}</span></div></td>
                        <td className="p-3 text-right font-semibold">{formatMoney(item.sellingPrice)}</td>
                        <td className="p-3"><div className="flex justify-end gap-1"><button title="Edit stock" onClick={() => { setEditing(item); setEditStock(String(item.stock)); setEditThreshold(String(item.threshold)); }} className="p-2 rounded-lg hover:bg-muted"><Edit2 className="w-4 h-4" /></button><button title="Refill" onClick={() => setRefillProduct(item)} className="p-2 rounded-lg hover:bg-muted text-emerald-600"><PlusCircle className="w-4 h-4" /></button></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>Showing {filteredInventory.length === 0 ? 0 : (safePage - 1) * itemsPerPage + 1} to {Math.min(safePage * itemsPerPage, filteredInventory.length)} of {filteredInventory.length} products</span>
              <div className="flex items-center gap-2">
                <select value={itemsPerPage} onChange={e => setItemsPerPage(Number(e.target.value))} className="h-8 rounded border bg-background px-2"><option value={10}>10 per page</option><option value={25}>25 per page</option><option value={50}>50 per page</option></select>
                <button onClick={() => setCurrentPage(1)} disabled={safePage <= 1} className="p-1.5 border rounded disabled:opacity-40"><ChevronsLeft className="w-4 h-4" /></button>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage <= 1} className="p-1.5 border rounded disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                <span>{safePage}/{totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="p-1.5 border rounded disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={safePage >= totalPages} className="p-1.5 border rounded disabled:opacity-40"><ChevronsRight className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "batches" && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="p-4 border-b"><h2 className="font-bold flex items-center gap-2"><Layers className="w-4 h-4" /> Product Batches</h2><p className="text-xs text-muted-foreground mt-1">Batch information stored on products.</p></div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="p-3 text-left">Product</th><th className="p-3 text-left">SKU</th><th className="p-3 text-left">Batch</th><th className="p-3 text-left">Manufacturing</th><th className="p-3 text-left">Expiry</th><th className="p-3 text-right">Quantity</th></tr></thead><tbody className="divide-y">{inventory.filter(p => p.batchNumber || p.expiryDate || p.manufacturingDate).map(p => <tr key={p.id}><td className="p-3 font-semibold">{p.name}</td><td className="p-3 font-mono text-xs">{p.sku}</td><td className="p-3">{p.batchNumber || "—"}</td><td className="p-3">{p.manufacturingDate ? new Date(p.manufacturingDate).toLocaleDateString("en-IN") : "—"}</td><td className="p-3">{p.expiryDate ? new Date(p.expiryDate).toLocaleDateString("en-IN") : "—"}</td><td className="p-3 text-right">{p.stock}</td></tr>)}</tbody></table></div>
          {inventory.every(p => !p.batchNumber && !p.expiryDate && !p.manufacturingDate) && <div className="p-10 text-center text-muted-foreground">No batch or expiry records found.</div>}
        </div>
      )}

      {activeTab === "history" && (
        <div className="rounded-xl border bg-card overflow-hidden"><div className="p-4 border-b"><h2 className="font-bold flex items-center gap-2"><History className="w-4 h-4" /> Inventory Audit History</h2></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Product</th><th className="p-3 text-left">Action</th><th className="p-3 text-right">Change</th><th className="p-3 text-right">New Stock</th></tr></thead><tbody className="divide-y">{history.map((row: any, index) => <tr key={row.id || index}><td className="p-3">{row.created_at ? new Date(row.created_at).toLocaleString("en-IN") : "—"}</td><td className="p-3 font-semibold">{row.productName}</td><td className="p-3">{row.action || row.reason || "Stock change"}</td><td className="p-3 text-right">{row.quantity_change ?? row.quantity ?? "—"}</td><td className="p-3 text-right">{row.new_stock ?? "—"}</td></tr>)}</tbody></table></div>{history.length === 0 && <div className="p-10 text-center text-muted-foreground">No inventory history found.</div>}</div>
      )}

      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="rounded-xl border bg-card p-5"><h2 className="font-bold flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Stock Overview</h2><div className="mt-5 space-y-4">{[["Healthy", inventory.filter(p => p.stock > p.threshold).length], ["Low Stock", metrics.low], ["Out of Stock", metrics.out], ["Dead Stock", metrics.dead]].map(([label, value]) => <div key={String(label)}><div className="flex justify-between text-sm"><span>{label}</span><strong>{value}</strong></div><div className="h-2 mt-1 rounded-full bg-muted overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${metrics.products ? (Number(value) / metrics.products) * 100 : 0}%` }} /></div></div>)}</div></div><div className="rounded-xl border bg-card p-5"><h2 className="font-bold flex items-center gap-2"><CalendarClock className="w-4 h-4" /> Expiry Overview</h2><div className="mt-5 grid grid-cols-3 gap-3 text-center"><div className="rounded-lg bg-red-50 p-4"><strong className="text-xl text-red-600">{metrics.expired}</strong><p className="text-xs">Expired</p></div><div className="rounded-lg bg-orange-50 p-4"><strong className="text-xl text-orange-600">{metrics.expiring7}</strong><p className="text-xs">7 Days</p></div><div className="rounded-lg bg-amber-50 p-4"><strong className="text-xl text-amber-600">{metrics.expiring30}</strong><p className="text-xs">30 Days</p></div></div></div></div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"><div className="w-full max-w-md rounded-2xl bg-card border shadow-xl p-5"><div className="flex justify-between items-center"><h2 className="font-bold">Update Stock</h2><button onClick={() => setEditing(null)}><X /></button></div><p className="text-sm text-muted-foreground mt-1">{editing.name}</p><div className="grid grid-cols-2 gap-3 mt-5"><label className="text-sm">Stock<input type="number" min="0" value={editStock} onChange={e => setEditStock(e.target.value)} className="mt-1 w-full h-10 rounded-lg border px-3 bg-background" /></label><label className="text-sm">Low-stock threshold<input type="number" min="0" value={editThreshold} onChange={e => setEditThreshold(e.target.value)} className="mt-1 w-full h-10 rounded-lg border px-3 bg-background" /></label></div><div className="flex justify-end gap-2 mt-5"><button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border">Cancel</button><button onClick={saveStock} className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-semibold flex items-center gap-2"><Check className="w-4 h-4" /> Save</button></div></div></div>
      )}

      {refillProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"><div className="w-full max-w-lg rounded-2xl bg-card border shadow-xl p-5"><div className="flex justify-between items-center"><h2 className="font-bold">Refill Inventory</h2><button onClick={() => setRefillProduct(null)}><X /></button></div><p className="text-sm text-muted-foreground mt-1">{refillProduct.name} · Current stock {refillProduct.stock}</p><div className="grid grid-cols-2 gap-3 mt-5"><label className="text-sm">Quantity<input type="number" min="1" value={refillQuantity} onChange={e => setRefillQuantity(e.target.value)} className="mt-1 w-full h-10 rounded-lg border px-3 bg-background" /></label><label className="text-sm">Purchase Cost<input type="number" min="0" value={refillCost} onChange={e => setRefillCost(e.target.value)} className="mt-1 w-full h-10 rounded-lg border px-3 bg-background" /></label><label className="text-sm">Batch Number<input value={refillBatch} onChange={e => setRefillBatch(e.target.value)} className="mt-1 w-full h-10 rounded-lg border px-3 bg-background" /></label><label className="text-sm">Manufacturing Date<input type="date" value={refillMfg} onChange={e => setRefillMfg(e.target.value)} className="mt-1 w-full h-10 rounded-lg border px-3 bg-background" /></label><label className="text-sm">Expiry Date<input type="date" value={refillExpiry} onChange={e => setRefillExpiry(e.target.value)} className="mt-1 w-full h-10 rounded-lg border px-3 bg-background" /></label></div><div className="flex justify-end gap-2 mt-5"><button onClick={() => setRefillProduct(null)} className="px-4 py-2 rounded-lg border">Cancel</button><button onClick={saveRefill} className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-semibold">Add Stock</button></div></div></div>
      )}
    </div>
  );
}

export default Inventory;
