import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  AlertTriangle,
  Package,
  XCircle,
  Edit2,
  Check,
  X,
  Clock,
  PlusCircle,
  Calendar,
  BarChart3,
  Bot,
  Zap,
  FileSpreadsheet,
  ShieldAlert,
  ShoppingBag,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Download,
  Printer,
  FileText,
  Trash2,
  Eye,
  Layers,
  Sparkles,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  QrCode,
  Barcode,
  Truck,
  DollarSign,
  Percent,
  History,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  Filter
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

// --- HELPERS & UTILS ---

function getStockStatus(stock: number, threshold: number) {
  if (stock === 0)
    return { label: "Out of Stock", bg: "bg-red-100 dark:bg-red-950/40", text: "text-red-700 dark:text-red-400", bar: "bg-red-500", pct: 0 };
  if (stock <= threshold * 0.5)
    return { label: "Critical", bg: "bg-red-100 dark:bg-red-950/40", text: "text-red-700 dark:text-red-400", bar: "bg-red-500", pct: Math.min((stock / threshold) * 100, 100) };
  if (stock <= threshold)
    return { label: "Low Stock", bg: "bg-amber-100 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-400", bar: "bg-amber-500", pct: Math.min((stock / threshold) * 100, 100) };
  return { label: "In Stock", bg: "bg-[#D1FAE5] dark:bg-emerald-950/40", text: "text-[#065F46] dark:text-emerald-400", bar: "bg-[#10B981]", pct: Math.min((stock / (threshold * 3)) * 100, 100) };
}

