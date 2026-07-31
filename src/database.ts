import type { PermissionKey, RoleKey } from "./rbac";

export type OrganizationType = "professional" | "employer" | "staffing_agency" | "trustgraph";
export type OrganizationStatus = "active" | "pending_approval" | "restricted";
export type MembershipStatus = "active" | "invited" | "suspended";
export type RecordStatus = "draft" | "pending_verification" | "verified" | "expired" | "disputed" | "revoked" | "restricted";
export type TrustRecordSensitivity = "standard" | "sensitive" | "restricted";
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
export type RegistrationIntentPortal = "professional" | "corporate";
export type RegistrationIntentMode = "signin" | "signup";
export type RegistrationIntentStatus = "captured" | "workspace_created" | "passport_initialized" | "cancelled";
export type AuthRecoveryReceiptAction = "signup_verification" | "password_recovery" | "localhost_link_repair" | "hosted_callback";
export type ProductionGateStatus =
  | "human_decision_required"
  | "external_signoff_required"
  | "legal_review_required"
  | "pilot_roster_required"
  | "approved_for_pilot"
  | "approved_for_production";
export type PilotLaunchContactStatus = "missing" | "identified" | "confirmed";
export type DataRightsRequestType = "data_export" | "account_closure";
export type DataRightsRequestStatus = "requested" | "in_review" | "ready" | "blocked" | "completed" | "cancelled";
export type CorporateAccessReviewStatus = "reviewed" | "needs_follow_up" | "ready_for_handoff" | "closed";
export type CorporateDatabaseAccessReceiptStatus =
  | "ready_for_review"
  | "access_rows_required"
  | "attestation_required"
  | "export_recorded";

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
  sensitivity: TrustRecordSensitivity;
  consent_required: boolean;
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

