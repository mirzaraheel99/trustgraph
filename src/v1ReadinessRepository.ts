import type { DbV1LiveDatabaseReadinessReceipt } from "./database";
import { supabaseRest, supabaseRpc } from "./supabase";

export interface RecordV1LiveDatabaseReadinessInput {
  organizationId: string | null;
  status: DbV1LiveDatabaseReadinessReceipt["status"];
  source: DbV1LiveDatabaseReadinessReceipt["source"];
  readyGroups: number;
  totalRequiredGroups: number;
  missingRequiredGroups: string[];
  requiredOperatorExports: string[];
  serverSaveStatus: string;
  metadata: Record<string, unknown>;
}

export function loadV1LiveDatabaseReadinessReceipts(accessToken: string) {
  return supabaseRest<DbV1LiveDatabaseReadinessReceipt[]>(
    "v1_live_database_readiness_receipts?select=*&order=created_at.desc&limit=5",
    { accessToken }
  );
}

export function recordV1LiveDatabaseReadinessReceipt(
  input: RecordV1LiveDatabaseReadinessInput,
  accessToken: string
) {
  return supabaseRpc<DbV1LiveDatabaseReadinessReceipt>(
    "record_v1_live_database_readiness_receipt",
    {
      input_organization_id: input.organizationId,
      input_status: input.status,
      input_source: input.source,
      input_ready_groups: input.readyGroups,
      input_total_required_groups: input.totalRequiredGroups,
      input_missing_required_groups: input.missingRequiredGroups,
      input_required_operator_exports: input.requiredOperatorExports,
      input_server_save_status: input.serverSaveStatus,
      input_metadata: input.metadata
    },
    { accessToken }
  );
}
