import React, { useState, useEffect, useMemo } from "react";
import { 
  MessageSquare, Wallet, Star, CheckCheck, Bell, Trash2, 
  ShoppingBag, CreditCard, Layers, Settings, Eye, RefreshCw, 
  Inbox
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { notificationSync } from "../../../lib/notificationSync";
import { notificationService } from "../../../services/notificationService";

interface NotificationItem {
  id: string;
  recipient_id: string;
  recipient_type: string;
  title: string;
  message: string;
  type: string;
  reference_id: string | null;
  metadata: any;
  is_read: boolean;
  created_at: string;
}

const typeConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  support: { label: "System", icon: Settings, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/30" },
  settlement: { label: "Settlements", icon: Wallet, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/30" },
  review: { label: "Reviews", icon: Star, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900/30" },
  order: { label: "Orders", icon: ShoppingBag, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/30" },
  payment: { label: "Settlements", icon: CreditCard, color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-950/30 border-cyan-100 dark:border-cyan-900/30" },
  inventory: { label: "Orders", icon: Layers, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/30" },
  system: { label: "System", icon: Settings, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/30" }
};

const fallbackConfig = { label: "System", icon: Bell, color: "text-zinc-500", bg: "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800" };

export function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [animateBadge, setAnimateBadge] = useState<boolean>(false);
  const [newNotificationId, setNewNotificationId] = useState<string | null>(null);

  const loadNotifications = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const { data: session } = await supabase.auth.getUser();
      if (!session?.user) return;

      const { data: vendorProfile } = await supabase
        .from("vendors")
        .select("id")
        .eq("auth_user_id", session.user.id)
        .single();

      if (!vendorProfile) return;
      setVendorId(vendorProfile.id);

      const result = await notificationService.fetchNotifications(vendorProfile.id, "vendor", 1, 100);
      if (result.success && result.data) {
        setNotifications(result.data);
      }
    } catch (err) {
      console.error("Failed to compile notifications stack:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (!vendorId) return;

    notificationSync.startNotificationSync(vendorId, "vendor", {
      onInsert: (incoming: any) => {
        setNotifications(prev => {
          if (prev.some(item => item.id === incoming.id)) return prev;
          return [incoming as NotificationItem, ...prev];
        });
        setNewNotificationId(incoming.id);
        setAnimateBadge(true);
        setTimeout(() => setAnimateBadge(false), 1000);
        setTimeout(() => setNewNotificationId(null), 3000);
      },
      onUpdate: (incoming: any) => {
        setNotifications(prev => prev.map(item => item.id === incoming.id ? { ...item, ...incoming } : item));
      },
      onDelete: (incoming: any) => {
        setNotifications(prev => prev.filter(item => item.id !== incoming.id));
      },
      onError: (err) => {
        console.error("Live synchronizer disruption:", err.message);
      }
    });

    return () => {
      notificationSync.stopNotificationSync();
    };
  }, [vendorId]);

  const highLevelMetrics = useMemo(() => {
    const summary = { unread: 0, order: 0, review: 0, settlement: 0 };
    notifications.forEach(item => {
      if (!item.is_read) summary.unread++;
      const config = typeConfig[item.type] || fallbackConfig;
      if (config.label === "Orders") summary.order++;
      if (config.label === "Reviews") summary.review++;
      if (config.label === "Settlements") summary.settlement++;
    });
    return summary;
  }, [notifications]);

  const computeDeltaTime = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const difference = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (difference < 60) return "Just now";
    
    const minutes = Math.floor(difference / 60);
    if (minutes < 60) return `${minutes} min ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;

    const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();
    if (isYesterday) return "Yesterday";

    if (difference < 7 * 24 * 3600) {
      return date.toLocaleDateString("en-US", { weekday: "long" });
    }

    return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
  };

  const datasetFiltered = useMemo(() => {
    return notifications.filter(item => {
      if (activeFilter === "All") return true;
      if (activeFilter === "Unread") return !item.is_read;
      const verifiedLabel = typeConfig[item.type]?.label || fallbackConfig.label;
      return verifiedLabel === activeFilter;
    });
  }, [notifications, activeFilter]);

  const updateItemToRead = async (targetId: string) => {
    setNotifications(prev => prev.map(item => item.id === targetId ? { ...item, is_read: true } : item));
    await notificationService.markNotificationRead(targetId);
  };

  const flushAllToRead = async () => {
    if (!vendorId) return;
    setNotifications(prev => prev.map(item => ({ ...item, is_read: true })));
    await notificationService.markAllNotificationsRead(vendorId, "vendor");
  };

  const removeNotificationEntry = async (targetId: string) => {
    setNotifications(prev => prev.filter(item => item.id !== targetId));
    await notificationService.deleteNotification(targetId);
  };

  const filterTabs = ["All", "Unread", "Orders", "Reviews", "Settlements", "System"];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 antialiased text-foreground bg-background min-h-screen">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Notifications</h1>
            {highLevelMetrics.unread > 0 && (
              <span className={`px-2 py-0.5 text-xs font-bold bg-green-500 text-white dark:bg-green-600 rounded-full ${animateBadge ? 'animate-bounce' : ''}`}>
                {highLevelMetrics.unread} new
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Stay updated with orders, settlements, reviews and platform activity.
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button 
            type="button"
            disabled={refreshing || loading}
            onClick={() => loadNotifications(true)}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          {highLevelMetrics.unread > 0 && (
            <button 
              type="button"
              onClick={flushAllToRead}
              className="inline-flex items-center justify-center gap-2 h-9 px-4 text-xs font-medium rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity shadow-sm"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Unread", value: highLevelMetrics.unread, icon: Bell, bg: "bg-blue-500/10 dark:bg-blue-500/5", text: "text-blue-600 dark:text-blue-400" },
          { title: "Orders", value: highLevelMetrics.order, icon: ShoppingBag, bg: "bg-amber-500/10 dark:bg-amber-500/5", text: "text-amber-600 dark:text-amber-400" },
          { title: "Reviews", value: highLevelMetrics.review, icon: Star, bg: "bg-purple-500/10 dark:bg-purple-500/5", text: "text-purple-600 dark:text-purple-400" },
          { title: "Settlements", value: highLevelMetrics.settlement, icon: Wallet, bg: "bg-emerald-500/10 dark:bg-emerald-500/5", text: "text-emerald-600 dark:text-emerald-400" }
        ].map((item, index) => {
          const WidgetIcon = item.icon;
          return (
            <div 
              key={index} 
              className="p-4 md:p-5 rounded-xl border border-border bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-4 group"
            >
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl ${item.bg} ${item.text} flex items-center justify-center shrink-0`}>
                <WidgetIcon className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
              </div>
              <div className="min-w-0">
                <p className="text-xl md:text-2xl font-bold tracking-tight truncate">{item.value}</p>
                <p className="text-xs font-medium text-muted-foreground truncate">{item.title}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* FILTERS TABS BAR */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-border">
        {filterTabs.map(filter => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            className={`shrink-0 px-4 py-2 text-xs font-medium rounded-full border transition-all duration-155 ${
              activeFilter === filter
                ? "bg-foreground text-background border-foreground shadow-sm"
                : "bg-card border-border text-muted-foreground hover:border-neutral-300 dark:hover:border-neutral-700 hover:text-foreground"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* CONTENT REGION */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="h-32 bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-xl" />
                  <div className="space-y-2">
                    <div className="h-4 w-48 bg-muted rounded" />
                    <div className="h-3 w-20 bg-muted rounded" />
                  </div>
                </div>
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
              <div className="h-4 w-5/6 bg-muted/60 rounded" />
              <div className="h-3 w-1/2 bg-muted/40 rounded" />
            </div>
          ))}
        </div>
      ) : datasetFiltered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center shadow-xs flex flex-col items-center justify-center max-w-md mx-auto mt-6">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4 border border-border">
            <Inbox className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold tracking-tight">You're all caught up!</h3>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
            When you receive orders, reviews, settlements or system updates they will appear here.
          </p>
          <button
            type="button"
            onClick={() => loadNotifications(true)}
            className="mt-5 inline-flex items-center justify-center h-8 px-4 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors"
          >
            Refresh
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {datasetFiltered.map(item => {
            const definition = typeConfig[item.type] || fallbackConfig;
            const RowIcon = definition.icon;
            const isNew = item.id === newNotificationId;

            return (
              <div
                key={item.id}
                className={`group rounded-xl border transition-all duration-200 shadow-sm hover:shadow flex relative overflow-hidden ${
                  isNew ? "animate-in slide-in-from-top-4 duration-300" : ""
                } ${
                  item.is_read 
                    ? "bg-card border-border" 
                    : "bg-green-500/[0.03] border-green-500/30 dark:border-green-500/20 border-l-4 border-l-green-500 dark:border-l-green-600 shadow-xs"
                }`}
              >
                <div className="flex items-start gap-4 p-4 md:p-5 w-full">
                  <div className={`w-10 h-10 rounded-xl border ${definition.bg} flex items-center justify-center shrink-0`}>
                    <RowIcon className={`w-4.5 h-4.5 ${definition.color}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold tracking-tight">
                          {item.title}
                        </span>
                        {!item.is_read && (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold bg-green-500 text-white dark:bg-green-600 rounded">
                            NEW
                          </span>
                        )}
                        <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border">
                          {definition.label}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap sm:order-last">
                        {computeDeltaTime(item.created_at)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1.5 font-normal leading-relaxed break-words">
                      {item.message}
                    </p>

                    <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-border/50 justify-end transition-opacity">
                      <button
                        type="button"
                        className="h-7 px-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>

                      {!item.is_read && (
                        <button 
                          type="button"
                          onClick={() => updateItemToRead(item.id)} 
                          className="h-7 px-2.5 rounded-lg text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-500/10 transition-colors flex items-center gap-1.5"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Mark Read</span>
                        </button>
                      )}

                      <button 
                        type="button"
                        onClick={() => removeNotificationEntry(item.id)} 
                        className="h-7 px-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}