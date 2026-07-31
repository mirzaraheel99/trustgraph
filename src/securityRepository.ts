import type { DbSecurityRlsReviewReceipt } from "./database";
import { supabaseRest, supabaseRpc } from "./supabase";

export async function loadSecurityRlsReviewReceipts(accessToken: string): Promise<DbSecurityRlsReviewReceipt[]> {
  return supabaseRest<DbSecurityRlsReviewReceipt[]>("security_rls_review_receipts?select=*&order=created_at.desc&limit=5", {
    accessToken
  });
}

export async function recordSecurityRlsReviewReceipt(input: {
  accessToken: string;
  organizationId: string | null;
  status: DbSecurityRlsReviewReceipt["status"];
  rlsProtectedTableCount: number;
  checksReady: number;
  checksTotal: number;
  migrationLedgerRows: number;
  auditEventCount: number;
  openSecurityItems: string[];
  externalSignoffRecorded: boolean;
  metadata: Record<string, unknown>;
}): Promise<DbSecurityRlsReviewReceipt> {
  return supabaseRpc<DbSecurityRlsReviewReceipt>(
    "record_security_rls_review_receipt",
    {
      input_organization_id: input.organizationId,
      input_status: input.status,
      input_rls_protected_table_count: input.rlsProtectedTableCount,
      input_checks_ready: input.checksReady,
      input_checks_total: input.checksTotal,
      input_migration_ledger_rows: input.migrationLedgerRows,
      input_audit_event_count: input.auditEventCount,
      input_open_security_items: input.openSecurityItems,
      input_external_signoff_recorded: input.externalSignoffRecorded,
      input_metadata: input.metadata
    },
    { accessToken: input.accessToken }
  );
}
