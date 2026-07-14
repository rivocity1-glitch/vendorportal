import React, { useState } from "react";
import { Eye, EyeOff, Zap } from "lucide-react";
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
      // 1. Force clear any lingering authentication sessions before registering a new handshake
      await supabase.auth.signOut();
      localStorage.removeItem("rivo_vendor_session");

      let emailTarget = shopCode.trim();

      // Dual-Resolution Logic: If inputs do not look like an email, resolve via vendor profile
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

      // Execute Security handshake verification
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailTarget,
        password: password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Authentication failed. Missing reference structure.");

      // Querying against "auth_user_id" to safely target the proper row index
      const { data: vendorMeta, error: vendorError } = await supabase
        .from("vendors")
        .select("status")
        .eq("auth_user_id", authData.user.id) 
        .maybeSingle();

      if (vendorError || !vendorMeta) {
        await supabase.auth.signOut();
        throw new Error("Vendor business operational layout profile data not found.");
      }

      // Check registration approval status flags safely
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

      // Commit localized strategy session tokens cleanly
      localStorage.setItem("rivo_vendor_session", JSON.stringify({ 
        uid: authData.user.id, 
        email: authData.user.email,
        timestamp: Date.now() 
      }));
      
      // Execute global state context refresh callback engine
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
    <div className="min-h-screen bg-gradient-to-br from-[#F0FDF4] via-white to-[#EFF6FF] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#10B981] flex items-center justify-center shadow-lg shadow-[#10B981]/25">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-2xl font-bold text-[#0F172A] tracking-tight">Rivo</span>
            <p className="text-[11px] text-[#64748B] leading-none mt-0.5">Vendor Portal</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-[#E2E8F0] p-8">
          {forgotMode ? (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-semibold text-[#0F172A]">Reset Password</h1>
                <p className="text-sm text-[#64748B] mt-1">Enter your registered email to receive reset instructions.</p>
              </div>
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Email Address</label>
                  <input
                    name="forgotEmail"
                    type="email"
                    required
                    placeholder="owner@store.com"
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  Send Reset Link
                </button>
                <button type="button" onClick={() => setForgotMode(false)} className="w-full text-sm text-[#64748B] hover:text-[#10B981] transition-colors">
                  &larr; Back to Login
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-semibold text-[#0F172A]">Welcome back</h1>
                <p className="text-sm text-[#64748B] mt-1">Sign in to your vendor dashboard</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Shop Code / Email</label>
                  <input
                    type="text"
                    value={shopCode}
                    onChange={e => setShopCode(e.target.value)}
                    placeholder="SHOP-001 or owner@store.com"
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full h-10 px-3 pr-10 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-[#EF4444] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3 py-2">{error}</p>
                )}

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-[#E2E8F0] accent-[#10B981]" />
                    <span className="text-sm text-[#64748B]">Remember me</span>
                  </label>
                  <button type="button" onClick={() => setForgotMode(true)} className="text-sm text-[#10B981] hover:text-[#059669] font-medium transition-colors">
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white font-medium transition-all shadow-lg shadow-[#10B981]/25 hover:shadow-[#10B981]/40 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  Sign In
                </button>
              </form>

              <button
                type="button"
                onClick={onNavigateToRegister}
                className="w-full mt-4 text-sm text-[#10B981] hover:text-[#059669]"
              >
                Don't have an account? Register
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-[#94A3B8] mt-6">
          Everything Nearby. Delivered Fast. &middot; <span className="text-[#10B981]">Rivo</span> &copy; 2026
        </p>
      </div>
    </div>
  );
}