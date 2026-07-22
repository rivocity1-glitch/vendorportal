import React, { useState, useEffect } from "react";
import { Search, Filter, Download, X, MapPin, Phone, Package, CreditCard, User, Bike, ChevronRight, Loader2, RefreshCw, Smartphone, Star, CheckCircle, Clock, Trash2, Calendar, Eye, AlertTriangle } from "lucide-react";
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

  // Insufficient Stock Modal State
  const [stockConflict, setStockConflict] = useState<{
    orderId: string;
    productName: string;
    availableStock: number;
    requestedQty: number;
    visible: boolean;
  } | null>(null);

  // Rider Overview Metrics State
  const [riderMetrics, setRiderMetrics] = useState({
    available: 0,
    outForDelivery: 0,
  });

  // Lightbox Modal State for Payment Proof Screenshot
  const [activeScreenshotUrl, setActiveScreenshotUrl] = useState<string | null>(null);

  // UPI Payment Verification Modal State
  const [paymentVerificationData, setPaymentVerificationData] = useState<{
    orderId: string;
    action: "Approve" | "Reject";
    remarks: string;
    visible: boolean;
  } | null>(null);

  // Verifier Resolved Names Cache State
  const [verifierNames, setVerifierNames] = useState<Record<string, string>>({});

  const formatStatusString = (rawStatus: string): string => {
    if (!rawStatus) return "Pending";
    const formatted = rawStatus.trim().toLowerCase();
    if (formatted === "ready_for_pickup" || formatted === "ready for pickup") return "Ready For Pickup";
    if (formatted === "waiting_rider") return "Waiting Rider";
    if (formatted === "out_for_delivery") return "Out For Delivery";
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const calculateRowEta = (status: string, updatedAtStr: string): string => {
    if (status === "Cancelled" || status === "Rejected") return "—";
    if (status === "Delivered") return "Returned";
    if (status !== "Out For Delivery") return "No active deliveries";
    
    const oldestOrderTime = new Date(updatedAtStr).getTime();
    const elapsedMins = Math.floor((Date.now() - oldestOrderTime) / 60000);
    const remainingMins = Math.max(5, 30 - elapsedMins);
    
    return remainingMins <= 5 ? "Returned" : `Returning in ${remainingMins} mins`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    const dateFormatted = d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timeFormatted = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${dateFormatted} • ${timeFormatted}`;
  };

  // Helper to dynamically resolve verifier user names from UUIDs without manual component breakdown
  const resolveVerifierName = async (userId: string) => {
    if (!userId || verifierNames[userId]) return;
    try {
      const { data: adminData } = await supabase
        .from("admin_users")
        .select("name")
        .eq("id", userId)
        .maybeSingle();

      if (adminData?.name) {
        setVerifierNames(prev => ({ ...prev, [userId]: adminData.name }));
        return;
      }

      const { data: vendorData } = await supabase
        .from("vendors")
        .select("vendor_name")
        .eq("id", userId)
        .maybeSingle();

      if (vendorData?.vendor_name) {
        setVerifierNames(prev => ({ ...prev, [userId]: vendorData.vendor_name }));
        return;
      }

      // Check auth meta fallback as alternative vendor mapping route
      const { data: vendorAuthData } = await supabase
        .from("vendors")
        .select("vendor_name")
        .eq("auth_user_id", userId)
        .maybeSingle();

      if (vendorAuthData?.vendor_name) {
        setVerifierNames(prev => ({ ...prev, [userId]: vendorAuthData.vendor_name }));
        return;
      }

      setVerifierNames(prev => ({ ...prev, [userId]: "Verified User" }));
    } catch (e) {
      setVerifierNames(prev => ({ ...prev, [userId]: "Verified User" }));
    }
  };

  const fetchLiveOrders = async (showLoadingIndicator = true) => {
    try {
      if (showLoadingIndicator) setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return;

      const { data: vendorProfile, error: vendorErr } = await supabase
        .from("vendors")
        .select("id")
        .eq("auth_user_id", authData.user.id)
        .single();

      if (vendorErr || !vendorProfile) throw new Error("Could not resolve vendor context profile configuration.");
      const currentVendorId = vendorProfile.id;

      // Single comprehensive query fetching all associations including new cancellation fields
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
            platform_fee,
            vendor_earning,
            vendor_commission,
            rider_earning,
            rivo_delivery_margin,
            payment_status,
            order_status,
            cancelled_by,
            cancel_reason,
            cancelled_at,
            cash_received,
            change_returned,
            collected_by_rider,
            created_at,
            updated_at,
            customer_address_id,
            customers (
              customer_name,
              phone,
              email
            ),
            assigned_rider:riders!orders_rider_fk (
              id,
              rider_name,
              phone,
              vehicle_type,
              location_area,
              orders_completed,
              rating,
              availability_status
            ),
            customer_addresses (
              address_line1,
              address_line2,
              city,
              state,
              pin_code,
              landmark
            ),
            payments (
              id,
              payment_method,
              payment_status,
              payment_proof_url,
              verified_by,
              verified_at,
              verification_remarks
            ),
            order_tracking (
              id,
              status,
              remarks,
              created_at
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
          const riderProfile = parentOrder.assigned_rider || null;
          const addressProfile = parentOrder.customer_addresses || null;
          const paymentInfo = parentOrder.payments?.[0] || parentOrder.payments || null;
          const historyTracking = parentOrder.order_tracking || [];
          
          const rawPrice = Number(item.unit_price || 0); 
          const rawQty = Number(item.quantity || 1);
          const currentStatus = formatStatusString(parentOrder.order_status);

          if (!groupedOrders[oId]) {
            // Extrapolate detailed pipeline milestone stamps
            const formattedTimelineStamps = historyTracking.map((t: any) => ({
              status: formatStatusString(t.status),
              date: t.created_at ? new Date(t.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—",
              time: t.created_at ? new Date(t.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"
            }));

            // Determine specific logistics lifecycle nodes safely
            const pickupNode = historyTracking.find((t: any) => t.status?.toLowerCase() === "out_for_delivery" || t.status?.toLowerCase() === "out for delivery");
            const deliveryNode = historyTracking.find((t: any) => t.status?.toLowerCase() === "delivered");

            if (paymentInfo?.verified_by) {
              resolveVerifierName(paymentInfo.verified_by);
            }

            groupedOrders[oId] = {
              id: oId,
              orderNumber: parentOrder.order_number || "—",
              customer: customerProfile.customer_name || "Store Customer",
              phone: customerProfile.phone || "—",
              email: customerProfile.email || "—",
              subtotal: Number(parentOrder.subtotal || 0),
              deliveryFee: Number(parentOrder.delivery_fee || 0),
              totalAmount: Number(parentOrder.total_amount || 0), 
              platformFee: Number(parentOrder.platform_fee || 0),
              vendorEarning: Number(parentOrder.vendor_earning || 0),
              vendorCommission: Number(parentOrder.vendor_commission || 0),
              riderEarning: Number(parentOrder.rider_earning || 0),
              rivoMargin: Number(parentOrder.rivo_delivery_margin || 0),
              paymentStatus: parentOrder.payment_status || "Pending", 
              orderStatus: currentStatus,
              cancelledBy: parentOrder.cancelled_by || null,
              cancelReason: parentOrder.cancel_reason || null,
              cancelledAt: parentOrder.cancelled_at || null,
              updatedAt: parentOrder.updated_at,
              vendorId: parentOrder.vendor_id,
              riderId: parentOrder.rider_id,
              date: parentOrder.created_at ? new Date(parentOrder.created_at).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit"
              }) : "Just Now",
              address: addressProfile ? {
                name: customerProfile.customer_name || "—",
                addressLine: `${addressProfile.address_line1 || ""} ${addressProfile.address_line2 || ""}`.trim() || "—",
                area: addressProfile.landmark || "—",
                city: addressProfile.city || "—",
                pincode: addressProfile.pin_code || "—"
              } : null, 
              items: [],
              paymentDetails: paymentInfo ? {
                method: paymentInfo.payment_method || "—",
                status: paymentInfo.payment_status || "Pending",
                cashReceived: parentOrder.cash_received ? `₹${Number(parentOrder.cash_received).toLocaleString("en-IN")}` : "—",
                changeReturned: parentOrder.change_returned ? `₹${Number(parentOrder.change_returned).toLocaleString("en-IN")}` : "—",
                collectedByRider: parentOrder.collected_by_rider ? "Yes" : "No",
                paymentProofUrl: paymentInfo.payment_proof_url || null,
                verifiedBy: paymentInfo.verified_by || null,
                verifiedAt: paymentInfo.verified_at || null,
                verificationRemarks: paymentInfo.verification_remarks || null
              } : null,
              trackingHistory: formattedTimelineStamps,
              rider: riderProfile ? {
                id: riderProfile.id,
                name: riderProfile.rider_name || "—",
                phone: riderProfile.phone || "—",
                vehicleType: riderProfile.vehicle_type || "Bike",
                locationArea: riderProfile.location_area || "General Area",
                rating: riderProfile.rating || "0.0",
                ordersCompleted: riderProfile.orders_completed || 0,
                status: riderProfile.availability_status || "offline",
                pickupTime: pickupNode ? new Date(pickupNode.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—",
                deliveredTime: deliveryNode ? new Date(deliveryNode.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"
              } : null,
            };
          }

          groupedOrders[oId].items.push({
            name: item.products?.name || "Product Item",
            qty: rawQty,
            price: `₹${rawPrice.toLocaleString("en-IN")}`,
            unitPrice: `₹${rawPrice.toLocaleString("en-IN")}`,
            totalPrice: `₹${Number(item.total_price || (rawPrice * rawQty)).toLocaleString("en-IN")}`
          });
        });

        processedOrders = Object.values(groupedOrders).sort((a: any, b: any) => {
          return new Date(b.updatedAt || b.date).getTime() - new Date(a.updatedAt || a.date).getTime();
        });
        
        setOrdersList(processedOrders);

        if (selectedOrder) {
          const freshDetails = processedOrders.find(o => o.id === selectedOrder.id);
          if (freshDetails) {
            setSelectedOrder(freshDetails);
          }
        }
      }
    } catch (err) {
      console.error("Exception experienced fetching active order items loop:", err);
    } finally {
      if (showLoadingIndicator) setLoading(false);
    }
  };

  const fetchRiderMetrics = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return;

      const { data: vendorProfile } = await supabase
        .from("vendors")
        .select("id")
        .eq("auth_user_id", authData.user.id)
        .single();

      if (!vendorProfile) return;
      const currentVendorId = vendorProfile.id;

      const { data: activeOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("vendor_id", currentVendorId)
        .eq("order_status", "out_for_delivery");

      const liveOutForDelivery = activeOrders?.length || 0;

      const { data: assignments } = await supabase
        .from("rider_vendor_assignments")
        .select("rider_id")
        .eq("vendor_id", currentVendorId);

      let availableCount = 0;

      if (assignments && assignments.length > 0) {
        const targetRiderIds = assignments.map(a => a.rider_id);

        const { data: vendorFleetRiders } = await supabase
          .from("riders")
          .select("availability_status")
          .in("id", targetRiderIds);

        if (vendorFleetRiders) {
          availableCount = vendorFleetRiders.filter(
            r => r.availability_status === "available"
          ).length;
        }
      }

      setRiderMetrics({
        available: availableCount,
        outForDelivery: liveOutForDelivery,
      });
    } catch (err) {
      console.error("Failed calculating dashboard metric structures:", err);
    }
  };

  const syncAllPortalData = async (showLoadingIndicator = false) => {
    await Promise.all([
      fetchLiveOrders(showLoadingIndicator),
      fetchRiderMetrics()
    ]);
  };

  useEffect(() => {
    let ordersChannel: any = null;
    let itemsChannel: any = null;
    let trackingChannel: any = null;
    let paymentsChannel: any = null;
    let ridersChannel: any = null;
    let assignmentsChannel: any = null;

    const setupAuthAndRealtime = async () => {
      try {
        await syncAllPortalData(true);

        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) return;

        const { data: vendorProfile } = await supabase
          .from("vendors")
          .select("id")
          .eq("auth_user_id", authData.user.id)
          .single();

        if (!vendorProfile) return;
        const currentVendorId = vendorProfile.id;

        // 1. Subscribe to orders updates filtered by current vendor
        ordersChannel = supabase
          .channel("realtime-vendor-orders")
          .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `vendor_id=eq.${currentVendorId}` }, (payload) => {
            console.log("Realtime event (orders):", payload);
            syncAllPortalData(false);
          })
          .subscribe();

        // 2. Subscribe to order items mutations
        itemsChannel = supabase
          .channel("realtime-order-items")
          .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, (payload) => {
            console.log("Realtime event (order_items):", payload);
            syncAllPortalData(false);
          })
          .subscribe();

        // 3. Subscribe to order status pipeline tracking modifications
        trackingChannel = supabase
          .channel("realtime-order-tracking")
          .on("postgres_changes", { event: "*", schema: "public", table: "order_tracking" }, (payload) => {
            console.log("Realtime event (order_tracking):", payload);
            syncAllPortalData(false);
          })
          .subscribe();

        // 4. Subscribe to transaction settlements updates
        paymentsChannel = supabase
          .channel("realtime-payments")
          .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, (payload) => {
            console.log("Realtime event (payments):", payload);
            syncAllPortalData(false);
          })
          .subscribe();

        // 5. Subscribe to fleet rider status shifts
        ridersChannel = supabase
          .channel("realtime-riders")
          .on("postgres_changes", { event: "*", schema: "public", table: "riders" }, (payload) => {
            console.log("Realtime event (riders):", payload);
            syncAllPortalData(false);
          })
          .subscribe();

        // 6. Subscribe to operational fleet link shifts
        assignmentsChannel = supabase
          .channel("realtime-rider-vendor-assignments")
          .on("postgres_changes", { event: "*", schema: "public", table: "rider_vendor_assignments", filter: `vendor_id=eq.${currentVendorId}` }, (payload) => {
            console.log("Realtime event (rider_vendor_assignments):", payload);
            syncAllPortalData(false);
          })
          .subscribe();

      } catch (err) {
        console.error("Error configuration loading initial stream hooks: ", err);
      }
    };

    setupAuthAndRealtime();

    return () => {
      if (ordersChannel) supabase.removeChannel(ordersChannel);
      if (itemsChannel) supabase.removeChannel(itemsChannel);
      if (trackingChannel) supabase.removeChannel(trackingChannel);
      if (paymentsChannel) supabase.removeChannel(paymentsChannel);
      if (ridersChannel) supabase.removeChannel(ridersChannel);
      if (assignmentsChannel) supabase.removeChannel(assignmentsChannel);
    };
  }, []);

  const triggerActionConfirmation = (orderId: string, action: string) => {
    setConfirmData({ orderId, action, visible: true });
  };

  const handleModifyQuantityToAvailable = async () => {
    if (!stockConflict) return;
    const { orderId } = stockConflict;
    setStockConflict(null);

    try {
      setActionLoading(`${orderId}-Accept`);

      const { data: items, error: itemsErr } = await supabase
        .from("order_items")
        .select("id, product_id, quantity, unit_price")
        .eq("order_id", orderId);

      if (itemsErr) throw itemsErr;

      if (items && items.length > 0) {
        let runningSubtotal = 0;

        for (const item of items) {
          const { data: product, error: prodErr } = await supabase
            .from("products")
            .select("stock")
            .eq("id", item.product_id)
            .single();

          if (prodErr) throw prodErr;

          const currentStock = product?.stock || 0;
          let adjustedQty = item.quantity;

          if (item.quantity > currentStock) {
            adjustedQty = currentStock;

            const { error: patchItemErr } = await supabase
              .from("order_items")
              .update({
                quantity: adjustedQty,
                total_price: adjustedQty * Number(item.unit_price || 0)
              })
              .eq("id", item.id);

            if (patchItemErr) throw patchItemErr;
          }

          runningSubtotal += adjustedQty * Number(item.unit_price || 0);

          const finalStock = currentStock - adjustedQty;
          if (finalStock < 0) throw new Error("Safety check failure: Stock went below zero.");

          const { error: stockUpdateErr } = await supabase
            .from("products")
            .update({ stock: finalStock })
            .eq("id", item.product_id);

          if (stockUpdateErr) throw stockUpdateErr;
        }

        const { data: currentOrder, error: orderFetchErr } = await supabase
          .from("orders")
          .select("delivery_fee, platform_fee, vendor_id")
          .eq("id", orderId)
          .single();

        if (orderFetchErr) throw orderFetchErr;

        const deliveryFee = Number(currentOrder?.delivery_fee || 0);
        let platformFee = Number(currentOrder?.platform_fee || 0);
        const vendorId = currentOrder?.vendor_id;

        // Query subscriptions to retrieve the latest active subscription profile
        const { data: subData, error: subFetchErr } = await supabase
          .from("subscriptions")
          .select("plan_name, commission_percent")
          .eq("vendor_id", vendorId)
          .eq("status", "active")
          .order("end_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subFetchErr) throw subFetchErr;

        const planName = (subData?.plan_name || "free").trim().toLowerCase();
        const commissionPercent = Number(subData?.commission_percent || 0);

        let vendorCommission = 0;
        let vendorEarning = runningSubtotal;

        if (planName === "free") {
          vendorCommission = runningSubtotal * (commissionPercent / 100);
          vendorEarning = runningSubtotal - vendorCommission;
        } else if (["basic", "growth", "pro"].includes(planName)) {
          vendorCommission = 0;
          vendorEarning = runningSubtotal;
        }

        const nextTotalAmount = runningSubtotal + deliveryFee + platformFee;

        const { error: orderPatchErr } = await supabase
          .from("orders")
          .update({
            subtotal: runningSubtotal,
            vendor_commission: vendorCommission,
            vendor_earning: vendorEarning,
            platform_fee: platformFee,
            total_amount: nextTotalAmount,
            order_status: "accepted"
          })
          .eq("id", orderId);

        if (orderPatchErr) throw orderPatchErr;

        const { error: paymentPatchErr } = await supabase
          .from("payments")
          .update({ amount: nextTotalAmount })
          .eq("order_id", orderId);

        if (paymentPatchErr) throw paymentPatchErr;

        await supabase.from("order_tracking").insert({
          order_id: orderId,
          status: "accepted",
          remarks: "Order accepted by vendor"
        });
      }

      await syncAllPortalData(false);
    } catch (err) {
      console.error("Failed executing inventory quantity override fallback loop:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAction = async () => {
    if (!confirmData) return;
    const { orderId, action } = confirmData;
    setConfirmData(null);

    try {
      setActionLoading(`${orderId}-${action}`);

      let nextDbStatus = "";
      let trackingRemarks = "";

      if (action === "Delete Order (Temp)") {
        await supabase.from("order_tracking").delete().eq("order_id", orderId);
        await supabase.from("order_items").delete().eq("order_id", orderId);
        const { error: deleteOrderError } = await supabase.from("orders").delete().eq("id", orderId);

        if (deleteOrderError) throw deleteOrderError;

        setSelectedOrder(null);
        await syncAllPortalData(false);
        return;
      }

      if (action === "Accept") {
        const { data: items, error: itemsErr } = await supabase
          .from("order_items")
          .select("product_id, quantity")
          .eq("order_id", orderId);

        if (itemsErr) throw itemsErr;

        if (items && items.length > 0) {
          const stockUpdatesToCommit: { productId: string; newStock: number }[] = [];

          for (const item of items) {
            const { data: product, error: prodErr } = await supabase
              .from("products")
              .select("name, stock")
              .eq("id", item.product_id)
              .single();

            if (prodErr) throw prodErr;

            const currentStock = product?.stock || 0;
            const newStock = currentStock - item.quantity;

            if (item.quantity > currentStock || newStock < 0) {
              setStockConflict({
                orderId,
                productName: product?.name || "Product Item",
                availableStock: currentStock,
                requestedQty: item.quantity,
                visible: true
              });
              setActionLoading(null);
              return; 
            }

            stockUpdatesToCommit.push({
              productId: item.product_id,
              newStock: newStock
            });
          }

          for (const update of stockUpdatesToCommit) {
            const { error: stockUpdateErr } = await supabase
              .from("products")
              .update({ stock: update.newStock })
              .eq("id", update.productId);

            if (stockUpdateErr) throw stockUpdateErr;
          }
        }
        nextDbStatus = "accepted";
        trackingRemarks = "Order accepted by vendor";
      } else if (action === "Reject") {
        const { data: currentOrder, error: fetchOrderErr } = await supabase
          .from("orders")
          .select("order_status")
          .eq("id", orderId)
          .single();

        if (fetchOrderErr) throw fetchOrderErr;

        const activeStatuses = ["accepted", "preparing", "packed", "ready_for_pickup", "waiting_rider", "out_for_delivery"];
        if (currentOrder && activeStatuses.includes(currentOrder.order_status.toLowerCase())) {
          const { data: items, error: itemsErr } = await supabase
            .from("order_items")
            .select("product_id, quantity")
            .eq("order_id", orderId);

          if (itemsErr) throw itemsErr;

          if (items && items.length > 0) {
            for (const item of items) {
              const { data: product, error: prodErr } = await supabase
                .from("products")
                .select("stock")
                .eq("id", item.product_id)
                .single();

              if (prodErr) throw prodErr;

              const currentStock = product?.stock || 0;
              const newStock = currentStock + item.quantity;

              const { error: stockUpdateErr } = await supabase
                .from("products")
                .update({ stock: newStock })
                .eq("id", item.product_id);

              if (stockUpdateErr) throw stockUpdateErr;
            }
          }
        }
        nextDbStatus = "cancelled";
        trackingRemarks = "Order rejected by vendor";
      } else if (action === "Mark Packed") {
        const { data: orderData, error: orderFetchErr } = await supabase
          .from("orders")
          .select("vendor_id")
          .eq("id", orderId)
          .single();

        if (orderFetchErr || !orderData) throw orderFetchErr || new Error("Failed to resolve order details.");

        const { data: assignmentsData, error: assignmentsErr } = await supabase
          .from("rider_vendor_assignments")
          .select("rider_id")
          .eq("vendor_id", orderData.vendor_id);

        if (assignmentsErr) throw assignmentsErr;

        const riderIds = assignmentsData?.map((a: any) => a.rider_id) || [];

        let assignedRider = null;
        if (riderIds.length > 0) {
          const { data: availableRiders, error: fleetErr } = await supabase
            .from("riders")
            .select("id")
            .in("id", riderIds)
            .eq("status", "active")
            .eq("availability_status", "available");

          if (fleetErr) throw fleetErr;
          if (availableRiders && availableRiders.length > 0) {
            assignedRider = availableRiders[0];
          }
        }

        if (assignedRider) {
          const selectedRiderId = assignedRider.id;

          const { error: orderUpdateErr } = await supabase
            .from("orders")
            .update({ order_status: "packed", rider_id: selectedRiderId })
            .eq("id", orderId);

          if (orderUpdateErr) throw orderUpdateErr;

          await supabase.from("order_tracking").insert({
            order_id: orderId,
            status: "packed",
            remarks: "Order packed and verified by store"
          });
        } else {
          alert("No available rider assigned.");
          setActionLoading(null);
          return;
        }
      } else {
        const statusMap: Record<string, string> = {
          "Mark Preparing": "preparing",
        };
        const remarksMap: Record<string, string> = {
          "Mark Preparing": "Order is being prepared",
        };

        nextDbStatus = statusMap[action];
        trackingRemarks = remarksMap[action];
      }

      if (action === "Accept" || action === "Reject" || action === "Mark Preparing") {
        if (!nextDbStatus) return;

        const { error } = await supabase
          .from("orders")
          .update({ order_status: nextDbStatus })
          .eq("id", orderId);

        if (error) throw error;

        await supabase.from("order_tracking").insert({
          order_id: orderId,
          status: nextDbStatus,
          remarks: trackingRemarks
        });
      }

      await syncAllPortalData(false);

    } catch (err) {
      console.error("Failed to commit status pipeline transaction changes:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleProcessPaymentVerification = async () => {
    if (!paymentVerificationData) return;
    const { orderId, action, remarks } = paymentVerificationData;
    setPaymentVerificationData(null);

    try {
      setActionLoading(`${orderId}-PaymentVerification`);

      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return;

      // 3. Prevent duplicate approval workflow validation logic
      const { data: checkPayment, error: checkErr } = await supabase
        .from("payments")
        .select("payment_status")
        .eq("order_id", orderId)
        .maybeSingle();

      if (checkErr) throw checkErr;
      if (checkPayment) {
        const currentPayStatus = (checkPayment.payment_status || "").trim().toLowerCase();
        if (currentPayStatus === "paid" || currentPayStatus === "failed") {
          alert("This payment has already been processed.");
          setActionLoading(null);
          return;
        }
      }

      // Fetch corresponding order parameters for comprehensive finance ledger mapping
      const matchedOrder = ordersList.find(o => o.id === orderId);
      if (!matchedOrder) {
        alert("Order context data could not be verified locally.");
        setActionLoading(null);
        return;
      }

      const currentTimestamp = new Date().toISOString();
      const nextPaymentStatus = action === "Approve" ? "paid" : "failed";

      // 9. Structured Financial Transaction Order execution pipeline begins
      // Step 1: Update payment table row record elements securely
      const { error: paymentUpdateError } = await supabase
        .from("payments")
        .update({
          payment_status: nextPaymentStatus,
          verified_at: currentTimestamp,
          verified_by: authData.user.id, // 1. Set authenticated user ID directly
          verification_remarks: remarks || null
        })
        .eq("order_id", orderId);

      if (paymentUpdateError) throw paymentUpdateError;

      // Step 2: Update structural order payment status configuration elements
      const { error: orderUpdateError } = await supabase
        .from("orders")
        .update({ payment_status: nextPaymentStatus })
        .eq("id", orderId);

      if (orderUpdateError) throw orderUpdateError;

      // Step 3: Handle Financial Ledger insertions safely if payment approved completely
      if (action === "Approve") {
        const { data: existingLedger } = await supabase
          .from("financial_ledger")
          .select("id")
          .eq("reference_id", orderId)
          .eq("transaction_type", "order_payment")
          .maybeSingle();

        if (!existingLedger) {
          const { error: ledgerError } = await supabase
            .from("financial_ledger")
            .insert({
              entity_type: "vendor",
              entity_id: matchedOrder.vendorId,
              transaction_type: "order_payment",
              entry_type: "credit",
              amount: matchedOrder.vendorEarning,
              reference_id: orderId,
              remarks: "UPI payment verified"
            });
          
          if (ledgerError) throw ledgerError;
        }

        // Step 4: Handle Vendor Settlement creation securely
        const { data: existingVendorSettlement } = await supabase
          .from("vendor_settlements")
          .select("id")
          .contains("order_ids", [orderId])
          .maybeSingle();

        if (!existingVendorSettlement) {
          const { error: vendorSettlementError } = await supabase
            .from("vendor_settlements")
            .insert({
              vendor_id: matchedOrder.vendorId,
              amount: matchedOrder.vendorEarning,
              status: "pending",
              order_count: 1,
              order_ids: [orderId],
              request_date: currentTimestamp
            });

          if (vendorSettlementError) throw vendorSettlementError;
        }

        // Step 5: Handle Rider Settlement execution pipeline nodes safely
        if (matchedOrder.riderId && matchedOrder.riderEarning > 0) {
          const { data: existingRiderSettlement } = await supabase
            .from("rider_settlements")
            .select("id")
            .contains("order_ids", [orderId])
            .maybeSingle();

          if (!existingRiderSettlement) {
            const { error: riderSettlementError } = await supabase
              .from("rider_settlements")
              .insert({
                status: "pending",
                delivery_count: 1,
                order_ids: [orderId],
                amount: matchedOrder.riderEarning,
                request_date: currentTimestamp
              });

            if (riderSettlementError) throw riderSettlementError;
          }
        }

        // Step 6: Trigger architecture notification updates via window global object injection mechanism safely
        try {
          // Send notification to customer
          if (typeof (window as any).notificationService?.sendNotification === "function") {
            await (window as any).notificationService.sendNotification({
              recipient_id: matchedOrder.customerId,
              title: "Payment Verified",
              message: "Your UPI payment has been verified successfully."
            });

            // Send notification to admin user parameters
            await (window as any).notificationService.sendNotification({
              role: "admin",
              title: "Vendor verified payment",
              message: `Vendor has verified payment for Order #${matchedOrder.orderNumber}`
            });
          }
        } catch (notificationError) {
          console.error("External push notification delivery context exception skipped: ", notificationError);
        }
      }

      await syncAllPortalData(false);
    } catch (err) {
      console.error("Failed completing UPI verification workflows flow:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const renderPaymentBadge = (method: string, status: string) => {
    const formattedMethod = (method || "").trim().toLowerCase();
    const formattedStatus = (status || "").trim().toLowerCase();

    let methodBadge = <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full font-medium capitalize">{method || "—"}</span>;
    if (formattedMethod === "cod") {
      methodBadge = <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-medium">COD</span>;
    } else if (formattedMethod === "upi") {
      methodBadge = <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full font-medium">UPI</span>;
    }

    let statusBadge = <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full font-medium capitalize">{status || "—"}</span>;
    if (formattedStatus === "paid" || formattedStatus === "completed") {
      statusBadge = <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-medium">Paid</span>;
    } else if (formattedStatus === "pending") {
      statusBadge = <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-medium">Pending</span>;
    } else if (formattedStatus === "failed") {
      statusBadge = <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full font-medium">Failed</span>;
    }

    return (
      <div className="flex gap-1.5 items-center">
        {methodBadge}
        {statusBadge}
      </div>
    );
  };

  const filtered = ordersList.filter(o => {
    const matchTab = activeTab === "All" || o.orderStatus === activeTab;
    const searchTarget = search.toLowerCase();
    
    const matchSearch = 
      o.orderNumber.toLowerCase().includes(searchTarget) ||
      o.customer.toLowerCase().includes(searchTarget) ||
      o.phone.toLowerCase().includes(searchTarget) ||
      (o.rider && o.rider.name.toLowerCase().includes(searchTarget)) ||
      (o.paymentDetails && o.paymentDetails.method.toLowerCase().includes(searchTarget));
      
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
      
      {/* Overview Widget Grid Header layout */}
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
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Orders Out For Delivery</p>
            <h3 className="text-2xl font-bold text-[#3B82F6] mt-1">{riderMetrics.outForDelivery}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#DBEAFE] flex items-center justify-center text-[#1E40AF]">
            <Package className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-center shadow-sm">
          <button 
            onClick={() => syncAllPortalData(true)} 
            className="w-full h-full min-h-[60px] rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-md group text-sm"
          >
            <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" /> Get Latest Orders
          </button>
        </div>
      </div>

      {/* Header Search and Standard Action Row Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by Order #, Customer Name, Phone, Rider Name or Payment Method..."
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Rider</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">ETA Return</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Settlement</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Payment</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(order => {
                const status = order.orderStatus;
                const isCancelled = status === "Cancelled";
                const s = statusColors[status] || statusColors.Pending;
                const actions = isCancelled ? [] : (actionButtons[status] || []);
                return (
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="font-mono text-xs text-[#10B981] hover:underline font-semibold flex items-center gap-0.5"
                      >
                        {order.orderNumber} <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {order.rider ? (
                        <div>
                          <p className="text-sm font-medium text-foreground">{order.rider.name}</p>
                          <p className="text-xs text-muted-foreground">{order.rider.phone || "—"}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        status === "Out For Delivery" 
                          ? "bg-[#FEF3C7] text-[#92400E]" 
                          : status === "Delivered" 
                            ? "bg-[#D1FAE5] text-[#065F46]" 
                            : "bg-muted text-muted-foreground"
                      }`}>
                        {calculateRowEta(status, order.updatedAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{order.customer}</p>
                      <p className="text-xs text-muted-foreground">{order.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground">₹{order.vendorEarning.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">
                      {renderPaymentBadge(order.paymentDetails?.method, order.paymentDetails?.status)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${s.bg} ${s.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{order.date}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 items-center flex-wrap">
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
                        <button
                          onClick={() => triggerActionConfirmation(order.id, "Delete Order (Temp)")}
                          className="p-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          title="Delete Order (Temporary)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    <div className="flex flex-col items-center justify-center p-6 gap-3">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <Package className="w-8 h-8" />
                      </div>
                      <h4 className="text-base font-semibold text-foreground">No Orders Yet</h4>
                      <p className="text-xs max-w-xs mx-auto text-muted-foreground">
                        Orders from customers will appear here once your store starts receiving orders.
                      </p>
                      <button onClick={() => syncAllPortalData(true)} className="mt-2 h-9 px-4 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm">
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
                {confirmData.action === "Delete Order (Temp)" ? "Danger: Permanent Delete" : "Confirm Action Update"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {confirmData.action === "Delete Order (Temp)" 
                  ? "Are you sure you want to completely drop this structural row and its item stacks from the database? This is a temporary testing mechanism."
                  : `Are you sure you want to change this order pipeline milestone state to "${confirmData.action}"?`}
              </p>
            </div>
            <div className="flex justify-end gap-2 text-xs font-semibold">
              <button onClick={() => setConfirmData(null)} className="h-9 px-4 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground">
                Cancel
              </button>
              <button 
                onClick={handleAction} 
                className={`h-9 px-4 rounded-md text-white shadow-sm ${confirmData.action === "Delete Order (Temp)" ? "bg-red-600 hover:bg-red-700" : "bg-[#10B981] hover:bg-[#059669]"}`}
              >
                {confirmData.action === "Delete Order (Temp)" ? "Delete Code Flow" : "Confirm Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPI Payment Verification Dialog */}
      {paymentVerificationData?.visible && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-xl p-5 max-w-sm w-full shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-base font-bold text-foreground">
                {paymentVerificationData.action} UPI Payment
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Are you sure you want to {paymentVerificationData.action.toLowerCase()} this UPI payment transaction?
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground block">Remarks (optional)</label>
              <textarea
                value={paymentVerificationData.remarks}
                onChange={(e) => setPaymentVerificationData({ ...paymentVerificationData, remarks: e.target.value })}
                placeholder="Enter verification notes..."
                className="w-full text-sm border border-border bg-card rounded-md p-2 focus:outline-none focus:border-[#10B981] min-h-[60px]"
              />
            </div>
            <div className="flex justify-end gap-2 text-xs font-semibold">
              <button 
                onClick={() => setPaymentVerificationData(null)} 
                className="h-9 px-4 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button 
                onClick={handleProcessPaymentVerification} 
                className={`h-9 px-4 rounded-md text-white shadow-sm ${paymentVerificationData.action === "Approve" ? "bg-[#10B981] hover:bg-[#059669]" : "bg-[#EF4444] hover:bg-[#DC2626]"}`}
              >
                {paymentVerificationData.action}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Screenshot Modal Overlay */}
      {activeScreenshotUrl && (
        <div 
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setActiveScreenshotUrl(null)}
        >
          <div className="relative max-w-3xl w-full max-h-[85vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setActiveScreenshotUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 bg-black/20 p-1.5 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={activeScreenshotUrl} 
              alt="Payment Proof Screenshot" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Insufficient Stock Handle Dashboard Alert Modal */}
      {stockConflict?.visible && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-destructive flex items-center gap-2">
                <Package className="w-5 h-5 text-[#EF4444]" /> Insufficient stock available.
              </h3>
              <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border text-sm space-y-1">
                <p className="text-foreground"><span className="font-semibold text-muted-foreground">Product:</span> {stockConflict.productName}</p>
                <p className="text-[#10B981] font-semibold"><span className="text-muted-foreground">Available Stock:</span> {stockConflict.availableStock}</p>
                <p className="text-[#EF4444] font-semibold"><span className="text-muted-foreground">Requested:</span> {stockConflict.requestedQty}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 text-xs font-semibold">
              <button 
                onClick={handleModifyQuantityToAvailable}
                className="w-full h-10 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white shadow-sm flex items-center justify-center gap-1"
              >
                1. Modify quantity to available stock
              </button>
              <button 
                onClick={() => {
                  setStockConflict(null);
                  triggerActionConfirmation(stockConflict.orderId, "Reject");
                }}
                className="w-full h-10 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-white shadow-sm"
              >
                2. Reject Order
              </button>
              <button 
                onClick={() => setStockConflict(null)}
                className="w-full h-10 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
              >
                3. Cancel
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
                <p className="font-mono text-xs text-muted-foreground">Order Ref: {selectedOrder.orderNumber}</p>
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

              {/* Cancelled Order Highlight Card in Drawer Panel */}
              {selectedOrder.orderStatus === "Cancelled" && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-red-800 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>Cancellation Details</span>
                  </div>
                  <div className="text-xs space-y-1.5 pt-1">
                    <div className="flex justify-between">
                      <span className="text-red-700 font-medium">Cancelled By</span>
                      <span className="text-red-900 font-bold capitalize">
                        {selectedOrder.cancelledBy || "Customer"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-700 font-medium">Reason</span>
                      <span className="text-red-900 font-bold">
                        {selectedOrder.cancelReason || "Changed my mind"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-700 font-medium">Cancelled At</span>
                      <span className="text-red-900 font-bold">
                        {formatDate(selectedOrder.cancelledAt)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Progress Timeline with Historical Milestones */}
              <div className="bg-muted/20 border border-border/60 rounded-xl p-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Order Progress Timeline</p>
                <div className="flex flex-col space-y-3 relative">
                  {timelineStages.map((stage, idx) => {
                    const currentIdx = timelineStages.indexOf(selectedOrder.orderStatus);
                    const isCompleted = idx <= currentIdx && selectedOrder.orderStatus !== "Cancelled";
                    const isCurrent = stage === selectedOrder.orderStatus;
                    const logNode = selectedOrder.trackingHistory?.find((h: any) => h.status === stage);

                    return (
                      <div key={stage} className="flex items-start gap-3 relative z-10">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all ${
                          isCurrent 
                            ? "bg-[#10B981] text-white ring-4 ring-[#10B981]/20" 
                            : isCompleted 
                              ? "bg-[#D1FAE5] text-[#065F46]" 
                              : "bg-muted text-muted-foreground border border-border"
                        }`}>
                          {isCompleted ? <CheckCircle className="w-3.5 h-3.5" /> : idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                            {stage}
                          </p>
                          {logNode ? (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" /> {logNode.date} @ {logNode.time}
                            </p>
                          ) : isCompleted ? (
                            <p className="text-[10px] text-muted-foreground italic mt-0.5">Completed</p>
                          ) : (
                            <p className="text-[10px] text-muted-foreground/50 italic mt-0.5">Pending stage</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="absolute top-3 left-3 bottom-3 w-0.5 bg-border -z-0" />
                </div>
              </div>

              {/* Real Customer Address Box */}
              <div className="bg-muted/40 border border-border/50 rounded-xl p-3 space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Customer Info & Delivery Address</p>
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
                
                <div className="border-t border-border/60 my-2 pt-2 space-y-1">
                  <div className="flex items-start gap-2 text-xs text-foreground">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    {selectedOrder.address ? (
                      <div className="space-y-0.5">
                        <p className="font-semibold text-muted-foreground text-[11px]">Deliver To: {selectedOrder.address.name}</p>
                        <p>{selectedOrder.address.addressLine}</p>
                        <p>{selectedOrder.address.area}, {selectedOrder.address.city}</p>
                        <p className="font-mono text-muted-foreground">PIN: {selectedOrder.address.pincode}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">No verified delivery address specified.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Comprehensive Ordered Items Details List */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-[#10B981]" /> Ordered Items
                </p>
                <div className="space-y-1 bg-muted/20 border border-border/40 rounded-xl p-3">
                  {selectedOrder.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-border/40 last:border-0">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.qty} × {item.unitPrice}</p>
                      </div>
                      <p className="text-sm font-semibold text-foreground shrink-0">{item.totalPrice}</p>
                    </div>
                  ))}
                  
                  {/* Detailed Financial Ledger Stack */}
                  <div className="border-t border-border/60 mt-3 pt-2 space-y-1 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Products Total</span>
                      <span>₹{selectedOrder.subtotal.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>
                        Commission 
                        {selectedOrder.subtotal > 0 && selectedOrder.vendorCommission > 0
                          ? ` (${Math.round((selectedOrder.vendorCommission / selectedOrder.subtotal) * 100)}%)` 
                          : ""}
                      </span>
                      <span>
                        {selectedOrder.vendorCommission > 0 ? "-" : ""}₹{selectedOrder.vendorCommission.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-border/40 text-sm font-bold text-foreground">
                      <span>Settlement Amount</span>
                      <span className="text-base text-[#10B981] font-black">₹{selectedOrder.vendorEarning.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Payment Summary Info Area */}
              <div className="bg-muted/40 border border-border/50 rounded-xl p-3 space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Detailed Payment Summary</p>
                <div className="grid grid-cols-2 gap-y-3 text-xs border-b border-border/40 pb-2">
                  <div>
                    <span className="text-muted-foreground block">Payment Method</span>
                    <span className="font-semibold text-foreground uppercase">{selectedOrder.paymentDetails?.method || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Payment Status</span>
                    <span className="mt-0.5 block">
                      {renderPaymentBadge(selectedOrder.paymentDetails?.method, selectedOrder.paymentDetails?.status)}
                    </span>
                  </div>
                  
                  {/* Enhanced UPI Verification Fields */}
                  {selectedOrder.paymentDetails && (selectedOrder.paymentDetails.method || "").trim().toLowerCase() === "upi" && (
                    <>
                      <div className="col-span-2 border-t border-border/40 pt-2 grid grid-cols-2 gap-y-2">
                        <div>
                          <span className="text-muted-foreground block">Payment Proof</span>
                          {selectedOrder.paymentDetails.paymentProofUrl ? (
                            <button
                              onClick={() => setActiveScreenshotUrl(selectedOrder.paymentDetails.paymentProofUrl)}
                              className="inline-flex items-center gap-1 text-xs text-[#10B981] hover:underline font-semibold mt-0.5"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Screenshot
                            </button>
                          ) : (
                            <span className="text-muted-foreground italic">Not provided</span>
                          )}
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Verification Time</span>
                          <span className="font-medium text-foreground">
                            {selectedOrder.paymentDetails.verifiedAt ? new Date(selectedOrder.paymentDetails.verifiedAt).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit"
                            }) : "—"}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground block">Verification Remarks</span>
                          <span className="font-medium text-foreground block bg-background/50 p-1.5 rounded border border-border/40 min-h-[28px] mt-0.5">
                            {selectedOrder.paymentDetails.verificationRemarks || <span className="text-muted-foreground italic">No remarks</span>}
                          </span>
                        </div>
                        {selectedOrder.paymentDetails.verifiedBy && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground block">Verified By</span>
                            <span className="font-medium text-foreground text-[11px] block truncate">
                              {verifierNames[selectedOrder.paymentDetails.verifiedBy] || "Verified User"}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Conditional Manual Verification Workflow Controls */}
                {selectedOrder.paymentDetails && 
                 (selectedOrder.paymentDetails.method || "").trim().toLowerCase() === "upi" && 
                 (selectedOrder.paymentDetails.status || "").trim().toLowerCase() === "pending" && 
                 selectedOrder.orderStatus !== "Cancelled" && (
                  <div className="flex gap-2 pt-1 border-t border-dashed border-border/60">
                    <button
                      onClick={() => setPaymentVerificationData({ orderId: selectedOrder.id, action: "Approve", remarks: "", visible: true })}
                      className="flex-1 h-8 rounded-md bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold shadow-xs"
                    >
                      Approve Payment
                    </button>
                    <button
                      onClick={() => setPaymentVerificationData({ orderId: selectedOrder.id, action: "Reject", remarks: "", visible: true })}
                      className="flex-1 h-8 rounded-md bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-semibold shadow-xs"
                    >
                      Reject Payment
                    </button>
                  </div>
                )}

                {/* Conditional Logistics Cash Drop Nodes */}
                {selectedOrder.orderStatus === "Delivered" && selectedOrder.paymentDetails && (selectedOrder.paymentDetails.method || "").trim().toLowerCase() !== "upi" && (
                  <div className="bg-muted/60 p-2.5 rounded-lg text-xs space-y-1.5 border border-border/40">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cash Tendered:</span>
                      <span className="font-semibold text-foreground">{selectedOrder.paymentDetails.cashReceived}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Change Returned:</span>
                      <span className="font-semibold text-foreground">{selectedOrder.paymentDetails.changeReturned}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-dashed border-border text-[11px]">
                      <span className="text-muted-foreground">Collected By Rider:</span>
                      <span className={`font-bold ${selectedOrder.paymentDetails.collectedByRider === "Yes" ? "text-[#10B981]" : "text-muted-foreground"}`}>
                        {selectedOrder.paymentDetails.collectedByRider}
                      </span>
                    </div>
                  </div>
                )}
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

                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-border/60 pt-2 bg-background/40 p-2 rounded-lg">
                      <div>
                        <span className="text-muted-foreground text-[10px] block">Dispatched/Pickup Time</span>
                        <p className="font-semibold text-foreground mt-0.5">{selectedOrder.rider.pickupTime}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[10px] block">Delivered Target Stamp</span>
                        <p className="font-semibold text-foreground mt-0.5">{selectedOrder.rider.deliveredTime}</p>
                      </div>
                    </div>

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
              <div className="space-y-2 pt-2">
                {(() => {
                  const status = selectedOrder.orderStatus;
                  const isCancelled = status === "Cancelled";
                  const actions = isCancelled ? [] : (actionButtons[status] || []);
                  return actions.length > 0 ? (
                    <div className="flex gap-2">
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

                <button
                  disabled={actionLoading !== null}
                  onClick={() => triggerActionConfirmation(selectedOrder.id, "Delete Order (Temp)")}
                  className="w-full h-9 rounded-lg border border-red-200 bg-red-50/50 text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Permanent Purge Order (Temporary testing)
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}