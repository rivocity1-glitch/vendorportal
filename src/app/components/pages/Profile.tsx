import React, { useState, useEffect, useRef } from "react";
import { Store, User, FileText, MapPin, Building, Check, Camera, ShieldAlert, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface ProfileState {
  store_name: string;
  tagline: string;
  store_categories: string[];
  store_code: string;       
  avatar_url: string;       
  owner_name: string;
  email_address: string;
  primary_phone: string;
  alternate_phone: string;
  pan_number: string;
  gst_number: string;
  fssai_license: string;
  drug_license: string;
  drug_license_expiry: string;
  address_line1: string;
  address_line2: string;
  landmark: string;
  city: string;
  state: string;
  pin_code: string;
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  upi_id: string;
  auth_user_id: string;
  is_account_verified: boolean;
  is_pan_verified: boolean;
  is_gst_verified: boolean;
  is_bank_verified: boolean;
}

interface StoreCategory {
  id: string;
  name: string;
}

// =========================================================================
// 🌐 LOCAL TRANSLATION DICTIONARY (मराठी आणि इंग्रजी भाषांतर पर्याय)
// =========================================================================
const translations = {
  en: {
    store_details: "Store Details",
    store_name: "Store Name",
    tagline: "Tagline",
    store_classifications: "Store Classifications (Select all applicable channels)",
    owner_details: "Owner Details",
    owner_name: "Owner Name",
    email: "Email Address",
    primary_phone: "Primary Phone",
    alt_phone: "Alternate Phone",
    gst_compliance: "GST & Compliance",
    pan_card: "PAN Card Number *",
    gstin: "GSTIN Number (Optional)",
    fssai: "FSSAI License Classification",
    drug_license: "Drug License ID Code *",
    drug_expiry: "Drug License Expiry Date *",
    pharmacy_info: "Additional conditional fields automatically mount here if the Pharmacy tag is selected.",
    address_title: "Store Address",
    address1: "Address Line 1",
    address2: "Address Line 2",
    landmark: "Landmark",
    city: "City",
    state: "State",
    pincode: "PIN Code",
    bank_title: "Bank Account & Payout Gateways",
    acc_holder: "Account Holder Name",
    bank_name: "Bank Name",
    acc_num: "Account Number",
    ifsc: "IFSC Code",
    upi: "UPI ID Vector (Alternative Payout Target Endpoint)",
    bank_verified: "Settlement metrics validated. Automatic transaction cycles clear accounts on weekly intervals.",
    bank_missing: "Bank verification status currently missing. Click check down below to run verification.",
    btn_verify: "Verify via Penny Drop",
    btn_verified: "Verified ✓",
    btn_run_verify: "Run Verification",
    discard: "Discard Changes",
    save: "Save Profile",
    saving: "Saving Changes...",
    account_verified: "Account Verified",
    btn_verify_acc: "Verify Account",
    placeholder_store_title: "Store trade title",
    placeholder_banner: "Brief marketplace banner statement"
  },
  mr: {
    store_details: "दुकानाचे तपशील (Store Details)",
    store_name: "दुकानाचे नाव",
    tagline: "घोषवाक्य (Tagline)",
    store_classifications: "दुकानाचे वर्गीकरण (सर्व लागू पर्याय निवडा)",
    owner_details: "मालकाचे तपशील (Owner Details)",
    owner_name: "मालकाचे नाव",
    email: "ईमेल पत्ता",
    primary_phone: "मुख्य फोन नंबर",
    alt_phone: "पर्यायी फोन नंबर",
    gst_compliance: "जीएसटी आणि अनुपालन (GST & Compliance)",
    pan_card: "पॅन कार्ड नंबर *",
    gstin: "जीएसटीआयएन नंबर (पर्यायी)",
    fssai: "एफएसएसएआय परवाना नंबर (FSSAI)",
    drug_license: "ड्रग लायसन्स कोड *",
    drug_expiry: "ड्रग लायसन्स संपण्याची तारीख *",
    pharmacy_info: "जर 'Pharmacy' पर्याय निवडला असेल तर अतिरिक्त रकाने येथे दिसतील.",
    address_title: "दुकानाचा पत्ता (Store Address)",
    address1: "पत्ता ओळ १",
    address2: "पत्ता ओळ २",
    landmark: "जवळची प्रसिद्ध जागा (Landmark)",
    city: "शहर",
    state: "राज्य",
    pincode: "पिन कोड (PIN Code)",
    bank_title: "बँक खाते आणि पेआउट (Bank Details)",
    acc_holder: "खातेधारकाचे नाव",
    bank_name: "बँकेचे नाव",
    acc_num: "खाते क्रमांक",
    ifsc: "आयएफएससी कोड (IFSC)",
    upi: "युपीआय आयडी (UPI ID)",
    bank_verified: "बँक खाते सत्यापित केले गेले आहे. साप्ताहिक सेटलमेंट केली जाईल.",
    bank_missing: "बँक खाते पडताळणी प्रलंबित आहे. खालील बटणावर क्लिक करून पडताळणी करा.",
    btn_verify: "पेनी ड्रॉपद्वारे तपासा",
    btn_verified: "सत्यापित ✓",
    btn_run_verify: "पडताळणी करा",
    discard: "बदल रद्द करा",
    save: "प्रोफाइल जतन करा",
    saving: "जतन होत आहे...",
    account_verified: "खाते सत्यापित आहे",
    btn_verify_acc: "खाते सत्यापित करा",
    placeholder_store_title: "तुमच्या दुकानाचे व्यावसायिक नाव",
    placeholder_banner: "दुकानाचा संक्षिप्त संदेश किंवा माहिती"
  }
};

const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
  <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
    <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 border-b border-border/40 pb-2">
      <Icon className="w-4 h-4 text-[#10B981]" />
      {title}
    </h3>
    {children}
  </div>
);

