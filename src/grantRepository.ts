import type { CorporateAccessReviewStatus, DbAccessGrant, DbCorporateAccessReview, DbOrganization, DbProfile } from "./database";
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

export async function loadCorporateAccessReviews(organizationId: string, accessToken: string): Promise<DbCorporateAccessReview[]> {
  return supabaseRest<DbCorporateAccessReview[]>(
    [
      `corporate_access_reviews?requester_organization_id=eq.${encodeURIComponent(organizationId)}`,
      "select=*",
      "order=created_at.desc",
      "limit=24"
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

export async function recordCorporateAccessReview(input: {
  accessGrantId: string;
  status: CorporateAccessReviewStatus;
  note: string;
  accessToken: string;
}): Promise<DbCorporateAccessReview> {
  return supabaseRpc<DbCorporateAccessReview>(
    "record_corporate_access_review",
    {
      target_access_grant_id: input.accessGrantId,
      next_review_status: input.status,
      review_note: input.note
    },
    { accessToken: input.accessToken }
  );
}

export async function syncAccessGrantRecords(grantId: string, accessToken: string): Promise<number> {
  return supabaseRpc<number>("sync_access_grant_records", { target_grant_id: grantId }, { accessToken });
}

export async function preparePilotAccessGrant(accessToken: string): Promise<DbAccessGrant> {
  try {
    return await supabaseRpc<DbAccessGrant>("prepare_pilot_user_access_request", {}, { accessToken });
  } catch (error) {
    if (!isMissingPilotAliasRpc(error, "prepare_pilot_user_access_request")) {
      throw error;
    }
    return supabaseRpc<DbAccessGrant>("prepare_pilot_access_grant_request", {}, { accessToken });
  }
}

function isMissingPilotAliasRpc(error: unknown, functionName: string) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes(`Could not find the function public.${functionName}`)
    || message.includes(`function public.${functionName}`)
    || message.includes("PGRST202");
}
