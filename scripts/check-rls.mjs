import { readdir, readFile } from "node:fs/promises";

const migrationsDir = new URL("../supabase/migrations/", import.meta.url);
const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
const sql = (
  await Promise.all(files.map((file) => readFile(new URL(file, migrationsDir), "utf8")))
).join("\n").toLowerCase();
const latestSqlByFile = Object.fromEntries(
  await Promise.all(files.map(async (file) => [file, (await readFile(new URL(file, migrationsDir), "utf8")).toLowerCase()]))
);

const requiredRlsTables = [
  "organizations",
  "profiles",
  "organization_memberships",
  "trust_records",
  "access_grants",
  "access_grant_records",
  "audit_events",
  "verification_cases",
  "evidence_documents",
  "notification_events",
  "reference_requests",
  "missing_record_requests",
  "api_clients",
  "webhook_subscriptions",
  "subscription_plans",
  "organization_subscriptions",
  "registration_intents",
  "organization_invitations",
  "consent_authorizations",
  "corporate_access_reviews",
  "schema_migration_runs",
  "production_gate_decisions",
  "pilot_launch_contacts",
  "v1_live_database_readiness_receipts",
  "corporate_database_access_receipts",
  "evidence_access_receipts",
  "data_export_package_receipts",
  "data_export_packages",
  "billing_architecture_decision_receipts",
  "pricing_quote_receipts",
  "onboarding_wizard_receipts",
  "auth_recovery_receipts",
  "security_rls_review_receipts",
  "pilot_owner_readiness_receipts",
  "real_database_completion_receipts",
  "corporate_database_visibility_snapshots",
  "v1_pilot_route_run_receipts"
];

const missingTables = requiredRlsTables.filter(
  (table) => !sql.includes(`alter table public.${table} enable row level security`)
);

if (missingTables.length) {
  throw new Error(`Missing RLS enable statements for: ${missingTables.join(", ")}`);
}

const latestOperatorPolicyFix = latestSqlByFile["042_fix_operator_policy_self_reference.sql"] ?? "";
if (!latestOperatorPolicyFix.includes("create or replace function public.is_trustgraph_operator()")) {
  throw new Error("Missing non-recursive TrustGraph operator policy repair migration.");
}

const operatorFunctionBody = latestOperatorPolicyFix.split("create or replace function public.is_trustgraph_operator()")[1] ?? "";
if (operatorFunctionBody.includes("from public.organizations") || operatorFunctionBody.includes("join public.organizations")) {
  throw new Error("RLS check failed: is_trustgraph_operator must not query organizations from an organizations policy.");
}

const accountContextRpc = latestSqlByFile["043_account_context_rpc.sql"] ?? "";
if (!accountContextRpc.includes("create or replace function public.get_account_context()")) {
  throw new Error("Missing account context RPC migration for non-recursive corporate login.");
}

if (!accountContextRpc.includes("security definer") || !accountContextRpc.includes("auth.uid()")) {
  throw new Error("RLS check failed: account context RPC must use an authenticated security-definer boundary.");
}

if (!accountContextRpc.includes("grant execute on function public.get_account_context() to authenticated")) {
  throw new Error("RLS check failed: account context RPC must be executable by authenticated users.");
}

const registrationIntentMigration = latestSqlByFile["044_registration_intents.sql"] ?? "";
if (!registrationIntentMigration.includes("create table if not exists public.registration_intents")) {
  throw new Error("Missing registration intents migration for real signup handoff rows.");
}

if (!registrationIntentMigration.includes("profile_id = auth.uid()")) {
  throw new Error("RLS check failed: registration intents must be owner-scoped.");
}

if (!registrationIntentMigration.includes("create or replace function public.record_registration_intent")) {
  throw new Error("Missing authenticated registration intent RPC.");
}

if (!registrationIntentMigration.includes("grant execute on function public.record_registration_intent")) {
  throw new Error("RLS check failed: registration intent RPC must be executable by authenticated users.");
}

