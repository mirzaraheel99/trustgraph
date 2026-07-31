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
  "evidence_access_receipts"
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

console.log(`TrustGraph RLS check passed: ${requiredRlsTables.length} protected tables verified across ${files.length} migrations.`);
