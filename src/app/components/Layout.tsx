import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, ShoppingBag, FileText, Package, Boxes, Tag, BarChart3,
  Wallet, CreditCard, Star, Bell, Store, User, Settings, Zap, Menu, X,
  ChevronRight, Moon, Sun, LogOut
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { notificationService } from "../../services/notificationService";
import { notificationSync } from "../../lib/notificationSync";

type Page =
  | "dashboard" | "orders" | "invoices" | "products" | "add-product" | "inventory"
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

interface NotificationItem {
  id: string;
  title: string;
  created_at: string;
  is_read: boolean;
  icon_type?: string;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, visible: true },
  { id: "orders", label: "Orders", icon: ShoppingBag, hasBadge: true, badgeKey: "orders", visible: true },
  { id: "invoices", label: "Invoices", icon: FileText, visible: true },
  { id: "products", label: "Products", icon: Package, visible: true },
  { id: "inventory", label: "Inventory", icon: Boxes, visible: true },
  { id: "offers", label: "Offers & Marketing", icon: Tag, visible: false },
  { id: "analytics", label: "Analytics", icon: BarChart3, visible: false },
  { id: "settlements", label: "Settlements", icon: Wallet, visible: true },
  { id: "subscriptions", label: "Subscriptions", icon: CreditCard, visible: true },
  { id: "reviews", label: "Reviews", icon: Star, visible: false },
  { id: "notifications", label: "Notifications", icon: Bell, hasBadge: true, badgeKey: "notifications", visible: true },
  { id: "store", label: "Store Management", icon: Store, visible: true },
  { id: "profile", label: "Profile", icon: User, visible: true },
  { id: "settings", label: "Settings", icon: Settings, visible: true },
] as const;

