import type { DbProductionGateDecision, ProductionGateStatus } from "./database";
import { supabaseRest, supabaseRpc } from "./supabase";

export async function loadProductionGateDecisions(accessToken: string): Promise<DbProductionGateDecision[]> {
  return supabaseRest<DbProductionGateDecision[]>("production_gate_decisions?select=*&order=created_at.asc", {
    accessToken
  });
}

export async function recordProductionGateDecision(input: {
  accessToken: string;
  gateKey: string;
  status: ProductionGateStatus;
  evidenceUrl?: string;
  notes?: string;
}): Promise<DbProductionGateDecision> {
  return supabaseRpc<DbProductionGateDecision>(
    "record_production_gate_decision",
    {
      input_gate_key: input.gateKey,
      input_status: input.status,
      input_evidence_url: input.evidenceUrl || null,
      input_notes: input.notes || null
    },
    { accessToken: input.accessToken }
  );
}
