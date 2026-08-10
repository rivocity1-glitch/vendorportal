import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
  Tag,
  Check,
  AlertTriangle,
  Calendar,
  Power,
  XCircle,
  CheckCircle2
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

import { searchLocation } from '../../../services/geocodingService';
import { supabase } from '../../../lib/supabase';
import {
  StoreLocationPicker,
  ConfirmLocationPayload
} from '../maps/StoreLocationPicker';

interface ProductCategory {
  id: string;
  name: string;
  status: string;
}

export interface DaySchedule {
  open: string;
  close: string;
  closed: boolean;
}

export type BusinessHoursJSON = Record<string, DaySchedule>;

const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

type DayName = (typeof DAYS_OF_WEEK)[number];

const DEFAULT_SCHEDULE: BusinessHoursJSON = {
  monday: { open: '09:00', close: '22:00', closed: false },
  tuesday: { open: '09:00', close: '22:00', closed: false },
  wednesday: { open: '09:00', close: '22:00', closed: false },
  thursday: { open: '09:00', close: '22:00', closed: false },
  friday: { open: '09:00', close: '22:00', closed: false },
  saturday: { open: '09:00', close: '22:00', closed: false },
  sunday: { open: '10:00', close: '20:00', closed: true },
};

const parseTimeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;

  const [hours, minutes] = timeStr.split(':').map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return 0;
  }

  return hours * 60 + minutes;
};

