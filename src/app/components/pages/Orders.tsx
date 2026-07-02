import React, { useState, useEffect } from "react";
import { Search, Filter, Download, X, MapPin, Phone, Package, CreditCard, User, Bike, ChevronRight, Loader2, RefreshCw, Smartphone, Star, CheckCircle, Clock } from "lucide-react";
import { supabase } from "../../../lib/supabase"; 

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  Pending: { bg: "bg-[#FEF3C7]", text: "text-[#92400E]", dot: "bg-[#F59E0B]" },
  Accepted: { bg: "bg-[#DBEAFE]", text: "text-[#1E40AF]", dot: "bg-[#3B82F6]" },
  Preparing: { bg: "bg-[#EDE9FE]", text: "text-[#5B21B6]", dot: "bg-[#8B5CF6]" },
  Packed: { bg: "bg-[#CFFAFE]", text: "text-[#164E63]", dot: "bg-[#06B6D4]" },
  "Ready For Pickup": { bg: "bg-[#DBEAFE]", text: "text-[#1E40AF]", dot: "bg-[#3B82F6]" },
  "Waiting Rider": { bg: "bg-[#FEF3C7]", text: "text-[#92400E]", dot: "bg-[#F59E0B]" },
  "Out For Delivery": { bg: "bg-[#DBEAFE]", text: "text-[#1E40AF]", dot: "bg-[#3B82F6]" },
  Delivered: { bg: "bg-[#D1FAE5]", text: "text-[#065F46]", dot: "bg-[#10B981]" },
  Cancelled: { bg: "bg-[#FEE2E2]", text: "text-[#991B1B]", dot: "bg-[#EF4444]" },
  Refunded: { bg: "bg-[#FEF3C7]", text: "text-[#92400E]", dot: "bg-[#F97316]" },
};

const tabs = ["All", "Pending", "Accepted", "Preparing", "Packed", "Out For Delivery", "Delivered", "Cancelled"];

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
  "Out For Delivery": [
    { label: "Mark Delivered", color: "bg-[#10B981] hover:bg-[#059669] text-white" },
  ],
};

const timelineStages = ["Pending", "Accepted", "Preparing", "Packed", "Out For Delivery", "Delivered"];

