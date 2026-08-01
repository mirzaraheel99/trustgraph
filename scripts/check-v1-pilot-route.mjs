import { readdir, readFile } from "node:fs/promises";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(source, expected, label) {
  assert(source.includes(expected), `Expected ${label} to include "${expected}"`);
}

function assertAll(source, phrases, label) {
  for (const phrase of phrases) {
    assertIncludes(source, phrase, label);
  }
}

function assertMigration(migrations, prefix, label) {
  assert(migrations.some((file) => file.startsWith(prefix) && file.endsWith(".sql")), `Expected migration ${prefix} for ${label}`);
}

const [
  appSource,
  packageText,
  workflowText,
  readinessText,
  runbookText,
  evidenceMapText,
  readmeText,
  releaseStampText,
  migrationFiles
] = await Promise.all([
  readFile(new URL("../src/App.tsx", import.meta.url), "utf8"),
  readFile(new URL("../package.json", import.meta.url), "utf8"),
  readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8"),
  readFile(new URL("../V1_READINESS_CHECKLIST.md", import.meta.url), "utf8"),
  readFile(new URL("../PILOT_RUNBOOK.md", import.meta.url), "utf8"),
  readFile(new URL("../docs/current-implementation-evidence-map.md", import.meta.url), "utf8"),
  readFile(new URL("../README.md", import.meta.url), "utf8"),
  readFile(new URL("../public/trustgraph-release.json", import.meta.url), "utf8"),
  readdir(new URL("../supabase/migrations/", import.meta.url))
]);

const packageJson = JSON.parse(packageText);
const migrations = migrationFiles.filter((file) => file.endsWith(".sql")).sort();
const releaseStamp = JSON.parse(releaseStampText);

const routeGroups = [
  {
    label: "Public website and account entry",
    required: [
      "Public account access path",
      "Professional login",
      "Corporate login",
      "Professional registration",
      "Corporate registration",
      "Public portal switchboard",
      "Public portal route shell",
      "Public account route confirmation",
      "public_account_route_confirmation",
      "public_account_route_confirmation_shows_selected_portal_mode_database_write_landing_corporate_access_boundary_recovery_action_and_no_preview_data_before_submit",
      "public_account_access_path_keeps_professional_login_corporate_login_professional_registration_corporate_registration_pricing_recovery_first_database_write_landing_and_server_status_visible_before_credentials"
    ]
  },
  {
    label: "Registration and hosted auth completion",
    required: [
      "Registration completion handoff",
      "registration_completion_handoff",
      "record_registration_intent",
      "mark_registration_intent_workspace_created",
      "mark_registration_intent_passport_initialized",
      "Hosted auth recovery board",
      "hosted_auth_recovery_board",
      "Fix localhost email link",
      "Copy hosted redirect"
    ]
  },
  {
    label: "Pricing and payment boundary",
    required: [
      "Public pricing access summary",
      "Public pricing launch decision",
      "Pricing activation workbench",
      "pricing_activation_workbench",
      "Billing pilot acceptance checkpoint",
      "billing_pilot_acceptance_checkpoint",
      "Paid launch decision bridge",
      "paid_launch_decision_bridge",
      "Stripe checkout decision receipt",
      "intentionally_disabled_until_human_gate"
    ]
  },
  {
    label: "Professional Passport and evidence",
    required: [
      "Professional Passport setup",
      "Professional Passport progress strip",
      "Evidence action queue",
      "evidence_action_queue",
      "Signed evidence links",
      "signed_preview",
      "Open a two-minute signed download URL.",
      "Export metadata-only CSV.",
      "raw_private_files_exported: false"
    ]
  },
  {
    label: "Corporate scoped user database",
    required: [
      "Corporate database next action commander",
      "Corporate reviewer task command",
      "Corporate row access outcome command",
      "corporate_row_access_outcome_command",
      "Corporate visibility snapshot",
      "corporate_database_visibility_snapshot",
      "can_browse_users: false",
      "Visible user rows",
      "Review attestation",
      "metadata-only export"
    ]
  },
  {
    label: "Admin exports and security review",
    required: [
      "Admin export launcher",
      "admin_export_launcher",
      "Admin operations acceptance checkpoint",
      "admin_operations_acceptance_checkpoint",
      "Security review checklist",
      "Security RLS signoff packet",
      "V1 security/RLS review checklist",
      "Audit filter receipt",
      "admin_export_launcher_requires_filtered_audit_scope_case_and_data_rights_context_release_ledger_context_raw_file_exclusion_and_no_preview_data"
    ]
  },
  {
    label: "Live database proof and repair path",
    required: [
      "Live data loading command",
      "registration_handoff_command",
      "Real row acceptance gate",
      "real_row_acceptance_gate",
      "Live database repair guide",
      "live_database_repair_guide",
      "Real database completion receipt",
      "real_database_completion_receipt",
      "Preview data is not accepted for v1 database proof",
      "signed_in_supabase_repository_rows"
    ]
  },
  {
    label: "Hosted deployment and VPS freshness",
    required: [
      "VPS freshness checkpoint",
      "vps_freshness_checkpoint",
      "Portal server save commander",
      "portal_server_save_commander",
      "trustgraph-release.json",
      "server_head_matches_latest_green_main_commit",
      "vfix_route_protection",
      "current_build_server_gate_requires_github_green_pages_smoke_vps_release_stamp_commit_json_bundle_marker_and_vfix_route_unchanged"
    ]
  }
];

