import type { DbOrganization, DbOrganizationMembership, DbProfile } from "./database";
import { supabaseRest } from "./supabase";

export interface AccountContext {
  profile: DbProfile;
  memberships: Array<
    DbOrganizationMembership & {
      organization: DbOrganization;
    }
  >;
}

export async function loadAccountContext(profileId: string, accessToken?: string): Promise<AccountContext> {
  const [profile] = await supabaseRest<DbProfile[]>(
    `profiles?id=eq.${encodeURIComponent(profileId)}&select=*`,
    { accessToken }
  );

  if (!profile) {
    throw new Error(`Profile not found: ${profileId}`);
  }

  const memberships = await supabaseRest<AccountContext["memberships"]>(
    [
      `organization_memberships?profile_id=eq.${encodeURIComponent(profileId)}`,
      "status=eq.active",
      "select=*,organization:organizations(*)"
    ].join("&"),
    { accessToken }
  );

  return {
    profile,
    memberships
  };
}

export async function requestAccessGrant(input: {
  subjectProfileId: string;
  requesterOrganizationId: string;
  requestedByProfileId: string;
  purpose: string;
  expiresAt?: string;
}) {
  return supabaseRest("access_grants", {
    method: "POST",
    body: JSON.stringify({
      subject_profile_id: input.subjectProfileId,
      requester_organization_id: input.requesterOrganizationId,
      requested_by_profile_id: input.requestedByProfileId,
      purpose: input.purpose,
      expires_at: input.expiresAt ?? null
    })
  });
}
