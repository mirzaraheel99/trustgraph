import { readdir, readFile } from "node:fs/promises";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(source, expected, label) {
  assert(source.includes(expected), `Expected ${label} to include "${expected}"`);
}

function assertMigration(migrations, prefix, label) {
  assert(migrations.some((file) => file.startsWith(prefix) && file.endsWith(".sql")), `Expected migration ${prefix} for ${label}`);
}

const [app, packageText, workflow, readiness, runbook, evidenceMap, migrations] = await Promise.all([
  readFile(new URL("../src/App.tsx", import.meta.url), "utf8"),
  readFile(new URL("../package.json", import.meta.url), "utf8"),
  readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8"),
  readFile(new URL("../V1_READINESS_CHECKLIST.md", import.meta.url), "utf8"),
  readFile(new URL("../PILOT_RUNBOOK.md", import.meta.url), "utf8"),
  readFile(new URL("../docs/current-implementation-evidence-map.md", import.meta.url), "utf8"),
  readdir(new URL("../supabase/migrations/", import.meta.url))
]);

const packageJson = JSON.parse(packageText);
const migrationFiles = migrations.filter((file) => file.endsWith(".sql")).sort();

const appRequirements = [
  ["Real data acceptance ledger", "real-data acceptance ledger label"],
  ["real_data_acceptance_ledger", "real-data acceptance ledger packet mode"],
  [
    "hosted_auth_account_context_passport_evidence_corporate_access_consent_team_billing_review_and_release_rows_are_loaded_from_supabase_not_preview_data",
    "real-data acceptance rule"
  ],
  ["Only signed-in Supabase repository rows count for V1.", "signed-in Supabase source policy"],
  ["Preview, static, browser-memory, or unauthenticated rows are rejected.", "preview rejection policy"],
  ["Export ledger", "real-data ledger export"],
  ["Live database contract", "live database contract label"],
  ["live_database_contract", "live database contract packet mode"],
  ["Live row completion command", "live row completion command label"],
  ["live_row_completion_command", "live row completion command packet mode"],
  ["Live database repair guide", "live database repair guide label"],
  ["live_database_repair_guide", "live database repair guide packet mode"],
  [
    "live_database_repair_guide_requires_hosted_login_seed_or_create_rows_reload_supabase_repositories_export_working_data_packet_and_reject_preview_data",
    "live database repair guide acceptance rule"
  ],
  ["Live pilot row proof", "live pilot row proof label"],
  ["live_pilot_row_proof", "live pilot row proof packet mode"],
  ["Working database proof ready", "working database ready state"],
  ["Preview data accepted: {liveRowCompletionCommand.preview_data_accepted ? \"yes\" : \"no\"}", "visible preview-data rejection state"],
  ["signed_in_supabase_rows", "live row source marker"],
  ["preview_or_logged_out", "non-accepted source marker"],
  ["seedPilotWorkspace", "live seed RPC adapter"],
  ["loadPassportRecords", "live Passport repository load"],
  ["loadVerifyAccessGrants", "live Corporate Verify repository load"],
  ["loadEvidenceDocuments", "live evidence repository load"],
  ["loadConsentAuthorizations", "live consent repository load"],
  ["Account portal route acceptance checkpoint", "account portal route acceptance label"],
  ["account_portal_route_acceptance_checkpoint", "account portal route acceptance packet mode"],
  [
    "account_portal_route_acceptance_requires_hosted_session_profile_context_active_workspace_role_route_corporate_workspace_recovery_route_and_no_preview_data",
    "account portal route acceptance rule"
  ],
  ["Public portal acceptance checkpoint", "public portal acceptance label"],
  ["public_portal_acceptance_checkpoint", "public portal acceptance packet mode"],
  [
    "public_portal_acceptance_requires_account_choice_hosted_auth_pricing_first_database_write_landing_portal_scoped_access_and_saved_server_build_before_live_pilot_acceptance",
    "public portal acceptance rule"
  ],
  ["Signed evidence acceptance checkpoint", "signed evidence acceptance label"],
  ["signed_evidence_acceptance_checkpoint", "signed evidence acceptance packet mode"],
  [
    "signed_evidence_acceptance_requires_metadata_private_file_short_lived_signed_link_manifest_export_and_raw_private_file_exclusion",
    "signed evidence acceptance rule"
  ],
  ["Persisted corporate database acceptance checkpoint", "persisted corporate database acceptance label"],
  ["persisted_corporate_database_acceptance_checkpoint", "persisted corporate database acceptance packet mode"],
  [
    "persisted_corporate_database_acceptance_requires_live_rbac_approved_rows_review_attestation_access_receipt_visibility_snapshot_and_metadata_only_export",
    "persisted corporate database acceptance rule"
  ],
  ["Corporate live row proof chain", "corporate live row proof label"],
  ["corporate_live_row_proof_chain", "corporate live row proof packet mode"],
  [
    "corporate_live_row_proof_chain_requires_live_rbac_request_by_email_approved_grants_scoped_rows_review_attestation_visibility_snapshot_and_metadata_only_export",
    "corporate live row proof rule"
  ],
  ["Corporate visible rows handoff", "corporate visible rows handoff label"],
  ["corporate_visible_rows_handoff", "corporate visible rows handoff packet mode"],
  [
    "corporate_visible_rows_handoff_requires_approved_grant_visible_scoped_rows_consent_scope_review_attestation_export_and_no_open_user_database_browse",
    "corporate visible rows handoff acceptance rule"
  ],
  ["V1 portal operating center", "V1 portal operating center label"],
  ["v1_portal_operating_center", "V1 portal operating center packet mode"],
  [
    "v1_portal_operating_center_requires_professional_corporate_company_pricing_account_database_and_server_paths_visible_clickable_bounded_and_no_preview_data",
    "V1 portal operating center preview-data rejection rule"
  ],
  ["Public signup decision desk", "public signup decision desk label"],
  ["public_signup_decision_desk", "public signup decision desk packet mode"],
  [
    "public_signup_decision_desk_keeps_portal_mode_price_first_database_write_required_fields_recovery_and_submit_action_visible_directly_above_form_fields",
    "public signup decision desk live-row form acceptance rule"
  ],
  ["Corporate reviewer database home", "corporate reviewer database home label"],
  ["corporate_reviewer_database_home", "corporate reviewer database home packet mode"],
  [
    "corporate_reviewer_database_home_requires_request_approval_visible_scoped_rows_review_attestation_export_and_no_open_user_browse",
    "corporate reviewer database home no-open-browse acceptance rule"
  ],
  ["Missing record cross-portal checkpoint", "missing-record cross-portal label"],
  ["missing_record_cross_portal_checkpoint", "missing-record cross-portal packet mode"],
  [
    "missing_record_cross_portal_checkpoint_requires_corporate_request_professional_passport_handoff_open_gap_status_review_attestation_metadata_export_and_no_preview_data",
    "missing-record cross-portal acceptance rule"
  ],
  ["Billing pilot acceptance checkpoint", "billing pilot acceptance label"],
  ["billing_pilot_acceptance_checkpoint", "billing pilot acceptance packet mode"],
  [
    "billing_pilot_acceptance_requires_live_pricing_catalog_selected_seats_projected_totals_live_subscription_ledger_quote_receipt_payment_decision_stripe_gate_and_no_preview_data",
    "billing pilot acceptance rule"
  ],
  ["V1 pilot route run checkpoint", "V1 pilot route run label"],
  ["v1_pilot_route_run_checkpoint", "V1 pilot route run packet mode"],
  [
    "v1_pilot_route_run_requires_website_hosted_auth_professional_rows_corporate_workspace_pricing_ledger_scoped_user_database_admin_exports_vps_freshness_and_no_preview_data",
    "V1 pilot route run acceptance rule"
  ],
  ["v1_pilot_route_run_receipts", "persisted V1 pilot route run receipt table"],
  ["record_v1_pilot_route_run_receipt", "persisted V1 pilot route run receipt RPC"],
  [
    "v1_pilot_route_run_receipt_requires_hosted_auth_professional_rows_corporate_workspace_pricing_ledger_scoped_database_admin_exports_vps_freshness_and_no_preview_data",
    "persisted V1 pilot route run receipt acceptance rule"
  ],
  ["Public hosted build source contract", "public hosted build source label"],
  ["public_hosted_build_source_contract", "public hosted build source packet mode"],
  [
    "public_login_and_registration_must_show_github_as_source_of_truth_pages_as_green_bundle_vps_release_stamp_as_server_proof_and_vfix_as_separate_protected_route",
    "public hosted build source acceptance rule"
  ],
  ["Registration completion handoff", "registration completion handoff label"],
  ["registration_completion_handoff", "registration completion handoff packet mode"],
  [
    "registration_completion_handoff_requires_hosted_verification_registration_intent_completion_professional_or_corporate_landing_dashboard_next_action_and_no_preview_data",
    "registration completion handoff acceptance rule"
  ],
  ["Signed-in pilot journey checklist", "signed-in pilot journey checklist label"],
  ["signed_in_pilot_journey_checklist", "signed-in pilot journey checklist packet mode"],
  [
    "signed_in_pilot_journey_checklist_requires_hosted_account_professional_passport_corporate_workspace_pricing_ledger_scoped_user_database_server_release_stamp_and_no_preview_data",
    "signed-in pilot journey checklist acceptance rule"
  ],
  ["Admin operations acceptance checkpoint", "admin operations acceptance label"],
  ["admin_operations_acceptance_checkpoint", "admin operations acceptance packet mode"],
  [
    "admin_operations_acceptance_requires_verification_cases_data_rights_requests_filtered_audit_exports_release_ledger_security_runbook_and_no_preview_data",
    "admin operations acceptance rule"
  ],
  ["prepare_pilot_user_access_request", "pilot-named access request RPC"],
  ["ensure_pilot_employer_reviewer_membership", "pilot-named employer reviewer RPC"],
  ["create_pilot_verification_cases", "pilot-named verification cases RPC"],
  ["create_pilot_connect_api_client", "pilot-named Connect client RPC"]
];

