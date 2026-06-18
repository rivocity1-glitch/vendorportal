import React, { useState } from "react";
import { TrendingUp, TrendingDown, Users, ShoppingBag, ArrowUp, ArrowDown, Clock, Star } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

const revenueData = {
  daily: [
    { label: "Mon", value: 4200 }, { label: "Tue", value: 5800 }, { label: "Wed", value: 3900 },
    { label: "Thu", value: 7200 }, { label: "Fri", value: 8900 }, { label: "Sat", value: 11200 }, { label: "Sun", value: 9600 },
  ],
  weekly: [
    { label: "W1", value: 48000 }, { label: "W2", value: 52000 }, { label: "W3", value: 45000 }, { label: "W4", value: 61000 },
  ],
  monthly: [
    { label: "Jan", value: 185000 }, { label: "Feb", value: 162000 }, { label: "Mar", value: 210000 },
    { label: "Apr", value: 198000 }, { label: "May", value: 225000 }, { label: "Jun", value: 240000 },
    { label: "Jul", value: 218000 }, { label: "Aug", value: 235000 }, { label: "Sep", value: 252000 },
    { label: "Oct", value: 268000 }, { label: "Nov", value: 295000 }, { label: "Dec", value: 310000 },
  ],
};

const orderData = [
  { label: "Mon", completed: 18, cancelled: 2 }, { label: "Tue", completed: 24, cancelled: 1 },
  { label: "Wed", completed: 16, cancelled: 3 }, { label: "Thu", completed: 31, cancelled: 2 },
  { label: "Fri", completed: 38, cancelled: 1 }, { label: "Sat", completed: 47, cancelled: 4 }, { label: "Sun", completed: 41, cancelled: 2 },
];

const bestProducts = [
  { name: "Amul Milk 1L", sales: 142, revenue: 9088, trend: 12 },
  { name: "Britannia Bread 400g", sales: 98, revenue: 3430, trend: 8 },
  { name: "Maggi Noodles 12pk", sales: 87, revenue: 7656, trend: -3 },
  { name: "Lay's Chips 100g", sales: 74, revenue: 2072, trend: 5 },
  { name: "Colgate 150g", sales: 68, revenue: 7140, trend: 15 },
];

const worstProducts = [
  { name: "Haldiram's Namkeen", sales: 4, revenue: 480, trend: -42 },
  { name: "Tropicana 1L", sales: 6, revenue: 900, trend: -28 },
  { name: "Dove Shampoo 400ml", sales: 7, revenue: 1190, trend: -18 },
];

const topCustomers = [
  { name: "Priya Sharma", orders: 28, spent: "₹12,450", avatar: "PS" },
  { name: "Rahul Mehta", orders: 21, spent: "₹9,870", avatar: "RM" },
  { name: "Ananya Singh", orders: 19, spent: "₹8,230", avatar: "AS" },
  { name: "Vikram Nair", orders: 17, spent: "₹7,640", avatar: "VN" },
  { name: "Sneha Iyer", orders: 15, spent: "₹6,890", avatar: "SI" },
];

const pieData = [
  { name: "Completed", value: 215, color: "#10B981" },
  { name: "Pending", value: 18, color: "#F59E0B" },
  { name: "Cancelled", value: 12, color: "#EF4444" },
  { name: "Refunded", value: 5, color: "#8B5CF6" },
];

const peakHours = [
  { time: "7-9 AM", orders: 34 }, { time: "12-2 PM", orders: 58 }, { time: "6-9 PM", orders: 72 },
];

export function Analytics() {
  const [revPeriod, setRevPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");

  const totalRevenue = revenueData.monthly.reduce((s, d) => s + d.value, 0);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Top metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Revenue", value: "₹2,84,800", change: "+18%", up: true, icon: TrendingUp, color: "text-[#10B981]", bg: "bg-[#ECFDF5]" },
          { label: "Total Orders", value: "250", change: "+12%", up: true, icon: ShoppingBag, color: "text-[#3B82F6]", bg: "bg-[#EFF6FF]" },
          { label: "Avg Order Value", value: "₹1,139", change: "+5%", up: true, icon: TrendingUp, color: "text-[#8B5CF6]", bg: "bg-[#EDE9FE]" },
          { label: "Repeat Customers", value: "68%", change: "+3%", up: true, icon: Users, color: "text-[#F59E0B]", bg: "bg-[#FEF3C7]" },
        ].map((m, i) => {
          const Icon = m.icon;
          return (
            <div key={i} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-xl font-bold text-foreground mt-1">{m.value}</p>
                  <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${m.up ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                    {m.up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    {m.change} this month
                  </div>
                </div>
                <div className={`w-9 h-9 rounded-xl ${m.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${m.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Revenue chart */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground">Revenue Overview</h3>
            <p className="text-xs text-muted-foreground">Annual total: ₹{(totalRevenue / 100000).toFixed(1)}L</p>
          </div>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(["daily", "weekly", "monthly"] as const).map(p => (
              <button
                key={p}
                onClick={() => setRevPeriod(p)}
                className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${revPeriod === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={revenueData[revPeriod]}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12 }}
              formatter={(v: number) => [`₹${v.toLocaleString()}`, "Revenue"]}
            />
            <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} fill="url(#revGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Orders & Pie row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-foreground mb-1">Order Breakdown</h3>
          <p className="text-xs text-muted-foreground mb-4">Completed vs Cancelled this week</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={orderData} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="completed" fill="#10B981" radius={[4, 4, 0, 0]} name="Completed" />
              <Bar dataKey="cancelled" fill="#EF4444" radius={[4, 4, 0, 0]} name="Cancelled" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-foreground mb-1">Order Status Split</h3>
          <p className="text-xs text-muted-foreground mb-2">This month</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1 mt-2">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="text-[10px] text-muted-foreground">{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Products & Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Best selling */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#10B981]" /> Best Selling Products
            </h3>
            <div className="space-y-2.5">
              {bestProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-5 text-xs text-muted-foreground font-mono text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <div className={`flex items-center gap-1 text-xs font-medium ${p.trend > 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                        {p.trend > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {Math.abs(p.trend)}%
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-[#10B981] rounded-full" style={{ width: `${(p.sales / 150) * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-foreground">₹{p.revenue.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">{p.sales} sold</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Worst selling */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-[#EF4444]" /> Needs Attention
            </h3>
            <div className="space-y-2.5">
              {worstProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
                  <p className="text-sm text-foreground">{p.name}</p>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground">{p.sales} sold</span>
                    <span className="flex items-center gap-1 text-xs font-medium text-[#EF4444]">
                      <ArrowDown className="w-3 h-3" /> {Math.abs(p.trend)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right col */}
        <div className="space-y-4">
          {/* Top customers */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-[#F59E0B]" /> Top Customers
            </h3>
            <div className="space-y-3">
              {topCustomers.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {c.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.orders} orders</p>
                  </div>
                  <p className="text-xs font-semibold text-foreground shrink-0">{c.spent}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Peak order times */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#3B82F6]" /> Peak Order Times
            </h3>
            <div className="space-y-3">
              {peakHours.map((h, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-foreground">{h.time}</span>
                    <span className="text-muted-foreground">{h.orders} orders</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#3B82F6]"
                      style={{ width: `${(h.orders / 80) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="bg-[#ECFDF5] rounded-lg p-2 mt-2">
                <p className="text-xs font-medium text-[#065F46]">Peak day: Saturday</p>
                <p className="text-[10px] text-[#065F46]/70">47 avg orders · ₹11,200 avg revenue</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
