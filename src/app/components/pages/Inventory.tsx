import React, { useState, useEffect, useCallback } from "react";
import { Search, AlertTriangle, Package, XCircle, Edit2, Check, X, Clock, PlusCircle, Calendar, Rocket, BarChart3, Bot, Zap, FileSpreadsheet, ShieldAlert, ShoppingBag } from "lucide-react";
import { supabase } from "../../../lib/supabase";

function getStockStatus(stock: number, threshold: number) {
  if (stock === 0) return { label: "Out of Stock", bg: "bg-[#FEE2E2]", text: "text-[#991B1B]", bar: "bg-[#EF4444]", pct: 0 };
  if (stock <= threshold * 0.5) return { label: "Critical", bg: "bg-[#FEE2E2]", text: "text-[#991B1B]", bar: "bg-[#EF4444]", pct: (stock / threshold) * 100 };
  if (stock <= threshold) return { label: "Low Stock", bg: "bg-[#FEF3C7]", text: "text-[#92400E]", bar: "bg-[#F59E0B]", pct: (stock / threshold) * 100 };
  return { label: "In Stock", bg: "bg-[#D1FAE5]", text: "text-[#065F46]", bar: "bg-[#10B981]", pct: Math.min((stock / (threshold * 3)) * 100, 100) };
}

