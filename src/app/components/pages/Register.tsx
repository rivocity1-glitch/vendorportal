import React, { useState } from "react";
import { Eye, EyeOff, Zap, CheckCircle2 } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";

interface RegisterProps {
  onNavigateToLogin: () => void;
}

export function Register({ onNavigateToLogin }: RegisterProps) {
  // Form State Handles
  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Interface Utility States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    // 1. Validate All Required Fields
    if (!shopName || !ownerName || !email || !phone || !address || !category || !password || !confirmPassword) {
      setError("Please fill in all required registration fields.");
      return;
    }

    // 2. Validate Password Matching Criteria
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      // 3. Provision the Core Supabase Auth Account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData?.user) throw new Error("Could not initialize authentication profile records.");

      // 4. Inject Verified Metadata into the Vendors Data Row (Updated Column Naming)
      const { error: dbError } = await supabase.from("vendors").insert([
        {
          name: shopName,         // Changed from store_name -> name
          owner_name: ownerName,
          email: email,
          phone: phone,
          address: address,
          category: category,     // Changed from category_name -> category
          auth_user_id: authData.user.id,
          status: "pending",
          plan_type: "trial",
        },
      ]);

      if (dbError) throw dbError;

      // 5. Establish Success State Flags (Without logging the user in automatically)
      setSuccessMessage("Registration submitted. Awaiting admin approval.");
      
      // Clear tracking hooks out of system variables safely
      setShopName("");
      setOwnerName("");
      setEmail("");
      setPhone("");
      setAddress("");
      setCategory("");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "An unexpected system registration variance occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0FDF4] via-white to-[#EFF6FF] flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-xl">
        {/* Visual Brand Logo Panel */}
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
          {successMessage ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 bg-[#ECFDF5] rounded-full flex items-center justify-center mx-auto text-[#10B981]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-[#0F172A]">Application Received!</h2>
                <p className="text-sm text-[#64748B] max-w-md mx-auto">{successMessage}</p>
              </div>
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="mt-4 px-6 h-10 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white font-medium text-sm transition-colors shadow-md shadow-[#10B981]/10"
              >
                Go to Login Screen
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-semibold text-[#0F172A]">Create Merchant Account</h1>
                <p className="text-sm text-[#64748B] mt-1">Register your retail location onto the Rivo platform network</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Shop Name</label>
                    <input
                      type="text"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="e.g. Fresh Grocery Mart"
                      className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Owner Name</label>
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@store.com"
                      className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Store Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 transition-all"
                  >
                    <option value="" disabled>Select business classification category</option>
                    <option value="Grocery">Grocery & Daily Essentials</option>
                    <option value="Fruits & Vegetables">Fruits & Vegetables</option>
                    <option value="Dairy & Bakery">Dairy & Bakery</option>
                    <option value="Personal Care">Personal Care & Wellness</option>
                    <option value="Snacks & Instant Food">Snacks & Instant Food</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Physical Store Address</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Provide full shop layout address details"
                    rows={2}
                    className="w-full p-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create complex password"
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
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password string"
                        className="w-full h-10 px-3 pr-10 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-[#EF4444] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 mt-2 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white font-medium transition-all shadow-lg shadow-[#10B981]/25 hover:shadow-[#10B981]/40 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  Submit Vendor Application
                </button>

                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={onNavigateToLogin}
                    className="text-sm text-[#64748B] hover:text-[#10B981] transition-colors"
                  >
                    Already have a merchant account? <span className="text-[#10B981] font-medium hover:underline">Sign In</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-[#94A3B8] mt-6">
          Everything Nearby. Delivered Fast. · <span className="text-[#10B981]">Rivo</span> © 2026
        </p>
      </div>
    </div>
  );
}