const formatMinutes = (minutes: number): string => {
  const safeMinutes = Math.max(0, Math.ceil(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }

  return `${mins}m`;
};

export default function StoreManagement() {
  // ---------------------------------------------------------------------------
  // CORE VENDOR
  // ---------------------------------------------------------------------------

  const [vendorId, setVendorId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // ---------------------------------------------------------------------------
  // LIVE CLOCK
  // ---------------------------------------------------------------------------

  /*
   * This state intentionally updates every minute.
   *
   * The business-hours evaluator depends on the current time. Without this
   * timer, the page would only recalculate when another piece of React state
   * changed.
   */
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(new Date());
    };

    updateClock();

    const interval = window.setInterval(updateClock, 60 * 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // TOAST
  // ---------------------------------------------------------------------------

  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // ---------------------------------------------------------------------------
  // SAVE STATE
  // ---------------------------------------------------------------------------

  const [isSavingAll, setIsSavingAll] = useState<boolean>(false);
  const [verifyingAddress, setVerifyingAddress] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // MAP PICKER
  // ---------------------------------------------------------------------------

  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // SECTION 1: STORE INFO
  // ---------------------------------------------------------------------------

  const [storeName, setStoreName] = useState('');
  const [tagline, setTagline] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  // ---------------------------------------------------------------------------
  // CATEGORIES
  // ---------------------------------------------------------------------------

  const [availableCategories, setAvailableCategories] = useState<ProductCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState<boolean>(false);
  const [primaryCategoryId, setPrimaryCategoryId] = useState<string>('');
  const [additionalCategoryNames, setAdditionalCategoryNames] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState<string>('');

  // ---------------------------------------------------------------------------
  // SECTION 2: LOCATION
  // ---------------------------------------------------------------------------

  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // ---------------------------------------------------------------------------
  // SECTION 3: BUSINESS OPERATIONS
  // ---------------------------------------------------------------------------

  const [storeStatus, setStoreStatus] = useState<'open' | 'busy' | 'closed'>('closed');
  const [manualOverride, setManualOverride] = useState<boolean>(false);
  const [schedule, setSchedule] = useState<BusinessHoursJSON>(DEFAULT_SCHEDULE);

  // ---------------------------------------------------------------------------
  // SECTION 4: DOCUMENTS
  // ---------------------------------------------------------------------------

  const [panNumber, setPanNumber] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [fssaiLicense, setFssaiLicense] = useState('');
  const [drugLicense, setDrugLicense] = useState('');
  const [drugLicenseExpiry, setDrugLicenseExpiry] = useState('');

  // ---------------------------------------------------------------------------
  // SECTION 5: BANK DETAILS
  // ---------------------------------------------------------------------------

  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');

  // ---------------------------------------------------------------------------
  // TOAST HELPER
  // ---------------------------------------------------------------------------

  const showToast = useCallback(
    (message: string, type: 'success' | 'error') => {
      setToast({ message, type });

      window.setTimeout(() => {
        setToast(null);
      }, 4000);
    },
    []
  );

  // ---------------------------------------------------------------------------
  // LOCATION VALIDATION
  // ---------------------------------------------------------------------------

  const isLocationVerified = useMemo(() => {
    if (!latitude || !longitude) return false;

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    return (
      !Number.isNaN(lat) &&
      !Number.isNaN(lng) &&
      (lat !== 0 || lng !== 0)
    );
  }, [latitude, longitude]);

  // ---------------------------------------------------------------------------
  // CATEGORY HELPERS
  // ---------------------------------------------------------------------------

  const allSelectedCategoryNames = useMemo(() => {
    const list: string[] = [];

    const primaryObj = availableCategories.find(
      c => c.id === primaryCategoryId
    );

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
  }, [
    primaryCategoryId,
    additionalCategoryNames,
    availableCategories
  ]);

  const displaysDrugLicense = useMemo(() => {
    return allSelectedCategoryNames.some(name => {
      const lower = name.toLowerCase();

      return (
        lower.includes('medical') ||
        lower.includes('pharmacy')
      );
    });
  }, [allSelectedCategoryNames]);

  const filteredAvailableCategories = useMemo(() => {
    return availableCategories.filter(cat => {
      const matchesSearch = cat.name
        .toLowerCase()
        .includes(categorySearch.toLowerCase());

      const isPrimary = cat.id === primaryCategoryId;

      return matchesSearch && !isPrimary;
    });
  }, [
    availableCategories,
    categorySearch,
    primaryCategoryId
  ]);

  // ---------------------------------------------------------------------------
  // LOAD CATEGORIES
  // ---------------------------------------------------------------------------

  const loadProductCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);

      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name, status')
        .eq('status', 'active');

      if (error) throw error;

      if (data) {
        const sorted = (data as ProductCategory[]).sort(
          (a, b) => a.name.localeCompare(b.name)
        );

        setAvailableCategories(sorted);
      }
    } catch (err) {
      console.error('Error loading product categories:', err);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // POPULATE PROFILE
  // ---------------------------------------------------------------------------

  const populateProfileData = useCallback(
    (profile: VendorProfile, shopName?: string) => {
      setStoreName(profile.store_name || shopName || '');
      setTagline(profile.tagline || '');
      setAvatarUrl(profile.avatar_url || '');
      setBannerUrl(profile.banner_url || '');

      if (profile.categories && Array.isArray(profile.categories)) {
        setAdditionalCategoryNames(profile.categories);
      } else {
        setAdditionalCategoryNames([]);
      }

      setAddressLine1(profile.address_line1 || '');
      setAddressLine2(profile.address_line2 || '');
      setCity(profile.city || '');
      setState(profile.state || '');
      setPinCode(profile.pin_code || '');

      setLatitude(
        profile.latitude !== null &&
        profile.latitude !== undefined
          ? String(profile.latitude)
          : ''
      );

      setLongitude(
        profile.longitude !== null &&
        profile.longitude !== undefined
          ? String(profile.longitude)
          : ''
      );

      if (profile.store_status) {
        const normalizedStatus =
          profile.store_status.toLowerCase();

        if (
          normalizedStatus === 'open' ||
          normalizedStatus === 'busy' ||
          normalizedStatus === 'closed'
        ) {
          setStoreStatus(normalizedStatus);
        }
      }

      setManualOverride(!!profile.manual_override);

      if (profile.business_hours) {
        try {
          const parsed =
            typeof profile.business_hours === 'string'
              ? JSON.parse(profile.business_hours)
              : profile.business_hours;

          if (parsed?.monday || parsed?.tuesday) {
            setSchedule({
              ...DEFAULT_SCHEDULE,
              ...parsed
            });
          } else if (parsed?.open && parsed?.close) {
            const migrated = {
              ...DEFAULT_SCHEDULE
            };

            DAYS_OF_WEEK.forEach(day => {
              if (!migrated[day].closed) {
                migrated[day] = {
                  open: parsed.open,
                  close: parsed.close,
                  closed: false
                };
              }
            });

            setSchedule(migrated);
          }
        } catch (e) {
          console.error(
            'Failed to parse business_hours JSON:',
            e
          );
        }
      }

      setPanNumber(profile.pan_number || '');
      setGstNumber(profile.gst_number || '');
      setFssaiLicense(profile.fssai_license || '');
      setDrugLicense(profile.drug_license || '');
      setDrugLicenseExpiry(profile.drug_license_expiry || '');

      setAccountHolderName(
        profile.account_holder_name || ''
      );
      setBankName(profile.bank_name || '');
      setAccountNumber(profile.account_number || '');
      setIfscCode(profile.ifsc_code || '');
      setUpiId(profile.upi_id || '');
    },
    []
  );

  // ---------------------------------------------------------------------------
  // INITIAL LOAD + REALTIME
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let profileChannel: any;

    async function loadData() {
      try {
        setLoading(true);

        await loadProductCategories();

        const vendorRes = await getCurrentVendor();

        if (!vendorRes.success || !vendorRes.data) {
          throw new Error(
            vendorRes.error || 'Failed to locate vendor.'
          );
        }

        const currentId = vendorRes.data.id;

        setVendorId(currentId);

        if (vendorRes.data.category_id) {
          setPrimaryCategoryId(
            vendorRes.data.category_id
          );
        }

        const profileRes = await getVendorProfile(currentId);

        if (!profileRes.success || !profileRes.data) {
          throw new Error(
            profileRes.error || 'Failed to sync profile.'
          );
        }

        const shopName = vendorRes.data.shop_name;

        populateProfileData(
          profileRes.data,
          shopName
        );

        profileChannel = supabase
          .channel(`store-mgmt-${currentId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'vendor_profiles',
              filter: `vendor_id=eq.${currentId}`
            },
            (payload: any) => {
              if (payload.new) {
                populateProfileData(
                  payload.new as VendorProfile,
                  shopName
                );
              }
            }
          )
          .subscribe();
      } catch (err: any) {
        showToast(
          err.message || 'Error loading profile data.',
          'error'
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();

    return () => {
      if (profileChannel) {
        supabase.removeChannel(profileChannel);
      }
    };
  }, [
    loadProductCategories,
    populateProfileData,
    showToast
  ]);

  // ---------------------------------------------------------------------------
  // WEEKLY SCHEDULE EVALUATION
  // ---------------------------------------------------------------------------

  const evaluateSchedule = useCallback(
    (date: Date, currentSchedule: BusinessHoursJSON) => {
      const dayNames = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday'
      ];

      const todayName = dayNames[
        date.getDay()
      ] as DayName;

      const todaySchedule =
        currentSchedule[todayName] || {
          open: '09:00',
          close: '22:00',
          closed: false
        };

      if (todaySchedule.closed) {
        return {
          status: 'CLOSED' as const,
          badgeText: '🔴 Closed Today',
          badgeColor:
            'bg-red-500/10 text-red-600 border-red-200 dark:border-red-900/50',
          minsUntilClose: 0,
          countdownText: 'Closed All Day',
          isOperational: false
        };
      }

      const currentMins =
        date.getHours() * 60 +
        date.getMinutes();

      const openMins = parseTimeToMinutes(
        todaySchedule.open
      );

      const closeMins = parseTimeToMinutes(
        todaySchedule.close
      );

      const isOvernight =
        closeMins <= openMins;

      let isOpenNow = false;
      let minsLeft = 0;

      if (isOvernight) {
        if (currentMins >= openMins) {
          isOpenNow = true;
          minsLeft =
            closeMins +
            1440 -
            currentMins;
        } else if (currentMins < closeMins) {
          isOpenNow = true;
          minsLeft =
            closeMins -
            currentMins;
        }
      } else {
        if (
          currentMins >= openMins &&
          currentMins < closeMins
        ) {
          isOpenNow = true;
          minsLeft =
            closeMins -
            currentMins;
        }
      }

      if (isOpenNow) {
        const countdown =
          formatMinutes(minsLeft);

        /*
         * Closing Soon begins 90 minutes before closing.
         */
        if (minsLeft <= 90) {
          return {
            status: 'CLOSING_SOON' as const,
            badgeText: '🟠 Closing Soon',
            badgeColor:
              'bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-900/50',
            minsUntilClose: minsLeft,
            countdownText: countdown,
            isOperational: true
          };
        }

        return {
          status: 'OPEN' as const,
          badgeText: '🟢 Open',
          badgeColor:
            'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900/50',
          minsUntilClose: minsLeft,
          countdownText: countdown,
          isOperational: true
        };
      }

      /*
       * Before today's opening time.
       */
      if (!isOvernight && currentMins < openMins) {
        const minsToOpen =
          openMins - currentMins;

        const openingSoon =
          minsToOpen <= 60;

        return {
          status: openingSoon
            ? ('OPENING_SOON' as const)
            : ('CLOSED' as const),
          badgeText: openingSoon
            ? '🟠 Opening Soon'
            : '🔴 Closed',
          badgeColor: openingSoon
            ? 'bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-900/50'
            : 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-900/50',
          minsUntilClose: 0,
          countdownText: `Opens in ${formatMinutes(
            minsToOpen
          )}`,
          isOperational: false
        };
      }

      /*
       * Today's scheduled closing time has passed.
       */
      return {
        status: 'AUTO_CLOSED' as const,
        badgeText: '🔴 Closed (Time Expired)',
        badgeColor:
          'bg-red-500/10 text-red-600 border-red-200 dark:border-red-900/50',
        minsUntilClose: 0,
        countdownText: 'Closed for the day',
        isOperational: false
      };
    },
    []
  );

  // ---------------------------------------------------------------------------
  // LIVE BUSINESS HOURS EVALUATION
  // ---------------------------------------------------------------------------

  const currentEvaluation = useMemo(() => {
    /*
     * currentTime is intentionally referenced here so this memo recalculates
     * every minute.
     */
    const scheduledEvaluation = evaluateSchedule(
      currentTime,
      schedule
    );

    // Manual mode takes priority over the schedule.
    if (manualOverride) {
      if (storeStatus === 'closed') {
        return {
          status: 'MANUALLY_CLOSED' as const,
          badgeText:
            '🔴 Temporarily Closed (Manual)',
          badgeColor:
            'bg-red-500/10 text-red-600 border-red-200 dark:border-red-900/50',
          minsUntilClose: 0,
          countdownText:
            'Manually Turned Off',
          isOperational: false
        };
      }

      if (storeStatus === 'busy') {
        return {
          status: 'BUSY' as const,
          badgeText:
            '🟠 High Order Volume (Busy)',
          badgeColor:
            'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900/50',
          minsUntilClose:
            scheduledEvaluation.isOperational
              ? scheduledEvaluation.minsUntilClose
              : 0,
          countdownText:
            scheduledEvaluation.isOperational
              ? `Manually Busy • ${scheduledEvaluation.countdownText}`
              : 'Manually Overridden (Busy)',
          isOperational: true
        };
      }

      return {
        status: 'OPEN' as const,
        badgeText: '🟢 Open',
        badgeColor:
          'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-900/50',
        minsUntilClose:
          scheduledEvaluation.isOperational
            ? scheduledEvaluation.minsUntilClose
            : 0,
        countdownText:
          scheduledEvaluation.isOperational
            ? `Manually Overridden • ${scheduledEvaluation.countdownText}`
            : 'Manually Overridden (Open)',
        isOperational: true
      };
    }

    /*
     * Automatic schedule mode.
     */
    if (
      scheduledEvaluation.status ===
      'CLOSING_SOON'
    ) {
      return scheduledEvaluation;
    }

    if (
      scheduledEvaluation.status === 'OPEN'
    ) {
      if (storeStatus === 'busy') {
        return {
          status: 'BUSY' as const,
          badgeText:
            '🟠 High Order Volume (Busy)',
          badgeColor:
            'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900/50',
          minsUntilClose:
            scheduledEvaluation.minsUntilClose,
          countdownText:
            scheduledEvaluation.countdownText,
          isOperational: true
        };
      }

      return scheduledEvaluation;
    }

    return scheduledEvaluation;
  }, [
    currentTime,
    schedule,
    storeStatus,
    manualOverride,
    evaluateSchedule
  ]);

  // ---------------------------------------------------------------------------
  // AUTOMATIC CLOSE
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (
      currentEvaluation.status !==
      'AUTO_CLOSED'
    ) {
      return;
    }

    if (
      storeStatus === 'closed' ||
      manualOverride ||
      !vendorId
    ) {
      return;
    }

    const nowIso = new Date().toISOString();

    /*
     * Update local state immediately so the UI changes without waiting
     * for Supabase.
     */
    setStoreStatus('closed');

    updateStoreOperations(vendorId, {
      store_status: 'closed',
      auto_closed_at: nowIso,
      manual_override: false
    }).then(res => {
      if (!res.success) {
        console.error(
          'Failed to trigger auto-close:',
          res.error
        );

        showToast(
          res.error ||
            'Failed to automatically close store.',
          'error'
        );
      }
    });
  }, [
    currentEvaluation.status,
    storeStatus,
    manualOverride,
    vendorId,
    showToast
  ]);

  // ---------------------------------------------------------------------------
  // MANUAL STORE STATUS
  // ---------------------------------------------------------------------------

  const handleManualStatusChange = async (
    newStatus: 'open' | 'busy' | 'closed'
  ) => {
    if (!vendorId) return;

    setStoreStatus(newStatus);
    setManualOverride(true);

    const nowIso = new Date().toISOString();

    const res = await updateStoreOperations(
      vendorId,
      {
        store_status: newStatus,
        business_hours: schedule,
        manual_override: true,
        manual_override_at: nowIso
      }
    );

    if (!res.success) {
      showToast(
        res.error ||
          'Error updating store status.',
        'error'
      );

      return;
    }

    showToast(
      `Store status manually updated to ${newStatus}.`,
      'success'
    );

    if (res.data) {
      populateProfileData(res.data);
    }
  };

  // ---------------------------------------------------------------------------
  // RESUME AUTO SCHEDULE
  // ---------------------------------------------------------------------------

  const handleResetToAuto = async () => {
    if (!vendorId) return;

    /*
     * Evaluate the schedule independently from manualOverride.
     * This prevents a manually opened/closed store from incorrectly becoming
     * the new automatic state.
     */
    const scheduledEvaluation =
      evaluateSchedule(
        new Date(),
        schedule
      );

    const resolvedStatus =
      scheduledEvaluation.isOperational
        ? 'open'
        : 'closed';

    setManualOverride(false);
    setStoreStatus(resolvedStatus);

    const res =
      await updateStoreOperations(
        vendorId,
        {
          store_status: resolvedStatus,
          business_hours: schedule,
          manual_override: false,
          manual_override_at: null
        }
      );

    if (!res.success) {
      showToast(
        res.error ||
          'Error resetting to schedule.',
        'error'
      );

      return;
    }

    showToast(
      'Restored automatic business hours schedule.',
      'success'
    );

    if (res.data) {
      populateProfileData(res.data);
    }
  };

  // ---------------------------------------------------------------------------
  // SCHEDULE CONTROLS
  // ---------------------------------------------------------------------------

  const handleDayToggle = (
    day: DayName
  ) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        closed: !prev[day].closed
      }
    }));
  };

  const handleTimeChange = (
    day: DayName,
    field: 'open' | 'close',
    value: string
  ) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  // ---------------------------------------------------------------------------
  // CATEGORY CONTROLS
  // ---------------------------------------------------------------------------

  const handlePrimaryCategoryChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setPrimaryCategoryId(e.target.value);
  };

  const handleToggleAdditionalCategory = (
    name: string
  ) => {
    const trimmed = name.trim();

    if (
      additionalCategoryNames.includes(
        trimmed
      )
    ) {
      setAdditionalCategoryNames(
        additionalCategoryNames.filter(
          n => n !== trimmed
        )
      );
    } else {
      setAdditionalCategoryNames([
        ...additionalCategoryNames,
        trimmed
      ]);
    }
  };

  const handleRemoveCategoryPill = (
    name: string
  ) => {
    const trimmed = name.trim();

    const primaryObj =
      availableCategories.find(
        c => c.id === primaryCategoryId
      );

    if (
      primaryObj &&
      primaryObj.name.trim() === trimmed
    ) {
      showToast(
        'Please choose another Primary Category.',
        'error'
      );

      return;
    }

    setAdditionalCategoryNames(
      additionalCategoryNames.filter(
        n => n.trim() !== trimmed
      )
    );
  };

  // ---------------------------------------------------------------------------
  // MAP LOCATION
  // ---------------------------------------------------------------------------

  const handleLocationConfirm = (
    location: ConfirmLocationPayload
  ) => {
    setAddressLine1(
      location.addressLine1 ||
        location.formattedAddress
    );

    if (location.city) {
      setCity(location.city);
    }

    if (location.state) {
      setState(location.state);
    }

    if (location.pinCode) {
      setPinCode(location.pinCode);
    }

    setLatitude(
      String(location.latitude)
    );

    setLongitude(
      String(location.longitude)
    );

    setLocationPickerOpen(false);

    showToast(
      'Store location selected from map.',
      'success'
    );
  };

  // ---------------------------------------------------------------------------
  // MANUAL ADDRESS VERIFICATION
  // ---------------------------------------------------------------------------

  const handleVerifyManualAddress = async () => {
    const fullQuery = [
      addressLine1,
      addressLine2,
      city,
      state,
      pinCode
    ]
      .filter(Boolean)
      .join(', ');

    if (!fullQuery.trim()) {
      showToast(
        'Please enter an address before verifying.',
        'error'
      );

      return;
    }

    setVerifyingAddress(true);

    try {
      const results =
        await searchLocation(fullQuery);

      if (
        results &&
        results.length > 0
      ) {
        const topResult = results[0];

        setLatitude(
          String(topResult.latitude)
        );

        setLongitude(
          String(topResult.longitude)
        );

        if (topResult.address) {
          if (
            topResult.address.city ||
            topResult.address.town ||
            topResult.address.village
          ) {
            setCity(
              topResult.address.city ||
                topResult.address.town ||
                topResult.address.village ||
                city
            );
          }

          if (topResult.address.state) {
            setState(
              topResult.address.state
            );
          }

          if (
            topResult.address.postcode
          ) {
            setPinCode(
              topResult.address.postcode
            );
          }
        }

        showToast(
          'Store location verified successfully.',
          'success'
        );
      } else {
        showToast(
          'Could not verify location coordinates for this address. Try selecting on map.',
          'error'
        );
      }
    } catch (err) {
      console.error(
        'Address verification error:',
        err
      );

      showToast(
        'Address verification error. Please try again or use the map.',
        'error'
      );
    } finally {
      setVerifyingAddress(false);
    }
  };

  // ---------------------------------------------------------------------------
  // SAVE STORE INFO
  // ---------------------------------------------------------------------------

  const saveStoreInfo = async () => {
    if (!vendorId) return;

    if (!storeName.trim()) {
      throw new Error(
        'Store Name field is required.'
      );
    }

    if (!primaryCategoryId) {
      throw new Error(
        'One primary category selection is required.'
      );
    }

    const primaryObj =
      availableCategories.find(
        c => c.id === primaryCategoryId
      );

    if (!primaryObj) {
      throw new Error(
        'Selected primary category configuration parameters are out of sync.'
      );
    }

    const primaryName =
      primaryObj.name.trim();

    let updatedList = [
      ...additionalCategoryNames.map(
        n => n.trim()
      )
    ];

    if (
      !updatedList.includes(primaryName)
    ) {
      updatedList.push(primaryName);
    }

    updatedList = Array.from(
      new Set(updatedList)
    )
      .filter(Boolean)
      .sort((a, b) =>
        a.localeCompare(b)
      );

    const { error: vendorError } =
      await supabase
        .from('vendors')
        .update({
          category_id:
            primaryCategoryId
        })
        .eq('id', vendorId);

    if (vendorError) {
      throw vendorError;
    }

    const res =
      await updateVendorProfile(
        vendorId,
        {
          store_name:
            storeName.trim(),
          tagline:
            tagline.trim(),
          avatar_url:
            avatarUrl,
          banner_url:
            bannerUrl,
          categories:
            updatedList
        }
      );

    if (!res.success) {
      throw new Error(
        res.error ||
          'Failed to update store info.'
      );
    }

    setAdditionalCategoryNames(
      updatedList.filter(
        n => n !== primaryName
      )
    );
  };

  // ---------------------------------------------------------------------------
  // SAVE LOCATION
  // ---------------------------------------------------------------------------

  const saveLocation = async () => {
    if (!vendorId) return;

    if (
      pinCode &&
      !/^\d{6}$/.test(
        pinCode.trim()
      )
    ) {
      throw new Error(
        'PIN Code must be a 6-digit number.'
      );
    }

    const parsedLat =
      parseFloat(latitude);

    const parsedLng =
      parseFloat(longitude);

    if (
      Number.isNaN(parsedLat) ||
      Number.isNaN(parsedLng)
    ) {
      throw new Error(
        'Store location coordinates are incomplete. Please verify location or pick on map.'
      );
    }

    const res =
      await updateVendorProfile(
        vendorId,
        {
          address_line1:
            addressLine1,
          address_line2:
            addressLine2,
          city,
          state,
          pin_code:
            pinCode,
          latitude:
            parsedLat,
          longitude:
            parsedLng
        }
      );

    if (!res.success) {
      throw new Error(
        res.error ||
          'Failed to save location.'
      );
    }
  };

  // ---------------------------------------------------------------------------
  // SAVE OPERATIONS
  // ---------------------------------------------------------------------------

  const saveOperations = async () => {
    if (!vendorId) return;

    const scheduledEvaluation =
      evaluateSchedule(
        new Date(),
        schedule
      );

    const resolvedStatus =
      manualOverride
        ? storeStatus
        : scheduledEvaluation.isOperational
        ? 'open'
        : 'closed';

    const res =
      await updateStoreOperations(
        vendorId,
        {
          store_status:
            resolvedStatus,
          business_hours:
            schedule,
          manual_override:
            manualOverride,
          manual_override_at:
            manualOverride
              ? new Date().toISOString()
              : null,
          delivery_radius_km:
            null,
          minimum_order:
            null,
          preparation_time_minutes:
            null
        }
      );

    if (!res.success) {
      throw new Error(
        res.error ||
          'Failed to save operations.'
      );
    }

    if (res.data) {
      populateProfileData(
        res.data
      );
    }
  };

  // ---------------------------------------------------------------------------
  // SAVE DOCUMENTS
  // ---------------------------------------------------------------------------

  const saveDocuments = async () => {
    if (!vendorId) return;

    const res =
      await updateBusinessDocuments(
        vendorId,
        {
          pan_number:
            panNumber,
          gst_number:
            gstNumber,
          fssai_license:
            fssaiLicense,
          drug_license:
            displaysDrugLicense
              ? drugLicense
              : null,
          drug_license_expiry:
            displaysDrugLicense
              ? drugLicenseExpiry
              : null
        }
      );

    if (!res.success) {
      throw new Error(
        res.error ||
          'Failed to save business documents.'
      );
    }
  };

  // ---------------------------------------------------------------------------
  // SAVE BANK DETAILS
  // ---------------------------------------------------------------------------

  const saveBankDetails = async () => {
    if (!vendorId) return;

    const res =
      await updateBankDetails(
        vendorId,
        {
          account_holder_name:
            accountHolderName,
          bank_name:
            bankName,
          account_number:
            accountNumber,
          ifsc_code:
            ifscCode,
          upi_id:
            upiId
        }
      );

    if (!res.success) {
      throw new Error(
        res.error ||
          'Failed to save bank details.'
      );
    }
  };

  // ---------------------------------------------------------------------------
  // SAVE EVERYTHING
  // ---------------------------------------------------------------------------

  const handleSaveAll = async () => {
    if (!vendorId) return;

    setIsSavingAll(true);

    try {
      await saveStoreInfo();
      await saveLocation();
      await saveOperations();
      await saveDocuments();
      await saveBankDetails();

      showToast(
        'Store settings updated successfully.',
        'success'
      );
    } catch (err: any) {
      showToast(
        err.message ||
          'Error saving changes.',
        'error'
      );
    } finally {
      setIsSavingAll(false);
    }
  };

  // ---------------------------------------------------------------------------
  // LOADING
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-8 p-6 max-w-(--size-breakpoint-md) mx-auto min-h-screen transition-colors duration-200">

      {/* TOAST */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white font-medium transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-slate-900 border border-emerald-500/30'
              : 'bg-rose-600'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle
              size={16}
              className="text-emerald-500"
            />
          ) : (
            <AlertCircle size={16} />
          )}

          <span className="text-sm">
            {toast.message}
          </span>
        </div>
      )}

      {/* HEADER */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Store Management
          </h1>

          <p className="text-slate-500 text-sm mt-1">
            Manage your store details, weekly schedules, and business verification
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          disabled={isSavingAll}
          className="h-10 px-5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-xs shadow-emerald-500/10 flex items-center gap-1.5 cursor-pointer"
        >
          {isSavingAll && (
            <Loader2
              size={14}
              className="animate-spin"
            />
          )}

          Save All Changes
        </button>
      </div>

      <div className="space-y-8">

        {/* ================================================================ */}
        {/* SECTION 1: STORE INFORMATION */}
        {/* ================================================================ */}

        <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl p-6 shadow-xs space-y-6">

          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-900 pb-3">
            <Store
              className="text-emerald-500"
              size={18}
            />

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Store Information
            </h2>
          </div>

          <div className="space-y-5">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Store Name *
                </label>

                <input
                  type="text"
                  value={storeName}
                  onChange={e =>
                    setStoreName(
                      e.target.value
                    )
                  }
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Tagline
                </label>

                <input
                  type="text"
                  value={tagline}
                  onChange={e =>
                    setTagline(
                      e.target.value
                    )
                  }
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                />
              </div>

            </div>

            {/* CATEGORIES */}

            <div className="border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl p-5 space-y-5">

              <div className="space-y-1.5">

                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Primary Category
                </label>

                {categoriesLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 py-1.5">
                    <Loader2
                      size={12}
                      className="animate-spin text-emerald-500"
                    />

                    Loading categories...
                  </div>
                ) : (
                  <select
                    value={
                      primaryCategoryId
                    }
                    onChange={
                      handlePrimaryCategoryChange
                    }
                    className="w-full h-10 px-3 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  >
                    <option
                      value=""
                      disabled
                    >
                      Select Category ▼
                    </option>

                    {availableCategories.map(
                      cat => (
                        <option
                          key={cat.id}
                          value={cat.id}
                        >
                          {cat.name}
                        </option>
                      )
                    )}
                  </select>
                )}

              </div>

              <div className="space-y-2.5">

                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Additional Categories
                </label>

                <div className="relative">

                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                  <input
                    type="text"
                    value={
                      categorySearch
                    }
                    onChange={e =>
                      setCategorySearch(
                        e.target.value
                      )
                    }
                    placeholder="Search Categories"
                    className="w-full h-10 pl-9 pr-3 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  />

                </div>

                <div className="max-h-40 overflow-y-auto border border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-955 rounded-xl p-3 grid grid-cols-2 gap-2 scrollbar-thin">

                  {filteredAvailableCategories.length > 0 ? (
                    filteredAvailableCategories.map(
                      cat => {
                        const isChecked =
                          additionalCategoryNames.includes(
                            cat.name.trim()
                          );

                        return (
                          <label
                            key={cat.id}
                            className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg cursor-pointer transition text-sm select-none text-slate-700 dark:text-slate-300"
                          >
                            <input
                              type="checkbox"
                              checked={
                                isChecked
                              }
                              onChange={() =>
                                handleToggleAdditionalCategory(
                                  cat.name
                                )
                              }
                              className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500/20 w-4 h-4 transition-colors"
                            />

                            <span>
                              {cat.name}
                            </span>
                          </label>
                        );
                      }
                    )
                  ) : (
                    <span className="text-xs text-slate-400 italic p-1">
                      No matching categories found
                    </span>
                  )}

                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">

                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Selected Categories
                </label>

                {allSelectedCategoryNames.length > 0 ? (
                  <div className="flex flex-wrap gap-2 animate-in fade-in duration-200">

                    {allSelectedCategoryNames.map(
                      (name, i) => {
                        const primaryObj =
                          availableCategories.find(
                            c =>
                              c.id ===
                              primaryCategoryId
                          );

                        const isPrimary =
                          primaryObj &&
                          primaryObj.name.trim() ===
                            name;

                        return (
                          <span
                            key={i}
                            className={`text-xs font-medium px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all select-none ${
                              isPrimary
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold'
                                : 'bg-white dark:bg-slate-955 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <Tag
                              size={12}
                              className={
                                isPrimary
                                  ? 'text-emerald-500'
                                  : 'text-slate-400'
                              }
                            />

                            <span>
                              {name}{' '}
                              {isPrimary && (
                                <span className="text-[10px] opacity-70 uppercase tracking-wide ml-0.5">
                                  (Primary)
                                </span>
                              )}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveCategoryPill(
                                  name
                                )
                              }
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-0.5 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        );
                      }
                    )}

                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    No categories selected.
                  </span>
                )}

              </div>

            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* SECTION 2: STORE LOCATION */}
        {/* ================================================================ */}

        <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl p-6 shadow-xs space-y-6">

          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-3">

            <div className="flex items-center gap-2">

              <MapPin
                className="text-emerald-500"
                size={18}
              />

              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Store Location
              </h2>

            </div>

            {isLocationVerified ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-500/20">
                <Check size={14} />
                Store Location Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full border border-amber-500/20">
                <AlertTriangle size={14} />
                Store location not verified
              </span>
            )}

          </div>

          <div className="space-y-6">

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  📍 Method 1: Find on Map
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Pinpoint your store directly on an interactive map.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setLocationPickerOpen(
                    true
                  )
                }
                className="h-10 px-4 bg-emerald-500 hover:bg-emerald-600 text-white transition rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs shadow-emerald-500/10 shrink-0"
              >
                <MapPin size={16} />
                Open Map Picker
              </button>

            </div>

            <div className="space-y-4 pt-2">

              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                ✍️ Method 2: Enter Address Manually
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Address Line 1 *
                  </label>

                  <input
                    type="text"
                    value={addressLine1}
                    onChange={e =>
                      setAddressLine1(
                        e.target.value
                      )
                    }
                    placeholder="Shop No., Building Name, Street"
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Address Line 2 / Landmark
                  </label>

                  <input
                    type="text"
                    value={addressLine2}
                    onChange={e =>
                      setAddressLine2(
                        e.target.value
                      )
                    }
                    placeholder="Near SBI Bank, Opposite Market"
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    City
                  </label>

                  <input
                    type="text"
                    value={city}
                    onChange={e =>
                      setCity(
                        e.target.value
                      )
                    }
                    placeholder="City / Town"
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    State
                  </label>

                  <input
                    type="text"
                    value={state}
                    onChange={e =>
                      setState(
                        e.target.value
                      )
                    }
                    placeholder="State"
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    PIN Code
                  </label>

                  <input
                    type="text"
                    value={pinCode}
                    onChange={e =>
                      setPinCode(
                        e.target.value
                      )
                    }
                    placeholder="6-digit PIN Code"
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-mono"
                  />
                </div>

              </div>

              <div className="flex justify-start pt-1">

                <button
                  type="button"
                  onClick={
                    handleVerifyManualAddress
                  }
                  disabled={
                    verifyingAddress
                  }
                  className="h-10 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-200 dark:border-slate-700"
                >
                  {verifyingAddress ? (
                    <Loader2
                      size={14}
                      className="animate-spin text-emerald-500"
                    />
                  ) : (
                    <CheckCircle
                      size={14}
                      className="text-emerald-500"
                    />
                  )}

                  Verify Address on Map
                </button>

              </div>

            </div>

            {isLocationVerified && (
              <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 space-y-1 text-xs">

                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider mb-2">
                  <CheckCircle size={14} />
                  Store Location Verified
                </div>

                {addressLine1 && (
                  <div className="text-slate-800 dark:text-slate-200 font-medium">
                    {addressLine1}
                  </div>
                )}

                {addressLine2 && (
                  <div className="text-slate-600 dark:text-slate-400">
                    {addressLine2}
                  </div>
                )}

                <div className="text-slate-600 dark:text-slate-400 font-medium">
                  {[
                    city,
                    state,
                    pinCode
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </div>

              </div>
            )}

          </div>
        </section>

        {/* ================================================================ */}
        {/* SECTION 3: BUSINESS HOURS */}
        {/* ================================================================ */}

        <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl p-6 shadow-xs space-y-6">

          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-900 pb-3">

            <Clock
              className="text-emerald-500"
              size={18}
            />

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Business Hours
            </h2>

          </div>

          {/* LIVE STATUS */}

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/50 space-y-4">

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

              <div className="space-y-1">

                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Current Live Status
                </span>

                <div className="flex items-center gap-3 flex-wrap">

                  <span
                    className={`inline-flex items-center rounded-xl border px-3 py-1.5 text-xs font-black ${currentEvaluation.badgeColor}`}
                  >
                    {currentEvaluation.badgeText}
                  </span>

                  {manualOverride && (
                    <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                      Manual Override Active
                    </span>
                  )}

                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-white p-3.5 dark:bg-slate-955 border border-slate-200/60 dark:border-slate-800">

                <Clock className="h-5 w-5 text-emerald-500 shrink-0" />

                <div>

                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {currentEvaluation.isOperational
                      ? 'Closes In'
                      : 'Status Info'}
                  </p>

                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {currentEvaluation.countdownText}
                  </p>

                </div>

              </div>

            </div>

            {/* 90-MINUTE WARNING */}

            {currentEvaluation.isOperational &&
              currentEvaluation.minsUntilClose <=
                90 &&
              currentEvaluation.minsUntilClose >
                0 && (
                <div className="mt-2">

                  {currentEvaluation.minsUntilClose <=
                  30 ? (
                    <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 text-xs font-bold">

                      <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />

                      <span>
                        ⚠️ Store closes in{' '}
                        {
                          currentEvaluation.minsUntilClose
                        }{' '}
                        minutes. Prepare to fulfill pending orders.
                      </span>

                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 rounded-xl border border-orange-200 bg-orange-50 p-3 text-orange-800 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-300 text-xs font-bold">

                      <AlertTriangle className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />

                      <span>
                        ⚠️ Your store will automatically close in{' '}
                        {
                          currentEvaluation.countdownText
                        }.
                      </span>

                    </div>
                  )}

                </div>
              )}

          </div>

          {/* MANUAL CONTROLS */}

          <div className="space-y-3">

            <div className="flex items-center justify-between">

              <div>

                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Manual Store Controls
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Override weekly schedule directly.
                </p>

              </div>

              {manualOverride && (
                <button
                  type="button"
                  onClick={
                    handleResetToAuto
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 transition"
                >
                  <Power className="h-3.5 w-3.5 text-emerald-500" />
                  Resume Auto Schedule
                </button>
              )}

            </div>

            <div className="grid grid-cols-3 gap-3">

              <button
                type="button"
                onClick={() =>
                  handleManualStatusChange(
                    'open'
                  )
                }
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 font-bold text-xs transition ${
                  storeStatus === 'open' &&
                  manualOverride
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                Open
              </button>

              <button
                type="button"
                onClick={() =>
                  handleManualStatusChange(
                    'busy'
                  )
                }
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 font-bold text-xs transition ${
                  storeStatus === 'busy' &&
                  manualOverride
                    ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
                Busy
              </button>

              <button
                type="button"
                onClick={() =>
                  handleManualStatusChange(
                    'closed'
                  )
                }
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 font-bold text-xs transition ${
                  storeStatus === 'closed' &&
                  manualOverride
                    ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                <XCircle className="h-4 w-4" />
                Closed
              </button>

            </div>
          </div>

          {/* WEEKLY SCHEDULE */}

          <div className="space-y-4 pt-2">

            <div className="flex items-center gap-2">

              <Calendar className="h-4 w-4 text-emerald-500" />

              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Weekly Operating Schedule
              </h3>

            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-900 border border-slate-100 dark:border-slate-900 rounded-2xl px-4 bg-slate-50/30 dark:bg-slate-900/20">

              {DAYS_OF_WEEK.map(
                day => {
                  const daySchedule =
                    schedule[day] || {
                      open: '09:00',
                      close: '22:00',
                      closed: false
                    };

                  const isClosed =
                    daySchedule.closed;

                  return (
                    <div
                      key={day}
                      className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                    >

                      <div className="flex items-center justify-between sm:w-40">

                        <span className="text-xs font-bold capitalize text-slate-900 dark:text-white">
                          {day}
                        </span>

                        <label className="relative inline-flex cursor-pointer items-center">

                          <input
                            type="checkbox"
                            checked={
                              !isClosed
                            }
                            onChange={() =>
                              handleDayToggle(
                                day
                              )
                            }
                            className="peer sr-only"
                          />

                          <div className="peer h-5 w-9 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-slate-800" />

                        </label>

                      </div>

                      {!isClosed ? (
                        <div className="flex items-center gap-3">

                          <div className="flex items-center gap-2">

                            <span className="text-[11px] font-bold text-slate-400">
                              Open:
                            </span>

                            <input
                              type="time"
                              value={
                                daySchedule.open
                              }
                              onChange={e =>
                                handleTimeChange(
                                  day,
                                  'open',
                                  e.target
                                    .value
                                )
                              }
                              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-955 dark:text-white"
                            />

                          </div>

                          <span className="text-slate-300 dark:text-slate-700">
                            –
                          </span>

                          <div className="flex items-center gap-2">

                            <span className="text-[11px] font-bold text-slate-400">
                              Close:
                            </span>

                            <input
                              type="time"
                              value={
                                daySchedule.close
                              }
                              onChange={e =>
                                handleTimeChange(
                                  day,
                                  'close',
                                  e.target
                                    .value
                                )
                              }
                              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-955 dark:text-white"
                            />

                          </div>

                        </div>
                      ) : (
                        <span className="text-xs font-extrabold text-slate-400 italic">
                          Closed All Day
                        </span>
                      )}

                    </div>
                  );
                }
              )}

            </div>
          </div>

        </section>

        {/* ================================================================ */}
        {/* SECTION 4: BUSINESS DOCUMENTS */}
        {/* ================================================================ */}

        <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl p-6 shadow-xs space-y-6">

          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-900 pb-3">

            <FileText
              className="text-emerald-500"
              size={18}
            />

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Business Documents
            </h2>

          </div>

          <div className="space-y-4">

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  PAN Number
                </label>

                <input
                  type="text"
                  value={panNumber}
                  onChange={e =>
                    setPanNumber(
                      e.target.value
                    )
                  }
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  GST Number
                </label>

                <input
                  type="text"
                  value={gstNumber}
                  onChange={e =>
                    setGstNumber(
                      e.target.value
                    )
                  }
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  FSSAI License
                </label>

                <input
                  type="text"
                  value={fssaiLicense}
                  onChange={e =>
                    setFssaiLicense(
                      e.target.value
                    )
                  }
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-mono"
                />
              </div>

            </div>

            {displaysDrugLicense && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-dashed border-slate-100 dark:border-slate-900">

                <div className="space-y-1.5">

                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Drug License Number
                  </label>

                  <input
                    type="text"
                    value={drugLicense}
                    onChange={e =>
                      setDrugLicense(
                        e.target.value
                      )
                    }
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-mono"
                  />

                </div>

                <div className="space-y-1.5">

                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Drug License Expiry
                  </label>

                  <input
                    type="date"
                    value={
                      drugLicenseExpiry
                    }
                    onChange={e =>
                      setDrugLicenseExpiry(
                        e.target.value
                      )
                    }
                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  />

                </div>

              </div>
            )}

          </div>
        </section>

        {/* ================================================================ */}
        {/* SECTION 5: BANK DETAILS */}
        {/* ================================================================ */}

        <section className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl p-6 shadow-xs space-y-6">

          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-900 pb-3">

            <Building2
              className="text-emerald-500"
              size={18}
            />

            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Bank Details
            </h2>

          </div>

          <div className="space-y-4">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div className="space-y-1.5">

                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Account Holder Name
                </label>

                <input
                  type="text"
                  value={
                    accountHolderName
                  }
                  onChange={e =>
                    setAccountHolderName(
                      e.target.value
                    )
                  }
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                />

              </div>

              <div className="space-y-1.5">

                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Bank Name
                </label>

                <input
                  type="text"
                  value={bankName}
                  onChange={e =>
                    setBankName(
                      e.target.value
                    )
                  }
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                />

              </div>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              <div className="space-y-1.5">

                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Account Number
                </label>

                <input
                  type="text"
                  value={accountNumber}
                  onChange={e =>
                    setAccountNumber(
                      e.target.value
                    )
                  }
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-mono"
                />

              </div>

              <div className="space-y-1.5">

                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  IFSC Code
                </label>

                <input
                  type="text"
                  value={ifscCode}
                  onChange={e =>
                    setIfscCode(
                      e.target.value
                    )
                  }
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-mono uppercase"
                />

              </div>

              <div className="space-y-1.5">

                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  UPI ID
                </label>

                <input
                  type="text"
                  value={upiId}
                  onChange={e =>
                    setUpiId(
                      e.target.value
                    )
                  }
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white font-mono"
                />

              </div>

            </div>

          </div>
        </section>

      </div>

      {/* LOCATION PICKER */}

      <StoreLocationPicker
        open={locationPickerOpen}
        initialLatitude={
          latitude
            ? Number(latitude)
            : null
        }
        initialLongitude={
          longitude
            ? Number(longitude)
            : null
        }
        onClose={() =>
          setLocationPickerOpen(false)
        }
        onConfirm={
          handleLocationConfirm
        }
      />

    </div>
  );
}