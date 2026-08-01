import type { DbV1PilotRouteRunReceipt } from "./database";
import { supabaseRest, supabaseRpc } from "./supabase";

export async function loadV1PilotRouteRunReceipts(accessToken: string): Promise<DbV1PilotRouteRunReceipt[]> {
  return supabaseRest<DbV1PilotRouteRunReceipt[]>("v1_pilot_route_run_receipts?select=*&order=created_at.desc&limit=5", {
    accessToken
  });
}

export async function recordV1PilotRouteRunReceipt(input: {
  accessToken: string;
  organizationId: string | null;
  status: DbV1PilotRouteRunReceipt["status"];
  readySteps: number;
  totalSteps: number;
  missingSteps: string[];
  routeSteps: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
}): Promise<DbV1PilotRouteRunReceipt> {
  return supabaseRpc<DbV1PilotRouteRunReceipt>(
    "record_v1_pilot_route_run_receipt",
    {
      input_organization_id: input.organizationId,
      input_status: input.status,
      input_ready_steps: input.readySteps,
      input_total_steps: input.totalSteps,
      input_missing_steps: input.missingSteps,
      input_route_steps: input.routeSteps,
      input_metadata: input.metadata
    },
    { accessToken: input.accessToken }
  );
}
