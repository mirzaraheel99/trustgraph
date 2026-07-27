import type { DbOrganization, DbOrganizationMembership, DbProfile } from "./database";
import type { Organization, SessionUser } from "./rbac";
import { supabaseRest, supabaseRpc } from "./supabase";

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

export async function ensureProfessionalAccount(input: {
  profileId: string;
  email: string;
  fullName?: string;
  accessToken: string;
}): Promise<AccountContext> {
  const existing = await tryLoadAccountContext(input.profileId, input.accessToken);
  if (existing && existing.memberships.length > 0) {
    return existing;
  }

  await supabaseRpc("create_professional_account", {
    profile_email: input.email,
    profile_full_name: input.fullName || input.email
  }, {
    accessToken: input.accessToken,
  });

  return loadAccountContext(input.profileId, input.accessToken);
}

export async function tryLoadAccountContext(profileId: string, accessToken: string): Promise<AccountContext | null> {
  try {
    return await loadAccountContext(profileId, accessToken);
  } catch {
    return null;
  }
}

export function accountContextToSessionUser(context: AccountContext): SessionUser {
  return {
    id: context.profile.id,
    name: context.profile.full_name,
    email: context.profile.email,
    activeMembershipId: context.memberships[0]?.id ?? "",
    memberships: context.memberships.map((membership) => ({
      id: membership.id,
      organizationId: membership.organization_id,
      role: membership.role,
      status: membership.status
    }))
  };
}

export function accountContextOrganizations(context: AccountContext): Organization[] {
  return context.memberships.map((membership) => ({
    id: membership.organization.id,
    name: membership.organization.name,
    type: membership.organization.type,
    status: membership.organization.status,
    domain: membership.organization.domain ?? undefined
  }));
}
