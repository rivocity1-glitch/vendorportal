import React, { useState, useEffect } from "react";
import { Lock, Palette, Globe, Shield, Eye, EyeOff, Check, Smartphone, Monitor, ShieldAlert, Save } from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface Props {
  isDark: boolean;
  onToggleTheme: () => void;
}

// ✅ Added Marathi (मराठी) directly into the available core languages array
const languages = ["English", "हिंदी", "मराठी", "ಕನ್ನಡ", "தமிழ்", "తెలుగు", "माংলা"];

// =========================================================================
// ✅ FIXED PATH COMPONENTS (Declared outside to guarantee focus is never dropped)
// =========================================================================
const Section = ({ id, title, icon: Icon, children }: { id: string; title: string; icon: React.ElementType; children: React.ReactNode }) => (
  <div className="bg-card rounded-xl border border-border p-5">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <Icon className="w-4 h-4 text-[#10B981]" />
        {title}
      </h3>
    </div>
    {children}
  </div>
);

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    type="button"
    onClick={onChange}
    className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${checked ? "bg-[#10B981]" : "bg-muted"}`}
  >
    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
  </button>
);

// =========================================================================
// MAIN CORE VIEW HOOK ENGINE
// =========================================================================
export function Settings({ isDark, onToggleTheme }: Props) {
  const [vendorName, setVendorName] = useState("");
  const [shopCode, setShopCode] = useState(""); 

  // Form Field State Hooks
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [twoFactor, setTwoFactor] = useState(true);
  const [loginAlerts, setLoginAlerts] = useState(true);
  
  // Save Feedback Notification States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [globalSuccess, setGlobalSuccess] = useState(false);

  useEffect(() => {
    async function loadVendorIdentities() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;

      const { data: vendor } = await supabase
        .from("vendors")
        .select("name, shop_code")
        .eq("auth_user_id", auth.user.id)
        .maybeSingle();

      if (vendor) {
        setVendorName(vendor.name || "Merchant Storefront");
        setShopCode(vendor.shop_code || "RIVO-XXXX");
      }
    }
    loadVendorIdentities();
  }, []);

  // Comprehensive Save Action Controller
  const handleSaveAllSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setGlobalSuccess(false);
    setIsSubmitting(true);

    try {
      // 1. Conditional Password Change Execution
      if (oldPassword || newPassword || confirmPassword) {
        if (newPassword !== confirmPassword) {
          setErrorMessage("New passwords do not match.");
          setIsSubmitting(false);
          return;
        }
        if (newPassword.length < 8) {
          setErrorMessage("Password must be at least 8 characters long as highlighted in image_247585.png.");
          setIsSubmitting(false);
          return;
        }

        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user?.email) throw new Error("No active authorization session detected.");

        // Authenticate old password context parameters
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: auth.user.email,
          password: oldPassword,
        });

        if (verifyError) {
          setErrorMessage("The current password you entered is incorrect.");
          setIsSubmitting(false);
          return;
        }

        // Commit new password strings
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (updateError) throw updateError;
        
        // Clear password fields post success safely
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }

      // 2. Local Preference Modifications Sync (Simulated placeholder for DB write variables)
      console.log("Saving Preference Configurations:", { selectedLanguage, twoFactor, loginAlerts });

      setGlobalSuccess(true);
      setTimeout(() => setGlobalSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to finalize preferences parameters configuration mapping.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">
      
      {/* Identity Profile Badge Row Component */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center text-base font-black text-[#10B981]">
          {vendorName ? vendorName.slice(0,2).toUpperCase() : "RV"}
        </div>
        <div>
          <h2 className="text-sm font-black text-foreground leading-none">{vendorName || "Loading profile identity..."}</h2>
          <p className="text-xs font-mono font-bold text-[#10B981] mt-1.5">{shopCode}</p>
        </div>
      </div>

      <form onSubmit={handleSaveAllSettings} className="space-y-5">
        
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" /> {errorMessage}
          </div>
        )}

        {globalSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-xs font-bold flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 shrink-0 text-emerald-600 stroke-[3]" /> All settings configurations committed successfully!
          </div>
        )}

        {/* Change Password Input Field Section */}
        <Section id="password" title="Change Password" icon={Lock}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">Current Password</label>
              <div className="relative">
                <input
                  type={showOldPw ? "text" : "password"}
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full h-9 px-3 pr-10 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                />
                <button type="button" onClick={() => setShowOldPw(!showOldPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showOldPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">New Password</label>
              <div className="relative">
                <input
                  type={showNewPw ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full h-9 px-3 pr-10 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">Confirm New Password</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password" 
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20" 
              />
            </div>
          </div>
        </Section>

        {/* Theme Appearance Styles Configuration Container */}
        <Section id="theme" title="Appearance" icon={Palette}>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "light", label: "Light", icon: Monitor, isActive: !isDark },
              { id: "dark", label: "Dark", icon: Monitor, isActive: isDark },
              { id: "system", label: "System", icon: Smartphone, isActive: false },
            ].map(theme => (
              <button
                key={theme.id}
                type="button"
                onClick={() => {
                  if ((theme.id === "dark") !== isDark && theme.id !== "system") onToggleTheme();
                }}
                className={`relative rounded-xl border-2 p-3 flex flex-col items-center gap-2 transition-all ${
                  theme.isActive ? "border-[#10B981] bg-[#ECFDF5] dark:bg-emerald-950/20" : "border-border hover:border-[#10B981]/30"
                }`}
              >
                <div className={`w-10 h-8 rounded-lg ${theme.id === "dark" ? "bg-[#0F172A]" : "bg-[#F8FAFC]"} border border-border flex items-center justify-center`}>
                  <div className={`w-4 h-1 rounded ${theme.id === "dark" ? "bg-[#10B981]" : "bg-[#0F172A]/30"}`} />
                </div>
                <span className="text-xs font-medium text-foreground">{theme.label}</span>
                {theme.isActive && <Check className="absolute top-2 right-2 w-3 h-3 text-[#10B981]" />}
              </button>
            ))}
          </div>
        </Section>

        {/* Language Selection Grid (Supports Marathi Selection Option Nodes) */}
        <Section id="language" title="Language & Region" icon={Globe}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {languages.map(lang => (
              <button
                key={lang}
                type="button"
                onClick={() => setSelectedLanguage(lang)}
                className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  selectedLanguage === lang
                    ? "border-[#10B981] bg-[#ECFDF5] text-[#065F46] dark:bg-emerald-950/20"
                    : "border-border text-foreground hover:border-[#10B981]/30"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">Selected Layout Language: <strong>{selectedLanguage}</strong></p>
        </Section>

        {/* Security Parameters Node Panel */}
        <Section id="security" title="Security Settings" icon={Shield}>
          <div className="space-y-3">
            {[
              { label: "Two-Factor Authentication", desc: "Require OTP on every login", checked: twoFactor, toggle: () => setTwoFactor(!twoFactor) },
              { label: "Login Activity Alerts", desc: "Get email alerts for new login sessions", checked: loginAlerts, toggle: () => setLoginAlerts(!loginAlerts) },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
                <Toggle checked={s.checked} onChange={s.toggle} />
              </div>
            ))}
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Active Sessions</p>
                <p className="text-xs text-muted-foreground">2 devices · last seen today</p>
              </div>
              <button type="button" className="text-xs text-[#EF4444] hover:underline font-medium">Sign out all devices</button>
            </div>
          </div>
        </Section>

        {/* Danger Zone Account Exclusion Wrapper */}
        <div className="bg-[#FEF2F2] rounded-xl border border-[#FECACA] p-5">
          <h3 className="font-semibold text-[#991B1B] mb-3">Danger Zone</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#991B1B]">Deactivate Store</p>
              <p className="text-xs text-[#EF4444]/70">Temporarily pause your store on Rivo. Orders won't be accepted.</p>
            </div>
            <button type="button" className="h-8 px-3 rounded-lg border border-[#EF4444] text-[#EF4444] text-xs font-medium hover:bg-[#EF4444] hover:text-white transition-colors">
              Deactivate
            </button>
          </div>
        </div>

        {/* ✅ FIXED UI: Centralized Save Changes Action Button Box placed cleanly at the end of the form */}
        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-6 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-sm font-bold transition-all shadow-md shadow-[#10B981]/20 disabled:opacity-40 flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> {isSubmitting ? "Committing Settings..." : "Save All Settings"}
          </button>
        </div>

      </form>
    </div>
  );
}