import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  User,
  Check,
  Camera,
  ShieldAlert,
  Loader2,
  Trash2,
  FileText
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface ProfileState {
  vendor_id: string;
  store_name: string;
  tagline: string;
  store_code: string;
  avatar_url: string;
  banner_urls: string[];
  owner_name: string;
  email_address: string;
  primary_phone: string;
  alternate_phone: string;
  status: string;
  store_categories: string[];
  subscription_plan: string;
  created_at: string;
}

interface StoreCategory {
  id: string;
  name: string;
}

interface ProfileBannerRow {
  id: string;
  vendor_id: string;
  banner_url: string;
  banner_order: number;
  is_active: boolean;
}

const approvalBadgeConfig: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  approved: {
    bg: "bg-emerald-500/10 border border-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    label: "Account Verified"
  },
  pending: {
    bg: "bg-amber-500/10 border border-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    label: "Pending Approval"
  },
  suspended: {
    bg: "bg-rose-500/10 border border-rose-500/20",
    text: "text-rose-600 dark:text-rose-400",
    label: "Suspended"
  },
  rejected: {
    bg: "bg-rose-500/10 border border-rose-500/20",
    text: "text-rose-600 dark:text-rose-400",
    label: "Rejected"
  }
};

const Section = ({
  title,
  icon: Icon,
  children
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) => (
  <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-900 p-6 space-y-5 shadow-xs">
    <h3 className="font-bold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-900/60 pb-3">
      <Icon className="w-4 h-4 text-[#10B981]" />
      {title}
    </h3>
    {children}
  </div>
);

const Field = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
      {label}
    </label>
    <input
      type={type}
      value={value || ""}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/10 transition-all disabled:opacity-60"
    />
  </div>
);