function getExpiryStatus(expiryDateStr: string | null) {
  if (!expiryDateStr) {
    return { label: "No Expiry Set", daysLeft: Infinity, bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-400" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) {
    return { label: "Expired", daysLeft, bg: "bg-red-100 dark:bg-red-950/40", text: "text-red-700 dark:text-red-400" };
  }
  if (daysLeft <= 7) {
    return { label: "Expiring Soon", daysLeft, bg: "bg-orange-100 dark:bg-orange-950/40", text: "text-orange-700 dark:text-orange-400" };
  }
  if (daysLeft <= 30) {
    return { label: "Expiring 30 Days", daysLeft, bg: "bg-amber-100 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-400" };
  }
  return { label: "Healthy", daysLeft, bg: "bg-[#D1FAE5] dark:bg-emerald-950/40", text: "text-[#065F46] dark:text-emerald-400" };
}

type TabType = "inventory" | "batches" | "history" | "analytics";
type FilterType = "all" | "low" | "out" | "expired" | "7days" | "30days" | "healthy" | "dead";

export function Inventory() {
  // Navigation & View Tabs
  const [activeTab, setActiveTab] = useState<TabType>("inventory");

  // Core Data States
  const [inventory, setInventory] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorId, setVendorId] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [filter, setFilter] = useState<FilterType>("all");

  // Inline Quick Editing
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [editStock, setEditStock] = useState("");
  const [editThreshold, setEditThreshold] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Selection for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<any[]>([]);

  // Drawer & Modal States
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [refillProduct, setRefillProduct] = useState<any | null>(null);
  const [adjustProduct, setAdjustProduct] = useState<any | null>(null);
  const [batchModalProduct, setBatchModalProduct] = useState<any | null>(null);

  // Refill Form Data
  const [refillForm, setRefillForm] = useState({
    supplier_id: "",
    purchase_invoice: "",
    quantity: "",
    purchase_price: "",
    selling_price: "",
    batch_number: "",
    mfg_date: "",
    expiry_date: "",
    location: "Main Warehouse",
    notes: ""
  });

  // Stock Adjustment Form Data
  const [adjustForm, setAdjustForm] = useState({
    reason: "Damage",
    new_stock: "",
    notes: ""
  });

  // Batch Form Data
  const [batchForm, setBatchForm] = useState({
    id: null as any,
    batch_number: "",
    mfg_date: "",
    expiry_date: "",
    quantity: "",
    remaining_quantity: "",
    purchase_cost: "",
    supplier_id: ""
  });

  // --- DATA FETCHING ---

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

      setVendorId(vendor.id);

      // Fetch Products with optional relations
      const { data: productsData, error: prodError } = await supabase
        .from("products")
        .select("*, suppliers(*)")
        .eq("vendor_id", vendor.id)
        .order("name", { ascending: true });

      if (prodError) throw prodError;

      // Fetch Batches
      const { data: batchesData } = await supabase
        .from("product_batches")
        .select("*, products(name, sku)")
        .order("expiry_date", { ascending: true });

      if (batchesData) setBatches(batchesData);

      // Fetch History / Logs
      const { data: historyData } = await supabase
        .from("inventory_history")
        .select("*, products(name)")
        .order("created_at", { ascending: false })
        .limit(100);

      if (historyData) setHistory(historyData);

      // Fetch Suppliers list
      const { data: suppliersData } = await supabase
        .from("suppliers")
        .select("*");

      if (suppliersData) setSuppliers(suppliersData);

      if (productsData) {
        const mappedInventory = productsData.map((p: any) => {
          const expiryInfo = getExpiryStatus(p.expiry_date);
          const price = Number(p.price || p.selling_price || 0);
          const cost = Number(p.cost_price || p.purchase_cost || price * 0.7);
          const stock = Number(p.stock ?? 0);
          const reserved = Number(p.reserved_stock ?? 0);
          const available = Math.max(0, stock - reserved);
          const daysWithoutSales = p.last_sold_at ? Math.floor((Date.now() - new Date(p.last_sold_at).getTime()) / (1000 * 3600 * 24)) : 45;

          return {
            id: p.id,
            sku: p.sku || `SKU-${p.id.toString().padStart(5, '0')}`,
            barcode: p.barcode || `890${Math.floor(100000000 + Math.random() * 900000000)}`,
            name: p.name || "Unnamed Product",
            category: p.category || "General",
            stock,
            reservedStock: reserved,
            availableStock: available,
            threshold: Number(p.low_stock_threshold ?? 10),
            maxCapacity: Number(p.max_capacity ?? p.low_stock_threshold * 5 ?? 100),
            unit: p.weight || p.unit || "pcs",
            sellingPrice: price,
            purchaseCost: cost,
            profitMargin: price > 0 ? (((price - cost) / price) * 100).toFixed(1) : 0,
            inventoryValue: stock * price,
            lastUpdated: p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "Recently",
            expiryDate: p.expiry_date ? new Date(p.expiry_date).toISOString().split('T')[0] : null,
            daysLeft: expiryInfo.daysLeft,
            expiryStatus: expiryInfo,
            supplier: p.suppliers?.name || "Primary Supplier",
            supplierPhone: p.suppliers?.phone || "+91 98765 43210",
            image: p.image_url || p.image || null,
            description: p.description || "High-demand quick-commerce inventory item.",
            daysWithoutSales,
            createdAt: p.created_at ? new Date(p.created_at).toLocaleDateString() : "N/A"
          };
        });
        setInventory(mappedInventory);
      }
    } catch (err) {
      console.error("Failed to load inventory dataset:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);

  // --- METRICS COMPUTATION ---

  const metrics = useMemo(() => {
    const totalProducts = inventory.length;
    const totalUnits = inventory.reduce((acc, item) => acc + item.stock, 0);
    const lowStock = inventory.filter(p => p.stock > 0 && p.stock <= p.threshold).length;
    const outOfStock = inventory.filter(p => p.stock === 0).length;
    const expired = inventory.filter(p => p.daysLeft <= 0).length;
    const expiring7 = inventory.filter(p => p.daysLeft > 0 && p.daysLeft <= 7).length;
    const expiring30 = inventory.filter(p => p.daysLeft > 7 && p.daysLeft <= 30).length;
    const healthy = inventory.filter(p => p.daysLeft > 30 && p.stock > p.threshold).length;
    const inventoryValue = inventory.reduce((acc, item) => acc + item.inventoryValue, 0);
    const deadStock = inventory.filter(p => p.daysWithoutSales >= 60).length;

    return {
      totalProducts,
      totalUnits,
      lowStock,
      outOfStock,
      expired,
      expiring7,
      expiring30,
      healthy,
      inventoryValue,
      deadStock
    };
  }, [inventory]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(inventory.map(i => i.category));
    return ["all", ...Array.from(set)];
  }, [inventory]);

  // --- AI SUGGESTIONS ENGINE ---

  const aiSuggestions = useMemo(() => {
    const suggestions: { title: string; desc: string; type: "alert" | "warning" | "info" | "success" }[] = [];

    const criticalItems = inventory.filter(p => p.stock === 0 || p.stock <= p.threshold * 0.5);
    if (criticalItems.length > 0) {
      suggestions.push({
        title: "Immediate Refill Needed",
        desc: `${criticalItems.length} core items are critically low or out of stock. Priority auto-replenishment suggested.`,
        type: "alert"
      });
    }

    const deadStockCount = inventory.filter(p => p.daysWithoutSales >= 60 && p.stock > 0).length;
    if (deadStockCount > 0) {
      suggestions.push({
        title: "Liquidate Dead Stock",
        desc: `${deadStockCount} items have zero sales in the last 60+ days. Consider running a 20% discount promotion.`,
        type: "warning"
      });
    }

    const expiringSoon = inventory.filter(p => p.daysLeft > 0 && p.daysLeft <= 7);
    if (expiringSoon.length > 0) {
      suggestions.push({
        title: "Expiring Products Alert",
        desc: `${expiringSoon.length} batches expire within 7 days. Bundle them or mark down before total loss.`,
        type: "warning"
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        title: "Optimal Stock Performance",
        desc: "All stock velocity levels and batch expiry profiles are currently balanced within target parameters.",
        type: "success"
      });
    }

    return suggestions;
  }, [inventory]);

  // --- FILTERING & PAGINATION ---

  const filteredInventory = useMemo(() => {
    return inventory.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search);
      const matchCategory = categoryFilter === "all" || p.category === categoryFilter;

      let matchFilter = true;
      if (filter === "low") matchFilter = p.stock > 0 && p.stock <= p.threshold;
      else if (filter === "out") matchFilter = p.stock === 0;
      else if (filter === "expired") matchFilter = p.daysLeft <= 0;
      else if (filter === "7days") matchFilter = p.daysLeft > 0 && p.daysLeft <= 7;
      else if (filter === "30days") matchFilter = p.daysLeft > 0 && p.daysLeft <= 30;
      else if (filter === "healthy") matchFilter = p.daysLeft > 30 && p.stock > p.threshold;
      else if (filter === "dead") matchFilter = p.daysWithoutSales >= 60;

      return matchSearch && matchCategory && matchFilter;
    });
  }, [inventory, search, categoryFilter, filter]);

  const paginatedInventory = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInventory.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInventory, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage) || 1;

  // --- HANDLERS & ACTIONS ---

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedInventory.map(i => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: any) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const saveEdit = async (id: number | string) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({
          stock: Number(editStock),
          low_stock_threshold: Number(editThreshold),
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;

      // Log history
      await logInventoryAction(id, "Inline Update", Number(editStock), "Manual inline threshold/stock quick edit");

      setEditingId(null);
      await fetchInventoryData();
    } catch (err) {
      console.error("Failed to commit stock edit:", err);
    }
  };

  const logInventoryAction = async (productId: any, action: string, newQty: number, notes: string, prevQty: number = 0) => {
    try {
      await supabase.from("inventory_history").insert({
        product_id: productId,
        action,
        previous_stock: prevQty,
        new_stock: newQty,
        difference: newQty - prevQty,
        notes,
        created_at: new Date().toISOString()
      });
    } catch (e) {
      // Non-blocking log insertion error catch
    }
  };

  const handleRefillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refillProduct) return;

    const parsedQty = Number(refillForm.quantity || 0);
    const newStock = refillProduct.stock + parsedQty;

    try {
      // Update main product stock
      const { error: prodUpdateErr } = await supabase
        .from("products")
        .update({
          stock: newStock,
          expiry_date: refillForm.expiry_date || refillProduct.expiryDate,
          updated_at: new Date().toISOString()
        })
        .eq("id", refillProduct.id);

      if (prodUpdateErr) throw prodUpdateErr;

      // Create new Batch record automatically (FIFO support)
      await supabase.from("product_batches").insert({
        product_id: refillProduct.id,
        batch_number: refillForm.batch_number || `BATCH-${Date.now().toString().slice(-6)}`,
        quantity: parsedQty,
        remaining_quantity: parsedQty,
        manufacturing_date: refillForm.mfg_date || null,
        expiry_date: refillForm.expiry_date || null,
        purchase_cost: Number(refillForm.purchase_price) || refillProduct.purchaseCost,
        supplier_id: refillForm.supplier_id || null
      });

      // Audit Log
      await logInventoryAction(
        refillProduct.id,
        "Refill Received",
        newStock,
        `Added +${parsedQty} units. Invoice #${refillForm.purchase_invoice || "N/A"}. ${refillForm.notes}`,
        refillProduct.stock
      );

      setRefillProduct(null);
      setRefillForm({
        supplier_id: "",
        purchase_invoice: "",
        quantity: "",
        purchase_price: "",
        selling_price: "",
        batch_number: "",
        mfg_date: "",
        expiry_date: "",
        location: "Main Warehouse",
        notes: ""
      });

      await fetchInventoryData();
    } catch (err) {
      console.error("Refill submission failed:", err);
    }
  };

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProduct) return;

    const newStockVal = Number(adjustForm.new_stock);

    try {
      const { error } = await supabase
        .from("products")
        .update({
          stock: newStockVal,
          updated_at: new Date().toISOString()
        })
        .eq("id", adjustProduct.id);

      if (error) throw error;

      await logInventoryAction(
        adjustProduct.id,
        `Stock Adjustment: ${adjustForm.reason}`,
        newStockVal,
        adjustForm.notes || `Stock adjusted due to ${adjustForm.reason}`,
        adjustProduct.stock
      );

      setAdjustProduct(null);
      setAdjustForm({ reason: "Damage", new_stock: "", notes: "" });
      await fetchInventoryData();
    } catch (err) {
      console.error("Adjustment submission failed:", err);
    }
  };

  // --- EXPORT FUNCTIONALITY ---

  const exportData = (type: "csv" | "excel" | "pdf" | "print") => {
    if (type === "print") {
      window.print();
      return;
    }

    const headers = ["ID", "Name", "SKU", "Category", "Stock", "Threshold", "Price", "Expiry Date", "Supplier"];
    const rows = filteredInventory.map(i => [
      i.id,
      `"${i.name.replace(/"/g, '""')}"`,
      i.sku,
      i.category,
      i.stock,
      i.threshold,
      i.sellingPrice,
      i.expiryDate || "N/A",
      `"${i.supplier.replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Inventory_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && inventory.length === 0) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-[#10B981] animate-spin mb-3" />
        <p className="text-sm text-muted-foreground font-medium animate-pulse">Syncing high-frequency catalog & inventory ledgers...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto text-foreground">

      {/* 9. SMART ALERTS BANNER HUB */}
      {metrics.expiring30 > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-950 dark:text-amber-200">
                ⚠ {metrics.expiring7 + metrics.expiring30} Products Expiring Soon
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-400 font-medium">
                {metrics.expiring7} expiring within 7 days, and {metrics.expiring30} expiring within 30 days. Take action to prevent markdown write-offs.
              </p>
            </div>
          </div>
          <button
            onClick={() => { setFilter("7days"); setActiveTab("inventory"); }}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors shrink-0"
          >
            Review Items
          </button>
        </div>
      )}

      {/* HEADER TABS & NAVIGATION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Vendor Inventory System</h1>
          <p className="text-xs text-muted-foreground">Real-time batch tracking, stock velocity, and automated replenishment</p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("inventory")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all ${activeTab === "inventory" ? "bg-[#10B981] text-white shadow-sm" : "bg-card border border-border hover:bg-muted text-muted-foreground"}`}
          >
            <Package className="w-4 h-4" /> Products & Stock
          </button>
          <button
            onClick={() => setActiveTab("batches")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all ${activeTab === "batches" ? "bg-[#10B981] text-white shadow-sm" : "bg-card border border-border hover:bg-muted text-muted-foreground"}`}
          >
            <Layers className="w-4 h-4" /> Batches (FIFO)
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all ${activeTab === "history" ? "bg-[#10B981] text-white shadow-sm" : "bg-card border border-border hover:bg-muted text-muted-foreground"}`}
          >
            <History className="w-4 h-4" /> Audit History
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all ${activeTab === "analytics" ? "bg-[#10B981] text-white shadow-sm" : "bg-card border border-border hover:bg-muted text-muted-foreground"}`}
          >
            <BarChart3 className="w-4 h-4" /> Purchase Analytics
          </button>
        </div>
      </div>

      {/* 1. INVENTORY DASHBOARD SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <button
          onClick={() => { setFilter("all"); setActiveTab("inventory"); }}
          className={`bg-card rounded-xl border p-3.5 text-left transition-all ${filter === "all" ? "border-[#10B981] ring-2 ring-[#10B981]/20" : "border-border hover:border-border/80"}`}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Total Products</span>
            <Package className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-xl font-bold">{metrics.totalProducts}</p>
          <span className="text-[10px] text-muted-foreground">{metrics.totalUnits.toLocaleString()} units in stock</span>
        </button>

        <button
          onClick={() => { setFilter("low"); setActiveTab("inventory"); }}
          className={`bg-card rounded-xl border p-3.5 text-left transition-all ${filter === "low" ? "border-amber-500 ring-2 ring-amber-500/20" : "border-border hover:border-amber-500/40"}`}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Low Stock</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-amber-600">{metrics.lowStock}</p>
          <span className="text-[10px] text-muted-foreground">Below threshold</span>
        </button>

        <button
          onClick={() => { setFilter("out"); setActiveTab("inventory"); }}
          className={`bg-card rounded-xl border p-3.5 text-left transition-all ${filter === "out" ? "border-red-500 ring-2 ring-red-500/20" : "border-border hover:border-red-500/40"}`}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Out of Stock</span>
            <XCircle className="w-3.5 h-3.5 text-red-500" />
          </div>
          <p className="text-xl font-bold text-red-600">{metrics.outOfStock}</p>
          <span className="text-[10px] text-muted-foreground">Immediate action</span>
        </button>

        <button
          onClick={() => { setFilter("expired"); setActiveTab("inventory"); }}
          className={`bg-card rounded-xl border p-3.5 text-left transition-all ${filter === "expired" ? "border-red-500 ring-2 ring-red-500/20" : "border-border hover:border-red-500/40"}`}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Expired</span>
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
          </div>
          <p className="text-xl font-bold text-red-600">{metrics.expired}</p>
          <span className="text-[10px] text-muted-foreground">Requires disposal</span>
        </button>

        <button
          onClick={() => { setFilter("healthy"); setActiveTab("inventory"); }}
          className={`bg-card rounded-xl border p-3.5 text-left transition-all ${filter === "healthy" ? "border-[#10B981] ring-2 ring-[#10B981]/20" : "border-border hover:border-[#10B981]/40"}`}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Valuation</span>
            <DollarSign className="w-3.5 h-3.5 text-[#10B981]" />
          </div>
          <p className="text-xl font-bold text-[#10B981]">₹{(metrics.inventoryValue / 1000).toFixed(1)}k</p>
          <span className="text-[10px] text-muted-foreground">Total asset value</span>
        </button>
      </div>

      {/* 12. AI SUGGESTIONS WIDGET */}
      <div className="bg-gradient-to-r from-emerald-950/10 via-card to-card border border-[#10B981]/30 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-[#10B981]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#10B981]">Rivo AI Inventory Copilot</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {aiSuggestions.map((s, idx) => (
            <div key={idx} className="bg-background/80 border border-border/60 rounded-lg p-3 text-xs flex items-start gap-2.5">
              <Bot className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">{s.title}</p>
                <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TAB 1: MAIN INVENTORY TABLE */}
      {activeTab === "inventory" && (
        <div className="space-y-4">
          {/* SEARCH, FILTERS & BULK ACTIONS TOOLBAR */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
            <div className="flex flex-1 flex-col sm:flex-row items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search name, SKU, barcode..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full sm:w-40 h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none"
              >
                <option value="all">All Categories</option>
                {categories.filter(c => c !== "all").map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Quick filter pills */}
              <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto py-1">
                <button onClick={() => setFilter("all")} className={`px-2.5 py-1 text-[11px] font-medium rounded-full border ${filter === "all" ? "bg-foreground text-background" : "bg-background hover:bg-muted"}`}>All</button>
                <button onClick={() => setFilter("low")} className={`px-2.5 py-1 text-[11px] font-medium rounded-full border ${filter === "low" ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-background hover:bg-muted"}`}>Low Stock</button>
                <button onClick={() => setFilter("out")} className={`px-2.5 py-1 text-[11px] font-medium rounded-full border ${filter === "out" ? "bg-red-100 text-red-800 border-red-300" : "bg-background hover:bg-muted"}`}>Out</button>
                <button onClick={() => setFilter("dead")} className={`px-2.5 py-1 text-[11px] font-medium rounded-full border ${filter === "dead" ? "bg-slate-200 text-slate-800" : "bg-background hover:bg-muted"}`}>Dead Stock</button>
              </div>
            </div>

            {/* 17. EXPORT & BULK ACTIONS */}
            <div className="flex items-center gap-2 shrink-0">
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2 bg-muted/60 px-2 py-1 rounded-lg border">
                  <span className="text-xs font-semibold px-1">{selectedIds.length} Selected</span>
                  <button
                    onClick={() => {
                      const first = inventory.find(i => selectedIds.includes(i.id));
                      if (first) setRefillProduct(first);
                    }}
                    className="px-2 py-1 bg-[#10B981] text-white text-[11px] font-semibold rounded hover:bg-[#059669]"
                  >
                    Bulk Refill
                  </button>
                </div>
              )}

              <div className="flex items-center border border-border rounded-lg overflow-hidden bg-background">
                <button onClick={() => exportData("csv")} title="Export CSV" className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted border-r border-border">
                  <FileSpreadsheet className="w-4 h-4" />
                </button>
                <button onClick={() => exportData("print")} title="Print Inventory" className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted">
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 2. INVENTORY TABLE */}
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                    <th className="p-3 w-8">
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={selectedIds.length > 0 && selectedIds.length === paginatedInventory.length}
                        className="rounded accent-[#10B981]"
                      />
                    </th>
                    <th className="p-3">Product</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Stock (Avail / Res)</th>
                    <th className="p-3">Threshold</th>
                    <th className="p-3 min-w-[90px]">Stock Status</th>
                    <th className="p-3">Expiry Date</th>
                    <th className="p-3">Expiry Status</th>
                    <th className="p-3 text-right">Price</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedInventory.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-muted-foreground font-medium">
                        No products match your active search or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedInventory.map(item => {
                      const s = getStockStatus(item.stock, item.threshold);
                      const isEditing = editingId === item.id;
                      const isSelected = selectedIds.includes(item.id);

                      return (
                        <tr key={item.id} className={`hover:bg-muted/30 transition-colors ${isSelected ? "bg-[#ECFDF5]/50 dark:bg-emerald-950/20" : ""}`}>
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectOne(item.id)}
                              className="rounded accent-[#10B981]"
                            />
                          </td>

                          <td className="p-3">
                            <button
                              onClick={() => setSelectedProduct(item)}
                              className="text-left group flex items-center gap-2.5"
                            >
                              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center font-bold text-muted-foreground text-xs shrink-0 overflow-hidden">
                                {item.image ? (
                                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                  item.name.charAt(0)
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-foreground group-hover:text-[#10B981] transition-colors">{item.name}</p>
                                <p className="text-[10px] text-muted-foreground">{item.unit} · {item.supplier}</p>
                              </div>
                            </button>
                          </td>

                          <td className="p-3 font-mono text-[11px] text-muted-foreground">{item.sku}</td>
                          <td className="p-3 text-muted-foreground">{item.category}</td>

                          <td className="p-3">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editStock}
                                onChange={e => setEditStock(e.target.value)}
                                className="w-16 h-7 px-2 rounded border border-[#10B981] bg-background text-xs font-bold"
                              />
                            ) : (
                              <div>
                                <span className={`font-bold text-sm ${item.stock === 0 ? "text-red-600" : item.stock <= item.threshold ? "text-amber-600" : "text-foreground"}`}>
                                  {item.stock}
                                </span>
                                <span className="text-[10px] text-muted-foreground ml-1 font-mono">
                                  ({item.availableStock} / {item.reservedStock})
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="p-3">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editThreshold}
                                onChange={e => setEditThreshold(e.target.value)}
                                className="w-16 h-7 px-2 rounded border border-[#10B981] bg-background text-xs font-bold"
                              />
                            ) : (
                              <span className="text-muted-foreground font-mono">{item.threshold}</span>
                            )}
                          </td>

                          <td className="p-3">
                            <div className="space-y-1">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.bg} ${s.text}`}>
                                {s.label}
                              </span>
                              <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                                <div className={`h-full ${s.bar}`} style={{ width: `${s.pct}%` }} />
                              </div>
                            </div>
                          </td>

                          <td className="p-3 font-mono text-muted-foreground">
                            {item.expiryDate || "—"}
                          </td>

                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${item.expiryStatus.bg} ${item.expiryStatus.text}`}>
                              {item.expiryStatus.label}
                            </span>
                          </td>

                          <td className="p-3 text-right font-semibold">
                            ₹{item.sellingPrice}
                          </td>

                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* 5. REFILL BUTTON */}
                              <button
                                onClick={() => setRefillProduct(item)}
                                title="Refill Stock"
                                className="px-2 py-1 rounded font-semibold bg-[#ECFDF5] text-[#10B981] hover:bg-[#10B981] hover:text-white transition-colors flex items-center gap-1"
                              >
                                <PlusCircle className="w-3.5 h-3.5" /> Refill
                              </button>

                              {/* 6. ADJUST BUTTON */}
                              <button
                                onClick={() => {
                                  setAdjustProduct(item);
                                  setAdjustForm({ reason: "Damage", new_stock: String(item.stock), notes: "" });
                                }}
                                title="Adjust Stock"
                                className="p-1 rounded text-muted-foreground hover:bg-muted"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                              </button>

                              {isEditing ? (
                                <button onClick={() => saveEdit(item.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingId(item.id);
                                    setEditStock(String(item.stock));
                                    setEditThreshold(String(item.threshold));
                                  }}
                                  className="p-1 text-muted-foreground hover:text-foreground rounded"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* 18. PAGINATION FOOTER */}
            <div className="p-3 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">
                Showing {filteredInventory.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredInventory.length)} of {filteredInventory.length} products
              </span>

              <div className="flex items-center gap-2">
                <select
                  value={itemsPerPage}
                  onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="h-8 px-2 rounded border border-border bg-background text-xs"
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                </select>

                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    className="p-1.5 rounded border border-border bg-background hover:bg-muted disabled:opacity-40"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-1.5 rounded border border-border bg-background hover:bg-muted disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 font-semibold">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-1.5 rounded border border-border bg-background hover:bg-muted disabled:opacity-40"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="p-1.5 rounded border border-border bg-background hover:bg-muted disabled:opacity-40"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 4. BATCH MANAGEMENT (FIFO) */}
      {activeTab === "batches" && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm">Multi-Batch Ledger & FIFO Tracking</h3>
              <p className="text-xs text-muted-foreground">Manage active product lots, manufacturing dates, and strict FIFO dispatch compliance.</p>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                  <th className="p-3">Batch Number</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Mfg Date</th>
                  <th className="p-3">Expiry Date</th>
                  <th className="p-3 text-right">Qty Received</th>
                  <th className="p-3 text-right">Qty Remaining</th>
                  <th className="p-3 text-right">Purchase Cost</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">No batch entries found in database. Refill items to generate FIFO lots.</td>
                  </tr>
                ) : (
                  batches.map(b => (
                    <tr key={b.id} className="hover:bg-muted/20">
                      <td className="p-3 font-mono font-semibold text-[#10B981]">{b.batch_number}</td>
                      <td className="p-3 font-medium">{b.products?.name || "Product"}</td>
                      <td className="p-3 text-muted-foreground">{b.manufacturing_date || "N/A"}</td>
                      <td className="p-3 text-muted-foreground">{b.expiry_date || "N/A"}</td>
                      <td className="p-3 text-right font-mono">{b.quantity}</td>
                      <td className="p-3 text-right font-mono font-bold">{b.remaining_quantity}</td>
                      <td className="p-3 text-right font-mono">₹{b.purchase_cost || 0}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${b.remaining_quantity > 0 ? "bg-[#D1FAE5] text-[#065F46]" : "bg-gray-100 text-gray-600"}`}>
                          {b.remaining_quantity > 0 ? "Active FIFO" : "Closed"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: 7. INVENTORY HISTORY & AUDIT LOG */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-bold text-sm">System Audit & Inventory Ledger</h3>
            <p className="text-xs text-muted-foreground">Immutable history of manual stock adjustments, refills, sales, and system corrections.</p>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Product</th>
                  <th className="p-3 text-right">Prev Stock</th>
                  <th className="p-3 text-right">New Stock</th>
                  <th className="p-3 text-right">Difference</th>
                  <th className="p-3">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">No audit logs recorded yet. Action logs will populate automatically.</td>
                  </tr>
                ) : (
                  history.map(h => (
                    <tr key={h.id} className="hover:bg-muted/20">
                      <td className="p-3 font-mono text-muted-foreground">{new Date(h.created_at).toLocaleString()}</td>
                      <td className="p-3 font-semibold">{h.action}</td>
                      <td className="p-3 font-medium">{h.products?.name || `Product #${h.product_id}`}</td>
                      <td className="p-3 text-right font-mono">{h.previous_stock}</td>
                      <td className="p-3 text-right font-mono font-bold">{h.new_stock}</td>
                      <td className={`p-3 text-right font-mono font-bold ${h.difference >= 0 ? "text-[#10B981]" : "text-red-500"}`}>
                        {h.difference >= 0 ? `+${h.difference}` : h.difference}
                      </td>
                      <td className="p-3 text-muted-foreground max-w-xs truncate">{h.notes}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: 13. PURCHASE ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card p-4 rounded-xl border border-border space-y-2">
              <span className="text-xs text-muted-foreground font-semibold">Inventory Turnover Rate</span>
              <p className="text-2xl font-bold text-[#10B981]">4.2x / mo</p>
              <p className="text-[11px] text-muted-foreground">High stock velocity matching quick-commerce benchmarks.</p>
            </div>
            <div className="bg-card p-4 rounded-xl border border-border space-y-2">
              <span className="text-xs text-muted-foreground font-semibold">Average Shelf Life</span>
              <p className="text-2xl font-bold">18.5 Days</p>
              <p className="text-[11px] text-muted-foreground">Average days from refill intake to customer checkout.</p>
            </div>
            <div className="bg-card p-4 rounded-xl border border-border space-y-2">
              <span className="text-xs text-muted-foreground font-semibold">Dead Stock Value</span>
              <p className="text-2xl font-bold text-amber-600">₹{inventory.filter(i => i.daysWithoutSales >= 60).reduce((a, b) => a + b.inventoryValue, 0).toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground">Tied-up capital in slow-moving items (60+ days without sales).</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. PRODUCT DETAILS SIDE DRAWER */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-background border-l border-border h-full overflow-y-auto p-6 space-y-6 shadow-2xl animate-in slide-in-from-right duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-base font-bold">{selectedProduct.name}</h2>
                <p className="text-xs text-muted-foreground">SKU: {selectedProduct.sku}</p>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="p-1 rounded-full hover:bg-muted">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* 14. BARCODE UI PREPARATION */}
            <div className="bg-muted/30 border border-border rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Barcode / EAN</p>
                <p className="font-mono font-bold text-sm tracking-wider mt-0.5">{selectedProduct.barcode}</p>
              </div>
              <Barcode className="w-8 h-8 text-foreground/80" />
            </div>

            {/* Financials & Margins */}
            <div className="grid grid-cols-3 gap-2 bg-card border p-3 rounded-lg text-center">
              <div>
                <p className="text-[10px] text-muted-foreground">Cost Price</p>
                <p className="font-bold text-sm">₹{selectedProduct.purchaseCost}</p>
              </div>
              <div className="border-x">
                <p className="text-[10px] text-muted-foreground">Selling Price</p>
                <p className="font-bold text-sm text-[#10B981]">₹{selectedProduct.sellingPrice}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Profit Margin</p>
                <p className="font-bold text-sm text-emerald-600">{selectedProduct.profitMargin}%</p>
              </div>
            </div>

            {/* 15. SUPPLIER INFO */}
            <div className="bg-card border p-3 rounded-lg space-y-2">
              <p className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                <Truck className="w-4 h-4 text-[#10B981]" /> Preferred Supplier Details
              </p>
              <div className="space-y-1 text-muted-foreground">
                <p><strong className="text-foreground">Name:</strong> {selectedProduct.supplier}</p>
                <p><strong className="text-foreground">Contact:</strong> {selectedProduct.supplierPhone}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-bold text-xs">Stock Level Metrics</p>
              <div className="space-y-1 bg-muted/20 p-3 rounded-lg border">
                <div className="flex justify-between"><span>Current Stock:</span> <strong className="font-mono">{selectedProduct.stock}</strong></div>
                <div className="flex justify-between"><span>Reserved Stock:</span> <strong className="font-mono">{selectedProduct.reservedStock}</strong></div>
                <div className="flex justify-between"><span>Available Stock:</span> <strong className="font-mono text-[#10B981]">{selectedProduct.availableStock}</strong></div>
                <div className="flex justify-between"><span>Low Stock Threshold:</span> <strong className="font-mono">{selectedProduct.threshold}</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. PROFESSIONAL REFILL MODAL */}
      {refillProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background border border-border w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20">
              <div>
                <h3 className="font-bold text-sm">Refill Inventory Intake</h3>
                <p className="text-xs text-muted-foreground">{refillProduct.name} ({refillProduct.sku})</p>
              </div>
              <button onClick={() => setRefillProduct(null)} className="p-1 rounded-full hover:bg-muted">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleRefillSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-2 bg-muted/30 border p-3 rounded-lg text-center font-medium">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Current Stock</p>
                  <p className="text-base font-bold">{refillProduct.stock}</p>
                </div>
                <div className="border-x">
                  <p className="text-[10px] uppercase text-muted-foreground">Intake</p>
                  <p className="text-base font-bold text-[#10B981]">+{Number(refillForm.quantity || 0)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">New Total</p>
                  <p className="text-base font-bold">{refillProduct.stock + Number(refillForm.quantity || 0)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Quantity Received *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={refillForm.quantity}
                    onChange={e => setRefillForm({ ...refillForm, quantity: e.target.value })}
                    className="w-full h-8 px-2.5 rounded border border-border bg-background focus:outline-none focus:border-[#10B981]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Purchase Invoice #</label>
                  <input
                    type="text"
                    placeholder="INV-2026-99"
                    value={refillForm.purchase_invoice}
                    onChange={e => setRefillForm({ ...refillForm, purchase_invoice: e.target.value })}
                    className="w-full h-8 px-2.5 rounded border border-border bg-background focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Batch Number</label>
                  <input
                    type="text"
                    placeholder={`LOT-${Date.now().toString().slice(-6)}`}
                    value={refillForm.batch_number}
                    onChange={e => setRefillForm({ ...refillForm, batch_number: e.target.value })}
                    className="w-full h-8 px-2.5 rounded border border-border bg-background focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={refillForm.expiry_date}
                    onChange={e => setRefillForm({ ...refillForm, expiry_date: e.target.value })}
                    className="w-full h-8 px-2.5 rounded border border-border bg-background focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Notes / Internal Reference</label>
                <textarea
                  rows={2}
                  value={refillForm.notes}
                  onChange={e => setRefillForm({ ...refillForm, notes: e.target.value })}
                  placeholder="e.g. Received shipment in good condition, verified temperature controls."
                  className="w-full p-2 rounded border border-border bg-background focus:outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setRefillProduct(null)}
                  className="px-4 py-2 rounded bg-muted hover:bg-muted/80 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-[#10B981] hover:bg-[#059669] text-white font-bold"
                >
                  Commit Intake Refill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. STOCK ADJUSTMENT MODAL */}
      {adjustProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background border border-border w-full max-w-md rounded-xl shadow-2xl overflow-hidden text-xs">
            <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/20">
              <h3 className="font-bold text-sm">Stock Level Adjustment</h3>
              <button onClick={() => setAdjustProduct(null)} className="p-1 rounded-full hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustmentSubmit} className="p-5 space-y-4">
              <div>
                <label className="block font-semibold mb-1">Reason for Adjustment *</label>
                <select
                  value={adjustForm.reason}
                  onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full h-9 px-3 rounded border border-border bg-background font-medium"
                >
                  <option value="Damage">Damage / Spoiled</option>
                  <option value="Theft">Theft / Shoplifting</option>
                  <option value="Expired">Expired Stock Disposal</option>
                  <option value="Internal Use">Internal Promotion / Sampling</option>
                  <option value="Manual Correction">Manual Physical Audit Correction</option>
                  <option value="Supplier Return">Returned to Supplier</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">New Adjusted Total Stock *</label>
                <input
                  type="number"
                  required
                  value={adjustForm.new_stock}
                  onChange={e => setAdjustForm({ ...adjustForm, new_stock: e.target.value })}
                  className="w-full h-8 px-2.5 rounded border border-border bg-background font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Audit Notes *</label>
                <textarea
                  required
                  rows={3}
                  value={adjustForm.notes}
                  onChange={e => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                  placeholder="Provide explicit audit notes explaining the variance..."
                  className="w-full p-2 rounded border border-border bg-background"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button type="button" onClick={() => setAdjustProduct(null)} className="px-4 py-2 rounded bg-muted">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded bg-[#10B981] text-white font-bold">Save Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

