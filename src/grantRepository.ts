import type { DbAccessGrant, DbOrganization, DbProfile } from "./database";
import { supabaseRest, supabaseRpc } from "./supabase";

export interface AccessGrantView extends DbAccessGrant {
  requester_organization: DbOrganization;
}

export interface VerifyAccessGrantView extends DbAccessGrant {
  subject_profile: DbProfile;
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

export async function loadVerifyAccessGrants(organizationId: string, accessToken: string): Promise<VerifyAccessGrantView[]> {
  return supabaseRest<VerifyAccessGrantView[]>(
    [
      `access_grants?requester_organization_id=eq.${encodeURIComponent(organizationId)}`,
      "select=*,subject_profile:profiles!access_grants_subject_profile_id_fkey(*)",
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

export async function createAccessGrantRequest(input: {
  subjectEmail: string;
  purpose: string;
  expiresInDays: number;
  accessToken: string;
}): Promise<DbAccessGrant> {
  return supabaseRpc<DbAccessGrant>(
    "create_access_grant_request",
    {
      target_subject_email: input.subjectEmail,
      request_purpose: input.purpose,
      expires_in_days: input.expiresInDays
    },
    { accessToken: input.accessToken }
  );
}

export async function syncAccessGrantRecords(grantId: string, accessToken: string): Promise<number> {
  return supabaseRpc<number>("sync_access_grant_records", { target_grant_id: grantId }, { accessToken });
}

export async function preparePilotAccessGrant(accessToken: string): Promise<DbAccessGrant> {
  return supabaseRpc<DbAccessGrant>("prepare_pilot_access_grant_request", {}, { accessToken });
}