const registrationIntentStatusMigration = latestSqlByFile["045_registration_intent_status.sql"] ?? "";
if (!registrationIntentStatusMigration.includes("create or replace function public.mark_registration_intent_workspace_created")) {
  throw new Error("Missing registration intent workspace-created status RPC.");
}

if (!registrationIntentStatusMigration.includes("intent.profile_id = current_id")) {
  throw new Error("RLS check failed: registration intent status update must be owner-scoped.");
}

if (!registrationIntentStatusMigration.includes("public.has_role(target_organization_id")) {
  throw new Error("RLS check failed: registration intent status update must require organization admin role.");
}

if (!registrationIntentStatusMigration.includes("grant execute on function public.mark_registration_intent_workspace_created")) {
  throw new Error("RLS check failed: registration intent status RPC must be executable by authenticated users.");
}

const registrationIntentProfessionalStatusMigration = latestSqlByFile["046_registration_intent_professional_status.sql"] ?? "";
if (!registrationIntentProfessionalStatusMigration.includes("create or replace function public.mark_registration_intent_passport_initialized")) {
  throw new Error("Missing registration intent passport-initialized status RPC.");
}

if (!registrationIntentProfessionalStatusMigration.includes("intent.profile_id = current_id")) {
  throw new Error("RLS check failed: professional registration intent status update must be owner-scoped.");
}

if (!registrationIntentProfessionalStatusMigration.includes("intent.selected_portal = 'professional'")) {
  throw new Error("RLS check failed: professional registration intent status update must only complete professional intents.");
}

if (!registrationIntentProfessionalStatusMigration.includes("grant execute on function public.mark_registration_intent_passport_initialized")) {
  throw new Error("RLS check failed: professional registration intent status RPC must be executable by authenticated users.");
}

const v1ReadinessMigration = latestSqlByFile["047_v1_live_database_readiness_receipts.sql"] ?? "";
if (!v1ReadinessMigration.includes("create table if not exists public.v1_live_database_readiness_receipts")) {
  throw new Error("Missing V1 live database readiness receipts migration.");
}

if (!v1ReadinessMigration.includes("profile_id = public.current_profile_id()")) {
  throw new Error("RLS check failed: V1 live database readiness receipts must be profile-owner scoped.");
}

if (!v1ReadinessMigration.includes("preview_data_accepted_for_v1 = false")) {
  throw new Error("RLS check failed: V1 live database readiness receipts must reject preview data for V1.");
}

if (!v1ReadinessMigration.includes("create or replace function public.record_v1_live_database_readiness_receipt")) {
  throw new Error("Missing V1 live database readiness receipt RPC.");
}

if (!v1ReadinessMigration.includes("accepted v1 live database readiness requires signed-in supabase rows")) {
  throw new Error("RLS check failed: accepted V1 readiness must require signed-in Supabase rows.");
}

if (!v1ReadinessMigration.includes("grant execute on function public.record_v1_live_database_readiness_receipt")) {
  throw new Error("RLS check failed: V1 live database readiness RPC must be executable by authenticated users.");
}

const corporateDatabaseReceiptMigration = latestSqlByFile["048_corporate_database_access_receipts.sql"] ?? "";
if (!corporateDatabaseReceiptMigration.includes("create table if not exists public.corporate_database_access_receipts")) {
  throw new Error("Missing corporate database access receipt table migration.");
}

if (!corporateDatabaseReceiptMigration.includes("alter table public.corporate_database_access_receipts enable row level security")) {
  throw new Error("Corporate database access receipts must enable RLS.");
}

if (!corporateDatabaseReceiptMigration.includes("recorded_by_profile_id = public.current_profile_id()")) {
  throw new Error("Corporate database access receipt insert policy must bind receipts to the current profile.");
}

if (!corporateDatabaseReceiptMigration.includes("preview_data_accepted_for_v1 = false")) {
  throw new Error("Corporate database access receipts must reject preview data for V1.");
}

if (!corporateDatabaseReceiptMigration.includes("create or replace function public.record_corporate_database_access_receipt")) {
  throw new Error("Missing corporate database access receipt RPC.");
}

