import React, { useState, useEffect } from "react";
import { Search, Filter, Download, X, MapPin, Phone, Package, CreditCard, User, Bike, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase"; 

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
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const formatStatusString = (rawStatus: string): string => {
    if (!rawStatus) return "Pending";
    const formatted = rawStatus.trim().toLowerCase();
    if (formatted === "ready_for_pickup" || formatted === "ready for pickup") return "Ready For Pickup";
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const fetchLiveOrders = async () => {
    try {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return;

      // Relational Select: Fetch order_items AND pull structural order details from the parent table link
      const { data: itemsData, error } = await supabase
        .from("order_items")
        .select(`
          id,
          order_id,
          quantity,
          price,
          fulfillment_status,
          created_at,
          products (
            name
          ),
          orders (
            id,
            customer_id,
            subtotal,
            delivery_fee,
            total_amount,
            payment_method,
            payment_status,
            delivery_address,
            vendor_name,
            customers (
              name,
              phone
            )
          )
        `)
        .eq("vendor_id", authData.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (itemsData) {
        const groupedOrders: Record<string, any> = {};

        itemsData.forEach((item: any) => {
          const oId = item.order_id || "UNKNOWN";
          const parentOrder = item.orders || {};
          const customerProfile = parentOrder.customers || {};
          
          const rawPrice = Number(item.price || 0);
          const rawQty = Number(item.quantity || 1);
          const currentStatus = formatStatusString(item.fulfillment_status);

          if (!groupedOrders[oId]) {
            groupedOrders[oId] = {
              id: oId,
              customer: customerProfile.name || parentOrder.vendor_name || "Store Customer",
              phone: customerProfile.phone || "—",
              totalAmount: 0, // Recalculated dynamically based on vendor item allocation split
              paymentStatus: parentOrder.payment_status || "Paid", 
              orderStatus: currentStatus,
              date: item.created_at ? new Date(item.created_at).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit"
              }) : "Just Now",
              address: parentOrder.delivery_address || "Customer Delivery Address",
              items: [],
              rider: "Unassigned",
              paymentMethod: parentOrder.payment_method || "Online Payment",
            };
          }

          groupedOrders[oId].totalAmount += rawPrice * rawQty;
          groupedOrders[oId].items.push({
            name: item.products?.name || "Product Item",
            qty: rawQty,
            price: `₹${rawPrice.toLocaleString("en-IN")}`
          });
        });

        setOrdersList(Object.values(groupedOrders));
      }
    } catch (err) {
      console.error("Exception experienced fetching active order items loop:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveOrders();
  }, []);

  const handleAction = async (orderId: string, action: string) => {
    const statusMap: Record<string, string> = {
      Accept: "accepted",
      Reject: "cancelled",
      "Mark Preparing": "preparing",
      "Mark Packed": "packed",
      "Mark Ready": "ready_for_pickup",
    };

    const nextDbStatus = statusMap[action];
    if (!nextDbStatus) return;

    try {
      setActionLoading(`${orderId}-${action}`);
      
      // Update the backend record field
      const { error } = await supabase
        .from("order_items")
        .update({ fulfillment_status: nextDbStatus })
        .eq("order_id", orderId);

      if (error) throw error;

      // Sync application memory structures instantly
      setOrdersList(prevList => 
        prevList.map(order => 
          order.id === orderId 
            ? { ...order, orderStatus: formatStatusString(nextDbStatus) } 
            : order
        )
      );

      // Re-map active side sheet drawers if open
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev: any | null) => prev ? { ...prev, orderStatus: formatStatusString(nextDbStatus) } : null);
      }

    } catch (err) {
      console.error("Failed to commit status pipeline transaction changes:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = ordersList.filter(o => {
    const matchTab = activeTab === "All" || o.orderStatus === activeTab;
    const matchSearch = o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-sm text-muted-foreground gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-[#10B981]" />
        <span>Syncing incoming order flows...</span>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 bg-background text-foreground min-h-screen">
      {/* Header Actions */}
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

      {/* Navigation Filter Tabs */}
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
              {tab === "All" ? ordersList.length : ordersList.filter(o => o.orderStatus === tab).length}
            </span>
          </button>
        ))}
      </div>

      {/* Main Data Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
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
                const status = order.orderStatus;
                const s = statusColors[status] || statusColors.Pending;
                const actions = actionButtons[status] || [];
                return (
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="font-mono text-xs text-[#10B981] hover:underline font-semibold flex items-center gap-0.5"
                      >
                        {order.id.slice(0, 8).toUpperCase()} <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{order.customer}</p>
                      <p className="text-xs text-muted-foreground">{order.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground">₹{order.totalAmount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        order.paymentStatus === "Paid" ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#FEF3C7] text-[#92400E]"
                      }`}>{order.paymentStatus}</span>
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
                        {actions.map(a => {
                          const isBtnLoading = actionLoading === `${order.id}-${a.label}`;
                          return (
                            <button
                              key={a.label}
                              disabled={actionLoading !== null}
                              onClick={() => handleAction(order.id, a.label)}
                              className={`text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1 transition-colors disabled:opacity-40 ${a.color}`}
                            >
                              {isBtnLoading && <Loader2 className="w-3 h-3 anonymity-spin animate-spin" />}
                              {a.label}
                            </button>
                          );
                        })}
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

      {/* Side Slide Drawer Panel */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
          <div className="w-full max-w-md bg-card border-l border-border overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between z-10">
              <div>
                <p className="font-mono text-xs text-muted-foreground">{selectedOrder.id.toUpperCase()}</p>
                <h2 className="font-semibold text-foreground">Order Details</h2>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted border border-transparent hover:border-border transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                {(() => {
                  const status = selectedOrder.orderStatus;
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

              {/* Customer Info Box */}
              <div className="bg-muted/40 border border-border/50 rounded-xl p-3 space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Customer Info</p>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{selectedOrder.customer}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedOrder.phone}</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-foreground">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span>{selectedOrder.address}</span>
                </div>
              </div>

              {/* Dynamic Summary List */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-[#10B981]" /> Ordered Items
                </p>
                <div className="space-y-1 bg-muted/20 border border-border/40 rounded-xl p-3">
                  {selectedOrder.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-border/40 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.qty}</p>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{item.price}</p>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-3 border-t border-border mt-2">
                    <p className="text-sm font-bold text-foreground">Total Payout</p>
                    <p className="text-base font-black text-[#10B981]">₹{selectedOrder.totalAmount.toLocaleString("en-IN")}</p>
                  </div>
                </div>
              </div>

              {/* Payout Channels */}
              <div className="bg-muted/40 border border-border/50 rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Payment Status</p>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedOrder.paymentMethod}</span>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                    selectedOrder.paymentStatus === "Paid" ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#FEF3C7] text-[#92400E]"
                  }`}>{selectedOrder.paymentStatus}</span>
                </div>
              </div>

              {/* Fleet Deliveries */}
              <div className="bg-muted/40 border border-border/50 rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Assigned Rider</p>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Bike className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedOrder.rider}</span>
                </div>
              </div>

              {/* Interactive Drawer Action Controls */}
              {(() => {
                const status = selectedOrder.orderStatus;
                const actions = actionButtons[status] || [];
                return actions.length > 0 ? (
                  <div className="flex gap-2 pt-2">
                    {actions.map(a => {
                      const isBtnLoading = actionLoading === `${selectedOrder.id}-${a.label}`;
                      return (
                        <button
                          key={a.label}
                          disabled={actionLoading !== null}
                          onClick={() => handleAction(selectedOrder.id, a.label)}
                          className={`flex-1 h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 ${a.color}`}
                        >
                          {isBtnLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                          {a.label}
                        </button>
                      );
                    })}
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