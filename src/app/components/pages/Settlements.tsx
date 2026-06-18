import React, { useState } from "react";
import { Wallet, Clock, CheckCircle, Download, Filter, Calendar, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const settlements = [
  { id: "SET-2401", orders: 147, amount: "₹68,420", status: "Paid", date: "Dec 15, 2024", period: "Dec 8–14, 2024", utr: "UTR24121500847" },
  { id: "SET-2400", orders: 132, amount: "₹61,850", status: "Paid", date: "Dec 8, 2024", period: "Dec 1–7, 2024", utr: "UTR24120800341" },
  { id: "SET-2399", orders: 118, amount: "₹55,240", status: "Paid", date: "Dec 1, 2024", period: "Nov 24–30, 2024", utr: "UTR24120100129" },
  { id: "SET-2398", orders: 124, amount: "₹58,920", status: "Paid", date: "Nov 24, 2024", period: "Nov 17–23, 2024", utr: "UTR24112400782" },
  { id: "SET-2397", orders: 0, amount: "₹38,200", status: "Pending", date: "Expected Dec 22", period: "Dec 15–21, 2024", utr: "—" },
  { id: "SET-2396", orders: 98, amount: "₹46,110", status: "Paid", date: "Nov 17, 2024", period: "Nov 10–16, 2024", utr: "UTR24111700451" },
];

const trendData = [
  { week: "W1 Nov", amount: 52000 }, { week: "W2 Nov", amount: 58920 }, { week: "W3 Nov", amount: 46110 },
  { week: "W4 Nov", amount: 55240 }, { week: "W1 Dec", amount: 61850 }, { week: "W2 Dec", amount: 68420 }, { week: "W3 Dec", amount: 38200 },
];

const statusStyle: Record<string, string> = {
  Paid: "bg-[#D1FAE5] text-[#065F46]",
  Pending: "bg-[#FEF3C7] text-[#92400E]",
  Processing: "bg-[#DBEAFE] text-[#1E40AF]",
};

export function Settlements() {
  const [filter, setFilter] = useState("All");

  const totalEarned = settlements.filter(s => s.status === "Paid").reduce((sum, s) => sum + parseInt(s.amount.replace(/[^0-9]/g, "")), 0);
  const pending = settlements.filter(s => s.status === "Pending").reduce((sum, s) => sum + parseInt(s.amount.replace(/[^0-9]/g, "")), 0);
  const paid = totalEarned;

  const filtered = filter === "All" ? settlements : settlements.filter(s => s.status === filter);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] flex items-center justify-center">
              <Wallet className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Earnings</p>
              <p className="text-xl font-bold text-foreground">₹{(paid / 1000).toFixed(0)}K</p>
              <p className="text-xs text-[#10B981] flex items-center gap-1 mt-0.5">
                <TrendingUp className="w-3 h-3" /> +18% this month
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending Settlement</p>
              <p className="text-xl font-bold text-foreground">₹{pending.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Expected Dec 22, 2024</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Paid This Month</p>
              <p className="text-xl font-bold text-foreground">₹1,30,270</p>
              <p className="text-xs text-muted-foreground mt-0.5">2 settlements</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trend chart */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="font-semibold text-foreground mb-1">Settlement Trend</h3>
        <p className="text-xs text-muted-foreground mb-4">Weekly settlement amounts</p>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="settleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="week" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 11 }}
              formatter={(v: number) => [`₹${v.toLocaleString()}`, "Settlement"]}
            />
            <Area type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={2} fill="url(#settleGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Settlement History</h3>
          <div className="flex gap-2">
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {["All", "Paid", "Pending"].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${filter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button className="h-8 px-3 rounded-lg border border-border bg-card text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Settlement ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Period</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Orders</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">UTR</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[#10B981] font-medium">{s.id}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {s.period}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{s.orders || "—"}</td>
                    <td className="px-4 py-3 text-sm font-bold text-foreground">{s.amount}</td>
                    <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{s.utr}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{s.date}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle[s.status]}`}>{s.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {s.status === "Paid" ? (
                        <button className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-[#10B981] hover:bg-[#ECFDF5] transition-all">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
