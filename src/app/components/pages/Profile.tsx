import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  User, 
  Check, 
  Camera, 
  ShieldAlert, 
  RefreshCw, 
  Loader2, 
  Save, 
  Mail, 
  Phone, 
  Trash2,
  Globe,
  Bell,
  Lock,
  LifeBuoy,
  FileText,
  ExternalLink,
  Shield,
  Smartphone
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface ProfileState {
  vendor_id: string;
  store_name: string;
  tagline: string;
  store_code: string;       
  avatar_url: string;       
  banner_url: string;
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

const approvalBadgeConfig: Record<string, { bg: string; text: string; label: string }> = {
  approved: { bg: "bg-emerald-500/10 border border-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", label: "Account Verified" },
  pending: { bg: "bg-amber-500/10 border border-amber-500/20", text: "text-amber-600 dark:text-amber-400", label: "Pending Approval" },
  suspended: { bg: "bg-rose-500/10 border border-rose-500/20", text: "text-rose-600 dark:text-rose-400", label: "Suspended" },
  rejected: { bg: "bg-rose-500/10 border border-rose-500/20", text: "text-rose-600 dark:text-rose-400", label: "Rejected" }
};

const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
  <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-900 p-6 space-y-5 shadow-xs">
    <h3 className="font-bold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-900/60 pb-3">
      <Icon className="w-4 h-4 text-[#10B981]" />
      {title}
    </h3>
    {children}
  </div>
);

