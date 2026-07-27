import type { DbAuditEvent } from "./database";
import { supabaseRest } from "./supabase";

export async function loadAuditEvents(accessToken: string): Promise<DbAuditEvent[]> {
  return supabaseRest<DbAuditEvent[]>("audit_events?select=*&order=created_at.desc&limit=8", {
    accessToken
  });
}

export function auditActionLabel(action: string) {
  return action.replace(/[._]/g, " ");
}