function getExpiryStatus(expiryDateStr: string | null) {
  if (!expiryDateStr) {
    return { label: "Healthy", daysLeft: Infinity, bg: "bg-[#D1FAE5]", text: "text-[#065F46]" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) {
    return { label: "Expired", daysLeft, bg: "bg-[#FEE2E2]", text: "text-[#991B1B]" };
  }
  if (daysLeft <= 7) {
    return { label: "Expiring Soon", daysLeft, bg: "bg-[#FFEDD5]", text: "text-[#C2410C]" };
  }
  if (daysLeft <= 30) {
    return { label: "Expiring This Month", daysLeft, bg: "bg-[#FEF3C7]", text: "text-[#92400E]" };
  }
  return { label: "Healthy", daysLeft, bg: "bg-[#D1FAE5]", text: "text-[#065F46]" };
}

export function Inventory() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStock, setEditStock] = useState("");
  const [editThreshold, setEditThreshold] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out" | "expired" | "7days" | "30days" | "healthy">("all");
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  // --- REFILL MODAL STATES ---
  const [refillProduct, setRefillProduct] = useState<any | null>(null);
  const [inventoryType, setInventoryType] = useState<"existing" | "new">("existing");
  const [quantityReceived, setQuantityReceived] = useState<string>("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const fetchInventoryData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return;

      const user = authData.user;

      const { data: vendor, error: vendorErr } = await supabase
        .from("vendors")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (vendorErr || !vendor) {
        setLoading(false);
        return;
      }

      const { data: productsData, error: prodError } = await supabase
        .from("products")
        .select("*")
        .eq("vendor_id", vendor.id)
        .order("name", { ascending: true });

      if (prodError) throw prodError;

      if (productsData) {
        const mappedInventory = productsData.map((p: any) => {
          const expiryInfo = getExpiryStatus(p.expiry_date);
          return {
            id: p.id,
            name: p.name || "Unnamed Product",
            category: p.category || "General",
            stock: Number(p.stock ?? 0),
            threshold: Number(p.low_stock_threshold ?? 10),
            unit: p.weight || "pcs",
            lastUpdated: p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "Recently",
            expiryDate: p.expiry_date ? new Date(p.expiry_date).toLocaleDateString() : "N/A",
            daysLeft: expiryInfo.daysLeft,
            expiryStatus: expiryInfo
          };
        });
        setInventory(mappedInventory);
      }
    } catch (err) {
      console.error("Failed to compile active warehouse inventory tracking metrics:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);

  const expiringWithin30DaysCount = inventory.filter(p => p.daysLeft > 0 && p.daysLeft <= 30).length;

  const filtered = inventory.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    
    let matchFilter = true;
    if (filter === "low") matchFilter = p.stock > 0 && p.stock <= p.threshold;
    else if (filter === "out") matchFilter = p.stock === 0;
    else if (filter === "expired") matchFilter = p.daysLeft <= 0;
    else if (filter === "7days") matchFilter = p.daysLeft > 0 && p.daysLeft <= 7;
    else if (filter === "30days") matchFilter = p.daysLeft > 0 && p.daysLeft <= 30;
    else if (filter === "healthy") matchFilter = p.daysLeft > 30;

    return matchSearch && matchFilter;
  });

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditStock(String(item.stock));
    setEditThreshold(String(item.threshold));
  };

  const saveEdit = async (id: number) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({
          stock: Number(editStock),
          low_stock_threshold: Number(editThreshold)
        })
        .eq("id", id);

      if (error) throw error;

      setEditingId(null);
      await fetchInventoryData();
    } catch (err) {
      console.error("Failed to commit inventory modifications back to Supabase:", err);
    }
  };

  const handleRefillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refillProduct) return;

    const parsedQty = Number(quantityReceived || 0);
    const newStock = refillProduct.stock + parsedQty;

    try {
      const { error: prodUpdateErr } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", refillProduct.id);

      if (prodUpdateErr) throw prodUpdateErr;

      if (inventoryType === "new") {
        const { error: batchInsertErr } = await supabase
          .from("product_batches")
          .insert({
            product_id: refillProduct.id,
            batch_number: batchNumber,
            expiry_date: expiryDate || null,
            quantity: parsedQty
          });

        if (batchInsertErr) {
          console.warn("Batch ledger notation error ignored during state integration:", batchInsertErr.message);
        }
      }

      setRefillProduct(null);
      setQuantityReceived("");
      setBatchNumber("");
      setExpiryDate("");
      setInventoryType("existing");
      
      await fetchInventoryData();
    } catch (err) {
      console.error("Failed to commit refill ingestion update payload:", err);
    }
  };

  const total = inventory.length;
  const expiredCount = inventory.filter(p => p.daysLeft <= 0).length;
  const expiring7Count = inventory.filter(p => p.daysLeft > 0 && p.daysLeft <= 7).length;
  const expiring30Count = inventory.filter(p => p.daysLeft > 7 && p.daysLeft <= 30).length;
  const healthyCount = inventory.filter(p => p.daysLeft > 30).length;

  if (loading && inventory.length === 0) {
    return <div className="p-6 text-center text-xs text-muted-foreground animate-pulse">Syncing live item stock counters...</div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      
      {/* ⚠ EXPIRY BANNER AT THE TOP */}
      {expiringWithin30DaysCount > 0 && (
        <button 
          onClick={() => setFilter("30days")}
          className="w-full text-left bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 shadow-sm hover:bg-amber-100/70 transition-colors"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm font-semibold text-amber-900">
            ⚠ {expiringWithin30DaysCount} {expiringWithin30DaysCount === 1 ? 'product is' : 'products are'} expiring within 30 days. <span className="underline font-normal text-amber-700 ml-1">Click to review.</span>
          </p>
        </button>
      )}

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={() => setFilter("expired")} className={`bg-card rounded-xl border p-4 text-left transition-all ${filter === "expired" ? "border-[#EF4444] ring-2 ring-[#EF4444]/20" : "border-border hover:border-[#EF4444]/40"}`}>
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-[#EF4444]" />
            <span className="text-xs text-muted-foreground">Expired Products</span>
          </div>
          <p className="text-2xl font-bold text-[#EF4444]">{expiredCount}</p>
        </button>

        <button onClick={() => setFilter("7days")} className={`bg-card rounded-xl border p-4 text-left transition-all ${filter === "7days" ? "border-[#F97316] ring-2 ring-[#F97316]/20" : "border-border hover:border-[#F97316]/40"}`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-[#F97316]" />
            <span className="text-xs text-muted-foreground">Expiring In 7 Days</span>
          </div>
          <p className="text-2xl font-bold text-[#F97316]">{expiring7Count}</p>
        </button>

        <button onClick={() => setFilter("30days")} className={`bg-card rounded-xl border p-4 text-left transition-all ${filter === "30days" ? "border-[#F59E0B] ring-2 ring-[#F59E0B]/20" : "border-border hover:border-[#F59E0B]/40"}`}>
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-[#F59E0B]" />
            <span className="text-xs text-muted-foreground">Expiring In 30 Days</span>
          </div>
          <p className="text-2xl font-bold text-[#F59E0B]">{expiring30Count + expiring7Count}</p>
        </button>

        <button onClick={() => setFilter("healthy")} className={`bg-card rounded-xl border p-4 text-left transition-all ${filter === "healthy" ? "border-[#10B981] ring-2 ring-[#10B981]/20" : "border-border hover:border-[#10B981]/40"}`}>
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-[#10B981]" />
            <span className="text-xs text-muted-foreground">Healthy Products</span>
          </div>
          <p className="text-2xl font-bold text-[#10B981]">{healthyCount}</p>
        </button>
      </div>

      {/* Quick Filter Pill Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium mr-1">Quick Filters:</span>
        <button onClick={() => setFilter("all")} className={`px-3 py-1 text-xs font-medium rounded-full border ${filter === "all" ? "bg-foreground text-background" : "bg-card hover:bg-muted"}`}>All</button>
        <button onClick={() => setFilter("low")} className={`px-3 py-1 text-xs font-medium rounded-full border ${filter === "low" ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-card hover:bg-muted"}`}>Low Stock</button>
        <button onClick={() => setFilter("out")} className={`px-3 py-1 text-xs font-medium rounded-full border ${filter === "out" ? "bg-red-100 text-red-800 border-red-300" : "bg-card hover:bg-muted"}`}>Out of Stock</button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-card text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
          />
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`h-9 px-3 rounded-lg border text-sm flex items-center gap-2 transition-colors ${showHistory ? "bg-[#ECFDF5] border-[#10B981] text-[#10B981]" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
        >
          <Clock className="w-4 h-4" /> Advanced Modules
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Table */}
        <div className={showHistory ? "lg:col-span-2" : "lg:col-span-3"}>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Current Stock</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Threshold</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground min-w-[100px]">Stock Level</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Expiry Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Days Left</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Expiry Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(item => {
                    const s = getStockStatus(item.stock, item.threshold);
                    const isEditing = editingId === item.id;
                    return (
                      <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.category} · {item.unit}</p>
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editStock}
                              onChange={e => setEditStock(e.target.value)}
                              className="w-16 h-7 px-2 rounded-md border border-[#10B981] bg-background text-sm text-foreground focus:outline-none"
                            />
                          ) : (
                            <span className={`text-sm font-bold ${item.stock === 0 ? "text-[#EF4444]" : item.stock <= item.threshold ? "text-[#F59E0B]" : "text-foreground"}`}>
                              {item.stock}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editThreshold}
                              onChange={e => setEditThreshold(e.target.value)}
                              className="w-16 h-7 px-2 rounded-md border border-[#10B981] bg-background text-sm text-foreground focus:outline-none"
                            />
                          ) : (
                            <span className="text-sm text-muted-foreground">{item.threshold}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${s.bar}`} style={{ width: `${s.pct}%` }} />
                          </div>
                        </td>
                        
                        <td className="px-4 py-3 text-sm text-foreground">{item.expiryDate}</td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {item.daysLeft === Infinity ? "—" : item.daysLeft}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.expiryStatus.bg} ${item.expiryStatus.text}`}>
                            {item.expiryStatus.label}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-3">
                            <button 
                              onClick={() => setRefillProduct(item)}
                              className="h-7 px-2.5 rounded text-xs font-semibold bg-[#ECFDF5] text-[#10B981] hover:bg-[#10B981] hover:text-white flex items-center gap-1 transition-colors"
                            >
                              <PlusCircle className="w-3.5 h-3.5" /> Refill
                            </button>

                            <span className="text-border">|</span>

                            {isEditing ? (
                              <div className="flex gap-1">
                                <button onClick={() => saveEdit(item.id)} className="w-6 h-6 rounded flex items-center justify-center bg-[#D1FAE5] text-[#065F46] hover:bg-[#10B981] hover:text-white transition-colors">
                                  <Check className="w-3 h-3" />
                                </button>
                                <button onClick={() => setEditingId(null)} className="w-6 h-6 rounded flex items-center justify-center bg-muted text-muted-foreground hover:bg-[#FEE2E2] hover:text-[#991B1B] transition-colors">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => startEdit(item)} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-[#10B981] hover:bg-[#ECFDF5] transition-colors">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 🚀 UPCOMING FEATURES PANEL (REPLACING STOCK HISTORY CARD) */}
        {showHistory && (
          <div className="bg-card bg-gradient-to-br from-background via-muted/20 to-[#ECFDF5]/20 rounded-xl border border-border p-5 flex flex-col justify-between shadow-sm min-h-[480px]">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-[#10B981]" />
                  <h3 className="font-bold text-foreground text-sm tracking-tight">🚀 Coming Soon</h3>
                </div>
                <span className="bg-[#ECFDF5] text-[#10B981] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#10B981]/20 shadow-sm animate-pulse">
                  In Development
                </span>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed mb-5 font-medium">
                We're working on powerful inventory tools to help you manage your store better.
              </p>

              {/* Feature Grid List */}
              <div className="space-y-3.5">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80">Upcoming Features:</p>
                
                <div className="flex items-center gap-2.5 text-xs text-foreground/90 font-medium">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>Inventory Stock History</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-foreground/90 font-medium">
                  <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>Batch Tracking</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-foreground/90 font-medium">
                  <Bot className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>Smart Auto Refill Suggestions</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-foreground/90 font-medium">
                  <ShieldAlert className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>Dead Stock Analysis</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-foreground/90 font-medium">
                  <BarChart3 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>Inventory Forecasting</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-foreground/90 font-medium">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>Expiry Trend Reports</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-foreground/90 font-medium">
                  <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>Supplier Purchase Tracking</span>
                </div>
              </div>
            </div>

            {/* Footer Text */}
            <div className="pt-4 border-t border-border/60 mt-6">
              <p className="text-[11px] text-center text-muted-foreground/90 font-medium italic">
                "Stay with Rivo. More inventory tools are on the way."
              </p>
            </div>
          </div>
        )}
      </div>

      {/* --- REFILL INVENTORY SYSTEM MODAL --- */}
      {refillProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background border border-border w-full max-w-md rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20">
              <div>
                <h3 className="font-bold text-sm text-foreground">Refill Stock</h3>
                <p className="text-xs text-muted-foreground truncate max-w-[300px] font-medium">{refillProduct.name}</p>
              </div>
              <button 
                onClick={() => setRefillProduct(null)} 
                className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRefillSubmit} className="p-5 space-y-4 text-xs">
              
              <div className="grid grid-cols-3 gap-2 bg-muted/30 border border-border/60 p-3 rounded-lg text-center font-medium">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Current Stock</p>
                  <p className="text-base font-bold text-foreground mt-0.5">{refillProduct.stock}</p>
                </div>
                <div className="border-x border-border/80">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Received</p>
                  <p className="text-base font-bold text-[#10B981] mt-0.5">
                    +{Number(quantityReceived || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">After Refill</p>
                  <p className="text-base font-bold text-foreground mt-0.5">
                    {refillProduct.stock + Number(quantityReceived || 0)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-muted-foreground font-semibold">Inventory Type</label>
                <div className="flex flex-col sm:flex-row gap-3 p-2 border rounded-lg bg-card/50">
                  <label className="flex items-center gap-2 cursor-pointer flex-1 py-1">
                    <input
                      type="radio"
                      name="inventoryType"
                      checked={inventoryType === "existing"}
                      onChange={() => setInventoryType("existing")}
                      className="accent-[#10B981] w-3.5 h-3.5"
                    />
                    <span className={`font-medium ${inventoryType === "existing" ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                      Update Existing Batch
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer flex-1 py-1">
                    <input
                      type="radio"
                      name="inventoryType"
                      checked={inventoryType === "new"}
                      onChange={() => setInventoryType("new")}
                      className="accent-[#10B981] w-3.5 h-3.5"
                    />
                    <span className={`font-medium ${inventoryType === "new" ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                      New Batch
                    </span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-muted-foreground">Quantity Received</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={quantityReceived}
                  onChange={e => setQuantityReceived(e.target.value)}
                  placeholder="Enter dynamic intake units"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:border-[#10B981] text-xs"
                />
              </div>

              {inventoryType === "new" && (
                <div className="space-y-3 p-3.5 border border-dashed rounded-lg bg-muted/10 animate-in fade-in slide-in-from-top-1.5 duration-150">
                  <div className="space-y-1">
                    <label className="block font-semibold text-muted-foreground">Batch Number</label>
                    <input
                      type="text"
                      required={inventoryType === "new"}
                      value={batchNumber}
                      onChange={e => setBatchNumber(e.target.value)}
                      placeholder="e.g. LOT-2026-X89"
                      className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs focus:outline-none focus:border-[#10B981]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-semibold text-muted-foreground">Expiry Date</label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={e => setExpiryDate(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs focus:outline-none focus:border-[#10B981]"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setRefillProduct(null)}
                  className="h-8.5 px-4 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8.5 px-4 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white font-semibold transition-colors"
                >
                  Commit Refill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}