for (const group of routeGroups) {
  assertAll(appSource, group.required, group.label);
}

assert(packageJson.scripts?.["check:v1-pilot-route"] === "node scripts/check-v1-pilot-route.mjs", "package script check:v1-pilot-route");
assertIncludes(workflowText, "Verify v1 pilot route", "GitHub Pages workflow");
assertIncludes(workflowText, "pnpm check:v1-pilot-route", "GitHub Pages workflow");

assert(releaseStamp.app === "TrustGraph", "release stamp app");
assert(releaseStamp.source === "https://github.com/mirzaraheel99/trustgraph", "release stamp source");
assert(releaseStamp.bundle_marker === "registration_handoff_command", "release stamp bundle marker");
assert(
  releaseStamp.server_save_contract === "trustgraph_release_stamp_static_asset_then_vps_updater_overwrites_with_current_git_commit_and_marker",
  "release stamp server-save contract"
);

assertMigration(migrations, "043_", "account context RPC");
assertMigration(migrations, "044_", "registration intents");
assertMigration(migrations, "048_", "corporate database access receipts");
assertMigration(migrations, "049_", "evidence access receipts");
assertMigration(migrations, "052_", "billing architecture decision receipts");
assertMigration(migrations, "054_", "onboarding wizard receipts");
assertMigration(migrations, "055_", "auth recovery receipts");
assertMigration(migrations, "056_", "security RLS review receipts");
assertMigration(migrations, "059_", "corporate database visibility snapshots");
assertMigration(migrations, "062_", "V1 pilot route run receipts");

assertAll(readinessText, [
  "13-Track Product Coverage",
  "V1 Operating Map",
  "Corporate directory acceptance ledger",
  "Verification Loop"
], "V1 readiness checklist");

assertAll(runbookText, [
  "Live Workflow Acceptance",
  "hosted login/database handoff packet",
  "Human Decisions Still Required"
], "pilot runbook");

assertAll(evidenceMapText, [
  "Public account access path",
  "Evidence action queue",
  "V1 pilot route run receipt",
  "Remaining Human Gates"
], "implementation evidence map");

assertAll(readmeText, [
  "Professional and Corporate portal entry",
  "Corporate registration collects organization name",
  "V1 operating map",
  "Export the working-data packet"
], "README");

console.log(
  `TrustGraph V1 pilot route check passed: ${routeGroups.length} route groups, ${migrations.length} migrations, release stamp, CI, and evidence artifacts verified.`
);
