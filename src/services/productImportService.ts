import { supabase } from '../lib/supabase';
import { ReviewItem } from '../smart-imports/types';

/**
 * Commits successfully parsed and human-reviewed product items directly into the Supabase database.
 * Resolves active vendor authentication contexts to safely link product catalogs.
 * Throws meaningful errors if authentication lookup or bulk database insertions fail.
 * * @param items Array of evaluated and edited ReviewItem elements.
 * @returns A promise that resolves when the database operations are successfully committed.
 */
export async function importReviewedProducts(items: ReviewItem[]): Promise<void> {
  // Filter out records that were explicitly unselected by the user in the review table layout
  const selectedItems = items.filter(item => item.selected);
  if (selectedItems.length === 0) {
    return;
  }

  // 1 & 2. Fetch the current authenticated user session metadata
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    throw new Error(`Authentication context invalid: ${authError?.message || 'No active user session found.'}`);
  }

  // 3. Resolve the structural vendor record entry linked to the auth UUID identifier
  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('id')
    .eq('auth_user_id', authData.user.id)
    .single();

  if (vendorError || !vendor) {
    throw new Error(`Vendor profile verification failed: ${vendorError?.message || 'No merchant profile matches this account.'}`);
  }

  const vendorId = vendor.id;
  const timestampNow = new Date().toISOString();

  // 4 & 5. Build structured payload matrices matching inventory table definitions
  const insertPayloads = selectedItems.map(item => {
    // Basic sanitization on parsing parameters to map values robustly
    const fallbackPrice = item.mrp ?? item.costPrice ?? 0;
    
    return {
      vendor_id: vendorId,
      name: item.name?.trim() || 'Imported Product',
      description: '',
      price: fallbackPrice,
      cost_price: item.costPrice ?? fallbackPrice,
      mrp: fallbackPrice,
      stock: item.stock ?? 0,
      batch_number: item.batch || null,
      expiry_date: item.expiry || null,
      category: item.category || 'General',
      status: 'active',
      created_at: timestampNow,
      updated_at: timestampNow
    };
  });

  // 6. Commit structural bulk insertion payloads to the backend product table ledger layers
  const { error: insertError } = await supabase
    .from('products')
    .insert(insertPayloads);

  if (insertError) {
    throw new Error(`Catalog import operation failed: ${insertError.message}`);
  }
}