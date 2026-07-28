import type { DbPilotLaunchContact, PilotLaunchContactStatus } from "./database";
import { supabaseRest, supabaseRpc } from "./supabase";

export async function loadPilotLaunchContacts(accessToken: string): Promise<DbPilotLaunchContact[]> {
  return supabaseRest<DbPilotLaunchContact[]>("pilot_launch_contacts?select=*&order=created_at.asc", {
    accessToken
  });
}

export async function recordPilotLaunchContact(input: {
  accessToken: string;
  contactKey: string;
  status: PilotLaunchContactStatus;
  organizationName?: string;
  contactName?: string;
  contactEmail?: string;
  notes?: string;
}): Promise<DbPilotLaunchContact> {
  return supabaseRpc<DbPilotLaunchContact>(
    "record_pilot_launch_contact",
    {
      input_contact_key: input.contactKey,
      input_status: input.status,
      input_organization_name: input.organizationName || null,
      input_contact_name: input.contactName || null,
      input_contact_email: input.contactEmail || null,
      input_notes: input.notes || null
    },
    { accessToken: input.accessToken }
  );
}
