import type { DbRegistrationIntent, RegistrationIntentMode, RegistrationIntentPortal } from "./database";
import { supabaseRest, supabaseRpc } from "./supabase";

export async function loadRegistrationIntents(accessToken: string): Promise<DbRegistrationIntent[]> {
  return supabaseRest<DbRegistrationIntent[]>("registration_intents?select=*&order=created_at.desc&limit=10", {
    accessToken
  });
}

export async function recordRegistrationIntent(input: {
  accessToken: string;
  selectedPortal: RegistrationIntentPortal;
  selectedMode: RegistrationIntentMode;
  pricingPlanId: string | null;
  organizationName?: string;
  organizationType?: "employer" | "staffing_agency";
  organizationDomain?: string;
  firstDatabaseWrite: string;
  nextDashboard: string;
  metadata?: Record<string, unknown>;
}): Promise<DbRegistrationIntent> {
  return supabaseRpc<DbRegistrationIntent>(
    "record_registration_intent",
    {
      selected_portal: input.selectedPortal,
      selected_mode: input.selectedMode,
      pricing_plan_id: input.pricingPlanId,
      organization_name: input.organizationName ?? "",
      organization_type: input.organizationType ?? "",
      organization_domain: input.organizationDomain ?? "",
      first_database_write: input.firstDatabaseWrite,
      next_dashboard: input.nextDashboard,
      metadata: input.metadata ?? {}
    },
    { accessToken: input.accessToken }
  );
}

export async function markRegistrationIntentWorkspaceCreated(input: {
  accessToken: string;
  intentId: string;
  organizationId: string;
}): Promise<DbRegistrationIntent> {
  return supabaseRpc<DbRegistrationIntent>(
    "mark_registration_intent_workspace_created",
    {
      target_intent_id: input.intentId,
      target_organization_id: input.organizationId
    },
    { accessToken: input.accessToken }
  );
}
