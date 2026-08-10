import React, { useEffect, useState } from "react";
import {
  Search,
  Filter,
  Download,
  X,
  MapPin,
  Phone,
  Package,
  User,
  Bike,
  ChevronRight,
  Loader2,
  RefreshCw,
  Smartphone,
  Star,
  CheckCircle,
  Clock,
  Trash2,
  Calendar,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

const statusColors: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  Pending: {
    bg: "bg-[#FEF3C7]",
    text: "text-[#92400E]",
    dot: "bg-[#F59E0B]",
  },
  Accepted: {
    bg: "bg-[#DBEAFE]",
    text: "text-[#1E40AF]",
    dot: "bg-[#3B82F6]",
  },
  Preparing: {
    bg: "bg-[#EDE9FE]",
    text: "text-[#5B21B6]",
    dot: "bg-[#8B5CF6]",
  },
  Packed: {
    bg: "bg-[#CFFAFE]",
    text: "text-[#164E63]",
    dot: "bg-[#06B6D4]",
  },
  "Ready For Pickup": {
    bg: "bg-[#DBEAFE]",
    text: "text-[#1E40AF]",
    dot: "bg-[#3B82F6]",
  },
  "Waiting Rider": {
    bg: "bg-[#FEF3C7]",
    text: "text-[#92400E]",
    dot: "bg-[#F59E0B]",
  },
  "Out For Delivery": {
    bg: "bg-[#DBEAFE]",
    text: "text-[#1E40AF]",
    dot: "bg-[#3B82F6]",
  },
  Delivered: {
    bg: "bg-[#D1FAE5]",
    text: "text-[#065F46]",
    dot: "bg-[#10B981]",
  },
  Cancelled: {
    bg: "bg-[#FEE2E2]",
    text: "text-[#991B1B]",
    dot: "bg-[#EF4444]",
  },
  Refunded: {
    bg: "bg-[#FEF3C7]",
    text: "text-[#92400E]",
    dot: "bg-[#F97316]",
  },
};

const tabs = [
  "All",
  "Pending",
  "Accepted",
  "Preparing",
  "Packed",
  "Out For Delivery",
  "Delivered",
  "Cancelled",
];

const actionButtons: Record<string, { label: string; color: string }[]> = {
  Pending: [
    {
      label: "Accept",
      color: "bg-[#10B981] hover:bg-[#059669] text-white",
    },
    {
      label: "Reject",
      color: "bg-[#EF4444] hover:bg-[#DC2626] text-white",
    },
  ],
  Accepted: [
    {
      label: "Mark Preparing",
      color: "bg-[#8B5CF6] hover:bg-[#7C3AED] text-white",
    },
  ],
  Preparing: [
    {
      label: "Mark Packed",
      color: "bg-[#06B6D4] hover:bg-[#0891B2] text-white",
    },
  ],
};

const timelineStages = [
  "Pending",
  "Accepted",
  "Preparing",
  "Packed",
  "Out For Delivery",
  "Delivered",
];

type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name?: string | null;
};

type OrderRow = {
  id: string;
  order_number: string;
  customer_id: string;
  vendor_id: string;
  rider_id: string | null;
  subtotal: number;
  delivery_fee: number;
  platform_fee: number;
  total_amount: number;
  payment_status: string;
  order_status: string;
  payment_method: string | null;
  customer_address_id: string | null;
  rider_earning: number | null;
  rivo_delivery_margin: number | null;
  vendor_commission: number | null;
  vendor_earning: number | null;
  cash_received: number | null;
  change_returned: number | null;
  collection_method: string | null;
  collected_by_rider: string | null;
  created_at: string;
  updated_at: string;
  cancelled_by: string | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
};

type CustomerRow = {
  id: string;
  customer_name: string;
  phone: string;
  email: string | null;
};

type AddressRow = {
  id: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pin_code: string;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
};

type ProductRow = {
  id: string;
  name: string;
  stock: number | null;
};

type PaymentRow = {
  id: string;
  order_id: string;
  amount: number;
  payment_method: string | null;
  payment_status: string | null;
  payment_proof_url: string | null;
  verified_by: string | null;
  verified_at: string | null;
  verification_remarks: string | null;
};

type TrackingRow = {
  id: string;
  order_id: string;
  status: string;
  remarks: string | null;
  created_at: string;
};

type RiderRow = {
  id: string;
  rider_name: string;
  phone: string;
  vehicle_type: string | null;
  location_area: string | null;
  orders_completed: number | null;
  rating: number | null;
  availability_status: string | null;
  status: string | null;
};

