import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShoppingBag, Clock, IndianRupee, TrendingUp, Package,
  AlertTriangle, Star, ArrowUp, ArrowDown, Send, Percent, Award
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";

// Correct path linking to your newly created client profile
import { supabase } from "../../../lib/supabase"; 
import { getPendingSettlement, getPaidSettlement, getWeeklySales } from "../../../utils/finance";

const statusColors: Record<string, string> = {
  pending: "bg-[#FEF3C7] text-[#92400E]",
  accepted: "bg-[#E0F2FE] text-[#0369A1]",
  preparing: "bg-[#EDE9FE] text-[#5B21B6]",
  packed: "bg-[#CFFAFE] text-[#164E63]",
  "out for delivery": "bg-[#DBEAFE] text-[#1E40AF]",
  delivered: "bg-[#D1FAE5] text-[#065F46]",
  cancelled: "bg-[#FEE2E2] text-[#991B1B]",
};

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeUp?: boolean;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  subtitle?: string;
}

const StatCard = React.memo(function StatCard({ title, value, change, changeUp, icon: Icon, iconColor, iconBg, subtitle }: StatCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          {change && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${changeUp ? "text-[#10B981]" : "text-[#EF4444]"}`}>
              {changeUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {change}
            </div>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
});

// Relative timestamp transformer optimized for relative human readings
function getRelativeTime(dateString: string): string {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} mins ago`;

  const todayStr = now.toISOString().split("T")[0];
  const pastStr = past.toISOString().split("T")[0];

  if (todayStr === pastStr) return "Today";
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (yesterday.toISOString().split("T")[0] === pastStr) return "Yesterday";

  return past.toLocaleDateString();
}

export function Dashboard({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [loading, setLoading] = useState(true);

  // Core structured relational atomic data vectors
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);
  const [hasPendingRequest, setHasPendingRequest] = useState<boolean>(false);
  const [submittingSettlement, setSubmittingSettlement] = useState<boolean>(false);

  const [rawOrders, setRawOrders] = useState<any[]>([]);
  const [rawProducts, setRawProducts] = useState<any[]>([]);
  const [rawSettlements, setRawSettlements] = useState<any[]>([]);
  const [rawReviews, setRawReviews] = useState<any[]>([]);
  const [rawOrderItems, setRawOrderItems] = useState<any[]>([]);

  const fetchLiveDashboardMetrics = useCallback(async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        setLoading(false);
        return;
      }

      const { data: vendorData, error: vendorError } = await supabase
        .from("vendors")
        .select("id")
        .eq("auth_user_id", authData.user.id)
        .single();

      if (vendorError || !vendorData) {
        setLoading(false);
        return;
      }
      const vendorId = vendorData.id;
      setActiveVendorId(vendorId);

      // Concurrent Data Aggregation Pipelines using Promise.all()
      const [
        settlementsRes,
        productsRes,
        ordersRes,
        reviewsRes,
        orderItemsRes
      ] = await Promise.all([
        supabase.from("vendor_settlements").select("amount, status").eq("vendor_id", vendorId),
        supabase.from("products").select("name, stock, low_stock_threshold").eq("vendor_id", vendorId),
        supabase.from("orders").select("id, order_number, total_amount, subtotal, order_status, created_at, vendor_earning, vendor_commission, delivery_fee, platform_fee, settled_vendor, customers!customer_id(customer_name)").eq("vendor_id", vendorId).order("created_at", { ascending: false }),
        supabase.from("reviews").select("rating").eq("vendor_id", vendorId),
        supabase.from("order_items").select("quantity, products!inner(name, vendor_id)").eq("products.vendor_id", vendorId)
      ]);

      setRawSettlements(settlementsRes.data || []);
      setRawProducts(productsRes.data || []);
      setRawOrders(ordersRes.data || []);
      setRawReviews(reviewsRes.data || []);
      setRawOrderItems(orderItemsRes.data || []);
      setHasPendingRequest((settlementsRes.data || []).some(s => s.status === "pending_request"));

    } catch (err) {
      console.error("Dashboard component data fetching exception:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveDashboardMetrics();

    // Universal multi-node engine subscription channels mirroring Orders real-time rules
    const dashboardChannel = supabase
      .channel("vendor-dashboard-realtime-cluster")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchLiveDashboardMetrics())
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => fetchLiveDashboardMetrics())
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => fetchLiveDashboardMetrics())
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => fetchLiveDashboardMetrics())
      .on("postgres_changes", { event: "*", schema: "public", table: "vendor_settlements" }, () => fetchLiveDashboardMetrics())
      .subscribe();

    return () => {
      supabase.removeChannel(dashboardChannel);
    };
  }, [fetchLiveDashboardMetrics, period]);

  // Memoized Metric Analysis Engines to avoid unnecessary recalculations and re-renders
  const derivedMetrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    let todayOrders = 0;
    let pendingOrders = 0;
    let deliveredOrdersCount = 0;

    const statusCountsToday: Record<string, number> = {
      Pending: 0, Accepted: 0, Preparing: 0, Packed: 0, "Out For Delivery": 0, Delivered: 0, Cancelled: 0
    };
    const dailyRevenueMap: Record<string, number> = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };

    rawOrders.forEach((order) => {
      const itemDate = new Date(order.created_at);
      const itemDateStr = order.created_at ? order.created_at.split('T')[0] : "";
      const isToday = itemDateStr === todayStr;
      const statusLower = (order.order_status || "").toLowerCase();
      const rowAmount = Number(order.vendor_earning || 0);

      if (isToday) {
        todayOrders++;
        const matchKey = Object.keys(statusCountsToday).find(k => k.toLowerCase() === statusLower);
        if (matchKey) statusCountsToday[matchKey]++;
      }

      if (["pending", "accepted", "preparing", "packed"].includes(statusLower)) {
        pendingOrders++;
      }

      if (statusLower === "delivered") {
        deliveredOrdersCount++;

        if (itemDate >= oneWeekAgo) {
          const dayName = weekdays[itemDate.getDay()];
          dailyRevenueMap[dayName] += rowAmount; // Chart maps vendor earnings instead of raw subtotal values
        }
      }
    });

    const pendingSettlement = getPendingSettlement(rawOrders);
    const salesWeekly = getWeeklySales(rawOrders);

    const lowStockAlerts = rawProducts
      .map(p => ({
        name: p.name,
        stock: p.stock ?? 0,
        threshold: p.low_stock_threshold ?? 10
      }))
      .filter(p => p.stock <= p.threshold)
      .sort((a, b) => a.stock - b.stock);

    let customerRating = "No ratings yet";
    if (rawReviews.length > 0) {
      const totalRating = rawReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0);
      customerRating = `${(totalRating / rawReviews.length).toFixed(1)} ⭐`;
    }

    const productSalesMap: Record<string, number> = {};
    rawOrderItems.forEach((item) => {
      const pName = item.products?.name;
      if (pName) productSalesMap[pName] = (productSalesMap[pName] || 0) + Number(item.quantity || 0);
    });

    let topProduct = { name: "None", units: 0 };
    Object.entries(productSalesMap).forEach(([name, units]) => {
      if (units > topProduct.units) topProduct = { name, units };
    });

    // Average Order Value calculated using vendor_earning instead of subtotal
    const totalDeliveredEarnings = rawOrders
      .filter(o => (o.order_status || "").toLowerCase() === "delivered")
      .reduce((sum, o) => sum + Number(o.vendor_earning || 0), 0);
    const avgOrderValue = deliveredOrdersCount > 0 ? Math.round(totalDeliveredEarnings / deliveredOrdersCount) : 0;
    
    const completionRate = rawOrders.length > 0 ? Math.round((deliveredOrdersCount / rawOrders.length) * 100) : 0;

    const recentOrdersMapped = rawOrders.slice(0, 5).map((order) => {
      const custObj: any = order.customers || order["customers!customer_id"];
      return {
        id: order.order_number || "NEW",
        customer: custObj?.customer_name || "Anonymous Customer",
        amount: `₹${Number(order.vendor_earning || 0).toLocaleString("en-IN")}`,
        status: order.order_status || "Pending",
        time: getRelativeTime(order.created_at)
      };
    });

    const salesAnalyticsData = weekdays.map(day => ({ day, revenue: dailyRevenueMap[day] }));
    const orderTrendsData = Object.entries(statusCountsToday).map(([statusName, volumeCount]) => ({ name: statusName, Orders: volumeCount }));

    return {
      todayOrders,
      pendingOrders,
      pendingSettlement,
      salesWeekly,
      lowStockCount: lowStockAlerts.length,
      customerRating,
      avgOrderValue,
      completionRate,
      topProduct,
      lowStockAlerts: lowStockAlerts.slice(0, 5),
      recentOrdersMapped,
      salesAnalyticsData,
      orderTrendsData
    };
  }, [rawOrders, rawProducts, rawReviews, rawOrderItems]);

  const handleRequestSettlement = async () => {
    if (!activeVendorId || derivedMetrics.pendingSettlement < 500 || hasPendingRequest || submittingSettlement) return;

    try {
      setSubmittingSettlement(true);
      const { error } = await supabase
        .from("vendor_settlements")
        .insert({
          vendor_id: activeVendorId,
          amount: derivedMetrics.pendingSettlement,
          status: "pending_request",
          request_date: new Date().toISOString()
        });

      if (error) throw error;
      setHasPendingRequest(true);
      await fetchLiveDashboardMetrics();
    } catch (err) {
      console.error("Failed to post settlement pipeline modification sequence:", err);
    } finally {
      setSubmittingSettlement(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-xs text-muted-foreground animate-pulse">Syncing store records...</div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Dynamic Action Trigger Settlement Banner Integration block */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Settlement Management</h4>
          <p className="text-xs text-foreground font-medium">
            Current Unsettled Balance: <span className="font-bold text-[#10B981]">₹{derivedMetrics.pendingSettlement.toLocaleString("en-IN")}</span>
          </p>
        </div>
        <div>
          {hasPendingRequest ? (
            <span className="text-xs font-semibold px-3 py-1.5 bg-[#FEF3C7] text-[#92400E] rounded-lg border border-[#FDE68A] inline-block animate-pulse">
              Settlement Request Pending Approval
            </span>
          ) : derivedMetrics.pendingSettlement < 500 ? (
            <span className="text-xs font-semibold px-3 py-1.5 bg-muted text-muted-foreground rounded-lg border border-border inline-block">
              Minimum ₹500 required
            </span>
          ) : (
            <button
              onClick={handleRequestSettlement}
              disabled={submittingSettlement}
              className="h-9 px-4 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 disabled:pointer-events-none"
            >
              {submittingSettlement ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Request Settlement</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard title="Today's Orders" value={derivedMetrics.todayOrders} icon={ShoppingBag} iconColor="text-[#10B981]" iconBg="bg-[#ECFDF5]" />
        <StatCard title="Pending Orders" value={derivedMetrics.pendingOrders} subtitle="Requires action" icon={Clock} iconColor="text-[#F59E0B]" iconBg="bg-[#FEF3C7]" />
        <StatCard title="Pending Settlement" value={`₹${derivedMetrics.pendingSettlement.toLocaleString("en-IN")}`} icon={IndianRupee} iconColor="text-[#10B981]" iconBg="bg-[#ECFDF5]" />
        <StatCard title="Sales This Week" value={`₹${derivedMetrics.salesWeekly.toLocaleString("en-IN")}`} icon={TrendingUp} iconColor="text-[#3B82F6]" iconBg="bg-[#EFF6FF]" />
        
        <StatCard title="Active Products" value={rawProducts.length} icon={Package} iconColor="text-[#8B5CF6]" iconBg="bg-[#EDE9FE]" />
        <StatCard title="Low Stock Products" value={derivedMetrics.lowStockCount} subtitle="Needs restocking" icon={AlertTriangle} iconColor="text-[#EF4444]" iconBg="bg-[#FEF2F2]" />
        <StatCard title="Customer Rating" value={derivedMetrics.customerRating} icon={Star} iconColor="text-[#F59E0B]" iconBg="bg-[#FEF3C7]" />
        
        {/* Advanced Functional Metric Analytical Cards Blocks */}
        <StatCard title="Avg Order Value" value={`₹${derivedMetrics.avgOrderValue}`} icon={IndianRupee} iconColor="text-[#3B82F6]" iconBg="bg-[#EFF6FF]" />
        <StatCard title="Completion Rate" value={`${derivedMetrics.completionRate}%`} icon={Percent} iconColor="text-[#10B981]" iconBg="bg-[#ECFDF5]" />
        <StatCard title="Top Selling Product" value={derivedMetrics.topProduct.name} subtitle={`${derivedMetrics.topProduct.units} Sold`} icon={Award} iconColor="text-[#8B5CF6]" iconBg="bg-[#EDE9FE]" />
      </div>

      {/* Analytics Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-foreground mb-4">Sales Analytics (7-Day Running Sales)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={derivedMetrics.salesAnalyticsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => Number(value) === 0 ? [null, null] : [`₹${Number(value).toLocaleString("en-IN")}`, "Sales"]} />
              <Area type="monotone" dataKey="revenue" stroke="#10B981" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Stacked Today's Orders Status Breakdown distribution chart */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-foreground mb-4">Today's Orders Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={derivedMetrics.orderTrendsData} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 9, angle: -12, textAnchor: "end" }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="Orders" fill="#3B82F6" name="Total Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lists Layout Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-foreground mb-4">Recent Orders Activity Feed</h3>
          <div className="space-y-3">
            {derivedMetrics.recentOrdersMapped.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No incoming store orders found.</p>
            ) : (
              derivedMetrics.recentOrdersMapped.map((o, i) => (
                <div key={i} className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="text-xs font-medium text-foreground">{o.customer}</p>
                    <p className="text-[10px] text-muted-foreground">{o.id} · {o.time}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-foreground">{o.amount}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[o.status.toLowerCase()] || "bg-muted text-foreground"}`}>
                      {o.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-[#EF4444]" /> Warehouse Stock Alerts
          </h3>
          <div className="space-y-2.5">
            {derivedMetrics.lowStockAlerts.length === 0 ? (
              <p className="text-xs text-emerald-500 font-medium py-4 text-center">✓ All item inventory levels are stable.</p>
            ) : (
              derivedMetrics.lowStockAlerts.map((s, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-medium text-foreground truncate mr-2">{s.name}</p>
                    <span className="text-xs text-[#EF4444] font-semibold">{s.stock} left</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-[#EF4444]" style={{ width: `${Math.min((s.stock / s.threshold) * 100, 100)}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin h-3.5 w-3.5 ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}