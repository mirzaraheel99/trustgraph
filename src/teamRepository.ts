import type { DbOrganizationInvitation } from "./database";
import type { RoleKey } from "./rbac";
import { supabaseRest, supabaseRpc } from "./supabase";

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
