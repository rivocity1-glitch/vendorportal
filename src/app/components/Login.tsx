import React, { useState } from "react";
import { Eye, EyeOff, Zap, ArrowLeft, ShieldAlert, KeyRound, Building2, Globe, ShieldCheck, ArrowRight } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface LoginProps {
  onLogin: () => void;
  onNavigateToRegister: () => void;
}

export function Login({ onLogin, onNavigateToRegister }: LoginProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [shopCode, setShopCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!shopCode || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("rivo_vendor_session");

      let emailTarget = shopCode.trim();

      if (!emailTarget.includes("@")) {
        const { data: profile, error: profileError } = await supabase
          .from("vendors")
          .select("email")
          .eq("shop_code", emailTarget)
          .maybeSingle();

        if (profileError || !profile) {
          throw new Error("No vendor record matches the provided Shop Code.");
        }
        emailTarget = profile.email;
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailTarget,
        password: password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Authentication failed. Missing reference structure.");

      const { data: vendorMeta, error: vendorError } = await supabase
        .from("vendors")
        .select("status")
        .eq("auth_user_id", authData.user.id) 
        .maybeSingle();

      if (vendorError || !vendorMeta) {
        await supabase.auth.signOut();
        throw new Error("Vendor business operational layout profile data not found.");
      }

      const formattedStatus = vendorMeta.status.toLowerCase();
      
      if (formattedStatus === "pending") {
        await supabase.auth.signOut();
        setError("Your account is awaiting approval.");
        return;
      } 
      
      if (formattedStatus === "suspended") {
        await supabase.auth.signOut();
        setError("Your account has been suspended.");
        return;
      }

      if (formattedStatus !== "approved") {
        await supabase.auth.signOut();
        setError("Access denied. Contact site administration system support.");
        return;
      }

      localStorage.setItem("rivo_vendor_session", JSON.stringify({ 
        uid: authData.user.id, 
        email: authData.user.email,
        timestamp: Date.now() 
      }));
      
      onLogin();

    } catch (err: any) {
      setError(err.message || "Invalid email, shop code, or password sequence.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const emailInput = (e.currentTarget.elements.namedItem("forgotEmail") as HTMLInputElement)?.value;
    if (!emailInput) return;

    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(emailInput, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      alert("Password reset assignment guidelines link transmitted to your inbox.");
      setForgotMode(false);
    } catch (err: any) {
      setError(err.message || "Could not transmit reset communications data pipelines.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white grid grid-cols-1 lg:grid-cols-12 overflow-x-hidden selection:bg-[#2ECC71]/20 selection:text-[#0F172A]">
      
      {/* ================= LEFT SIDEBOARD: PREMIUM OVERVIEW ================= */}
      <div className="lg:col-span-4 relative bg-[#0F172A] p-8 md:p-12 hidden lg:flex flex-col justify-between text-white overflow-hidden">
        {/* Subtle grid pattern background overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
        
        {/* Top Header Identity */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2ECC71] flex items-center justify-center shadow-lg shadow-[#2ECC71]/20 border border-[#2ECC71]/10">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight">Rivo.City</span>
            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold leading-none mt-0.5">Vendor Portal</p>
          </div>
        </div>

        {/* Core Value Propostions Showcase */}
        <div className="relative space-y-8 my-auto max-w-sm">
          <div className="space-y-3">
            <h2 className="text-3xl font-black tracking-tight leading-tight">Access your business dashboard terminal.</h2>
            <p className="text-neutral-400 font-light text-sm leading-relaxed">Sign in to securely manage product listings, audit processing orders, and observe direct localized payout streams parameters.</p>
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

        {/* Footer info line */}
        <p className="relative text-[11px] text-neutral-500 font-light">
          Everything Nearby. Delivered Fast. &middot; Rivo &copy; 2026
        </p>
      </div>

      {/* ================= RIGHT SIDEBOARD: COMPREHENSIVE ACTION SYSTEM ================= */}
      <div className="lg:col-span-8 flex flex-col justify-between min-h-screen bg-white">
        
        {/* Mobile Header Element */}
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between lg:hidden bg-neutral-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2ECC71] flex items-center justify-center text-white shadow-sm">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-lg font-black tracking-tight text-[#0F172A]">Rivo</span>
          </div>
          <button onClick={onNavigateToRegister} className="text-xs font-bold uppercase tracking-wider text-[#2ECC71] hover:underline cursor-pointer">
            Register
          </button>
        </div>

        {/* Form Central Core Canvas */}
        <div className="flex-1 w-full max-w-[460px] mx-auto px-6 py-12 flex flex-col justify-center">
          
          {forgotMode ? (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">Reset Password</h1>
                <p className="text-sm text-neutral-500 font-light mt-2 leading-relaxed">Enter your registered email to receive reset instructions.</p>
              </div>

              <form onSubmit={handleForgot} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide mb-2">Email Address</label>
                  <input
                    name="forgotEmail"
                    type="email"
                    required
                    placeholder="owner@store.com"
                    className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 bg-neutral-50/30 text-[#0F172A] placeholder-neutral-400 text-sm focus:outline-none focus:bg-white focus:border-[#2ECC71] focus:ring-4 focus:ring-[#2ECC71]/10 transition-all duration-150"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-[#2ECC71] hover:bg-[#27AE60] text-white font-semibold text-sm transition-all shadow-lg shadow-[#2ECC71]/15 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  Send Reset Link
                </button>

                <button 
                  type="button" 
                  onClick={() => setForgotMode(false)} 
                  className="w-full flex items-center justify-center gap-2 text-xs font-bold tracking-wide text-neutral-400 hover:text-[#2ECC71] uppercase transition-colors pt-2 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Login Context Header */}
              <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">Welcome back</h1>
                  <p className="text-sm text-neutral-500 font-light mt-1">Sign in to your vendor dashboard</p>
                </div>
                <button 
                  type="button" 
                  onClick={onNavigateToRegister} 
                  className="hidden lg:inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-[#2ECC71] transition-colors cursor-pointer"
                >
                  New Partner? <span className="text-[#2ECC71]">Register</span> <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Login Execution Form */}
              <form onSubmit={handleLogin} className="space-y-5">
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide mb-2">Shop Code / Email</label>
                    <input
                      type="text"
                      value={shopCode}
                      onChange={e => setShopCode(e.target.value)}
                      placeholder="SHOP-001 or owner@store.com"
                      className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 bg-neutral-50/30 text-[#0F172A] placeholder-neutral-400 text-sm focus:outline-none focus:bg-white focus:border-[#2ECC71] focus:ring-4 focus:ring-[#2ECC71]/10 transition-all duration-150"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide mb-2">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Enter your password"
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
                </div>

                {error && (
                  <div className="text-xs text-red-600 bg-red-50/50 border border-red-200 rounded-xl p-3.5 flex items-start gap-2.5 animate-fade-in">
                    <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span className="font-medium leading-relaxed">{error}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 rounded border-neutral-300 bg-neutral-50 accent-[#2ECC71] cursor-pointer" />
                    <span className="text-xs font-medium text-neutral-500 group-hover:text-neutral-700 transition-colors">Remember me</span>
                  </label>
                  <button type="button" onClick={() => setForgotMode(true)} className="text-xs font-bold text-[#2ECC71] hover:text-[#27AE60] transition-colors cursor-pointer">
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 mt-2 rounded-xl bg-[#2ECC71] hover:bg-[#27AE60] text-white font-semibold text-sm transition-all shadow-xl shadow-[#2ECC71]/15 active:scale-[0.995] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  Sign In
                </button>
              </form>

              {/* Bottom Redirection Panel for Mobile */}
              <div className="border-t border-neutral-100 pt-5 mt-6 text-center lg:hidden">
                <button
                  type="button"
                  onClick={onNavigateToRegister}
                  className="text-xs font-medium text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
                >
                  Don't have an account? <span className="text-[#2ECC71] font-bold hover:underline ml-0.5">Register</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Dynamic Mobile/Tablets Footer line */}
        <p className="text-center text-[10px] text-neutral-400 font-light p-6 border-t border-neutral-100 lg:hidden bg-neutral-50/30">
          Rivo Network Dashboard Systems &middot; 2026
        </p>
      </div>

    </div>
  );
}