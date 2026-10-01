import React, { useEffect, useMemo, useState } from "react";
import { Boxes, Plus, RefreshCw, Trash2, UserPlus, MapPin, Package, LifeBuoy } from "lucide-react";
import { supabase } from "../../../lib/supabase";

type Lane = { id: string; lane_name: string; lane_code: string | null; status: string };
type Rack = { id: string; lane_id: string; rack_name: string; rack_code: string | null; status: string };
type Worker = { id: string; worker_name: string };
type Product = { id: string; name: string; stock: number; low_stock_threshold: number | null };
type Location = { id: string; product_id: string; lane_id: string; rack_id: string | null; location_note: string | null };
type Assignment = { id: string; lane_id: string; worker_id: string; status: string };

export default function StoreLayout() {
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [laneName, setLaneName] = useState("");
  const [laneCode, setLaneCode] = useState("");
  const [rackName, setRackName] = useState("");
  const [rackCode, setRackCode] = useState("");
  const [rackLaneId, setRackLaneId] = useState("");
  const [productId, setProductId] = useState("");
  const [productLaneId, setProductLaneId] = useState("");
  const [productRackId, setProductRackId] = useState("");
  const [workerLaneId, setWorkerLaneId] = useState("");
  const [workerId, setWorkerId] = useState("");
  const [helperLaneId, setHelperLaneId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Vendor session not found.");
    const { data: vendor, error: ve } = await supabase.from("vendors").select("id").eq("auth_user_id", auth.user.id).maybeSingle();
    if (ve) throw ve;
    if (!vendor) throw new Error("Vendor profile not found.");
    setVendorId(vendor.id);

    const [l, r, w, p, loc, a] = await Promise.all([
      supabase.from("vendor_lanes").select("id,lane_name,lane_code,status").eq("vendor_id", vendor.id).order("lane_name"),
      supabase.from("vendor_racks").select("id,lane_id,rack_name,rack_code,status").eq("vendor_id", vendor.id).order("rack_name"),
      supabase.from("vendor_workers").select("id,worker_name").eq("vendor_id", vendor.id).eq("status", "active").order("worker_name"),
      supabase.from("products").select("id,name,stock,low_stock_threshold").eq("vendor_id", vendor.id).order("name"),
      supabase.from("product_storage_locations").select("id,product_id,lane_id,rack_id,location_note").eq("vendor_id", vendor.id),
      supabase.from("vendor_lane_picker_assignments").select("id,lane_id,worker_id,status").eq("vendor_id", vendor.id).eq("status", "active"),
    ]);
    for (const result of [l,r,w,p,loc,a]) if (result.error) throw result.error;
    setLanes((l.data || []) as Lane[]);
    setRacks((r.data || []) as Rack[]);
    setWorkers((w.data || []) as Worker[]);
    setProducts((p.data || []) as Product[]);
    setLocations((loc.data || []) as Location[]);
    setAssignments((a.data || []) as Assignment[]);
  };

  useEffect(() => { load().catch(e => setError(e.message || "Unable to load store layout.")); }, []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null); setMessage(null);
    try { await fn(); await load(); } catch (e: any) { setError(e.message || "Operation failed."); } finally { setBusy(false); }
  };

  const createLane = () => run(async () => {
    if (!vendorId || !laneName.trim()) throw new Error("Enter a lane name.");
    const { error } = await supabase.from("vendor_lanes").insert({ vendor_id: vendorId, lane_name: laneName.trim(), lane_code: laneCode.trim() || null });
    if (error) throw error;
    setLaneName(""); setLaneCode(""); setMessage("Lane created.");
  });

  const createRack = () => run(async () => {
    if (!vendorId || !rackLaneId || !rackName.trim()) throw new Error("Select a lane and enter a rack name.");
    const { error } = await supabase.from("vendor_racks").insert({ vendor_id: vendorId, lane_id: rackLaneId, rack_name: rackName.trim(), rack_code: rackCode.trim() || null });
    if (error) throw error;
    setRackName(""); setRackCode(""); setMessage("Rack created.");
  });

  const assignProduct = () => run(async () => {
    if (!vendorId || !productId || !productLaneId) throw new Error("Select a product and lane.");
    const { error } = await supabase.from("product_storage_locations").insert({
      vendor_id: vendorId, product_id: productId, lane_id: productLaneId, rack_id: productRackId || null
    });
    if (error) throw error;
    setProductId(""); setProductLaneId(""); setProductRackId(""); setMessage("Product location saved.");
  });

  const assignWorker = () => run(async () => {
    if (!vendorId || !workerLaneId || !workerId) throw new Error("Select a lane and Picker.");
    const { error } = await supabase.from("vendor_lane_picker_assignments").insert({
      vendor_id: vendorId, lane_id: workerLaneId, worker_id: workerId, status: "active"
    });
    if (error) throw error;
    setMessage("Picker assigned to lane.");
  });

  const requestHelper = () => run(async () => {
    if (!vendorId) throw new Error("Vendor session not found.");
    const lane = lanes.find(l => l.id === helperLaneId);
    const { error } = await supabase.from("vendor_support_tickets").insert({
      vendor_id: vendorId,
      issue_type: "picker_helper",
      title: "Request Picker Helper",
      description: lane ? `Helper requested for ${lane.lane_name}.` : "Picker helper requested for store operations.",
      priority: "medium",
      status: "open",
      screenshot_url: null,
    });
    if (error) throw error;
    setHelperLaneId(""); setMessage("Helper request sent to Rivo Admin Support.");
  });

  const removeLocation = (id: string) => run(async () => {
    const { error } = await supabase.from("product_storage_locations").delete().eq("id", id);
    if (error) throw error;
  });

  const removeAssignment = (id: string) => run(async () => {
    const { error } = await supabase.from("vendor_lane_picker_assignments").update({ status: "inactive", unassigned_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
  });

  const rackOptions = useMemo(() => racks.filter(r => !productLaneId || r.lane_id === productLaneId), [racks, productLaneId]);
  const productById = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const laneById = useMemo(() => new Map(lanes.map(l => [l.id, l])), [lanes]);
  const rackById = useMemo(() => new Map(racks.map(r => [r.id, r])), [racks]);
  const workerById = useMemo(() => new Map(workers.map(w => [w.id, w])), [workers]);

  return (
    <div className="w-full px-6 py-6 bg-background text-foreground min-h-screen space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Store Layout</h1><p className="text-sm text-muted-foreground mt-1">Set lanes, racks, product locations and Picker assignments.</p></div>
        <button onClick={() => load().catch(e => setError(e.message))} className="px-3 py-2 rounded-lg border bg-card text-sm font-semibold flex items-center gap-2"><RefreshCw className="w-4 h-4"/>Refresh</button>
      </div>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}
      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3 text-sm">{message}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="rounded-xl border bg-card p-4">
          <h2 className="font-bold flex items-center gap-2"><Boxes className="w-4 h-4"/>Create Lane</h2>
          <div className="grid grid-cols-2 gap-2 mt-3"><input value={laneName} onChange={e=>setLaneName(e.target.value)} placeholder="Lane A" className="h-10 rounded-lg border px-3 bg-background"/><input value={laneCode} onChange={e=>setLaneCode(e.target.value)} placeholder="Optional code" className="h-10 rounded-lg border px-3 bg-background"/></div>
          <button disabled={busy} onClick={createLane} className="mt-3 h-10 px-4 rounded-lg bg-emerald-600 text-white text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4"/>Add Lane</button>
          <div className="mt-4 space-y-2">{lanes.map(l=><div key={l.id} className="border rounded-lg p-3 flex justify-between"><div><b>{l.lane_name}</b>{l.lane_code&&<span className="text-xs text-muted-foreground ml-2">{l.lane_code}</span>}</div><span className="text-xs text-emerald-600 font-bold">{l.status}</span></div>)}</div>
        </section>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="font-bold flex items-center gap-2"><MapPin className="w-4 h-4"/>Create Rack</h2>
          <div className="grid grid-cols-3 gap-2 mt-3"><select value={rackLaneId} onChange={e=>setRackLaneId(e.target.value)} className="h-10 rounded-lg border px-3 bg-background"><option value="">Lane</option>{lanes.map(l=><option key={l.id} value={l.id}>{l.lane_name}</option>)}</select><input value={rackName} onChange={e=>setRackName(e.target.value)} placeholder="Rack A1" className="h-10 rounded-lg border px-3 bg-background"/><input value={rackCode} onChange={e=>setRackCode(e.target.value)} placeholder="Code" className="h-10 rounded-lg border px-3 bg-background"/></div>
          <button disabled={busy} onClick={createRack} className="mt-3 h-10 px-4 rounded-lg bg-emerald-600 text-white text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4"/>Add Rack</button>
          <div className="mt-4 space-y-2">{racks.map(r=><div key={r.id} className="border rounded-lg p-3 flex justify-between"><div><b>{r.rack_name}</b><span className="text-xs text-muted-foreground ml-2">{laneById.get(r.lane_id)?.lane_name || "Lane"}</span></div><span className="text-xs text-emerald-600 font-bold">{r.status}</span></div>)}</div>
        </section>
      </div>

      <section className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between"><div><h2 className="font-bold flex items-center gap-2"><Package className="w-4 h-4"/>Product Locations</h2><p className="text-xs text-muted-foreground mt-1">Stock stays on Products; this tells the vendor and Picker where to find it.</p></div></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-4">
          <select value={productId} onChange={e=>setProductId(e.target.value)} className="h-10 rounded-lg border px-3 bg-background"><option value="">Product</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <select value={productLaneId} onChange={e=>{setProductLaneId(e.target.value);setProductRackId("")}} className="h-10 rounded-lg border px-3 bg-background"><option value="">Lane</option>{lanes.map(l=><option key={l.id} value={l.id}>{l.lane_name}</option>)}</select>
          <select value={productRackId} onChange={e=>setProductRackId(e.target.value)} className="h-10 rounded-lg border px-3 bg-background"><option value="">Rack (optional)</option>{rackOptions.map(r=><option key={r.id} value={r.id}>{r.rack_name}</option>)}</select>
          <button disabled={busy} onClick={assignProduct} className="h-10 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center gap-2"><Plus className="w-4 h-4"/>Assign Location</button>
        </div>
        <div className="overflow-x-auto mt-4"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="p-3 text-left">Product</th><th className="p-3 text-right">Stock</th><th className="p-3 text-left">Lane</th><th className="p-3 text-left">Rack</th><th className="p-3 text-left">Status</th><th className="p-3"></th></tr></thead><tbody className="divide-y">{locations.map(loc=>{const p=productById.get(loc.product_id);const low=!!p&&(p.stock<=0||p.stock<=(p.low_stock_threshold??5));return <tr key={loc.id}><td className="p-3 font-semibold">{p?.name||"Product"}</td><td className="p-3 text-right">{p?.stock??0}</td><td className="p-3">{laneById.get(loc.lane_id)?.lane_name||"—"}</td><td className="p-3">{loc.rack_id?(rackById.get(loc.rack_id)?.rack_name||"—"):"—"}</td><td className="p-3"><span className={low?"px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold":"px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold"}>{low?(p?.stock??0)<=0?"OUT":"LOW":"IN STOCK"}</span></td><td className="p-3 text-right"><button onClick={()=>removeLocation(loc.id)} className="text-red-600"><Trash2 className="w-4 h-4"/></button></td></tr>})}</tbody></table></div>
        {locations.length===0&&<div className="p-8 text-center text-sm text-muted-foreground">No product locations assigned yet.</div>}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="rounded-xl border bg-card p-4">
          <h2 className="font-bold flex items-center gap-2"><UserPlus className="w-4 h-4"/>Assign Picker to Lane</h2>
          <div className="grid grid-cols-2 gap-2 mt-4"><select value={workerLaneId} onChange={e=>setWorkerLaneId(e.target.value)} className="h-10 rounded-lg border px-3 bg-background"><option value="">Lane</option>{lanes.map(l=><option key={l.id} value={l.id}>{l.lane_name}</option>)}</select><select value={workerId} onChange={e=>setWorkerId(e.target.value)} className="h-10 rounded-lg border px-3 bg-background"><option value="">Picker</option>{workers.map(w=><option key={w.id} value={w.id}>{w.worker_name}</option>)}</select></div>
          <button disabled={busy} onClick={assignWorker} className="mt-3 h-10 px-4 rounded-lg bg-emerald-600 text-white text-sm font-bold">Assign to Lane</button>
          <div className="mt-4 space-y-2">{assignments.map(a=><div key={a.id} className="border rounded-lg p-3 flex justify-between items-center"><div><b>{workerById.get(a.worker_id)?.worker_name||"Picker"}</b><span className="text-xs text-muted-foreground ml-2">{laneById.get(a.lane_id)?.lane_name||"Lane"}</span></div><button onClick={()=>removeAssignment(a.id)} className="text-xs text-red-600 font-bold">Unassign</button></div>)}</div>
        </section>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="font-bold flex items-center gap-2"><LifeBuoy className="w-4 h-4"/>Request Helper</h2>
          <p className="text-sm text-muted-foreground mt-1">Send a Picker/helper request to the existing Admin Support queue.</p>
          <div className="flex gap-2 mt-4"><select value={helperLaneId} onChange={e=>setHelperLaneId(e.target.value)} className="flex-1 h-10 rounded-lg border px-3 bg-background"><option value="">Store-wide</option>{lanes.map(l=><option key={l.id} value={l.id}>{l.lane_name}</option>)}</select><button disabled={busy} onClick={requestHelper} className="h-10 px-4 rounded-lg bg-emerald-600 text-white font-bold">Request Helper</button></div>
        </section>
      </div>
    </div>
  );
}
