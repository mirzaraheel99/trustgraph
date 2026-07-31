import type { DbRealDatabaseCompletionReceipt } from "./database";
import { supabaseRest, supabaseRpc } from "./supabase";

export async function loadRealDatabaseCompletionReceipts(accessToken: string): Promise<DbRealDatabaseCompletionReceipt[]> {
  return supabaseRest<DbRealDatabaseCompletionReceipt[]>("real_database_completion_receipts?select=*&order=created_at.desc&limit=5", {
    accessToken
  });
}

export async function recordRealDatabaseCompletionReceipt(input: {
  accessToken: string;
  organizationId: string | null;
  status: DbRealDatabaseCompletionReceipt["status"];
  completedSteps: number;
  totalSteps: number;
  missingGroups: string[];
  liveRowGroups: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
}): Promise<DbRealDatabaseCompletionReceipt> {
  return supabaseRpc<DbRealDatabaseCompletionReceipt>(
    "record_real_database_completion_receipt",
    {
      input_organization_id: input.organizationId,
      input_status: input.status,
      input_completed_steps: input.completedSteps,
      input_total_steps: input.totalSteps,
      input_missing_groups: input.missingGroups,
      input_live_row_groups: input.liveRowGroups,
      input_metadata: input.metadata
    },
    { accessToken: input.accessToken }
  );
}
