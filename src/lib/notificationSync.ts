import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type RecipientType = "customer" | "vendor" | "rider" | "admin";

export interface NotificationCallbacks {
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  onError?: (error: Error) => void;
}

let activeChannel: RealtimeChannel | null = null;
let activeRecipientId: string | null = null;
let activeRecipientType: RecipientType | null = null;
let activeCallbacks: NotificationCallbacks = {};

export function stopNotificationSync(): void {
  if (activeChannel) {
    supabase.removeChannel(activeChannel);
    activeChannel = null;
  }
}

export function startNotificationSync(
  recipientId: string,
  recipientType: RecipientType,
  callbacks: NotificationCallbacks
): void {
  if (!recipientId || !recipientType) {
    if (callbacks.onError) {
      callbacks.onError(new Error("Missing mandatory routing filters context payload parameters."));
    }
    return;
  }

  if (activeChannel) {
    return;
  }

  activeRecipientId = recipientId;
  activeRecipientType = recipientType;
  activeCallbacks = callbacks;

  activeChannel = supabase
    .channel(`notifications:${recipientType}:${recipientId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
      },
      (payload) => {
        const row = payload.new && Object.keys(payload.new).length > 0 ? payload.new : payload.old;
        if (!row) return;

        const targetId = (row as any).recipient_id;
        const targetType = (row as any).recipient_type;

        if (targetId === activeRecipientId && targetType === activeRecipientType) {
          switch (payload.eventType) {
            case "INSERT":
              if (activeCallbacks.onInsert) activeCallbacks.onInsert(payload.new);
              break;
            case "UPDATE":
              if (activeCallbacks.onUpdate) activeCallbacks.onUpdate(payload.new);
              break;
            case "DELETE":
              if (activeCallbacks.onDelete) activeCallbacks.onDelete(payload.old);
              break;
          }
        }
      }
    )
    .subscribe((status, err) => {
      if (status === "CHANNEL_ERROR" && activeCallbacks.onError) {
        activeCallbacks.onError(err || new Error("Supabase Realtime channel subscription processing failure."));
      }
    });
}

export function restartNotificationSync(): void {
  const currentId = activeRecipientId;
  const currentType = activeRecipientType;
  const currentCallbacks = { ...activeCallbacks };

  stopNotificationSync();

  if (currentId && currentType) {
    startNotificationSync(currentId, currentType, currentCallbacks);
  }
}

export const notificationSync = {
  startNotificationSync,
  stopNotificationSync,
  restartNotificationSync,
};