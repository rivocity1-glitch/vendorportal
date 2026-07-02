import React, { useState, useEffect } from "react";
import {
  ShoppingBag, Clock, IndianRupee, TrendingUp, Package,
  AlertTriangle, Star, ArrowUp, ArrowDown, Send
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";

// Correct path linking to your newly created client profile
import { supabase } from "../../../lib/supabase"; 

const statusColors: Record<string, string> = {
  pending: "bg-[#FEF3C7] text-[#92400E]",
  preparing: "bg-[#EDE9FE] text-[#5B21B6]",
  packed: "bg-[#CFFAFE] text-[#164E63]",
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

function StatCard({ title, value, change, changeUp, icon: Icon, iconColor, iconBg, subtitle }: StatCardProps) {
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
}

export function Dashboard({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [loading, setLoading] = useState(true);

  // Live state metrics
  const [metrics, setMetrics] = useState({
    todayOrders: 0,
    pendingOrders: 0,
    pendingSettlement: 0,
    salesWeekly: 0,
    activeProducts: 0,
    lowStockCount: 0,
  });

  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);
  const [hasPendingRequest, setHasPendingRequest] = useState<boolean>(false);
  const [submittingSettlement, setSubmittingSettlement] = useState<boolean>(false);

  const [recentOrdersList, setRecentOrdersList] = useState<any[]>([]);
  const [stockAlertsList, setStockAlertsList] = useState<any[]>([]);
  const [salesAnalytics, setSalesAnalytics] = useState<any[]>([]);
  const [orderTrends, setOrderTrends] = useState<any[]>([]);

  const fetchLiveDashboardMetrics = async () => {
    try {
      // STEP 1: Fetch the logged-in auth user
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        setLoading(false);
        return;
      }
      const user = authData.user;

      // STEP 2: Find vendor profile ID associated with auth user
      const { data: vendorData, error: vendorError } = await supabase
        .from("vendors")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (vendorError || !vendorData) {
        setLoading(false);
        return;
      }
      const vendorId = vendorData.id;
      setActiveVendorId(vendorId);

      // Check for an existing 'pending_request' settlement entry
      const { data: existingSettlements } = await supabase
        .from("vendor_settlements")
        .select("id")
        .eq("vendor_id", vendorId)
        .eq("status", "pending_request")
        .limit(1);

      setHasPendingRequest(existingSettlements && existingSettlements.length > 0);

      // Fetch already paid out settlements to calculate true pending balance
      const { data: paidSettlements } = await supabase
        .from("vendor_settlements")
        .select("amount")
        .eq("vendor_id", vendorId)
        .eq("status", "paid");

      const paidSettlementsTotal = paidSettlements
        ? paidSettlements.reduce((sum, item) => sum + Number(item.amount || 0), 0)
        : 0;

      // STEP 3: Query product listings using the correct vendor relation identifier
      const { data: productsData, count: activeCount } = await supabase
        .from("products")
        .select("name, stock, low_stock_threshold", { count: "exact" })
        .eq("vendor_id", vendorId);

      // Query vendor transactional records directly from orders table
      const { data: ordersData } = await supabase
        .from("orders")
        .select("id, order_number, total_amount, order_status, created_at")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false });

      let lowStockItemsCount = 0;
      const processedStockAlerts: any[] = [];
      if (productsData) {
        productsData.forEach((p: any) => {
          const stockLevel = p.stock ?? 0;
          const threshold = p.low_stock_threshold ?? 10;
          if (stockLevel <= threshold) { 
            lowStockItemsCount++;
            if (processedStockAlerts.length < 5) {
              processedStockAlerts.push({ name: p.name, stock: stockLevel, threshold: threshold || 15 });
            }
          }
        });
      }

      let todayOrdersCount = 0;
      let pendingOrdersCount = 0;
      let deliveredOrdersTotal = 0;
      let weeklySalesSum = 0;
      const processedOrders: any[] = [];
      const todayStr = new Date().toISOString().split('T')[0];
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Track sales analytics dynamically over 7 running days using a calendar map
      const dailyRevenueMap: Record<string, number> = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
      const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      if (ordersData) {
        ordersData.forEach((order: any) => {
          const itemDate = new Date(order.created_at);
          const itemDateStr = itemDate.toISOString().split('T')[0];
          const isToday = itemDateStr === todayStr;
          const statusLower = (order.order_status || "").toLowerCase();
          const isPending = statusLower === "pending";

          if (isToday) todayOrdersCount++;
          if (isPending) pendingOrdersCount++;
          
          const rowAmount = Number(order.total_amount || 0);

          // Calculate running balance based purely on delivered orders configuration
          if (statusLower === "delivered") {
            deliveredOrdersTotal += rowAmount;
          }
          
          // Build historical window trends cleanly matching business volume parameters
          if (itemDate >= oneWeekAgo && statusLower !== "cancelled") {
            weeklySalesSum += rowAmount;
            const dayName = weekdays[itemDate.getDay()];
            dailyRevenueMap[dayName] += rowAmount;
          }

          if (processedOrders.length < 5) {
            processedOrders.push({
              id: order.id ? `ORD-${order.id.slice(0, 4).toUpperCase()}` : `ORD-${order.order_number || "NEW"}`,
              customer: "Store Customer",
              amount: `₹${rowAmount.toLocaleString("en-IN")}`,
              status: order.order_status || "Pending",
              time: isToday ? "Today" : itemDate.toLocaleDateString()
            });
          }
        });
      }

      // Calculate final pending status value balance cleanly
      const pendingSettlementCalc = Math.max(deliveredOrdersTotal - paidSettlementsTotal, 0);

      // Hydrate data properties smoothly
      setMetrics({
        activeProducts: activeCount || 0,
        lowStockCount: lowStockItemsCount,
        todayOrders: todayOrdersCount,
        pendingOrders: pendingOrdersCount,
        pendingSettlement: pendingSettlementCalc,
        salesWeekly: weeklySalesSum,
      });

      setStockAlertsList(processedStockAlerts);
      setRecentOrdersList(processedOrders);

      const mappedAnalytics = weekdays.map(day => ({
        day,
        revenue: dailyRevenueMap[day]
      }));
      setSalesAnalytics(mappedAnalytics);

      setOrderTrends([
        { 
          name: "Live Status Balance", 
          Completed: todayOrdersCount - pendingOrdersCount > 0 ? todayOrdersCount - pendingOrdersCount : 0, 
          Pending: pendingOrdersCount 
        },
      ]);

    } catch (err) {
      console.error("Dashboard component data fetching exception:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveDashboardMetrics();
  }, [period]);

  const handleRequestSettlement = async () => {
    if (!activeVendorId || metrics.pendingSettlement <= 0 || hasPendingRequest || submittingSettlement) return;

    try {
      setSubmittingSettlement(true);
      const { error } = await supabase
        .from("vendor_settlements")
        .insert({
          vendor_id: activeVendorId,
          amount: metrics.pendingSettlement,
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
            Current Unsettled Balance: <span className="font-bold text-[#10B981]">₹{metrics.pendingSettlement.toLocaleString("en-IN")}</span>
          </p>
        </div>
        <div>
          {hasPendingRequest ? (
            <span className="text-xs font-semibold px-3 py-1.5 bg-[#FEF3C7] text-[#92400E] rounded-lg border border-[#FDE68A] inline-block animate-pulse">
              Settlement Request Pending Approval
            </span>
          ) : (
            <button
              onClick={handleRequestSettlement}
              disabled={metrics.pendingSettlement <= 0 || submittingSettlement}
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
        <StatCard title="Today's Orders" value={metrics.todayOrders} icon={ShoppingBag} iconColor="text-[#10B981]" iconBg="bg-[#ECFDF5]" />
        <StatCard title="Pending Orders" value={metrics.pendingOrders} subtitle="Requires action" icon={Clock} iconColor="text-[#F59E0B]" iconBg="bg-[#FEF3C7]" />
        
        {/* Updated Cards targeting live real-time settlements context pipelines */}
        <StatCard title="Pending Settlement" value={`₹${metrics.pendingSettlement.toLocaleString("en-IN")}`} icon={IndianRupee} iconColor="text-[#10B981]" iconBg="bg-[#ECFDF5]" />
        <StatCard title="Sales This Week" value={`₹${metrics.salesWeekly.toLocaleString("en-IN")}`} icon={TrendingUp} iconColor="text-[#3B82F6]" iconBg="bg-[#EFF6FF]" />
        
        <StatCard title="Active Products" value={metrics.activeProducts} icon={Package} iconColor="text-[#8B5CF6]" iconBg="bg-[#EDE9FE]" />
        <StatCard title="Low Stock Products" value={metrics.lowStockCount} subtitle="Needs restocking" icon={AlertTriangle} iconColor="text-[#EF4444]" iconBg="bg-[#FEF2F2]" />
        <StatCard title="Customer Rating" value="—" icon={Star} iconColor="text-[#F59E0B]" iconBg="bg-[#FEF3C7]" />
      </div>

      {/* Analytics Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-4">
          {/* Renamed chart layout header tracker element context matching weekly running metrics */}
          <h3 className="font-semibold text-foreground mb-4">Sales Analytics (7-Day Running Sales)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={salesAnalytics}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => Number(value) === 0 ? [null, null] : [`₹${Number(value).toLocaleString("en-IN")}`, "Sales"]} />
              <Area type="monotone" dataKey="revenue" stroke="#10B981" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-foreground mb-4">Live Action Balance</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={orderTrends} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="Completed" fill="#10B981" name="Completed/Active" />
              <Bar dataKey="Pending" fill="#F59E0B" name="Pending Review" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lists Layout Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-foreground mb-4">Recent Orders Activity Feed</h3>
          <div className="space-y-3">
            {recentOrdersList.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No incoming store orders found.</p>
            ) : (
              recentOrdersList.map((o, i) => (
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
            {stockAlertsList.length === 0 ? (
              <p className="text-xs text-emerald-500 font-medium py-4 text-center">✓ All item inventory levels are stable.</p>
            ) : (
              stockAlertsList.map((s, i) => (
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

// Simple local micro-helper definition configuration context mapping parameters
function Loader2({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin h-3.5 w-3.5 ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}