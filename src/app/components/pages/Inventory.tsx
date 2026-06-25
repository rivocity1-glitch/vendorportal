import React, { useState, useEffect } from "react";
import { Search, AlertTriangle, Package, XCircle, Edit2, Check, X, Clock } from "lucide-react";
import { supabase } from "../../../lib/supabase";

function getStockStatus(stock: number, threshold: number) {
  if (stock === 0) return { label: "Out of Stock", bg: "bg-[#FEE2E2]", text: "text-[#991B1B]", bar: "bg-[#EF4444]", pct: 0 };
  if (stock <= threshold * 0.5) return { label: "Critical", bg: "bg-[#FEE2E2]", text: "text-[#991B1B]", bar: "bg-[#EF4444]", pct: (stock / threshold) * 100 };
  if (stock <= threshold) return { label: "Low Stock", bg: "bg-[#FEF3C7]", text: "text-[#92400E]", bar: "bg-[#F59E0B]", pct: (stock / threshold) * 100 };
  return { label: "In Stock", bg: "bg-[#D1FAE5]", text: "text-[#065F46]", bar: "bg-[#10B981]", pct: Math.min((stock / (threshold * 3)) * 100, 100) };
}

export function Inventory() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [stockHistory, setStockHistory] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStock, setEditStock] = useState("");
  const [editThreshold, setEditThreshold] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return;

      const user = authData.user;

      // 1. Fetch real-time products state directly from the database table
      const { data: productsData, error: prodError } = await supabase
        .from("products")
        .select("*")
        .eq("vendor_id", user.id)
        .order("name", { ascending: true });

      if (prodError) throw prodError;

      if (productsData) {
        const mappedInventory = productsData.map((p: any) => ({
          id: p.id,
          name: p.name || "Unnamed Product",
          category: p.category || "General",
          stock: Number(p.stock ?? 0),
          threshold: Number(p.threshold ?? 10), // Safeguard default threshold value
          unit: p.weight || "pcs",
          lastUpdated: p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "Recently"
        }));
        setInventory(mappedInventory);
      }

      // 2. Fetch history records dynamically from transaction entries (using historical order items as context map logs)
      const { data: historyData } = await supabase
        .from("order_items")
        .select(`
          id,
          quantity,
          created_at,
          products (
            name
          )
        `)
        .eq("vendor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (historyData) {
        const mappedHistory = historyData.map((item: any) => ({
          product: item.products?.name || "Product Item",
          change: `-${item.quantity || 1}`,
          reason: "Order Sale",
          time: item.created_at ? new Date(item.created_at).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "Today"
        }));
        setStockHistory(mappedHistory);
      }

    } catch (err) {
      console.error("Failed to compile active warehouse inventory tracking metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const filtered = inventory.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ? true :
      filter === "low" ? (p.stock > 0 && p.stock <= p.threshold) :
      p.stock === 0;
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
          threshold: Number(editThreshold)
        })
        .eq("id", id);

      if (error) throw error;

      setEditingId(null);
      await fetchInventoryData();
    } catch (err) {
      console.error("Failed to commit inventory modifications back to Supabase payload logs:", err);
    }
  };

  const total = inventory.length;
  const lowStock = inventory.filter(p => p.stock > 0 && p.stock <= p.threshold).length;
  const outOfStock = inventory.filter(p => p.stock === 0).length;

  if (loading) {
    return <div className="p-6 text-center text-xs text-muted-foreground animate-pulse">Syncing live item stock counters...</div>;
  }

  return (
    <div className="p-4 lg:p-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button onClick={() => setFilter("all")} className={`bg-card rounded-xl border p-4 text-left transition-all ${filter === "all" ? "border-[#10B981] ring-2 ring-[#10B981]/20" : "border-border hover:border-[#10B981]/40"}`}>
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-[#10B981]" />
            <span className="text-xs text-muted-foreground">Total Products</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{total}</p>
        </button>
        <button onClick={() => setFilter("low")} className={`bg-card rounded-xl border p-4 text-left transition-all ${filter === "low" ? "border-[#F59E0B] ring-2 ring-[#F59E0B]/20" : "border-border hover:border-[#F59E0B]/40"}`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
            <span className="text-xs text-muted-foreground">Low Stock</span>
          </div>
          <p className="text-2xl font-bold text-[#F59E0B]">{lowStock}</p>
        </button>
        <button onClick={() => setFilter("out")} className={`bg-card rounded-xl border p-4 text-left transition-all ${filter === "out" ? "border-[#EF4444] ring-2 ring-[#EF4444]/20" : "border-border hover:border-[#EF4444]/40"}`}>
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-[#EF4444]" />
            <span className="text-xs text-muted-foreground">Out of Stock</span>
          </div>
          <p className="text-2xl font-bold text-[#EF4444]">{outOfStock}</p>
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
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
          className="h-9 px-3 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
        >
          <Clock className="w-4 h-4" /> Stock History
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
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground min-w-[120px]">Level</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Updated</th>
                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Edit</th>
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
                          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${s.bar}`} style={{ width: `${s.pct}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.bg} ${s.text}`}>{s.label}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{item.lastUpdated}</td>
                        <td className="px-4 py-3">
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Stock History */}
        {showHistory && (
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" /> Stock History
            </h3>
            <div className="space-y-3">
              {stockHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No historical inventory alerts captured yet.</p>
              ) : (
                stockHistory.map((h, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${h.change.startsWith("+") ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#FEE2E2] text-[#991B1B]"}`}>
                      {h.change.startsWith("+") ? "▲" : "▼"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{h.product}</p>
                      <p className="text-xs text-muted-foreground">{h.reason}</p>
                      <p className="text-[10px] text-muted-foreground">{h.time}</p>
                    </div>
                    <span className={`text-xs font-bold shrink-0 ${h.change.startsWith("+") ? "text-[#10B981]" : "text-[#EF4444]"}`}>{h.change}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}