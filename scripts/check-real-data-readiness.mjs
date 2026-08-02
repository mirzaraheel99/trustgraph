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

const [
  app,
  recordsRepository,
  registrationRepository,
  auditRepository,
  databaseTypes,
  packageText,
  workflow,
  readiness,
  runbook,
  evidenceMap,
  migrations
] = await Promise.all([
  readFile(new URL("../src/App.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/recordRepository.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/registrationRepository.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/auditRepository.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/database.ts", import.meta.url), "utf8"),
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
  ["Live database proof commander", "live database proof commander label"],
  ["live_database_proof_commander", "live database proof commander packet mode"],
  [
    "live_database_proof_commander_requires_hosted_login_live_supabase_rows_seed_or_manual_rows_reload_export_completion_receipt_vps_freshness_and_rejects_demo_preview_data",
    "live database proof commander acceptance rule"
  ],
  ["Live data acceptance answer", "live data acceptance answer label"],
  ["live_data_acceptance_answer", "live data acceptance answer packet mode"],
  [
    "live_data_acceptance_answer_keeps_current_live_row_answer_next_missing_group_seed_reload_receipt_export_vps_status_and_demo_preview_rejection_visible_before_database_proof",
    "live data acceptance answer rule"
  ],
  ["Live database run answer", "live database run answer label"],
  ["live_database_run_answer", "live database run answer packet mode"],
  [
    "live_database_run_answer_shows_current_run_state_next_action_seed_reload_receipt_export_live_row_counts_vps_status_and_rejects_demo_preview_data_before_database_proof_panels",
    "live database run answer acceptance rule"
  ],
  ["Live rows checklist", "live rows checklist label"],
  ["live_rows_checklist", "live rows checklist packet mode"],
  [
    "live_rows_checklist_requires_hosted_login_live_supabase_rows_seed_or_manual_rows_reload_corporate_review_receipt_export_vps_release_json_and_rejects_preview_data",
    "live rows checklist acceptance rule"
  ],
  [
    "hosted_auth_account_context_passport_evidence_corporate_access_consent_team_billing_review_and_release_rows_are_loaded_from_supabase_not_preview_data",
    "real-data acceptance rule"
  ],
  ["Real row acceptance gate", "real-row acceptance gate label"],
  ["real_row_acceptance_gate", "real-row acceptance gate packet mode"],
  [
    "real_row_acceptance_gate_requires_hosted_login_registration_passport_evidence_corporate_access_consent_team_billing_review_visibility_release_rows_and_rejects_non_live_preview_data",
    "real-row acceptance gate rule"
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
  ["Live row activation handoff", "live row activation handoff label"],
  ["live_row_activation_handoff", "live row activation handoff packet mode"],
  [
    "live_row_activation_handoff_requires_hosted_login_prepare_live_pilot_workspace_reload_reconcile_seed_ids_export_working_data_and_open_corporate_verify_before_real_database_acceptance",
    "live row activation handoff acceptance rule"
  ],
  ["Live pilot row proof", "live pilot row proof label"],
  ["live_pilot_row_proof", "live pilot row proof packet mode"],
  ["Live data reality strip", "live data reality strip label"],
  ["live_data_reality_strip", "live data reality strip packet mode"],
  [
    "live_data_reality_strip_accepts_only_signed_in_supabase_rows_rejects_preview_or_logged_out_rows_shows_missing_groups_next_action_and_total_loaded_rows_before_completion_claim",
    "live data reality strip acceptance rule"
  ],
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
  ["Login portal desk", "login portal desk label"],
  ["login_portal_desk", "login portal desk packet mode"],
  [
    "login_portal_desk_keeps_user_register_user_login_corporate_register_corporate_login_pricing_recovery_first_database_write_landing_and_scoped_database_rule_visible_before_credentials",
    "login portal desk acceptance rule"
  ],
  ["Public portal launch answer", "public portal launch answer label"],
  ["public_portal_launch_answer", "public portal launch answer packet mode"],
  [
    "public_portal_launch_answer_keeps_professional_register_professional_login_corporate_register_corporate_login_pricing_recovery_server_status_first_database_write_and_no_open_user_database_visible_before_credentials",
    "public portal launch answer acceptance rule"
  ],
  ["Public registration path summary", "public registration path summary label"],
  ["public_registration_path_summary", "public registration path summary packet mode"],
  [
    "public_registration_path_summary_keeps_professional_register_professional_login_corporate_register_corporate_login_pricing_first_database_write_hosted_verification_recovery_landing_and_no_open_user_database_visible_before_credentials",
    "public registration path summary acceptance rule"
  ],
  ["Public auth help strip", "public auth help strip label"],
  ["public_auth_help_strip", "public auth help strip packet mode"],
  [
    "public_auth_help_strip_keeps_email_ready_hosted_redirect_resend_verification_reset_password_localhost_repair_rate_limit_no_token_export_and_no_preview_data_visible_before_credentials",
    "public auth help strip acceptance rule"
  ],
  ["Signed evidence acceptance checkpoint", "signed evidence acceptance label"],
  ["signed_evidence_acceptance_checkpoint", "signed evidence acceptance packet mode"],
  [
    "signed_evidence_acceptance_requires_metadata_private_file_short_lived_signed_link_manifest_export_and_raw_private_file_exclusion",
    "signed evidence acceptance rule"
  ],
  ["Evidence access summary", "evidence access summary label"],
  ["evidence_access_summary", "evidence access summary packet mode"],
  [
    "evidence_access_summary_keeps_metadata_private_file_signed_preview_download_access_receipt_manifest_export_raw_file_exclusion_and_no_preview_data_visible_before_evidence_actions",
    "evidence access summary rule"
  ],
  ["Evidence setup command", "evidence setup command label"],
  ["evidence_setup_command", "evidence setup command packet mode"],
  [
    "evidence_setup_command_requires_metadata_private_file_signed_preview_or_download_manifest_export_and_raw_file_exclusion",
    "evidence setup command rule"
  ],
  ["Persisted corporate database acceptance checkpoint", "persisted corporate database acceptance label"],
  ["persisted_corporate_database_acceptance_checkpoint", "persisted corporate database acceptance packet mode"],
  [
    "persisted_corporate_database_acceptance_requires_live_rbac_approved_rows_review_attestation_access_receipt_visibility_snapshot_and_metadata_only_export",
    "persisted corporate database acceptance rule"
  ],
  ["Corporate portal cockpit", "corporate portal cockpit label"],
  ["corporate_portal_cockpit", "corporate portal cockpit packet mode"],
  [
    "corporate_portal_cockpit_keeps_role_request_approved_rows_review_export_next_action_no_open_user_database_and_preview_rejection_visible_before_dense_verify_proof",
    "corporate portal cockpit acceptance rule"
  ],
  ["Corporate portal unlock answer", "corporate portal unlock answer label"],
  ["corporate_portal_unlock_answer", "corporate portal unlock answer packet mode"],
  [
    "corporate_portal_unlock_answer_shows_if_company_portal_is_ready_next_setup_step_rbac_team_billing_scoped_rows_no_open_user_database_and_preview_rejection_before_setup_controls",
    "corporate portal unlock answer acceptance rule"
  ],
  ["Corporate access decision desk", "corporate access decision desk label"],
  ["corporate_access_decision_desk", "corporate access decision desk packet mode"],
  [
    "corporate_access_decision_desk_answers_current_access_blocker_next_click_live_counts_receipt_snapshot_metadata_export_and_no_open_user_database",
    "corporate access decision desk acceptance rule"
  ],
  ["Corporate row review answer bar", "corporate row review answer label"],
  ["corporate_row_review_answer_bar", "corporate row review answer packet mode"],
  [
    "corporate_row_review_answer_bar_keeps_current_access_answer_filtered_rows_proof_gap_next_click_metadata_export_and_no_open_user_database_visible_before_directory_filters",
    "corporate row review answer no-open-database rule"
  ],
  ["Corporate persisted export gate", "corporate persisted export gate label"],
  ["corporate_persisted_export_gate", "corporate persisted export gate packet mode"],
  [
    "corporate_persisted_export_gate_requires_access_receipt_visibility_snapshot_review_attestation_metadata_only_export_and_no_raw_private_files",
    "corporate persisted export gate rule"
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
  ["Corporate access path summary", "corporate access path summary label"],
  ["corporate_access_path_summary", "corporate access path summary packet mode"],
  [
    "corporate_access_path_summary_keeps_company_role_request_professional_approval_scoped_user_rows_review_export_logout_and_no_open_database_visible_before_corporate_forms",
    "corporate access path summary acceptance rule"
  ],
  ["Corporate attestation completion gate", "corporate attestation completion gate label"],
  ["corporate_attestation_completion_gate", "corporate attestation completion gate packet mode"],
  [
    "corporate_attestation_completion_gate_requires_live_rbac_approved_shared_rows_no_open_gaps_recorded_review_attestation_metadata_export_and_no_open_user_browse",
    "corporate attestation completion gate no-open-browse rule"
  ],
  ["V1 portal operating center", "V1 portal operating center label"],
  ["v1_portal_operating_center", "V1 portal operating center packet mode"],
  [
    "v1_portal_operating_center_requires_professional_corporate_company_pricing_account_database_and_server_paths_visible_clickable_bounded_and_no_preview_data",
    "V1 portal operating center preview-data rejection rule"
  ],
  ["Portal route shell", "portal route shell label"],
  ["portal_route_shell", "portal route shell packet mode"],
  [
    "portal_route_shell_requires_one_bounded_tabbed_surface_for_professional_corporate_company_pricing_account_database_vps_freshness_logout_and_no_preview_data",
    "portal route shell no-preview-data acceptance rule"
  ],
  ["Portal flow compass", "portal flow compass label"],
  ["portal_flow_compass", "portal flow compass packet mode"],
  [
    "portal_flow_compass_keeps_professional_corporate_company_pricing_account_live_data_logout_and_next_click_visible_as_one_simple_portal_path",
    "portal flow compass acceptance rule"
  ],
  ["Session control strip", "session control strip label"],
  ["session_control_strip", "session control strip packet mode"],
  [
    "session_control_strip_keeps_signed_in_email_current_portal_account_recovery_corporate_setup_logout_and_preview_rejection_visible_on_dashboard_entry",
    "session control strip acceptance rule"
  ],
  ["VPS freshness checkpoint", "VPS freshness checkpoint label"],
  ["vps_freshness_checkpoint", "VPS freshness checkpoint packet mode"],
  [
    "vps_freshness_checkpoint_requires_green_github_pages_release_stamp_commit_match_manual_or_secret_based_save_and_vfix_route_protection",
    "VPS freshness checkpoint rule"
  ],
  ["Current build server gate", "current-build server gate label"],
  ["current_build_server_gate", "current-build server gate packet mode"],
  [
    "current_build_server_gate_requires_github_green_pages_smoke_vps_release_stamp_commit_json_bundle_marker_and_vfix_route_unchanged",
    "current-build server gate acceptance rule"
  ],
  ["Public signup decision desk", "public signup decision desk label"],
  ["public_signup_decision_desk", "public signup decision desk packet mode"],
  [
    "public_signup_decision_desk_keeps_portal_mode_price_first_database_write_required_fields_recovery_and_submit_action_visible_directly_above_form_fields",
    "public signup decision desk live-row form acceptance rule"
  ],
  ["Public signup answer bar", "public signup answer bar label"],
  ["public_signup_answer_bar", "public signup answer bar packet mode"],
  [
    "public_signup_answer_bar_keeps_selected_path_price_first_database_write_landing_submit_readiness_server_status_and_corporate_no_open_database_visible_at_credentials",
    "public signup answer bar live-row credential acceptance rule"
  ],
  ["Public hosted server freshness alert", "public hosted server freshness alert label"],
  ["public_hosted_server_freshness_alert", "public hosted server freshness alert packet mode"],
  [
    "public_hosted_server_freshness_alert_requires_vps_200_plus_release_stamp_json_commit_match_marker_vfix_boundary_and_copyable_manual_update_before_credentials",
    "public hosted server freshness alert acceptance rule"
  ],
  ["Public registration pricing gate", "public registration pricing gate label"],
  ["public_registration_pricing_gate", "public registration pricing gate packet mode"],
  [
    "public_registration_pricing_gate_requires_selected_portal_register_or_login_price_plan_first_database_write_registration_intent_stripe_boundary_server_save_and_no_preview_data_before_credentials",
    "public registration pricing gate no-preview-data acceptance rule"
  ],
  ["Hosted auth recovery board", "hosted auth recovery board label"],
  ["hosted_auth_recovery_board", "hosted auth recovery board packet mode"],
  [
    "hosted_auth_recovery_board_requires_hosted_redirect_email_rate_limit_localhost_link_repair_resend_reset_professional_or_corporate_landing_and_no_preview_data",
    "hosted auth recovery board no-preview-data rule"
  ],
  ["Public portal route shell", "public portal route shell label"],
  ["public_portal_route_shell", "public portal route shell packet mode"],
  [
    "public_portal_route_shell_requires_one_bounded_login_register_surface_for_professional_corporate_pricing_first_database_write_recovery_server_save_and_no_preview_data",
    "public portal route shell no-preview-data acceptance rule"
  ],
  ["Public plan and portal chooser", "public plan and portal chooser label"],
  ["public_plan_portal_chooser", "public plan and portal chooser packet mode"],
  [
    "public_plan_portal_chooser_keeps_professional_login_register_corporate_login_register_pricing_first_database_write_corporate_database_boundary_recovery_and_no_preview_data_visible_before_credentials",
    "public plan and portal chooser no-preview-data rule"
  ],
  ["Public pricing path answer", "public pricing path answer label"],
  ["public_pricing_path_answer", "public pricing path answer packet mode"],
  [
    "public_pricing_path_answer_recommends_professional_free_corporate_149_or_scale_quote_with_first_live_write_scoped_access_and_stripe_gate_before_plan_cards",
    "public pricing path answer acceptance rule"
  ],
  ["Public access answer", "public access answer label"],
  ["public_access_answer", "public access answer packet mode"],
  [
    "public_access_answer_keeps_user_register_user_login_corporate_register_corporate_login_pricing_recovery_submit_first_database_write_landing_server_status_and_no_open_user_database_before_credentials",
    "public access answer acceptance rule"
  ],
  ["Pricing activation workbench", "pricing activation workbench label"],
  ["pricing_activation_workbench", "pricing activation workbench packet mode"],
  [
    "pricing_activation_workbench_requires_plan_seats_projected_price_live_ledger_quote_decision_stripe_gate_export_and_no_preview_data",
    "pricing activation workbench no-preview-data acceptance rule"
  ],
  ["Corporate reviewer database home", "corporate reviewer database home label"],
  ["corporate_reviewer_database_home", "corporate reviewer database home packet mode"],
  [
    "corporate_reviewer_database_home_requires_request_approval_visible_scoped_rows_review_attestation_export_and_no_open_user_browse",
    "corporate reviewer database home no-open-browse acceptance rule"
  ],
  ["Corporate database access sequence", "corporate database access sequence label"],
  ["corporate_database_access_sequence", "corporate database access sequence packet mode"],
  [
    "corporate_database_access_sequence_keeps_role_request_professional_approval_scoped_user_rows_review_attestation_export_no_open_user_browse_and_no_preview_data_visible_first",
    "corporate database access sequence no-preview-data rule"
  ],
  ["Corporate reviewer database workbench", "corporate reviewer database workbench label"],
  ["corporate_reviewer_database_workbench", "corporate reviewer database workbench packet mode"],
  [
    "corporate_reviewer_database_workbench_requires_visible_filtered_rows_request_approval_attestation_snapshot_receipt_export_and_no_open_user_browse",
    "corporate reviewer database workbench no-open-browse acceptance rule"
  ],
  ["Corporate scoped RPC proof", "corporate scoped RPC proof label"],
  ["corporate_scoped_rpc_proof", "corporate scoped RPC proof packet mode"],
  [
    "corporate_scoped_rpc_proof_requires_list_corporate_visible_passport_rows_active_rbac_approved_non_expired_grants_consent_state_no_raw_private_files_no_preview_data_and_no_open_user_database",
    "corporate scoped RPC proof acceptance rule"
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
  ["Billing ready answer", "billing ready answer label"],
  ["billing_ready_answer", "billing ready answer packet mode"],
  [
    "billing_ready_answer_keeps_professional_free_corporate_149_pilot_seats_live_subscription_ledger_quote_decision_stripe_human_gate_scoped_database_boundary_and_preview_rejection_before_billing_receipts",
    "billing ready answer acceptance rule"
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
  ["V1 remaining work answer", "V1 remaining work answer label"],
  ["v1_remaining_work_answer", "V1 remaining work answer packet mode"],
  [
    "v1_remaining_work_answer_keeps_current_goal_status_live_rows_completion_receipt_vps_freshness_human_gates_next_action_and_preview_rejection_visible_before_v1_claim",
    "V1 remaining work answer acceptance rule"
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
  ["Registration completion receipt", "registration completion receipt label"],
  ["registration_completion_receipt_packet", "registration completion receipt packet mode"],
  ["registration_completion_receipts", "persisted registration completion receipt table"],
  ["record_registration_completion_receipt", "persisted registration completion receipt RPC"],
  [
    "registration_completion_receipt_requires_hosted_redirect_verified_session_registration_intent_first_database_write_correct_dashboard_and_no_preview_data",
    "persisted registration completion receipt acceptance rule"
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
  ["Admin export launcher", "admin export launcher label"],
  ["admin_export_launcher", "admin export launcher packet mode"],
  [
    "admin_export_launcher_requires_filtered_audit_scope_case_and_data_rights_context_release_ledger_context_raw_file_exclusion_and_no_preview_data",
    "admin export launcher rule"
  ],
  ["Admin export path", "admin export decision strip label"],
  ["admin_export_decision_strip", "admin export decision strip packet mode"],
  [
    "admin_export_decision_strip_keeps_filter_scope_recommended_export_csv_json_coverage_readiness_receipt_raw_file_exclusion_and_preview_rejection_visible_before_audit_table",
    "admin export decision strip no-preview-data rule"
  ],
  ["Admin audit export receipt", "admin audit export receipt label"],
  ["admin_audit_export_receipt_packet", "admin audit export receipt packet mode"],
  ["admin_audit_export_receipts", "persisted admin audit export receipt table"],
  ["record_admin_audit_export_receipt", "persisted admin audit export receipt RPC"],
  [
    "admin_audit_export_receipt_requires_admin_rbac_filtered_audit_scope_case_data_rights_release_context_metadata_only_no_raw_private_files_and_no_preview_data",
    "persisted admin audit export receipt acceptance rule"
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
assertIncludes(evidenceMap, "Live Supabase migrations currently run through `065_admin_audit_export_receipts.sql`", "evidence map current migration boundary");
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
assertMigration(migrationFiles, "063_", "corporate scoped visible Passport rows RPC");
assertMigration(migrationFiles, "064_", "persisted registration completion receipts");
assertMigration(migrationFiles, "065_", "persisted admin audit export receipts");
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
assertIncludes(recordsRepository, "list_corporate_visible_passport_rows", "Corporate Verify repository scoped visible rows RPC");
assertIncludes(recordsRepository, "DbCorporateVisiblePassportRow", "Corporate Verify repository typed scoped visible rows");
assertIncludes(recordsRepository, "corporate_visible_passport_row", "Corporate Verify row metadata marks database-scoped rows");
assertIncludes(databaseTypes, "export interface DbCorporateVisiblePassportRow", "typed Corporate visible Passport row contract");
assertIncludes(databaseTypes, "raw_private_files_included: boolean", "Corporate visible row raw-file exclusion field");
assertIncludes(databaseTypes, "export interface DbRegistrationCompletionReceipt", "typed registration completion receipt contract");
assertIncludes(registrationRepository, "loadRegistrationCompletionReceipts", "registration completion receipt loader");
assertIncludes(registrationRepository, "recordRegistrationCompletionReceipt", "registration completion receipt writer");
assertIncludes(registrationRepository, "record_registration_completion_receipt", "registration completion receipt RPC adapter");
assertIncludes(databaseTypes, "export interface DbAdminAuditExportReceipt", "typed admin audit export receipt contract");
assertIncludes(auditRepository, "loadAdminAuditExportReceipts", "admin audit export receipt loader");
assertIncludes(auditRepository, "recordAdminAuditExportReceipt", "admin audit export receipt writer");
assertIncludes(auditRepository, "record_admin_audit_export_receipt", "admin audit export receipt RPC adapter");

console.log(
  `TrustGraph real-data readiness check passed: ${appRequirements.length} app markers, ${migrationFiles.length} migrations, runbook and readiness evidence verified.`
);
