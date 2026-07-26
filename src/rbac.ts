import type { Tone, WorkspaceId } from "./data";

export type OrganizationType = "professional" | "employer" | "staffing_agency" | "trustgraph";

export type RoleKey =
  | "professional"
  | "employer_admin"
  | "employer_reviewer"
  | "staffing_agency_admin"
  | "recruiter"
  | "reference_provider"
  | "credential_issuer"
  | "verification_partner"
  | "support_agent"
  | "trustgraph_verifier"
  | "compliance_admin"
  | "system_admin"
  | "auditor";

export type PermissionKey =
  | "passport:manage_own"
  | "passport:view_shared"
  | "organization:manage"
  | "organization:invite"
  | "access_grant:request"
  | "access_grant:approve"
  | "record:create"
  | "record:verify_employment"
  | "record:issue_credential"
  | "verification:submit_result"
  | "reference:submit"
  | "admin:support"
  | "admin:verify"
  | "admin:compliance"
  | "admin:system"
  | "audit:view";

export interface RoleDefinition {
  key: RoleKey;
  label: string;
  portal: WorkspaceId;
  description: string;
  permissions: PermissionKey[];
  risk: Tone;
}

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  status: "active" | "pending_approval" | "restricted";
  domain?: string;
}

export interface Membership {
  id: string;
  organizationId: string;
  role: RoleKey;
  status: "active" | "invited" | "suspended";
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  activeMembershipId: string;
  memberships: Membership[];
}

export const roleDefinitions: RoleDefinition[] = [
  {
    key: "professional",
    label: "Professional",
    portal: "passport",
    description: "Owns and manages a TrustGraph Passport.",
    permissions: ["passport:manage_own", "access_grant:approve", "record:create"],
    risk: "success"
  },
  {
    key: "employer_admin",
    label: "Employer Administrator",
    portal: "verify",
    description: "Manages employer account, reviewers, access requests, and reports.",
    permissions: ["organization:manage", "organization:invite", "access_grant:request", "passport:view_shared", "audit:view"],
    risk: "info"
  },
  {
    key: "employer_reviewer",
    label: "Employer Reviewer",
    portal: "verify",
    description: "Reviews approved shared profiles and confirmation tasks.",
    permissions: ["access_grant:request", "passport:view_shared", "record:verify_employment"],
    risk: "info"
  },
  {
    key: "staffing_agency_admin",
    label: "Staffing Agency Administrator",
    portal: "verify",
    description: "Manages agency teams, candidates, readiness workflows, and client sharing.",
    permissions: ["organization:manage", "organization:invite", "access_grant:request", "passport:view_shared", "audit:view"],
    risk: "info"
  },
  {
    key: "recruiter",
    label: "Recruiter",
    portal: "verify",
    description: "Works assigned candidates and missing-record queues.",
    permissions: ["access_grant:request", "passport:view_shared"],
    risk: "neutral"
  },
  {
    key: "reference_provider",
    label: "Reference Provider",
    portal: "passport",
    description: "Submits invited structured references without Passport browsing.",
    permissions: ["reference:submit"],
    risk: "neutral"
  },
  {
    key: "credential_issuer",
    label: "Credential Issuer",
    portal: "verify",
    description: "Issues, updates, expires, and revokes issuer-scoped credentials.",
    permissions: ["record:issue_credential"],
    risk: "warning"
  },
  {
    key: "verification_partner",
    label: "Verification Partner",
    portal: "verify",
    description: "Submits assigned verification results.",
    permissions: ["verification:submit_result"],
    risk: "warning"
  },
  {
    key: "support_agent",
    label: "TrustGraph Support Agent",
    portal: "admin",
    description: "Handles support cases with limited reason-coded access.",
    permissions: ["admin:support"],
    risk: "warning"
  },
  {
    key: "trustgraph_verifier",
    label: "TrustGraph Verifier",
    portal: "admin",
    description: "Reviews assigned verification cases and outcomes.",
    permissions: ["admin:verify", "audit:view"],
    risk: "warning"
  },
  {
    key: "compliance_admin",
    label: "Compliance Administrator",
    portal: "admin",
    description: "Handles fraud, disputes, legal-sensitive restrictions, and compliance cases.",
    permissions: ["admin:compliance", "audit:view"],
    risk: "danger"
  },
  {
    key: "system_admin",
    label: "System Administrator",
    portal: "admin",
    description: "Manages platform configuration, integrations, and privileged controls.",
    permissions: ["admin:system", "audit:view"],
    risk: "danger"
  },
  {
    key: "auditor",
    label: "Auditor",
    portal: "admin",
    description: "Reviews scoped audit activity without altering business records.",
    permissions: ["audit:view"],
    risk: "neutral"
  }
];

export const organizations: Organization[] = [
  {
    id: "org-personal",
    name: "Maya Patel Passport",
    type: "professional",
    status: "active"
  },
  {
    id: "org-northstar",
    name: "Northstar Health",
    type: "employer",
    status: "active",
    domain: "northstar.example"
  },
  {
    id: "org-bridge",
    name: "BridgeStaff Medical",
    type: "staffing_agency",
    status: "pending_approval",
    domain: "bridgestaff.example"
  },
  {
    id: "org-ops",
    name: "TrustGraph Operations",
    type: "trustgraph",
    status: "active"
  }
];

export const sessionUser: SessionUser = {
  id: "user-maya-admin",
  name: "Maya Patel",
  email: "maya.patel@example.com",
  activeMembershipId: "mem-professional",
  memberships: [
    {
      id: "mem-professional",
      organizationId: "org-personal",
      role: "professional",
      status: "active"
    },
    {
      id: "mem-employer-reviewer",
      organizationId: "org-northstar",
      role: "employer_reviewer",
      status: "active"
    },
    {
      id: "mem-verifier",
      organizationId: "org-ops",
      role: "trustgraph_verifier",
      status: "active"
    }
  ]
};

export function getRole(role: RoleKey) {
  return roleDefinitions.find((item) => item.key === role) ?? roleDefinitions[0];
}

export function getOrganization(organizationId: string) {
  return organizations.find((item) => item.id === organizationId) ?? organizations[0];
}

export function getActiveMembership(user: SessionUser) {
  return user.memberships.find((item) => item.id === user.activeMembershipId) ?? user.memberships[0];
}

export function canAccessWorkspace(role: RoleKey, workspaceId: WorkspaceId) {
  return getRole(role).portal === workspaceId;
}

export function hasPermission(role: RoleKey, permission: PermissionKey) {
  return getRole(role).permissions.includes(permission);
}
