import React, { useState, useEffect } from "react";
import { Login } from "./components/Login";
import { Register } from "./components/pages/Register";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/pages/Dashboard";
import { Orders } from "./components/pages/Orders";
import { Products } from "./components/pages/Products";
import { AddEditProduct } from "./components/pages/AddEditProduct";
import { Inventory } from "./components/pages/Inventory";
import { Offers } from "./components/pages/Offers";
import { Analytics } from "./components/pages/Analytics";
import { Settlements } from "./components/pages/Settlements";
import { Reviews } from "./components/pages/Reviews";
import { Notifications } from "./components/pages/Notifications";
import { StoreManagement } from "./components/pages/StoreManagement";
import { Profile } from "./components/pages/Profile";
import { Settings } from "./components/pages/Settings";
import { supabase } from "../lib/supabase";

type Page =
  | "login" | "register"
  | "dashboard" | "orders" | "products" | "add-product" | "inventory"
  | "offers" | "analytics" | "settlements" | "reviews" | "notifications"
  | "store" | "profile" | "settings";

interface VendorMetaState {
  store_name: string;
  shop_code: string;
}

export default function App() {
  const hasSavedToken = !!localStorage.getItem("rivo_vendor_session");

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(hasSavedToken);
  const [isValidating, setIsValidating] = useState<boolean>(true); // Keeps loading indicator solid during token checks
  const [currentPage, setCurrentPage] = useState<Page>(hasSavedToken ? "dashboard" : "login");
  const [isDark, setIsDark] = useState(false);
  const [activeVendor, setActiveVendor] = useState<VendorMetaState | null>(null); // ✅ Added real-time global meta state hook

  // Theme Toggling Effect
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDark]);

  // Combined Active Session & Core Meta Data Retrieval Handshake
  const checkActiveSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        throw new Error("Invalid or expired authorization signature.");
      }

      // Query core business parameters from your real base table
      const { data: profile, error: profileError } = await supabase
        .from("vendors")
        .select("status, shop_name, shop_code")
        .eq("auth_user_id", session.user.id)
        .maybeSingle();

      if (profileError || !profile) {
        throw new Error("Operational business profile matrix layout records not discovered.");
      }

      const cleanStatus = profile.status?.toLowerCase();

      if (cleanStatus === "approved") {
        // ✅ Synchronize live backend database variables straight to client context engine
        setActiveVendor({
          store_name: profile.shop_name || "Unnamed Storefront",
          shop_code: profile.shop_code || "SHOP-UNKNOWN"
        });
        setIsLoggedIn(true);
      } else {
        localStorage.removeItem("rivo_vendor_session");
        await supabase.auth.signOut();
        setIsLoggedIn(false);
        setActiveVendor(null);
        setCurrentPage("login");
      }
    } catch (err) {
      localStorage.removeItem("rivo_vendor_session");
      setIsLoggedIn(false);
      setActiveVendor(null);
      setCurrentPage("login");
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    checkActiveSession();

    // Catch instant signouts or cross-tab handshakes real-time
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        checkActiveSession();
      } else if (event === "SIGNED_OUT") {
        setIsLoggedIn(false);
        setActiveVendor(null);
        setCurrentPage("login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLoginSuccess = () => {
    checkActiveSession(); // Re-trigger mapping fetch instantly upon successful login handler trigger
    setIsLoggedIn(true);
    setCurrentPage("dashboard");
  };

  const handleLogout = async () => {
    localStorage.removeItem("rivo_vendor_session");
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setActiveVendor(null);
    setCurrentPage("login");
  };

  const handleNavigate = (page: string) => setCurrentPage(page as any);

  if (isValidating) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center dark:bg-zinc-950">
        <div className="text-xs font-bold tracking-widest text-slate-400 dark:text-zinc-500 animate-pulse uppercase">
          Verifying security keys...
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    if (currentPage === "register") {
      return <Register onNavigateToLogin={() => setCurrentPage("login")} />;
    }
    
    return (
      <Login 
        onLogin={handleLoginSuccess} 
        onNavigateToRegister={() => setCurrentPage("register")} 
      />
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard onNavigate={handleNavigate} />;
      case "orders":
        return <Orders />;
      case "products":
        return <Products onNavigate={handleNavigate} />;
      case "add-product":
        return <AddEditProduct onNavigate={handleNavigate} />;
      case "inventory":
        return <Inventory />;
      case "offers":
        return <Offers />;
      case "analytics":
        return <Analytics />;
      case "settlements":
        return <Settlements />;
      case "reviews":
        return <Reviews />;
      case "notifications":
        return <Notifications />;
      case "store":
        return <StoreManagement />;
      case "profile":
        return <Profile />;
      case "settings":
        return <Settings isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      isDark={isDark}
      onToggleTheme={() => setIsDark(!isDark)}
      vendorMeta={activeVendor} // ✅ Injected real-time database contextual bindings straight into our menu layout tree
    >
      {renderPage()}
    </Layout>
  );
}