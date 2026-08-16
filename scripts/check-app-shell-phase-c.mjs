import { readFileSync } from "node:fs";

const css = readFileSync("app/globals.css", "utf8");
const app = readFileSync("src/App.tsx", "utf8");
const spec = readFileSync("TrustGraph-Visual-Design-Spec.md", "utf8");
const workflow = readFileSync(".github/workflows/deploy-pages.yml", "utf8");

const requiredCss = [
  "Phase C app shell focus",
  "--tg-console-max: 1120px !important;",
  ".workspace:has(.portal-route-shell):has(.session-control-strip) > .topbar",
  "min-height: 56px !important;",
  "background: #ffffff !important;",
  "box-shadow: 0 1px 2px rgba(22, 24, 26, 0.08) !important;",
  "table-layout: fixed !important;",
  "pointer-events: auto !important;"
];

for (const marker of requiredCss) {
  if (!css.includes(marker)) {
    throw new Error(`Phase C app shell CSS is missing ${marker}`);
  }
}

if (css.includes("letter-spacing: -")) {
  throw new Error("Phase C app shell must not use negative letter spacing.");
}

if (!spec.includes("# 8. Logged-In App Shell Design") || !spec.includes("# 9. Dashboard Design")) {
  throw new Error("Visual design spec must keep the logged-in shell and dashboard sections.");
}

const requiredAppMarkers = [
  "session_control_strip_keeps_signed_in_email_current_portal_account_recovery_corporate_setup_logout_and_preview_rejection_visible_on_dashboard_entry",
  "signed_in_portal_entry_desk_keeps_personal_corporate_verify_company_admin_pricing_account_recovery_logout_database_proof_server_status_and_no_open_user_database_visible_before_dense_panels",
  "Free user / $149 company pilot",
  "reviewer visibility"
];

for (const marker of requiredAppMarkers) {
  if (!app.includes(marker)) {
    throw new Error(`Phase C app copy/marker is missing ${marker}`);
  }
}

if (app.includes("seat planning")) {
  throw new Error("Phase C copy must describe reviewer visibility, not seat-planning billing.");
}

if (!workflow.includes("pnpm check:app-shell-phase-c")) {
  throw new Error("GitHub Actions must run the Phase C app shell guard.");
}
