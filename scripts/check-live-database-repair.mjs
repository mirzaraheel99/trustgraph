import { readFile } from "node:fs/promises";

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

const [appSource, packageText, workflowText, readinessText, evidenceMapText, responsiveText] = await Promise.all([
  readFile(new URL("../src/App.tsx", import.meta.url), "utf8"),
  readFile(new URL("../package.json", import.meta.url), "utf8"),
  readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8"),
  readFile(new URL("../V1_READINESS_CHECKLIST.md", import.meta.url), "utf8"),
  readFile(new URL("../docs/current-implementation-evidence-map.md", import.meta.url), "utf8"),
  readFile(new URL("../scripts/check-responsive.mjs", import.meta.url), "utf8")
]);

const packageJson = JSON.parse(packageText);

assert(packageJson.scripts?.["check:live-database-repair"] === "node scripts/check-live-database-repair.mjs", "package script check:live-database-repair");
assertIncludes(workflowText, "Verify live database repair path", "GitHub Pages workflow");
assertIncludes(workflowText, "pnpm check:live-database-repair", "GitHub Pages workflow");

assertAll(appSource, [
  "missingLiveRowCommands",
  "live_row_completion_command",
  "live_database_repair_guide",
  "primaryLiveDatabaseRepair",
  "liveDatabaseRepairGuideActions",
  "Run live seed",
  "Open next missing group",
  "Reload proof view",
  "Export working-data packet",
  "Preview data accepted: {liveRowCompletionCommand.preview_data_accepted ? \"yes\" : \"no\"}",
  "live_database_repair_guide_requires_hosted_login_seed_or_create_rows_reload_supabase_repositories_export_working_data_packet_and_reject_preview_data",
  "all_required_signed_in_supabase_row_groups_are_loaded_and_working_data_packet_is_exported",
  "seedLivePilotWorkspace",
  "document.getElementById(\"live-database-proof\")?.scrollIntoView",
  "downloadTextFile(authorizedReportName, JSON.stringify(authorizedReport, null, 2), \"application/json\")"
], "live database repair source");

assertAll(appSource, [
  "Hosted auth session",
  "Account and RBAC context",
  "Passport records",
  "Evidence metadata",
  "Sensitive consent",
  "Billing ledger",
  "Release ledger",
  "Open Verify"
], "live row group routing");

assertAll(appSource, [
  "mode: \"live_database_repair_guide\"",
  "source: authSession && accountContext ? \"signed_in_supabase_context\" : \"hosted_login_required\"",
  "preview_data_accepted: false",
  "missing_count: missingLiveRowCommands.length",
  "next_group: primaryLiveDatabaseRepair?.label ?? \"All required groups loaded\""
], "repair guide packet");

assertAll(responsiveText, [
  ".live-database-repair-guide",
  ".live-database-repair-guide-header",
  ".live-database-repair-guide-summary",
  ".live-database-repair-guide-grid"
], "responsive coverage");

assertIncludes(readinessText, "Verification Loop", "V1 readiness checklist");
assertIncludes(evidenceMapText, "Live database repair guide packet", "implementation evidence map");

console.log("TrustGraph live database repair check passed: repair guide, missing-row commands, export path, preview rejection, responsive coverage, and CI wiring verified.");