if (!corporateDatabaseReceiptMigration.includes("corporate_database_access.receipt_recorded")) {
  throw new Error("Corporate database access receipt RPC must write audit history.");
}

if (!corporateDatabaseReceiptMigration.includes("grant execute on function public.record_corporate_database_access_receipt")) {
  throw new Error("Corporate database access receipt RPC must be executable by authenticated users.");
}

const corporateDatabaseVisibilitySnapshotMigration = latestSqlByFile["059_corporate_database_visibility_snapshots.sql"] ?? "";
const corporateDatabaseVisibilitySnapshotCompact = corporateDatabaseVisibilitySnapshotMigration.replace(/\s+/g, " ");
if (!corporateDatabaseVisibilitySnapshotMigration.includes("create table if not exists public.corporate_database_visibility_snapshots")) {
  throw new Error("Missing corporate database visibility snapshot table migration.");
}

if (!corporateDatabaseVisibilitySnapshotMigration.includes("alter table public.corporate_database_visibility_snapshots enable row level security")) {
  throw new Error("Corporate database visibility snapshots must enable RLS.");
}

if (!corporateDatabaseVisibilitySnapshotMigration.includes("recorded_by_profile_id = public.current_profile_id()")) {
  throw new Error("Corporate database visibility snapshot insert policy must bind snapshots to the current profile.");
}

if (!corporateDatabaseVisibilitySnapshotCompact.includes("public.has_role( organization_id")) {
  throw new Error("Corporate database visibility snapshots must be scoped to active corporate RBAC roles.");
}

if (!corporateDatabaseVisibilitySnapshotMigration.includes("raw_private_files_included = false")) {
  throw new Error("Corporate database visibility snapshots must reject raw private file inclusion.");
}

if (!corporateDatabaseVisibilitySnapshotMigration.includes("preview_data_accepted = false")) {
  throw new Error("Corporate database visibility snapshots must reject preview data.");
}

if (!corporateDatabaseVisibilitySnapshotMigration.includes("create or replace function public.record_corporate_database_visibility_snapshot")) {
  throw new Error("Missing corporate database visibility snapshot RPC.");
}

if (!corporateDatabaseVisibilitySnapshotMigration.includes("corporate_database.visibility_snapshot_recorded")) {
  throw new Error("Corporate database visibility snapshot RPC must write audit history.");
}

if (!corporateDatabaseVisibilitySnapshotMigration.includes("grant execute on function public.record_corporate_database_visibility_snapshot")) {
  throw new Error("Corporate database visibility snapshot RPC must be executable by authenticated users.");
}

const pilotVisibilitySnapshotSeedMigration = latestSqlByFile["060_pilot_visibility_snapshot_seed.sql"] ?? "";
if (!pilotVisibilitySnapshotSeedMigration.includes("create or replace function public.seed_pilot_visibility_snapshot()")) {
  throw new Error("Missing pilot visibility snapshot seed RPC.");
}

if (!pilotVisibilitySnapshotSeedMigration.includes("current_id uuid := public.current_profile_id()")) {
  throw new Error("Pilot visibility snapshot seed must require the authenticated profile.");
}

if (!pilotVisibilitySnapshotSeedMigration.includes("membership.role in ('system_admin', 'compliance_admin', 'employer_admin', 'employer_reviewer', 'staffing_agency_admin', 'recruiter')")) {
  throw new Error("Pilot visibility snapshot seed must require active corporate RBAC.");
}

if (!pilotVisibilitySnapshotSeedMigration.includes("corporate_database_visibility_snapshots")) {
  throw new Error("Pilot visibility snapshot seed must persist a corporate database visibility snapshot row.");
}

if (!pilotVisibilitySnapshotSeedMigration.includes("raw_private_files_included") || !pilotVisibilitySnapshotSeedMigration.includes("preview_data_accepted")) {
  throw new Error("Pilot visibility snapshot seed must reject raw private files and preview data.");
}

if (!pilotVisibilitySnapshotSeedMigration.includes("pilot_workspace.visibility_snapshot_seeded")) {
  throw new Error("Pilot visibility snapshot seed must write audit history.");
}

