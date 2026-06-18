import React, { useState } from "react";
import { Search, Filter, Download, X, MapPin, Phone, Package, CreditCard, User, Bike, ChevronRight } from "lucide-react";

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  Pending: { bg: "bg-[#FEF3C7]", text: "text-[#92400E]", dot: "bg-[#F59E0B]" },
  Accepted: { bg: "bg-[#DBEAFE]", text: "text-[#1E40AF]", dot: "bg-[#3B82F6]" },
  Preparing: { bg: "bg-[#EDE9FE]", text: "text-[#5B21B6]", dot: "bg-[#8B5CF6]" },
  Packed: { bg: "bg-[#CFFAFE]", text: "text-[#164E63]", dot: "bg-[#06B6D4]" },
  "Ready For Pickup": { bg: "bg-[#DBEAFE]", text: "text-[#1E40AF]", dot: "bg-[#3B82F6]" },
  Delivered: { bg: "bg-[#D1FAE5]", text: "text-[#065F46]", dot: "bg-[#10B981]" },
  Cancelled: { bg: "bg-[#FEE2E2]", text: "text-[#991B1B]", dot: "bg-[#EF4444]" },
  Refunded: { bg: "bg-[#FEF3C7]", text: "text-[#92400E]", dot: "bg-[#F97316]" },
};

const orders = [
  {
    id: "ORD-4821", customer: "Priya Sharma", phone: "+91 98765 43210", amount: "₹348", paymentStatus: "Paid", orderStatus: "Preparing",
    date: "Today, 11:42 AM", address: "12, Green Meadows, Koramangala, Bangalore - 560034",
    items: [
      { name: "Amul Milk 1L", qty: 2, price: "₹64" },
      { name: "Britannia Bread", qty: 1, price: "₹35" },
      { name: "Lay's Chips 100g", qty: 3, price: "₹60" },
      { name: "Colgate 150g", qty: 1, price: "₹105" },
    ],
    rider: "Suresh Kumar · +91 90000 12345",
    paymentMethod: "UPI · Google Pay",
  },
  {
    id: "ORD-4820", customer: "Rahul Mehta", phone: "+91 87654 32109", amount: "₹512", paymentStatus: "Paid", orderStatus: "Pending",
    date: "Today, 11:28 AM", address: "45, HSR Layout Sector 3, Bangalore - 560102",
    items: [
      { name: "Eggs (12 pcs)", qty: 2, price: "₹190" },
      { name: "Maggi Noodles 12pk", qty: 1, price: "₹192" },
      { name: "Dettol Soap 75g", qty: 2, price: "₹130" },
    ],
    rider: "Unassigned",
    paymentMethod: "Card · HDFC",
  },
  {
    id: "ORD-4819", customer: "Ananya Singh", phone: "+91 76543 21098", amount: "₹224", paymentStatus: "Paid", orderStatus: "Delivered",
    date: "Today, 10:55 AM", address: "88, Indiranagar 7th Cross, Bangalore - 560038",
    items: [
      { name: "Parle-G 800g", qty: 2, price: "₹60" },
      { name: "Sunflower Oil 1L", qty: 1, price: "₹164" },
    ],
    rider: "Ramesh D · +91 90111 22334",
    paymentMethod: "UPI · PhonePe",
  },
  {
    id: "ORD-4818", customer: "Vikram Nair", phone: "+91 65432 10987", amount: "₹780", paymentStatus: "Paid", orderStatus: "Packed",
    date: "Today, 10:12 AM", address: "23, Whitefield Main Road, Bangalore - 560066",
    items: [
      { name: "Basmati Rice 5kg", qty: 1, price: "₹480" },
      { name: "Toor Dal 1kg", qty: 2, price: "₹300" },
    ],
    rider: "Kiran M · +91 90222 33445",
    paymentMethod: "COD",
  },
  {
    id: "ORD-4817", customer: "Deepika Patel", phone: "+91 54321 09876", amount: "₹156", paymentStatus: "Paid", orderStatus: "Delivered",
    date: "Today, 9:30 AM", address: "7, BTM Layout 2nd Stage, Bangalore - 560076",
    items: [
      { name: "Dove Shampoo 180ml", qty: 1, price: "₹156" },
    ],
    rider: "Sanjay B · +91 90333 44556",
    paymentMethod: "UPI · Paytm",
  },
  {
    id: "ORD-4816", customer: "Arjun Reddy", phone: "+91 43210 98765", amount: "₹420", paymentStatus: "Pending", orderStatus: "Cancelled",
    date: "Today, 8:48 AM", address: "156, Jayanagar 4th Block, Bangalore - 560041",
    items: [
      { name: "Fresh Vegetables Box", qty: 1, price: "₹280" },
      { name: "Amul Butter 500g", qty: 1, price: "₹140" },
    ],
    rider: "Unassigned",
    paymentMethod: "UPI · Google Pay",
  },
  {
    id: "ORD-4815", customer: "Sneha Iyer", phone: "+91 32109 87654", amount: "₹895", paymentStatus: "Paid", orderStatus: "Delivered",
    date: "Yesterday, 7:15 PM", address: "34, Electronic City Phase 1, Bangalore - 560100",
    items: [
      { name: "Kissan Jam 500g", qty: 2, price: "₹270" },
      { name: "Haldiram's Namkeen", qty: 3, price: "₹315" },
      { name: "Tropicana 1L", qty: 2, price: "₹310" },
    ],
    rider: "Praveen K · +91 90444 55667",
    paymentMethod: "Card · Axis",
  },
  {
    id: "ORD-4814", customer: "Karthik Raj", phone: "+91 21098 76543", amount: "₹230", paymentStatus: "Refunded", orderStatus: "Refunded",
    date: "Yesterday, 4:22 PM", address: "78, Yelahanka New Town, Bangalore - 560064",
    items: [
      { name: "Fortune Atta 5kg", qty: 1, price: "₹230" },
    ],
    rider: "Unassigned",
    paymentMethod: "UPI · Google Pay",
  },
];

