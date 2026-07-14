import { supabase } from '../lib/supabase'; // Assuming the existing supabase client is imported from here

// ==========================================
// Types & Interfaces
// ==========================================

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Vendor {
  id: string;
  auth_user_id: string;
  shop_name: string;
  owner_name: string;
  email: string;
  phone: string;
  shop_code: string;
  status: string;
  category_id: string;
}

export interface VendorProfile {
  vendor_id: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pin_code: string;
  gst_number: string;
  fssai_license: string;
  store_status: string;
  banner_url: string;
  latitude: number;
  longitude: number;
  qr_code_url: string;
}

export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  outOfStockProducts: number;
}

export interface RiderStats {
  assignedRiders: number;
  availableRiders: number;
  busyRiders: number;
}

// ==========================================
// Vendor Service Functions
// ==========================================

/**
 * Fetches the current vendor record using the authenticated user's ID.
 */
export async function getCurrentVendor(): Promise<ServiceResponse<Vendor>> {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!authData.user) {
      return { success: false, error: 'No authenticated user session found.' };
    }

    const { data, error } = await supabase
      .from('vendors')
      .select('id, auth_user_id, shop_name, owner_name, email, phone, shop_code, status, category_id')
      .eq('auth_user_id', authData.user.id)
      .single();

    if (error) throw error;
    if (!data) {
      return { success: false, error: 'Vendor record not found for this user.' };
    }

    return { success: true, data: data as Vendor };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while fetching the current vendor.',
    };
  }
}

/**
 * Fetches the specific profile details for a given vendor ID.
 */
export async function getVendorProfile(vendorId: string): Promise<ServiceResponse<VendorProfile>> {
  try {
    if (!vendorId) {
      return { success: false, error: 'Vendor ID is required.' };
    }

    const { data, error } = await supabase
      .from('vendor_profiles')
      .select('vendor_id, address_line1, address_line2, city, state, pin_code, gst_number, fssai_license, store_status, banner_url, latitude, longitude, qr_code_url')
      .eq('vendor_id', vendorId)
      .single();

    if (error) throw error;
    if (!data) {
      return { success: false, error: 'Vendor profile not found.' };
    }

    return { success: true, data: data as VendorProfile };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while fetching the vendor profile.',
    };
  }
}

/**
 * Calculates metrics for a vendor's inventory, distinguishing between active,
 * inactive, and completely out-of-stock products.
 */
export async function getProductStats(vendorId: string): Promise<ServiceResponse<ProductStats>> {
  try {
    if (!vendorId) {
      return { success: false, error: 'Vendor ID is required.' };
    }

    const { data, error } = await supabase
      .from('products')
      .select('stock, status')
      .eq('vendor_id', vendorId);

    if (error) throw error;

    const stats: ProductStats = {
      totalProducts: data.length,
      activeProducts: 0,
      inactiveProducts: 0,
      outOfStockProducts: 0,
    };

    data.forEach((product) => {
      if (product.status === 'active') stats.activeProducts++;
      if (product.status === 'inactive') stats.inactiveProducts++;
      if (Number(product.stock) <= 0) stats.outOfStockProducts++;
    });

    return { success: true, data: stats };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while computing product statistics.',
    };
  }
}

/**
 * Aggregates statistics about the riders assigned to the vendor,
 * mapping active assignments against current availability states.
 */
export async function getRiderStats(vendorId: string): Promise<ServiceResponse<RiderStats>> {
  try {
    if (!vendorId) {
      return { success: false, error: 'Vendor ID is required.' };
    }

    // Resolves assigned riders using the rider_vendor_assignments mapping table
    const { data, error } = await supabase
      .from('rider_vendor_assignments')
      .select('riders(id, rider_name, status, availability_status)')
      .eq('vendor_id', vendorId);

    if (error) throw error;

    const stats: RiderStats = {
      assignedRiders: data.length,
      availableRiders: 0,
      busyRiders: 0,
    };

    data.forEach((row: any) => {
      const rider = row.riders;
      if (rider) {
        if (rider.availability_status === 'available') stats.availableRiders++;
        if (rider.availability_status === 'busy') stats.busyRiders++;
      }
    });

    return { success: true, data: stats };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while computing rider statistics.',
    };
  }
}