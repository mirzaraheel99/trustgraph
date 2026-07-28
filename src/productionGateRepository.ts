import type { DbProductionGateDecision } from "./database";
import { supabaseRest } from "./supabase";

export async function loadProductionGateDecisions(accessToken: string): Promise<DbProductionGateDecision[]> {
  return supabaseRest<DbProductionGateDecision[]>("production_gate_decisions?select=*&order=created_at.asc", {
    accessToken
  });
}
