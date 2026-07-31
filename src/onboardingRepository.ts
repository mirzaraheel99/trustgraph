import type { DbOnboardingWizardReceipt } from "./database";
import { supabaseRest, supabaseRpc } from "./supabase";

export async function loadOnboardingWizardReceipts(accessToken: string): Promise<DbOnboardingWizardReceipt[]> {
  return supabaseRest<DbOnboardingWizardReceipt[]>(
    "onboarding_wizard_receipts?select=*&order=created_at.desc&limit=5",
    { accessToken }
  );
}

export async function recordOnboardingWizardReceipt(input: {
  accessToken: string;
  organizationId: string | null;
  completedSteps: number;
  totalSteps: number;
  currentStepLabel: string;
  currentStepStatus: DbOnboardingWizardReceipt["current_step_status"];
  liveDatabaseRows: number;
  metadata: Record<string, unknown>;
}): Promise<DbOnboardingWizardReceipt> {
  return supabaseRpc<DbOnboardingWizardReceipt>(
    "record_onboarding_wizard_receipt",
    {
      input_organization_id: input.organizationId,
      input_completed_steps: input.completedSteps,
      input_total_steps: input.totalSteps,
      input_current_step_label: input.currentStepLabel,
      input_current_step_status: input.currentStepStatus,
      input_live_database_rows: input.liveDatabaseRows,
      input_metadata: input.metadata
    },
    { accessToken: input.accessToken }
  );
}
