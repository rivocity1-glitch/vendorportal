export interface Order {
  id?: string | number;
  order_number?: string;
  order_status?: string | null;
  settled_vendor?: boolean | null;
  vendor_earning?: number | null;
  vendor_commission?: number | null;
  delivery_fee?: number | null;
  platform_fee?: number | null;
  created_at?: string | number | Date | null;
  rider_earning?: number | null;
  rivo_delivery_margin?: number | null;
}

export interface OrderItem {
  quantity?: number | null;
  products?: {
    name?: string | null;
    vendor_id?: string | number | null;
  } | null;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface RevenueDatasets {
  sevenDays: ChartDataPoint[];
  thirtyDays: ChartDataPoint[];
  monthly: ChartDataPoint[];
}

export interface StatusBreakdown {
  Pending: number;
  Accepted: number;
  Preparing: number;
  Packed: number;
  "Out For Delivery": number;
  Delivered: number;
  Cancelled: number;
}

export interface ProductSale {
  name: string;
  quantity: number;
}

// --- Internal Helper ---
function isDelivered(order: Order): boolean {
  return order?.order_status?.toLowerCase() === 'delivered';
}

function parseOrderDate(order: Order): Date | null {
  if (!order?.created_at) return null;
  const date = new Date(order.created_at);
  return isNaN(date.getTime()) ? null : date;
}

// --- Existing Functions ---

export function getPendingSettlement(orders: Order[] | null | undefined): number {
  if (!orders || !Array.isArray(orders)) return 0;
  return orders.reduce((sum, order) => {
    if (order && isDelivered(order) && order.settled_vendor === false && typeof order.vendor_earning === 'number') {
      return sum + order.vendor_earning;
    }
    return sum;
  }, 0);
}

export function getPaidSettlement(orders: Order[] | null | undefined): number {
  if (!orders || !Array.isArray(orders)) return 0;
  return orders.reduce((sum, order) => {
    if (order && isDelivered(order) && order.settled_vendor === true && typeof order.vendor_earning === 'number') {
      return sum + order.vendor_earning;
    }
    return sum;
  }, 0);
}

export function getWeeklySales(orders: Order[] | null | undefined): number {
  if (!orders || !Array.isArray(orders)) return 0;
  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);

  return orders.reduce((sum, order) => {
    if (order && isDelivered(order) && typeof order.vendor_earning === 'number') {
      const orderDate = parseOrderDate(order);
      if (orderDate && orderDate >= sevenDaysAgo && orderDate <= now) {
        return sum + order.vendor_earning;
      }
    }
    return sum;
  }, 0);
}

// --- New Functions ---

export function getTodaySales(orders: Order[] | null | undefined): number {
  if (!orders || !Array.isArray(orders)) return 0;
  const todayStr = new Date().toDateString();

  return orders.reduce((sum, order) => {
    if (order && isDelivered(order) && typeof order.vendor_earning === 'number') {
      const orderDate = parseOrderDate(order);
      if (orderDate && orderDate.toDateString() === todayStr) {
        return sum + order.vendor_earning;
      }
    }
    return sum;
  }, 0);
}

export function getMonthlySales(orders: Order[] | null | undefined): number {
  if (!orders || !Array.isArray(orders)) return 0;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return orders.reduce((sum, order) => {
    if (order && isDelivered(order) && typeof order.vendor_earning === 'number') {
      const orderDate = parseOrderDate(order);
      if (orderDate && orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
        return sum + order.vendor_earning;
      }
    }
    return sum;
  }, 0);
}

export function getYearlySales(orders: Order[] | null | undefined): number {
  if (!orders || !Array.isArray(orders)) return 0;
  const currentYear = new Date().getFullYear();

  return orders.reduce((sum, order) => {
    if (order && isDelivered(order) && typeof order.vendor_earning === 'number') {
      const orderDate = parseOrderDate(order);
      if (orderDate && orderDate.getFullYear() === currentYear) {
        return sum + order.vendor_earning;
      }
    }
    return sum;
  }, 0);
}

export function getAverageOrderValue(orders: Order[] | null | undefined): number {
  if (!orders || !Array.isArray(orders)) return 0;
  let count = 0;
  const total = orders.reduce((sum, order) => {
    if (order && isDelivered(order) && typeof order.vendor_earning === 'number') {
      count++;
      return sum + order.vendor_earning;
    }
    return sum;
  }, 0);
  return count > 0 ? total / count : 0;
}

export function getCompletionRate(orders: Order[] | null | undefined): number {
  if (!orders || !Array.isArray(orders) || orders.length === 0) return 0;
  const deliveredCount = orders.filter(order => order && isDelivered(order)).length;
  return (deliveredCount / orders.length) * 100;
}