export interface DbCorporateAccessReview {
  id: string;
  access_grant_id: string;
  requester_organization_id: string;
  subject_profile_id: string;
  reviewer_profile_id: string | null;
  review_status: CorporateAccessReviewStatus;
  reviewer_note: string | null;
  shared_record_count: number;
  open_gap_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
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

export interface DbEvidenceAccessReceipt {
  id: string;
  evidence_document_id: string;
  trust_record_id: string | null;
  owner_profile_id: string;
  actor_profile_id: string;
  access_mode: "preview" | "download";
  signed_url_expires_in_seconds: number;
  storage_bucket: string;
  storage_path_prefix: string;
  raw_url_stored: boolean;
  accepted_when: string;
  metadata: Record<string, unknown>;
  created_at: string;
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

export interface DbDataRightsRequest {
  id: string;
  profile_id: string;
  request_type: DataRightsRequestType;
  status: DataRightsRequestStatus;
  requested_scope: string;
  reason: string | null;
  reviewer_note: string | null;
  metadata: Record<string, unknown>;
  requested_at: string;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbDataExportPackageReceipt {
  id: string;
  profile_id: string;
  data_rights_request_id: string | null;
  status: "export_ready" | "request_required" | "review_pending";
  requested_scope: string;
  passport_record_count: number;
  evidence_metadata_count: number;
  access_grant_count: number;
  audit_event_count: number;
  raw_private_files_included: boolean;
  preview_data_accepted_for_v1: boolean;
  accepted_when: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DbDataExportPackage {
  id: string;
  profile_id: string;
  data_rights_request_id: string;
  package_receipt_id: string | null;
  status: "ready" | "downloaded" | "expired";
  package_scope: string;
  manifest: Record<string, unknown>;
  passport_record_count: number;
  evidence_metadata_count: number;
  access_grant_count: number;
  audit_event_count: number;
  raw_private_files_included: boolean;
  download_url_stored: boolean;
  generated_at: string;
  expires_at: string;
  downloaded_at: string | null;
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

export interface DbBillingArchitectureDecisionReceipt {
  id: string;
  organization_id: string;
  recorded_by_profile_id: string;
  status: "pricing_catalog_only" | "pilot_ledger_active" | "stripe_human_gate_required";
  selected_seats: number;
  active_subscription_count: number;
  payment_collection_live: boolean;
  checkout_enabled: boolean;
  customer_portal_enabled: boolean;
  invoice_email_enabled: boolean;
  tax_automation_enabled: boolean;
  refund_automation_enabled: boolean;
  dunning_enabled: boolean;
  payment_webhook_reconciliation_enabled: boolean;
  human_gate_required: boolean;
  accepted_when: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DbPricingQuoteReceipt {
  id: string;
  organization_id: string;
  recorded_by_profile_id: string;
  selected_plan_id: string | null;
  selected_seats: number;
  plans_loaded: number;
  active_subscription_count: number;
  projected_monthly_usd: number;
  projected_annual_usd: number;
  payment_collection_live: boolean;
  stripe_checkout_enabled: boolean;
  accepted_when: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DbOnboardingWizardReceipt {
  id: string;
  profile_id: string;
  organization_id: string | null;
  completed_steps: number;
  total_steps: number;
  current_step_label: string;
  current_step_status: "ready" | "needs_action";
  live_database_rows: number;
  preview_data_accepted_for_v1: boolean;
  accepted_when: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DbAuthRecoveryReceipt {
  id: string;
  profile_id: string;
  email: string;
  action_type: AuthRecoveryReceiptAction;
  selected_portal: RegistrationIntentPortal;
  redirect_url: string;
  hosted_redirect_required: boolean;
  localhost_link_detected: boolean;
  email_rate_limit_note: string;
  accepted_when: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DbSecurityRlsReviewReceipt {
  id: string;
  profile_id: string;
  organization_id: string | null;
  status: "external_review_required" | "ready_for_external_review" | "approved_for_pilot";
  rls_protected_table_count: number;
  checks_ready: number;
  checks_total: number;
  migration_ledger_rows: number;
  audit_event_count: number;
  open_security_items: string[];
  external_signoff_recorded: boolean;
  production_traffic_allowed: boolean;
  accepted_when: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DbRegistrationIntent {
  id: string;
  profile_id: string;
  selected_portal: RegistrationIntentPortal;
  selected_mode: RegistrationIntentMode;
  pricing_plan_id: string | null;
  organization_name: string | null;
  organization_type: "employer" | "staffing_agency" | null;
  organization_domain: string | null;
  first_database_write: string;
  next_dashboard: string;
  status: RegistrationIntentStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
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

export interface DbSchemaMigrationRun {
  id: string;
  migration_path: string;
  commit_sha: string | null;
  workflow_run_id: string | null;
  applied_by: string | null;
  status: string;
  notes: string | null;
  applied_at: string;
}

export interface DbProductionGateDecision {
  id: string;
  gate_key: string;
  label: string;
  owner: string;
  status: ProductionGateStatus;
  evidence_required: string;
  evidence_url: string | null;
  decided_by_profile_id: string | null;
  decided_at: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbPilotLaunchContact {
  id: string;
  contact_key: string;
  label: string;
  responsibility: string;
  status: PilotLaunchContactStatus;
  organization_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  notes: string | null;
  recorded_by_profile_id: string | null;
  recorded_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbV1LiveDatabaseReadinessReceipt {
  id: string;
  profile_id: string;
  organization_id: string | null;
  status: "live_database_rows_accepted" | "live_database_rows_required";
  source: "signed_in_supabase_rows" | "preview_or_logged_out";
  ready_groups: number;
  total_required_groups: number;
  missing_required_groups: string[];
  required_operator_exports: string[];
  preview_data_accepted_for_v1: boolean;
  accepted_when: string;
  server_save_status: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DbCorporateDatabaseAccessReceipt {
  id: string;
  organization_id: string;
  recorded_by_profile_id: string;
  status: CorporateDatabaseAccessReceiptStatus;
  access_grant_count: number;
  shared_record_count: number;
  review_attestation_count: number;
  open_gap_count: number;
  exported_packet_name: string;
  preview_data_accepted_for_v1: boolean;
  accepted_when: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RoleCapability {
  role: RoleKey;
  permissions: PermissionKey[];
}
