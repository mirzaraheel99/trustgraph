import fs from "node:fs";

const app = fs.readFileSync("src/App.tsx", "utf8");
const css = fs.readFileSync("app/globals.css", "utf8");
const workflow = fs.readFileSync(".github/workflows/deploy-pages.yml", "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Hosted auth flow check failed: ${message}`);
  }
}

const requiredAppMarkers = [
  ["<h1>Verified work records, owned by the worker.</h1>", "public product H1"],
  ["Professional Passport", "personal portal wording"],
  ["Corporate Verify", "corporate portal wording"],
  ["public_login_route_cockpit_keeps_professional_login_professional_register_corporate_login_corporate_register_pricing_recovery_first_database_write_submit_and_no_open_user_database_visible_before_credentials", "four-route login/register cockpit"],
  ["public_auth_help_strip_keeps_email_ready_hosted_redirect_resend_verification_reset_password_localhost_repair_rate_limit_no_token_export_and_no_preview_data_visible_before_credentials", "public recovery and localhost repair strip"],
  ["account_action_bar_keeps_logout_recovery_password_update_data_export_and_hosted_redirect_visible_before_deep_audit_panels", "signed-in account action bar"],
  ["session_control_strip_keeps_signed_in_email_current_portal_account_recovery_corporate_setup_logout_and_preview_rejection_visible_on_dashboard_entry", "dashboard session controls"],
  ["corporate_access_path_summary_keeps_company_role_request_professional_approval_scoped_user_rows_review_export_logout_and_no_open_database_visible_before_corporate_forms", "corporate scoped database path"],
  ["hosted_visual_qa_closeout_requires_vps_release_stamp_current_desktop_mobile_personal_corporate_login_pricing_scoped_database_logout_and_no_preview_data_verified", "hosted visual QA closeout"],
  ["daily_route_data_verdict_keeps_personal_corporate_pricing_account_database_server_next_actions_visible_bounded_and_rejects_demo_preview_logged_out_rows", "daily route live-data verdict"],
  ["TRUSTGRAPH_AUTH_REDIRECT_FALLBACK_USED", "localhost redirect fallback guard"],
  ["normalizeHostedRedirectUrl", "hosted redirect normalizer"],
  ["repairHostedAuthLink", "localhost link repair helper"],
  ["preview_data_accepted: false", "preview data rejection"]
];

for (const [marker, label] of requiredAppMarkers) {
  assert(app.includes(marker), `${label} marker is missing`);
}

const requiredCssMarkers = [
  ["Public front door single-path final pass", "public auth single-path compression"],
  [".public-auth-card:has(.public-login-route-cockpit) > .public-login-route-cockpit", "public route cockpit ordering"],
  [".public-auth-card:has(.public-login-route-cockpit) > .public-credential-station", "credential station ordering"],
  [".public-auth-card:has(.public-login-route-cockpit) > .public-auth-help-strip", "public recovery strip ordering"],
  ["Account action bar", "account action bar styling"],
  [".session-control-strip", "session control strip styling"],
  ["Daily route and live data verdict", "daily route verdict styling"],
  [".workspace:has(.daily-route-data-verdict) > :is(.hero, .metrics-grid, .v1-portal-operating-center", "duplicate dashboard panel suppression"],
  ["overflow-wrap: anywhere", "long URL wrapping"],
  ["pointer-events: auto", "clickable controls"]
];

for (const [marker, label] of requiredCssMarkers) {
  assert(css.includes(marker), `${label} CSS marker is missing`);
}

assert(
  workflow.includes("NEXT_PUBLIC_TRUSTGRAPH_AUTH_REDIRECT_URL: https://trustgraph.5-75-224-110.sslip.io/"),
  "GitHub build must use hosted VPS auth redirect, not localhost"
);

assert(
  workflow.includes("Verify VPS workflow guardrails") && workflow.includes("Verify premium layout shell"),
  "CI must keep VPS and premium layout gates before build"
);

console.log(`TrustGraph hosted auth flow check passed: ${requiredAppMarkers.length} app markers and ${requiredCssMarkers.length} CSS markers verified.`);