if (!pilotVisibilitySnapshotSeedMigration.includes("grant execute on function public.seed_pilot_visibility_snapshot() to authenticated")) {
  throw new Error("Pilot visibility snapshot seed RPC must be executable by authenticated users.");
}

const evidenceAccessReceiptMigration = latestSqlByFile["049_evidence_access_receipts.sql"] ?? "";
if (!evidenceAccessReceiptMigration.includes("create table if not exists public.evidence_access_receipts")) {
  throw new Error("Missing evidence access receipt table migration.");
}
if (!evidenceAccessReceiptMigration.includes("alter table public.evidence_access_receipts enable row level security")) {
  throw new Error("Evidence access receipts must enable RLS.");
}
if (!evidenceAccessReceiptMigration.includes("raw_url_stored = false")) {
  throw new Error("Evidence access receipts must prove raw signed URLs are not stored.");
}
if (!evidenceAccessReceiptMigration.includes("create or replace function public.record_evidence_access_receipt")) {
  throw new Error("Missing evidence access receipt RPC.");
}
if (!evidenceAccessReceiptMigration.includes("evidence_access.signed_url_issued")) {
  throw new Error("Evidence access receipt RPC must write audit history.");
}
if (!evidenceAccessReceiptMigration.includes("grant execute on function public.record_evidence_access_receipt")) {
  throw new Error("Evidence access receipt RPC must be executable by authenticated users.");
}

const dataExportPackageReceiptMigration = latestSqlByFile["050_data_export_package_receipts.sql"] ?? "";
if (!dataExportPackageReceiptMigration.includes("create table if not exists public.data_export_package_receipts")) {
  throw new Error("Missing data export package receipt table migration.");
}
if (!dataExportPackageReceiptMigration.includes("alter table public.data_export_package_receipts enable row level security")) {
  throw new Error("Data export package receipts must enable RLS.");
}
if (!dataExportPackageReceiptMigration.includes("raw_private_files_included = false")) {
  throw new Error("Data export package receipts must reject raw private file inclusion.");
}
if (!dataExportPackageReceiptMigration.includes("preview_data_accepted_for_v1 = false")) {
  throw new Error("Data export package receipts must reject preview data for V1.");
}
if (!dataExportPackageReceiptMigration.includes("create or replace function public.record_data_export_package_receipt")) {
  throw new Error("Missing data export package receipt RPC.");
}
if (!dataExportPackageReceiptMigration.includes("data_export.package_receipt_recorded")) {
  throw new Error("Data export package receipt RPC must write audit history.");
}
if (!dataExportPackageReceiptMigration.includes("grant execute on function public.record_data_export_package_receipt")) {
  throw new Error("Data export package receipt RPC must be executable by authenticated users.");
}

const dataExportPackageMigration = latestSqlByFile["051_data_export_packages.sql"] ?? "";
if (!dataExportPackageMigration.includes("create table if not exists public.data_export_packages")) {
  throw new Error("Missing data export packages table migration.");
}
if (!dataExportPackageMigration.includes("alter table public.data_export_packages enable row level security")) {
  throw new Error("Data export packages must enable RLS.");
}
if (!dataExportPackageMigration.includes("raw_private_files_included = false")) {
  throw new Error("Data export packages must reject raw private file inclusion.");
}
if (!dataExportPackageMigration.includes("download_url_stored = false")) {
  throw new Error("Data export packages must reject signed download URL storage.");
}
if (!dataExportPackageMigration.includes("create or replace function public.generate_data_export_package")) {
  throw new Error("Missing data export package generation RPC.");
}
if (!dataExportPackageMigration.includes("data_export.package_generated")) {
  throw new Error("Data export package generation RPC must write audit history.");
}
if (!dataExportPackageMigration.includes("create or replace function public.mark_data_export_package_downloaded")) {
  throw new Error("Missing data export package download marker RPC.");
}
if (!dataExportPackageMigration.includes("data_export.package_download_marked")) {
  throw new Error("Data export package download marker RPC must write audit history.");
}
if (!dataExportPackageMigration.includes("grant execute on function public.generate_data_export_package")) {
  throw new Error("Data export package generation RPC must be executable by authenticated users.");
}

