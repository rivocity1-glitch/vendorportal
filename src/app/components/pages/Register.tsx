import React, { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, Zap, CheckCircle2, ShieldAlert, Store, User, Lock, MapPin, Phone, ArrowRight, Building2, Globe, ShieldCheck } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { VendorTerms } from "../legal/VendorTerms";

interface RegisterProps {
  onNavigateToLogin: () => void;
}

export function Register({ onNavigateToLogin }: RegisterProps) {
  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [drugLicenseNumber1, setDrugLicenseNumber1] = useState("");
  const [drugLicenseNumber2, setDrugLicenseNumber2] = useState("");
  const [drugLicenseNumber3, setDrugLicenseNumber3] = useState("");
  const [drugLicenseNumber4, setDrugLicenseNumber4] = useState("");
  const [drugLicenseNumber5, setDrugLicenseNumber5] = useState("");
  const [drugLicenseExpiry, setDrugLicenseExpiry] = useState("");

  const [categories, setCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPremiumCard, setShowPremiumCard] = useState(false);

  // Mandatory legal process state variables
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [legalCompleted, setLegalCompleted] = useState(false);

  const shopNameRef = useRef<HTMLInputElement>(null);
  const ownerNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const addressRef = useRef<HTMLTextAreaElement>(null);
  const drugLicenseNumber1Ref = useRef<HTMLInputElement>(null);
  const drugLicenseExpiryRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  const [savedShopName, setSavedShopName] = useState("");
  const [savedPhone, setSavedPhone] = useState("");
  const [savedLicenseNumbers, setSavedLicenseNumbers] = useState("");

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setCategoriesLoading(true);
    const { data, error } = await supabase
      .from("product_categories")
      .select("id,name,requires_drug_license")
      .eq("status", "active")
      .order("display_order");

    if (!error && data) {
      setCategories(data);
    }
    setCategoriesLoading(false);
  };

  const selectedCategoryObj = categories.find((cat) => String(cat.id) === String(category));
  const requiresDrugLicense = selectedCategoryObj ? !!selectedCategoryObj.requires_drug_license : false;

  useEffect(() => {
    if (!requiresDrugLicense) {
      setDrugLicenseNumber1("");
      setDrugLicenseNumber2("");
      setDrugLicenseNumber3("");
      setDrugLicenseNumber4("");
      setDrugLicenseNumber5("");
      setDrugLicenseExpiry("");
    }
  }, [category, requiresDrugLicense]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setSuccessMessage("");
    setShowPremiumCard(false);

    if (!legalCompleted) {
      setError("Legal acknowledgement verification sequence required.");
      return;
    }

    const triggerValidationError = (message: string, inputRef: React.RefObject<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>) => {
      setError(message);
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    if (!shopName) return triggerValidationError("Please enter your Shop Name.", shopNameRef);
    if (!ownerName) return triggerValidationError("Please enter the Owner Name.", ownerNameRef);
    if (!email) return triggerValidationError("Please enter your Email Address.", emailRef);
    if (!phone) return triggerValidationError("Please enter your Phone Number.", phoneRef);
    if (!category) return triggerValidationError("Please select a Store Category.", categoryRef);
    if (!address) return triggerValidationError("Please enter your Physical Store Address.", addressRef);

    if (requiresDrugLicense) {
      if (!drugLicenseNumber1.trim()) {
        return triggerValidationError("Primary Drug Licence Number is required for this category.", drugLicenseNumber1Ref);
      }
      if (!drugLicenseExpiry) {
        return triggerValidationError("Drug Licence Expiry Date is required for this category.", drugLicenseExpiryRef);
      }
    }

    if (!password) return triggerValidationError("Please create a password.", passwordRef);
    if (!confirmPassword) return triggerValidationError("Please confirm your password.", confirmPasswordRef);

    if (password !== confirmPassword) {
      return triggerValidationError("Passwords do not match. Please re-enter.", confirmPasswordRef);
    }

    if (password.length < 6) {
      return triggerValidationError("Password must be at least 6 characters long.", passwordRef);
    }

    setLoading(true);

    const licenseNumbersArray = [
      drugLicenseNumber1.trim(),
      drugLicenseNumber2.trim(),
      drugLicenseNumber3.trim(),
      drugLicenseNumber4.trim(),
      drugLicenseNumber5.trim()
    ].filter(Boolean);
    const combinedLicenseNumbers = licenseNumbersArray.join(", ");

    const currentShopName = shopName;
    const currentPhone = phone;

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: undefined }
      });

      if (authError) throw new Error(`Authentication setup failed: ${authError.message}`);
      if (!authData?.user) throw new Error("Could not initialize authentication profile records.");

      const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
      const generatedShopCode = `RIVO-${uniqueSuffix}`;

      const { data: vendorData, error: vendorError } = await supabase
        .from("vendors")
        .insert({
          auth_user_id: authData.user.id,
          shop_name: shopName,
          owner_name: ownerName,
          email: email.trim(),
          phone,
          shop_code: generatedShopCode,
          status: "pending",
          category_id: category
        })
        .select()
        .single();

      if (vendorError) throw new Error(`Core vendor record provisioning failed: ${vendorError.message}`);

      const { error: profileError } = await supabase
        .from("vendor_profiles")
        .insert({
          vendor_id: vendorData.id,
          categories: [category],
          address_line1: address,
          store_status: "open",
          drug_license: requiresDrugLicense ? combinedLicenseNumbers : null,
          drug_license_expiry: requiresDrugLicense ? drugLicenseExpiry : null
        });

      if (profileError) throw new Error(`Secondary extended profile instantiation failed: ${profileError.message}`);

      setSavedShopName(currentShopName);
      setSavedPhone(currentPhone);
      setSavedLicenseNumbers(combinedLicenseNumbers);
      setShowPremiumCard(requiresDrugLicense);

      setSuccessMessage(`Registration submitted. Your assigned login identifier code is ${generatedShopCode}. Account profile is currently awaiting admin approval.`);
      
      setShopName("");
      setOwnerName("");
      setEmail("");
      setPhone("");
      setAddress("");
      setCategory("");
      setPassword("");
      setConfirmPassword("");
      setDrugLicenseNumber1("");
      setDrugLicenseNumber2("");
      setDrugLicenseNumber3("");
      setDrugLicenseNumber4("");
      setDrugLicenseNumber5("");
      setDrugLicenseExpiry("");
    } catch (err: any) {
      setError(err.message || "An unexpected system registration variance occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white grid grid-cols-1 lg:grid-cols-12 overflow-x-hidden selection:bg-[#2ECC71]/20 selection:text-[#0F172A]">
      
      {/* ================= LEFT SIDEBOARD: PREMIUM OVERVIEW ================= */}
      <div className="lg:col-span-4 relative bg-[#0F172A] p-8 md:p-12 hidden lg:flex flex-col justify-between text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
        
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2ECC71] flex items-center justify-center shadow-lg shadow-[#2ECC71]/20 border border-[#2ECC71]/10">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight">Rivo.City</span>
            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold leading-none mt-0.5">Vendor Portal</p>
          </div>
        </div>

        <div className="relative space-y-8 my-auto max-w-sm">
          <div className="space-y-3">
            <h2 className="text-3xl font-black tracking-tight leading-tight">Scale your store's reach within your city.</h2>
            <p className="text-neutral-400 font-light text-sm leading-relaxed">Join a highly responsive, high-growth merchant community serving customers across retail, grocery, and medicine sectors.</p>
          </div>

          <div className="space-y-5 pt-4">
            {[
              { icon: Building2, text: "Centralized control of orders, inventory updates, and business metrics." },
              { icon: Globe, text: "Expand direct retail matching interfaces natively across town coordinates." },
              { icon: ShieldCheck, text: "Transparent payouts processed seamlessly on custom automated cycles." }
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-[#2ECC71]">
                  <item.icon className="w-4 h-4" />
                </div>
                <p className="text-xs text-neutral-300 font-light leading-relaxed pt-0.5">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-[11px] text-neutral-500 font-light">
          Everything Nearby. Delivered Fast. &middot; Rivo.City &copy; 2026
        </p>
      </div>

      {/* ================= RIGHT SIDEBOARD: COMPREHENSIVE FULL-PAGE FORM ================= */}
      <div className="lg:col-span-8 flex flex-col justify-between min-h-screen bg-white">
        
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between lg:hidden bg-neutral-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2ECC71] flex items-center justify-center text-white shadow-sm">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-lg font-black tracking-tight text-[#0F172A]">Rivo.City</span>
          </div>
          <button onClick={onNavigateToLogin} className="text-xs font-bold uppercase tracking-wider text-[#2ECC71] hover:underline cursor-pointer">
            Sign In
          </button>
        </div>

        <div className="flex-1 w-full max-w-2xl mx-auto px-6 md:px-12 py-12 flex flex-col justify-center">
          
          {successMessage ? (
            <div className="text-center py-8 space-y-6 max-w-md mx-auto">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-[#2ECC71] border border-emerald-100 shadow-2xs">
                <CheckCircle2 className="w-8 h-8 stroke-[2]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-[#0F172A] tracking-tight">Application Received!</h2>
                <p className="text-sm font-light text-neutral-500 leading-relaxed">{successMessage}</p>
              </div>

              {showPremiumCard && (
                <div className="text-left border border-neutral-200 rounded-2xl p-6 bg-neutral-50/60 shadow-3xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] border-b border-neutral-200 pb-2.5">
                    Licence Verification Required
                  </h3>
                  <p className="text-xs font-light text-neutral-500 leading-relaxed">
                    Please transmit clear photo metrics or scans of your certified Drug Licence files to our primary WhatsApp operations pipeline for manual validation context.
                  </p>
                  
                  <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-neutral-400 font-light">Shop Name:</span> <span className="font-semibold text-[#0F172A]">{savedShopName}</span></div>
                    <div className="flex justify-between"><span className="text-neutral-400 font-light">Mobile:</span> <span className="font-semibold text-[#0F172A]">{savedPhone}</span></div>
                    <div className="flex justify-between items-start"><span className="text-neutral-400 font-light shrink-0 mr-4">Licences:</span> <span className="font-semibold text-[#0F172A] text-right break-words max-w-[280px]">{savedLicenseNumbers}</span></div>
                  </div>
                  
                  <p className="text-[11px] text-neutral-400 italic">
                    Your account strategy node changes to Active instantly upon team review.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={onNavigateToLogin}
                className="w-full h-11 rounded-xl bg-[#2ECC71] hover:bg-[#27AE60] text-white font-semibold text-sm transition-all shadow-md shadow-[#2ECC71]/10 active:scale-[0.99] cursor-pointer"
              >
                Go to Login Screen
              </button>
            </div>
          ) : (
            <>
              <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">Create Vendor Account</h1>
                  <p className="text-sm text-neutral-500 font-light mt-1">Register your retail location onto the Rivo.City platform network</p>
                </div>
                <button 
                  type="button" 
                  onClick={onNavigateToLogin} 
                  className="hidden lg:inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-[#2ECC71] transition-colors cursor-pointer"
                >
                  Already registered? <span className="text-[#2ECC71]">Sign In</span> <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <form onSubmit={handleRegister} className="space-y-8">
                
                {/* STAGE 1: CORE BRAND IDENTIFIERS */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-100 pb-2">
                    <Store className="w-4 h-4 text-neutral-400" /> <span>Store Overview</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide mb-2">Shop Name</label>
                      <input
                        ref={shopNameRef}
                        type="text"
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        placeholder="e.g. Fresh Grocery Mart"
                        className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 bg-neutral-50/30 text-[#0F172A] placeholder-neutral-400 text-sm focus:outline-none focus:bg-white focus:border-[#2ECC71] focus:ring-4 focus:ring-[#2ECC71]/10 transition-all duration-150"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide mb-2">Owner Name</label>
                      <input
                        ref={ownerNameRef}
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 bg-neutral-50/30 text-[#0F172A] placeholder-neutral-400 text-sm focus:outline-none focus:bg-white focus:border-[#2ECC71] focus:ring-4 focus:ring-[#2ECC71]/10 transition-all duration-150"
                      />
                    </div>
                  </div>
                </div>

                {/* STAGE 2: CONTACT METRICS */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-100 pb-2">
                    <User className="w-4 h-4 text-neutral-400" /> <span>Communications & Routing</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide mb-2">Email Address</label>
                      <input
                        ref={emailRef}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="owner@store.com"
                        className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 bg-neutral-50/30 text-[#0F172A] placeholder-neutral-400 text-sm focus:outline-none focus:bg-white focus:border-[#2ECC71] focus:ring-4 focus:ring-[#2ECC71]/10 transition-all duration-150"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide mb-2">Phone Number</label>
                      <input
                        ref={phoneRef}
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 bg-neutral-50/30 text-[#0F172A] placeholder-neutral-400 text-sm focus:outline-none focus:bg-white focus:border-[#2ECC71] focus:ring-4 focus:ring-[#2ECC71]/10 transition-all duration-150"
                      />
                    </div>
                  </div>
                </div>

                {/* STAGE 3: INDUSTRY SECTOR CLASSIFICATION */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide mb-2">
                      Store Category {categoriesLoading && <span className="text-[10px] text-neutral-400 normal-case ml-2 animate-pulse">(Syncing categories...)</span>}
                    </label>
                    <div className="relative">
                      <select
                        ref={categoryRef}
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 bg-neutral-50/30 text-[#0F172A] text-sm focus:outline-none focus:bg-white focus:border-[#2ECC71] focus:ring-4 focus:ring-[#2ECC71]/10 transition-all duration-150 appearance-none cursor-pointer"
                        style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '16px' }}
                      >
                        <option value="" disabled>Select store category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* STAGE 4: DYNAMIC COMPLIANCE FIELDS */}
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${requiresDrugLicense ? "max-h-[720px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"}`}>
                  <div className="border border-neutral-200 bg-neutral-50/50 rounded-2xl p-6 space-y-5 shadow-3xs">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-3 bg-[#2ECC71] rounded-sm" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">Drug Licence Compliance Documentation</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { val: drugLicenseNumber1, set: setDrugLicenseNumber1, ref: drugLicenseNumber1Ref, lbl: "Drug Licence 1 *", ph: "Primary Licence Number Required" },
                        { val: drugLicenseNumber2, set: setDrugLicenseNumber2, ref: null, lbl: "Drug Licence 2", ph: "Optional Licence String" },
                        { val: drugLicenseNumber3, set: setDrugLicenseNumber3, ref: null, lbl: "Drug Licence 3", ph: "Optional Licence String" },
                        { val: drugLicenseNumber4, set: setDrugLicenseNumber4, ref: null, lbl: "Drug Licence 4", ph: "Optional Licence String" },
                        { val: drugLicenseNumber5, set: setDrugLicenseNumber5, ref: null, lbl: "Drug Licence 5", ph: "Optional Licence String" }
                      ].map((field, index) => (
                        <div key={index} className={index === 0 ? "sm:col-span-2" : ""}>
                          <label className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wide mb-1.5">{field.lbl}</label>
                          <input
                            ref={field.ref}
                            type="text"
                            value={field.val}
                            onChange={(e) => field.set(e.target.value)}
                            placeholder={field.ph}
                            className="w-full h-10 px-3.5 rounded-xl border border-neutral-200 bg-white text-[#0F172A] placeholder-neutral-400 text-sm focus:outline-none focus:border-[#2ECC71] focus:ring-4 focus:ring-[#2ECC71]/10 transition-all duration-150"
                          />
                        </div>
                      ))}

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wide mb-1.5">Drug Licence Expiry Date *</label>
                        <input
                          ref={drugLicenseExpiryRef}
                          type="date"
                          value={drugLicenseExpiry}
                          onChange={(e) => setDrugLicenseExpiry(e.target.value)}
                          className="w-full h-10 px-3.5 rounded-xl border border-neutral-200 bg-white text-[#0F172A] text-sm focus:outline-none focus:border-[#2ECC71] focus:ring-4 focus:ring-[#2ECC71]/10 transition-all duration-150 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* STAGE 5: LOCATION SETTINGS */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-100 pb-2">
                    <MapPin className="w-4 h-4 text-neutral-400" /> <span>Physical Fulfillment Location</span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide mb-2">Physical Store Address</label>
                    <textarea
                      ref={addressRef}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Provide full shop layout address details"
                      rows={3}
                      className="w-full p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/30 text-[#0F172A] placeholder-neutral-400 text-sm focus:outline-none focus:bg-white focus:border-[#2ECC71] focus:ring-4 focus:ring-[#2ECC71]/10 transition-all duration-150 resize-none h-24"
                    />
                  </div>
                </div>

                {/* STAGE 6: ACCESS SYSTEM SECURITY */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-100 pb-2">
                    <Lock className="w-4 h-4 text-neutral-400" /> <span>Access Credentials</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide mb-2">Password</label>
                      <div className="relative">
                        <input
                          ref={passwordRef}
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create complex password"
                          className="w-full h-11 px-3.5 pr-11 rounded-xl border border-neutral-200 bg-neutral-50/30 text-[#0F172A] placeholder-neutral-400 text-sm focus:outline-none focus:bg-white focus:border-[#2ECC71] focus:ring-4 focus:ring-[#2ECC71]/10 transition-all duration-150"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide mb-2">Confirm Password</label>
                      <div className="relative">
                        <input
                          ref={confirmPasswordRef}
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter password string"
                          className="w-full h-11 px-3.5 pr-11 rounded-xl border border-neutral-200 bg-neutral-50/30 text-[#0F172A] placeholder-neutral-400 text-sm focus:outline-none focus:bg-white focus:border-[#2ECC71] focus:ring-4 focus:ring-[#2ECC71]/10 transition-all duration-150"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="text-xs text-red-600 bg-red-50/50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
                    <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span className="font-medium leading-relaxed">{error}</span>
                  </div>
                )}

                {/* Enforced Mandatory Legal Flow Interface Module */}
                <div className={`p-4 rounded-xl border transition-all duration-300 ${legalCompleted ? 'bg-emerald-50/40 border-emerald-200' : 'bg-neutral-50 border-neutral-200/70'}`}>
                  <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2.5">Legal Status</span>
                  
                  {!legalCompleted ? (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-2 text-neutral-500 text-xs font-medium">
                        <span className="w-2 h-2 rounded-full bg-neutral-400" />
                        Legal acknowledgement required
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="px-3.5 h-8 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-[11px] uppercase tracking-wider rounded-lg transition-all focus:outline-none cursor-pointer shrink-0"
                      >
                        Read Vendor Terms
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 animate-fade-in">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#2ECC71]">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>✓ Vendor Terms reviewed</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#2ECC71]">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>✓ Privacy Policy reviewed</span>
                      </div>
                      <p className="text-[11px] text-[#2ECC71] font-bold pt-2 border-t border-emerald-200/50 mt-1">
                        ✓ Legal requirements completed.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !legalCompleted}
                    className="w-full h-12 mt-2 rounded-xl bg-[#2ECC71] hover:bg-[#27AE60] text-white font-semibold text-sm shadow-xl shadow-[#2ECC71]/15 active:scale-[0.995] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                    Submit Vendor Application
                  </button>
                </div>

                <div className="text-center pt-2 lg:hidden">
                  <button
                    type="button"
                    onClick={onNavigateToLogin}
                    className="text-xs font-medium text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
                  >
                    Already have an account? <span className="text-[#2ECC71] font-bold hover:underline ml-0.5">Sign In</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        {/* Dynamic Mobile/Tablets Footer line */}
        <p className="text-center text-[10px] text-neutral-400 font-light p-6 border-t border-neutral-100 lg:hidden bg-neutral-50/30">
          Rivo.City Network Dashboard Systems &middot; 2026
        </p>
      </div>

      {showTermsModal && (
        <VendorTerms 
          onClose={() => setShowTermsModal(false)}
          onAcknowledgeComplete={() => setLegalCompleted(true)}
        />
      )}
    </div>
  );
}