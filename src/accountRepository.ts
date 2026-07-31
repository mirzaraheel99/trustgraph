import type { DbOrganization, DbOrganizationMembership, DbProfile, OrganizationType } from "./database";
import type { RoleKey } from "./rbac";
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
  if (accessToken) {
    try {
      const context = await supabaseRpc<AccountContext>("get_account_context", {}, { accessToken });
      if (context.profile.id !== profileId) {
        throw new Error(`Profile mismatch: expected ${profileId}, received ${context.profile.id}`);
      }
      return context;
    } catch (error) {
      if (!isMissingAccountContextRpc(error)) {
        throw error;
      }
    }
  }

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

function isMissingAccountContextRpc(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Could not find the function public.get_account_context")
    || message.includes("function public.get_account_context")
    || message.includes("PGRST202");
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

export async function ensureEmployerReviewerMembership(accessToken: string) {
  return supabaseRpc("ensure_employer_reviewer_membership", {}, { accessToken });
}

export async function createCorporateAccount(input: {
  accessToken: string;
  organizationName: string;
  organizationType: Extract<OrganizationType, "employer" | "staffing_agency">;
  organizationDomain?: string;
}) {
  return supabaseRpc<DbOrganizationMembership>(
    "create_corporate_account",
    {
      organization_name: input.organizationName,
      organization_type: input.organizationType,
      organization_domain: input.organizationDomain || null
    },
    { accessToken: input.accessToken }
  );
}

export async function assignOwnCorporateRole(input: {
  accessToken: string;
  organizationId: string;
  role: Extract<RoleKey, "employer_admin" | "employer_reviewer" | "staffing_agency_admin" | "recruiter">;
}) {
  return supabaseRpc<DbOrganizationMembership>(
    "assign_own_corporate_role",
    {
      target_organization_id: input.organizationId,
      target_role: input.role
    },
    { accessToken: input.accessToken }
  );
}

export async function seedPilotWorkspace(accessToken: string) {
  return supabaseRpc<{
    profile_id: string;
    corporate_organization_id: string;
    membership_id: string;
    subscription_id: string;
    access_grant_id: string;
    corporate_access_review_id?: string;
    corporate_database_visibility_snapshot_id?: string;
    corporate_database_visibility_snapshots?: number;
    corporate_access_reviews?: number;
    consent_authorization_id: string;
    passport_records: number;
    evidence_documents: number;
  }>("seed_pilot_workspace", {}, { accessToken });
}
