import type { DbNotificationEvent } from "./database";
import { supabaseRest, supabaseRpc } from "./supabase";

export async function loadNotificationEvents(accessToken: string): Promise<DbNotificationEvent[]> {
  return supabaseRest<DbNotificationEvent[]>("notification_events?select=*&order=created_at.desc&limit=8", {
    accessToken
  });
}

export async function markNotificationEvent(input: {
  accessToken: string;
  notificationId: string;
  status: "delivered" | "suppressed";
}): Promise<DbNotificationEvent> {
  return supabaseRpc<DbNotificationEvent>(
    "mark_notification_event_status",
    {
      target_notification_id: input.notificationId,
      next_status: input.status
    },
    { accessToken: input.accessToken }
  );
}
