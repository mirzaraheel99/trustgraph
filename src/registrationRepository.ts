import type { DbRegistrationIntent, RegistrationIntentMode, RegistrationIntentPortal } from "./database";
import { supabaseRpc } from "./supabase";

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
