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

type Page =
  | "login" | "register"
  | "dashboard" | "orders" | "products" | "add-product" | "inventory"
  | "offers" | "analytics" | "settlements" | "reviews" | "notifications"
  | "store" | "profile" | "settings";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>("login");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDark]);

  const handleLogin = () => {
    setIsLoggedIn(true);
    setCurrentPage("dashboard");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentPage("login");
  };

  // FIXED: Changed type assertion to any
  const handleNavigate = (page: string) => setCurrentPage(page as any);

  if (!isLoggedIn) {
    if (currentPage === "register") {
      return <Register onNavigateToLogin={() => setCurrentPage("login")} />;
    }
    
    return (
      <Login 
        onLogin={handleLogin} 
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
    >
      {renderPage()}
    </Layout>
  );
}