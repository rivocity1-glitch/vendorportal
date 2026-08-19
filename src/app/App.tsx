import React, { useState, useEffect } from "react";
import { Login } from "./components/Login";
import { Register } from "./components/pages/Register";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/pages/Dashboard";
import { Orders } from "./components/pages/Orders";
import Invoice from "./components/pages/Invoice";
import { Products } from "./components/pages/Products";
import { AddEditProduct } from "./components/pages/AddEditProduct";
import { Inventory } from "./components/pages/Inventory";
import { Offers } from "./components/pages/Offers";
import { Analytics } from "./components/pages/Analytics";
import { Settlements } from "./components/pages/Settlements";
import { Reviews } from "./components/pages/Reviews";
import { Notifications } from "./components/pages/Notifications";
import StoreManagement from "./components/pages/StoreManagement";
import { Profile } from "./components/pages/Profile";
import { Settings } from "./components/pages/Settings";
import { supabase } from "../lib/supabase";
import Subscriptions from "./components/pages/subscriptions";
import SmartImport from "./components/pages/SmartImport";

// Legal & Info Page Imports
import { VendorTerms } from "./components/legal/VendorTerms";
import VendorPrivacyPolicy from "./components/legal/VendorPrivacyPolicy";
import { VendorRefundPolicy } from "./components/legal/VendorRefundPolicy";
import { VendorDisclaimer } from "./components/legal/VendorDisclaimer";
import { VendorLiability } from "./components/legal/VendorLiability";
import { VendorContact } from "./components/legal/VendorContact";
import { VendorAbout } from "./components/legal/VendorAbout";

type Page =
  | "login"
  | "register"
  | "dashboard"
  | "orders"
  | "invoices"
  | "products"
  | "smart-import"
  | "add-product"
  | "inventory"
  | "offers"
  | "analytics"
  | "settlements"
  | "subscriptions"
  | "reviews"
  | "notifications"
  | "store"
  | "profile"
  | "settings"
  | "terms"
  | "privacy"
  | "refund-policy"
  | "disclaimer"
  | "liability"
  | "contact"
  | "about";

interface VendorMetaState {
  store_name: string;
  shop_code: string;
}

