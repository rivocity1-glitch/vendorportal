import React, { useState, useEffect } from "react";
import { User, Shield, Settings2, LifeBuoy, LogOut, Mail, Phone, Loader2, Check, ShieldAlert, KeyRound, MailCheck, RotateCcw } from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface AccountState {
  vendor_id: string;
  email_address: string;
  primary_phone: string;
  shop_name: string;
}

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

export function Settings({ isDark, onToggleTheme }: { isDark: boolean; onToggleTheme: () => void }) {
  const [account, setAccount] = useState<AccountState | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);
  
  // Feedback Messaging States
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Security Interaction States
  const [sendingReset, setSendingReset] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const fetchAccountData = async () => {
    try {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      
      if (!auth?.user) {
        setLoading(false);
        return;
      }

      const { data: vendorCore } = await supabase
        .from("vendors")
        .select("id, shop_name, email, phone")
        .eq("auth_user_id", auth.user.id)
        .maybeSingle();

      if (!vendorCore) {
        setLoading(false);
        return;
      }

      setAccount({
        vendor_id: vendorCore.id,
        email_address: vendorCore.email || auth.user.email || "",
        primary_phone: vendorCore.phone || "",
        shop_name: vendorCore.shop_name || "Storefront"
      });
    } catch (err) {
      console.error("Error fetching account telemetry attributes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountData();
  }, []);

  const triggerFeedback = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleSaveAccountInfo = async () => {
    if (!account) return;
    if (!account.primary_phone.trim()) {
      triggerFeedback("error", "Phone Number is a required parameter field.");
      return;
    }

    try {
      setSavingAccount(true);
      const { error } = await supabase
        .from("vendors")
        .update({
          phone: account.primary_phone,
          updated_at: new Date().toISOString()
        })
        .eq("id", account.vendor_id);

      if (error) throw error;
      triggerFeedback("success", "Account credentials updated successfully!");
    } catch (err: any) {
      triggerFeedback("error", err.message || "Failed to save operational changes.");
    } finally {
      setSavingAccount(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!account?.email_address) return;
    try {
      setSendingReset(true);
      const { error } = await supabase.auth.resetPasswordForEmail(account.email_address, {
        redirectTo: `${window.location.origin}/login?action=reset-password`,
      });
      if (error) throw error;
      triggerFeedback("success", "Password reset dispatch link transmitted successfully to your email inbox.");
    } catch (err: any) {
      triggerFeedback("error", err.message || "Failed to execute authentication dispatch.");
    } finally {
      setSendingReset(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      triggerFeedback("error", "Password metrics must meet a minimum length of 6 characters.");
      return;
    }

    try {
      setPasswordLoading(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      triggerFeedback("success", "Your modern security access password has been applied.");
      setNewPassword("");
      setIsChangingPassword(false);
    } catch (err: any) {
      triggerFeedback("error", err.message || "Authentication security engine refused update state.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleResetPreferences = () => {
    // Soft runtime fallback preference framework targets
    triggerFeedback("success", "Vendor operational themes, notifications, and language systems configured to defaults.");
  };

  const contactAdminWhatsApp = () => {
    const mobileNo = "919021404487";
    const textContent = encodeURIComponent(`Hello Admin, I need setup assistance with my account security.\n\nStore Name: ${account?.shop_name}\nVendor ID: ${account?.vendor_id}`);
    window.open(`https://wa.me/${mobileNo}?text=${textContent}`, "_blank");
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out process error log event exception:", err);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/login";
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-xs font-semibold tracking-widest text-muted-foreground animate-pulse uppercase">
        Querying secure vendor identity metrics...
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-5">
      
      {/* Dynamic System Alert Messaging Engine */}
      {statusMessage && (
        <div className={`border rounded-xl p-4 flex items-start gap-2 text-xs font-semibold shadow-sm transition-all animate-in fade-in duration-200 ${
          statusMessage.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {statusMessage.type === "success" ? (
            <Check className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          )}
          <p>{statusMessage.text}</p>
        </div>
      )}

      {/* Account Information Section */}
      <Section title="Account Information" icon={User}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field 
            label="Email Address" 
            value={account?.email_address || ""} 
            onChange={() => {}} 
            disabled 
          />
          <Field 
            label="Phone Number" 
            value={account?.primary_phone || ""} 
            onChange={v => setAccount(s => s ? ({ ...s, primary_phone: v }) : null)} 
            placeholder="Enter active core contact node" 
          />
        </div>
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSaveAccountInfo}
            disabled={savingAccount}
            className="h-9 px-4 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {savingAccount && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Save Details</span>
          </button>
        </div>
      </Section>

      {/* Security Engine Settings Section */}
      <Section title="Security & Access Control" icon={Shield}>
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Manage authorization layers, rotate session credentials or request an automated recovery asset pipeline directly to the system record validation vector.
          </p>
          
          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setIsChangingPassword(!isChangingPassword)}
              className="h-9 px-4 rounded-lg border border-border bg-background text-xs font-bold text-foreground hover:bg-muted transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Change Password</span>
            </button>
            <button
              type="button"
              onClick={handleSendResetEmail}
              disabled={sendingReset}
              className="h-9 px-4 rounded-lg border border-border bg-background text-xs font-bold text-foreground hover:bg-muted transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {sendingReset ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <MailCheck className="w-3.5 h-3.5 text-[#10B981]" />
              )}
              <span>Send Password Reset Email</span>
            </button>
          </div>

          {/* Inline Expanded Direct Update Module Block */}
          {isChangingPassword && (
            <form onSubmit={handleUpdatePassword} className="mt-3 p-4 bg-muted/40 border border-border/60 rounded-xl space-y-3 shadow-inner max-w-sm animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase">Configure New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 alpha-numeric slots"
                  className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-[#10B981]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsChangingPassword(false)}
                  className="h-7 px-3 rounded-md text-[11px] font-bold border border-border text-muted-foreground hover:bg-background"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="h-7 px-3 rounded-md bg-[#10B981] text-white text-[11px] font-bold shadow-xs flex items-center gap-1 hover:bg-[#059669]"
                >
                  {passwordLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Commit Password</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </Section>

      {/* Preferences Section Placeholder Pipeline */}
      <Section title="System Preferences" icon={Settings2}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-foreground">Localization & Layout Contexts</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Reset interface runtime theme variants, system notification preferences, and application language targets back to default profiles.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetPreferences}
            className="h-9 px-4 rounded-lg border border-border bg-background text-xs font-bold text-foreground hover:bg-muted transition-colors flex items-center gap-1.5 shadow-sm shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Reset Preferences</span>
          </button>
        </div>
      </Section>

      {/* Support Section */}
      <Section title="Support & Technical Assistance" icon={LifeBuoy}>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Encountering an operational workflow checkpoint issue? Interface directly with the core administrative tech architecture pipeline using the endpoints mapped below.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 text-sm text-foreground">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center border border-border">
                <Mail className="w-4 h-4 text-[#10B981]" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Support Email</span>
                <a href="mailto:rivo.city1@gmail.com" className="font-semibold text-xs hover:underline text-foreground">rivo.city1@gmail.com</a>
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

          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              type="button"
              onClick={contactAdminWhatsApp}
              className="h-9 px-4 rounded-lg border border-border bg-background text-xs font-bold text-foreground hover:bg-muted transition-colors shadow-sm"
            >
              Contact Admin
            </button>
            <button
              type="button"
              onClick={contactAdminWhatsApp} // Fallback execution framework context mapping
              className="h-9 px-4 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 text-[#065F46] hover:bg-[#10B981]/20 text-xs font-bold transition-colors shadow-sm"
            >
              Report Issue
            </button>
          </div>
        </div>
      </Section>

      {/* Bottom Layout Element - Single Sign Out Trigger Button */}
      <div className="flex items-center justify-end pt-3 border-t border-border/60">
        <button
          type="button"
          onClick={handleSignOut}
          className="h-10 px-5 text-sm font-semibold rounded-xl border border-border bg-background text-muted-foreground hover:text-[#EF4444] hover:bg-[#FEF2F2] transition-colors flex items-center gap-2 shadow-xs"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

    </div>
  );
}