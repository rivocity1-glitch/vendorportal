import { supabase } from './supabase';

export interface SubscriptionFeatures {
  dashboard: boolean;
  orders: boolean;
  products: boolean;
  inventory: boolean;
  reviews: boolean;
  notifications: boolean;
  analytics: boolean;
  offers: boolean;
  marketing: boolean;
  priority_settlement: boolean;
  featured_store: boolean;
  export_reports: boolean;
  ai_tools: boolean;
}

export interface VendorSubscription {
  planName: string;
  price: number;
  commission_percent: number;
  features: Partial<SubscriptionFeatures>;
}

interface PlanConfig {
  price: number;
  commission_percent: number;
  features: Partial<SubscriptionFeatures>;
}

interface SubscriptionConfig {
  plans: Record<string, PlanConfig>;
}

const ABSOLUTE_FALLBACK: VendorSubscription = {
  planName: 'free',
  price: 0,
  commission_percent: 5,
  features: {
    dashboard: true,
    orders: true,
    products: true,
  },
};

/**
 * Retrieves the active subscription and configuration for the currently logged-in vendor.
 */
export async function getVendorSubscription(): Promise<VendorSubscription> {
  let config: SubscriptionConfig | null = null;

  try {
    // 1. Get logged in user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    // 2. Find vendor using auth_user_id
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (vendorError || !vendor) throw new Error('Vendor not found');

    // 3. Read subscriptions table and look for active status
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('plan_name, commission_percent, status')
      .eq('vendor_id', vendor.id)
      .eq('status', 'active')
      .maybeSingle();

    if (subError) throw subError;
    const planName = subscription?.plan_name || 'free';

    // 4. Read subscription configuration from platform_settings
    const { data: settings, error: settingsError } = await supabase
      .from('platform_settings')
      .select('setting_value')
      .eq('setting_key', 'subscription_config')
      .single();

    if (settingsError || !settings) throw new Error('Subscription configuration missing');

    const parsedConfig = typeof settings.setting_value === 'string'
      ? JSON.parse(settings.setting_value)
      : settings.setting_value;

    config = parsedConfig as SubscriptionConfig;

    const planDetails = config?.plans?.[planName];
    if (!planDetails) throw new Error(`Plan details for "${planName}" missing from config`);

    // Override config commission with specific subscription commission if present
    const finalCommission = subscription?.commission_percent ?? planDetails.commission_percent ?? 5;

    return {
      planName,
      price: planDetails.price ?? 0,
      commission_percent: finalCommission,
      features: planDetails.features || {},
    };

  } catch (error) {
    console.error('Error fetching vendor subscription:', error);

    if (config?.plans?.free) {
      return {
        planName: 'free',
        price: config.plans.free.price ?? 0,
        commission_percent: config.plans.free.commission_percent ?? 5,
        features: config.plans.free.features || {},
      };
    }

    return ABSOLUTE_FALLBACK;
  }
}

/**
 * Checks if a given feature is enabled within the vendor's subscription.
 */
export function hasFeature(
  subscription: VendorSubscription | null | undefined,
  feature: keyof SubscriptionFeatures
): boolean {
  return !!subscription?.features?.[feature];
}