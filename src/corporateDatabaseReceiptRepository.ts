import type { CorporateDatabaseAccessReceiptStatus, DbCorporateDatabaseAccessReceipt } from "./database";
import { supabaseRest, supabaseRpc } from "./supabase";

export interface RecordCorporateDatabaseAccessReceiptInput {
  organizationId: string;
  status: CorporateDatabaseAccessReceiptStatus;
  accessGrantCount: number;
  sharedRecordCount: number;
  reviewAttestationCount: number;
  openGapCount: number;
  exportedPacketName: string;
  metadata: Record<string, unknown>;
}

export function loadCorporateDatabaseAccessReceipts(organizationId: string, accessToken: string) {
  return supabaseRest<DbCorporateDatabaseAccessReceipt[]>(
    [
      `corporate_database_access_receipts?organization_id=eq.${encodeURIComponent(organizationId)}`,
      "select=*",
      "order=created_at.desc",
      "limit=8"
    ].join("&"),
    { accessToken }
  );
}

export function recordCorporateDatabaseAccessReceipt(
  input: RecordCorporateDatabaseAccessReceiptInput,
  accessToken: string
) {
  return supabaseRpc<DbCorporateDatabaseAccessReceipt>(
    "record_corporate_database_access_receipt",
    {
      input_organization_id: input.organizationId,
      input_status: input.status,
      input_access_grant_count: input.accessGrantCount,
      input_shared_record_count: input.sharedRecordCount,
      input_review_attestation_count: input.reviewAttestationCount,
      input_open_gap_count: input.openGapCount,
      input_exported_packet_name: input.exportedPacketName,
      input_metadata: input.metadata
    },
    { accessToken }
  );
}