const Field = ({ label, value, onChange, placeholder, type = "text", disabled = false }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</label>
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
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [validationError, setValidationError] = useState("");
  const [availableCategories, setAvailableCategories] = useState<StoreCategory[]>([]);

  // Preferences & Security UI States
  const [language, setLang] = useState<"en" | "mr">("en");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [whatsappNotifications, setWhatsappNotifications] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      
      if (!auth?.user) {
        setLoading(false);
        return;
      }

      const { data: categoriesData } = await supabase
        .from("product_categories")
        .select("id, name");
      setAvailableCategories(categoriesData || []);

      const { data: vendorCore } = await supabase
        .from("vendors")
        .select("*, subscriptions(plan_name)")
        .eq("auth_user_id", auth.user.id)
        .maybeSingle();

      if (!vendorCore) {
        setLoading(false);
        return;
      }

      const { data: profileExtended } = await supabase
        .from("vendor_profiles")
        .select("*")
        .eq("vendor_id", vendorCore.id)
        .maybeSingle();

      const parsedCategories = profileExtended?.categories 
        ? (Array.isArray(profileExtended.categories) ? profileExtended.categories : [profileExtended.categories])
        : (vendorCore.categories ? (Array.isArray(vendorCore.categories) ? vendorCore.categories : [vendorCore.categories]) : []);

      // Derive readable active subscription plan text representation
      let matchedPlan = "Free";
      if (vendorCore.subscriptions) {
        const subObj = Array.isArray(vendorCore.subscriptions) ? vendorCore.subscriptions[0] : vendorCore.subscriptions;
        if (subObj?.plan_name) matchedPlan = String(subObj.plan_name).toUpperCase();
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
        banner_url: profileExtended?.banner_url || "",
        alternate_phone: "", 
        status: vendorCore.status?.toLowerCase() || "pending",
        store_categories: parsedCategories,
        subscription_plan: matchedPlan,
        created_at: vendorCore.created_at ? new Date(vendorCore.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : "—"
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
    if (!profile || profile.store_categories.length === 0) return "—";
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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setValidationError("");
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        setValidationError("Image file size must be less than 2MB.");
        return;
      }

      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.vendor_id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("vendor-avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("vendor-avatars")
        .getPublicUrl(filePath);

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      
      // Upsert direct onto extended vendor tables to store reference immediately
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
      
      setProfile(prev => prev ? { ...prev, avatar_url: "" } : null);
      setSavedMessage("Profile photo removed successfully.");
      setTimeout(() => setSavedMessage(""), 3000);
    } catch (err: any) {
      setValidationError("Failed to remove avatar reference.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setValidationError("");
      const file = event.target.files?.[0];
      if (!file) return;

      const allowedExtensions = ["jpg", "jpeg", "png", "webp"];
      const fileExt = file.name.split('.').pop()?.toLowerCase() || "";
      if (!allowedExtensions.includes(fileExt)) {
        setValidationError("Invalid file type. Please upload a JPG, JPEG, PNG, or WEBP image.");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setValidationError("Banner image file size must be less than 5MB.");
        return;
      }

      setUploadingBanner(true);
      const filePath = `${profile.vendor_id}/banner.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("vendor-store-images")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("vendor-store-images")
        .getPublicUrl(filePath);

      await supabase
        .from("vendor_profiles")
        .update({ banner_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("vendor_id", profile.vendor_id);

      setProfile(prev => prev ? { ...prev, banner_url: publicUrl } : null);
      setSavedMessage("Premium business banner updated successfully.");
      setTimeout(() => setSavedMessage(""), 3000);
    } catch (err: any) {
      setValidationError(err.message || "Failed to upload banner image.");
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleRemoveBanner = async () => {
    try {
      setUploadingBanner(true);
      await supabase
        .from("vendor_profiles")
        .update({ banner_url: null, updated_at: new Date().toISOString() })
        .eq("vendor_id", profile.vendor_id);

      setProfile(prev => prev ? { ...prev, banner_url: "" } : null);
      setSavedMessage("Business banner removed successfully.");
      setTimeout(() => setSavedMessage(""), 3000);
    } catch (err: any) {
      setValidationError("Failed to clear business banner.");
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSaveIdentity = async () => {
    setValidationError("");
    setSavedMessage("");

    if (!profile.store_name.trim() || !profile.owner_name.trim() || !profile.primary_phone.trim() || !profile.email_address.trim()) {
      setValidationError("Store Name, Owner Name, Email, and Phone Number fields are required parameters.");
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

      setSavedMessage("Identity settings committed successfully!");
      setTimeout(() => setSavedMessage(""), 3000);
    } catch (err: any) {
      setValidationError(err.message || "Failed to save parameter adjustments.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");
    setSavedMessage("");

    if (!newPassword || !confirmPassword) {
      setValidationError("Please map entries into both password input boxes.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setValidationError("Cryptographic password mismatch strings identified.");
      return;
    }
    if (newPassword.length < 6) {
      setValidationError("Password string length must meet minimum 6-character constraints.");
      return;
    }

    try {
      setChangingPassword(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      setSavedMessage("Security credentials updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSavedMessage(""), 3000);
    } catch (err: any) {
      setValidationError(err.message || "Failed to update security parameters.");
    } finally {
      setChangingPassword(false);
    }
  };

  const badge = approvalBadgeConfig[profile.status] || approvalBadgeConfig.pending;

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

      {/* PREMIUM BUSINESS BANNER SECTION */}
      <div className="relative h-[240px] w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-900 group">
        {uploadingBanner ? (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : null}

        {profile.banner_url ? (
          <img 
            src={profile.banner_url} 
            alt="Business Banner" 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-slate-950 via-emerald-950 to-emerald-900 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950 flex items-center justify-center" />
        )}

        {/* Gradient Overlay for Typography Contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent z-10" />

        {/* Top Right Floating Controls */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <button
            type="button"
            disabled={uploadingBanner}
            onClick={() => bannerFileInputRef.current?.click()}
            className="h-9 px-4 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-800 dark:text-white text-xs font-bold shadow-sm hover:bg-white dark:hover:bg-slate-800 transition flex items-center gap-2 disabled:opacity-50"
          >
            <Camera className="w-3.5 h-3.5 text-emerald-500" />
            {profile.banner_url ? "Change Banner" : "Upload Banner"}
          </button>
          {profile.banner_url && (
            <button
              type="button"
              disabled={uploadingBanner}
              onClick={handleRemoveBanner}
              className="h-9 w-9 rounded-xl bg-rose-500/10 backdrop-blur-md text-rose-400 hover:text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 transition flex items-center justify-center shadow-sm"
              title="Remove Banner"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Bottom Left Meta Content */}
        <div className="absolute bottom-5 left-6 z-20 flex items-center gap-4 text-white max-w-[80%]">
          <div className="w-16 h-16 rounded-full border-2 border-white/20 dark:border-slate-800/60 bg-slate-900/80 backdrop-blur-md flex items-center justify-center font-black overflow-hidden shadow-md shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.store_name} className="w-full h-full object-cover" />
            ) : (
              <User size={24} className="text-slate-300" />
            )}
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-tight truncate drop-shadow-xs">{profile.store_name || "New Premium Store"}</h2>
              <div className={`font-bold text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-md shadow-3xs ${badge.bg} ${badge.text}`}>
                {profile.status === "approved" ? "✓ Verified" : profile.status}
              </div>
            </div>
            <p className="text-xs text-slate-300 line-clamp-1 opacity-90 drop-shadow-3xs font-medium">{profile.tagline || "No slogan established yet"}</p>
          </div>
        </div>
      </div>

      {/* HEADER PANELS BAR */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Account Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Manage individual identification descriptors, choices, and security metrics</p>
        </div>
      </div>

      {/* NOTIFICATION FEEDBACK TOASTS */}
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

      {/* IDENTITY SECTION */}
      <div className="space-y-6">
        {/* SECTION 1: PROFILE PHOTO FOCUS CARD */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-center gap-6">
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-2xl font-black text-slate-600 dark:text-slate-300 uppercase overflow-hidden shadow-inner">
              {uploadingImage ? (
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              ) : profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.owner_name} className="w-full h-full object-cover" />
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

          <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Profile Picture</h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">JPG or PNG formats acceptable. Maximum hosting file allocation sizes cap around 2MB entries.</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-flex-start gap-2 pt-1">
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
                  <Trash2 size={12} /> Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: IDENTITY DATA INPUT FIELDS */}
        <Section title="Identity Management" icon={User}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Store Name" value={profile.store_name} onChange={v => setProfile(p => p ? ({ ...p, store_name: v }) : null)} />
            <Field label="Owner Name" value={profile.owner_name} onChange={v => setProfile(p => p ? ({ ...p, owner_name: v }) : null)} />
            <div className="sm:col-span-2">
              <Field label="Tagline / Slogan" value={profile.tagline} onChange={v => setProfile(p => p ? ({ ...p, tagline: v }) : null)} placeholder="Establish branding statement lines" />
            </div>
            <Field label="Email Address" value={profile.email_address} onChange={v => setProfile(p => p ? ({ ...p, email_address: v }) : null)} />
            <Field label="Phone Number" value={profile.primary_phone} onChange={v => setProfile(p => p ? ({ ...p, primary_phone: v }) : null)} />
            <Field label="Alternate Phone (Optional)" value={profile.alternate_phone} onChange={v => setProfile(p => p ? ({ ...p, alternate_phone: v }) : null)} placeholder="Secondary connection channel" />
          </div>

          <div className="flex justify-end pt-2">
            <button 
              type="button" 
              onClick={handleSaveIdentity}
              disabled={saving}
              className="h-10 px-5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              Save Profile
            </button>
          </div>
        </Section>
      </div>

      {/* PLATFORM INFORMATION (SECTION 3) */}
      <Section title="Platform Metadata" icon={FileText}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Store Identifier Code</p>
              <p className="font-mono text-base font-black text-slate-800 dark:text-slate-200 mt-1">{profile.store_code}</p>
            </div>
            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] tracking-wider px-2.5 py-1 rounded-full uppercase border border-emerald-500/20">
              Rivo Node
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Account Clearance Status</p>
              <p className="text-sm font-bold text-slate-800 dark:text-white mt-1.5 capitalize">{profile.status}</p>
            </div>
            <div className={`font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full ${badge.bg} ${badge.text}`}>
              {badge.label}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Primary Classification Channel</p>
            <p className="font-bold text-slate-800 dark:text-white mt-1.5 uppercase tracking-wide">{primaryCategoryLabel}</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Subscription Bundle</p>
            <p className="font-black text-slate-800 dark:text-white mt-1.5 tracking-wide">{profile.subscription_plan} TIER</p>
          </div>

          <div className="sm:col-span-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">Selected Categories Matrix</p>
            {profile.store_categories.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {profile.store_categories.map(c => (
                  <span key={c} className="bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-3xs uppercase">
                    🏷 {c}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic">No channel nodes provisioned inside table matrices.</span>
            )}
          </div>

          <div className="sm:col-span-2 text-xs text-slate-400 dark:text-slate-500 px-1 pt-1 flex items-center justify-between">
            <span>Registration Sequence Finalized:</span>
            <span className="font-semibold text-slate-600 dark:text-slate-400 font-mono">{profile.created_at}</span>
          </div>

        </div>
      </Section>

      {/* PREFERENCES (SECTION 4) */}
      <Section title="Preferences" icon={Globe}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Interface Language</label>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setLang("en")} 
                className={`flex-1 h-10 rounded-xl font-bold text-xs border transition-all ${language === "en" ? "bg-emerald-500 text-white border-transparent shadow-xs" : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100"}`}
              >
                English
              </button>
              <button 
                type="button"
                onClick={() => setLang("mr")} 
                className={`flex-1 h-10 rounded-xl font-bold text-xs border transition-all ${language === "mr" ? "bg-emerald-500 text-white border-transparent shadow-xs" : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100"}`}
              >
                मराठी (Marathi)
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Notification Vectors</label>
            <div className="space-y-2.5">
              <label className="flex items-center gap-3 select-none text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={emailNotifications} 
                  onChange={e => setEmailNotifications(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500/10 w-4 h-4"
                />
                <span className="flex items-center gap-1.5"><Mail size={14} className="text-slate-400" /> Email Notifications</span>
              </label>
              
              <label className="flex items-center gap-3 select-none text-xs text-slate-400 dark:text-slate-500 font-medium cursor-not-allowed">
                <input 
                  type="checkbox" 
                  checked={whatsappNotifications} 
                  disabled
                  className="rounded border-slate-200 text-slate-300 w-4 h-4 opacity-50"
                />
                <span className="flex items-center gap-1.5"><Smartphone size={14} className="text-slate-400" /> WhatsApp Integration <span className="text-[9px] bg-slate-100 dark:bg-slate-900 text-slate-400 border px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ml-1">Beta</span></span>
              </label>
            </div>
          </div>
        </div>
      </Section>

      {/* SECURITY (SECTION 5) */}
      <Section title="Security & Authentication" icon={Lock}>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="New Password" value={newPassword} onChange={setNewPassword} type="password" placeholder="••••••••" />
            <Field label="Confirm Password" value={confirmPassword} onChange={setConfirmPassword} type="password" placeholder="••••••••" />
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-900/60 pt-4">
            <button
              type="button"
              disabled
              className="h-9 px-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-bold transition-all cursor-not-allowed text-left sm:text-center"
            >
              Logout Other Active Session Tokens
            </button>

            <button 
              type="submit"
              disabled={changingPassword}
              className="h-9 px-4 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs"
            >
              {changingPassword && <Loader2 size={12} className="animate-spin" />}
              Update Credentials
            </button>
          </div>
        </form>
      </Section>

      {/* SUPPORT (SECTION 6) */}
      <Section title="Platform Support & Legal Compliance" icon={LifeBuoy}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1 text-sm">
          <div className="space-y-1.5">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Encountered individual account limitations, compliance issues, or authentication layout bugs? Reach out to our engineers.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <a href="tel:+919021404487" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5">
                📞 Direct Vendor Escalation Hotline
              </a>
              <a href="mailto:rivo.cityhelp1@gmail.com" className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:underline flex items-center gap-1.5">
                ✉️ Account Operations Email Gateway
              </a>
            </div>
          </div>

          <div className="border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-900/60 pt-4 md:pt-0 md:pl-6 flex flex-col justify-between space-y-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-bold text-slate-600 dark:text-slate-400">
              <a href="#" className="hover:text-emerald-500 transition-colors flex items-center gap-1">Help Center <ExternalLink size={10} /></a>
              <a href="#" className="hover:text-emerald-500 transition-colors flex items-center gap-1">Terms of Service <ExternalLink size={10} /></a>
              <a href="#" className="hover:text-emerald-500 transition-colors flex items-center gap-1">Privacy Policy <ExternalLink size={10} /></a>
              <a href="#" className="hover:text-emerald-500 transition-colors flex items-center gap-1">Compliance Status <ExternalLink size={10} /></a>
            </div>
            
            <div className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 text-right uppercase tracking-wider">
              Rivo Core Client App Version: <span className="text-slate-600 dark:text-slate-400">v4.12.0-stable</span>
            </div>
          </div>
        </div>
      </Section>

    </div>
  );
}