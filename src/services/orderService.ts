import { supabase } from '../lib/supabase'; // Adjust path based on your project structure

// Define Order interface based on typical schema requirements
export interface Order {
  id: string;
  created_at: string;
  status: 'Pending' | 'Accept' | 'Reject' | 'Preparing' | 'Packed' | 'Out For Delivery' | 'Delivered';
  rider_id?: string | null;
  // ... add other existing fields if necessary
}

/**
 * Fetches all orders directly from Supabase, ordered by newest first.
 * No caching, no debouncing, no memory-stored arrays.
 */
export async function getOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching orders:', error.message);
    throw error;
  }

  return data || [];
}

/**
 * Fetches a single order directly from Supabase to guarantee fresh state.
 */
export async function getOrderById(orderId: string): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error) {
    console.error(`Error fetching order ${orderId}:`, error.message);
    throw error;
  }

  return data;
}

/**
 * Updates the order status, awaits the DB operation, and returns the fresh updated order.
 */
export async function updateOrderStatus(
  orderId: string, 
  status: Order['status']
): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    console.error(`Error updating status for order ${orderId}:`, error.message);
    throw error;
  }

  return data;
}

/**
 * Assigns a rider to the order, awaits the DB operation, and immediately returns the updated order.
 */
export async function assignRider(orderId: string, riderId: string): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .update({ rider_id: riderId })
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    console.error(`Error assigning rider to order ${orderId}:`, error.message);
    throw error;
  }

  return data;
}