import { readFileSync } from "node:fs";

const app = readFileSync("src/App.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");
const workflow = readFileSync(".github/workflows/deploy-pages.yml", "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Phase E auth polish check failed: ${message}`);
  }
}

const appMarkers = [
  "public_auth_status_strip_keeps_selected_portal_login_register_email_password_company_fields_reset_resend_hosted_redirect_rate_limit_and_localhost_repair_visible_before_submit",
  "account_recovery_status_strip_keeps_signed_in_email_logout_reset_resend_set_new_password_hosted_redirect_rate_limit_and_session_switching_visible",
  "Supabase project email can rate-limit; use one resend or reset, then wait 60+ minutes if limited.",
  "Copy hosted redirect",
  "Reset password",
  "Resend verification",
  "Sign out",
  "TRUSTGRAPH_AUTH_REDIRECT_FALLBACK_USED",
  "repairHostedAuthLink"
];

for (const marker of appMarkers) {
  assert(app.includes(marker), `missing app marker ${marker}`);
}

const cssMarkers = [
  "Phase E auth recovery polish",
  ".public-auth-card:has(.public-login-route-cockpit) > .public-auth-status-strip",
  ".public-auth-status-strip",
  ".account-recovery-status-strip",
  "order: -620 !important;",
  "order: -820 !important;",
  "min-height: 44px !important;",
  "pointer-events: auto !important;",
  "box-shadow: 0 1px 2px rgba(22, 24, 26, 0.08) !important;"
];

for (const marker of cssMarkers) {
  assert(css.includes(marker), `missing CSS marker ${marker}`);
}

assert(!css.includes("letter-spacing: -"), "auth polish must not use negative letter spacing.");
assert(workflow.includes("pnpm check:auth-phase-e"), "CI must run the Phase E auth polish check.");

console.log(`TrustGraph Phase E auth polish check passed: ${appMarkers.length} app markers and ${cssMarkers.length} CSS markers verified.`);
