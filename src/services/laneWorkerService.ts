import { supabase } from "../lib/supabase";

export interface LaneWorker {
  id: string;
  worker_name: string;
  status: string;
  auth_user_id: string;
}

export interface LanePickingTask {
  id: string;
  order_item_id: string;
  vendor_id: string;
  worker_id: string;
  quantity: number;
  status: string;
  assigned_at: string;
  picked_at: string | null;
}

export async function getCurrentVendorId(): Promise<string | null> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;

  const { data, error } = await supabase
    .from("vendors")
    .select("id")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

export async function getLaneWorkers(vendorId: string): Promise<LaneWorker[]> {
  const { data, error } = await supabase
    .from("vendor_workers")
    .select("id, worker_name, status, auth_user_id")
    .eq("vendor_id", vendorId)
    .eq("status", "active")
    .order("worker_name", { ascending: true });

  if (error) throw error;
  return (data || []) as LaneWorker[];
}

export async function getLanePickingTasks(
  vendorId: string,
  orderItemIds: string[]
): Promise<LanePickingTask[]> {
  if (!orderItemIds.length) return [];

  const { data, error } = await supabase
    .from("order_item_picking_tasks")
    .select(
      "id, order_item_id, vendor_id, worker_id, quantity, status, assigned_at, picked_at"
    )
    .eq("vendor_id", vendorId)
    .in("order_item_id", orderItemIds);

  if (error) throw error;
  return (data || []) as LanePickingTask[];
}

export async function assignLanePickingTask(args: {
  vendorId: string;
  orderItemId: string;
  workerId: string;
  quantity: number;
}): Promise<LanePickingTask> {
  const { data: existing, error: existingError } = await supabase
    .from("order_item_picking_tasks")
    .select(
      "id, order_item_id, vendor_id, worker_id, quantity, status, assigned_at, picked_at"
    )
    .eq("vendor_id", args.vendorId)
    .eq("order_item_id", args.orderItemId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const { data, error } = await supabase
      .from("order_item_picking_tasks")
      .update({
        worker_id: args.workerId,
        quantity: args.quantity,
        status: existing.status === "picked" ? "picked" : "assigned",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("vendor_id", args.vendorId)
      .select(
        "id, order_item_id, vendor_id, worker_id, quantity, status, assigned_at, picked_at"
      )
      .single();

    if (error) throw error;
    return data as LanePickingTask;
  }

  const { data, error } = await supabase
    .from("order_item_picking_tasks")
    .insert({
      vendor_id: args.vendorId,
      order_item_id: args.orderItemId,
      worker_id: args.workerId,
      quantity: args.quantity,
      status: "assigned",
      assigned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select(
      "id, order_item_id, vendor_id, worker_id, quantity, status, assigned_at, picked_at"
    )
    .single();

  if (error) throw error;
  return data as LanePickingTask;
}
