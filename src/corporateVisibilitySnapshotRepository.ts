import type { CorporateDatabaseVisibilitySnapshotStatus, DbCorporateDatabaseVisibilitySnapshot } from "./database";
import { supabaseRest, supabaseRpc } from "./supabase";

export function loadCorporateDatabaseVisibilitySnapshots(organizationId: string, accessToken: string) {
  return supabaseRest<DbCorporateDatabaseVisibilitySnapshot[]>(
    [
      `corporate_database_visibility_snapshots?organization_id=eq.${encodeURIComponent(organizationId)}`,
      "select=*",
      "order=created_at.desc",
      "limit=8"
    ].join("&"),
    { accessToken }
  );
}

export function recordCorporateDatabaseVisibilitySnapshot(
  input: {
    organizationId: string;
    status: CorporateDatabaseVisibilitySnapshotStatus;
    filteredProfessionalCount: number;
    sharedRecordCount: number;
    accessGrantCount: number;
    reviewAttestationCount: number;
    openGapCount: number;
    activeFilters: Record<string, unknown>;
    readinessBuckets: Array<Record<string, unknown>>;
    rowInventory: Array<Record<string, unknown>>;
    metadata: Record<string, unknown>;
  },
  accessToken: string
) {
  return supabaseRpc<DbCorporateDatabaseVisibilitySnapshot>(
    "record_corporate_database_visibility_snapshot",
    {
      input_organization_id: input.organizationId,
      input_status: input.status,
      input_filtered_professional_count: input.filteredProfessionalCount,
      input_shared_record_count: input.sharedRecordCount,
      input_access_grant_count: input.accessGrantCount,
      input_review_attestation_count: input.reviewAttestationCount,
      input_open_gap_count: input.openGapCount,
      input_active_filters: input.activeFilters,
      input_readiness_buckets: input.readinessBuckets,
      input_row_inventory: input.rowInventory,
      input_metadata: input.metadata
    },
    { accessToken }
  );
}
