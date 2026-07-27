import type { PermissionKey, RoleKey } from "./rbac";

export type OrganizationType = "professional" | "employer" | "staffing_agency" | "trustgraph";
export type OrganizationStatus = "active" | "pending_approval" | "restricted";
export type MembershipStatus = "active" | "invited" | "suspended";
export type RecordStatus = "draft" | "pending_verification" | "verified" | "expired" | "disputed" | "revoked" | "restricted";
export type RecordType =
  | "identity"
  | "employment"
  | "contract_assignment"
  | "education"
  | "license"
  | "certification"
  | "reference"
  | "background_check"
  | "training"
  | "skill"
  | "performance_review"
  | "continuing_education"
  | "health_clearance"
  | "custom";
export type AccessGrantStatus = "requested" | "approved" | "declined" | "expired" | "revoked";
export type VerificationCaseType =
  | "identity_review"
  | "license_mismatch"
  | "employment_confirmation"
  | "document_classification"
  | "fraud_signal"
  | "dispute";
export type VerificationCaseStatus = "open" | "in_review" | "resolved" | "restricted" | "dismissed";
export type VerificationCasePriority = "low" | "medium" | "high" | "critical";
export type EvidenceDocumentStatus = "uploaded" | "classified" | "linked" | "restricted" | "rejected" | "archived";
export type NotificationEventStatus = "queued" | "sent" | "delivered" | "failed" | "suppressed";
export type NotificationChannel = "in_app" | "email" | "sms";
export type ReferenceRequestStatus =
  | "draft"
  | "sent"
  | "opened"
  | "in_progress"
  | "submitted"
  | "declined"
  | "expired"
  | "cancelled";
export type MissingRecordRequestStatus = "requested" | "in_progress" | "fulfilled" | "declined" | "cancelled" | "expired";
export type ApiClientStatus = "active" | "paused" | "revoked";
export type WebhookSubscriptionStatus = "active" | "paused" | "failed" | "revoked";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "cancelled";
export type OrganizationInvitationStatus = "pending" | "accepted" | "cancelled" | "expired";
export type ConsentAuthorizationStatus = "active" | "revoked" | "expired";

export interface DbOrganization {
  id: string;
  name: string;
  type: OrganizationType;
  status: OrganizationStatus;
  domain: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbProfile {
  id: string;
  full_name: string;
  email: string;
  primary_organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbOrganizationMembership {
  id: string;
  organization_id: string;
  profile_id: string;
  role: RoleKey;
  status: MembershipStatus;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTrustRecord {
  id: string;
  owner_profile_id: string;
  issuer_organization_id: string | null;
  type: RecordType;
  title: string;
  status: RecordStatus;
  source_name: string;
  evidence_summary: string | null;
  issued_at: string | null;
  expires_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbAccessGrant {
  id: string;
  subject_profile_id: string;
  requester_organization_id: string;
  requested_by_profile_id: string | null;
  status: AccessGrantStatus;
  purpose: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbAccessGrantRecord {
  access_grant_id: string;
  trust_record_id: string;
}

export interface DbAuditEvent {
  id: string;
  actor_profile_id: string | null;
  organization_id: string | null;
  action: string;
  target_table: string;
  target_id: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DbVerificationCase {
  id: string;
  organization_id: string | null;
  subject_profile_id: string | null;
  trust_record_id: string | null;
  case_type: VerificationCaseType;
  status: VerificationCaseStatus;
  priority: VerificationCasePriority;
  title: string;
  summary: string;
  reason_code: string;
  assigned_to_profile_id: string | null;
  resolution_note: string | null;
  metadata: Record<string, unknown>;
  due_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbEvidenceDocument {
  id: string;
  owner_profile_id: string;
  trust_record_id: string | null;
  uploaded_by_profile_id: string | null;
  status: EvidenceDocumentStatus;
  title: string;
  document_type: string;
  storage_path: string | null;
  source_name: string;
  classification: string;
  evidence_summary: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbNotificationEvent {
  id: string;
  recipient_profile_id: string | null;
  organization_id: string | null;
  channel: NotificationChannel;
  status: NotificationEventStatus;
  priority: string;
  event_type: string;
  title: string;
  body: string;
  target_table: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbReferenceRequest {
  id: string;
  subject_profile_id: string;
  requester_profile_id: string;
  provider_name: string;
  provider_email: string;
  relationship: string;
  status: ReferenceRequestStatus;
  request_message: string | null;
  submitted_summary: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbIssuerCredential {
  id: string;
  owner_profile_id: string;
  issuer_organization_id: string | null;
  type: RecordType;
  title: string;
  status: RecordStatus;
  source_name: string;
  evidence_summary: string | null;
  issued_at: string | null;
  expires_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  owner_profile: Pick<DbProfile, "id" | "full_name" | "email"> | null;
  issuer_organization: Pick<DbOrganization, "id" | "name" | "type"> | null;
}

export interface DbMissingRecordRequest {
  id: string;
  subject_profile_id: string;
  requester_organization_id: string;
  requested_by_profile_id: string | null;
  record_type: RecordType;
  title: string;
  reason: string;
  status: MissingRecordRequestStatus;
  due_at: string | null;
  fulfilled_record_id: string | null;
  created_at: string;
  updated_at: string;
  subject_profile: Pick<DbProfile, "id" | "full_name" | "email"> | null;
  requester_organization: Pick<DbOrganization, "id" | "name" | "type"> | null;
}

export interface DbApiClient {
  id: string;
  organization_id: string;
  created_by_profile_id: string | null;
  name: string;
  status: ApiClientStatus;
  scopes: string[];
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  organization: Pick<DbOrganization, "id" | "name" | "type"> | null;
}

export interface DbWebhookSubscription {
  id: string;
  api_client_id: string;
  organization_id: string;
  event_type: string;
  target_url: string;
  status: WebhookSubscriptionStatus;
  failure_count: number;
  last_delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbSubscriptionPlan {
  id: string;
  name: string;
  audience: string;
  monthly_price_usd: number;
  annual_price_usd: number | null;
  included_seats: number;
  features: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DbOrganizationSubscription {
  id: string;
  organization_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  seats: number;
  started_at: string;
  renews_at: string | null;
  created_at: string;
  updated_at: string;
  plan: DbSubscriptionPlan | null;
}

export interface DbOrganizationInvitation {
  id: string;
  organization_id: string;
  invited_email: string;
  role: RoleKey;
  status: OrganizationInvitationStatus;
  invited_by_profile_id: string | null;
  accepted_by_profile_id: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  organization: Pick<DbOrganization, "id" | "name" | "type"> | null;
}

export interface DbConsentAuthorization {
  id: string;
  subject_profile_id: string;
  requester_organization_id: string | null;
  trust_record_id: string | null;
  purpose: string;
  consent_scope: string[];
  status: ConsentAuthorizationStatus;
  granted_by_profile_id: string;
  granted_at: string;
  revoked_at: string | null;
  expires_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  requester_organization: Pick<DbOrganization, "id" | "name" | "type"> | null;
}

export interface RoleCapability {
  role: RoleKey;
  permissions: PermissionKey[];
}