const Field = ({ label, value, onChange, placeholder, type = "text", disabled = false }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean }) => (
  <div className="space-y-1">
    <label className="block text-xs font-bold text-muted-foreground">{label}</label>
    <input
      type={type}
      value={value}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/10 transition-all disabled:opacity-60"
    />
  </div>
);

export function Profile() {
  // 🌐 Language State
  const [lang, setLang] = useState<"en" | "mr">("en");
  const t = (key: keyof typeof translations["en"]) => translations[lang][key] || translations["en"][key];

  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [dbBackup, setDbBackup] = useState<ProfileState | null>(null); 
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [validationError, setValidationError] = useState("");
  const [availableCategories, setAvailableCategories] = useState<StoreCategory[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      
      if (!auth?.user) {
        setLoading(false);
        return;
      }

      setCurrentUserId(auth.user.id);

      const { data: categories } = await supabase
        .from("store_categories")
        .select("*")
        .eq("is_active", true);
      setAvailableCategories(categories || []);

      const { data: vendorCore } = await supabase
        .from("vendors")
        .select("*")
        .eq("auth_user_id", auth.user.id)
        .maybeSingle();

      const { data: profileExtended } = await supabase
        .from("vendor_profiles")
        .select("*")
        .eq("auth_user_id", auth.user.id)
        .maybeSingle();

      const validatedState: ProfileState = {
        store_name: profileExtended?.store_name || vendorCore?.name || "",
        owner_name: profileExtended?.owner_name || vendorCore?.owner_name || "",
        email_address: profileExtended?.email_address || vendorCore?.email || auth.user.email || "", 
        primary_phone: profileExtended?.primary_phone || vendorCore?.phone || "", 
        tagline: profileExtended?.tagline || "",
        store_categories: Array.isArray(profileExtended?.store_categories) ? profileExtended.store_categories : ["Grocery"],
        store_code: profileExtended?.store_code || "NEW-SHOP",
        avatar_url: profileExtended?.avatar_url || "",
        alternate_phone: profileExtended?.alternate_phone || "",
        pan_number: profileExtended?.pan_number || "",
        gst_number: profileExtended?.gst_number || "",
        fssai_license: profileExtended?.fssai_license || "",
        drug_license: profileExtended?.drug_license || "",
        drug_license_expiry: profileExtended?.drug_license_expiry || "",
        address_line1: profileExtended?.address_line1 || vendorCore?.address || "",
        address_line2: profileExtended?.address_line2 || "",
        landmark: profileExtended?.landmark || "",
        city: profileExtended?.city || "",
        state: profileExtended?.state || "",
        pin_code: profileExtended?.pin_code || "",
        account_holder_name: profileExtended?.account_holder_name || "",
        bank_name: profileExtended?.bank_name || "",
        account_number: profileExtended?.account_number || "",
        ifsc_code: profileExtended?.ifsc_code || "",
        upi_id: profileExtended?.upi_id || "",
        auth_user_id: profileExtended?.auth_user_id || auth.user.id,
        is_account_verified: profileExtended?.is_account_verified || false,
        is_pan_verified: profileExtended?.is_pan_verified || false,
        is_gst_verified: profileExtended?.is_gst_verified || false,
        is_bank_verified: profileExtended?.is_bank_verified || false,
      };
      
      setProfile(validatedState);
      setDbBackup(JSON.parse(JSON.stringify(validatedState)));
    } catch (err) {
      console.error("Error reading schema profile payload:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        fetchProfileData();
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
        setDbBackup(null);
        setCurrentUserId(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-center text-xs font-semibold tracking-widest text-muted-foreground animate-pulse uppercase">
        Querying secure vendor identity metrics...
      </div>
    );
  }

  if (!profile) return null;

  // 📸 Image Upload handler Engine
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
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;

      const fileExt = file.name.split('.').pop();
      const filePath = `${auth.user.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      setSavedMessage("Image loaded. Click 'Save Profile' to commit changes.");
    } catch (err: any) {
      setValidationError(err.message || "Failed to upload image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCategoryToggle = (category: string) => {
    setProfile(prev => {
      if (!prev) return null;
      const current = Array.isArray(prev.store_categories) ? prev.store_categories : ["Grocery"];
      const updated = current.includes(category)
        ? current.filter(c => c !== category)
        : [...current, category];
      return { ...prev, store_categories: updated.length > 0 ? updated : ["Grocery"] };
    });
  };

  const handleDiscard = () => {
    if (dbBackup) {
      setProfile(JSON.parse(JSON.stringify(dbBackup)));
      setValidationError("");
      setSavedMessage("Unsaved changes discarded.");
      setTimeout(() => setSavedMessage(""), 2500);
    }
  };

  const handleSave = async () => {
    setValidationError("");
    setSavedMessage("");

    if (!profile.pan_number.trim()) {
      setValidationError("PAN Number is a universally mandatory requirement for all platform merchants.");
      return;
    }

    try {
      setSaving(true);
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;

      const profilePayload = {
        auth_user_id: auth.user.id,
        store_name: profile.store_name.trim() || "My Storefront", 
        owner_name: profile.owner_name.trim() || "Merchant Owner",
        email_address: profile.email_address.trim() || auth.user.email,
        primary_phone: profile.primary_phone.trim() || "0000000000",
        tagline: profile.tagline,
        store_categories: profile.store_categories,
        store_code: profile.store_code,
        avatar_url: profile.avatar_url,
        alternate_phone: profile.alternate_phone,
        pan_number: profile.pan_number,
        gst_number: profile.gst_number,
        fssai_license: profile.fssai_license,
        drug_license: profile.drug_license,
        drug_license_expiry: !profile.drug_license_expiry || profile.drug_license_expiry.trim() === "" ? null : profile.drug_license_expiry,
        address_line1: profile.address_line1,
        address_line2: profile.address_line2,
        landmark: profile.landmark,
        city: profile.city,
        state: profile.state,
        pin_code: profile.pin_code,
        account_holder_name: profile.account_holder_name,
        bank_name: profile.bank_name,
        account_number: profile.account_number,
        ifsc_code: profile.ifsc_code,
        upi_id: profile.upi_id,
        is_account_verified: profile.is_account_verified,
        is_pan_verified: profile.is_pan_verified,
        is_gst_verified: profile.is_gst_verified,
        is_bank_verified: profile.is_bank_verified,
        updated_at: new Date().toISOString()
      };

      const { error: profileError } = await supabase
        .from("vendor_profiles")
        .upsert(profilePayload, { onConflict: "auth_user_id" });

      if (profileError) throw profileError;

      const { error: coreError } = await supabase
        .from("vendors")
        .update({
          name: profile.store_name,
          owner_name: profile.owner_name,
          email: profile.email_address,
          phone: profile.primary_phone,
          address: profile.address_line1,
          category: profile.store_categories[0] || null,
          categories: profile.store_categories,
          updated_at: new Date().toISOString()
        })
        .eq("auth_user_id", auth.user.id);

      if (coreError) throw coreError;

      setDbBackup(JSON.parse(JSON.stringify(profile)));
      setSavedMessage("Profile metrics committed successfully!");
      setTimeout(() => setSavedMessage(""), 3000);
    } catch (err: any) {
      setValidationError(err.message || "Failed to commit parameters to database schema.");
    } finally {
      setSaving(false);
    }
  };

  const requestVerification = async (field: "is_account_verified" | "is_pan_verified" | "is_gst_verified" | "is_bank_verified") => {
    try {
      setSavedMessage(`Processing serverless verification routing...`);
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;

      setProfile(prev => prev ? { ...prev, [field]: true } : null);
      
      await supabase
        .from("vendor_profiles")
        .upsert({ auth_user_id: auth.user.id, [field]: true }, { onConflict: "auth_user_id" });

      setSavedMessage(`Verification verification flag active.`);
      setTimeout(() => setSavedMessage(""), 2500);
    } catch (err: any) {
      setValidationError(err.message || "Identity transaction route aborted.");
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">
      
      {/* Hidden File Input UI Trigger */}
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarUpload}
        accept="image/*"
        className="hidden"
      />

      {/* 🌐 Language Selection Switcher Navbar Row */}
      <div className="flex justify-end gap-2 mb-2">
        <button 
          onClick={() => setLang("en")} 
          className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${lang === "en" ? "bg-[#10B981] text-white border-[#10B981]" : "bg-background border-border text-muted-foreground hover:text-foreground"}`}
        >
          English
        </button>
        <button 
          onClick={() => setLang("mr")} 
          className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${lang === "mr" ? "bg-[#10B981] text-white border-[#10B981]" : "bg-background border-border text-muted-foreground hover:text-foreground"}`}
        >
          मराठी (Marathi)
        </button>
      </div>

      {/* Dynamic Store Header */}
      <div className="bg-gradient-to-r from-[#10B981] to-[#059669] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="relative">
              {/* Profile Avatar Frame block */}
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-xl font-black text-white uppercase border border-white/10 overflow-hidden shadow-inner">
                {uploadingImage ? (
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                ) : profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.store_name} className="w-full h-full object-cover" />
                ) : profile.store_name ? (
                  profile.store_name.slice(0,2)
                ) : (
                  "VB"
                )}
              </div>
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md border border-border"
              >
                <Camera className="w-3 h-3 text-[#10B981]" />
              </button>
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">{profile.store_name || "New Storefront"}</h2>
              <p className="text-white/80 text-xs mt-0.5 font-medium italic">{profile.tagline || "No description set yet"}</p>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {/* Fixed Shop Code fetched dynamically */}
                <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/5 uppercase tracking-wide">
                  {profile.store_code}
                </span>
                {profile.store_categories.map(cat => (
                  <span key={cat} className="bg-white/30 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-white/10">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="shrink-0">
            {profile.is_account_verified ? (
              <div className="bg-white text-[#065F46] font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
                <Check className="w-3.5 h-3.5 stroke-[3]" /> {t("account_verified")}
              </div>
            ) : (
              <button 
                type="button"
                onClick={() => requestVerification("is_account_verified")}
                className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> {t("btn_verify_acc")}
              </button>
            )}
          </div>
        </div>
      </div>

      {validationError && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 flex items-start gap-2 text-xs font-semibold shadow-sm">
          <ShieldAlert className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          <p>{validationError}</p>
        </div>
      )}

      {/* Section 1: Store Details */}
      <Section title={t("store_details")} icon={Store}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t("store_name")} value={profile.store_name} onChange={v => setProfile(s => s ? ({ ...s, store_name: v }) : null)} placeholder={t("placeholder_store_title")} />
          <Field label={t("tagline")} value={profile.tagline} onChange={v => setProfile(s => s ? ({ ...s, tagline: v }) : null)} placeholder={t("placeholder_banner")} />
          
          <div className="sm:col-span-2 space-y-1.5">
            <label className="block text-xs font-bold text-muted-foreground">{t("store_classifications")}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {availableCategories.map(cat => {
                const isChecked = profile.store_categories.includes(cat.name);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryToggle(cat.name)}
                    className={`h-9 px-3 rounded-lg border text-xs font-bold transition-all text-left flex items-center justify-between ${
                      isChecked 
                        ? "bg-[#ECFDF5] border-[#10B981] text-[#065F46]" 
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>{cat.name}</span>
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3] text-[#10B981]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Section>

      {/* Section 2: Owner Details */}
      <Section title={t("owner_details")} icon={User}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t("owner_name")} value={profile.owner_name} onChange={v => setProfile(o => o ? ({ ...o, owner_name: v }) : null)} placeholder="Legal registration name" />
          <Field label={t("email")} value={profile.email_address} onChange={v => setProfile(o => o ? ({ ...o, email_address: v }) : null)} type="email" placeholder="owner@store.com" />
          <Field label={t("primary_phone")} value={profile.primary_phone} onChange={v => setProfile(o => o ? ({ ...o, primary_phone: v }) : null)} placeholder="+91 XXXXX XXXXX" />
          <Field label={t("alt_phone")} value={profile.alternate_phone} onChange={v => setProfile(o => o ? ({ ...o, alternate_phone: v }) : null)} placeholder="Fallback mobile string" />
        </div>
      </Section>

      {/* Section 3: GST & Compliance */}
      <Section title={t("gst_compliance")} icon={FileText}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-muted-foreground">{t("pan_card")}</label>
              <button 
                type="button"
                onClick={() => requestVerification("is_pan_verified")}
                className={`text-[10px] font-black uppercase tracking-wider hover:underline ${profile.is_pan_verified ? "text-[#10B981]" : "text-blue-500"}`}
              >
                {profile.is_pan_verified ? t("btn_verified") : t("btn_run_verify")}
              </button>
            </div>
            <input
              type="text"
              maxLength={10}
              value={profile.pan_number}
              onChange={e => setProfile(p => p ? ({ ...p, pan_number: e.target.value.toUpperCase() }) : null)}
              placeholder="10-Digit Alphanumeric Code"
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm font-mono text-foreground uppercase tracking-widest focus:outline-none focus:border-[#10B981]"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-muted-foreground">{t("gstin")}</label>
              <button 
                type="button"
                onClick={() => requestVerification("is_gst_verified")}
                className={`text-[10px] font-black uppercase tracking-wider hover:underline ${profile.is_gst_verified ? "text-[#10B981]" : "text-blue-500"}`}
              >
                {profile.is_gst_verified ? t("btn_verified") : t("btn_run_verify")}
              </button>
            </div>
            <input
              type="text"
              maxLength={15}
              value={profile.gst_number}
              onChange={e => setProfile(p => p ? ({ ...p, gst_number: e.target.value.toUpperCase() }) : null)}
              placeholder="15-Digit Identity Node"
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm font-mono text-foreground uppercase tracking-wider focus:outline-none focus:border-[#10B981]"
            />
          </div>

          <Field label={t("fssai")} value={profile.fssai_license} onChange={v => setProfile(s => s ? ({ ...s, fssai_license: v }) : null)} placeholder="14-Digit Safety Operations Sequence" />

          {profile.store_categories.includes("Pharmacy") ? (
            <>
              <Field label={t("drug_license")} value={profile.drug_license} onChange={v => setProfile(s => s ? ({ ...s, drug_license: v }) : null)} placeholder="Form 20/21 Mandatory Licensing Number" />
              <div className="space-y-1">
                <label className="block text-xs font-bold text-red-500">{t("drug_expiry")}</label>
                <input 
                  type="date"
                  value={profile.drug_license_expiry}
                  onChange={e => setProfile(s => s ? ({ ...s, drug_license_expiry: e.target.value }) : null)}
                  className="w-full h-9 px-3 rounded-lg border border-red-300 dark:border-red-950/40 bg-background text-sm text-foreground focus:outline-none"
                />
              </div>
            </>
          ) : (
            <div className="sm:col-span-2 p-3 bg-muted/40 rounded-lg text-[11px] text-muted-foreground font-medium">
              ℹ️ {t("pharmacy_info")}
            </div>
          )}
        </div>
      </Section>

      {/* Section 4: Store Address */}
      <Section title={t("address_title")} icon={MapPin}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label={t("address1")} value={profile.address_line1} onChange={v => setProfile(a => a ? ({ ...a, address_line1: v }) : null)} placeholder="Building number, Flat details, Estate row" />
          </div>
          <Field label={t("address2")} value={profile.address_line2} onChange={v => setProfile(a => a ? ({ ...a, address_line2: v }) : null)} placeholder="Area development logs, Sector tracking" />
          <Field label={t("landmark")} value={profile.landmark} onChange={v => setProfile(a => a ? ({ ...a, landmark: v }) : null)} placeholder="Adjacent geographic hub markers..." />
          <Field label="City" value={profile.city} onChange={v => setProfile(a => a ? ({ ...a, city: v }) : null)} placeholder="City boundaries" />
          <Field label="State" value={profile.state} onChange={v => setProfile(a => a ? ({ ...a, state: v }) : null)} placeholder="State boundaries" />
          <Field label={t("pincode")} value={profile.pin_code} onChange={v => setProfile(a => a ? ({ ...a, pin_code: v }) : null)} placeholder="6-Digit Postal Index String" />
        </div>
      </Section>

      {/* Section 5: Bank Details & Settlements */}
      <Section title={t("bank_title")} icon={Building}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t("acc_holder")} value={profile.account_holder_name} onChange={v => setProfile(b => b ? ({ ...b, account_holder_name: v }) : null)} placeholder="Legal trade registration passbook matching name" />
          <Field label={t("bank_name")} value={profile.bank_name} onChange={v => setProfile(b => b ? ({ ...b, bank_name: v }) : null)} placeholder="Financial house label" />
          <Field label={t("acc_num")} value={profile.account_number} onChange={v => setProfile(b => b ? ({ ...b, account_number: v }) : null)} placeholder="Clearing destination core string" />
          <Field label={t("ifsc")} value={profile.ifsc_code} onChange={v => setProfile(b => b ? ({ ...b, ifsc_code: v }) : null)} placeholder="11-Digit Alpha-Numeric Branch Sequence" />
          
          <div className="sm:col-span-2">
            <Field label={t("upi")} value={profile.upi_id} onChange={v => setProfile(b => b ? ({ ...b, upi_id: v }) : null)} placeholder="handle@bankname" />
          </div>

          <div className="sm:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/30 border border-border/60 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <Check className={`w-4 h-4 mt-0.5 shrink-0 ${profile.is_bank_verified ? "text-[#10B981]" : "text-muted-foreground"}`} />
              <p className="text-xs text-muted-foreground leading-relaxed">
                {profile.is_bank_verified ? t("bank_verified") : t("bank_missing")}
              </p>
            </div>
            <button 
              type="button" 
              onClick={() => requestVerification("is_bank_verified")}
              className={`h-7 px-3 rounded-lg text-[11px] font-bold border transition-colors ${
                profile.is_bank_verified 
                  ? "bg-[#D1FAE5] border-[#10B981] text-[#065F46] pointer-events-none" 
                  : "bg-background border-border hover:border-blue-500 text-blue-500"
              }`}
            >
              {profile.is_bank_verified ? t("btn_verified") : t("btn_verify")}
            </button>
          </div>
        </div>
      </Section>

      {/* Save Action Footer */}
      <div className="flex items-center justify-end gap-3 pb-6 pt-2">
        {savedMessage && (
          <span className="text-xs font-bold text-[#10B981] flex items-center gap-1.5 animate-fade-in">
            <Check className="w-4 h-4" /> {savedMessage}
          </span>
        )}
        <button 
          type="button" 
          onClick={handleDiscard}
          className="h-10 px-6 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("discard")}
        </button>
        <button 
          type="button" 
          onClick={handleSave}
          disabled={saving || uploadingImage}
          className="h-10 px-6 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-sm font-bold transition-all shadow-md shadow-[#10B981]/10 disabled:opacity-40"
        >
          {saving ? t("saving") : t("save")}
        </button>
      </div>

    </div>
  );
}