const billingArchitectureDecisionMigration = latestSqlByFile["052_billing_architecture_decision_receipts.sql"] ?? "";
if (!billingArchitectureDecisionMigration.includes("create table if not exists public.billing_architecture_decision_receipts")) {
  throw new Error("Missing billing architecture decision receipt table migration.");
}
if (!billingArchitectureDecisionMigration.includes("alter table public.billing_architecture_decision_receipts enable row level security")) {
  throw new Error("Billing architecture decision receipts must enable RLS.");
}
if (!billingArchitectureDecisionMigration.includes("payment_collection_live = false")) {
  throw new Error("Billing architecture decision receipts must reject live payment collection.");
}
if (!billingArchitectureDecisionMigration.includes("checkout_enabled = false")) {
  throw new Error("Billing architecture decision receipts must keep checkout disabled.");
}
if (!billingArchitectureDecisionMigration.includes("payment_webhook_reconciliation_enabled = false")) {
  throw new Error("Billing architecture decision receipts must keep payment webhook reconciliation disabled.");
}
if (!billingArchitectureDecisionMigration.includes("create or replace function public.record_billing_architecture_decision_receipt")) {
  throw new Error("Missing billing architecture decision receipt RPC.");
}
if (!billingArchitectureDecisionMigration.includes("billing.architecture_decision_recorded")) {
  throw new Error("Billing architecture decision receipt RPC must write audit history.");
}
if (!billingArchitectureDecisionMigration.includes("grant execute on function public.record_billing_architecture_decision_receipt")) {
  throw new Error("Billing architecture decision receipt RPC must be executable by authenticated users.");
}

const pricingQuoteReceiptMigration = latestSqlByFile["053_pricing_quote_receipts.sql"] ?? "";
if (!pricingQuoteReceiptMigration.includes("create table if not exists public.pricing_quote_receipts")) {
  throw new Error("Missing pricing quote receipt table migration.");
}
if (!pricingQuoteReceiptMigration.includes("alter table public.pricing_quote_receipts enable row level security")) {
  throw new Error("Pricing quote receipts must enable RLS.");
}
if (!pricingQuoteReceiptMigration.includes("recorded_by_profile_id = public.current_profile_id()")) {
  throw new Error("Pricing quote receipt insert policy must bind receipts to the current profile.");
}
if (!pricingQuoteReceiptMigration.includes("payment_collection_live = false")) {
  throw new Error("Pricing quote receipts must reject live payment collection.");
}
if (!pricingQuoteReceiptMigration.includes("stripe_checkout_enabled = false")) {
  throw new Error("Pricing quote receipts must keep Stripe checkout disabled.");
}
if (!pricingQuoteReceiptMigration.includes("create or replace function public.record_pricing_quote_receipt")) {
  throw new Error("Missing pricing quote receipt RPC.");
}
if (!pricingQuoteReceiptMigration.includes("billing.pricing_quote_recorded")) {
  throw new Error("Pricing quote receipt RPC must write audit history.");
}
if (!pricingQuoteReceiptMigration.includes("grant execute on function public.record_pricing_quote_receipt")) {
  throw new Error("Pricing quote receipt RPC must be executable by authenticated users.");
}

const onboardingWizardReceiptMigration = latestSqlByFile["054_onboarding_wizard_receipts.sql"] ?? "";
if (!onboardingWizardReceiptMigration.includes("create table if not exists public.onboarding_wizard_receipts")) {
  throw new Error("Missing onboarding wizard receipt table migration.");
}
if (!onboardingWizardReceiptMigration.includes("alter table public.onboarding_wizard_receipts enable row level security")) {
  throw new Error("Onboarding wizard receipts must enable RLS.");
}
if (!onboardingWizardReceiptMigration.includes("profile_id = public.current_profile_id()")) {
  throw new Error("Onboarding wizard receipts must be owner-scoped.");
}
if (!onboardingWizardReceiptMigration.includes("preview_data_accepted_for_v1 = false")) {
  throw new Error("Onboarding wizard receipts must reject preview data for V1.");
}
if (!onboardingWizardReceiptMigration.includes("create or replace function public.record_onboarding_wizard_receipt")) {
  throw new Error("Missing onboarding wizard receipt RPC.");
}
if (!onboardingWizardReceiptMigration.includes("onboarding.wizard_receipt_recorded")) {
  throw new Error("Onboarding wizard receipt RPC must write audit history.");
}
if (!onboardingWizardReceiptMigration.includes("grant execute on function public.record_onboarding_wizard_receipt")) {
  throw new Error("Onboarding wizard receipt RPC must be executable by authenticated users.");
}

