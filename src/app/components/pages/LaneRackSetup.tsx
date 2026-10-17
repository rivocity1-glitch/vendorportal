import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Layers, Boxes, Users, MapPin } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { getLaneWorkers, LaneWorker } from "../../../services/laneWorkerService";

type Lane = { id: string; lane_name: string; description?: string | null };
type Rack = { id: string; lane_id: string; rack_name: string };
type Product = { id: string; name: string; product_name?: string | null };
type Location = { product_id: string; lane_id: string; rack_id: string | null };

export default function LaneRackSetup() {
  const [vendorId, setVendorId] = useState("");
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [workers, setWorkers] = useState<LaneWorker[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [laneName, setLaneName] = useState("");
  const [laneDescription, setLaneDescription] = useState("");
  const [rackName, setRackName] = useState("");
  const [rackLaneId, setRackLaneId] = useState("");
  const [assignLaneId, setAssignLaneId] = useState("");
  const [assignWorkerId, setAssignWorkerId] = useState("");
  const [productId, setProductId] = useState("");
  const [productLaneId, setProductLaneId] = useState("");
  const [productRackId, setProductRackId] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Vendor session not found.");
      const { data: vendor, error: vendorError } = await supabase
        .from("vendors").select("id").eq("auth_user_id", auth.user.id).maybeSingle();
      if (vendorError) throw vendorError;
      if (!vendor) throw new Error("Vendor profile not found.");
      setVendorId(vendor.id);

      const [laneResult, rackResult, workerResult, productResult, locationResult, assignmentResult] = await Promise.all([
        supabase.from("vendor_lanes").select("id,lane_name,description").eq("vendor_id", vendor.id).order("lane_name"),
        supabase.from("vendor_racks").select("id,lane_id,rack_name").eq("vendor_id", vendor.id).order("rack_name"),
        getLaneWorkers(vendor.id),
        supabase.from("products").select("id,name").eq("vendor_id", vendor.id).order("name"),
        supabase.from("product_storage_locations").select("product_id,lane_id,rack_id").eq("vendor_id", vendor.id),
        supabase.from("vendor_lane_picker_assignments").select("lane_id,worker_id").eq("vendor_id", vendor.id)
      ]);
      if (laneResult.error) throw laneResult.error;
      if (rackResult.error) throw rackResult.error;
      if (productResult.error) throw productResult.error;
      if (locationResult.error) throw locationResult.error;
      if (assignmentResult.error) throw assignmentResult.error;
      setLanes((laneResult.data || []) as Lane[]);
      setRacks((rackResult.data || []) as Rack[]);
      setWorkers(workerResult);
      setProducts((productResult.data || []) as Product[]);
      setLocations((locationResult.data || []) as Location[]);
      const grouped: Record<string, string[]> = {};
      (assignmentResult.data || []).forEach((row: any) => {
        grouped[row.lane_id] ||= [];
        if (!grouped[row.lane_id].includes(row.worker_id)) grouped[row.lane_id].push(row.worker_id);
      });
      setAssignments(grouped);
      setRackLaneId(current => current || laneResult.data?.[0]?.id || "");
      setAssignLaneId(current => current || laneResult.data?.[0]?.id || "");
      setProductLaneId(current => current || laneResult.data?.[0]?.id || "");
    } catch (e: any) {
      setError(e?.message || "Unable to load lane and rack setup.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const createLane = async () => {
    if (!laneName.trim()) { setError("Enter a lane name."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const { error: insertError } = await supabase.from("vendor_lanes").insert({
        vendor_id: vendorId, lane_name: laneName.trim(),
        description: laneDescription.trim() || null
      });
      if (insertError) throw insertError;
      setLaneName(""); setLaneDescription(""); setMessage("Lane created.");
      await load();
    } catch (e: any) { setError(e?.message || "Could not create lane."); }
    finally { setBusy(false); }
  };

  const createRack = async () => {
    if (!rackLaneId || !rackName.trim()) { setError("Choose a lane and enter a rack name."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const { error: insertError } = await supabase.from("vendor_racks").insert({
        vendor_id: vendorId, lane_id: rackLaneId, rack_name: rackName.trim()
      });
      if (insertError) throw insertError;
      setRackName(""); setMessage("Rack created under the selected lane.");
      await load();
    } catch (e: any) { setError(e?.message || "Could not create rack."); }
    finally { setBusy(false); }
  };

  const toggleLaneWorker = async (laneId: string, workerId: string) => {
    setBusy(true); setError(""); setMessage("");
    try {
      const current = assignments[laneId] || [];
      if (current.includes(workerId)) {
        const { error: deleteError } = await supabase.from("vendor_lane_picker_assignments")
          .delete().eq("vendor_id", vendorId).eq("lane_id", laneId).eq("worker_id", workerId);
        if (deleteError) throw deleteError;
      } else {
        const { error: insertError } = await supabase.from("vendor_lane_picker_assignments")
          .insert({ vendor_id: vendorId, lane_id: laneId, worker_id: workerId });
        if (insertError) throw insertError;
      }
      setMessage("Lane picker assignment updated.");
      await load();
    } catch (e: any) { setError(e?.message || "Could not update picker assignment."); }
    finally { setBusy(false); }
  };

  const saveProductLocation = async () => {
    if (!productId || !productLaneId) { setError("Choose a product and lane."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const selectedRack = productRackId || null;
      const { error: upsertError } = await supabase.from("product_storage_locations").upsert({
        vendor_id: vendorId, product_id: productId, lane_id: productLaneId, rack_id: selectedRack
      }, { onConflict: "vendor_id,product_id" });
      if (upsertError) throw upsertError;
      setMessage("Product storage location saved.");
      await load();
    } catch (e: any) { setError(e?.message || "Could not save product location."); }
    finally { setBusy(false); }
  };

  const racksInSelectedLane = racks.filter(r => r.lane_id === productLaneId);
  const productLabel = (p: Product) => p.name || p.product_name || "Unnamed product";
  const laneLabel = (id: string) => lanes.find(l => l.id === id)?.lane_name || "Lane";

  return <section className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-4 lg:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-lg font-bold"><Layers className="h-5 w-5 text-emerald-600"/>Lane & Rack Setup</h2>
        <p className="mt-1 text-sm text-muted-foreground">Create store lanes, create racks inside each lane, assign pickers to one or more lanes, and map products to storage locations.</p></div>
      <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold"><RefreshCw className="h-4 w-4"/>Refresh</button>
    </div>
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {message && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
    {loading ? <div className="py-8 text-center text-sm text-muted-foreground">Loading store layout…</div> : <>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border p-4">
          <h3 className="mb-3 flex items-center gap-2 font-bold"><Layers className="h-4 w-4"/>Create Lane</h3>
          <div className="space-y-2"><input value={laneName} onChange={e=>setLaneName(e.target.value)} placeholder="Lane name (e.g. Grocery, Personal Care)" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"/>
            <input value={laneDescription} onChange={e=>setLaneDescription(e.target.value)} placeholder="Description (optional)" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"/>
            <button disabled={busy} onClick={() => void createLane()} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"><Plus className="h-4 w-4"/>Create Lane</button></div>
        </div>
        <div className="rounded-xl border border-border p-4">
          <h3 className="mb-3 flex items-center gap-2 font-bold"><Boxes className="h-4 w-4"/>Create Rack</h3>
          <div className="space-y-2"><select value={rackLaneId} onChange={e=>setRackLaneId(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"><option value="">Select lane</option>{lanes.map(l=><option key={l.id} value={l.id}>{l.lane_name}</option>)}</select>
            <input value={rackName} onChange={e=>setRackName(e.target.value)} placeholder="Rack name / code (e.g. A1)" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"/>
            <button disabled={busy || !lanes.length} onClick={() => void createRack()} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"><Plus className="h-4 w-4"/>Create Rack</button></div>
        </div>
      </div>
      <div className="rounded-xl border border-border p-4">
        <h3 className="mb-3 flex items-center gap-2 font-bold"><Users className="h-4 w-4"/>Assign Pickers to Lanes</h3>
        {!lanes.length ? <p className="text-sm text-muted-foreground">Create a lane first.</p> : !workers.length ? <p className="text-sm text-muted-foreground">No active pickers are linked to this vendor yet.</p> :
          <div className="space-y-4">{lanes.map(lane=><div key={lane.id} className="rounded-lg border border-border p-3"><div className="mb-2 font-semibold">{lane.lane_name}</div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{workers.map(worker=><label key={worker.id} className="flex cursor-pointer items-center gap-2 rounded-lg bg-background p-2 text-sm"><input type="checkbox" checked={(assignments[lane.id]||[]).includes(worker.id)} disabled={busy} onChange={()=>void toggleLaneWorker(lane.id,worker.id)}/><span>{worker.worker_name}{worker.is_owner?" (Owner)":""}</span></label>)}</div><p className="mt-2 text-xs text-muted-foreground">A picker can be assigned to multiple lanes.</p></div>)}</div>}
      </div>
      <div className="rounded-xl border border-border p-4">
        <h3 className="mb-3 flex items-center gap-2 font-bold"><MapPin className="h-4 w-4"/>Assign Products to Lane / Rack</h3>
        <div className="grid gap-3 md:grid-cols-4">
          <select value={productId} onChange={e=>{setProductId(e.target.value);const loc=locations.find(x=>x.product_id===e.target.value);if(loc){setProductLaneId(loc.lane_id);setProductRackId(loc.rack_id||"");}}} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="">Select product</option>{products.map(p=><option key={p.id} value={p.id}>{productLabel(p)}</option>)}</select>
          <select value={productLaneId} onChange={e=>{setProductLaneId(e.target.value);setProductRackId("");}} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="">Select lane</option>{lanes.map(l=><option key={l.id} value={l.id}>{l.lane_name}</option>)}</select>
          <select value={productRackId} onChange={e=>setProductRackId(e.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm"><option value="">No specific rack</option>{racksInSelectedLane.map(r=><option key={r.id} value={r.id}>{r.rack_name}</option>)}</select>
          <button disabled={busy || !products.length || !lanes.length} onClick={()=>void saveProductLocation()} className="h-10 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white disabled:opacity-50">Save Location</button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{lanes.map(lane=><div key={lane.id} className="rounded-lg bg-background p-3"><div className="font-semibold">{lane.lane_name}</div><div className="mt-1 text-xs text-muted-foreground">{racks.filter(r=>r.lane_id===lane.id).length} racks · {(assignments[lane.id]||[]).length} assigned pickers</div>{racks.filter(r=>r.lane_id===lane.id).map(r=><div key={r.id} className="mt-1 text-sm">↳ {r.rack_name}</div>)}</div>)}</div>
      </div>
    </>}
  </section>;
}
