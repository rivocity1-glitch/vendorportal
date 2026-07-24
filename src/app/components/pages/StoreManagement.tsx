import React, { useEffect, useState, useMemo } from 'react';
import { 
  Store, 
  MapPin, 
  Clock, 
  FileText, 
  Building2, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Search,
  X,
  Tag
} from 'lucide-react';
import { 
  getCurrentVendor, 
  getVendorProfile, 
  updateVendorProfile,
  updateStoreOperations,
  updateBankDetails,
  updateBusinessDocuments,
  VendorProfile
} from '../../../services/vendorService';
import { supabase } from '../../../lib/supabase';
import { StoreLocationPicker, ConfirmLocationPayload } from '../maps/StoreLocationPicker';

interface ProductCategory {
  id: string;
  name: string;
  status: string;
}

export default function StoreManagement() {
  // --- STATE FOR CORE VENDOR ---
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // --- TOAST NOTIFICATIONS STATE ---
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // --- INDEPENDENT SECTIONS LOAD/SAVE STATES ---
  const [savingSection, setSavingSection] = useState<string | null>(null);

  // --- MAP PICKER STATE ---
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  // --- SECTION 1: STORE INFO ---
  const [storeName, setStoreName] = useState('');
  const [tagline, setTagline] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  // --- NEW CATEGORIES STATES ---
  const [availableCategories, setAvailableCategories] = useState<ProductCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState<boolean>(false);
  const [primaryCategoryId, setPrimaryCategoryId] = useState<string>('');
  const [additionalCategoryNames, setAdditionalCategoryNames] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState<string>('');

  // --- SECTION 2: STORE LOCATION ---
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // --- SECTION 3: BUSINESS OPERATIONS ---
  const [storeStatus, setStoreStatus] = useState('closed');
  const [businessHours, setBusinessHours] = useState<any>({ open: '09:00', close: '22:00' });

  // --- SECTION 4: BUSINESS DOCUMENTS ---
  const [panNumber, setPanNumber] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [fssaiLicense, setFssaiLicense] = useState('');
  const [drugLicense, setDrugLicense] = useState('');
  const [drugLicenseExpiry, setDrugLicenseExpiry] = useState('');

  // --- SECTION 5: BANK DETAILS ---
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');

  // --- HELPER SHOW TOAST ---
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // --- COMPUTE ENTIRE LIST OF SELECTED CATEGORY NAMES FOR MEDICAL LOGIC & DISPLAY ---
  const allSelectedCategoryNames = useMemo(() => {
    const list: string[] = [];
    const primaryObj = availableCategories.find(c => c.id === primaryCategoryId);
    if (primaryObj) {
      list.push(primaryObj.name.trim());
    }
    additionalCategoryNames.forEach(name => {
      const trimmed = name.trim();
      if (trimmed && !list.includes(trimmed)) {
        list.push(trimmed);
      }
    });
    return list.sort((a, b) => a.localeCompare(b));
  }, [primaryCategoryId, additionalCategoryNames, availableCategories]);

  // --- CONDITIONAL MEDICAL CATEGORY DETECT ---
  const displaysDrugLicense = useMemo(() => {
    return allSelectedCategoryNames.some(name => name.toLowerCase().includes('medical') || name.toLowerCase().includes('pharmacy'));
  }, [allSelectedCategoryNames]);

  // --- FILTERED ADDITIONAL CATEGORIES FOR SEARCH ---
  const filteredAvailableCategories = useMemo(() => {
    return availableCategories.filter(cat => {
      const matchesSearch = cat.name.toLowerCase().includes(categorySearch.toLowerCase());
      const isPrimary = cat.id === primaryCategoryId;
      return matchesSearch && !isPrimary;
    });
  }, [availableCategories, categorySearch, primaryCategoryId]);

  // --- LOAD DYNAMIC CATEGORIES ---
  const loadProductCategories = async () => {
    try {
      setCategoriesLoading(true);
      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name, status')
        .eq('status', 'active');
      
      if (error) throw error;
      if (data) {
        const sorted = (data as ProductCategory[]).sort((a, b) => a.name.localeCompare(b.name));
        setAvailableCategories(sorted);
      }
    } catch (err: any) {
      console.error('Error loading product categories:', err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        await loadProductCategories();

        const vendorRes = await getCurrentVendor();
        if (!vendorRes.success || !vendorRes.data) {
          throw new Error(vendorRes.error || 'Failed to locate vendor token metadata.');
        }

        const currentId = vendorRes.data.id;
        setVendorId(currentId);
        if (vendorRes.data.category_id) {
          setPrimaryCategoryId(vendorRes.data.category_id);
        }

        const profileRes = await getVendorProfile(currentId);
        if (!profileRes.success || !profileRes.data) {
          throw new Error(profileRes.error || 'Failed to sync structural profile values.');
        }

        const profile: VendorProfile = profileRes.data;
        
        // Populate Component State Trees
        setStoreName(profile.store_name || vendorRes.data.shop_name || '');
        setTagline(profile.tagline || '');
        setAvatarUrl(profile.avatar_url || '');
        setBannerUrl(profile.banner_url || '');
        
        // Initialize additional category names safely filter out any UUID leaks if they exist
        if (profile.categories && Array.isArray(profile.categories)) {
          setAdditionalCategoryNames(profile.categories);
        }
        
        setAddressLine1(profile.address_line1 || '');
        setAddressLine2(profile.address_line2 || '');
        setCity(profile.city || '');
        setState(profile.state || '');
        setPinCode(profile.pin_code || '');
        setLatitude(profile.latitude ? String(profile.latitude) : '');
        setLongitude(profile.longitude ? String(profile.longitude) : '');

        setStoreStatus(profile.store_status || 'closed');
        if (profile.business_hours) setBusinessHours(profile.business_hours);

        setPanNumber(profile.pan_number || '');
        setGstNumber(profile.gst_number || '');
        setFssaiLicense(profile.fssai_license || '');
        setDrugLicense(profile.drug_license || '');
        setDrugLicenseExpiry(profile.drug_license_expiry || '');

        setAccountHolderName(profile.account_holder_name || '');
        setBankName(profile.bank_name || '');
        setAccountNumber(profile.account_number || '');
        setIfscCode(profile.ifsc_code || '');
        setUpiId(profile.upi_id || '');

      } catch (err: any) {
        showToast(err.message || 'Error processing sync sequence.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // --- HANDLERS FOR NEW CATEGORY UI ---
  const handlePrimaryCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextPrimaryId = e.target.value;
    setPrimaryCategoryId(nextPrimaryId);
  };

  const handleToggleAdditionalCategory = (name: string) => {
    const trimmed = name.trim();
    if (additionalCategoryNames.includes(trimmed)) {
      setAdditionalCategoryNames(additionalCategoryNames.filter(n => n !== trimmed));
    } else {
      setAdditionalCategoryNames([...additionalCategoryNames, trimmed]);
    }
  };

  const handleRemoveCategoryPill = (name: string) => {
    const trimmed = name.trim();
    const primaryObj = availableCategories.find(c => c.id === primaryCategoryId);
    if (primaryObj && primaryObj.name.trim() === trimmed) {
      showToast("Please choose another Primary Category.", "error");
      return;
    }
    setAdditionalCategoryNames(additionalCategoryNames.filter(n => n.trim() !== trimmed));
  };

  // --- LOCATION PICKER CONFIRM HANDLER ---
  const handleLocationConfirm = (location: ConfirmLocationPayload) => {
    setAddressLine1(location.addressLine1);
    setCity(location.city);
    setState(location.state);
    setPinCode(location.pinCode);
    setLatitude(String(location.latitude));
    setLongitude(String(location.longitude));
    setLocationPickerOpen(false);
    showToast('Store location selected successfully.', 'success');
  };

  // --- SAVE ACTIONS BY SECTION ---

  const saveStoreInfo = async () => {
    if (!vendorId) return;
    if (!storeName.trim()) {
      showToast('Store Name tracking constraint requires valid strings.', 'error');
      return;
    }
    if (!primaryCategoryId) {
      showToast('One primary category selection is mandatory.', 'error');
      return;
    }

    setSavingSection('info');
    try {
      // Core validation check to ensure primary is auto-populated inside profiles listing array safely
      const primaryObj = availableCategories.find(c => c.id === primaryCategoryId);
      if (!primaryObj) {
        throw new Error('Selected primary category configuration parameters are out of sync.');
      }

      const primaryName = primaryObj.name.trim();
      let updatedList = [...additionalCategoryNames.map(n => n.trim())];
      if (!updatedList.includes(primaryName)) {
        updatedList.push(primaryName);
      }
      
      // Filter out duplicate or whitespace elements and sort alphabetically
      updatedList = Array.from(new Set(updatedList))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

      // 1. Update Core vendors table category_id field mapping
      const { error: vendorError } = await supabase
        .from('vendors')
        .update({ category_id: primaryCategoryId })
        .eq('id', vendorId);

      if (vendorError) throw vendorError;

      // 2. Update profiles table list mapping containing strings only
      const res = await updateVendorProfile(vendorId, {
        store_name: storeName.trim(),
        tagline: tagline.trim(),
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
        categories: updatedList
      });

      if (!res.success) throw new Error(res.error || 'Extended vendor profiles updating routine failure.');
      
      // Update local state cleanly with sorted strings
      setAdditionalCategoryNames(updatedList.filter(n => n !== primaryName));
      showToast('Store Information saved successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Save execution fault.', 'error');
    } finally {
      setSavingSection(null);
    }
  };

  const saveLocation = async () => {
    if (!vendorId) return;
    if (pinCode && !/^\d{6}$/.test(pinCode.trim())) {
      showToast('PIN format sequence must follow standard 6-digit constraints.', 'error');
      return;
    }
    if ((latitude && isNaN(Number(latitude))) || (longitude && isNaN(Number(longitude)))) {
      showToast('Coordinates require accurate integer patterns.', 'error');
      return;
    }
    setSavingSection('location');
    const res = await updateVendorProfile(vendorId, {
      address_line1: addressLine1,
      address_line2: addressLine2,
      city: city,
      state: state,
      pin_code: pinCode,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null
    });
    setSavingSection(null);
    if (res.success) showToast('Location routing parameters saved.', 'success');
    else showToast(res.error || 'Save failed.', 'error');
  };

  const saveOperations = async () => {
    if (!vendorId) return;
    setSavingSection('operations');
    const res = await updateStoreOperations(vendorId, {
      store_status: storeStatus,
      business_hours: businessHours,
      delivery_radius_km: null,
      minimum_order: null,
      preparation_time_minutes: null
    });
    setSavingSection(null);
    if (res.success) showToast('Operational parameters updated.', 'success');
    else showToast(res.error || 'Save failed.', 'error');
  };

  const saveDocuments = async () => {
    if (!vendorId) return;
    setSavingSection('documents');
    const res = await updateBusinessDocuments(vendorId, {
      pan_number: panNumber,
      gst_number: gstNumber,
      fssai_license: fssaiLicense,
      drug_license: displaysDrugLicense ? drugLicense : null,
      drug_license_expiry: displaysDrugLicense ? drugLicenseExpiry : null
    });
    setSavingSection(null);
    if (res.success) showToast('Verification vectors saved.', 'success');
    else showToast(res.error || 'Save failed.', 'error');
  };

  const saveBankDetails = async () => {
    if (!vendorId) return;
    setSavingSection('bank');
    const res = await updateBankDetails(vendorId, {
      account_holder_name: accountHolderName,
      bank_name: bankName,
      account_number: accountNumber,
      ifsc_code: ifscCode,
      upi_id: upiId
    });
    setSavingSection(null);
    if (res.success) showToast('Bank details saved.', 'success');
    else showToast(res.error || 'Save failed.', 'error');
  };

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 max-w-(--size-breakpoint-md) mx-auto min-h-screen transition-colors duration-200">
      
      {/* TOAST PANEL */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white font-medium transition-all duration-300 ${
          toast.type === 'success' ? 'bg-slate-900 border border-emerald-500/30' : 'bg-rose-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={16} className="text-emerald-500" /> : <AlertCircle size={16} />}
          <span className="text-sm">{toast.message}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Store Management</h1>
        <p className="text-slate-500 text-sm mt-1">Configure business operating metadata controls and verification references</p>
      </div>

      {/* SINGLE CENTERED COLUMN LAYOUT */}
      <div className="space-y-8">
        
        {/* SECTION 1: STORE INFORMATION */}
        <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-900 pb-3">
            <Store className="text-emerald-500" size={18} />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Store Information</h2>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Store Name *</label>
                <input 
                  type="text" 
                  value={storeName} 
                  onChange={e => setStoreName(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Tagline</label>
                <input 
                  type="text" 
                  value={tagline} 
                  onChange={e => setTagline(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* DYNAMIC RE-ENGINEERED PREMIUM CATEGORIES SECTOR */}
            <div className="border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl p-5 space-y-5">
              
              {/* PRIMARY SELECTION SECTION */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Primary Category</label>
                {categoriesLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 py-1.5">
                    <Loader2 size={12} className="animate-spin text-emerald-500" /> Syncing tracking array...
                  </div>
                ) : (
                  <select
                    value={primaryCategoryId}
                    onChange={handlePrimaryCategoryChange}
                    className="w-full h-10 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  >
                    <option value="" disabled>Select Category ▼</option>
                    {availableCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* ADDITIONAL MULTI-CHIP SELECT ROUTINE PANEL */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Additional Categories</label>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={categorySearch}
                    onChange={e => setCategorySearch(e.target.value)}
                    placeholder="Search Categories"
                    className="w-full h-10 pl-9 pr-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto border border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950 rounded-xl p-3 grid grid-cols-2 gap-2 scrollbar-thin">
                  {filteredAvailableCategories.length > 0 ? (
                    filteredAvailableCategories.map(cat => {
                      const isChecked = additionalCategoryNames.includes(cat.name.trim());
                      return (
                        <label key={cat.id} className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg cursor-pointer transition text-sm select-none text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleAdditionalCategory(cat.name)}
                            className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500/20 w-4 h-4 transition-colors"
                          />
                          <span>{cat.name}</span>
                        </label>
                      );
                    })
                  ) : (
                    <span className="text-xs text-slate-400 italic p-1">No matching categories found</span>
                  )}
                </div>
              </div>

              {/* VISUAL pill PIECES MATRIX PRESENTATION */}
              <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Selected Categories</label>
                {allSelectedCategoryNames.length > 0 ? (
                  <div className="flex flex-wrap gap-2 animate-in fade-in duration-200">
                    {allSelectedCategoryNames.map((name, i) => {
                      const primaryObj = availableCategories.find(c => c.id === primaryCategoryId);
                      const isPrimary = primaryObj && primaryObj.name.trim() === name;
                      return (
                        <span 
                          key={i} 
                          className={`text-xs font-medium px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all select-none ${
                            isPrimary 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold'
                              : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <Tag size={12} className={isPrimary ? 'text-emerald-500' : 'text-slate-400'} />
                          <span>{name} {isPrimary && <span className="text-[10px] opacity-70 uppercase tracking-wide ml-0.5">(Primary)</span>}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCategoryPill(name)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-0.5 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">No categories selected. Required baseline mapping missing.</span>
                )}
              </div>

            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button 
              type="button" 
              onClick={saveStoreInfo}
              disabled={savingSection !== null}
              className="h-10 px-5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-xs shadow-emerald-500/10 flex items-center gap-1.5"
            >
              {savingSection === 'info' && <Loader2 size={12} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </section>

        {/* SECTION 2: STORE LOCATION */}
        <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-900 pb-3">
            <MapPin className="text-emerald-500" size={18} />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Store Location</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Current Address
              </label>
              <p className="text-sm text-slate-900 dark:text-white font-medium bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                {addressLine1 ? (
                  [addressLine1, addressLine2, city, state, pinCode].filter(Boolean).join(', ')
                ) : (
                  <span className="text-slate-400 italic">No location selected</span>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setLocationPickerOpen(true)}
              className="h-10 px-4 bg-emerald-500 hover:bg-emerald-600 text-white transition rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs shadow-emerald-500/10"
            >
              <MapPin size={16} /> Pick Store Location
            </button>

            {latitude && longitude && (
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-emerald-500/20 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <CheckCircle size={14} /> Location Selected
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 font-mono pt-1">
                  <div><span className="text-slate-400 font-sans">Latitude:</span> {latitude}</div>
                  <div><span className="text-slate-400 font-sans">Longitude:</span> {longitude}</div>
                </div>
                {addressLine1 && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Address:</span> {[addressLine1, addressLine2, city, state, pinCode].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button 
              type="button" 
              onClick={saveLocation}
              disabled={savingSection !== null}
              className="h-10 px-5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              {savingSection === 'location' && <Loader2 size={12} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </section>

        {/* SECTION 3: BUSINESS OPERATIONS */}
        <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-900 pb-3">
            <Clock className="text-emerald-500" size={18} />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Business Operations</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Store Status</label>
                <select 
                  value={storeStatus}
                  onChange={e => setStoreStatus(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                >
                  <option value="open">Open</option>
                  <option value="busy">Busy</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Opening Time</label>
                  <input 
                    type="time" 
                    value={businessHours.open || '09:00'}
                    onChange={e => setBusinessHours({ ...businessHours, open: e.target.value })}
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Closing Time</label>
                  <input 
                    type="time" 
                    value={businessHours.close || '22:00'}
                    onChange={e => setBusinessHours({ ...businessHours, close: e.target.value })}
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              type="button" 
              onClick={saveOperations}
              disabled={savingSection !== null}
              className="h-10 px-5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              {savingSection === 'operations' && <Loader2 size={12} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </section>

        {/* SECTION 4: BUSINESS DOCUMENTS */}
        <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-900 pb-3">
            <FileText className="text-emerald-500" size={18} />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Business Documents</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">PAN Number</label>
                <input 
                  type="text" 
                  value={panNumber} 
                  onChange={e => setPanNumber(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-mono uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">GST Number</label>
                <input 
                  type="text" 
                  value={gstNumber} 
                  onChange={e => setGstNumber(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-mono uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">FSSAI License</label>
                <input 
                  type="text" 
                  value={fssaiLicense} 
                  onChange={e => setFssaiLicense(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            {displaysDrugLicense && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-dashed border-slate-100 dark:border-slate-900">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Drug Licence Number</label>
                  <input 
                    type="text" 
                    value={drugLicense} 
                    onChange={e => setDrugLicense(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Drug Licence Expiry</label>
                  <input 
                    type="date" 
                    value={drugLicenseExpiry} 
                    onChange={e => setDrugLicenseExpiry(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button 
              type="button" 
              onClick={saveDocuments}
              disabled={savingSection !== null}
              className="h-10 px-5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              {savingSection === 'documents' && <Loader2 size={12} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </section>

        {/* SECTION 5: BANK DETAILS */}
        <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-900 pb-3">
            <Building2 className="text-emerald-500" size={18} />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Bank Details</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Account Holder Name</label>
                <input 
                  type="text" 
                  value={accountHolderName} 
                  onChange={e => setAccountHolderName(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Bank Name</label>
                <input 
                  type="text" 
                  value={bankName} 
                  onChange={e => setBankName(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Account Number</label>
                <input 
                  type="text" 
                  value={accountNumber} 
                  onChange={e => setAccountNumber(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">IFSC Code</label>
                <input 
                  type="text" 
                  value={ifscCode} 
                  onChange={e => setIfscCode(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-mono uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">UPI ID</label>
                <input 
                  type="text" 
                  value={upiId} 
                  onChange={e => setUpiId(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              type="button" 
              onClick={saveBankDetails}
              disabled={savingSection !== null}
              className="h-10 px-5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              {savingSection === 'bank' && <Loader2 size={12} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </section>

      </div>

      {/* STORE LOCATION PICKER MODAL */}
      <StoreLocationPicker
        open={locationPickerOpen}
        initialLatitude={latitude ? Number(latitude) : null}
        initialLongitude={longitude ? Number(longitude) : null}
        onClose={() => setLocationPickerOpen(false)}
        onConfirm={handleLocationConfirm}
      />
    </div>
  );
}