export function Orders() {
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Confirmation Modal State
  const [confirmData, setConfirmData] = useState<{ orderId: string; action: string; visible: boolean } | null>(null);

  // Rider Overview Metrics State (Scoped strictly to Vendor Fleet assignments)
  const [riderMetrics, setRiderMetrics] = useState({
    available: 0,
    busy: 0,
    outForDelivery: 0
  });

  const formatStatusString = (rawStatus: string): string => {
    if (!rawStatus) return "Pending";
    const formatted = rawStatus.trim().toLowerCase();
    if (formatted === "ready_for_pickup" || formatted === "ready for pickup") return "Ready For Pickup";
    if (formatted === "waiting_rider") return "Waiting Rider";
    if (formatted === "out_for_delivery") return "Out For Delivery";
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const fetchLiveOrders = async () => {
    try {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return;

      // 1. Resolve exact internal vendor primary key ID map using auth context uuid link
      const { data: vendorProfile, error: vendorErr } = await supabase
        .from("vendors")
        .select("id")
        .eq("auth_user_id", authData.user.id)
        .single();

      if (vendorErr || !vendorProfile) throw new Error("Could not resolve vendor context profile configuration.");
      const currentVendorId = vendorProfile.id;

      // 2. Fetch all matching order items mapped strictly to this specific logged-in vendor identity
      const { data: itemsData, error } = await supabase
        .from("order_items")
        .select(`
          id,
          order_id,
          product_id,
          quantity,
          unit_price,
          total_price,
          products (
            name
          ),
          orders (
            id,
            order_number,
            customer_id,
            vendor_id,
            rider_id,
            subtotal,
            delivery_fee,
            total_amount,
            payment_status,
            order_status,
            created_at,
            customers (
              customer_name,
              phone,
              email
            ),
            riders (
              id,
              rider_name,
              phone,
              vehicle_type,
              location_area,
              orders_completed,
              rating,
              availability_status
            )
          )
        `)
        .eq("orders.vendor_id", currentVendorId);

      if (error) throw error;

      let processedOrders: any[] = [];

      if (itemsData) {
        const groupedOrders: Record<string, any> = {};

        itemsData.forEach((item: any) => {
          if (!item.orders) return;

          const oId = item.order_id || "UNKNOWN";
          const parentOrder = item.orders;
          const customerProfile = parentOrder.customers || {};
          const riderProfile = parentOrder.riders || null;
          
          const rawPrice = Number(item.unit_price || 0); 
          const rawQty = Number(item.quantity || 1);
          const currentStatus = formatStatusString(parentOrder.order_status);

          if (!groupedOrders[oId]) {
            groupedOrders[oId] = {
              id: oId,
              orderNumber: parentOrder.order_number || "—",
              customer: customerProfile.customer_name || "Store Customer",
              phone: customerProfile.phone || "—",
              email: customerProfile.email || "—",
              totalAmount: 0, 
              paymentStatus: parentOrder.payment_status || "Pending", 
              orderStatus: currentStatus,
              date: parentOrder.created_at ? new Date(parentOrder.created_at).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit"
              }) : "Just Now",
              address: "Customer Delivery Address", 
              items: [],
              rider: riderProfile ? {
                id: riderProfile.id,
                name: riderProfile.rider_name || "—",
                phone: riderProfile.phone || "",
                vehicleType: riderProfile.vehicle_type || "Bike",
                locationArea: riderProfile.location_area || "General Area",
                rating: riderProfile.rating || "0.0",
                ordersCompleted: riderProfile.orders_completed || 0,
                status: riderProfile.availability_status || "offline"
              } : null,
            };
          }

          groupedOrders[oId].totalAmount += Number(item.total_price || (rawPrice * rawQty));
          groupedOrders[oId].items.push({
            name: item.products?.name || "Product Item",
            qty: rawQty,
            price: `₹${rawPrice.toLocaleString("en-IN")}`,
            unitPrice: `₹${rawPrice.toLocaleString("en-IN")}`,
            totalPrice: `₹${Number(item.total_price || (rawPrice * rawQty)).toLocaleString("en-IN")}`
          });
        });

        processedOrders = Object.values(groupedOrders).sort((a: any, b: any) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        setOrdersList(processedOrders);

        // Synchronize state for the currently opened slide panel context if it exists
        if (selectedOrder) {
          const freshDetails = processedOrders.find(o => o.id === selectedOrder.id);
          if (freshDetails) {
            setSelectedOrder(freshDetails);
          }
        }
      }

      // 3. Resolve Scoped Rider Fleet Overview metrics strictly tied via assignments mapping
      const { data: assignments, error: assignErr } = await supabase
        .from("rider_vendor_assignments")
        .select("rider_id")
        .eq("vendor_id", currentVendorId);

      if (!assignErr && assignments && assignments.length > 0) {
        const targetRiderIds = assignments.map(a => a.rider_id);

        const { data: vendorFleetRiders, error: fleetErr } = await supabase
          .from("riders")
          .select("availability_status")
          .in("id", targetRiderIds);

        if (!fleetErr && vendorFleetRiders) {
          const availableCount = vendorFleetRiders.filter(
            r => r.availability_status === "available" || r.availability_status === "active"
          ).length;

          const busyCount = vendorFleetRiders.filter(
            r => r.availability_status === "busy" || r.availability_status === "out_for_delivery"
          ).length;

          const liveOutForDelivery = processedOrders.filter(o => o.orderStatus === "Packed" || o.orderStatus === "Out For Delivery").length;

          setRiderMetrics({
            available: availableCount,
            busy: busyCount,
            outForDelivery: liveOutForDelivery
          });
        }
      } else {
        setRiderMetrics({ available: 0, busy: 0, outForDelivery: 0 });
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

  const triggerActionConfirmation = (orderId: string, action: string) => {
    setConfirmData({ orderId, action, visible: true });
  };

  const handleAction = async () => {
    if (!confirmData) return;
    const { orderId, action } = confirmData;
    setConfirmData(null);

    try {
      setActionLoading(`${orderId}-${action}`);

      let nextDbStatus = "";

      if (action === "Mark Packed") {
        const { data: orderData, error: orderFetchErr } = await supabase
          .from("orders")
          .select("vendor_id")
          .eq("id", orderId)
          .single();

        if (orderFetchErr || !orderData) throw orderFetchErr || new Error("Failed to resolve order data details.");

        const { data: assignedRiders, error: riderErr } = await supabase
          .from("rider_vendor_assignments")
          .select(`
            rider_id,
            riders!inner (
              id,
              status,
              availability_status
            )
          `)
          .eq("vendor_id", orderData.vendor_id)
          .eq("riders.status", "active")
          .eq("riders.availability_status", "available");

        if (riderErr) throw riderErr;

        if (assignedRiders && assignedRiders.length > 0) {
          const selectedRiderId = assignedRiders[0].rider_id;
          nextDbStatus = "out_for_delivery";

          const { error: orderUpdateErr } = await supabase
            .from("orders")
            .update({ order_status: nextDbStatus, rider_id: selectedRiderId })
            .eq("id", orderId);

          if (orderUpdateErr) throw orderUpdateErr;

          const { error: riderUpdateErr } = await supabase
            .from("riders")
            .update({ availability_status: "busy" })
            .eq("id", selectedRiderId);

          if (riderUpdateErr) throw riderUpdateErr;
        } else {
          nextDbStatus = "waiting_rider";

          const { error: orderUpdateErr } = await supabase
            .from("orders")
            .update({ order_status: nextDbStatus })
            .eq("id", orderId);

          if (orderUpdateErr) throw orderUpdateErr;
        }
      } else if (action === "Mark Delivered") {
        nextDbStatus = "delivered";

        // Find current rider context parameters from state before updating
        const currentOrderContext = ordersList.find(o => o.id === orderId);

        const { error: orderUpdateErr } = await supabase
          .from("orders")
          .update({ order_status: nextDbStatus })
          .eq("id", orderId);

        if (orderUpdateErr) throw orderUpdateErr;

        if (currentOrderContext?.rider?.id) {
          const { error: riderUpdateErr } = await supabase
            .from("riders")
            .update({ availability_status: "available" })
            .eq("id", currentOrderContext.rider.id);

          if (riderUpdateErr) throw riderUpdateErr;
        }
      } else {
        const statusMap: Record<string, string> = {
          Accept: "accepted",
          Reject: "cancelled",
          "Mark Preparing": "preparing",
        };

        nextDbStatus = statusMap[action];
        if (!nextDbStatus) return;

        const { error } = await supabase
          .from("orders")
          .update({ order_status: nextDbStatus })
          .eq("id", orderId);

        if (error) throw error;
      }

      // Automatically triggers internal matching and drawer detail synchronization
      await fetchLiveOrders();

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
      
      {/* Rider Overview Widget */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available Riders</p>
            <h3 className="text-2xl font-bold text-[#10B981] mt-1">{riderMetrics.available}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#D1FAE5] flex items-center justify-center text-[#065F46]">
            <Bike className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Busy Riders</p>
            <h3 className="text-2xl font-bold text-[#F59E0B] mt-1">{riderMetrics.busy}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#FEF3C7] flex items-center justify-center text-[#92400E]">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Orders Out For Delivery</p>
            <h3 className="text-2xl font-bold text-[#3B82F6] mt-1">{riderMetrics.outForDelivery}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#DBEAFE] flex items-center justify-center text-[#1E40AF]">
            <Package className="w-5 h-5" />
          </div>
        </div>
      </div>

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
          <button onClick={fetchLiveOrders} className="h-9 px-3 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
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
              ({tab === "All" ? ordersList.length : ordersList.filter(o => o.orderStatus === tab).length})
            </span>
          </button>
        ))}
      </div>

      {/* Main Data Table Area */}
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
                        order.paymentStatus === "Paid" || order.paymentStatus === "completed" ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#FEF3C7] text-[#92400E]"
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
                              onClick={() => triggerActionConfirmation(order.id, a.label)}
                              className={`text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1 transition-colors disabled:opacity-40 ${a.color}`}
                            >
                              {isBtnLoading && <Loader2 className="w-3 h-3 animate-spin" />}
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
                    <div className="flex flex-col items-center justify-center p-6 gap-3">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <Package className="w-8 h-8" />
                      </div>
                      <h4 className="text-base font-semibold text-foreground">No Orders Yet</h4>
                      <p className="text-xs max-w-xs mx-auto text-muted-foreground">
                        Orders from customers will appear here once your store starts receiving orders.
                      </p>
                      <button onClick={fetchLiveOrders} className="mt-2 h-9 px-4 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm">
                        <RefreshCw className="w-3.5 h-3.5" /> Refresh Portal
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal Overlay */}
      {confirmData?.visible && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-xl p-5 max-w-sm w-full shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-base font-bold text-foreground">
                {confirmData.action === "Mark Delivered" ? "Confirm Delivery" : "Confirm Action Update"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {confirmData.action === "Mark Delivered" 
                  ? "Has the customer received the order successfully?" 
                  : `Are you sure you want to change this order pipeline milestone state to "${confirmData.action}"?`}
              </p>
            </div>
            <div className="flex justify-end gap-2 text-xs font-semibold">
              <button onClick={() => setConfirmData(null)} className="h-9 px-4 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground">
                Cancel
              </button>
              <button onClick={handleAction} className="h-9 px-4 rounded-md bg-[#10B981] hover:bg-[#059669] text-white shadow-sm">
                {confirmData.action === "Mark Delivered" ? "Confirm Delivery" : "Confirm Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Side Slide Drawer Panel */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-xs" onClick={() => setSelectedOrder(null)} />
          <div className="w-full max-w-md bg-card border-l border-border overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between z-10">
              <div>
                <p className="font-mono text-xs text-muted-foreground">Order Ref: #{selectedOrder.orderNumber}</p>
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

              {/* Enhanced Progress Timeline */}
              <div className="bg-muted/20 border border-border/60 rounded-xl p-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Order Progress Timeline</p>
                <div className="flex items-center justify-between relative">
                  {timelineStages.map((stage, idx) => {
                    const currentIdx = timelineStages.indexOf(selectedOrder.orderStatus);
                    const isCompleted = idx <= currentIdx && selectedOrder.orderStatus !== "Cancelled";
                    const isCurrent = stage === selectedOrder.orderStatus;

                    return (
                      <div key={stage} className="flex flex-col items-center flex-1 relative z-10">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                          isCurrent 
                            ? "bg-[#10B981] text-white ring-4 ring-[#10B981]/20" 
                            : isCompleted 
                              ? "bg-[#D1FAE5] text-[#065F46]" 
                              : "bg-muted text-muted-foreground border border-border"
                        }`}>
                          {isCompleted ? <CheckCircle className="w-3.5 h-3.5" /> : idx + 1}
                        </div>
                        <span className={`text-[10px] mt-1 font-medium tracking-tight ${isCurrent ? "text-foreground font-bold" : "text-muted-foreground"}`}>
                          {stage}
                        </span>
                      </div>
                    );
                  })}
                  <div className="absolute top-3 left-0 right-0 h-0.5 bg-muted -z-0" />
                </div>
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
                <div className="flex items-center gap-2 text-xs text-muted-foreground pl-6">
                  <span>Email: {selectedOrder.email}</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-foreground">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span>{selectedOrder.address}</span>
                </div>
              </div>

              {/* Itemized Summary List */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-[#10B981]" /> Ordered Items
                </p>
                <div className="space-y-1 bg-muted/20 border border-border/40 rounded-xl p-3">
                  {selectedOrder.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-border/40 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.qty} × {item.unitPrice}</p>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{item.totalPrice}</p>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-3 border-t border-border mt-2">
                    <p className="text-sm font-bold text-foreground">Total Payout</p>
                    <p className="text-base font-black text-[#10B981]">₹{selectedOrder.totalAmount.toLocaleString("en-IN")}</p>
                  </div>
                </div>
              </div>

              {/* Payment Summary Info Area */}
              <div className="bg-muted/40 border border-border/50 rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Payment Summary</p>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <span>Settlement State:</span>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                    selectedOrder.paymentStatus === "Paid" || selectedOrder.paymentStatus === "completed" ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#FEF3C7] text-[#92400E]"
                  }`}>{selectedOrder.paymentStatus}</span>
                </div>
              </div>

              {/* Fleet Rider Dashboard Widget */}
              <div className="bg-muted/40 border border-border/50 rounded-xl p-3 space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Bike className="w-3.5 h-3.5 text-[#3B82F6]" /> Assigned Fleet Logistics
                </p>
                {selectedOrder.rider ? (
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-foreground">{selectedOrder.rider.name}</h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <span className="capitalize">{selectedOrder.rider.vehicleType}</span> • <span>{selectedOrder.rider.locationArea}</span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-semibold text-foreground flex items-center gap-0.5 bg-[#FEF3C7] text-[#92400E] px-1.5 py-0.5 rounded">
                          <Star className="w-3 h-3 fill-current" /> {selectedOrder.rider.rating}
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-1">{selectedOrder.rider.ordersCompleted} orders finished</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-xs border-t border-border/60 pt-2">
                      <div>
                        <span className="text-muted-foreground">Delivery Status:</span>
                        <p className="font-semibold text-foreground capitalize mt-0.5">
                          {selectedOrder.orderStatus === "Packed" ? "Out for Delivery" : selectedOrder.orderStatus === "Delivered" ? "Completed" : selectedOrder.orderStatus}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground">Last Updated:</span>
                        <p className="font-medium text-muted-foreground mt-0.5">Just now</p>
                      </div>
                    </div>

                    {/* Quick Contact Action Triggers */}
                    {selectedOrder.rider.phone && (
                      <div className="flex gap-2 pt-1.5">
                        <a 
                          href={`tel:${selectedOrder.rider.phone}`}
                          className="flex-1 h-8 rounded-md bg-card border border-border text-xs font-semibold text-foreground flex items-center justify-center gap-1 hover:bg-muted transition-colors"
                        >
                          <Smartphone className="w-3.5 h-3.5" /> Call Rider
                        </a>
                        <a 
                          href={`https://wa.me/${selectedOrder.rider.phone.replace(/[^0-9]/g, "")}`}
                          target="_blank" 
                          rel="noreferrer"
                          className="flex-1 h-8 rounded-md bg-[#25D366] text-white text-xs font-semibold flex items-center justify-center gap-1 hover:bg-[#20ba5a] transition-colors shadow-xs"
                        >
                          WhatsApp Rider
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground py-1 italic flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> Unassigned ({selectedOrder.orderStatus === "Waiting Rider" ? "Awaiting Rider Availability" : "Awaiting store status verification match"})
                  </div>
                )}
              </div>

              {/* Drawer Controls */}
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
                          onClick={() => triggerActionConfirmation(selectedOrder.id, a.label)}
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