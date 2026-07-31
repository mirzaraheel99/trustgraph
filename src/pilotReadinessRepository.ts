import type { DbPilotOwnerReadinessReceipt } from "./database";
import { supabaseRest, supabaseRpc } from "./supabase";

export async function loadPilotOwnerReadinessReceipts(accessToken: string): Promise<DbPilotOwnerReadinessReceipt[]> {
  return supabaseRest<DbPilotOwnerReadinessReceipt[]>("pilot_owner_readiness_receipts?select=*&order=created_at.desc&limit=5", {
    accessToken
  });
}

export async function recordPilotOwnerReadinessReceipt(input: {
  accessToken: string;
  organizationId: string | null;
  status: DbPilotOwnerReadinessReceipt["status"];
  contactsReady: number;
  contactsTotal: number;
  missingContacts: string[];
  pilotCustomerCount: number;
  onboardingOwnerRecorded: boolean;
  supportOwnerRecorded: boolean;
  incidentOwnerRecorded: boolean;
  metadata: Record<string, unknown>;
}): Promise<DbPilotOwnerReadinessReceipt> {
  return supabaseRpc<DbPilotOwnerReadinessReceipt>(
    "record_pilot_owner_readiness_receipt",
    {
      input_organization_id: input.organizationId,
      input_status: input.status,
      input_contacts_ready: input.contactsReady,
      input_contacts_total: input.contactsTotal,
      input_missing_contacts: input.missingContacts,
      input_pilot_customer_count: input.pilotCustomerCount,
      input_onboarding_owner_recorded: input.onboardingOwnerRecorded,
      input_support_owner_recorded: input.supportOwnerRecorded,
      input_incident_owner_recorded: input.incidentOwnerRecorded,
      input_metadata: input.metadata
    },
    { accessToken: input.accessToken }
  );
}