export function Profile() {
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingBannerSlot, setUploadingBannerSlot] = useState<number | null>(null);

  // Rivo policy: every vendor can use up to 3 profile banners.
  const maxProfileBanners = 3;

  const [savedMessage, setSavedMessage] = useState("");
  const [validationError, setValidationError] = useState("");
  const [, setAvailableCategories] = useState<StoreCategory[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const activeSlotRef = useRef<number | null>(null);

  /**
   * Normalize a stored vendor category value against the canonical
   * product_categories table.
   *
   * This protects the UI from old casing / naming differences while
   * keeping the database values untouched.
   */
  const normalizeCategoryNames = (
    values: unknown,
    canonicalCategories: StoreCategory[]
  ): string[] => {
    if (!Array.isArray(values)) {
      if (typeof values === "string" && values.trim()) {
        values = [values];
      } else {
        return [];
      }
    }

    const canonicalMap = new Map<string, string>();

    canonicalCategories.forEach(category => {
      canonicalMap.set(category.name.trim().toLowerCase(), category.name.trim());
    });

    return (values as unknown[])
      .map(value => {
        if (typeof value !== "string") return null;

        const raw = value.trim();
        if (!raw) return null;

        // Direct canonical name match.
        const canonicalMatch = canonicalMap.get(raw.toLowerCase());
        if (canonicalMatch) return canonicalMatch;

        // Handle common legacy category labels.
        const legacyAliases: Record<string, string> = {
          "personal care": "Personal Care",
          "personalcare": "Personal Care",
          "home and kitchen": "Home & Kitchen",
          "home & kitchen": "Home & Kitchen",
          "fruits and vegetables": "Fruits & Vegetables",
          "fruits & vegetables": "Fruits & Vegetables",
          "fruit & vegetables": "Fruits & Vegetables",
          "fruit and vegetables": "Fruits & Vegetables"
        };

        const aliasMatch = legacyAliases[raw.toLowerCase()];
        if (aliasMatch) {
          const canonicalAlias = canonicalMap.get(aliasMatch.toLowerCase());
          return canonicalAlias || aliasMatch;
        }

        // Preserve unknown values rather than silently deleting vendor data.
        return raw;
      })
      .filter((value): value is string => Boolean(value));
  };

  const fetchProfileData = async () => {
    try {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();

      if (!auth?.user) {
        setLoading(false);
        return;
      }

      /*
       * Load the single canonical category source.
       * All category display normalization in this page is based on
       * public.product_categories.
       */
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("product_categories")
        .select("id, name")
        .eq("status", "active")
        .order("display_order", { ascending: true });

      if (categoriesError) {
        console.error("Failed to load canonical product categories:", categoriesError);
      }

      const canonicalCategories: StoreCategory[] = categoriesData || [];
      setAvailableCategories(canonicalCategories);

      const { data: vendorCore, error: vendorError } = await supabase
        .from("vendors")
        .select("*, subscriptions(plan_name, max_profile_banners)")
        .eq("auth_user_id", auth.user.id)
        .maybeSingle();

      if (vendorError) {
        console.error("Failed to load vendor profile:", vendorError);
      }

      if (!vendorCore) {
        setLoading(false);
        return;
      }

      const { data: profileExtended, error: profileError } = await supabase
        .from("vendor_profiles")
        .select("*")
        .eq("vendor_id", vendorCore.id)
        .maybeSingle();

      if (profileError) {
        console.error("Failed to load extended vendor profile:", profileError);
      }

      const rawProfileCategories = profileExtended?.categories;
      const rawVendorCategories = vendorCore.categories;

      const parsedRawCategories = rawProfileCategories
        ? Array.isArray(rawProfileCategories)
          ? rawProfileCategories
          : [rawProfileCategories]
        : rawVendorCategories
          ? Array.isArray(rawVendorCategories)
            ? rawVendorCategories
            : [rawVendorCategories]
          : [];

      const normalizedCategories = normalizeCategoryNames(
        parsedRawCategories,
        canonicalCategories
      );

      let matchedPlan = "Free";

      if (vendorCore.subscriptions) {
        const subObj = Array.isArray(vendorCore.subscriptions)
          ? vendorCore.subscriptions[0]
          : vendorCore.subscriptions;

        if (subObj?.plan_name) {
          matchedPlan = String(subObj.plan_name).toUpperCase();
        }
      }

      const { data: bannersData, error: bannersError } = await supabase
        .from("vendor_profile_banners")
        .select("*")
        .eq("vendor_id", vendorCore.id)
        .order("banner_order", { ascending: true });

      if (bannersError) {
        console.error("Failed to load vendor profile banners:", bannersError);
      }

      const constructedBannerUrls: string[] = Array(maxProfileBanners).fill("");

      if (bannersData && bannersData.length > 0) {
        bannersData.forEach((row: ProfileBannerRow) => {
          if (
            row.banner_order >= 0 &&
            row.banner_order < maxProfileBanners
          ) {
            constructedBannerUrls[row.banner_order] = row.banner_url || "";
          }
        });
      }

      const validatedState: ProfileState = {
        vendor_id: vendorCore.id,
        store_name: vendorCore.shop_name || "",
        owner_name: vendorCore.owner_name || "",
        email_address: vendorCore.email || auth.user.email || "",
        primary_phone: vendorCore.phone || "",
        tagline: profileExtended?.tagline || "",
        store_code: vendorCore.shop_code || "NEW-SHOP",
        avatar_url: profileExtended?.avatar_url || "",
        banner_urls: constructedBannerUrls,
        alternate_phone: "",
        status: vendorCore.status?.toLowerCase() || "pending",
        store_categories: normalizedCategories,
        subscription_plan: matchedPlan,
        created_at: vendorCore.created_at
          ? new Date(vendorCore.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric"
            })
          : "—"
      };

      setProfile(validatedState);
    } catch (err) {
      console.error("Error reading schema profile payload:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const primaryCategoryLabel = useMemo(() => {
    if (!profile || profile.store_categories.length === 0) {
      return "—";
    }

    return profile.store_categories[0];
  }, [profile]);

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!profile) return null;

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    try {
      setValidationError("");

      const file = event.target.files?.[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        setValidationError("Image file size must be less than 2MB.");
        return;
      }

      setUploadingImage(true);

      const fileExt = file.name.split(".").pop();
      const filePath = `${profile.vendor_id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("vendor-avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl }
      } = supabase.storage
        .from("vendor-avatars")
        .getPublicUrl(filePath);

      setProfile(prev =>
        prev ? { ...prev, avatar_url: publicUrl } : null
      );

      await supabase
        .from("vendor_profiles")
        .update({ avatar_url: publicUrl })
        .eq("vendor_id", profile.vendor_id);

      setSavedMessage("Profile photo uploaded successfully.");
      setTimeout(() => setSavedMessage(""), 3000);
    } catch (err: any) {
      setValidationError(err.message || "Failed to upload image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!profile.avatar_url) return;

    try {
      setUploadingImage(true);

      await supabase
        .from("vendor_profiles")
        .update({ avatar_url: null })
        .eq("vendor_id", profile.vendor_id);

      setProfile(prev =>
        prev ? { ...prev, avatar_url: "" } : null
      );

      setSavedMessage("Profile photo removed successfully.");
      setTimeout(() => setSavedMessage(""), 3000);
    } catch (err: any) {
      setValidationError("Failed to remove avatar reference.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleTriggerBannerUpload = (slotIndex: number) => {
    activeSlotRef.current = slotIndex;
    bannerFileInputRef.current?.click();
  };

  const handleBannerUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const slotIndex = activeSlotRef.current;

    if (slotIndex === null || slotIndex === undefined) return;

    try {
      setValidationError("");

      const file = event.target.files?.[0];
      if (!file) return;

      const allowedExtensions = ["jpg", "jpeg", "png", "webp"];
      const fileExt =
        file.name.split(".").pop()?.toLowerCase() || "";

      if (!allowedExtensions.includes(fileExt)) {
        setValidationError(
          "Invalid file type. Please upload a JPG, JPEG, PNG, or WEBP image."
        );
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setValidationError(
          "Banner image file size must be less than 5MB."
        );
        return;
      }

      setUploadingBannerSlot(slotIndex);

      const filePath = `${profile.vendor_id}/banner-slot-${slotIndex}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("vendor-store-images")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl }
      } = supabase.storage
        .from("vendor-store-images")
        .getPublicUrl(filePath);

      const { data: existingSlotCheck } = await supabase
        .from("vendor_profile_banners")
        .select("id")
        .eq("vendor_id", profile.vendor_id)
        .eq("banner_order", slotIndex)
        .maybeSingle();

      if (existingSlotCheck?.id) {
        const { error: updateError } = await supabase
          .from("vendor_profile_banners")
          .update({
            banner_url: publicUrl,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingSlotCheck.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("vendor_profile_banners")
          .insert([
            {
              vendor_id: profile.vendor_id,
              banner_url: publicUrl,
              banner_order: slotIndex,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]);

        if (insertError) throw insertError;
      }

      const nextBanners = [...profile.banner_urls];
      nextBanners[slotIndex] = publicUrl;

      setProfile(prev =>
        prev ? { ...prev, banner_urls: nextBanners } : null
      );

      setSavedMessage(
        `Store banner ${slotIndex + 1} uploaded successfully.`
      );

      setTimeout(() => setSavedMessage(""), 3000);
    } catch (err: any) {
      setValidationError(
        err.message || "Failed to upload banner image."
      );
    } finally {
      setUploadingBannerSlot(null);
      activeSlotRef.current = null;

      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleRemoveBannerSlot = async (slotIndex: number) => {
    try {
      setUploadingBannerSlot(slotIndex);

      const { error: deleteError } = await supabase
        .from("vendor_profile_banners")
        .delete()
        .eq("vendor_id", profile.vendor_id)
        .eq("banner_order", slotIndex);

      if (deleteError) throw deleteError;

      const nextBanners = [...profile.banner_urls];
      nextBanners[slotIndex] = "";

      setProfile(prev =>
        prev ? { ...prev, banner_urls: nextBanners } : null
      );

      setSavedMessage(
        `Store banner ${slotIndex + 1} removed.`
      );

      setTimeout(() => setSavedMessage(""), 3000);
    } catch (err: any) {
      setValidationError("Failed to clear banner.");
    } finally {
      setUploadingBannerSlot(null);
    }
  };

  const handleSaveIdentity = async () => {
    setValidationError("");
    setSavedMessage("");

    if (
      !profile.store_name.trim() ||
      !profile.owner_name.trim() ||
      !profile.primary_phone.trim() ||
      !profile.email_address.trim()
    ) {
      setValidationError(
        "Store Name, Owner Name, Email, and Phone Number fields are required."
      );
      return;
    }

    try {
      setSaving(true);

      const { error: coreError } = await supabase
        .from("vendors")
        .update({
          shop_name: profile.store_name.trim(),
          owner_name: profile.owner_name.trim(),
          email: profile.email_address.trim(),
          phone: profile.primary_phone.trim(),
          updated_at: new Date().toISOString()
        })
        .eq("id", profile.vendor_id);

      if (coreError) throw coreError;

      const { error: profileError } = await supabase
        .from("vendor_profiles")
        .update({
          tagline: profile.tagline.trim(),
          updated_at: new Date().toISOString()
        })
        .eq("vendor_id", profile.vendor_id);

      if (profileError) throw profileError;

      setSavedMessage("Store settings updated successfully.");
      setTimeout(() => setSavedMessage(""), 3000);
    } catch (err: any) {
      setValidationError(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    await handleSaveIdentity();
  };

  const badge =
    approvalBadgeConfig[profile.status] ||
    approvalBadgeConfig.pending;

  return (
    <div className="p-6 max-w-(--size-breakpoint-md) mx-auto space-y-8 min-h-screen transition-colors duration-200">

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarUpload}
        accept="image/*"
        className="hidden"
      />

      <input
        type="file"
        ref={bannerFileInputRef}
        onChange={handleBannerUpload}
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
      />

      <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Account Profile
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage store details and banners
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saving}
          className="h-10 px-5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          {saving && (
            <Loader2 size={14} className="animate-spin" />
          )}
          Save All Changes
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-[#10B981]" />
            Store Banners
          </label>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Store Banners
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Maximum:
              </span>{" "}
              3 banners
            </div>

            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Supported:
              </span>{" "}
              JPG • PNG • WEBP
            </div>

            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Maximum Size:
              </span>{" "}
              5 MB each
            </div>

            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Recommended Size:
              </span>{" "}
              1600 × 600 px
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: maxProfileBanners }).map((_, index) => {
            const currentUrl = profile.banner_urls[index];
            const isSlotUploading =
              uploadingBannerSlot === index;

            return (
              <div
                key={index}
                className="relative h-[160px] w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-900 group bg-slate-50 dark:bg-slate-955"
              >
                {isSlotUploading ? (
                  <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-20">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  </div>
                ) : null}

                {currentUrl ? (
                  <>
                    <img
                      src={currentUrl}
                      alt={`Banner ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-955 via-transparent to-transparent z-10" />
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-800 bg-linear-to-tr from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-955 p-4 border-2 border-dashed border-slate-200 dark:border-slate-900 rounded-2xl">
                    <Camera
                      size={24}
                      className="opacity-40 mb-1.5 text-slate-400"
                    />

                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Banner {index + 1}
                    </span>
                  </div>
                )}

                <div className="absolute bottom-3 left-4 z-20">
                  <span className="text-[9px] font-mono font-black tracking-wider uppercase text-white/90 bg-slate-955/80 px-2 py-0.5 border border-white/10 rounded-md backdrop-blur-md shadow-sm">
                    Banner {index + 1}
                  </span>
                </div>

                <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    disabled={uploadingBannerSlot !== null}
                    onClick={() =>
                      handleTriggerBannerUpload(index)
                    }
                    className="h-7 px-3 rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-800 dark:text-white text-[10px] font-bold border border-slate-200 dark:border-slate-800 shadow-3xs hover:bg-white dark:hover:bg-slate-800 transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Camera className="w-3 h-3 text-emerald-500" />
                    {currentUrl
                      ? "Change Banner"
                      : "Upload Banner"}
                  </button>

                  {currentUrl && (
                    <button
                      type="button"
                      disabled={uploadingBannerSlot !== null}
                      onClick={() =>
                        handleRemoveBannerSlot(index)
                      }
                      className="h-7 w-7 rounded-lg bg-rose-500/10 backdrop-blur-md text-rose-400 hover:text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 transition flex items-center justify-center shadow-3xs"
                      title="Remove Banner"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-955 p-5 rounded-2xl border border-slate-200 dark:border-slate-900 shadow-2xs flex flex-col sm:flex-row items-center gap-4">
        <div className="w-14 h-14 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-center font-black overflow-hidden shadow-xs shrink-0">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.store_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <User size={20} className="text-slate-400" />
          )}
        </div>

        <div className="space-y-0.5 text-center sm:text-left min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
              {profile.store_name || "New Premium Store"}
            </h2>

            <div
              className={`font-bold text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wider shadow-3xs border ${badge.bg} ${badge.text}`}
            >
              {profile.status === "approved"
                ? "✓ Verified"
                : profile.status}
            </div>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1 font-medium">
            {profile.tagline || "No tagline established yet"}
          </p>
        </div>
      </div>

      {validationError && (
        <div className="bg-rose-50 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-400 rounded-xl p-4 flex items-start gap-2 text-xs font-semibold shadow-xs">
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <p>{validationError}</p>
        </div>
      )}

      {savedMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-400 rounded-xl p-4 flex items-start gap-2 text-xs font-semibold shadow-xs">
          <Check className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          <p>{savedMessage}</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-900 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-center gap-6">
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-2xl font-black text-slate-600 dark:text-slate-300 uppercase overflow-hidden shadow-inner">
              {uploadingImage ? (
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              ) : profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.owner_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={36} className="text-slate-400" />
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#10B981] hover:bg-[#059669] text-white flex items-center justify-center shadow-md transition-colors"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-center sm:text-left flex-1 min-w-0">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Profile Picture
              </h2>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 px-3 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Change Photo
                </button>

                {profile.avatar_url && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs space-y-1">
              <p className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Profile Photo
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 text-slate-500 dark:text-slate-400">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Supported:
                  </span>{" "}
                  • JPG • PNG • WEBP
                </div>

                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Maximum Size:
                  </span>{" "}
                  2 MB
                </div>

                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Recommended Size:
                  </span>{" "}
                  500 × 500 px
                </div>
              </div>
            </div>
          </div>
        </div>

        <Section title="Store Details" icon={User}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Store Name"
              value={profile.store_name}
              onChange={v =>
                setProfile(p =>
                  p ? { ...p, store_name: v } : null
                )
              }
            />

            <Field
              label="Owner Name"
              value={profile.owner_name}
              onChange={v =>
                setProfile(p =>
                  p ? { ...p, owner_name: v } : null
                )
              }
            />

            <div className="sm:col-span-2">
              <Field
                label="Tagline / Slogan"
                value={profile.tagline}
                onChange={v =>
                  setProfile(p =>
                    p ? { ...p, tagline: v } : null
                  )
                }
                placeholder="Establish branding statement lines"
              />
            </div>

            <Field
              label="Email Address"
              value={profile.email_address}
              onChange={v =>
                setProfile(p =>
                  p ? { ...p, email_address: v } : null
                )
              }
            />

            <Field
              label="Phone Number"
              value={profile.primary_phone}
              onChange={v =>
                setProfile(p =>
                  p ? { ...p, primary_phone: v } : null
                )
              }
            />

            <Field
              label="Alternate Phone (Optional)"
              value={profile.alternate_phone}
              onChange={v =>
                setProfile(p =>
                  p ? { ...p, alternate_phone: v } : null
                )
              }
              placeholder="Secondary connection channel"
            />
          </div>
        </Section>
      </div>

      <Section title="Store Information" icon={FileText}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">

          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Store Identifier Code
              </p>

              <p className="font-mono text-base font-black text-slate-800 dark:text-slate-200 mt-1">
                {profile.store_code}
              </p>
            </div>

            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] tracking-wider px-2.5 py-1 rounded-full uppercase border border-emerald-500/20">
              Rivo Node
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Account Clearance Status
              </p>

              <p className="text-sm font-bold text-slate-800 dark:text-white mt-1.5 capitalize">
                {profile.status}
              </p>
            </div>

            <div className={`font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full ${badge.bg} ${badge.text}`}>
              {badge.label}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Primary Classification Channel
            </p>

            <p className="font-bold text-slate-800 dark:text-white mt-1.5 uppercase tracking-wide">
              {primaryCategoryLabel}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Active Subscription
            </p>

            <p className="font-black text-slate-800 dark:text-white mt-1.5 tracking-wide">
              {profile.subscription_plan} TIER
            </p>
          </div>

          <div className="sm:col-span-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
              Primary Category
            </p>

            {profile.store_categories.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {profile.store_categories.map(category => (
                  <span
                    key={category}
                    className="bg-white dark:bg-slate-955 text-slate-700 dark:text-slate-300 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-3xs uppercase"
                  >
                    🏷 {category}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic">
                No categories assigned.
              </span>
            )}
          </div>

          <div className="sm:col-span-2 text-xs text-slate-400 dark:text-slate-500 px-1 pt-1 flex items-center justify-between">
            <span>Registration Date:</span>

            <span className="font-semibold text-slate-600 dark:text-slate-400 font-mono">
              {profile.created_at}
            </span>
          </div>
        </div>
      </Section>
    </div>
  );
}