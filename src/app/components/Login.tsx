import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Zap, ShieldAlert, ArrowLeft } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { VendorTerms } from "./legal/VendorTerms";

interface LoginProps {
  onLogin: () => void;
  onNavigateToRegister: () => void;
}

export function Login({ onLogin, onNavigateToRegister }: LoginProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [shopCode, setShopCode] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [error, setError] = useState("");
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    const savedShopCode = localStorage.getItem("rivo_remembered_shop_code");
    if (savedShopCode) {
      setShopCode(savedShopCode);
      setRememberMe(true);
    }
  }, []);

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
          throw new Error("Shop not found.");
        }
        emailTarget = profile.email;
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailTarget,
        password: password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Login failed.");

      const { data: vendorMeta, error: vendorError } = await supabase
        .from("vendors")
        .select("status")
        .eq("auth_user_id", authData.user.id)
        .maybeSingle();

      if (vendorError || !vendorMeta) {
        await supabase.auth.signOut();
        throw new Error("Vendor account data not found.");
      }

      const formattedStatus = vendorMeta.status.toLowerCase();

      if (formattedStatus === "pending") {
        await supabase.auth.signOut();
        setError("Account pending approval.");
        return;
      }

      if (formattedStatus === "suspended") {
        await supabase.auth.signOut();
        setError("Account suspended.");
        return;
      }

      if (formattedStatus !== "approved") {
        await supabase.auth.signOut();
        setError("Access denied. Contact support.");
        return;
      }

      if (rememberMe) {
        localStorage.setItem("rivo_remembered_shop_code", shopCode.trim());
      } else {
        localStorage.removeItem("rivo_remembered_shop_code");
      }

      localStorage.setItem(
        "rivo_vendor_session",
        JSON.stringify({
          uid: authData.user.id,
          email: authData.user.email,
          persistent: true,
        })
      );

      onLogin();
    } catch (err: any) {
      if (err.message?.toLowerCase().includes("invalid login credentials")) {
        setError("Invalid credentials.");
      } else {
        setError(err.message || "Login failed.");
      }
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
      alert("Password reset instructions sent to your email.");
      setForgotMode(false);
    } catch (err: any) {
      setError(err.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center p-4 text-[#0F172A]">
      <div className="w-full max-w-[440px] space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-[#2ECC71] mx-auto flex items-center justify-center text-white shadow-md shadow-[#2ECC71]/20">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Vendor Portal</h1>
          <p className="text-sm text-neutral-500">Sign in to manage your store</p>
        </div>

        {/* Form Card */}
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-8 shadow-sm">
          {forgotMode ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold">Reset Password</h2>
                <p className="text-xs text-neutral-500 mt-0.5">Enter your email to receive reset instructions</p>
              </div>

              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Email Address</label>
                  <input
                    name="forgotEmail"
                    type="email"
                    required
                    placeholder="owner@store.com"
                    className="w-full h-10 px-3 rounded-lg border border-neutral-200 bg-white text-sm focus:outline-none focus:border-[#2ECC71] focus:ring-2 focus:ring-[#2ECC71]/10 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 rounded-lg bg-[#2ECC71] hover:bg-[#27AE60] text-white font-medium text-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(false);
                    setError("");
                  }}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 transition pt-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Shop Code / Email</label>
                <input
                  type="text"
                  value={shopCode}
                  onChange={(e) => setShopCode(e.target.value)}
                  placeholder="e.g. RIVO-1024 or owner@store.com"
                  className="w-full h-10 px-3 rounded-lg border border-neutral-200 bg-white text-sm focus:outline-none focus:border-[#2ECC71] focus:ring-2 focus:ring-[#2ECC71]/10 transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-neutral-700">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(true);
                      setError("");
                    }}
                    className="text-xs font-medium text-[#2ECC71] hover:underline cursor-pointer"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full h-10 px-3 pr-9 rounded-lg border border-neutral-200 bg-white text-sm focus:outline-none focus:border-[#2ECC71] focus:ring-2 focus:ring-[#2ECC71]/10 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-300 accent-[#2ECC71] cursor-pointer"
                  />
                  <span className="text-xs text-neutral-600">Remember me</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-lg bg-[#2ECC71] hover:bg-[#27AE60] text-white font-medium text-sm transition shadow-sm active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Sign In
              </button>

              <div className="text-center pt-2">
                <p className="text-xs text-neutral-500">
                  By signing in you agree to our{" "}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-[#2ECC71] font-medium hover:underline cursor-pointer"
                  >
                    Terms & Privacy Policy
                  </button>.
                </p>
              </div>
            </form>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="text-center">
          <p className="text-xs text-neutral-500">
            Don't have a vendor account?{" "}
            <button
              type="button"
              onClick={onNavigateToRegister}
              className="text-[#2ECC71] font-semibold hover:underline cursor-pointer"
            >
              Register your store
            </button>
          </p>
        </div>
      </div>

      {showTermsModal && (
        <VendorTerms
          onClose={() => setShowTermsModal(false)}
          onAcknowledgeComplete={() => setShowTermsModal(false)}
        />
      )}
    </div>
  );
}