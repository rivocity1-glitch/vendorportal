import React, { useState, useEffect } from "react";
import { Store, Clock, Image, Save, Check, ShieldAlert, Loader2, User, Phone, FileText, Sparkles } from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface ProfileState {
  auth_user_id: string;
  vendor_id: string;
  store_status: string;
  status_remarks: string;
  assigned_rider_id: string | null;
  rider_name?: string;
  rider_phone?: string;
}

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

      // 1. Fetch vendor profile using explicit schema parameters
      const { data, error } = await supabase
        .from("vendor_profiles")
        .select(`
          auth_user_id,
          store_status,
          status_remarks,
          assigned_rider_id
        `)
        .eq("auth_user_id", auth.user.id)
        .maybeSingle();

      if (error) throw error;

      console.log("Supabase Profile Data Load Output:", data); // 🔍 Diagnostic Log

      let validatedState: ProfileState = {
        auth_user_id: auth.user.id,
        vendor_id: data?.auth_user_id || auth.user.id,
        store_status: data?.store_status || "closed",
        status_remarks: data?.status_remarks || "",
        assigned_rider_id: data?.assigned_rider_id || null,
        rider_name: "Unassigned",
        rider_phone: "—"
      };

      // 2. Fetch rider records only if an assignment ID is present
      if (data?.assigned_rider_id) {
        console.log("Attempting to query riders table with ID:", data.assigned_rider_id);
        
        const { data: riderData, error: riderError } = await supabase
          .from("riders")
          .select("name, phone")
          .eq("id", data.assigned_rider_id)
          .maybeSingle();
        
        if (riderError) {
          console.error("Supabase error querying riders table:", riderError);
        }

        if (riderData) {
          console.log("Rider details found successfully:", riderData);
          validatedState.rider_name = riderData.name;
          validatedState.rider_phone = riderData.phone;
        } else {
          console.warn(`Rider ID ${data.assigned_rider_id} exists on vendor profile, but no matching record was found inside the riders table.`);
          validatedState.rider_name = "Rider Data Missing in DB";
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
        .eq("auth_user_id", profile.auth_user_id);

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

      {/* 2. Assigned Rider */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 border-b border-border/40 pb-2">
          <User className="w-4 h-4 text-[#10B981]" />
          Assigned Shop Rider
        </h3>
        
        <div className="bg-muted/30 border border-border/50 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Rider Name:</span>
              <span className="font-bold text-foreground">{profile.rider_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Mobile String:</span>
              <span className="font-semibold text-foreground tracking-wide">{profile.rider_phone}</span>
            </div>
          </div>
          
          <div className="p-2.5 bg-background border border-border rounded-lg text-[11px] text-muted-foreground max-w-xs leading-relaxed font-medium">
            ℹ️ Delivery partners are linked via your administrative console. Reach out to network support lines if your allocated delivery details need updates.
          </div>
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