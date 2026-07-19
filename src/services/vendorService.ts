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
  store_name: string | null;
  tagline: string | null;
  categories: string[] | null;
  avatar_url: string | null;
  banner_url: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  pin_code: string | null;
  latitude: number | null;
  longitude: number | null;
  store_status: string | null;
  status_remarks: string | null;
  business_hours: any | null;
  delivery_radius_km: number | null;
  minimum_order: number | null;
  preparation_time_minutes: number | null;
  pan_number: string | null;
  gst_number: string | null;
  fssai_license: string | null;
  drug_license: string | null;
  drug_license_expiry: string | null;
  account_holder_name: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  upi_id: string | null;
  qr_code_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreImage {
  id: string;
  vendor_id: string;
  image_url: string;
  display_order: number;
  created_at: string;
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
      .select('*')
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

/**
 * Updates comprehensive vendor profile data records.
 */
export async function updateVendorProfile(
  vendorId: string,
  profileData: Partial<Omit<VendorProfile, 'vendor_id' | 'created_at' | 'updated_at'>>
): Promise<ServiceResponse<VendorProfile>> {
  try {
    if (!vendorId) {
      return { success: false, error: 'Vendor ID is required.' };
    }

    const { data, error } = await supabase
      .from('vendor_profiles')
      .update(profileData)
      .eq('vendor_id', vendorId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as VendorProfile };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while updating the vendor profile.',
    };
  }
}

/**
 * Updates localized operational configurations and parameters for store mapping.
 */
export async function updateStoreOperations(
  vendorId: string,
  operations: {
    store_status: string | null;
    business_hours: any | null;
    delivery_radius_km: number | null;
    minimum_order: number | null;
    preparation_time_minutes: number | null;
  }
): Promise<ServiceResponse<VendorProfile>> {
  try {
    if (!vendorId) {
      return { success: false, error: 'Vendor ID is required.' };
    }

    const { data, error } = await supabase
      .from('vendor_profiles')
      .update(operations)
      .eq('vendor_id', vendorId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as VendorProfile };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while updating store operations.',
    };
  }
}

/**
 * Updates disbursement variables and clearing routing settings for the vendor.
 */
export async function updateBankDetails(
  vendorId: string,
  bankDetails: {
    account_holder_name: string | null;
    bank_name: string | null;
    account_number: string | null;
    ifsc_code: string | null;
    upi_id: string | null;
  }
): Promise<ServiceResponse<VendorProfile>> {
  try {
    if (!vendorId) {
      return { success: false, error: 'Vendor ID is required.' };
    }

    const { data, error } = await supabase
      .from('vendor_profiles')
      .update(bankDetails)
      .eq('vendor_id', vendorId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as VendorProfile };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while updating bank details.',
    };
  }
}

/**
 * Updates required compliance verification context strings safely.
 */
export async function updateBusinessDocuments(
  vendorId: string,
  documents: {
    pan_number: string | null;
    gst_number: string | null;
    fssai_license: string | null;
    drug_license: string | null;
    drug_license_expiry: string | null;
  }
): Promise<ServiceResponse<VendorProfile>> {
  try {
    if (!vendorId) {
      return { success: false, error: 'Vendor ID is required.' };
    }

    const { data, error } = await supabase
      .from('vendor_profiles')
      .update(documents)
      .eq('vendor_id', vendorId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as VendorProfile };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while updating business documents.',
    };
  }
}

/**
 * Returns complete layout storage arrays of store images sorted sequentially.
 */
export async function getStoreImages(vendorId: string): Promise<ServiceResponse<StoreImage[]>> {
  try {
    if (!vendorId) {
      return { success: false, error: 'Vendor ID is required.' };
    }

    const { data, error } = await supabase
      .from('vendor_store_images')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return { success: true, data: data as StoreImage[] };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while fetching store images.',
    };
  }
}

/**
 * Appends new store visuals safely into structural reference tables.
 */
export async function createStoreImage(
  vendorId: string,
  imageUrl: string,
  displayOrder: number
): Promise<ServiceResponse<StoreImage>> {
  try {
    if (!vendorId || !imageUrl) {
      return { success: false, error: 'Vendor ID and Image URL are required.' };
    }

    const { data, error } = await supabase
      .from('vendor_store_images')
      .insert([
        {
          vendor_id: vendorId,
          image_url: imageUrl,
          display_order: displayOrder,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as StoreImage };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while creating the store image.',
    };
  }
}

/**
 * Removes individual asset context row parameters using record index keys.
 */
export async function deleteStoreImage(imageId: string): Promise<ServiceResponse<null>> {
  try {
    if (!imageId) {
      return { success: false, error: 'Image ID is required.' };
    }

    const { error } = await supabase
      .from('vendor_store_images')
      .delete()
      .eq('id', imageId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while deleting the store image.',
    };
  }
}

/**
 * Re-orders array sequential variables matching specified identification pointers.
 */
export async function updateStoreImageOrder(
  imagesOrder: { id: string; display_order: number }[]
): Promise<ServiceResponse<null>> {
  try {
    if (!imagesOrder || imagesOrder.length === 0) {
      return { success: false, error: 'Images order payload is required.' };
    }

    // Upsert payload array containing target primary keys and their updated indexes
    const { error } = await supabase
      .from('vendor_store_images')
      .upsert(imagesOrder);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while reordering store images.',
    };
  }
}