const authRecoveryReceiptMigration = latestSqlByFile["055_auth_recovery_receipts.sql"] ?? "";
if (!authRecoveryReceiptMigration.includes("create table if not exists public.auth_recovery_receipts")) {
  throw new Error("Missing auth recovery receipt table migration.");
}
if (!authRecoveryReceiptMigration.includes("alter table public.auth_recovery_receipts enable row level security")) {
  throw new Error("Auth recovery receipts must enable RLS.");
}
if (!authRecoveryReceiptMigration.includes("profile_id = public.current_profile_id()")) {
  throw new Error("Auth recovery receipts must be owner-scoped.");
}
if (!authRecoveryReceiptMigration.includes("hosted_redirect_required = true")) {
  throw new Error("Auth recovery receipts must require hosted redirect proof.");
}
if (!authRecoveryReceiptMigration.includes("create or replace function public.record_auth_recovery_receipt")) {
  throw new Error("Missing auth recovery receipt RPC.");
}
if (!authRecoveryReceiptMigration.includes("auth.recovery_receipt_recorded")) {
  throw new Error("Auth recovery receipt RPC must write audit history.");
}
if (!authRecoveryReceiptMigration.includes("grant execute on function public.record_auth_recovery_receipt")) {
  throw new Error("Auth recovery receipt RPC must be executable by authenticated users.");
}

const securityRlsReviewReceiptMigration = latestSqlByFile["056_security_rls_review_receipts.sql"] ?? "";
if (!securityRlsReviewReceiptMigration.includes("create table if not exists public.security_rls_review_receipts")) {
  throw new Error("Missing security RLS review receipt table migration.");
}
if (!securityRlsReviewReceiptMigration.includes("alter table public.security_rls_review_receipts enable row level security")) {
  throw new Error("Security RLS review receipts must enable RLS.");
}
if (!securityRlsReviewReceiptMigration.includes("profile_id = public.current_profile_id()")) {
  throw new Error("Security RLS review receipts must be owner-scoped.");
}
if (!securityRlsReviewReceiptMigration.includes("production_traffic_allowed = false")) {
  throw new Error("Security RLS review receipts must keep production traffic blocked until external signoff.");
}
if (!securityRlsReviewReceiptMigration.includes("create or replace function public.record_security_rls_review_receipt")) {
  throw new Error("Missing security RLS review receipt RPC.");
}
if (!securityRlsReviewReceiptMigration.includes("security.rls_review_receipt_recorded")) {
  throw new Error("Security RLS review receipt RPC must write audit history.");
}
if (!securityRlsReviewReceiptMigration.includes("grant execute on function public.record_security_rls_review_receipt")) {
  throw new Error("Security RLS review receipt RPC must be executable by authenticated users.");
}

