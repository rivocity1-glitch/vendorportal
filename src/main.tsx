import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import VendorLiteApp from "./app/VendorLiteApp.tsx";
// @ts-ignore: allow side-effect CSS import without type declarations
import "./styles/index.css";
import "./lib/normalizeProductImageSrc";
import "./i18n";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(error => console.warn("PWA service worker registration failed:", error));
  });
}

const isVendorLite = new URLSearchParams(window.location.search).get("lite") === "1";
createRoot(document.getElementById("root")!).render(isVendorLite ? <VendorLiteApp /> : <App />);