export function getTopSellingProducts(
  orders: Order[] | null | undefined,
  orderItems: OrderItem[] | null | undefined
): ProductSale[] {
  if (!orderItems || !Array.isArray(orderItems)) return [];

  const productSalesMap: Record<string, number> = {};

  orderItems.forEach((item) => {
    if (item && item.products && typeof item.products.name === 'string' && typeof item.quantity === 'number') {
      const name = item.products.name;
      productSalesMap[name] = (productSalesMap[name] || 0) + item.quantity;
    }
  });

  return Object.entries(productSalesMap)
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity);
}

export function getRevenueChart(orders: Order[] | null | undefined): RevenueDatasets {
  const result: RevenueDatasets = { sevenDays: [], thirtyDays: [], monthly: [] };
  if (!orders || !Array.isArray(orders)) return result;

  const now = new Date();

  // Helper date lists
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // 1. Last 7 Days Timeline Map
  const sevenDaysMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    sevenDaysMap[d.toDateString()] = 0;
  }

  // 2. Last 30 Days Timeline Map
  const thirtyDaysMap: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    thirtyDaysMap[d.toDateString()] = 0;
  }

  // 3. Current Year Months Map
  const monthlyMap: Record<string, number> = {};
  months.forEach(m => { monthlyMap[m] = 0; });

  // Map earnings to metrics
  orders.forEach((order) => {
    if (order && isDelivered(order) && typeof order.vendor_earning === 'number') {
      const orderDate = parseOrderDate(order);
      if (!orderDate) return;

      const dateStr = orderDate.toDateString();
      const earning = order.vendor_earning;

      if (dateStr in sevenDaysMap) sevenDaysMap[dateStr] += earning;
      if (dateStr in thirtyDaysMap) thirtyDaysMap[dateStr] += earning;
      if (orderDate.getFullYear() === now.getFullYear()) {
        const monthName = months[orderDate.getMonth()];
        monthlyMap[monthName] += earning;
      }
    }
  });

  result.sevenDays = Object.keys(sevenDaysMap).map(key => ({
    label: weekdays[new Date(key).getDay()],
    value: sevenDaysMap[key]
  }));

  result.thirtyDays = Object.keys(thirtyDaysMap).map(key => ({
    label: new Date(key).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
    value: thirtyDaysMap[key]
  }));

  result.monthly = months.map(m => ({
    label: m,
    value: monthlyMap[m]
  }));

  return result;
}

export function getOrderStatusBreakdown(orders: Order[] | null | undefined): StatusBreakdown {
  const breakdown: StatusBreakdown = {
    Pending: 0,
    Accepted: 0,
    Preparing: 0,
    Packed: 0,
    "Out For Delivery": 0,
    Delivered: 0,
    Cancelled: 0
  };

  if (!orders || !Array.isArray(orders)) return breakdown;

  orders.forEach((order) => {
    if (!order || !order.order_status) return;
    const status = order.order_status.toLowerCase();

    if (status === 'pending') breakdown.Pending++;
    else if (status === 'accepted') breakdown.Accepted++;
    else if (status === 'preparing') breakdown.Preparing++;
    else if (status === 'packed') breakdown.Packed++;
    else if (status === 'out for delivery') breakdown["Out For Delivery"]++;
    else if (status === 'delivered') breakdown.Delivered++;
    else if (status === 'cancelled') breakdown.Cancelled++;
  });

  return breakdown;
}

export function getVendorCommission(orders: Order[] | null | undefined): number {
  if (!orders || !Array.isArray(orders)) return 0;
  return orders.reduce((sum, order) => {
    if (order && typeof order.vendor_commission === 'number') {
      return sum + order.vendor_commission;
    }
    return sum;
  }, 0);
}

export function getPlatformRevenue(orders: Order[] | null | undefined): number {
  if (!orders || !Array.isArray(orders)) return 0;
  return orders.reduce((sum, order) => {
    if (order) {
      const commission = order.vendor_commission ?? 0;
      const platformFee = order.platform_fee ?? 0;
      const margin = order.rivo_delivery_margin ?? 0;
      return sum + commission + platformFee + margin;
    }
    return sum;
  }, 0);
}

export function getRiderPayout(orders: Order[] | null | undefined): number {
  if (!orders || !Array.isArray(orders)) return 0;
  return orders.reduce((sum, order) => {
    if (order) {
      return sum + (order.rider_earning ?? 0);
    }
    return sum;
  }, 0);
}