const pilotOwnerReadinessReceiptMigration = latestSqlByFile["057_pilot_owner_readiness_receipts.sql"] ?? "";
if (!pilotOwnerReadinessReceiptMigration.includes("create table if not exists public.pilot_owner_readiness_receipts")) {
  throw new Error("Missing pilot owner readiness receipt table migration.");
}
if (!pilotOwnerReadinessReceiptMigration.includes("alter table public.pilot_owner_readiness_receipts enable row level security")) {
  throw new Error("Pilot owner readiness receipts must enable RLS.");
}
if (!pilotOwnerReadinessReceiptMigration.includes("profile_id = public.current_profile_id()")) {
  throw new Error("Pilot owner readiness receipts must be owner-scoped.");
}
if (!pilotOwnerReadinessReceiptMigration.includes("production_traffic_allowed = false")) {
  throw new Error("Pilot owner readiness receipts must keep production traffic blocked until human signoff.");
}
if (!pilotOwnerReadinessReceiptMigration.includes("create or replace function public.record_pilot_owner_readiness_receipt")) {
  throw new Error("Missing pilot owner readiness receipt RPC.");
}
if (!pilotOwnerReadinessReceiptMigration.includes("pilot.owner_readiness_receipt_recorded")) {
  throw new Error("Pilot owner readiness receipt RPC must write audit history.");
}
if (!pilotOwnerReadinessReceiptMigration.includes("grant execute on function public.record_pilot_owner_readiness_receipt")) {
  throw new Error("Pilot owner readiness receipt RPC must be executable by authenticated users.");
}

const realDatabaseCompletionReceiptMigration = latestSqlByFile["058_real_database_completion_receipts.sql"] ?? "";
if (!realDatabaseCompletionReceiptMigration.includes("create table if not exists public.real_database_completion_receipts")) {
  throw new Error("Missing real database completion receipt table migration.");
}
if (!realDatabaseCompletionReceiptMigration.includes("alter table public.real_database_completion_receipts enable row level security")) {
  throw new Error("Real database completion receipts must enable RLS.");
}
if (!realDatabaseCompletionReceiptMigration.includes("profile_id = public.current_profile_id()")) {
  throw new Error("Real database completion receipts must be owner-scoped.");
}
if (!realDatabaseCompletionReceiptMigration.includes("preview_data_accepted = false")) {
  throw new Error("Real database completion receipts must reject preview data.");
}
if (!realDatabaseCompletionReceiptMigration.includes("create or replace function public.record_real_database_completion_receipt")) {
  throw new Error("Missing real database completion receipt RPC.");
}
if (!realDatabaseCompletionReceiptMigration.includes("database.real_completion_receipt_recorded")) {
  throw new Error("Real database completion receipt RPC must write audit history.");
}
if (!realDatabaseCompletionReceiptMigration.includes("grant execute on function public.record_real_database_completion_receipt")) {
  throw new Error("Real database completion receipt RPC must be executable by authenticated users.");
}

const v1PilotRouteRunReceiptMigration = latestSqlByFile["062_v1_pilot_route_run_receipts.sql"] ?? "";
if (!v1PilotRouteRunReceiptMigration.includes("create table if not exists public.v1_pilot_route_run_receipts")) {
  throw new Error("Missing V1 pilot route run receipt table migration.");
}
if (!v1PilotRouteRunReceiptMigration.includes("alter table public.v1_pilot_route_run_receipts enable row level security")) {
  throw new Error("V1 pilot route run receipts must enable RLS.");
}
if (!v1PilotRouteRunReceiptMigration.includes("profile_id = public.current_profile_id()")) {
  throw new Error("V1 pilot route run receipts must be owner-scoped.");
}
if (!v1PilotRouteRunReceiptMigration.includes("preview_data_accepted = false")) {
  throw new Error("V1 pilot route run receipts must reject preview data.");
}
if (!v1PilotRouteRunReceiptMigration.includes("vps_freshness_required = true")) {
  throw new Error("V1 pilot route run receipts must require VPS freshness proof.");
}
if (!v1PilotRouteRunReceiptMigration.includes("create or replace function public.record_v1_pilot_route_run_receipt")) {
  throw new Error("Missing V1 pilot route run receipt RPC.");
}
if (!v1PilotRouteRunReceiptMigration.includes("v1_pilot_route_run.receipt_recorded")) {
  throw new Error("V1 pilot route run receipt RPC must write audit history.");
}
if (!v1PilotRouteRunReceiptMigration.includes("grant execute on function public.record_v1_pilot_route_run_receipt")) {
  throw new Error("V1 pilot route run receipt RPC must be executable by authenticated users.");
}

console.log(`TrustGraph RLS check passed: ${requiredRlsTables.length} protected tables verified across ${files.length} migrations.`);