export function Layout({ currentPage, onNavigate, onLogout, isDark, onToggleTheme, children, vendorMeta }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [latestNotifications, setLatestNotifications] = useState<NotificationItem[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [animateBell, setAnimateBell] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Store status context variables
  const [storeStatus, setStoreStatus] = useState<"open" | "busy" | "closed">("open");
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // State to handle the focused status of the native select and change transition clicks
  const [selectFocused, setSelectFocused] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const fetchInitialData = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return;

      const { data: vendorProfile } = await supabase
        .from("vendors")
        .select("id")
        .eq("auth_user_id", authData.user.id)
        .single();

      if (vendorProfile) {
        const { count: ordersCount } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("vendor_id", vendorProfile.id)
          .eq("order_status", "pending");

        if (ordersCount !== null) {
          setPendingOrdersCount(ordersCount);
        }

        // Fetch vendor store status safely from vendor_profiles matrix table
        const { data: profileData } = await supabase
          .from("vendor_profiles")
          .select("store_status")
          .eq("vendor_id", vendorProfile.id)
          .maybeSingle();

        if (profileData?.store_status) {
          const val = profileData.store_status.toLowerCase();
          if (val === "open" || val === "busy" || val === "closed") {
            setStoreStatus(val);
          }
        }

        // Fetch unread notification count via notificationService unpacking ServiceResponse wrapper
        const countResult = await notificationService.getUnreadNotificationCount(vendorProfile.id, "vendor");
        if (countResult.success) {
          setUnreadNotificationsCount(countResult.data?.count ?? 0);
        }

        // Fetch latest notifications via notificationService unpacking ServiceResponse wrapper
        const notificationsResult = await notificationService.fetchNotifications(vendorProfile.id, "vendor", 1, 5);
        if (notificationsResult.success) {
          setLatestNotifications(notificationsResult.data ?? []);
        }
      }
    } catch (err) {
      console.error("Failed to initialize counts:", err);
    }
  };

  useEffect(() => {
    fetchInitialData();

    let orderChannel: any;

    const setupSubscriptions = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return;

      const { data: vendorProfile } = await supabase
        .from("vendors")
        .select("id")
        .eq("auth_user_id", authData.user.id)
        .single();

      if (vendorProfile) {
        const refreshNotificationsData = async () => {
          const countResult = await notificationService.getUnreadNotificationCount(vendorProfile.id, "vendor");
          if (countResult.success) {
            setUnreadNotificationsCount(countResult.data?.count ?? 0);
          }

          const notificationsResult = await notificationService.fetchNotifications(vendorProfile.id, "vendor", 1, 5);
          if (notificationsResult.success) {
            setLatestNotifications(notificationsResult.data ?? []);
          }
        };

        // Realtime notification sync hook integration
        notificationSync.startNotificationSync(vendorProfile.id, "vendor", {
          onInsert: () => {
            setAnimateBell(true);
            setTimeout(() => setAnimateBell(false), 500);
            refreshNotificationsData();
          },
          onUpdate: () => {
            refreshNotificationsData();
          },
          onDelete: () => {
            refreshNotificationsData();
          }
        });

        orderChannel = supabase
          .channel("orders-sync")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "orders",
              filter: `vendor_id=eq.${vendorProfile.id}`
            },
            async () => {
              const { count: ordersCount } = await supabase
                .from("orders")
                .select("id", { count: "exact", head: true })
                .eq("vendor_id", vendorProfile.id)
                .eq("order_status", "pending");

              if (ordersCount !== null) {
                setPendingOrdersCount(ordersCount);
              }
            }
          )
          .subscribe();
      }
    };

    setupSubscriptions();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      notificationSync.stopNotificationSync();
      if (orderChannel) supabase.removeChannel(orderChannel);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = e.target.value as "open" | "busy" | "closed";
    try {
      setUpdatingStatus(true);
      setStatusError(null);
      setIsChanging(true);
      setTimeout(() => setIsChanging(false), 200);
      
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) throw new Error("No active authentication token signature discovered.");

      const { data: vendorProfile } = await supabase
        .from("vendors")
        .select("id")
        .eq("auth_user_id", authData.user.id)
        .single();

      if (!vendorProfile) throw new Error("Merchant identifier missing.");

      const { error } = await supabase
        .from("vendor_profiles")
        .update({ store_status: nextStatus })
        .eq("vendor_id", vendorProfile.id);

      if (error) throw error;
      setStoreStatus(nextStatus);
    } catch (err: any) {
      setStatusError(err.message || "Failed to commit operational code.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out standard error:", err);
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
    invoices: "Invoices",
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

  const formatBadgeCount = (count: number) => {
    return count > 99 ? "99+" : count;
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return "";
    }
  };

  const statusColors = {
    open: "bg-green-500",
    busy: "bg-yellow-500",
    closed: "bg-red-500",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-60 flex flex-col bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
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

        <div className="px-4 py-3 border-b border-[var(--sidebar-border)] space-y-1.5">
          <div 
            className={`relative flex items-center bg-muted/40 dark:bg-muted/20 border rounded-lg px-3 py-1.5 group cursor-pointer shadow-sm hover:shadow-md hover:bg-muted/50 dark:hover:bg-muted/30 transition-all duration-300 ${
              selectFocused 
                ? "border-[#10B981] ring-2 ring-[#10B981]/20 shadow-md shadow-[#10B981]/5" 
                : "border-border"
            } ${
              isChanging ? "scale-98" : "hover:scale-[1.01]"
            }`}
          >
            <span 
              className={`w-2 h-2 rounded-full shrink-0 mr-2 transition-all duration-300 ${
                updatingStatus 
                  ? "bg-muted-foreground animate-pulse scale-110" 
                  : statusColors[storeStatus]
              }`} 
            />
            <select
              disabled={updatingStatus}
              value={storeStatus}
              onChange={handleStatusChange}
              onFocus={() => setSelectFocused(true)}
              onBlur={() => setSelectFocused(false)}
              className="w-full bg-transparent text-xs font-medium text-foreground outline-none cursor-pointer disabled:cursor-not-allowed appearance-none pr-6 z-10"
            >
              <option value="open" className="bg-card text-foreground">Open</option>
              <option value="busy" className="bg-card text-foreground">Busy</option>
              <option value="closed" className="bg-card text-foreground">Closed</option>
            </select>
            <div 
              className={`absolute right-3 pointer-events-none text-muted-foreground transition-transform duration-300 ${
                selectFocused ? "rotate-180" : ""
              }`}
            >
              <ChevronRight className="w-3 h-3 rotate-90" />
            </div>
          </div>
          {statusError && (
            <p className="text-[10px] font-medium text-red-500 leading-tight px-1 truncate">
              {statusError}
            </p>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {navItems
            .filter(item => item.visible)
            .map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.id || (currentPage === "add-product" && item.id === "products");
              
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
                  
                  {targetCount > 0 ? (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#EF4444] text-white shadow-sm transition-all ${unreadNotificationsCount > 0 ? "animate-pulse" : ""}`}>
                      {formatBadgeCount(targetCount)}
                    </span>
                  ) : null}
                </button>
              );
            })}
        </nav>

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

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
            
            <div 
              className="relative" 
              ref={dropdownRef}
              onMouseEnter={() => setDropdownOpen(true)}
            >
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`relative w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all ${animateBell ? "animate-bounce" : ""}`}
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#EF4444] text-white shadow-sm shadow-[#EF4444]/40 animate-pulse">
                    {formatBadgeCount(unreadNotificationsCount)}
                  </span>
                )}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-card border border-border rounded-lg shadow-xl z-50 py-2">
                  <div className="px-4 py-2 border-b border-border font-semibold text-xs text-muted-foreground">
                    Recent Notifications
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {latestNotifications.length === 0 ? (
                      <div className="px-4 py-4 text-xs text-muted-foreground text-center">
                        No recent notifications
                      </div>
                    ) : (
                      latestNotifications.map((notification) => (
                        <div 
                          key={notification.id} 
                          className={`flex items-start gap-3 px-4 py-2.5 hover:bg-muted transition-colors border-b border-border last:border-0 text-left cursor-pointer ${!notification.is_read ? "bg-muted/30" : ""}`}
                          onClick={() => {
                            setDropdownOpen(false);
                            onNavigate("notifications");
                          }}
                        >
                          <div className="mt-0.5 text-[#10B981]">
                            <Bell className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs text-foreground truncate ${!notification.is_read ? "font-semibold" : "font-normal"}`}>
                              {notification.title}
                            </p>
                            <span className="text-[10px] text-muted-foreground block mt-0.5">
                              {formatTime(notification.created_at)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-2 pt-2 border-t border-border">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onNavigate("notifications");
                      }}
                      className="w-full text-center text-xs font-medium text-[#10B981] hover:text-[#059669] py-1 rounded transition-colors block"
                    >
                      View All
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => onNavigate("profile")}
              className="w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center text-white text-xs font-bold hover:bg-[#059669] transition-colors uppercase"
            >
              {getInitials()}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}