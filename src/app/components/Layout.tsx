import React, { useState, useEffect } from "react";
import {
  LayoutDashboard, ShoppingBag, Package, Boxes, Tag, BarChart3,
  Wallet, CreditCard, Star, Bell, Store, User, Settings, Zap, Menu, X,
  ChevronRight, Moon, Sun, LogOut
} from "lucide-react";
import { supabase } from "../../lib/supabase";

type Page =
  | "dashboard" | "orders" | "products" | "add-product" | "inventory"
  | "offers" | "analytics" | "settlements" | "subscriptions"
  | "reviews" | "notifications"
  | "store" | "profile" | "settings" | "register";

interface LayoutProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  children: React.ReactNode;
  vendorMeta?: { store_name: string; shop_code: string } | null;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: ShoppingBag, hasBadge: true, badgeKey: "orders" },
  { id: "products", label: "Products", icon: Package },
  { id: "inventory", label: "Inventory", icon: Boxes },
  { id: "offers", label: "Offers & Marketing", icon: Tag },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settlements", label: "Settlements", icon: Wallet },
  { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "notifications", label: "Notifications", icon: Bell, hasBadge: true, badgeKey: "notifications" },
  { id: "store", label: "Store Management", icon: Store },
  { id: "profile", label: "Profile", icon: User },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export function Layout({ currentPage, onNavigate, onLogout, isDark, onToggleTheme, children, vendorMeta }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Dynamic Live Counts State Management
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

  // Automated Badge Aggregation Engine
  const fetchLiveCounts = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return;

      // 1. Core Orders Count Mapping (Using schema-isolated vendor profile verification matching)
      const { data: vendorProfile } = await supabase
        .from("vendors")
        .select("id")
        .eq("auth_user_id", authData.user.id)
        .single();

      if (vendorProfile) {
        const { count: ordersCount, error: ordersErr } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("vendor_id", vendorProfile.id)
          .eq("order_status", "pending");

        if (!ordersErr && ordersCount !== null) {
          setPendingOrdersCount(ordersCount);
        }
      }

      // 2. Unread System Alerts Calculation Pipeline
      const { count: notifyCount, error: notifyErr } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("auth_user_id", authData.user.id)
        .eq("is_read", false);

      if (!notifyErr && notifyCount !== null) {
        setUnreadNotificationsCount(notifyCount);
      }
    } catch (err) {
      console.error("Failed to synchronise realtime structural badges context counters:", err);
    }
  };

  // Dedicated Background Polling Context Subsystems
  useEffect(() => {
    fetchLiveCounts();
    const intervalId = setInterval(fetchLiveCounts, 30000); // Trigger live updates exactly every 30 seconds
    return () => clearInterval(intervalId);
  }, []);

  // Secure Sign-Out Interceptor Pipeline
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out transaction request timed out:", err);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      onLogout();
      window.location.href = "/login";
    }
  };

  const pageLabels: Record<string, string> = {
    dashboard: "Dashboard",
    orders: "Orders",
    products: "Products",
    "add-product": "Add Product",
    inventory: "Inventory",
    offers: "Offers & Marketing",
    analytics: "Analytics",
    settlements: "Settlements",
    subscriptions: "Subscriptions",
    reviews: "Reviews",
    notifications: "Notifications",
    store: "Store Management",
    profile: "Profile",
    settings: "Settings",
  };

  const getInitials = () => {
    if (!vendorMeta?.store_name) return "VB";
    return vendorMeta.store_name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-60 flex flex-col bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--sidebar-border)]">
          <div className="w-8 h-8 rounded-lg bg-[#10B981] flex items-center justify-center shadow-md shadow-[#10B981]/30">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-[var(--sidebar-foreground)] tracking-tight">Rivo</span>
            <p className="text-[10px] text-[var(--muted-foreground)] leading-none mt-0.5 truncate">Vendor Portal</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-[var(--muted-foreground)] hover:text-[var(--sidebar-foreground)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Store status chip */}
        <div className="px-4 py-3 border-b border-[var(--sidebar-border)]">
          <div className="flex items-center gap-2 bg-[#ECFDF5] dark:bg-[#064E3B]/40 rounded-lg px-3 py-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-xs font-medium text-[#065F46] dark:text-[#6EE7B7]">Store Open</span>
            <ChevronRight className="w-3 h-3 ml-auto text-[#6EE7B7] dark:text-[#6EE7B7]" />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id || (currentPage === "add-product" && item.id === "products");
            
            // Dynamic allocation metrics definition calculations 
            let targetCount = 0;
            if ("hasBadge" in item && item.hasBadge) {
              targetCount = item.badgeKey === "orders" ? pendingOrdersCount : unreadNotificationsCount;
            }

            return (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id as Page); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 text-sm transition-all group ${
                  isActive
                    ? "bg-[#10B981] text-white shadow-md shadow-[#10B981]/20"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-foreground)]"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                
                {/* Dynamically Styled Real-time Indicators Block */}
                {targetCount > 0 ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#EF4444] text-white animate-pulse shadow-xs">
                    {targetCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-2 py-3 border-t border-[var(--sidebar-border)] space-y-1">
          <div className="px-3 py-2 rounded-lg bg-[var(--muted)]/50 min-w-0">
            <p className="text-xs font-bold text-[var(--foreground)] truncate">
              {vendorMeta?.store_name || "Syncing Profile..."}
            </p>
            <p className="text-[10px] font-medium text-[var(--muted-foreground)] truncate mt-0.5">
              {vendorMeta?.shop_code || "SHOP-PENDING"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--muted-foreground)] hover:text-[#EF4444] hover:bg-[#FEF2F2] transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-14 flex items-center gap-4 px-4 lg:px-6 border-b border-border bg-card shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-foreground truncate">{pageLabels[currentPage]}</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleTheme}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onNavigate("notifications")}
              className="relative w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
              )}
            </button>
            <button
              onClick={() => onNavigate("profile")}
              className="w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center text-white text-xs font-bold hover:bg-[#059669] transition-colors uppercase"
            >
              {getInitials()}
            </button>
          </div>
        </header>

        {/* Page Content viewport */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}