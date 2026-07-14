import React, { useEffect, useState } from 'react';
import { 
  getCurrentVendor, 
  getVendorProfile, 
  getProductStats, 
  getRiderStats, 
  Vendor, 
  VendorProfile, 
  ProductStats, 
  RiderStats 
} from "../../../services/vendorService";

interface StoreManagementProps {
  onNavigate: (route: string) => void;
}

export default function StoreManagement({ onNavigate }: StoreManagementProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [productStats, setProductStats] = useState<ProductStats | null>(null);
  const [riderStats, setRiderStats] = useState<RiderStats | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch current vendor first to secure the vendorId
        const vendorRes = await getCurrentVendor();
        if (!vendorRes.success || !vendorRes.data) {
          throw new Error(vendorRes.error || 'Failed to resolve current vendor context.');
        }
        setVendor(vendorRes.data);
        const vendorId = vendorRes.data.id;

        // Execute subsequent state fetches concurrently using the resolved vendorId
        const [profileRes, productRes, riderRes] = await Promise.all([
          getVendorProfile(vendorId),
          getProductStats(vendorId),
          getRiderStats(vendorId),
        ]);

        if (!profileRes.success) throw new Error(profileRes.error || 'Failed to load vendor profile.');
        if (!productRes.success) throw new Error(productRes.error || 'Failed to load inventory metrics.');
        if (!riderRes.success) throw new Error(riderRes.error || 'Failed to load logistics metrics.');

        setProfile(profileRes.data || null);
        setProductStats(productRes.data || null);
        setRiderStats(riderRes.data || null);
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred while compiling store data.');
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const renderValue = (value: any) => {
    if (value === null || value === undefined || String(value).trim() === '') {
      return <span className="text-muted-foreground italic font-normal text-sm">Not Configured</span>;
    }
    return String(value);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-6">
        <div className="flex items-center space-x-3">
          <svg className="animate-spin h-5 w-5 text-foreground" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-medium tracking-wide">Syncing store records...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-6">
        <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 shadow-sm text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2">Data Synchronization Failed</h2>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-border text-sm font-medium rounded-md bg-background hover:bg-card transition-colors duration-200"
          >
            Retry Verification
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <header className="mb-8 pb-5 border-b border-border flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{vendor?.shop_name || 'Store Management'}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Terminal configuration and operational analytics for Shop Code: <span className="font-mono font-medium text-foreground">{vendor?.shop_code || 'N/A'}</span>
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Operational State:</span>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium tracking-wide border ${
              vendor?.status === 'active' 
                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/50' 
                : 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-900/50'
            }`}>
              {vendor?.status ? vendor.status.toUpperCase() : 'UNKNOWN'}
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Configuration Metrics Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Store Overview Card */}
            <section className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="border-b border-border px-6 py-4 bg-muted/20">
                <h2 className="text-base font-semibold tracking-tight">Core Identity Context</h2>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Shop Name</label>
                  <div className="text-sm font-medium">{renderValue(vendor?.shop_name)}</div>
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Shop Code</label>
                  <div className="text-sm font-mono font-medium">{renderValue(vendor?.shop_code)}</div>
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Owner Name</label>
                  <div className="text-sm font-medium">{renderValue(vendor?.owner_name)}</div>
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Phone Reference</label>
                  <div className="text-sm font-medium">{renderValue(vendor?.phone)}</div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Email Interface</label>
                  <div className="text-sm font-medium">{renderValue(vendor?.email)}</div>
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Store Status</label>
                  <div className="text-sm font-medium">{renderValue(profile?.store_status)}</div>
                </div>
              </div>
            </section>

            {/* Business Information Card */}
            <section className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="border-b border-border px-6 py-4 bg-muted/20">
                <h2 className="text-base font-semibold tracking-tight">Regulatory & Compliance Credentials</h2>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Address Line 1</label>
                  <div className="text-sm font-medium">{renderValue(profile?.address_line1)}</div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Address Line 2</label>
                  <div className="text-sm font-medium">{renderValue(profile?.address_line2)}</div>
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">City</label>
                  <div className="text-sm font-medium">{renderValue(profile?.city)}</div>
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">State</label>
                  <div className="text-sm font-medium">{renderValue(profile?.state)}</div>
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">PIN Code</label>
                  <div className="text-sm font-mono font-medium">{renderValue(profile?.pin_code)}</div>
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">GST Number</label>
                  <div className="text-sm font-mono font-medium tracking-wide">{renderValue(profile?.gst_number)}</div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">FSSAI License</label>
                  <div className="text-sm font-mono font-medium tracking-wide">{renderValue(profile?.fssai_license)}</div>
                </div>
              </div>
            </section>

          </div>

          {/* Side Performance Data & Actions Column */}
          <div className="space-y-8">
            
            {/* Quick Actions Panel */}
            <section className="bg-card border border-border rounded-xl shadow-sm p-6">
              <h2 className="text-base font-semibold tracking-tight mb-4">Control System</h2>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => onNavigate('products')}
                  className="w-full inline-flex items-center justify-between px-4 py-3 border border-border text-sm font-medium rounded-lg bg-background hover:bg-muted/30 transition-all duration-150"
                >
                  <span>Products</span>
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => onNavigate('smart-import')}
                  className="w-full inline-flex items-center justify-between px-4 py-3 border border-border text-sm font-medium rounded-lg bg-background hover:bg-muted/30 transition-all duration-150"
                >
                  <span>Smart Import</span>
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => onNavigate('settings')}
                  className="w-full inline-flex items-center justify-between px-4 py-3 border border-border text-sm font-medium rounded-lg bg-background hover:bg-muted/30 transition-all duration-150"
                >
                  <span>Settings</span>
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => onNavigate('profile')}
                  className="w-full inline-flex items-center justify-between px-4 py-3 border border-border text-sm font-medium rounded-lg bg-background hover:bg-muted/30 transition-all duration-150"
                >
                  <span>Profile</span>
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </section>

            {/* Inventory Statistics */}
            <section className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="border-b border-border px-6 py-4 bg-muted/20">
                <h2 className="text-base font-semibold tracking-tight">Inventory Statistics</h2>
              </div>
              <div className="divide-y divide-border">
                <div className="px-6 py-4 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Products</span>
                  <span className="text-lg font-bold tracking-tight">{productStats?.totalProducts ?? 0}</span>
                </div>
                <div className="px-6 py-4 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active Products</span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400 tracking-tight">{productStats?.activeProducts ?? 0}</span>
                </div>
                <div className="px-6 py-4 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Out of Stock</span>
                  <span className="text-lg font-bold text-red-600 dark:text-red-400 tracking-tight">{productStats?.outOfStockProducts ?? 0}</span>
                </div>
                <div className="px-6 py-4 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Inactive Products</span>
                  <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400 tracking-tight">{productStats?.inactiveProducts ?? 0}</span>
                </div>
              </div>
            </section>

            {/* Rider Statistics */}
            <section className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="border-b border-border px-6 py-4 bg-muted/20">
                <h2 className="text-base font-semibold tracking-tight">Rider Statistics</h2>
              </div>
              <div className="divide-y divide-border">
                <div className="px-6 py-4 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Assigned Riders</span>
                  <span className="text-lg font-bold tracking-tight">{riderStats?.assignedRiders ?? 0}</span>
                </div>
                <div className="px-6 py-4 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Available Riders</span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400 tracking-tight">{riderStats?.availableRiders ?? 0}</span>
                </div>
                <div className="px-6 py-4 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Busy Riders</span>
                  <span className="text-lg font-bold text-amber-600 dark:text-amber-400 tracking-tight">{riderStats?.busyRiders ?? 0}</span>
                </div>
              </div>
            </section>

          </div>

        </div>

      </div>
    </div>
  );
}