export default function App() {
  const hasSavedToken =
    !!localStorage.getItem("rivo_vendor_session");

  /*
   * IMPORTANT:
   *
   * The website opens:
   *
   * /login
   * /login?view=register
   *
   * The vendor portal is not using React Router.
   *
   * Therefore we read the URL query parameter here and
   * convert it into the internal application page.
   */
  const getInitialPage = (): Page => {
    const params = new URLSearchParams(
      window.location.search
    );

    const view = params.get("view");

    if (!hasSavedToken && view === "register") {
      return "register";
    }

    return hasSavedToken
      ? "dashboard"
      : "login";
  };

  const [isLoggedIn, setIsLoggedIn] =
    useState<boolean>(hasSavedToken);

  const [isValidating, setIsValidating] =
    useState<boolean>(true);

  const [currentPage, setCurrentPage] =
    useState<Page>(getInitialPage());

  const [pageParams, setPageParams] =
    useState<any>(null);

  const [isDark, setIsDark] =
    useState(false);

  const [activeVendor, setActiveVendor] =
    useState<VendorMetaState | null>(null);

  // =========================================================
  // THEME
  // =========================================================

  useEffect(() => {
    const root =
      document.documentElement;

    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDark]);

  // =========================================================
  // ACTIVE SESSION
  // =========================================================

  const checkActiveSession = async () => {
    try {
      const {
        data: { session },
        error,
      } =
        await supabase.auth.getSession();

      if (error || !session) {
        throw new Error(
          "Invalid or expired authorization signature."
        );
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("vendors")
        .select(
          "status, shop_name, shop_code"
        )
        .eq(
          "auth_user_id",
          session.user.id
        )
        .maybeSingle();

      if (
        profileError ||
        !profile
      ) {
        throw new Error(
          "Operational business profile matrix layout records not discovered."
        );
      }

      const cleanStatus =
        profile.status?.toLowerCase();

      if (
        cleanStatus === "approved"
      ) {
        setActiveVendor({
          store_name:
            profile.shop_name ||
            "Unnamed Storefront",

          shop_code:
            profile.shop_code ||
            "SHOP-UNKNOWN",
        });

        setIsLoggedIn(true);
      } else {
        localStorage.removeItem(
          "rivo_vendor_session"
        );

        await supabase.auth.signOut();

        setIsLoggedIn(false);
        setActiveVendor(null);
        setCurrentPage("login");
      }
    } catch (err) {
      localStorage.removeItem(
        "rivo_vendor_session"
      );

      setIsLoggedIn(false);
      setActiveVendor(null);

      /*
       * Preserve the registration page if the visitor
       * arrived from:
       *
       * /login?view=register
       */
      const params =
        new URLSearchParams(
          window.location.search
        );

      if (
        params.get("view") ===
        "register"
      ) {
        setCurrentPage("register");
      } else {
        setCurrentPage("login");
      }
    } finally {
      setIsValidating(false);
    }
  };

  // =========================================================
  // AUTH LISTENER
  // =========================================================

  useEffect(() => {
    checkActiveSession();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (event, session) => {
          if (
            event ===
              "SIGNED_IN" ||
            event ===
              "TOKEN_REFRESHED"
          ) {
            checkActiveSession();
          } else if (
            event === "SIGNED_OUT"
          ) {
            setIsLoggedIn(false);
            setActiveVendor(null);
            setCurrentPage("login");
          }
        }
      );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // =========================================================
  // LOGIN
  // =========================================================

  const handleLoginSuccess = () => {
    checkActiveSession();

    setIsLoggedIn(true);
    setCurrentPage("dashboard");

    /*
     * Remove register query after successful login.
     */
    if (
      window.location.search
    ) {
      window.history.replaceState(
        {},
        "",
        window.location.pathname
      );
    }
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = async () => {
    localStorage.removeItem(
      "rivo_vendor_session"
    );

    await supabase.auth.signOut();

    setIsLoggedIn(false);
    setActiveVendor(null);
    setCurrentPage("login");

    window.history.replaceState(
      {},
      "",
      window.location.pathname
    );
  };

  // =========================================================
  // NAVIGATION
  // =========================================================

  const handleNavigate = (
    page: string,
    params?: any
  ) => {
    setCurrentPage(
      page as Page
    );

    setPageParams(
      params || null
    );

    /*
     * Keep URL clean for the internal application
     * navigation system.
     */
    if (
      page !== "register"
    ) {
      window.history.replaceState(
        {},
        "",
        window.location.pathname
      );
    }
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (isValidating) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center dark:bg-zinc-950">
        <div className="text-xs font-bold tracking-widest text-slate-400 dark:text-zinc-500 animate-pulse uppercase">
          Verifying security keys...
        </div>
      </div>
    );
  }

  // =========================================================
  // AUTH PAGES
  // =========================================================

  if (!isLoggedIn) {
    if (
      currentPage ===
      "register"
    ) {
      return (
        <Register
          onNavigateToLogin={() => {
            setCurrentPage(
              "login"
            );

            window.history.replaceState(
              {},
              "",
              window.location.pathname
            );
          }}
        />
      );
    }

    return (
      <Login
        onLogin={
          handleLoginSuccess
        }
        onNavigateToRegister={() => {
          setCurrentPage(
            "register"
          );

          /*
           * Keep the registration state in the URL too.
           */
          const url =
            `${window.location.pathname}?view=register`;

          window.history.replaceState(
            {},
            "",
            url
          );
        }}
      />
    );
  }

  // =========================================================
  // APP PAGES
  // =========================================================

  const renderPage = () => {
    switch (
      currentPage
    ) {
      case "dashboard":
        return (
          <Dashboard
            onNavigate={
              handleNavigate
            }
          />
        );

      case "orders":
        return <Orders />;

      case "invoices":
        return <Invoice />;

      case "products":
        return (
          <Products
            onNavigate={
              handleNavigate
            }
          />
        );

      case "smart-import":
        return (
          <SmartImport
            onNavigate={
              handleNavigate
            }
          />
        );

      case "add-product":
        return (
          <AddEditProduct
            onNavigate={
              handleNavigate
            }
            product={
              pageParams?.product
            }
          />
        );

      case "inventory":
        return <Inventory />;

      case "offers":
        return <Offers />;

      case "analytics":
        return <Analytics />;

      case "settlements":
        return <Settlements />;

      case "subscriptions":
        return <Subscriptions />;

      case "reviews":
        return <Reviews />;

      case "notifications":
        return <Notifications />;

      case "store":
        return <StoreManagement />;

      case "profile":
        return <Profile />;

      case "settings":
        return (
          <Settings
            isDark={isDark}
            onToggleTheme={() =>
              setIsDark(
                !isDark
              )
            }
            onNavigate={
              handleNavigate
            }
          />
        );

      case "terms":
        return (
          <VendorTerms
            onBack={() =>
              handleNavigate(
                "settings"
              )
            }
            onContactSupport={() =>
              handleNavigate(
                "contact"
              )
            }
          />
        );

      case "privacy":
        return (
          <VendorPrivacyPolicy
            onBack={() =>
              handleNavigate(
                "settings"
              )
            }
            onContactSupport={() =>
              handleNavigate(
                "contact"
              )
            }
          />
        );

      case "refund-policy":
        return (
          <VendorRefundPolicy
            onBack={() =>
              handleNavigate(
                "settings"
              )
            }
            onContactSupport={() =>
              handleNavigate(
                "contact"
              )
            }
          />
        );

      case "disclaimer":
        return (
          <VendorDisclaimer
            onBack={() =>
              handleNavigate(
                "settings"
              )
            }
            onContactSupport={() =>
              handleNavigate(
                "contact"
              )
            }
          />
        );

      case "liability":
        return (
          <VendorLiability
            onBack={() =>
              handleNavigate(
                "settings"
              )
            }
            onContactSupport={() =>
              handleNavigate(
                "contact"
              )
            }
          />
        );

      case "contact":
        return (
          <VendorContact
            onBack={() =>
              handleNavigate(
                "settings"
              )
            }
          />
        );

      case "about":
        return (
          <VendorAbout
            onBack={() =>
              handleNavigate(
                "settings"
              )
            }
          />
        );

      default:
        return (
          <Dashboard
            onNavigate={
              handleNavigate
            }
          />
        );
    }
  };

  // =========================================================
  // MAIN LAYOUT
  // =========================================================

  return (
    <Layout
      currentPage={
        currentPage as any
      }
      onNavigate={
        handleNavigate
      }
      onLogout={
        handleLogout
      }
      isDark={isDark}
      onToggleTheme={() =>
        setIsDark(
          !isDark
        )
      }
      vendorMeta={
        activeVendor
      }
    >
      {renderPage()}
    </Layout>
  );
}
