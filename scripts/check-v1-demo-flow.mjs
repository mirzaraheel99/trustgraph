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
  migrationFiles
] = await Promise.all([
  readFile(new URL("../src/App.tsx", import.meta.url), "utf8"),
  readFile(new URL("../package.json", import.meta.url), "utf8"),
  readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8"),
  readFile(new URL("../V1_READINESS_CHECKLIST.md", import.meta.url), "utf8"),
  readFile(new URL("../PILOT_RUNBOOK.md", import.meta.url), "utf8"),
  readFile(new URL("../docs/current-implementation-evidence-map.md", import.meta.url), "utf8"),
  readFile(new URL("../README.md", import.meta.url), "utf8"),
  readdir(new URL("../supabase/migrations/", import.meta.url))
]);

const packageJson = JSON.parse(packageText);
const migrations = migrationFiles.filter((file) => file.endsWith(".sql")).sort();

const flowChecks = [
  {
    id: "public_entry",
    label: "Public website routes visitors into the right portal",
    required: [
      "Start in the right portal before live database rows are created",
      "Professional user portal",
      "Corporate company portal",
      "Pricing structure packet"
    ]
  },
  {
    id: "auth_registration",
    label: "Professional and corporate registration stays explicit",
    required: [
      "Selected portal command",
      "Registration decision receipt",
      "registration_decision_receipt",
      "Live onboarding acceptance contract",
      "live_onboarding_acceptance_contract",
      "preview_data_accepted: false",
      "Create company admin account",
      "Create Professional Passport",
      "Live database handoff",
      "Verification, recovery, and link repair",
      "Auth recovery command center",
      "Login issue resolver",
      "login_issue_resolver",
      "Copy hosted redirect"
    ]
  },
  {
    id: "dashboard_navigation",
    label: "Signed-in users can find account, corporate, public, and logout actions",
    required: [
      "Session command bar",
      "Portal command deck",
      "Portal choice guide",
      "portal_choice_guide",
      "Server release save path",
      "server_release_save_path",
      "Hosted version receipt",
      "hosted_version_receipt",
      "server_head_matches_latest_green_main_commit",
      "Export server packet",
      "V1 operating map",
      "v1_operating_map",
      "Export operating map",
      "Corporate setup",
      "Corporate setup route",
      "Account first",
      "Verify users",
      "Public site",
      "Sign out",
      "Workspace picker"
    ]
  },
  {
    id: "professional_database",
    label: "Professional Passport writes and exports database proof",
    required: [
      "Professional Passport setup",
      "Evidence metadata",
      "Signed evidence links",
      "Last signed evidence link",
      "last_signed_evidence_link",
      "Export access packet"
    ]
  },
  {
    id: "corporate_database",
    label: "Corporate Verify proves user database visibility through RBAC and grants",
    required: [
      "Corporate user database packet",
      "Corporate user database access contract",
      "corporate_user_database_access_contract",
      "can_browse_users: false",
      "Corporate directory acceptance",
      "corporate_directory_acceptance",
      "Corporate access review queue",
      "Request scope receipt",
      "request_scope_receipt",
      "Export review queue",
      "Corporate Verify live access test",
      "Visible user rows"
    ]
  },
  {
    id: "working_database",
    label: "Working database acceptance rejects preview-only evidence",
    required: [
      "Working database command center",
      "Hosted corporate retest",
      "hosted_corporate_retest",
      "Export hosted retest",
      "Live account acceptance checklist",
      "live_account_acceptance_checklist",
      "Live pilot row proof",
      "live_pilot_row_proof",
      "Live database contract",
      "live_database_contract",
      "Live row source receipt",
      "live_row_source_receipt",
      "signed_in_supabase_repository_rows",
      "preview_data_accepted: false",
      "Preview data is not accepted for v1 database proof",
      "Export working-data packet",
      "Seed reconciliation",
      "Prepare live pilot workspace"
    ]
  },
  {
    id: "billing_boundary",
    label: "Pricing is present while Stripe remains human-gated",
    required: [
      "Billing architecture decision packet",
      "Stripe checkout",
      "Stripe checkout decision receipt",
      "stripe_checkout_decision_receipt",
      "intentionally_disabled_until_human_gate",
      "live_subscription_ledger",
      "Payment launch boundary"
    ]
  },
  {
    id: "admin_launch",
    label: "Admin launch readiness keeps human gates visible",
    required: [
      "V1 completion audit packet",
      "required Supabase row groups loaded",
      "Human decision gates",
      "Security review checklist",
      "Production gate register",
      "Pilot-ready, not unrestricted production traffic"
    ]
  }
];

for (const check of flowChecks) {
  assertAll(appSource, check.required, check.label);
}

assert(packageJson.scripts?.["check:v1-demo-flow"] === "node scripts/check-v1-demo-flow.mjs", "package script check:v1-demo-flow");
assertIncludes(workflowText, "Verify v1 demo flow", "GitHub Pages workflow");
assertIncludes(workflowText, "pnpm check:v1-demo-flow", "GitHub Pages workflow");

assertMigration(migrations, "005_", "professional onboarding RPC");
assertMigration(migrations, "009_", "corporate account and RBAC RPC");
assertMigration(migrations, "019_", "pricing and subscription ledger");
assertMigration(migrations, "023_", "corporate access grant requests");
assertMigration(migrations, "029_", "live pilot workspace seed");
assertMigration(migrations, "034_", "organization RLS recursion repair");
assertMigration(migrations, "041_", "corporate access review attestations");

assertAll(readinessText, [
  "13-Track Product Coverage",
  "V1 Operating Map",
  "server commit matches the latest GitHub",
  "Corporate directory acceptance ledger",
  "Verification Loop"
], "V1 readiness checklist");

assertAll(runbookText, [
  "Live Workflow Acceptance",
  "hosted login/database handoff packet",
  "Human Decisions Still Required"
], "pilot runbook");

assertAll(evidenceMapText, [
  "Live Database Proof Artifacts",
  "V1 operating map packet",
  "Server release save path packet",
  "043_account_context_rpc.sql",
  "collapsible auth operator panels",
  "dashboard session command bar",
  "Remaining Human Gates"
], "implementation evidence map");

assertAll(readmeText, [
  "Professional and Corporate portal entry",
  "Corporate registration collects organization name",
  "V1 operating map",
  "server release save path",
  "Export the working-data packet"
], "README");

console.log(`TrustGraph v1 demo flow check passed: ${flowChecks.length} flow groups, ${migrations.length} migrations, CI and evidence artifacts verified.`);
