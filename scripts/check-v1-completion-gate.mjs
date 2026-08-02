import fs from "node:fs";

const app = fs.readFileSync("src/App.tsx", "utf8");
const css = fs.readFileSync("app/globals.css", "utf8");
const report = fs.readFileSync("scripts/report-vps-status.mjs", "utf8");
const workflow = fs.readFileSync(".github/workflows/deploy-pages.yml", "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(`V1 completion gate check failed: ${message}`);
  }
}

const completionMarkers = [
  ["v1_completion_blocker_ledger", "completion blocker ledger packet"],
  [
    "v1_completion_blocker_ledger_requires_hosted_login_live_supabase_rows_completion_receipt_vps_release_stamp_billing_pilot_owner_security_legal_vps_cutover_signoff_and_no_preview_data_before_goal_complete",
    "completion acceptance rule"
  ],
  ["completion_claim_allowed", "explicit completion claim boolean"],
  ["livePilotRowProof.accepted", "live Supabase row proof requirement"],
  ["latestRealDatabaseCompletionReceipt", "persisted completion receipt requirement"],
  ['serverSyncMonitor.status === "synced"', "VPS release stamp requirement"],
  ["Billing pilot", "billing pilot blocker"],
  ["Pilot owners", "pilot owner human gate"],
  ["Security and legal", "security and legal human gate"],
  ["VPS cutover approval", "VPS cutover human gate"],
  ["preview_data_accepted: false", "preview data rejection"]
];

for (const [marker, label] of completionMarkers) {
  assert(app.includes(marker), `${label} marker is missing`);
}

assert(
  app.includes('aria-label="V1 completion blocker ledger"') && app.includes('aria-label="Launch gap navigator"'),
  "completion ledger and launch gap navigator must be visible in the app"
);

assert(
  app.includes("real_database_completion_receipt_requires_hosted_login_registration_corporate_workspace_pricing_user_database_access_evidence_consent_team_review_release_owner_receipts_and_no_preview_data"),
  "real database completion receipt must require the full live-row scope"
);

assert(
  app.includes("live_data_acceptance_contract_requires_signed_in_supabase_rows_persisted_completion_receipt_working_data_export_preview_rejection_and_vps_release_stamp_before_v1_done"),
  "live data acceptance contract must block V1 done until rows, receipt, export, preview rejection, and VPS stamp exist"
);

assert(
  css.includes(".v1-completion-blocker-ledger") &&
    css.includes(".launch-gap-navigator") &&
    css.includes(".v1-completion-command-center"),
  "completion and launch-gap surfaces must be styled"
);

assert(
  report.includes("served HTML app shell instead of release JSON") &&
    report.includes("vps_sync_required") &&
    report.includes("github_pages_and_vps_release_json_match_commit_short_and_premium_workspace_responsive_guard_marker"),
  "VPS status report must reject HTML shell release stamps and require GitHub/VPS commit parity"
);

assert(
  workflow.includes("Verify hosted auth flow") &&
    workflow.includes("Verify VPS workflow guardrails") &&
    workflow.includes("Stamp release asset") &&
    workflow.includes("Verify release stamp asset"),
  "CI must keep hosted auth, VPS guardrails, release stamping, and stamp verification before deploy"
);

console.log("TrustGraph V1 completion gate check passed: completion claims remain blocked by live data, VPS, billing, human gates, and preview-data rejection.");