const tabs = ["All", "Pending", "Accepted", "Preparing", "Packed", "Delivered", "Cancelled"];

const actionButtons: Record<string, { label: string; color: string }[]> = {
  Pending: [
    { label: "Accept", color: "bg-[#10B981] hover:bg-[#059669] text-white" },
    { label: "Reject", color: "bg-[#EF4444] hover:bg-[#DC2626] text-white" },
  ],
  Accepted: [
    { label: "Mark Preparing", color: "bg-[#8B5CF6] hover:bg-[#7C3AED] text-white" },
  ],
  Preparing: [
    { label: "Mark Packed", color: "bg-[#06B6D4] hover:bg-[#0891B2] text-white" },
  ],
  Packed: [
    { label: "Mark Ready", color: "bg-[#3B82F6] hover:bg-[#2563EB] text-white" },
  ],
};

export function Orders() {
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<typeof orders[0] | null>(null);
  const [orderStatuses, setOrderStatuses] = useState<Record<string, string>>(() =>
    Object.fromEntries(orders.map(o => [o.id, o.orderStatus]))
  );

  const filtered = orders.filter(o => {
    const matchTab = activeTab === "All" || orderStatuses[o.id] === activeTab;
    const matchSearch = o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const handleAction = (orderId: string, action: string) => {
    const next: Record<string, string> = {
      Accept: "Accepted",
      Reject: "Cancelled",
      "Mark Preparing": "Preparing",
      "Mark Packed": "Packed",
      "Mark Ready": "Ready For Pickup",
    };
    if (next[action]) {
      setOrderStatuses(prev => ({ ...prev, [orderId]: next[action] }));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, orderStatus: next[action] } : null);
      }
    }
  };

  return (
    <div className="p-4 lg:p-6">
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by order ID or customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-card text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
          />
        </div>
        <div className="flex gap-2">
          <button className="h-9 px-3 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors">
            <Filter className="w-4 h-4" /> Filter
          </button>
          <button className="h-9 px-3 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === tab
                ? "bg-[#10B981] text-white shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
            <span className="ml-1.5 opacity-70">
              {tab === "All" ? orders.length : orders.filter(o => orderStatuses[o.id] === tab).length}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Order ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Payment</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(order => {
                const status = orderStatuses[order.id];
                const s = statusColors[status] || statusColors.Pending;
                const actions = actionButtons[status] || [];
                return (
                  <tr
                    key={order.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="font-mono text-xs text-[#10B981] hover:underline font-medium flex items-center gap-1"
                      >
                        {order.id} <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{order.customer}</p>
                      <p className="text-xs text-muted-foreground">{order.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground">{order.amount}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        order.paymentStatus === "Paid" ? "bg-[#D1FAE5] text-[#065F46]" :
                        order.paymentStatus === "Pending" ? "bg-[#FEF3C7] text-[#92400E]" :
                        "bg-[#FEE2E2] text-[#991B1B]"
                      }`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${s.bg} ${s.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{order.date}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        {actions.map(a => (
                          <button
                            key={a.label}
                            onClick={() => handleAction(order.id, a.label)}
                            className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${a.color}`}
                          >
                            {a.label}
                          </button>
                        ))}
                        {actions.length === 0 && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    No orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelectedOrder(null)} />
          <div className="w-full max-w-md bg-card border-l border-border overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-mono text-xs text-muted-foreground">{selectedOrder.id}</p>
                <h2 className="font-semibold text-foreground">Order Details</h2>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                {(() => {
                  const status = orderStatuses[selectedOrder.id];
                  const s = statusColors[status] || statusColors.Pending;
                  return (
                    <span className={`inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full font-medium ${s.bg} ${s.text}`}>
                      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                      {status}
                    </span>
                  );
                })()}
                <span className="text-xs text-muted-foreground">{selectedOrder.date}</span>
              </div>

              {/* Customer */}
              <div className="bg-muted/40 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer</p>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{selectedOrder.customer}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{selectedOrder.phone}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground">{selectedOrder.address}</span>
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" /> Ordered Items
                </p>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.qty}</p>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{item.price}</p>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-1">
                    <p className="text-sm font-bold text-foreground">Total</p>
                    <p className="text-sm font-bold text-[#10B981]">{selectedOrder.amount}</p>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="bg-muted/40 rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment</p>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{selectedOrder.paymentMethod}</span>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                    selectedOrder.paymentStatus === "Paid" ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#FEF3C7] text-[#92400E]"
                  }`}>{selectedOrder.paymentStatus}</span>
                </div>
              </div>

              {/* Rider */}
              <div className="bg-muted/40 rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assigned Rider</p>
                <div className="flex items-center gap-2">
                  <Bike className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{selectedOrder.rider}</span>
                </div>
              </div>

              {/* Actions */}
              {(() => {
                const status = orderStatuses[selectedOrder.id];
                const actions = actionButtons[status] || [];
                return actions.length > 0 ? (
                  <div className="flex gap-2 pt-2">
                    {actions.map(a => (
                      <button
                        key={a.label}
                        onClick={() => handleAction(selectedOrder.id, a.label)}
                        className={`flex-1 h-10 rounded-lg text-sm font-medium transition-colors ${a.color}`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
