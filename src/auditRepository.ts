import type { DbAuditEvent } from "./database";
import { supabaseRest } from "./supabase";

export interface AuditEventFilters {
  action?: string;
  limit?: number;
  targetTable?: string;
}

export async function loadAuditEvents(accessToken: string, filters: AuditEventFilters = {}): Promise<DbAuditEvent[]> {
  const params = new URLSearchParams({
    select: "*",
    order: "created_at.desc",
    limit: String(filters.limit ?? 24)
  });

  if (filters.action) {
    params.set("action", `ilike.*${filters.action}*`);
  }

  if (filters.targetTable) {
    params.set("target_table", `eq.${filters.targetTable}`);
  }

  return supabaseRest<DbAuditEvent[]>(`audit_events?${params.toString()}`, {
    accessToken
  });
}

export function auditActionLabel(action: string) {
  return action.replace(/[._]/g, " ");
}
