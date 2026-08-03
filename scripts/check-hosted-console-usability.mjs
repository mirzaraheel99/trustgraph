import fs from "node:fs";

const app = fs.readFileSync("src/App.tsx", "utf8");
const css = fs.readFileSync("app/globals.css", "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Hosted console usability check failed: ${message}`);
  }
}

const requiredAppMarkers = [
  [
    "daily_route_data_verdict_keeps_personal_corporate_pricing_account_database_server_next_actions_visible_bounded_and_rejects_demo_preview_logged_out_rows",
    "daily route verdict must remain the first hosted operator answer"
  ],
  [
    "account_action_bar_keeps_logout_recovery_password_update_data_export_and_hosted_redirect_visible_before_deep_audit_panels",
    "signed-in account action bar must keep logout and recovery visible"
  ],
  [
    "corporate_access_path_summary_keeps_company_role_request_professional_approval_scoped_user_rows_review_export_logout_and_no_open_database_visible_before_corporate_forms",
    "corporate path must explain scoped database access before dense forms"
  ],
  [
    "hosted_visual_qa_closeout_requires_vps_release_stamp_current_desktop_mobile_personal_corporate_login_pricing_scoped_database_logout_and_no_preview_data_verified",
    "hosted visual QA closeout must remain explicit"
  ]
];

for (const [marker, label] of requiredAppMarkers) {
  assert(app.includes(marker), label);
}

const requiredCssMarkers = [
  ["Hosted console closeout", "final hosted console CSS lock"],
  [".workspace:has(.daily-route-data-verdict) > .daily-route-data-verdict", "daily verdict ordering"],
  [".workspace:has(.daily-route-data-verdict) > .work-grid", "single work-grid ordering"],
  [".workspace:has(.daily-route-data-verdict) > :is(\n  .topbar,", "duplicate first-screen panels must be visually removed"],
  [".signed-in-portal-entry-desk,", "legacy signed-in desk must be hidden once daily verdict exists"],
  [".portal-route-shell,", "duplicate portal shell must be hidden once daily verdict exists"],
  [".vps-freshness-checkpoint,", "duplicate VPS freshness board must be hidden once daily verdict exists"],
  ["pointer-events: none !important;", "hidden panels must not block clicks"],
  [".workspace:has(.daily-route-data-verdict) :is(button, input, select, textarea)", "interactive controls must stay bounded"],
  ["white-space: normal !important;", "button text must wrap instead of overflow"],
  ["overflow-x: hidden !important;", "page-level horizontal overflow must stay disabled"],
  ["overflow-x: clip !important;", "workspace-level horizontal overflow must be clipped"],
  ["@media (max-width: 760px)", "mobile closeout rules must exist"]
];

for (const [marker, label] of requiredCssMarkers) {
  assert(css.includes(marker), `${label} marker is missing`);
}

assert(
  !css.includes("letter-spacing: -"),
  "premium console CSS must not use negative letter spacing"
);

console.log(`TrustGraph hosted console usability check passed: ${requiredAppMarkers.length} app markers and ${requiredCssMarkers.length} CSS markers verified.`);
