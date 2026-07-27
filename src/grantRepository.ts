import type { DbAccessGrant, DbOrganization } from "./database";
import { supabaseRest, supabaseRpc } from "./supabase";

export interface AccessGrantView extends DbAccessGrant {
  requester_organization: DbOrganization;
}

export async function loadAccessGrants(profileId: string, accessToken: string): Promise<AccessGrantView[]> {
  return supabaseRest<AccessGrantView[]>(
    [
      `access_grants?subject_profile_id=eq.${encodeURIComponent(profileId)}`,
      "select=*,requester_organization:organizations!access_grants_requester_organization_id_fkey(*)",
      "order=created_at.desc"
    ].join("&"),
    { accessToken }
  );
}

export async function decideAccessGrant(input: {
  grantId: string;
  status: "approved" | "declined" | "revoked";
  reason: string;
  accessToken: string;
}): Promise<DbAccessGrant> {
  return supabaseRpc<DbAccessGrant>(
    "decide_access_grant",
    {
      target_grant_id: input.grantId,
      next_status: input.status,
      decision_reason: input.reason
    },
    { accessToken: input.accessToken }
  );
}

export async function createSampleAccessGrant(accessToken: string): Promise<DbAccessGrant> {
  return supabaseRpc<DbAccessGrant>("create_sample_access_grant_request", {}, { accessToken });
}