type DisplayOrder = {
  id: string;
  orderNumber: string;
  customerId: string;
  customer: string;
  phone: string;
  email: string;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  platformFee: number;
  vendorEarning: number;
  vendorCommission: number;
  riderEarning: number;
  rivoMargin: number;
  paymentStatus: string;
  orderStatus: string;
  paymentMethod: string | null;
  cancelledBy: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  updatedAt: string;
  vendorId: string;
  riderId: string | null;
  date: string;
  address: {
    name: string;
    addressLine: string;
    area: string;
    city: string;
    pincode: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
  items: {
    name: string;
    qty: number;
    price: string;
    unitPrice: string;
    totalPrice: string;
  }[];
  paymentDetails: {
    method: string;
    status: string;
    cashReceived: string;
    changeReturned: string;
    collectedByRider: string;
    paymentProofUrl: string | null;
    verifiedBy: string | null;
    verifiedAt: string | null;
    verificationRemarks: string | null;
  } | null;
  trackingHistory: {
    status: string;
    date: string;
    time: string;
    remarks: string | null;
  }[];
  rider: {
    id: string;
    name: string;
    phone: string;
    vehicleType: string;
    locationArea: string;
    rating: string;
    ordersCompleted: number;
    status: string;
    pickupTime: string;
    deliveredTime: string;
  } | null;
};

export function Orders() {
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [ordersList, setOrdersList] = useState<DisplayOrder[]>([]);
  const [selectedOrder, setSelectedOrder] =
    useState<DisplayOrder | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [confirmData, setConfirmData] = useState<{
    orderId: string;
    action: string;
    visible: boolean;
  } | null>(null);

  const [stockConflict, setStockConflict] = useState<{
    orderId: string;
    productName: string;
    availableStock: number;
    requestedQty: number;
    visible: boolean;
  } | null>(null);

  const [riderMetrics, setRiderMetrics] = useState({
    available: 0,
    outForDelivery: 0,
  });

  const [activeScreenshotUrl, setActiveScreenshotUrl] =
    useState<string | null>(null);

  const [paymentVerificationData, setPaymentVerificationData] =
    useState<{
      orderId: string;
      action: "Approve" | "Reject";
      remarks: string;
      visible: boolean;
    } | null>(null);

  const [verifierNames, setVerifierNames] = useState<
    Record<string, string>
  >({});

  const formatStatusString = (rawStatus: string | null | undefined) => {
    if (!rawStatus) return "Pending";

    const formatted = rawStatus.trim().toLowerCase();

    if (
      formatted === "ready_for_pickup" ||
      formatted === "ready for pickup"
    ) {
      return "Ready For Pickup";
    }

    if (
      formatted === "waiting_rider" ||
      formatted === "waiting rider"
    ) {
      return "Waiting Rider";
    }

    if (
      formatted === "out_for_delivery" ||
      formatted === "out for delivery"
    ) {
      return "Out For Delivery";
    }

    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const calculateRowEta = (
    status: string,
    updatedAtStr: string
  ): string => {
    if (status === "Cancelled" || status === "Rejected") return "—";

    if (status === "Delivered") return "Returned";

    if (status !== "Out For Delivery") {
      return "No active deliveries";
    }

    const oldestOrderTime = new Date(updatedAtStr).getTime();
    const elapsedMins = Math.floor(
      (Date.now() - oldestOrderTime) / 60000
    );

    const remainingMins = Math.max(5, 30 - elapsedMins);

    return remainingMins <= 5
      ? "Returned"
      : `Returning in ${remainingMins} mins`;
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

  const money = (value: number | null | undefined) =>
    `₹${Number(value || 0).toLocaleString("en-IN")}`;

  const resolveVerifierName = async (userId: string) => {
    if (!userId || verifierNames[userId]) return;

    try {
      const { data: adminData } = await supabase
        .from("admin_users")
        .select("name")
        .eq("id", userId)
        .maybeSingle();

      if (adminData?.name) {
        setVerifierNames((prev) => ({
          ...prev,
          [userId]: adminData.name,
        }));
        return;
      }

      const { data: vendorData } = await supabase
        .from("vendors")
        .select("shop_name")
        .eq("id", userId)
        .maybeSingle();

      if (vendorData?.shop_name) {
        setVerifierNames((prev) => ({
          ...prev,
          [userId]: vendorData.shop_name,
        }));
        return;
      }

      const { data: vendorAuthData } = await supabase
        .from("vendors")
        .select("shop_name")
        .eq("auth_user_id", userId)
        .maybeSingle();

      if (vendorAuthData?.shop_name) {
        setVerifierNames((prev) => ({
          ...prev,
          [userId]: vendorAuthData.shop_name,
        }));
        return;
      }

      setVerifierNames((prev) => ({
        ...prev,
        [userId]: "Verified User",
      }));
    } catch {
      setVerifierNames((prev) => ({
        ...prev,
        [userId]: "Verified User",
      }));
    }
  };

  /*
   * IMPORTANT:
   * This function deliberately does NOT use Supabase nested
   * relationships. The current database schema does not expose
   * the relationships required by the old Orders.tsx query.
   */
  const fetchLiveOrders = async (
    showLoadingIndicator = true
  ) => {
    try {
      if (showLoadingIndicator) {
        setLoading(true);
      }

      const { data: authData } = await supabase.auth.getUser();

      if (!authData?.user) {
        setOrdersList([]);
        return;
      }

      const { data: vendorProfile, error: vendorErr } =
        await supabase
          .from("vendors")
          .select("id")
          .eq("auth_user_id", authData.user.id)
          .maybeSingle();

      if (vendorErr) throw vendorErr;

      if (!vendorProfile?.id) {
        setOrdersList([]);
        return;
      }

      const currentVendorId = vendorProfile.id;

      /* ---------------------------------------------------------
       * 1. ORDERS
       * --------------------------------------------------------- */

      const { data: ordersData, error: ordersError } =
        await supabase
          .from("orders")
          .select(`
            id,
            order_number,
            customer_id,
            vendor_id,
            rider_id,
            subtotal,
            delivery_fee,
            platform_fee,
            total_amount,
            payment_status,
            order_status,
            payment_method,
            customer_address_id,
            rider_earning,
            rivo_delivery_margin,
            vendor_commission,
            vendor_earning,
            cash_received,
            change_returned,
            collection_method,
            collected_by_rider,
            created_at,
            updated_at,
            cancelled_by,
            cancel_reason,
            cancelled_at
          `)
          .eq("vendor_id", currentVendorId)
          .order("updated_at", { ascending: false });

      if (ordersError) throw ordersError;

      const typedOrders = (ordersData || []) as OrderRow[];

      if (typedOrders.length === 0) {
        setOrdersList([]);
        return;
      }

      const orderIds = typedOrders.map((order) => order.id);

      const customerIds = Array.from(
        new Set(
          typedOrders
            .map((order) => order.customer_id)
            .filter(Boolean)
        )
      );

      const addressIds = Array.from(
        new Set(
          typedOrders
            .map((order) => order.customer_address_id)
            .filter(Boolean) as string[]
        )
      );

      const riderIds = Array.from(
        new Set(
          typedOrders
            .map((order) => order.rider_id)
            .filter(Boolean) as string[]
        )
      );

      /* ---------------------------------------------------------
       * 2. ORDER ITEMS
       * --------------------------------------------------------- */

      const { data: itemsData, error: itemsError } =
        await supabase
          .from("order_items")
          .select(`
            id,
            order_id,
            product_id,
            quantity,
            unit_price,
            total_price,
            product_name
          `)
          .in("order_id", orderIds);

      if (itemsError) throw itemsError;

      const typedItems = (itemsData || []) as OrderItemRow[];

      const productIds = Array.from(
        new Set(
          typedItems
            .map((item) => item.product_id)
            .filter(Boolean)
        )
      );

      /* ---------------------------------------------------------
       * 3. PRODUCTS
       * --------------------------------------------------------- */

      const productsMap = new Map<string, ProductRow>();

      if (productIds.length > 0) {
        const { data: productsData, error: productsError } =
          await supabase
            .from("products")
            .select("id, name, stock")
            .in("id", productIds);

        if (productsError) throw productsError;

        ((productsData || []) as ProductRow[]).forEach((product) => {
          productsMap.set(product.id, product);
        });
      }

      /* ---------------------------------------------------------
       * 4. CUSTOMERS
       * --------------------------------------------------------- */

      const customersMap = new Map<string, CustomerRow>();

      if (customerIds.length > 0) {
        const { data: customersData, error: customersError } =
          await supabase
            .from("customers")
            .select("id, customer_name, phone, email")
            .in("id", customerIds);

        if (customersError) throw customersError;

        ((customersData || []) as CustomerRow[]).forEach(
          (customer) => {
            customersMap.set(customer.id, customer);
          }
        );
      }

      /* ---------------------------------------------------------
       * 5. CUSTOMER ADDRESSES
       * --------------------------------------------------------- */

      const addressesMap = new Map<string, AddressRow>();

      if (addressIds.length > 0) {
        const { data: addressesData, error: addressesError } =
          await supabase
            .from("customer_addresses")
            .select(`
              id,
              address_line1,
              address_line2,
              city,
              state,
              pin_code,
              landmark,
              latitude,
              longitude
            `)
            .in("id", addressIds);

        if (addressesError) throw addressesError;

        ((addressesData || []) as AddressRow[]).forEach(
          (address) => {
            addressesMap.set(address.id, address);
          }
        );
      }

      /* ---------------------------------------------------------
       * 6. PAYMENTS
       * --------------------------------------------------------- */

      const paymentsMap = new Map<string, PaymentRow>();

      const { data: paymentsData, error: paymentsError } =
        await supabase
          .from("payments")
          .select(`
            id,
            order_id,
            amount,
            payment_method,
            payment_status,
            payment_proof_url,
            verified_by,
            verified_at,
            verification_remarks
          `)
          .in("order_id", orderIds);

      if (paymentsError) throw paymentsError;

      ((paymentsData || []) as PaymentRow[]).forEach((payment) => {
        /*
         * Keep the first payment for each order.
         * Existing Rivo flow uses one primary payment record/order.
         */
        if (!paymentsMap.has(payment.order_id)) {
          paymentsMap.set(payment.order_id, payment);
        }

        if (payment.verified_by) {
          resolveVerifierName(payment.verified_by);
        }
      });

      /* ---------------------------------------------------------
       * 7. ORDER TRACKING
       * --------------------------------------------------------- */

      const trackingMap = new Map<string, TrackingRow[]>();

      const { data: trackingData, error: trackingError } =
        await supabase
          .from("order_tracking")
          .select(`
            id,
            order_id,
            status,
            remarks,
            created_at
          `)
          .in("order_id", orderIds)
          .order("created_at", { ascending: true });

      if (trackingError) throw trackingError;

      ((trackingData || []) as TrackingRow[]).forEach((tracking) => {
        const current = trackingMap.get(tracking.order_id) || [];
        current.push(tracking);
        trackingMap.set(tracking.order_id, current);
      });

      /* ---------------------------------------------------------
       * 8. RIDERS
       * --------------------------------------------------------- */

      const ridersMap = new Map<string, RiderRow>();

      if (riderIds.length > 0) {
        const { data: ridersData, error: ridersError } =
          await supabase
            .from("riders")
            .select(`
              id,
              rider_name,
              phone,
              vehicle_type,
              location_area,
              orders_completed,
              rating,
              availability_status,
              status
            `)
            .in("id", riderIds);

        if (ridersError) throw ridersError;

        ((ridersData || []) as RiderRow[]).forEach((rider) => {
          ridersMap.set(rider.id, rider);
        });
      }

      /* ---------------------------------------------------------
       * 9. BUILD DISPLAY ORDERS
       * --------------------------------------------------------- */

      const processedOrders: DisplayOrder[] = typedOrders.map(
        (parentOrder) => {
          const customer =
            customersMap.get(parentOrder.customer_id);

          const address = parentOrder.customer_address_id
            ? addressesMap.get(parentOrder.customer_address_id)
            : undefined;

          const rider = parentOrder.rider_id
            ? ridersMap.get(parentOrder.rider_id)
            : undefined;

          const payment = paymentsMap.get(parentOrder.id);

          const history =
            trackingMap.get(parentOrder.id) || [];

          const orderItems = typedItems.filter(
            (item) => item.order_id === parentOrder.id
          );

          const pickupNode = history.find((tracking) => {
            const normalized =
              tracking.status?.trim().toLowerCase();

            return (
              normalized === "out_for_delivery" ||
              normalized === "out for delivery"
            );
          });

          const deliveryNode = history.find((tracking) => {
            return (
              tracking.status?.trim().toLowerCase() ===
              "delivered"
            );
          });

          const currentStatus = formatStatusString(
            parentOrder.order_status
          );

          const trackingHistory = history.map((tracking) => {
            const trackingDate = new Date(tracking.created_at);

            return {
              status: formatStatusString(tracking.status),
              date: trackingDate.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
              time: trackingDate.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              remarks: tracking.remarks,
            };
          });

          return {
            id: parentOrder.id,

            orderNumber:
              parentOrder.order_number || "—",

            customerId:
              parentOrder.customer_id,

            customer:
              customer?.customer_name ||
              "Store Customer",

            phone:
              customer?.phone ||
              "—",

            email:
              customer?.email ||
              "—",

            subtotal:
              Number(parentOrder.subtotal || 0),

            deliveryFee:
              Number(parentOrder.delivery_fee || 0),

            totalAmount:
              Number(parentOrder.total_amount || 0),

            platformFee:
              Number(parentOrder.platform_fee || 0),

            vendorEarning:
              Number(parentOrder.vendor_earning || 0),

            vendorCommission:
              Number(parentOrder.vendor_commission || 0),

            riderEarning:
              Number(parentOrder.rider_earning || 0),

            rivoMargin:
              Number(parentOrder.rivo_delivery_margin || 0),

            paymentStatus:
              parentOrder.payment_status || "Pending",

            orderStatus:
              currentStatus,

            paymentMethod:
              payment?.payment_method ||
              parentOrder.payment_method ||
              null,

            cancelledBy:
              parentOrder.cancelled_by || null,

            cancelReason:
              parentOrder.cancel_reason || null,

            cancelledAt:
              parentOrder.cancelled_at || null,

            updatedAt:
              parentOrder.updated_at,

            vendorId:
              parentOrder.vendor_id,

            riderId:
              parentOrder.rider_id,

            date: parentOrder.created_at
              ? new Date(
                  parentOrder.created_at
                ).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Just Now",

            address: address
              ? {
                  name:
                    customer?.customer_name || "—",

                  addressLine:
                    `${address.address_line1 || ""} ${
                      address.address_line2 || ""
                    }`.trim() || "—",

                  area:
                    address.landmark || "—",

                  city:
                    address.city || "—",

                  pincode:
                    address.pin_code || "—",

                  latitude:
                    address.latitude,

                  longitude:
                    address.longitude,
                }
              : null,

            items: orderItems.map((item) => {
              const product =
                productsMap.get(item.product_id);

              const unitPrice =
                Number(item.unit_price || 0);

              const quantity =
                Number(item.quantity || 0);

              const totalPrice =
                Number(
                  item.total_price ??
                    unitPrice * quantity
                );

              return {
                name:
                  item.product_name ||
                  product?.name ||
                  "Product Item",

                qty:
                  quantity,

                price:
                  money(unitPrice),

                unitPrice:
                  money(unitPrice),

                totalPrice:
                  money(totalPrice),
              };
            }),

            paymentDetails: payment
              ? {
                  method:
                    payment.payment_method ||
                    parentOrder.payment_method ||
                    "—",

                  status:
                    payment.payment_status ||
                    parentOrder.payment_status ||
                    "Pending",

                  cashReceived:
                    parentOrder.cash_received !== null
                      ? money(parentOrder.cash_received)
                      : "—",

                  changeReturned:
                    parentOrder.change_returned !== null
                      ? money(parentOrder.change_returned)
                      : "—",

                  collectedByRider:
                    parentOrder.collected_by_rider
                      ? "Yes"
                      : "No",

                  paymentProofUrl:
                    payment.payment_proof_url ||
                    null,

                  verifiedBy:
                    payment.verified_by ||
                    null,

                  verifiedAt:
                    payment.verified_at ||
                    null,

                  verificationRemarks:
                    payment.verification_remarks ||
                    null,
                }
              : {
                  method:
                    parentOrder.payment_method ||
                    "—",

                  status:
                    parentOrder.payment_status ||
                    "Pending",

                  cashReceived:
                    parentOrder.cash_received !== null
                      ? money(parentOrder.cash_received)
                      : "—",

                  changeReturned:
                    parentOrder.change_returned !== null
                      ? money(parentOrder.change_returned)
                      : "—",

                  collectedByRider:
                    parentOrder.collected_by_rider
                      ? "Yes"
                      : "No",

                  paymentProofUrl:
                    null,

                  verifiedBy:
                    null,

                  verifiedAt:
                    null,

                  verificationRemarks:
                    null,
                },

            trackingHistory,

            rider: rider
              ? {
                  id:
                    rider.id,

                  name:
                    rider.rider_name || "—",

                  phone:
                    rider.phone || "—",

                  vehicleType:
                    rider.vehicle_type || "Bike",

                  locationArea:
                    rider.location_area ||
                    "General Area",

                  rating:
                    String(rider.rating ?? "0.0"),

                  ordersCompleted:
                    Number(
                      rider.orders_completed || 0
                    ),

                  status:
                    rider.availability_status ||
                    "offline",

                  pickupTime:
                    pickupNode
                      ? new Date(
                          pickupNode.created_at
                        ).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—",

                  deliveredTime:
                    deliveryNode
                      ? new Date(
                          deliveryNode.created_at
                        ).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—",
                }
              : null,
          };
        }
      );

      setOrdersList(processedOrders);

      if (selectedOrder) {
        const freshDetails =
          processedOrders.find(
            (order) => order.id === selectedOrder.id
          );

        if (freshDetails) {
          setSelectedOrder(freshDetails);
        }
      }
    } catch (err) {
      console.error(
        "Failed loading vendor orders:",
        err
      );
    } finally {
      if (showLoadingIndicator) {
        setLoading(false);
      }
    }
  };

  const fetchRiderMetrics = async () => {
    try {
      const { data: authData } =
        await supabase.auth.getUser();

      if (!authData?.user) return;

      const { data: vendorProfile } =
        await supabase
          .from("vendors")
          .select("id")
          .eq(
            "auth_user_id",
            authData.user.id
          )
          .maybeSingle();

      if (!vendorProfile?.id) return;

      const currentVendorId =
        vendorProfile.id;

      const { data: activeOrders } =
        await supabase
          .from("orders")
          .select("id")
          .eq(
            "vendor_id",
            currentVendorId
          )
          .eq(
            "order_status",
            "out_for_delivery"
          );

      const liveOutForDelivery =
        activeOrders?.length || 0;

      const { data: assignments } =
        await supabase
          .from("rider_vendor_assignments")
          .select("rider_id")
          .eq(
            "vendor_id",
            currentVendorId
          );

      let availableCount = 0;

      if (
        assignments &&
        assignments.length > 0
      ) {
        const targetRiderIds =
          assignments.map(
            (assignment) =>
              assignment.rider_id
          );

        const { data: fleetRiders } =
          await supabase
            .from("riders")
            .select(
              "availability_status"
            )
            .in(
              "id",
              targetRiderIds
            );

        availableCount =
          fleetRiders?.filter(
            (rider) =>
              rider.availability_status ===
              "available"
          ).length || 0;
      }

      setRiderMetrics({
        available:
          availableCount,

        outForDelivery:
          liveOutForDelivery,
      });
    } catch (err) {
      console.error(
        "Failed calculating rider metrics:",
        err
      );
    }
  };

  const syncAllPortalData = async (
    showLoadingIndicator = false
  ) => {
    await Promise.all([
      fetchLiveOrders(
        showLoadingIndicator
      ),
      fetchRiderMetrics(),
    ]);
  };

  useEffect(() => {
    let ordersChannel: any = null;
    let itemsChannel: any = null;
    let trackingChannel: any = null;
    let paymentsChannel: any = null;
    let ridersChannel: any = null;
    let assignmentsChannel: any = null;

    const setupRealtime = async () => {
      try {
        await syncAllPortalData(true);

        const { data: authData } =
          await supabase.auth.getUser();

        if (!authData?.user) return;

        const { data: vendorProfile } =
          await supabase
            .from("vendors")
            .select("id")
            .eq(
              "auth_user_id",
              authData.user.id
            )
            .maybeSingle();

        if (!vendorProfile?.id) return;

        const currentVendorId =
          vendorProfile.id;

        ordersChannel = supabase
          .channel(
            `vendor-orders-${currentVendorId}`
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "orders",
              filter: `vendor_id=eq.${currentVendorId}`,
            },
            () => {
              syncAllPortalData(false);
            }
          )
          .subscribe();

        itemsChannel = supabase
          .channel(
            `vendor-order-items-${currentVendorId}`
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "order_items",
            },
            () => {
              syncAllPortalData(false);
            }
          )
          .subscribe();

        trackingChannel = supabase
          .channel(
            `vendor-order-tracking-${currentVendorId}`
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "order_tracking",
            },
            () => {
              syncAllPortalData(false);
            }
          )
          .subscribe();

        paymentsChannel = supabase
          .channel(
            `vendor-payments-${currentVendorId}`
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "payments",
            },
            () => {
              syncAllPortalData(false);
            }
          )
          .subscribe();

        ridersChannel = supabase
          .channel(
            `vendor-riders-${currentVendorId}`
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "riders",
            },
            () => {
              syncAllPortalData(false);
            }
          )
          .subscribe();

        assignmentsChannel = supabase
          .channel(
            `vendor-rider-assignments-${currentVendorId}`
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table:
                "rider_vendor_assignments",
              filter: `vendor_id=eq.${currentVendorId}`,
            },
            () => {
              syncAllPortalData(false);
            }
          )
          .subscribe();
      } catch (err) {
        console.error(
          "Realtime setup error:",
          err
        );
      }
    };

    setupRealtime();

    return () => {
      if (ordersChannel) {
        supabase.removeChannel(
          ordersChannel
        );
      }

      if (itemsChannel) {
        supabase.removeChannel(
          itemsChannel
        );
      }

      if (trackingChannel) {
        supabase.removeChannel(
          trackingChannel
        );
      }

      if (paymentsChannel) {
        supabase.removeChannel(
          paymentsChannel
        );
      }

      if (ridersChannel) {
        supabase.removeChannel(
          ridersChannel
        );
      }

      if (assignmentsChannel) {
        supabase.removeChannel(
          assignmentsChannel
        );
      }
    };
  }, []);

  const triggerActionConfirmation = (
    orderId: string,
    action: string
  ) => {
    setConfirmData({
      orderId,
      action,
      visible: true,
    });
  };

  const handleModifyQuantityToAvailable =
    async () => {
      if (!stockConflict) return;

      const { orderId } =
        stockConflict;

      setStockConflict(null);

      try {
        setActionLoading(
          `${orderId}-Accept`
        );

        const { data: items, error: itemsErr } =
          await supabase
            .from("order_items")
            .select(
              "id, product_id, quantity, unit_price"
            )
            .eq(
              "order_id",
              orderId
            );

        if (itemsErr) throw itemsErr;

        if (items && items.length > 0) {
          let runningSubtotal = 0;

          for (const item of items) {
            const { data: product, error: prodErr } =
              await supabase
                .from("products")
                .select("stock")
                .eq(
                  "id",
                  item.product_id
                )
                .maybeSingle();

            if (prodErr) throw prodErr;

            const currentStock =
              Number(product?.stock || 0);

            const adjustedQty =
              Math.min(
                Number(item.quantity || 0),
                currentStock
              );

            const unitPrice =
              Number(
                item.unit_price || 0
              );

            if (
              adjustedQty !==
              Number(item.quantity)
            ) {
              const { error } =
                await supabase
                  .from("order_items")
                  .update({
                    quantity:
                      adjustedQty,
                    total_price:
                      adjustedQty *
                      unitPrice,
                  })
                  .eq(
                    "id",
                    item.id
                  );

              if (error) throw error;
            }

            runningSubtotal +=
              adjustedQty *
              unitPrice;

            const finalStock =
              currentStock -
              adjustedQty;

            const { error: stockError } =
              await supabase
                .from("products")
                .update({
                  stock: finalStock,
                })
                .eq(
                  "id",
                  item.product_id
                );

            if (stockError) {
              throw stockError;
            }
          }

          const { data: currentOrder, error: orderError } =
            await supabase
              .from("orders")
              .select(
                "delivery_fee, platform_fee, vendor_id"
              )
              .eq(
                "id",
                orderId
              )
              .single();

          if (orderError) throw orderError;

          const deliveryFee =
            Number(
              currentOrder.delivery_fee || 0
            );

          const platformFee =
            Number(
              currentOrder.platform_fee || 0
            );

          let vendorCommission = 0;
          let vendorEarning =
            runningSubtotal;

          const { data: subData } =
            await supabase
              .from("subscriptions")
              .select(
                "plan_name, commission_percent"
              )
              .eq(
                "vendor_id",
                currentOrder.vendor_id
              )
              .eq(
                "status",
                "active"
              )
              .order(
                "end_date",
                {
                  ascending: false,
                }
              )
              .limit(1)
              .maybeSingle();

          const planName =
            (
              subData?.plan_name ||
              "free"
            )
              .trim()
              .toLowerCase();

          const commissionPercent =
            Number(
              subData?.commission_percent ||
                0
            );

          if (planName === "free") {
            vendorCommission =
              runningSubtotal *
              (commissionPercent / 100);

            vendorEarning =
              runningSubtotal -
              vendorCommission;
          }

          const nextTotalAmount =
            runningSubtotal +
            deliveryFee +
            platformFee;

          const { error: updateOrderError } =
            await supabase
              .from("orders")
              .update({
                subtotal:
                  runningSubtotal,

                vendor_commission:
                  vendorCommission,

                vendor_earning:
                  vendorEarning,

                total_amount:
                  nextTotalAmount,

                order_status:
                  "accepted",
              })
              .eq(
                "id",
                orderId
              );

          if (updateOrderError) {
            throw updateOrderError;
          }

          const { error: paymentError } =
            await supabase
              .from("payments")
              .update({
                amount:
                  nextTotalAmount,
              })
              .eq(
                "order_id",
                orderId
              );

          if (paymentError) {
            throw paymentError;
          }

          const { error: trackingError } =
            await supabase
              .from("order_tracking")
              .insert({
                order_id:
                  orderId,
                status:
                  "accepted",
                remarks:
                  "Order accepted by vendor after stock quantity adjustment",
              });

          if (trackingError) {
            throw trackingError;
          }
        }

        await syncAllPortalData(false);
      } catch (err) {
        console.error(
          "Failed modifying order quantity:",
          err
        );

        alert(
          "Unable to modify order quantity. Please try again."
        );
      } finally {
        setActionLoading(null);
      }
    };

  const handleAction = async () => {
    if (!confirmData) return;

    const {
      orderId,
      action,
    } = confirmData;

    setConfirmData(null);

    try {
      setActionLoading(
        `${orderId}-${action}`
      );

      let nextDbStatus = "";
      let trackingRemarks = "";

      /* -------------------------------------------------------
       * TEMP DELETE
       * ------------------------------------------------------- */

      if (
        action ===
        "Delete Order (Temp)"
      ) {
        const { error: trackingError } =
          await supabase
            .from("order_tracking")
            .delete()
            .eq(
              "order_id",
              orderId
            );

        if (trackingError) {
          throw trackingError;
        }

        const { error: itemsError } =
          await supabase
            .from("order_items")
            .delete()
            .eq(
              "order_id",
              orderId
            );

        if (itemsError) {
          throw itemsError;
        }

        const { error: paymentError } =
          await supabase
            .from("payments")
            .delete()
            .eq(
              "order_id",
              orderId
            );

        if (paymentError) {
          console.warn(
            "Payment delete warning:",
            paymentError
          );
        }

        const { error: deleteOrderError } =
          await supabase
            .from("orders")
            .delete()
            .eq(
              "id",
              orderId
            );

        if (deleteOrderError) {
          throw deleteOrderError;
        }

        setSelectedOrder(null);

        await syncAllPortalData(false);

        return;
      }

      /* -------------------------------------------------------
       * ACCEPT
       * ------------------------------------------------------- */

      if (action === "Accept") {
        const { data: items, error: itemsErr } =
          await supabase
            .from("order_items")
            .select(
              "product_id, quantity"
            )
            .eq(
              "order_id",
              orderId
            );

        if (itemsErr) throw itemsErr;

        if (
          items &&
          items.length > 0
        ) {
          const stockUpdates: {
            productId: string;
            newStock: number;
          }[] = [];

          for (const item of items) {
            const { data: product, error: prodErr } =
              await supabase
                .from("products")
                .select(
                  "name, stock"
                )
                .eq(
                  "id",
                  item.product_id
                )
                .maybeSingle();

            if (prodErr) throw prodErr;

            const currentStock =
              Number(
                product?.stock || 0
              );

            const requestedQty =
              Number(
                item.quantity || 0
              );

            if (
              requestedQty >
              currentStock
            ) {
              setStockConflict({
                orderId,
                productName:
                  product?.name ||
                  "Product Item",
                availableStock:
                  currentStock,
                requestedQty,
                visible: true,
              });

              setActionLoading(null);

              return;
            }

            stockUpdates.push({
              productId:
                item.product_id,
              newStock:
                currentStock -
                requestedQty,
            });
          }

          for (const update of stockUpdates) {
            const { error } =
              await supabase
                .from("products")
                .update({
                  stock:
                    update.newStock,
                })
                .eq(
                  "id",
                  update.productId
                );

            if (error) throw error;
          }
        }

        nextDbStatus = "accepted";
        trackingRemarks =
          "Order accepted by vendor";
      }

      /* -------------------------------------------------------
       * REJECT
       * ------------------------------------------------------- */

      else if (action === "Reject") {
        const { data: currentOrder, error } =
          await supabase
            .from("orders")
            .select(
              "order_status"
            )
            .eq(
              "id",
              orderId
            )
            .single();

        if (error) throw error;

        const activeStatuses = [
          "accepted",
          "preparing",
          "packed",
          "ready_for_pickup",
          "waiting_rider",
          "out_for_delivery",
        ];

        if (
          activeStatuses.includes(
            (
              currentOrder
                ?.order_status ||
              ""
            ).toLowerCase()
          )
        ) {
          const { data: items, error: itemsErr } =
            await supabase
              .from("order_items")
              .select(
                "product_id, quantity"
              )
              .eq(
                "order_id",
                orderId
              );

          if (itemsErr) {
            throw itemsErr;
          }

          for (const item of items || []) {
            const { data: product, error: prodErr } =
              await supabase
                .from("products")
                .select(
                  "stock"
                )
                .eq(
                  "id",
                  item.product_id
                )
                .maybeSingle();

            if (prodErr) {
              throw prodErr;
            }

            const currentStock =
              Number(
                product?.stock || 0
              );

            const { error: stockError } =
              await supabase
                .from("products")
                .update({
                  stock:
                    currentStock +
                    Number(
                      item.quantity || 0
                    ),
                })
                .eq(
                  "id",
                  item.product_id
                );

            if (stockError) {
              throw stockError;
            }
          }
        }

        nextDbStatus =
          "cancelled";

        trackingRemarks =
          "Order rejected by vendor";
      }

      /* -------------------------------------------------------
       * MARK PACKED
       * ------------------------------------------------------- */

      else if (
        action === "Mark Packed"
      ) {
        const { data: orderData, error: orderError } =
          await supabase
            .from("orders")
            .select(
              "vendor_id"
            )
            .eq(
              "id",
              orderId
            )
            .single();

        if (orderError) {
          throw orderError;
        }

        const { data: assignmentsData, error: assignmentError } =
          await supabase
            .from("rider_vendor_assignments")
            .select(
              "rider_id"
            )
            .eq(
              "vendor_id",
              orderData.vendor_id
            );

        if (assignmentError) {
          throw assignmentError;
        }

        const riderIds =
          (assignmentsData || []).map(
            (assignment) =>
              assignment.rider_id
          );

        let assignedRider:
          | { id: string }
          | null = null;

        if (riderIds.length > 0) {
          const { data: availableRiders, error: riderError } =
            await supabase
              .from("riders")
              .select("id")
              .in(
                "id",
                riderIds
              )
              .eq(
                "status",
                "active"
              )
              .eq(
                "availability_status",
                "available"
              );

          if (riderError) {
            throw riderError;
          }

          if (
            availableRiders &&
            availableRiders.length > 0
          ) {
            assignedRider =
              availableRiders[0];
          }
        }

        if (!assignedRider) {
          alert(
            "No available rider assigned."
          );

          setActionLoading(null);

          return;
        }

        const { error: updateError } =
          await supabase
            .from("orders")
            .update({
              order_status:
                "packed",
              rider_id:
                assignedRider.id,
            })
            .eq(
              "id",
              orderId
            );

        if (updateError) {
          throw updateError;
        }

        const { error: trackingError } =
          await supabase
            .from("order_tracking")
            .insert({
              order_id:
                orderId,
              status:
                "packed",
              remarks:
                "Order packed and verified by store",
            });

        if (trackingError) {
          throw trackingError;
        }
      }

      /* -------------------------------------------------------
       * OTHER STATUS ACTIONS
       * ------------------------------------------------------- */

      else {
        const statusMap: Record<
          string,
          string
        > = {
          "Mark Preparing":
            "preparing",
        };

        const remarksMap: Record<
          string,
          string
        > = {
          "Mark Preparing":
            "Order is being prepared",
        };

        nextDbStatus =
          statusMap[action];

        trackingRemarks =
          remarksMap[action];
      }

      /* -------------------------------------------------------
       * COMMIT ACCEPT / REJECT / PREPARING
       * ------------------------------------------------------- */

      if (
        action === "Accept" ||
        action === "Reject" ||
        action === "Mark Preparing"
      ) {
        if (!nextDbStatus) {
          throw new Error(
            "Invalid order status action."
          );
        }

        const updatePayload: Record<
          string,
          unknown
        > = {
          order_status:
            nextDbStatus,
        };

        if (
          action === "Reject"
        ) {
          updatePayload.cancelled_by =
            "vendor";

          updatePayload.cancel_reason =
            "Order rejected by vendor";

          updatePayload.cancelled_at =
            new Date().toISOString();
        }

        const { error } =
          await supabase
            .from("orders")
            .update(
              updatePayload
            )
            .eq(
              "id",
              orderId
            );

        if (error) throw error;

        const { error: trackingError } =
          await supabase
            .from("order_tracking")
            .insert({
              order_id:
                orderId,
              status:
                nextDbStatus,
              remarks:
                trackingRemarks,
            });

        if (trackingError) {
          throw trackingError;
        }
      }

      await syncAllPortalData(false);
    } catch (err) {
      console.error(
        "Failed committing order action:",
        err
      );

      alert(
        "Unable to update the order. Please try again."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleProcessPaymentVerification =
    async () => {
      if (!paymentVerificationData) {
        return;
      }

      const {
        orderId,
        action,
        remarks,
      } = paymentVerificationData;

      setPaymentVerificationData(null);

      try {
        setActionLoading(
          `${orderId}-PaymentVerification`
        );

        const { data: authData } =
          await supabase.auth.getUser();

        if (!authData?.user) {
          throw new Error(
            "Authenticated user not found."
          );
        }

        const { data: checkPayment, error: checkErr } =
          await supabase
            .from("payments")
            .select(
              "payment_status"
            )
            .eq(
              "order_id",
              orderId
            )
            .maybeSingle();

        if (checkErr) {
          throw checkErr;
        }

        if (checkPayment) {
          const currentPayStatus =
            (
              checkPayment.payment_status ||
              ""
            )
              .trim()
              .toLowerCase();

          if (
            currentPayStatus === "paid" ||
            currentPayStatus === "failed"
          ) {
            alert(
              "This payment has already been processed."
            );

            return;
          }
        }

        const matchedOrder =
          ordersList.find(
            (order) =>
              order.id === orderId
          );

        if (!matchedOrder) {
          throw new Error(
            "Order context could not be found."
          );
        }

        const currentTimestamp =
          new Date().toISOString();

        const nextPaymentStatus =
          action === "Approve"
            ? "paid"
            : "failed";

        const { error: paymentUpdateError } =
          await supabase
            .from("payments")
            .update({
              payment_status:
                nextPaymentStatus,

              verified_at:
                currentTimestamp,

              verified_by:
                authData.user.id,

              verification_remarks:
                remarks || null,

              ...(action === "Approve"
                ? {
                    paid_at:
                      currentTimestamp,
                  }
                : {}),
            })
            .eq(
              "order_id",
              orderId
            );

        if (paymentUpdateError) {
          throw paymentUpdateError;
        }

        const { error: orderUpdateError } =
          await supabase
            .from("orders")
            .update({
              payment_status:
                nextPaymentStatus,
            })
            .eq(
              "id",
              orderId
            );

        if (orderUpdateError) {
          throw orderUpdateError;
        }

        if (action === "Approve") {
          const { data: existingLedger } =
            await supabase
              .from("financial_ledger")
              .select("id")
              .eq(
                "reference_id",
                orderId
              )
              .eq(
                "transaction_type",
                "order_payment"
              )
              .maybeSingle();

          if (!existingLedger) {
            const { error: ledgerError } =
              await supabase
                .from(
                  "financial_ledger"
                )
                .insert({
                  entity_type:
                    "vendor",

                  entity_id:
                    matchedOrder.vendorId,

                  transaction_type:
                    "order_payment",

                  entry_type:
                    "credit",

                  amount:
                    matchedOrder.vendorEarning,

                  reference_id:
                    orderId,

                  remarks:
                    "UPI payment verified",

                  status:
                    "COMPLETED",
                });

            if (ledgerError) {
              throw ledgerError;
            }
          }

          /*
           * vendor_settlements.order_ids is uuid[].
           * Use .contains() with a UUID array.
           */
          const { data: existingVendorSettlement } =
            await supabase
              .from(
                "vendor_settlements"
              )
              .select("id")
              .contains(
                "order_ids",
                [orderId]
              )
              .maybeSingle();

          if (!existingVendorSettlement) {
            const { error: vendorSettlementError } =
              await supabase
                .from(
                  "vendor_settlements"
                )
                .insert({
                  vendor_id:
                    matchedOrder.vendorId,

                  amount:
                    matchedOrder.vendorEarning,

                  status:
                    "pending",

                  order_count:
                    1,

                  order_ids:
                    [orderId],

                  request_date:
                    currentTimestamp,
                });

            if (
              vendorSettlementError
            ) {
              throw vendorSettlementError;
            }
          }

          if (
            matchedOrder.riderId &&
            matchedOrder.riderEarning >
              0
          ) {
            const {
              data: existingRiderSettlement,
            } = await supabase
              .from(
                "rider_settlements"
              )
              .select("id")
              .contains(
                "order_ids",
                [orderId]
              )
              .maybeSingle();

            if (
              !existingRiderSettlement
            ) {
              const {
                error:
                  riderSettlementError,
              } = await supabase
                .from(
                  "rider_settlements"
                )
                .insert({
                  rider_id:
                    matchedOrder.riderId,

                  status:
                    "pending",

                  delivery_count:
                    1,

                  order_ids:
                    [orderId],

                  amount:
                    matchedOrder.riderEarning,

                  request_date:
                    currentTimestamp,
                });

              if (
                riderSettlementError
              ) {
                throw riderSettlementError;
              }
            }
          }

          /*
           * Notification service is optional.
           * The database workflow remains successful even if
           * the global notification service is unavailable.
           */
          try {
            const notificationService =
              (
                window as any
              ).notificationService;

            if (
              typeof notificationService?.sendNotification ===
              "function"
            ) {
              await notificationService.sendNotification(
                {
                  recipient_id:
                    matchedOrder.customerId,

                  title:
                    "Payment Verified",

                  message:
                    "Your UPI payment has been verified successfully.",
                }
              );

              await notificationService.sendNotification(
                {
                  role: "admin",

                  title:
                    "Vendor verified payment",

                  message:
                    `Vendor has verified payment for Order #${matchedOrder.orderNumber}`,
                }
              );
            }
          } catch (notificationError) {
            console.warn(
              "Notification skipped:",
              notificationError
            );
          }
        }

        await syncAllPortalData(false);
      } catch (err) {
        console.error(
          "Failed completing UPI payment verification:",
          err
        );

        alert(
          "Payment verification failed. Please try again."
        );
      } finally {
        setActionLoading(null);
      }
    };

  const renderPaymentBadge = (
    method: string | null | undefined,
    status: string | null | undefined
  ) => {
    const formattedMethod =
      (method || "")
        .trim()
        .toLowerCase();

    const formattedStatus =
      (status || "")
        .trim()
        .toLowerCase();

    let methodBadge = (
      <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full font-medium capitalize">
        {method || "—"}
      </span>
    );

    if (formattedMethod === "cod") {
      methodBadge = (
        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-medium">
          COD
        </span>
      );
    }

    if (formattedMethod === "upi") {
      methodBadge = (
        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full font-medium">
          UPI
        </span>
      );
    }

    let statusBadge = (
      <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full font-medium capitalize">
        {status || "—"}
      </span>
    );

    if (
      formattedStatus === "paid" ||
      formattedStatus === "completed"
    ) {
      statusBadge = (
        <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-medium">
          Paid
        </span>
      );
    } else if (
      formattedStatus === "pending"
    ) {
      statusBadge = (
        <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-medium">
          Pending
        </span>
      );
    } else if (
      formattedStatus === "failed"
    ) {
      statusBadge = (
        <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full font-medium">
          Failed
        </span>
      );
    }

    return (
      <div className="flex gap-1.5 items-center">
        {methodBadge}
        {statusBadge}
      </div>
    );
  };

  const searchTarget =
    search.trim().toLowerCase();

  const filtered = ordersList.filter(
    (order) => {
      const matchTab =
        activeTab === "All" ||
        order.orderStatus ===
          activeTab;

      const matchSearch =
        !searchTarget ||
        order.orderNumber
          .toLowerCase()
          .includes(searchTarget) ||
        order.customer
          .toLowerCase()
          .includes(searchTarget) ||
        order.phone
          .toLowerCase()
          .includes(searchTarget) ||
        (
          order.rider?.name || ""
        )
          .toLowerCase()
          .includes(searchTarget) ||
        (
          order.paymentDetails
            ?.method || ""
        )
          .toLowerCase()
          .includes(searchTarget);

      return (
        matchTab &&
        matchSearch
      );
    }
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-sm text-muted-foreground gap-2 min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-[#10B981]" />
        <span>
          Syncing incoming order flows...
        </span>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 bg-background text-foreground min-h-screen">

      {/* =====================================================
          OVERVIEW
      ===================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">

        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Available Riders
            </p>

            <h3 className="text-2xl font-bold text-[#10B981] mt-1">
              {riderMetrics.available}
            </h3>
          </div>

          <div className="w-10 h-10 rounded-lg bg-[#D1FAE5] flex items-center justify-center text-[#065F46]">
            <Bike className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Orders Out For Delivery
            </p>

            <h3 className="text-2xl font-bold text-[#3B82F6] mt-1">
              {riderMetrics.outForDelivery}
            </h3>
          </div>

          <div className="w-10 h-10 rounded-lg bg-[#DBEAFE] flex items-center justify-center text-[#1E40AF]">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-center shadow-sm">
          <button
            onClick={() =>
              syncAllPortalData(true)
            }
            className="w-full h-full min-h-[60px] rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-md group text-sm"
          >
            <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
            Get Latest Orders
          </button>
        </div>
      </div>

      {/* =====================================================
          SEARCH
      ===================================================== */}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

          <input
            type="text"
            placeholder="Search by Order #, Customer Name, Phone, Rider Name or Payment Method..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-card text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
          />
        </div>

        <div className="flex gap-2">
          <button className="h-9 px-3 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </button>

          <button className="h-9 px-3 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* =====================================================
          TABS
      ===================================================== */}

      <div className="flex gap-1 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() =>
              setActiveTab(tab)
            }
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === tab
                ? "bg-[#10B981] text-white shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}

            <span className="ml-1.5 opacity-70">
              (
              {tab === "All"
                ? ordersList.length
                : ordersList.filter(
                    (order) =>
                      order.orderStatus ===
                      tab
                  ).length}
              )
            </span>
          </button>
        ))}
      </div>

      {/* =====================================================
          ORDERS TABLE
      ===================================================== */}

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Order ID
                </th>

                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Rider
                </th>

                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  ETA Return
                </th>

                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Customer
                </th>

                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Settlement
                </th>

                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Payment
                </th>

                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Status
                </th>

                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Date
                </th>

                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {filtered.map((order) => {
                const status =
                  order.orderStatus;

                const isCancelled =
                  status ===
                  "Cancelled";

                const s =
                  statusColors[
                    status
                  ] ||
                  statusColors.Pending;

                const actions =
                  isCancelled
                    ? []
                    : actionButtons[
                        status
                      ] || [];

                return (
                  <tr
                    key={order.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() =>
                          setSelectedOrder(
                            order
                          )
                        }
                        className="font-mono text-xs text-[#10B981] hover:underline font-semibold flex items-center gap-0.5"
                      >
                        {order.orderNumber}
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>

                    <td className="px-4 py-3">
                      {order.rider ? (
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {order.rider.name}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {order.rider.phone ||
                              "—"}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          Unassigned
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          status ===
                          "Out For Delivery"
                            ? "bg-[#FEF3C7] text-[#92400E]"
                            : status ===
                              "Delivered"
                            ? "bg-[#D1FAE5] text-[#065F46]"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {calculateRowEta(
                          status,
                          order.updatedAt
                        )}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">
                        {order.customer}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {order.phone}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-sm font-semibold text-foreground">
                      {money(
                        order.vendorEarning
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {renderPaymentBadge(
                        order.paymentDetails
                          ?.method,
                        order.paymentDetails
                          ?.status
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${s.bg} ${s.text}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${s.dot}`}
                        />
                        {status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {order.date}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 items-center flex-wrap">
                        {actions.map(
                          (a) => {
                            const isBtnLoading =
                              actionLoading ===
                              `${order.id}-${a.label}`;

                            return (
                              <button
                                key={
                                  a.label
                                }
                                disabled={
                                  actionLoading !==
                                  null
                                }
                                onClick={() =>
                                  triggerActionConfirmation(
                                    order.id,
                                    a.label
                                  )
                                }
                                className={`text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1 transition-colors disabled:opacity-40 ${a.color}`}
                              >
                                {isBtnLoading && (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                )}

                                {a.label}
                              </button>
                            );
                          }
                        )}

                        <button
                          onClick={() =>
                            triggerActionConfirmation(
                              order.id,
                              "Delete Order (Temp)"
                            )
                          }
                          className="p-1 rounded bg-red-50 text-red-600 hover:bg-red-100"
                          title="Delete Order"
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
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-muted-foreground text-sm"
                  >
                    <div className="flex flex-col items-center justify-center p-6 gap-3">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <Package className="w-8 h-8" />
                      </div>

                      <h4 className="text-base font-semibold text-foreground">
                        No Orders Yet
                      </h4>

                      <p className="text-xs max-w-xs mx-auto">
                        Orders from customers will appear here once your store starts receiving orders.
                      </p>

                      <button
                        onClick={() =>
                          syncAllPortalData(
                            true
                          )
                        }
                        className="mt-2 h-9 px-4 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Refresh Portal
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================
          CONFIRMATION MODAL
      ===================================================== */}

      {confirmData?.visible && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-xl p-5 max-w-sm w-full shadow-xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-foreground">
                {confirmData.action ===
                "Delete Order (Temp)"
                  ? "Danger: Permanent Delete"
                  : "Confirm Action Update"}
              </h3>

              <p className="text-sm text-muted-foreground mt-1">
                {confirmData.action ===
                "Delete Order (Temp)"
                  ? "Are you sure you want to permanently delete this order and its related records?"
                  : `Are you sure you want to change this order to "${confirmData.action}"?`}
              </p>
            </div>

            <div className="flex justify-end gap-2 text-xs font-semibold">
              <button
                onClick={() =>
                  setConfirmData(null)
                }
                className="h-9 px-4 rounded-md border border-border bg-card text-muted-foreground"
              >
                Cancel
              </button>

              <button
                onClick={handleAction}
                className={`h-9 px-4 rounded-md text-white ${
                  confirmData.action ===
                  "Delete Order (Temp)"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-[#10B981] hover:bg-[#059669]"
                }`}
              >
                {confirmData.action ===
                "Delete Order (Temp)"
                  ? "Delete"
                  : "Confirm Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          PAYMENT VERIFICATION MODAL
      ===================================================== */}

      {paymentVerificationData?.visible && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-xl p-5 max-w-sm w-full shadow-xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-foreground">
                {paymentVerificationData.action} UPI Payment
              </h3>

              <p className="text-sm text-muted-foreground mt-1">
                Are you sure you want to{" "}
                {paymentVerificationData.action.toLowerCase()}{" "}
                this UPI payment?
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground block">
                Remarks
              </label>

              <textarea
                value={
                  paymentVerificationData.remarks
                }
                onChange={(e) =>
                  setPaymentVerificationData(
                    {
                      ...paymentVerificationData,
                      remarks:
                        e.target.value,
                    }
                  )
                }
                placeholder="Enter verification notes..."
                className="w-full text-sm border border-border bg-card rounded-md p-2 focus:outline-none focus:border-[#10B981] min-h-[60px]"
              />
            </div>

            <div className="flex justify-end gap-2 text-xs font-semibold">
              <button
                onClick={() =>
                  setPaymentVerificationData(
                    null
                  )
                }
                className="h-9 px-4 rounded-md border border-border bg-card text-muted-foreground"
              >
                Cancel
              </button>

              <button
                onClick={
                  handleProcessPaymentVerification
                }
                className={`h-9 px-4 rounded-md text-white ${
                  paymentVerificationData.action ===
                  "Approve"
                    ? "bg-[#10B981] hover:bg-[#059669]"
                    : "bg-[#EF4444] hover:bg-[#DC2626]"
                }`}
              >
                {paymentVerificationData.action}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          SCREENSHOT LIGHTBOX
      ===================================================== */}

      {activeScreenshotUrl && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() =>
            setActiveScreenshotUrl(null)
          }
        >
          <div
            className="relative max-w-3xl w-full max-h-[85vh] flex items-center justify-center"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <button
              onClick={() =>
                setActiveScreenshotUrl(null)
              }
              className="absolute -top-10 right-0 text-white hover:text-gray-300 bg-black/20 p-1.5 rounded-full"
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

      {/* =====================================================
          STOCK CONFLICT MODAL
      ===================================================== */}

      {stockConflict?.visible && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Insufficient stock available
              </h3>

              <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border text-sm space-y-1">
                <p>
                  <span className="font-semibold text-muted-foreground">
                    Product:
                  </span>{" "}
                  {stockConflict.productName}
                </p>

                <p className="text-[#10B981] font-semibold">
                  <span className="text-muted-foreground">
                    Available Stock:
                  </span>{" "}
                  {stockConflict.availableStock}
                </p>

                <p className="text-[#EF4444] font-semibold">
                  <span className="text-muted-foreground">
                    Requested:
                  </span>{" "}
                  {stockConflict.requestedQty}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 text-xs font-semibold">
              <button
                onClick={
                  handleModifyQuantityToAvailable
                }
                className="w-full h-10 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white flex items-center justify-center"
              >
                Modify quantity to available stock
              </button>

              <button
                onClick={() => {
                  const orderId =
                    stockConflict.orderId;

                  setStockConflict(null);

                  triggerActionConfirmation(
                    orderId,
                    "Reject"
                  );
                }}
                className="w-full h-10 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-white"
              >
                Reject Order
              </button>

              <button
                onClick={() =>
                  setStockConflict(null)
                }
                className="w-full h-10 rounded-lg border border-border bg-card text-muted-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          ORDER DETAILS DRAWER
      ===================================================== */}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/40 backdrop-blur-xs"
            onClick={() =>
              setSelectedOrder(null)
            }
          />

          <div className="w-full max-w-md bg-card border-l border-border overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between z-10">
              <div>
                <p className="font-mono text-xs text-muted-foreground">
                  Order Ref:{" "}
                  {selectedOrder.orderNumber}
                </p>

                <h2 className="font-semibold text-foreground">
                  Order Details
                </h2>
              </div>

              <button
                onClick={() =>
                  setSelectedOrder(null)
                }
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted border border-transparent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">

              {/* STATUS */}

              <div className="flex items-center justify-between">
                {(() => {
                  const status =
                    selectedOrder.orderStatus;

                  const s =
                    statusColors[
                      status
                    ] ||
                    statusColors.Pending;

                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full font-medium ${s.bg} ${s.text}`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${s.dot}`}
                      />

                      {status}
                    </span>
                  );
                })()}

                <span className="text-xs text-muted-foreground">
                  {selectedOrder.date}
                </span>
              </div>

              {/* CANCELLATION */}

              {selectedOrder.orderStatus ===
                "Cancelled" && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-red-800 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    Cancellation Details
                  </div>

                  <div className="text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-red-700">
                        Cancelled By
                      </span>

                      <span className="text-red-900 font-bold capitalize">
                        {selectedOrder.cancelledBy ||
                          "Customer"}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-red-700">
                        Reason
                      </span>

                      <span className="text-red-900 font-bold">
                        {selectedOrder.cancelReason ||
                          "Changed my mind"}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-red-700">
                        Cancelled At
                      </span>

                      <span className="text-red-900 font-bold">
                        {formatDate(
                          selectedOrder.cancelledAt
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TIMELINE */}

              <div className="bg-muted/20 border border-border/60 rounded-xl p-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
                  Order Progress Timeline
                </p>

                <div className="flex flex-col space-y-3 relative">
                  {timelineStages.map(
                    (
                      stage,
                      idx
                    ) => {
                      const currentIdx =
                        timelineStages.indexOf(
                          selectedOrder.orderStatus
                        );

                      const isCompleted =
                        idx <=
                          currentIdx &&
                        selectedOrder.orderStatus !==
                          "Cancelled";

                      const isCurrent =
                        stage ===
                        selectedOrder.orderStatus;

                      const logNode =
                        selectedOrder.trackingHistory.find(
                          (history) =>
                            history.status ===
                            stage
                        );

                      return (
                        <div
                          key={
                            stage
                          }
                          className="flex items-start gap-3 relative z-10"
                        >
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              isCurrent
                                ? "bg-[#10B981] text-white ring-4 ring-[#10B981]/20"
                                : isCompleted
                                ? "bg-[#D1FAE5] text-[#065F46]"
                                : "bg-muted text-muted-foreground border border-border"
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle className="w-3.5 h-3.5" />
                            ) : (
                              idx + 1
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-xs font-semibold ${
                                isCurrent
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {stage}
                            </p>

                            {logNode ? (
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3" />
                                {logNode.date}{" "}
                                @{" "}
                                {logNode.time}
                              </p>
                            ) : isCompleted ? (
                              <p className="text-[10px] text-muted-foreground italic">
                                Completed
                              </p>
                            ) : (
                              <p className="text-[10px] text-muted-foreground/50 italic">
                                Pending stage
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}

                  <div className="absolute top-3 left-3 bottom-3 w-0.5 bg-border -z-0" />
                </div>
              </div>

              {/* CUSTOMER */}

              <div className="bg-muted/40 border border-border/50 rounded-xl p-3 space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Customer Info & Delivery Address
                </p>

                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">
                    {selectedOrder.customer}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {selectedOrder.phone}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground pl-6">
                  Email:{" "}
                  {selectedOrder.email}
                </div>

                <div className="border-t border-border/60 pt-2">
                  <div className="flex items-start gap-2 text-xs">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />

                    {selectedOrder.address ? (
                      <div className="space-y-0.5">
                        <p className="font-semibold">
                          Deliver To:{" "}
                          {
                            selectedOrder
                              .address
                              .name
                          }
                        </p>

                        <p>
                          {
                            selectedOrder
                              .address
                              .addressLine
                          }
                        </p>

                        <p>
                          {
                            selectedOrder
                              .address
                              .area
                          }
                          ,{" "}
                          {
                            selectedOrder
                              .address
                              .city
                          }
                        </p>

                        <p className="font-mono">
                          PIN:{" "}
                          {
                            selectedOrder
                              .address
                              .pincode
                          }
                        </p>

                        {selectedOrder.address.latitude !==
                          null &&
                          selectedOrder.address.longitude !==
                            null && (
                            <p className="font-mono text-[10px] text-muted-foreground pt-1">
                              Location:{" "}
                              {
                                selectedOrder
                                  .address
                                  .latitude
                              }
                              ,{" "}
                              {
                                selectedOrder
                                  .address
                                  .longitude
                              }
                            </p>
                          )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">
                        No verified delivery address specified.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ITEMS */}

              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-[#10B981]" />
                  Ordered Items
                </p>

                <div className="space-y-1 bg-muted/20 border border-border/40 rounded-xl p-3">
                  {selectedOrder.items.map(
                    (item, index) => (
                      <div
                        key={
                          `${selectedOrder.id}-${index}`
                        }
                        className="flex justify-between items-center py-2 border-b border-border/40 last:border-0"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-sm font-medium truncate">
                            {item.name}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            Qty:{" "}
                            {item.qty}{" "}
                            ×{" "}
                            {item.unitPrice}
                          </p>
                        </div>

                        <p className="text-sm font-semibold">
                          {item.totalPrice}
                        </p>
                      </div>
                    )
                  )}

                  <div className="border-t border-border/60 mt-3 pt-2 space-y-1 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>
                        Products Total
                      </span>

                      <span>
                        {money(
                          selectedOrder.subtotal
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between text-muted-foreground">
                      <span>
                        Commission
                        {selectedOrder.subtotal >
                          0 &&
                        selectedOrder.vendorCommission >
                          0
                          ? ` (${Math.round(
                              (selectedOrder.vendorCommission /
                                selectedOrder.subtotal) *
                                100
                            )}%)`
                          : ""}
                      </span>

                      <span>
                        {selectedOrder.vendorCommission >
                        0
                          ? "-"
                          : ""}
                        {money(
                          selectedOrder.vendorCommission
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-border/40 text-sm font-bold">
                      <span>
                        Settlement Amount
                      </span>

                      <span className="text-base text-[#10B981] font-black">
                        {money(
                          selectedOrder.vendorEarning
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PAYMENT */}

              <div className="bg-muted/40 border border-border/50 rounded-xl p-3 space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Detailed Payment Summary
                </p>

                <div className="grid grid-cols-2 gap-y-3 text-xs border-b border-border/40 pb-2">
                  <div>
                    <span className="text-muted-foreground block">
                      Payment Method
                    </span>

                    <span className="font-semibold uppercase">
                      {selectedOrder.paymentDetails?.method ||
                        "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block">
                      Payment Status
                    </span>

                    <span className="mt-0.5 block">
                      {renderPaymentBadge(
                        selectedOrder
                          .paymentDetails
                          ?.method,
                        selectedOrder
                          .paymentDetails
                          ?.status
                      )}
                    </span>
                  </div>

                  {selectedOrder.paymentDetails &&
                    (
                      selectedOrder
                        .paymentDetails
                        .method ||
                      ""
                    )
                      .trim()
                      .toLowerCase() ===
                      "upi" && (
                      <div className="col-span-2 border-t border-border/40 pt-2 grid grid-cols-2 gap-y-2">
                        <div>
                          <span className="text-muted-foreground block">
                            Payment Proof
                          </span>

                          {selectedOrder.paymentDetails
                            .paymentProofUrl ? (
                            <button
                              onClick={() =>
                                setActiveScreenshotUrl(
                                  selectedOrder
                                    .paymentDetails
                                    ?.paymentProofUrl ||
                                    null
                                )
                              }
                              className="inline-flex items-center gap-1 text-xs text-[#10B981] hover:underline font-semibold mt-0.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View Screenshot
                            </button>
                          ) : (
                            <span className="text-muted-foreground italic">
                              Not provided
                            </span>
                          )}
                        </div>

                        <div>
                          <span className="text-muted-foreground block">
                            Verification Time
                          </span>

                          <span className="font-medium">
                            {selectedOrder.paymentDetails
                              .verifiedAt
                              ? new Date(
                                  selectedOrder
                                    .paymentDetails
                                    .verifiedAt
                                ).toLocaleString(
                                  "en-IN",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute:
                                      "2-digit",
                                  }
                                )
                              : "—"}
                          </span>
                        </div>

                        <div className="col-span-2">
                          <span className="text-muted-foreground block">
                            Verification Remarks
                          </span>

                          <span className="font-medium block bg-background/50 p-1.5 rounded border border-border/40 min-h-[28px] mt-0.5">
                            {selectedOrder.paymentDetails
                              .verificationRemarks || (
                              <span className="text-muted-foreground italic">
                                No remarks
                              </span>
                            )}
                          </span>
                        </div>

                        {selectedOrder.paymentDetails
                          .verifiedBy && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground block">
                              Verified By
                            </span>

                            <span className="font-medium text-[11px] block truncate">
                              {verifierNames[
                                selectedOrder
                                  .paymentDetails
                                  .verifiedBy
                              ] ||
                                "Verified User"}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                </div>

                {/* UPI ACTIONS */}

                {selectedOrder.paymentDetails &&
                  (
                    selectedOrder
                      .paymentDetails
                      .method || ""
                  )
                    .trim()
                    .toLowerCase() ===
                    "upi" &&
                  (
                    selectedOrder
                      .paymentDetails
                      .status || ""
                  )
                    .trim()
                    .toLowerCase() ===
                    "pending" &&
                  selectedOrder.orderStatus !==
                    "Cancelled" && (
                    <div className="flex gap-2 pt-1 border-t border-dashed border-border/60">
                      <button
                        onClick={() =>
                          setPaymentVerificationData(
                            {
                              orderId:
                                selectedOrder.id,
                              action:
                                "Approve",
                              remarks:
                                "",
                              visible:
                                true,
                            }
                          )
                        }
                        className="flex-1 h-8 rounded-md bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold"
                      >
                        Approve Payment
                      </button>

                      <button
                        onClick={() =>
                          setPaymentVerificationData(
                            {
                              orderId:
                                selectedOrder.id,
                              action:
                                "Reject",
                              remarks:
                                "",
                              visible:
                                true,
                            }
                          )
                        }
                        className="flex-1 h-8 rounded-md bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-semibold"
                      >
                        Reject Payment
                      </button>
                    </div>
                  )}

                {/* COD */}

                {selectedOrder.orderStatus ===
                  "Delivered" &&
                  selectedOrder.paymentDetails &&
                  (
                    selectedOrder
                      .paymentDetails
                      .method || ""
                  )
                    .trim()
                    .toLowerCase() !==
                    "upi" && (
                    <div className="bg-muted/60 p-2.5 rounded-lg text-xs space-y-1.5 border border-border/40">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Cash Tendered:
                        </span>

                        <span className="font-semibold">
                          {
                            selectedOrder
                              .paymentDetails
                              .cashReceived
                          }
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Change Returned:
                        </span>

                        <span className="font-semibold">
                          {
                            selectedOrder
                              .paymentDetails
                              .changeReturned
                          }
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-1 border-t border-dashed border-border">
                        <span className="text-muted-foreground">
                          Collected By Rider:
                        </span>

                        <span className="font-bold text-[#10B981]">
                          {
                            selectedOrder
                              .paymentDetails
                              .collectedByRider
                          }
                        </span>
                      </div>
                    </div>
                  )}
              </div>

              {/* RIDER */}

              <div className="bg-muted/40 border border-border/50 rounded-xl p-3 space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Bike className="w-3.5 h-3.5 text-[#3B82F6]" />
                  Assigned Fleet Logistics
                </p>

                {selectedOrder.rider ? (
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold">
                          {
                            selectedOrder
                              .rider
                              .name
                          }
                        </h4>

                        <p className="text-xs text-muted-foreground mt-0.5">
                          {
                            selectedOrder
                              .rider
                              .vehicleType
                          }{" "}
                          •{" "}
                          {
                            selectedOrder
                              .rider
                              .locationArea
                          }
                        </p>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className="text-xs font-semibold bg-[#FEF3C7] text-[#92400E] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-current" />
                          {
                            selectedOrder
                              .rider
                              .rating
                          }
                        </span>

                        <p className="text-[10px] text-muted-foreground mt-1">
                          {
                            selectedOrder
                              .rider
                              .ordersCompleted
                          }{" "}
                          orders finished
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-border/60 pt-2 bg-background/40 p-2 rounded-lg">
                      <div>
                        <span className="text-muted-foreground text-[10px] block">
                          Pickup Time
                        </span>

                        <p className="font-semibold mt-0.5">
                          {
                            selectedOrder
                              .rider
                              .pickupTime
                          }
                        </p>
                      </div>

                      <div>
                        <span className="text-muted-foreground text-[10px] block">
                          Delivered Time
                        </span>

                        <p className="font-semibold mt-0.5">
                          {
                            selectedOrder
                              .rider
                              .deliveredTime
                          }
                        </p>
                      </div>
                    </div>

                    {selectedOrder.rider.phone && (
                      <div className="flex gap-2 pt-1.5">
                        <a
                          href={`tel:${selectedOrder.rider.phone}`}
                          className="flex-1 h-8 rounded-md bg-card border border-border text-xs font-semibold flex items-center justify-center gap-1 hover:bg-muted"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          Call Rider
                        </a>

                        <a
                          href={`https://wa.me/${selectedOrder.rider.phone.replace(
                            /[^0-9]/g,
                            ""
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 h-8 rounded-md bg-[#25D366] text-white text-xs font-semibold flex items-center justify-center gap-1"
                        >
                          WhatsApp Rider
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground py-1 italic flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Unassigned
                  </div>
                )}
              </div>

              {/* DRAWER ACTIONS */}

              <div className="space-y-2 pt-2">
                {(() => {
                  const status =
                    selectedOrder.orderStatus;

                  const actions =
                    status ===
                    "Cancelled"
                      ? []
                      : actionButtons[
                          status
                        ] || [];

                  if (
                    actions.length === 0
                  ) {
                    return null;
                  }

                  return (
                    <div className="flex gap-2">
                      {actions.map(
                        (a) => {
                          const isBtnLoading =
                            actionLoading ===
                            `${selectedOrder.id}-${a.label}`;

                          return (
                            <button
                              key={
                                a.label
                              }
                              disabled={
                                actionLoading !==
                                null
                              }
                              onClick={() =>
                                triggerActionConfirmation(
                                  selectedOrder.id,
                                  a.label
                                )
                              }
                              className={`flex-1 h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 ${a.color}`}
                            >
                              {isBtnLoading && (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              )}

                              {
                                a.label
                              }
                            </button>
                          );
                        }
                      )}
                    </div>
                  );
                })()}

                <button
                  disabled={
                    actionLoading !==
                    null
                  }
                  onClick={() =>
                    triggerActionConfirmation(
                      selectedOrder.id,
                      "Delete Order (Temp)"
                    )
                  }
                  className="w-full h-9 rounded-lg border border-red-200 bg-red-50/50 text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Permanent Purge Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}