import type { DbNotificationEvent } from "./database";
import { supabaseRest } from "./supabase";

export async function loadNotificationEvents(accessToken: string): Promise<DbNotificationEvent[]> {
  return supabaseRest<DbNotificationEvent[]>("notification_events?select=*&order=created_at.desc&limit=8", {
    accessToken
  });
}
