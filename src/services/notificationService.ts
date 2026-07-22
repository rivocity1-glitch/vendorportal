// src/services/notificationService.ts
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

    return data;
}

export async function sendNotification(input: CreateNotificationInput): Promise<ServiceResponse> {
    try {
        const data = await createNotification(input);
        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message || "Failed to create notification record." };
    }
}

export async function markNotificationRead(id: string): Promise<ServiceResponse> {
    try {
        if (!id) throw new Error("Missing notification ID.");
        
        const { data, error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", id)
            .select();

        if (error) throw error;
        return { success: true, data };
    } catch (err: any) {
        console.error("Supabase Error [markNotificationRead]:", err);
        return { success: false, error: err.message || "Failed to mark notification as read." };
    }
}

export async function markAllNotificationsRead(recipientId: string, recipientType: RecipientType): Promise<ServiceResponse> {
    try {
        if (!recipientId || !recipientType) throw new Error("Missing recipient parameters.");
        
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
        console.error("Supabase Error [markAllNotificationsRead]:", err);
        return { success: false, error: err.message || "Failed to mark all notifications as read." };
    }
}

export async function getUnreadNotificationCount(recipientId: string, recipientType: RecipientType): Promise<ServiceResponse<{ count: number }>> {
    try {
        if (!recipientId || !recipientType) throw new Error("Missing recipient parameters.");
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
        return { success: false, error: err.message || "Failed to fetch unread notification count." };
    }
}

export async function fetchNotifications(
    recipientId: string, 
    recipientType: RecipientType,
    page?: number,
    pageSize?: number
): Promise<ServiceResponse> {
    try {
        if (!recipientId || !recipientType) throw new Error("Missing recipient parameters.");
        
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
        return { success: false, error: err.message || "Failed to fetch notifications." };
    }
}

export async function fetchUnreadNotifications(recipientId: string, recipientType: RecipientType): Promise<ServiceResponse> {
    try {
        if (!recipientId || !recipientType) throw new Error("Missing recipient parameters.");
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
        return { success: false, error: err.message || "Failed to fetch unread notifications." };
    }
}

export async function deleteNotification(id: string): Promise<ServiceResponse<{ success: boolean }>> {
    try {
        if (!id) throw new Error("Missing notification ID.");
        
        // Soft delete matching schema pattern using deleted_at timestamp
        const { data, error } = await supabase
            .from("notifications")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", id)
            .select();

        if (error) throw error;
        return { success: true, data: { success: true } };
    } catch (err: any) {
        console.error("Supabase Error [deleteNotification]:", err);
        return { success: false, error: err.message || "Failed to delete notification." };
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
                return { success: true, data: { skipped: true, note: "Column does not exist" } };
            }
            throw error;
        }
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message || "Failed to clear expired notifications." };
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

// ------------------------------------------------------------------
// REUSABLE ORDER CANCELLATION NOTIFICATION HELPERS
// ------------------------------------------------------------------

/**
 * Send notification when an order is cancelled by the Customer.
 */
export async function notifyCustomerOrderCancelled(
    recipientId: string,
    orderNumber: string,
    orderId: string,
    reason: string
): Promise<ServiceResponse> {
    try {
        return await sendNotification({
            userId: recipientId,
            userType: "customer",
            title: "Order Cancelled",
            message: `Your order #${orderNumber} has been cancelled successfully.\nReason: ${reason}`,
            type: "order",
            referenceId: orderId,
            metadata: {
                entity_type: "order",
                entity_id: orderId,
                cancelled_by: "customer",
                cancel_reason: reason
            }
        });
    } catch (err: any) {
        console.error("Failed to send customer order cancellation notification:", err);
        return { success: false, error: err.message || "Failed to notify customer of order cancellation." };
    }
}

/**
 * Send notification when an order is cancelled by the Vendor.
 */
export async function notifyVendorOrderCancelled(
    recipientId: string,
    orderNumber: string,
    orderId: string,
    reason: string
): Promise<ServiceResponse> {
    try {
        return await sendNotification({
            userId: recipientId,
            userType: "customer",
            title: "Order Cancelled by Vendor",
            message: `Your order #${orderNumber} has been cancelled by the vendor.\nReason: ${reason}`,
            type: "order",
            referenceId: orderId,
            metadata: {
                entity_type: "order",
                entity_id: orderId,
                cancelled_by: "vendor",
                cancel_reason: reason
            }
        });
    } catch (err: any) {
        console.error("Failed to send vendor order cancellation notification:", err);
        return { success: false, error: err.message || "Failed to notify customer of vendor order cancellation." };
    }
}

/**
 * Send notification when an order is cancelled by the Admin / Platform.
 */
export async function notifyAdminOrderCancelled(
    recipientId: string,
    orderNumber: string,
    orderId: string,
    reason: string
): Promise<ServiceResponse> {
    try {
        return await sendNotification({
            userId: recipientId,
            userType: "customer",
            title: "Order Cancelled by Platform",
            message: `Your order #${orderNumber} has been cancelled by the platform.\nReason: ${reason}`,
            type: "order",
            referenceId: orderId,
            metadata: {
                entity_type: "order",
                entity_id: orderId,
                cancelled_by: "admin",
                cancel_reason: reason
            }
        });
    } catch (err: any) {
        console.error("Failed to send admin order cancellation notification:", err);
        return { success: false, error: err.message || "Failed to notify customer of platform order cancellation." };
    }
}

/**
 * Unified helper method to route order cancellation notifications based on initiator.
 */
export async function notifyOrderCancelled(
    recipientId: string,
    orderNumber: string,
    orderId: string,
    reason: string,
    cancelledBy: "customer" | "vendor" | "admin"
): Promise<ServiceResponse> {
    switch (cancelledBy) {
        case "customer":
            return notifyCustomerOrderCancelled(recipientId, orderNumber, orderId, reason);
        case "vendor":
            return notifyVendorOrderCancelled(recipientId, orderNumber, orderId, reason);
        case "admin":
            return notifyAdminOrderCancelled(recipientId, orderNumber, orderId, reason);
        default:
            return notifyCustomerOrderCancelled(recipientId, orderNumber, orderId, reason);
    }
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
    sendAnnouncementNotification,
    notifyCustomerOrderCancelled,
    notifyVendorOrderCancelled,
    notifyAdminOrderCancelled,
    notifyOrderCancelled
};