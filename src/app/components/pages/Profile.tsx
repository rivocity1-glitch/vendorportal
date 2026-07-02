import React, { useState, useEffect, useRef } from "react";
import { Store, User, FileText, MapPin, Building, Check, Camera, ShieldAlert, RefreshCw, Loader2, Save, LifeBuoy, Mail, Phone, Send, Image } from "lucide-react";
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
  vendor_id: string;
  status: string; 
}

interface StoreCategory {
  id: string;
  name: string;
}

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
    discard: "Discard Changes",
    save: "Save Profile",
    saving: "Saving Changes...",
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
    discard: "बदल रद्द करा",
    save: "प्रोफाइल जतन करा",
    saving: "जतन होत आहे...",
    placeholder_store_title: "तुमच्या दुकानाचे व्यावसायिक नाव",
    placeholder_banner: "दुकानाचा संक्षिप्त संदेश किंवा माहिती"
  }
};

const approvalBadgeConfig: Record<string, { bg: string; label: string }> = {
  approved: { bg: "bg-white text-[#065F46]", label: "Account Verified" },
  pending: { bg: "bg-[#FEF3C7] text-[#92400E]", label: "Pending Approval" },
  suspended: { bg: "bg-[#FEE2E2] text-[#991B1B]", label: "Rejected" },
  rejected: { bg: "bg-[#FEE2E2] text-[#991B1B]", label: "Rejected" }
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
      value={value || ""}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/10 transition-all disabled:opacity-60"
    />
  </div>
);

