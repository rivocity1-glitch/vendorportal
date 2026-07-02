import React, { useState, useEffect } from "react";
import { MessageSquare, Wallet, Star, CheckCheck, Bell, Filter, Trash2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { notificationSync } from "../../../lib/notificationSync";

interface NotificationItem {
  id: string;
  category: "Support" | "Settlements" | "Reviews";
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// Deterministic Visual Asset Configuration Mapping Dictionary (Admin Removed)
const categoryConfig: Record<string, { icon: any; color: string; bg: string }> = {
  Support: { icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/40" },
  Settlements: { icon: Wallet, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
  Reviews: { icon: Star, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/40" }
};

const categories = ["All", "Support", "Settlements", "Reviews"];

export function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Core Data Fetch Routine Engine Pipeline using auth_user_id
  const fetchNotifications = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("auth_user_id", auth.user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        // Fallback initialized to "Support" for unexpected values
        const mappedData = data.map((n: any) => ({
          ...n,
          category: n.category === "Admin" ? "Support" : (n.category || "Support")
        }));
        setNotifications(mappedData);
      }
    } catch (err) {
      console.error("Failed to fetch relational notification logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Compute conversational relative timestamps cleanly from backend metadata formats
  const formatTimeAgo = (timestamp: string) => {
    const delta = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);
    if (delta < 60) return "Just now";
    const mins = Math.floor(delta / 60);
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
    return new Date(timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const filtered = notifications.filter(n => activeCategory === "All" || n.category === activeCategory);
  const totalUnreadCount = notifications.filter(n => !n.is_read).length;

  const triggerNotificationSync = () => {
    if (typeof (notificationSync as any).emit === "function") {
      (notificationSync as any).emit();
    } else {
      notificationSync.start();
    }
  };

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    triggerNotificationSync();
  };

  const markAllRead = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("auth_user_id", auth.user.id)
        .eq("is_read", false);

      if (error) throw error;

      setSuccessToast("All notifications marked as read.");
      setTimeout(() => setSuccessToast(null), 3000);

      triggerNotificationSync();
      await fetchNotifications();
    } catch (err) {
      console.error("Batch update notification tracking state failure experienced:", err);
    }
  };

  const deleteNotif = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
    triggerNotificationSync();
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-xs font-semibold tracking-widest text-muted-foreground animate-pulse uppercase">
        Loading operational notifications matrix...
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      
      {/* Toast Alert Feedback Overlay */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 bg-[#10B981] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCheck className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Action Panel Controls Row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-foreground" />
          {totalUnreadCount > 0 && (
            <span className="bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
              {totalUnreadCount} unread
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {totalUnreadCount > 0 && (
            <button 
              type="button"
              onClick={markAllRead} 
              className="h-8 px-3 rounded-lg border border-border bg-card text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors font-medium shadow-2xs"
            >
              <CheckCheck className="w-3.5 h-3.5 text-[#10B981]" /> Mark all read
            </button>
          )}
          <button type="button" className="h-8 px-3 rounded-lg border border-border bg-card text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors font-medium">
            <Filter className="w-3.5 h-3.5" /> Filter
          </button>
        </div>
      </div>

      {/* Interactive Section Category Tab Triggers */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2 scrollbar-none">
        {categories.map(cat => {
          const catCount = cat === "All"
            ? notifications.filter(n => !n.is_read).length
            : notifications.filter(n => n.category === cat && !n.is_read).length;
          
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                activeCategory === cat
                  ? "bg-[#10B981] border-[#10B981] text-white shadow-sm"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
              {catCount > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  activeCategory === cat ? "bg-white/20 text-white" : "bg-red-500 text-white"
                }`}>
                  {catCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Data Feed Render Loop Container */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="bg-card rounded-xl border border-dashed border-border p-12 text-center">
            <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-30" />
            <p className="text-xs text-muted-foreground">No dynamic alert cards found in this log category.</p>
          </div>
        )}

        {filtered.map(n => {
          const cfg = categoryConfig[n.category] || categoryConfig.Support;
          const CategoryIcon = cfg.icon;

          return (
            <div
              key={n.id}
              className={`bg-card rounded-xl border transition-all ${
                n.is_read 
                  ? "border-border opacity-85 hover:opacity-100" 
                  : "border-[#10B981]/30 bg-[#ECFDF5]/20 dark:bg-[#064E3B]/10"
              }`}
            >
              <div className="flex items-start gap-3 p-4">
                <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <CategoryIcon className={`w-4 h-4 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground tracking-tight truncate">{n.title}</p>
                        {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shrink-0" />}
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                          {n.category.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 font-normal leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-2 font-medium">{formatTimeAgo(n.created_at)}</p>
                    </div>

                    {/* Operational Row Mutation Button Controls */}
                    <div className="flex gap-1 shrink-0 items-center">
                      {!n.is_read && (
                        <button 
                          type="button"
                          onClick={() => markRead(n.id)} 
                          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-[#10B981] hover:bg-[#ECFDF5] dark:hover:bg-[#064E3B]/30 transition-all" 
                          title="Mark read"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button 
                        type="button"
                        onClick={() => deleteNotif(n.id)} 
                        className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all" 
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}