import React, { useState, useEffect } from "react";
import { Store, Image, Save, Check, ShieldAlert, Loader2, User, Phone, FileText, Sparkles } from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface AssignedRider {
  id: string;
  rider_name: string;
  phone: string;
  availability_status: string;
}

interface ProfileState {
  vendor_id: string;
  store_status: string;
  status_remarks: string;
  riders: AssignedRider[];
}

const riderStatusStyles: Record<string, string> = {
  available: "bg-[#D1FAE5] text-[#065F46]",
  out_for_delivery: "bg-[#FEF3C7] text-[#92400E]",
  break: "bg-[#FEF3C7] text-[#92400E]",
  offline: "bg-muted text-muted-foreground",
};

export function StoreManagement() {
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const fetchStoreSettings = async () => {
    try {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;

      // 1. Fetch corresponding vendor ID mapping from core vendors table
      const { data: vendorData, error: vendorErr } = await supabase
        .from("vendors")
        .select("id")
        .eq("auth_user_id", auth.user.id)
        .single();

      if (vendorErr || !vendorData) {
        throw new Error("No active vendor profile matches your authentication credentials.");
      }

      const verifiedVendorId = vendorData.id;

      // 2. Fetch vendor profile details using structural vendor_id query key parameter criteria
      const { data, error } = await supabase
        .from("vendor_profiles")
        .select(`
          vendor_id,
          store_status,
          status_remarks
        `)
        .eq("vendor_id", verifiedVendorId)
        .maybeSingle();

      if (error) throw error;

      console.log("Supabase Profile Data Load Output:", data); // 🔍 Diagnostic Log

      let validatedState: ProfileState = {
        vendor_id: verifiedVendorId,
        store_status: data?.store_status || "closed",
        status_remarks: data?.status_remarks || "",
        riders: []
      };

      // 3. Query ALL assigned riders inside rider_vendor_assignments dynamically using the vendor_id
      const { data: assignments, error: assignmentErr } = await supabase
        .from("rider_vendor_assignments")
        .select("rider_id")
        .eq("vendor_id", verifiedVendorId);

      if (!assignmentErr && assignments && assignments.length > 0) {
        const riderIds = assignments.map(a => a.rider_id);

        // 4. Resolve full profiles from riders table for all assigned rows
        const { data: ridersList, error: ridersErr } = await supabase
          .from("riders")
          .select("id, rider_name, phone, availability_status")
          .in("id", riderIds);

        if (!ridersErr && ridersList) {
          validatedState.riders = ridersList.map((r: any) => ({
            id: r.id,
            rider_name: r.rider_name || "Unnamed Rider",
            phone: r.phone || "—",
            availability_status: r.availability_status || "offline"
          }));
        }
      }

      setProfile(validatedState);
    } catch (err: any) {
      console.error("Failed to query operational metadata:", err);
      setErrorMessage(err.message || "Failed to sync configurations from database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreSettings();
  }, []);

  const handleSaveSettings = async () => {
    if (!profile) return;
    try {
      setSaving(true);
      setErrorMessage("");
      setSavedMessage("");

      const { error } = await supabase
        .from("vendor_profiles")
        .update({
          store_status: profile.store_status,
          status_remarks: profile.status_remarks,
          updated_at: new Date().toISOString()
        })
        .eq("vendor_id", profile.vendor_id);

      if (error) throw error;
      setSavedMessage("Store operational updates saved successfully!");
      setTimeout(() => setSavedMessage(""), 3000);
    } catch (err: any) {
      console.error("Database update failure:", err);
      setErrorMessage(err.message || "Failed to apply profile parameter changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-xs text-muted-foreground gap-2 animate-pulse">
        <Loader2 className="w-5 h-5 animate-spin text-[#10B981]" />
        <span>Syncing platform operational statuses...</span>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6 text-foreground bg-background">
      
      {savedMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-center gap-2 text-xs font-semibold shadow-sm dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400">
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
          <p>{savedMessage}</p>
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 flex items-center gap-2 text-xs font-semibold shadow-sm dark:bg-red-950/20 dark:border-red-900/40 dark:text-red-400">
          <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
          <p>{errorMessage}</p>
        </div>
      )}

      {/* 1. Store Status */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 border-b border-border/40 pb-2">
          <Store className="w-4 h-4 text-[#10B981]" />
          Store Status
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setProfile(prev => prev ? { ...prev, store_status: "open" } : null)}
            className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
              profile.store_status === "open"
                ? "bg-[#ECFDF5] border-[#10B981] text-[#065F46] ring-2 ring-[#10B981]/10 dark:bg-[#10B981]/10"
                : "bg-background border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              <span className="font-bold text-sm">Open</span>
            </div>
            <span className="text-xs opacity-80 mt-1">Accepting orders and client handoffs</span>
          </button>

          <button
            type="button"
            onClick={() => setProfile(prev => prev ? { ...prev, store_status: "closed" } : null)}
            className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
              profile.store_status === "closed"
                ? "bg-red-50 border-red-400 text-red-900 ring-2 ring-red-400/10 dark:bg-red-950/10 dark:text-red-400 dark:border-red-900"
                : "bg-background border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="font-bold text-sm">Closed</span>
            </div>
            <span className="text-xs opacity-80 mt-1">Not accepting orders right now</span>
          </button>

          <button
            type="button"
            onClick={() => setProfile(prev => prev ? { ...prev, store_status: "busy" } : null)}
            className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
              profile.store_status === "busy"
                ? "bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-400/10 dark:bg-amber-950/10 dark:text-amber-400 dark:border-amber-900"
                : "bg-background border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="font-bold text-sm">Busy</span>
            </div>
            <span className="text-xs opacity-80 mt-1">High demand, expect extended turnaround delays</span>
          </button>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-bold text-muted-foreground flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" /> Status Remarks / Announcements
          </label>
          <input
            type="text"
            placeholder="e.g., Closing early today for inventory audit or festival celebrations..."
            value={profile.status_remarks}
            onChange={e => setProfile(prev => prev ? { ...prev, status_remarks: e.target.value } : null)}
            className="w-full h-10 px-3 text-sm border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-[#10B981]"
          />
        </div>
      </div>

      {/* 2. Assigned Riders */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 border-b border-border/40 pb-2">
          <User className="w-4 h-4 text-[#10B981]" />
          Assigned Riders ({profile.riders.length})
        </h3>
        
        <div className="space-y-3">
          {profile.riders.length === 0 ? (
            <div className="bg-muted/30 border border-border/50 rounded-xl p-4 flex flex-col justify-between gap-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Rider Name:</span>
                  <span className="font-bold text-foreground">Unassigned</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-semibold text-foreground tracking-wide">—</span>
                </div>
              </div>
            </div>
          ) : (
            profile.riders.map(rider => (
              <div key={rider.id} className="bg-muted/30 border border-border/50 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Rider Name:</span>
                    <span className="font-bold text-foreground">{rider.rider_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="font-semibold text-foreground tracking-wide">{rider.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded font-bold ${riderStatusStyles[rider.availability_status.toLowerCase()] || "bg-muted text-foreground"}`}>
                      {rider.availability_status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Banner Management */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 border-b border-border/40 pb-2">
          <Image className="w-4 h-4 text-[#10B981]" />
          Banner Management
        </h3>
        
        <div className="bg-muted/20 border border-dashed border-border rounded-xl p-8 text-center max-w-xl mx-auto space-y-2 group hover:border-[#10B981]/30 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-[#10B981]/10 flex items-center justify-center mx-auto border border-[#10B981]/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-[#10B981]" />
          </div>
          <h4 className="text-sm font-bold text-foreground pt-1">Hey, something extra is coming soon!</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            We are engineering a completely new custom design canvas interface. Wait a bit, you're going to be surprised!
          </p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end pt-2">
        <button
          type="button"
          disabled={saving}
          onClick={handleSaveSettings}
          className="h-10 px-6 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-sm font-bold transition-all flex items-center gap-2 shadow-md disabled:opacity-40"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}