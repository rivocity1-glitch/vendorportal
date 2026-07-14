import { supabase } from "../lib/supabase";

export interface CreateNotificationInput {
    userType: "customer" | "vendor" | "rider" | "admin";
    userId: string;
    title: string;
    message: string;
    type: string;
    referenceId?: string;
    metadata?: Record<string, any>;
}

export type RecipientType = CreateNotificationInput["userType"];

export interface ServiceResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

export async function createNotification(input: CreateNotificationInput) {
    const { data, error } = await supabase
        .from('notifications')
        .insert([
            {
                recipient_type: input.userType,
                recipient_id: input.userId,
                title: input.title,
                message: input.message,
                type: input.type,
                reference_id: input.referenceId,
                metadata: input.metadata,
                is_read: false,
                created_at: new Date().toISOString(),
                deleted_at: null
            }
        ])
        .select()
        .single();

    if (error) {
        throw error;
    }

    console.log("Notification created:", data);
    return data;
}

export async function sendNotification(input: CreateNotificationInput): Promise<ServiceResponse> {
    try {
        const data = await createNotification(input);
        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message || "Failed to create notification record wrapper." };
    }
}

export async function markNotificationRead(id: string): Promise<ServiceResponse> {
    try {
        if (!id) throw new Error("Missing mandatory unique identifier parameter execution contexts.");
        const { data, error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", id)
            .is("deleted_at", null)
            .select();
        if (error) throw error;
        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message || "Failed execution loop for read flag mutation updates." };
    }
}

export async function markAllNotificationsRead(recipientId: string, recipientType: RecipientType): Promise<ServiceResponse> {
    try {
        if (!recipientId || !recipientType) throw new Error("Missing parameters for collective mutation queries.");
        const { data, error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("recipient_id", recipientId)
            .eq("recipient_type", recipientType)
            .is("deleted_at", null)
            .select();
        if (error) throw error;
        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message || "Failed collective read status execution loops." };
    }
}

export async function getUnreadNotificationCount(recipientId: string, recipientType: RecipientType): Promise<ServiceResponse<{ count: number }>> {
    try {
        if (!recipientId || !recipientType) throw new Error("Missing search constraints parameters execution contexts.");
        const { count, error } = await supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("recipient_id", recipientId)
            .eq("recipient_type", recipientType)
            .eq("is_read", false)
            .is("deleted_at", null);
        if (error) throw error;
        return { success: true, data: { count: count || 0 } };
    } catch (err: any) {
        return { success: false, error: err.message || "Failed execution constraints database read streams counters." };
    }
}

export async function fetchNotifications(
    recipientId: string, 
    recipientType: RecipientType,
    page?: number,
    pageSize?: number
): Promise<ServiceResponse> {
    try {
        if (!recipientId || !recipientType) throw new Error("Missing basic indexing identifiers query context params.");
        
        let query = supabase
            .from("notifications")
            .select("*")
            .eq("recipient_id", recipientId)
            .eq("recipient_type", recipientType)
            .is("deleted_at", null)
            .order("created_at", { ascending: false });

        if (page !== undefined && pageSize !== undefined) {
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);
        }

        const { data, error } = await query;
        if (error) throw error;
        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message || "Failed standard query parsing database transactions loops." };
    }
}

export async function fetchUnreadNotifications(recipientId: string, recipientType: RecipientType): Promise<ServiceResponse> {
    try {
        if (!recipientId || !recipientType) throw new Error("Missing filtering attributes requirements payload strings.");
        const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("recipient_id", recipientId)
            .eq("recipient_type", recipientType)
            .eq("is_read", false)
            .is("deleted_at", null)
            .order("created_at", { ascending: false });
        if (error) throw error;
        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message || "Failed specific database index parsing pipeline routines." };
    }
}

export async function deleteNotification(id: string): Promise<ServiceResponse<{ success: boolean }>> {
    try {
        if (!id) throw new Error("Validation matrix failure context: targeted identification code cannot be empty.");
        const { error } = await supabase
            .from("notifications")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", id);
        if (error) throw error;
        return { success: true, data: { success: true } };
    } catch (err: any) {
        return { success: false, error: err.message || "Failed targeted administrative record deletion wrappers." };
    }
}

export async function clearExpiredNotifications(): Promise<ServiceResponse> {
    try {
        const { error } = await supabase
            .from("notifications")
            .update({ deleted_at: new Date().toISOString() })
            .lt("expires_at", new Date().toISOString())
            .is("deleted_at", null);
        
        if (error) {
            if (error.code === "P0002" || error.message?.includes("column") || error.hint?.includes("column")) {
                console.log("[INFO] Expiry configuration layout index column absent inside notifications dataset schema.");
                return { success: true, data: { skipped: true, note: "Column does not exist" } };
            }
            throw error;
        }
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message || "Failed structural expiry lifecycle pruning routines sweeps." };
    }
}

export async function sendOrderNotification(userId: string, userType: RecipientType, orderId: string, status: string): Promise<ServiceResponse> {
    let professionalMessage = `Your order status has changed to ${status}.`;
    if (status.toLowerCase() === "packed") {
        professionalMessage = "Your order has been packed and is ready for pickup.";
    }

    return sendNotification({
        userId,
        userType,
        title: status.toLowerCase() === "packed" ? "Order Packed" : `Order Update: ${status.toUpperCase()}`,
        message: professionalMessage,
        type: "order",
        referenceId: orderId
    });
}

export async function sendSettlementNotification(userId: string, userType: RecipientType, amount: number): Promise<ServiceResponse> {
    return sendNotification({
        userId,
        userType,
        title: "Settlement Approved",
        message: `Your payout of ₹${amount} has been processed.`,
        type: "settlement"
    });
}

export async function sendSOSNotification(userId: string, area: string): Promise<ServiceResponse> {
    return sendNotification({
        userId,
        userType: "admin",
        title: "🚨 CRITICAL LOGISTICS SOS ALARM TRIGGERED",
        message: `Active fleet operational companion route id ${userId} issued urgent alert flags near delivery sector zone: ${area}.`,
        type: "sos",
        referenceId: userId
    });
}

export async function sendKYCNotification(userId: string, userType: RecipientType, status: "verified" | "rejected", notes?: string): Promise<ServiceResponse> {
    return sendNotification({
        userId,
        userType,
        title: status === "verified" ? "KYC Approved" : "KYC Rejected",
        message: status === "verified" 
            ? "Your KYC has been approved." 
            : "Your KYC was rejected.\nSee the review notes for details.",
        type: "kyc",
        metadata: notes ? { notes } : undefined
    });
}

export async function sendAnnouncementNotification(userType: RecipientType, title: string, message: string): Promise<ServiceResponse> {
    return sendNotification({
        userId: "global_broadcast_channel",
        userType,
        title,
        message,
        type: "announcement"
    });
}

export const notificationService = {
    sendNotification,
    fetchNotifications,
    fetchUnreadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    getUnreadNotificationCount,
    deleteNotification,
    clearExpiredNotifications,
    sendOrderNotification,
    sendSettlementNotification,
    sendSOSNotification,
    sendKYCNotification,
    sendAnnouncementNotification
};