export function Profile() {
  const [lang, setLang] = useState<"en" | "mr">("en");
  const t = (key: keyof typeof translations["en"]) => translations[lang][key] || translations["en"][key];

  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [dbBackup, setDbBackup] = useState<ProfileState | null>(null); 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [validationError, setValidationError] = useState("");
  const [availableCategories, setAvailableCategories] = useState<StoreCategory[]>([]);
  
  // Support & Help Ticket Form Local States
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketType, setTicketType] = useState("Technical Issue");
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketDesc, setTicketDesc] = useState("");
  const [ticketPriority, setTicketPriority] = useState("medium");
  const [ticketFile, setTicketFile] = useState<File | null>(null);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketSuccessMsg, setTicketSuccessMsg] = useState("");
  const [ticketErrorMsg, setTicketErrorMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      
      if (!auth?.user) {
        setLoading(false);
        return;
      }

      const { data: categories } = await supabase
        .from("product_categories")
        .select("id, name");
      setAvailableCategories(categories || []);

      const { data: vendorCore, error: coreErr } = await supabase
        .from("vendors")
        .select("*")
        .eq("auth_user_id", auth.user.id)
        .maybeSingle();

      console.log("Loaded raw vendor data payload from source:", vendorCore, coreErr);

      if (!vendorCore) {
        setLoading(false);
        return;
      }

      const { data: profileExtended, error: profileErr } = await supabase
        .from("vendor_profiles")
        .select("*")
        .eq("vendor_id", vendorCore.id)
        .maybeSingle();

      console.log("Loaded raw profile data details from source:", profileExtended, profileErr);

      const parsedCategories = profileExtended?.categories 
        ? (Array.isArray(profileExtended.categories) ? profileExtended.categories : [profileExtended.categories])
        : (vendorCore.categories ? (Array.isArray(vendorCore.categories) ? vendorCore.categories : [vendorCore.categories]) : ["Grocery"]);

      const validatedState: ProfileState = {
        store_name: vendorCore.shop_name || "",
        owner_name: vendorCore.owner_name || "",
        email_address: vendorCore.email || auth.user.email || "", 
        primary_phone: vendorCore.phone || "", 
        tagline: profileExtended?.tagline || "",
        store_categories: parsedCategories,
        store_code: vendorCore.shop_code || "NEW-SHOP",
        avatar_url: profileExtended?.avatar_url || "",
        alternate_phone: "", 
        pan_number: profileExtended?.pan_number || "",
        gst_number: profileExtended?.gst_number || "",
        fssai_license: profileExtended?.fssai_license || "",
        drug_license: profileExtended?.drug_license || "",
        drug_license_expiry: profileExtended?.drug_license_expiry || "",
        address_line1: profileExtended?.address_line1 || "",
        address_line2: profileExtended?.address_line2 || "",
        landmark: "", 
        city: profileExtended?.city || "",
        state: profileExtended?.state || "",
        pin_code: profileExtended?.pin_code || "",
        account_holder_name: profileExtended?.account_holder_name || "",
        bank_name: profileExtended?.bank_name || "",
        account_number: profileExtended?.account_number || "",
        ifsc_code: profileExtended?.ifsc_code || "",
        upi_id: profileExtended?.upi_id || "",
        vendor_id: vendorCore.id,
        status: vendorCore.status?.toLowerCase() || "pending"
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
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-center text-xs font-semibold tracking-widest text-muted-foreground animate-pulse uppercase">
        Querying secure vendor identity metrics...
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

    if (!profile.store_name.trim() || !profile.owner_name.trim() || !profile.primary_phone.trim()) {
      setValidationError("Store Name, Owner Name, and Primary Phone are strict requirements.");
      return;
    }

    try {
      setSaving(true);

      let primaryCategoryId: string | null = null;
      const primaryCategoryName = profile.store_categories[0];

      if (primaryCategoryName) {
        const { data: matchedCategory, error: catFetchError } = await supabase
          .from("product_categories")
          .select("id")
          .eq("name", primaryCategoryName)
          .maybeSingle();

        if (catFetchError) {
          console.error("Warning: Exception encountered resolving product mapping reference:", catFetchError);
        }
        if (matchedCategory) {
          primaryCategoryId = matchedCategory.id;
        }
      }

      const profilePayload = {
        vendor_id: profile.vendor_id,
        tagline: profile.tagline,
        categories: profile.store_categories,
        avatar_url: profile.avatar_url,
        pan_number: profile.pan_number,
        gst_number: profile.gst_number,
        fssai_license: profile.fssai_license,
        drug_license: profile.drug_license,
        drug_license_expiry: !profile.drug_license_expiry || profile.drug_license_expiry.trim() === "" ? null : profile.drug_license_expiry,
        address_line1: profile.address_line1,
        address_line2: profile.address_line2,
        city: profile.city,
        state: profile.state,
        pin_code: profile.pin_code,
        account_holder_name: profile.account_holder_name,
        bank_name: profile.bank_name,
        account_number: profile.account_number,
        ifsc_code: profile.ifsc_code,
        upi_id: profile.upi_id,
        updated_at: new Date().toISOString()
      };

      const { error: profileError } = await supabase
        .from("vendor_profiles")
        .upsert(profilePayload, { onConflict: "vendor_id" });

      if (profileError) throw profileError;

      const { error: coreError } = await supabase
        .from("vendors")
        .update({
          shop_name: profile.store_name,
          owner_name: profile.owner_name,
          email: profile.email_address,
          phone: profile.primary_phone,
          category_id: primaryCategoryId, 
          updated_at: new Date().toISOString()
        })
        .eq("id", profile.vendor_id);

      if (coreError) throw coreError;

      setSavedMessage("Store operational updates saved successfully!");
      setDbBackup(JSON.parse(JSON.stringify(profile)));
      setTimeout(() => setSavedMessage(""), 3000);
    } catch (err: any) {
      console.error("Database update failure:", err);
      setValidationError(err.message || "Failed to apply profile parameter changes.");
    } finally {
      setSaving(false);
    }
  };

  const contactAdminWhatsApp = () => {
    const mobileNo = "919021404487";
    const textContent = encodeURIComponent(`Hello Admin, I need help with my store.\n\nStore Name: ${profile.store_name}\nVendor ID: ${profile.vendor_id}`);
    window.open(`https://wa.me/${mobileNo}?text=${textContent}`, "_blank");
  };

  const handleSupportTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTicketErrorMsg("");
    setTicketSuccessMsg("");

    if (!ticketTitle.trim() || !ticketDesc.trim()) {
      setTicketErrorMsg("Please configure a Ticket Title and Description text string.");
      return;
    }

    try {
      setSubmittingTicket(true);
      let screenshotUrl = "";

      if (ticketFile) {
        const fileExt = ticketFile.name.split('.').pop();
        const filePath = `${profile.vendor_id}/ticket-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("ticket-attachments")
          .upload(filePath, ticketFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("ticket-attachments")
          .getPublicUrl(filePath);

        screenshotUrl = publicUrl;
      }

      const ticketPayload = {
        vendor_id: profile.vendor_id,
        issue_type: ticketType,
        title: ticketTitle,
        description: ticketDesc,
        priority: ticketPriority,
        screenshot_url: screenshotUrl,
        status: "open",
        created_at: new Date().toISOString()
      };

      const { error: ticketError } = await supabase
        .from("vendor_support_tickets")
        .insert(ticketPayload);

      if (ticketError) throw ticketError;

      setTicketSuccessMsg("Your support request ticket has been saved successfully!");
      setTicketTitle("");
      setTicketDesc("");
      setTicketFile(null);
      if (screenshotInputRef.current) screenshotInputRef.current.value = "";
      setTimeout(() => setShowTicketForm(false), 2500);
    } catch (err: any) {
      console.error("Support ticket save exception error:", err);
      setTicketErrorMsg(err.message || "Failed to finalize ticket request log entry.");
    } finally {
      setSubmittingTicket(false);
    }
  };

  const currentBadge = approvalBadgeConfig[profile.status] || approvalBadgeConfig.pending;

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">
      
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarUpload}
        accept="image/*"
        className="hidden"
      />

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

      <div className="bg-gradient-to-r from-[#10B981] to-[#059669] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="relative">
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
            <div className={`font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm ${currentBadge.bg}`}>
              {profile.status === "approved" && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              {profile.status === "pending" && <RefreshCw className="w-3 h-3 animate-spin" />}
              {(profile.status === "suspended" || profile.status === "rejected") && <ShieldAlert className="w-3.5 h-3.5" />}
              {currentBadge.label}
            </div>
          </div>
        </div>
      </div>

      {validationError && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 flex items-start gap-2 text-xs font-semibold shadow-sm">
          <ShieldAlert className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          <p>{validationError}</p>
        </div>
      )}

      {savedMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-start gap-2 text-xs font-semibold shadow-sm">
          <Check className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          <p>{savedMessage}</p>
        </div>
      )}

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
                        ? "bg-[#ECFDF5] border-[#10B981] text-[#065F46] ring-2 ring-[#10B981]/10 dark:bg-[#10B981]/10"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Section>

      <Section title={t("owner_details")} icon={User}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t("owner_name")} value={profile.owner_name} onChange={v => setProfile(s => s ? ({ ...s, owner_name: v }) : null)} />
          <Field label={t("email")} value={profile.email_address} onChange={v => setProfile(s => s ? ({ ...s, email_address: v }) : null)} disabled />
          <Field label={t("primary_phone")} value={profile.primary_phone} onChange={v => setProfile(s => s ? ({ ...s, primary_phone: v }) : null)} />
          <Field label={t("alt_phone")} value={profile.alternate_phone} onChange={v => setProfile(s => s ? ({ ...s, alternate_phone: v }) : null)} />
        </div>
      </Section>

      <Section title={t("gst_compliance")} icon={FileText}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t("pan_card")} value={profile.pan_number} onChange={v => setProfile(s => s ? ({ ...s, pan_number: v }) : null)} />
          <Field label={t("gstin")} value={profile.gst_number} onChange={v => setProfile(s => s ? ({ ...s, gst_number: v }) : null)} />
          <Field label={t("fssai")} value={profile.fssai_license} onChange={v => setProfile(s => s ? ({ ...s, fssai_license: v }) : null)} />
          <div className="grid grid-cols-2 gap-2">
            <Field label={t("drug_license")} value={profile.drug_license} onChange={v => setProfile(s => s ? ({ ...s, drug_license: v }) : null)} />
            <Field label={t("drug_expiry")} value={profile.drug_license_expiry} onChange={v => setProfile(s => s ? ({ ...s, drug_license_expiry: v }) : null)} type="date" />
          </div>
        </div>
      </Section>

      <Section title={t("address_title")} icon={MapPin}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t("address1")} value={profile.address_line1} onChange={v => setProfile(s => s ? ({ ...s, address_line1: v }) : null)} />
          <Field label={t("address2")} value={profile.address_line2} onChange={v => setProfile(s => s ? ({ ...s, address_line2: v }) : null)} />
          <Field label={t("landmark")} value={profile.landmark} onChange={v => setProfile(s => s ? ({ ...s, landmark: v }) : null)} />
          <Field label={t("city")} value={profile.city} onChange={v => setProfile(s => s ? ({ ...s, city: v }) : null)} />
          <Field label={t("state")} value={profile.state} onChange={v => setProfile(s => s ? ({ ...s, state: v }) : null)} />
          <Field label={t("pincode")} value={profile.pin_code} onChange={v => setProfile(s => s ? ({ ...s, pin_code: v }) : null)} />
        </div>
      </Section>

      <Section title={t("bank_title")} icon={Building}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t("acc_holder")} value={profile.account_holder_name} onChange={v => setProfile(s => s ? ({ ...s, account_holder_name: v }) : null)} placeholder="Legal trade registration passbook matching name" />
          <Field label={t("bank_name")} value={profile.bank_name} onChange={v => setProfile(s => s ? ({ ...s, bank_name: v }) : null)} placeholder="Financial house label" />
          <Field label={t("acc_num")} value={profile.account_number} onChange={v => setProfile(s => s ? ({ ...s, account_number: v }) : null)} placeholder="Clearing destination core string" />
          <Field label={t("ifsc")} value={profile.ifsc_code} onChange={v => setProfile(s => s ? ({ ...s, ifsc_code: v }) : null)} placeholder="11-Digit Alpha-Numeric Branch Sequence" />
          <div className="sm:col-span-2">
            <Field label={t("upi")} value={profile.upi_id} onChange={v => setProfile(s => s ? ({ ...s, upi_id: v }) : null)} placeholder="handle@bankname" />
          </div>
        </div>
      </Section>

      {/* Replaced Support & Help Section */}
      <Section title="Support & Help" icon={LifeBuoy}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Have questions or encountered an operational bottleneck? Reach out to our direct escalation nodes for support.
            </p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 text-sm text-foreground">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center border border-border">
                  <Mail className="w-4 h-4 text-[#10B981]" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Support Email</span>
                  <a href="mailto:rivo.cityhelp1@gmail.com" className="font-semibold text-xs hover:underline text-foreground">rivo.cityhelp1@gmail.com</a>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-foreground">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center border border-border">
                  <Phone className="w-4 h-4 text-[#10B981]" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Vendor Helpline</span>
                  <a href="tel:+919021404487" className="font-semibold text-xs hover:underline text-foreground">+91 90214 04487</a>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-2">
              <button
                type="button"
                onClick={contactAdminWhatsApp}
                className="h-9 px-4 rounded-lg border border-border bg-background text-xs font-bold text-foreground hover:bg-muted transition-colors flex items-center gap-2 shadow-sm"
              >
                <span>Contact Admin</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowTicketForm(!showTicketForm);
                  setTicketSuccessMsg("");
                  setTicketErrorMsg("");
                }}
                className={`h-9 px-4 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shadow-sm border ${
                  showTicketForm 
                    ? "bg-muted border-border text-foreground" 
                    : "bg-[#10B981]/10 border-[#10B981]/20 text-[#065F46] hover:bg-[#10B981]/20"
                }`}
              >
                <span>Report Issue</span>
              </button>
            </div>
          </div>

          {/* Inline Integrated Support Ticket Creation Panel */}
          {showTicketForm && (
            <div className="bg-muted/40 border border-border/60 rounded-xl p-4 space-y-3 shadow-inner">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border/40 pb-1.5">
                Submit Support Ticket
              </h4>
              
              <form onSubmit={handleSupportTicketSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase">Issue Type</label>
                    <select
                      value={ticketType}
                      onChange={e => setTicketType(e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:outline-none focus:border-[#10B981]"
                    >
                      <option value="Technical Issue">Technical Issue</option>
                      <option value="Payout & Billing">Payout & Billing</option>
                      <option value="Inventory Sync">Inventory Sync</option>
                      <option value="Account Settings">Account Settings</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase">Priority</label>
                    <select
                      value={ticketPriority}
                      onChange={e => setTicketPriority(e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:outline-none focus:border-[#10B981]"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase">Title</label>
                  <input
                    type="text"
                    value={ticketTitle}
                    onChange={e => setTicketTitle(e.target.value)}
                    placeholder="Brief summary of the query"
                    className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-[#10B981]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase">Description</label>
                  <textarea
                    rows={3}
                    value={ticketDesc}
                    onChange={e => setTicketDesc(e.target.value)}
                    placeholder="Provide granular technical logs or behavior context..."
                    className="w-full p-2 rounded-lg border border-border bg-background text-xs text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-[#10B981] resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase">Screenshot Attachment</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={screenshotInputRef}
                      accept="image/*"
                      onChange={e => setTicketFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:font-bold file:bg-background file:text-foreground file:cursor-pointer hover:file:bg-muted"
                    />
                    <Image className="w-4 h-4 shrink-0 text-muted-foreground/80" />
                  </div>
                </div>

                {ticketErrorMsg && (
                  <p className="text-[11px] font-semibold text-red-600">{ticketErrorMsg}</p>
                )}
                {ticketSuccessMsg && (
                  <p className="text-[11px] font-semibold text-emerald-600">{ticketSuccessMsg}</p>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={submittingTicket}
                    className="h-8 px-4 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {submittingTicket ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Submit Ticket</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </Section>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleDiscard}
          disabled={saving}
          className="h-10 px-5 text-sm font-semibold rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        >
          {t("discard")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="h-10 px-6 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-sm font-bold shadow-md flex items-center gap-1.5 transition-all disabled:opacity-40"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t("saving")}</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{t("save")}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}