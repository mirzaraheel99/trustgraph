import type { AdminAuditExportFormat, DbAdminAuditExportReceipt, DbAuditEvent } from "./database";
import { supabaseRest, supabaseRpc } from "./supabase";

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

export async function loadAdminAuditExportReceipts(accessToken: string): Promise<DbAdminAuditExportReceipt[]> {
  return supabaseRest<DbAdminAuditExportReceipt[]>(
    "admin_audit_export_receipts?select=*&order=created_at.desc&limit=8",
    { accessToken }
  );
}

export async function recordAdminAuditExportReceipt(input: {
  accessToken: string;
  organizationId?: string | null;
  exportFormat: AdminAuditExportFormat;
  recommendedExport: string;
  activeFilters: Record<string, unknown>;
  filteredEventCount: number;
  loadedEventCount: number;
  guardrailEventCount: number;
  highSignalEventCount: number;
  verificationCaseCount: number;
  dataRightsRequestCount: number;
  releaseLedgerCount: number;
  metadata?: Record<string, unknown>;
}): Promise<DbAdminAuditExportReceipt> {
  return supabaseRpc<DbAdminAuditExportReceipt>(
    "record_admin_audit_export_receipt",
    {
      input_organization_id: input.organizationId ?? null,
      input_export_format: input.exportFormat,
      input_recommended_export: input.recommendedExport,
      input_active_filters: input.activeFilters,
      input_filtered_event_count: input.filteredEventCount,
      input_loaded_event_count: input.loadedEventCount,
      input_guardrail_event_count: input.guardrailEventCount,
      input_high_signal_event_count: input.highSignalEventCount,
      input_verification_case_count: input.verificationCaseCount,
      input_data_rights_request_count: input.dataRightsRequestCount,
      input_release_ledger_count: input.releaseLedgerCount,
      input_metadata: input.metadata ?? {}
    },
    { accessToken: input.accessToken }
  );
}

export function auditActionLabel(action: string) {
  return action.replace(/[._]/g, " ");
}
