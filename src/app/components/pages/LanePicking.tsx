import React,{useEffect,useState}from"react";
import{ClipboardCheck,RefreshCw,User,CheckCircle,Clock}from"lucide-react";
import{supabase}from"../../../lib/supabase";
import{getLaneWorkers,getLanePickingTasks,assignLanePickingTask,LaneWorker,LanePickingTask}from"../../../services/laneWorkerService";

type Item={id:string;order_id:string;product_name:string|null;quantity:number};
type Order={id:string;order_number:string;order_status:string};

export default function LanePicking(){
 const[orders,setOrders]=useState<Order[]>([]);
 const[items,setItems]=useState<Item[]>([]);
 const[workers,setWorkers]=useState<LaneWorker[]>([]);
 const[tasks,setTasks]=useState<Map<string,LanePickingTask>>(new Map());
 const[loading,setLoading]=useState(true);
 const[busy,setBusy]=useState<string|null>(null);
 const[error,setError]=useState<string|null>(null);

 const load=async()=>{
  setLoading(true);setError(null);
  try{
   const{data:auth}=await supabase.auth.getUser();if(!auth.user)throw new Error("Vendor session not found.");
   const{data:vendor,error:ve}=await supabase.from("vendors").select("id").eq("auth_user_id",auth.user.id).maybeSingle();if(ve)throw ve;if(!vendor)throw new Error("Vendor profile not found.");
   const{data:o,error:oe}=await supabase.from("orders").select("id,order_number,order_status").eq("vendor_id",vendor.id).order("updated_at",{ascending:false});if(oe)throw oe;
   const orderRows=(o||[]) as Order[];setOrders(orderRows);
   const ids=orderRows.map(x=>x.id);
   const{data:i,error:ie}=ids.length?await supabase.from("order_items").select("id,order_id,product_name,quantity").in("order_id",ids):{data:[],error:null};
   if(ie)throw ie;setItems((i||[]) as Item[]);
   const ws=await getLaneWorkers(vendor.id);setWorkers(ws);
   const ts=await getLanePickingTasks(vendor.id,(i||[]).map((x:any)=>x.id));
   const map=new Map<string,LanePickingTask>();ts.forEach(t=>map.set(t.order_item_id,t));setTasks(map);
  }catch(e:any){console.error(e);setError(e.message||"Unable to load Lane picking.");}finally{setLoading(false)}
 };
 useEffect(()=>{load();},[]);
 const assign=async(item:Item,workerId:string)=>{
  if(!workerId)return;setBusy(item.id);setError(null);
  try{
   const{data:auth}=await supabase.auth.getUser();if(!auth.user)throw new Error("Vendor session not found.");
   const{data:v}=await supabase.from("vendors").select("id").eq("auth_user_id",auth.user.id).maybeSingle();if(!v)throw new Error("Vendor profile not found.");
   const task=await assignLanePickingTask({vendorId:v.id,orderItemId:item.id,workerId,quantity:item.quantity});
   setTasks(prev=>new Map(prev).set(item.id,task));
  }catch(e:any){setError(e.message||"Unable to assign worker.")}finally{setBusy(null)}
 };

 const pending=items.filter(i=>orders.find(o=>o.id===i.order_id)?.order_status!=="Cancelled");

 return <div className="p-4 lg:p-6 space-y-5 bg-background text-foreground min-h-screen">
  <div className="flex items-center justify-between gap-3"><div><h1 className="text-xl font-bold">RivoCity Lane Picking</h1><p className="text-sm text-muted-foreground mt-1">Assign order items to store workers and see picking progress.</p></div><button onClick={load} disabled={loading} className="h-9 px-3 rounded-lg border border-border bg-card text-sm font-semibold flex items-center gap-2"><RefreshCw className={loading?"w-4 h-4 animate-spin":"w-4 h-4"}/>Refresh</button></div>
  {error&&<div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}
  {loading?<div className="py-16 flex justify-center text-muted-foreground"><RefreshCw className="animate-spin"/></div>:workers.length===0?<div className="bg-card border border-border rounded-xl p-6"><p className="font-semibold">No Lane workers configured.</p><p className="text-sm text-muted-foreground mt-1">Create the worker profile in Supabase first, then assign order items here.</p></div>:
  <div className="space-y-3">{pending.map(item=>{const order=orders.find(o=>o.id===item.order_id);const task=tasks.get(item.id);const worker=task?workers.find(w=>w.id===task.worker_id):undefined;return <div key={item.id} className="bg-card border border-border rounded-xl p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-emerald-700">Order {order?.order_number||"—"}</p><h2 className="font-semibold mt-1">{item.product_name||"Product Item"}</h2><p className="text-sm text-muted-foreground mt-1">Quantity: {item.quantity}</p></div>{task?.status==="picked"?<span className="text-xs font-bold text-emerald-700 flex items-center gap-1"><CheckCircle className="w-4 h-4"/>Picked</span>:task?<span className="text-xs font-bold text-amber-700 flex items-center gap-1"><Clock className="w-4 h-4"/>Assigned</span>:<span className="text-xs text-muted-foreground">Not assigned</span>}</div><div className="mt-3 flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground"/><select value={task?.worker_id||""} disabled={busy===item.id||task?.status==="picked"} onChange={e=>assign(item,e.target.value)} className="flex-1 h-9 rounded-lg border border-border bg-card px-2 text-sm"><option value="">Assign worker</option>{workers.map(w=><option key={w.id} value={w.id}>{w.worker_name}</option>)}</select></div>{worker&&<p className="mt-2 text-xs text-muted-foreground">Assigned to {worker.worker_name}{task?.picked_at?" · Picked "+new Date(task.picked_at).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):""}</p>}</div>})}</div>}
  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex gap-3"><ClipboardCheck className="w-5 h-5 text-emerald-700 mt-0.5"/><div><p className="font-semibold text-emerald-900">How Lane works</p><p className="text-sm text-emerald-800 mt-1">Vendor assigns an item → worker sees it in RivoCity Lane → worker marks it picked → this page updates from Supabase.</p></div></div>
 </div>
}