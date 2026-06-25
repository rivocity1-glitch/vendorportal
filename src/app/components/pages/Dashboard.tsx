import React, { useState, useEffect } from "react";
import {
  ShoppingBag, Clock, IndianRupee, TrendingUp, Package,
  AlertTriangle, Star, ArrowUp, ArrowDown
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

  // Live state metrics (hardcoded dummy attributes safely scrubbed)
  const [metrics, setMetrics] = useState({
    todayOrders: 0,
    pendingOrders: 0,
    revenueToday: 0,
    revenueWeekly: 0,
    activeProducts: 0,
    lowStockCount: 0,
  });

  const [recentOrdersList, setRecentOrdersList] = useState<any[]>([]);
  const [stockAlertsList, setStockAlertsList] = useState<any[]>([]);
  const [salesAnalytics, setSalesAnalytics] = useState<any[]>([]);
  const [orderTrends, setOrderTrends] = useState<any[]>([]);

  useEffect(() => {
    async function fetchLiveDashboardMetrics() {
      try {
        // Fetch the logged-in user safely from Supabase auth state.
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          setLoading(false);
          return;
        }
        const user = data.user;

        // Query product listings using the exact database variables we confirmed
        const { data: productsData, count: activeCount } = await supabase
          .from("products")
          .select("name, stock", { count: "exact" })
          .eq("vendor_id", user.id);

        // Fetch related vendor transactional line records 
        const { data: orderItems } = await supabase
          .from("order_items")
          .select("id, quantity, price, fulfillment_status, created_at, order_id")
          .eq("vendor_id", user.id)
          .order("created_at", { ascending: false });

        let lowStockItemsCount = 0;
        const processedStockAlerts: any[] = [];
        if (productsData) {
          productsData.forEach((p: any) => {
            const stockLevel = p.stock ?? 0;
            if (stockLevel <= 10) { 
              lowStockItemsCount++;
              if (processedStockAlerts.length < 5) {
                processedStockAlerts.push({ name: p.name, stock: stockLevel, threshold: 15 });
              }
            }
          });
        }

        let todayOrdersCount = 0;
        let pendingOrdersCount = 0;
        let todayRevenueSum = 0;
        let weeklyRevenueSum = 0;
        const processedOrders: any[] = [];
        const todayStr = new Date().toISOString().split('T')[0];
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        // Track sales analytics dynamically over 7 running days using a calendar map
        const dailyRevenueMap: Record<string, number> = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
        const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        if (orderItems) {
          orderItems.forEach((item: any) => {
            const itemDate = new Date(item.created_at);
            const itemDateStr = itemDate.toISOString().split('T')[0];
            const isToday = itemDateStr === todayStr;
            const isPending = item.fulfillment_status === "pending" || item.fulfillment_status?.toLowerCase() === "pending";

            if (isToday) todayOrdersCount++;
            if (isPending) pendingOrdersCount++;
            
            const rowRevenue = Number(item.price || 0) * (item.quantity || 1);

            // Accumulate active daily earnings
            if (isToday && (item.fulfillment_status === "delivered" || item.fulfillment_status === "packed" || item.fulfillment_status === "preparing")) {
              todayRevenueSum += rowRevenue;
            }
            
            // Build historical window trends cleanly
            if (itemDate >= oneWeekAgo && item.fulfillment_status !== "cancelled") {
              weeklyRevenueSum += rowRevenue;
              const dayName = weekdays[itemDate.getDay()];
              dailyRevenueMap[dayName] += rowRevenue;
            }

            if (processedOrders.length < 5) {
              processedOrders.push({
                id: item.order_id ? `ORD-${item.order_id.slice(0, 4).toUpperCase()}` : "ORD-NEW",
                customer: "Store Customer",
                amount: `₹${rowRevenue.toLocaleString("en-IN")}`,
                status: item.fulfillment_status || "Pending",
                time: isToday ? "Today" : itemDate.toLocaleDateString()
              });
            }
          });
        }

        // Hydrate data properties smoothly
        setMetrics({
          activeProducts: activeCount || 0,
          lowStockCount: lowStockItemsCount,
          todayOrders: todayOrdersCount,
          pendingOrders: pendingOrdersCount,
          revenueToday: todayRevenueSum,
          revenueWeekly: weeklyRevenueSum,
        });

        setStockAlertsList(processedStockAlerts);
        setRecentOrdersList(processedOrders);

        // Format chart arrays strictly matching current localized database parameters
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
    }

    fetchLiveDashboardMetrics();
  }, [period]);

  if (loading) {
    return <div className="p-6 text-center text-xs text-muted-foreground animate-pulse">Syncing store records...</div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard title="Today's Orders" value={metrics.todayOrders} icon={ShoppingBag} iconColor="text-[#10B981]" iconBg="bg-[#ECFDF5]" />
        <StatCard title="Pending Orders" value={metrics.pendingOrders} subtitle="Requires action" icon={Clock} iconColor="text-[#F59E0B]" iconBg="bg-[#FEF3C7]" />
        <StatCard title="Revenue Today" value={`₹${metrics.revenueToday.toLocaleString("en-IN")}`} icon={IndianRupee} iconColor="text-[#10B981]" iconBg="bg-[#ECFDF5]" />
        <StatCard title="Revenue This Week" value={`₹${metrics.revenueWeekly.toLocaleString("en-IN")}`} icon={TrendingUp} iconColor="text-[#3B82F6]" iconBg="bg-[#EFF6FF]" />
        <StatCard title="Active Products" value={metrics.activeProducts} icon={Package} iconColor="text-[#8B5CF6]" iconBg="bg-[#EDE9FE]" />
        <StatCard title="Low Stock Products" value={metrics.lowStockCount} subtitle="Needs restocking" icon={AlertTriangle} iconColor="text-[#EF4444]" iconBg="bg-[#FEF2F2]" />
        
        {/* 🟢 Customer Rating Card - Restored with values cleared out */}
        <StatCard title="Customer Rating" value="—" icon={Star} iconColor="text-[#F59E0B]" iconBg="bg-[#FEF3C7]" />
      </div>

      {/* Analytics Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-foreground mb-4">Sales Analytics (7-Day Running Revenue)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={salesAnalytics}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => Number(value) === 0 ? [null, null] : [`₹${Number(value).toLocaleString("en-IN")}`, "Revenue"]} />
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