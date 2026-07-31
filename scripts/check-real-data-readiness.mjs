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
  ["loadConsentAuthorizations", "live consent repository load"]
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
assertIncludes(evidenceMap, "Live Supabase migrations currently run through `050_data_export_package_receipts.sql`", "evidence map current migration boundary");
assertIncludes(evidenceMap, "043_account_context_rpc.sql", "evidence map account-context migration history");
assertIncludes(evidenceMap, "passport_initialized", "evidence map professional registration completion status");
assertIncludes(evidenceMap, "persisted V1 live database readiness receipts", "evidence map persisted readiness receipt");

assertMigration(migrationFiles, "017_", "private evidence storage");
assertMigration(migrationFiles, "029_", "pilot workspace seed");
assertMigration(migrationFiles, "041_", "corporate access review attestations");
assertMigration(migrationFiles, "042_", "organization RLS recursion repair");
assertMigration(migrationFiles, "043_", "account context RPC");
assertMigration(migrationFiles, "044_", "registration intent rows");
assertMigration(migrationFiles, "045_", "corporate registration intent completion");
assertMigration(migrationFiles, "046_", "professional registration intent completion");
assertMigration(migrationFiles, "047_", "persisted V1 live database readiness receipts");
assertMigration(migrationFiles, "048_", "corporate database access receipt persistence");
assertMigration(migrationFiles, "049_", "evidence access receipt persistence");
assertMigration(migrationFiles, "050_", "data export package receipt persistence");

assert(packageJson.scripts?.["check:real-data-readiness"] === "node scripts/check-real-data-readiness.mjs", "package script check:real-data-readiness");
assertIncludes(workflow, "pnpm check:real-data-readiness", "GitHub Pages workflow real-data readiness gate");

console.log(
  `TrustGraph real-data readiness check passed: ${appRequirements.length} app markers, ${migrationFiles.length} migrations, runbook and readiness evidence verified.`
);