for (const [phrase, label] of appRequirements) {
  assertIncludes(app, phrase, label);
}

const readinessRequirements = [
  ["Upload one private evidence file and test preview/download.", "private evidence acceptance step"],
  ["Corporate directory acceptance ledger", "corporate directory proof"],
  ["Export the V1 operating map packet", "V1 operating map export"],
  ["Export the server release save path packet", "server release proof"],
  ["Do not move from pilot to real production traffic", "production stop condition"]
];

for (const [phrase, label] of readinessRequirements) {
  assertIncludes(readiness, phrase, label);
}

const runbookRequirements = [
  ["do not start pilot accounts from a `localhost` verification link", "hosted login rule"],
  ["Export the hosted login/database handoff packet", "hosted login database proof"],
  ["Attach evidence metadata and one private evidence file.", "evidence proof step"],
  ["Export the corporate user database packet", "corporate user database proof"],
  ["The current billing flow is a pilot ledger, not payment collection.", "billing human gate"]
];

for (const [phrase, label] of runbookRequirements) {
  assertIncludes(runbook, phrase, label);
}

assertIncludes(evidenceMap, "Working-data packet", "evidence map working-data export");
assertIncludes(evidenceMap, "Seed reconciliation", "evidence map seed reconciliation");
assertIncludes(evidenceMap, "Live Supabase migrations currently run through `062_v1_pilot_route_run_receipts.sql`", "evidence map current migration boundary");
assertIncludes(evidenceMap, "043_account_context_rpc.sql", "evidence map account-context migration history");
assertIncludes(evidenceMap, "passport_initialized", "evidence map professional registration completion status");
assertIncludes(evidenceMap, "persisted V1 live database readiness receipts", "evidence map persisted readiness receipt");

