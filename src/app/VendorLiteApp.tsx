import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, X, Clock3, IndianRupee, PackageCheck, RefreshCw, LogOut, Store, Download, Smartphone } from "lucide-react";
import { Login } from "./components/Login";
import { supabase } from "../lib/supabase";

type LiteOrder = {
  id: string;
  order_number: string;
  order_status: string;
  total_amount: number | null;
  vendor_earning: number | null;
  payment_method: string | null;
  created_at: string;
  items: { product_name: string | null; quantity: number; unit_price: number }[];
};

type VendorInfo = { id: string; shop_name: string | null; status: string };

export default function VendorLiteApp() {
  const [vendor, setVendor] = useState<VendorInfo | null>(null);
  const [orders, setOrders] = useState<LiteOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyOrder, setBusyOrder] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"new" | "active" | "completed">("new");
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError("");
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Please sign in again.");
      const { data: vendorRow, error: vendorError } = await supabase
        .from("vendors")
        .select("id, shop_name, status")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (vendorError) throw vendorError;
      if (!vendorRow || String(vendorRow.status).toLowerCase() !== "approved") {
        throw new Error("Approved vendor account not found.");
      }
      setVendor(vendorRow as VendorInfo);
      const { data: orderRows, error: orderError } = await supabase
        .from("orders")
        .select("id, order_number, order_status, total_amount, vendor_earning, payment_method, created_at, delivered_at")
        .eq("vendor_id", vendorRow.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (orderError) throw orderError;
      const rows = orderRows || [];
      const ids = rows.map(row => row.id);
      let grouped = new Map<string, LiteOrder["items"]>();
      if (ids.length) {
        const { data: itemRows, error: itemError } = await supabase
          .from("order_items")
          .select("order_id, product_name, quantity, unit_price")
          .in("order_id", ids);
        if (itemError) throw itemError;
        (itemRows || []).forEach(item => {
          const list = grouped.get(item.order_id) || [];
          list.push({ product_name: item.product_name, quantity: Number(item.quantity || 0), unit_price: Number(item.unit_price || 0) });
          grouped.set(item.order_id, list);
        });
      }
      setOrders(rows.map(row => ({ ...row, items: grouped.get(row.id) || [] })) as LiteOrder[]);
    } catch (err: any) {
      setError(err?.message || "Unable to load vendor information.");
      setVendor(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const start = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (alive && session) await loadData();
      else if (alive) setLoading(false);
    };
    void start();
    const timer = window.setInterval(() => { void loadData(false); }, 30000);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") window.setTimeout(() => { void loadData(); }, 0);
      if (event === "SIGNED_OUT") { setVendor(null); setOrders([]); setLoading(false); }
    });
    return () => { alive = false; window.clearInterval(timer); subscription.unsubscribe(); };
  }, [loadData]);

  const metrics = useMemo(() => {
    const delivered = orders.filter(order => order.order_status.toLowerCase() === "delivered");
    const today = new Date().toLocaleDateString("en-CA");
    const todayDelivered = delivered.filter(order => new Date(order.delivered_at || order.created_at).toLocaleDateString("en-CA") === today);
    return {
      todayEarnings: todayDelivered.reduce((sum, order) => sum + Number(order.vendor_earning || 0), 0),
      totalEarnings: delivered.reduce((sum, order) => sum + Number(order.vendor_earning || 0), 0),
      completed: delivered.length,
      pending: orders.filter(order => order.order_status.toLowerCase() === "pending").length
    };
  }, [orders]);

  const updateOrder = async (order: LiteOrder, action: "accept" | "reject") => {
    if (!vendor || busyOrder) return;
    setBusyOrder(order.id);
    setError("");
    try {
      if (action === "accept") {
        const { data: items, error: itemsError } = await supabase
          .from("order_items").select("product_id, quantity").eq("order_id", order.id);
        if (itemsError) throw itemsError;
        const stockUpdates: { productId: string; stock: number }[] = [];
        for (const item of items || []) {
          const { data: product, error: productError } = await supabase
            .from("products").select("name, stock").eq("id", item.product_id).maybeSingle();
          if (productError) throw productError;
          const stock = Number(product?.stock || 0);
          const quantity = Number(item.quantity || 0);
          if (quantity > stock) throw new Error(`${product?.name || "An item"} has only ${stock} in stock; ${quantity} requested. Please update stock in the full Vendor Portal.`);
          stockUpdates.push({ productId: item.product_id, stock: stock - quantity });
        }
        for (const update of stockUpdates) {
          const { error: stockError } = await supabase.from("products").update({ stock: update.stock }).eq("id", update.productId);
          if (stockError) throw stockError;
        }
      }

      const nextStatus = action === "accept" ? "accepted" : "cancelled";
      let query = supabase.from("orders").update(action === "accept"
        ? { order_status: nextStatus }
        : { order_status: nextStatus, cancelled_by: "vendor", cancel_reason: "Order rejected by vendor", cancelled_at: new Date().toISOString() })
        .eq("id", order.id).eq("vendor_id", vendor.id).eq("order_status", "pending");
      const { data, error: updateError } = await query.select("id");
      if (updateError) throw updateError;
      if (!data?.length) throw new Error("This order is no longer pending. Refreshing the order list.");
      const { error: trackingError } = await supabase.from("order_tracking").insert({
        order_id: order.id, status: nextStatus,
        remarks: action === "accept" ? "Order accepted by vendor" : "Order rejected by vendor"
      });
      if (trackingError) throw trackingError;
      await loadData(false);
    } catch (err: any) {
      setError(err?.message || "Order update failed.");
      await loadData(false);
    } finally {
      setBusyOrder(null);
    }
  };

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("rivo_vendor_session");
    setVendor(null);
    setOrders([]);
  };

  if (!vendor) {
    return <div className="min-h-screen bg-slate-50">
      <div className="px-4 pt-8 pb-4 text-center"><div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500 text-white"><Store /></div><h1 className="text-xl font-bold text-slate-900">RivoCity Vendor Lite</h1><p className="mt-1 text-sm text-slate-500">Orders and earnings, without the extra tools.</p></div>
      {loading ? <p className="py-10 text-center text-sm text-slate-500">Checking your session…</p> : <Login onLogin={() => { void loadData(); }} onNavigateToRegister={() => { window.location.href = "/"; }} />}
      {error && <p className="mx-4 mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>;
  }

  const visibleOrders = orders.filter(order => {
    const status = order.order_status.toLowerCase();
    if (tab === "new") return status === "pending";
    if (tab === "active") return ["accepted", "preparing", "packed", "ready_for_pickup", "waiting_rider", "out_for_delivery"].includes(status);
    return status === "delivered" || status === "cancelled";
  });

  return <main className="min-h-screen bg-slate-50 pb-8 text-slate-900">
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">RivoCity</p><h1 className="truncate text-lg font-bold">Vendor Lite</h1><p className="truncate text-xs text-slate-500">{vendor.shop_name || "Your store"}</p></div>
        <div className="flex shrink-0 items-center gap-2">
          {installPrompt && <button onClick={install} className="rounded-xl bg-emerald-50 p-2 text-emerald-700" aria-label="Install app"><Download size={18}/></button>}
          <button onClick={() => void loadData()} className="rounded-xl border border-slate-200 p-2" aria-label="Refresh"><RefreshCw size={18}/></button>
          <button onClick={signOut} className="rounded-xl border border-slate-200 p-2" aria-label="Sign out"><LogOut size={18}/></button>
        </div>
      </div>
    </header>
    <div className="mx-auto max-w-xl space-y-4 px-4 pt-4">
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <section className="grid grid-cols-2 gap-3">
        <Metric label="Today's earnings" value={`₹${metrics.todayEarnings.toLocaleString("en-IN")}`} icon={<IndianRupee size={17}/>} />
        <Metric label="Total earnings" value={`₹${metrics.totalEarnings.toLocaleString("en-IN")}`} icon={<IndianRupee size={17}/>} />
        <Metric label="Completed orders" value={String(metrics.completed)} icon={<PackageCheck size={17}/>} />
        <Metric label="New orders" value={String(metrics.pending)} icon={<Clock3 size={17}/>} />
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Orders</h2><span className="text-xs text-slate-500">{orders.length} recent</span></div>
        <div className="mb-3 grid grid-cols-3 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          {(["new", "active", "completed"] as const).map(key => <button key={key} onClick={() => setTab(key)} className={`rounded-lg px-2 py-2 capitalize ${tab === key ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"}`}>{key}</button>)}
        </div>
        {loading ? <p className="py-8 text-center text-sm text-slate-500">Loading orders…</p> : visibleOrders.length === 0 ? <div className="py-8 text-center text-sm text-slate-500">No {tab} orders.</div> : <div className="space-y-3">
          {visibleOrders.map(order => {
            const pending = order.order_status.toLowerCase() === "pending";
            return <article key={order.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-bold">#{order.order_number}</p><p className="mt-0.5 text-[11px] text-slate-500">{new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold capitalize text-slate-600">{order.order_status.replaceAll("_", " ")}</span></div>
              <div className="mt-3 space-y-1">{order.items.map((item, index) => <div key={index} className="flex justify-between gap-3 text-xs"><span className="min-w-0">{item.product_name || "Product"} × {item.quantity}</span><span className="shrink-0 text-slate-500">₹{(item.unit_price * item.quantity).toLocaleString("en-IN")}</span></div>)}</div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2"><span className="text-xs text-slate-500">{order.payment_method || "Payment pending"}</span><strong className="text-sm">₹{Number(order.total_amount || 0).toLocaleString("en-IN")}</strong></div>
              {pending && <div className="mt-3 grid grid-cols-2 gap-2"><button disabled={busyOrder === order.id} onClick={() => void updateOrder(order, "accept")} className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-sm font-bold text-white disabled:opacity-50"><Check size={16}/>{busyOrder === order.id ? "Please wait" : "Accept"}</button><button disabled={busyOrder === order.id} onClick={() => { if (window.confirm("Reject this order?")) void updateOrder(order, "reject"); }} className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-red-50 text-sm font-bold text-red-700 disabled:opacity-50"><X size={16}/>Reject</button></div>}
            </article>;
          })}
        </div>}
      </section>
      <p className="flex items-center justify-center gap-1 text-center text-[11px] text-slate-400"><Smartphone size={13}/> Refreshes automatically every 30 seconds</p>
    </div>
  </main>;
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><div className="mb-2 flex items-center justify-between text-emerald-600"><span className="text-[11px] font-medium text-slate-500">{label}</span>{icon}</div><p className="text-xl font-extrabold tracking-tight">{value}</p></div>;
}
