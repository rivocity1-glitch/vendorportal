import { supabase } from "../lib/supabase";

export interface LaneWorker { id:string; worker_name:string; status:string; auth_user_id:string; is_owner?:boolean; }
export interface LanePickingTask { id:string; order_item_id:string; vendor_id:string; worker_id:string; quantity:number; status:string; assigned_at:string; picked_at:string|null; basket_id:string|null; basket_code:string|null; }
export interface PickerCandidate { id:string; full_name:string; city:string; locality:string|null; latitude:number|null; longitude:number|null; availability_status:string; application_status:string; distanceKm:number|null; }
export interface PickerVendorRequest { id:string; picker_id:string; vendor_id:string; status:string; requested_at:string; responded_at:string|null; }

export async function getCurrentVendorId():Promise<string|null>{
 const{data:authData,error:authError}=await supabase.auth.getUser();if(authError||!authData.user)return null;
 const{data,error}=await supabase.from("vendors").select("id").eq("auth_user_id",authData.user.id).maybeSingle();if(error)throw error;return data?.id??null;
}
export async function getLaneWorkers(vendorId:string):Promise<LaneWorker[]>{
 const{data:vendor,error:vendorError}=await supabase.from("vendors").select("auth_user_id,owner_name").eq("id",vendorId).maybeSingle();
 if(vendorError)throw vendorError;

 const{data,error}=await supabase.from("vendor_workers").select("id,worker_name,status,auth_user_id").eq("vendor_id",vendorId).eq("status","active").order("worker_name");
 if(error)throw error;

 const workers=(data||[]) as LaneWorker[];
 const ownerAuthUserId=vendor?.auth_user_id||null;

 // Small owner-operated shops do not need to recruit a separate Picker.
 // Represent the vendor owner as the shop's active worker using the existing
 // vendor_workers structure so item picking can use the same task flow.
 if(ownerAuthUserId){
   const activeOwner=workers.find(worker=>worker.auth_user_id===ownerAuthUserId);
   if(activeOwner){
     activeOwner.is_owner=true;
   }else{
     // Reuse an existing inactive owner worker before creating a new record.
     const{data:existingOwner,error:existingOwnerError}=await supabase
       .from("vendor_workers")
       .select("id,worker_name,status,auth_user_id")
       .eq("vendor_id",vendorId)
       .eq("auth_user_id",ownerAuthUserId)
       .maybeSingle();

     if(existingOwnerError)throw existingOwnerError;

     if(existingOwner){
       const{data:reactivatedOwner,error:reactivateError}=await supabase
         .from("vendor_workers")
         .update({
           worker_name:vendor?.owner_name||existingOwner.worker_name||"Store Owner",
           status:"active",
           updated_at:new Date().toISOString()
         })
         .eq("id",existingOwner.id)
         .eq("vendor_id",vendorId)
         .select("id,worker_name,status,auth_user_id")
         .single();

       if(!reactivateError&&reactivatedOwner){
         workers.push({...reactivatedOwner,is_owner:true} as LaneWorker);
       }else if(reactivateError){
         console.warn("Owner worker reactivation warning:",reactivateError);
       }
     }else{
       const{data:ownerWorker,error:ownerError}=await supabase.from("vendor_workers").insert({
         vendor_id:vendorId,
         auth_user_id:ownerAuthUserId,
         worker_name:vendor?.owner_name||"Store Owner",
         status:"active"
       }).select("id,worker_name,status,auth_user_id").single();

       if(!ownerError&&ownerWorker){
         workers.push({...ownerWorker,is_owner:true} as LaneWorker);
       }else if(ownerError){
         // Do not break the Orders page if owner provisioning is blocked by RLS.
         console.warn("Owner worker provisioning warning:",ownerError);
       }
     }
   }
 }

 return workers.sort((a,b)=>a.worker_name.localeCompare(b.worker_name)) as LaneWorker[];
}
export async function removeLaneWorker(workerId:string,vendorId:string){
 const{data:worker,error:we}=await supabase.from("vendor_workers").select("auth_user_id").eq("id",workerId).eq("vendor_id",vendorId).maybeSingle();
 if(we)throw we;
 const{error}=await supabase.from("vendor_workers").update({status:"inactive",updated_at:new Date().toISOString()}).eq("id",workerId).eq("vendor_id",vendorId);
 if(error)throw error;

}
export async function getLanePickingTasks(vendorId:string,orderItemIds:string[]):Promise<LanePickingTask[]>{if(!orderItemIds.length)return[];const{data,error}=await supabase.from("order_item_picking_tasks").select("id,order_item_id,vendor_id,worker_id,quantity,status,assigned_at,picked_at,basket_id,picker_baskets(basket_code)").eq("vendor_id",vendorId).in("order_item_id",orderItemIds);if(error)throw error;return(data||[]).map((x:any)=>({...x,basket_code:x.picker_baskets?.basket_code||null})) as LanePickingTask[];}
export async function assignLanePickingTask(args:{vendorId:string;orderItemId:string;workerId:string;quantity:number}):Promise<LanePickingTask>{
 const{data:existing,error:existingError}=await supabase.from("order_item_picking_tasks").select("id,order_item_id,vendor_id,worker_id,quantity,status,assigned_at,picked_at").eq("vendor_id",args.vendorId).eq("order_item_id",args.orderItemId).maybeSingle();if(existingError)throw existingError;
 if(existing){const{data,error}=await supabase.from("order_item_picking_tasks").update({worker_id:args.workerId,quantity:args.quantity,status:existing.status==="picked"?"picked":"assigned",updated_at:new Date().toISOString()}).eq("id",existing.id).eq("vendor_id",args.vendorId).select("id,order_item_id,vendor_id,worker_id,quantity,status,assigned_at,picked_at").single();if(error)throw error;return data as LanePickingTask;}
 const{data,error}=await supabase.from("order_item_picking_tasks").insert({vendor_id:args.vendorId,order_item_id:args.orderItemId,worker_id:args.workerId,quantity:args.quantity,status:"assigned",assigned_at:new Date().toISOString(),updated_at:new Date().toISOString()}).select("id,order_item_id,vendor_id,worker_id,quantity,status,assigned_at,picked_at").single();if(error)throw error;return data as LanePickingTask;
}
function distanceKm(aLat:number,aLng:number,bLat:number,bLng:number){const r=6371;const dLat=(bLat-aLat)*Math.PI/180;const dLng=(bLng-aLng)*Math.PI/180;const x=Math.sin(dLat/2)**2+Math.cos(aLat*Math.PI/180)*Math.cos(bLat*Math.PI/180)*Math.sin(dLng/2)**2;return r*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
export async function getPickerCandidates(vendorId:string):Promise<PickerCandidate[]>{
 const{data:vendor,error:ve}=await supabase.from("vendor_profiles").select("latitude,longitude").eq("vendor_id",vendorId).maybeSingle();if(ve)throw ve;
 const{data,error}=await supabase.from("picker_profiles").select("id,full_name,city,locality,latitude,longitude,availability_status,application_status").eq("application_status","approved").eq("availability_status","available").order("full_name");if(error)throw error;
 const lat=vendor?.latitude??null,lng=vendor?.longitude??null;
 return(data||[]).map((p:any)=>({...p,distanceKm:lat!==null&&lng!==null&&p.latitude!==null&&p.longitude!==null?distanceKm(lat,lng,p.latitude,p.longitude):null})).sort((a:any,b:any)=>(a.distanceKm??999999)-(b.distanceKm??999999)) as PickerCandidate[];
}
export async function getPickerRequests(vendorId:string):Promise<PickerVendorRequest[]>{const{data,error}=await supabase.from("picker_vendor_requests").select("id,picker_id,vendor_id,status,requested_at,responded_at").eq("vendor_id",vendorId).order("requested_at",{ascending:false});if(error)throw error;return(data||[]) as PickerVendorRequest[];}
export async function requestPicker(vendorId:string,pickerId:string):Promise<PickerVendorRequest>{const{data,error}=await supabase.from("picker_vendor_requests").insert({vendor_id:vendorId,picker_id:pickerId,status:"pending"}).select("id,picker_id,vendor_id,status,requested_at,responded_at").single();if(error)throw error;return data as PickerVendorRequest;}