assertMigration(migrationFiles, "017_", "private evidence storage");
assertMigration(migrationFiles, "029_", "pilot workspace seed");
assertMigration(migrationFiles, "041_", "corporate access review attestations");
assertMigration(migrationFiles, "042_", "organization RLS recursion repair");
assertMigration(migrationFiles, "057_", "pilot owner readiness receipts");
assertMigration(migrationFiles, "058_", "real database completion receipts");
assertMigration(migrationFiles, "059_", "corporate database visibility snapshots");
assertMigration(migrationFiles, "060_", "pilot visibility snapshot seed");
assertMigration(migrationFiles, "061_", "pilot-named operator RPC aliases");
assertMigration(migrationFiles, "062_", "persisted V1 pilot route run receipts");
assertMigration(migrationFiles, "043_", "account context RPC");
assertMigration(migrationFiles, "044_", "registration intent rows");
assertMigration(migrationFiles, "045_", "corporate registration intent completion");
assertMigration(migrationFiles, "046_", "professional registration intent completion");
assertMigration(migrationFiles, "047_", "persisted V1 live database readiness receipts");
assertMigration(migrationFiles, "048_", "corporate database access receipt persistence");
assertMigration(migrationFiles, "049_", "evidence access receipt persistence");
assertMigration(migrationFiles, "050_", "data export package receipt persistence");
assertMigration(migrationFiles, "051_", "data export package manifest persistence");
assertMigration(migrationFiles, "052_", "billing architecture decision receipt persistence");
assertMigration(migrationFiles, "053_", "pricing quote receipt persistence");
assertMigration(migrationFiles, "054_", "onboarding wizard receipt persistence");
assertMigration(migrationFiles, "055_", "auth recovery receipt persistence");
assertMigration(migrationFiles, "056_", "security RLS review receipt persistence");

assert(packageJson.scripts?.["check:real-data-readiness"] === "node scripts/check-real-data-readiness.mjs", "package script check:real-data-readiness");
assertIncludes(workflow, "pnpm check:real-data-readiness", "GitHub Pages workflow real-data readiness gate");

console.log(
  `TrustGraph real-data readiness check passed: ${appRequirements.length} app markers, ${migrationFiles.length} migrations, runbook and readiness evidence verified.`
);
