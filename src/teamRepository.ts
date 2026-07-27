import type { DbOrganizationInvitation, DbOrganizationMembership, DbProfile } from "./database";
import type { RoleKey } from "./rbac";
import { supabaseRest, supabaseRpc } from "./supabase";

export type OrganizationMemberView = DbOrganizationMembership & {
  profile: Pick<DbProfile, "id" | "full_name" | "email"> | null;
};

export async function loadOrganizationMembers(organizationId: string, accessToken: string): Promise<OrganizationMemberView[]> {
  return supabaseRest<OrganizationMemberView[]>(
    [
      `organization_memberships?organization_id=eq.${encodeURIComponent(organizationId)}`,
      "select=*,profile:profiles!organization_memberships_profile_id_fkey(id,full_name,email)",
      "order=created_at.asc",
      "limit=24"
    ].join("&"),
    { accessToken }
  );
}

export async function loadOrganizationInvitations(
  organizationId: string,
  accessToken: string
): Promise<DbOrganizationInvitation[]> {
  return supabaseRest<DbOrganizationInvitation[]>(
    [
      `organization_invitations?organization_id=eq.${encodeURIComponent(organizationId)}`,
      "select=*,organization:organizations!organization_invitations_organization_id_fkey(id,name,type)",
      "order=created_at.desc",
      "limit=12"
    ].join("&"),
    { accessToken }
  );
}

export async function loadMyPendingInvitations(profileEmail: string, accessToken: string): Promise<DbOrganizationInvitation[]> {
  return supabaseRest<DbOrganizationInvitation[]>(
    [
      `organization_invitations?invited_email=eq.${encodeURIComponent(profileEmail.toLowerCase())}`,
      "status=eq.pending",
      "select=*,organization:organizations!organization_invitations_organization_id_fkey(id,name,type)",
      "order=created_at.desc",
      "limit=8"
    ].join("&"),
    { accessToken }
  );
}

export async function createOrganizationInvitation(input: {
  accessToken: string;
  email: string;
  role: Extract<RoleKey, "employer_admin" | "employer_reviewer" | "staffing_agency_admin" | "recruiter">;
}): Promise<DbOrganizationInvitation> {
  return supabaseRpc<DbOrganizationInvitation>(
    "create_organization_invitation",
    {
      target_email: input.email,
      target_role: input.role
    },
    { accessToken: input.accessToken }
  );
}

export async function markOrganizationInvitationStatus(input: {
  accessToken: string;
  invitationId: string;
  status: "cancelled" | "expired";
}): Promise<DbOrganizationInvitation> {
  return supabaseRpc<DbOrganizationInvitation>(
    "mark_organization_invitation_status",
    {
      target_invitation_id: input.invitationId,
      next_status: input.status
    },
    { accessToken: input.accessToken }
  );
}

export async function acceptOrganizationInvitation(input: {
  accessToken: string;
  invitationId: string;
}): Promise<DbOrganizationInvitation> {
  return supabaseRpc<DbOrganizationInvitation>(
    "accept_organization_invitation",
    {
      target_invitation_id: input.invitationId
    },
    { accessToken: input.accessToken }
  );
}

export async function markOrganizationMemberStatus(input: {
  accessToken: string;
  membershipId: string;
  status: "active" | "suspended";
}): Promise<OrganizationMemberView> {
  return supabaseRpc<OrganizationMemberView>(
    "mark_organization_member_status",
    {
      target_membership_id: input.membershipId,
      next_status: input.status
    },
    { accessToken: input.accessToken }
  );
}
