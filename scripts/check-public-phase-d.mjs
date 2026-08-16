import { readFileSync } from "node:fs";

const app = readFileSync("src/App.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");
const workflow = readFileSync(".github/workflows/deploy-pages.yml", "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Phase D public shell check failed: ${message}`);
  }
}

const cssMarkers = [
  "Phase D public SaaS front door",
  "--tg-public-shell-max: 1200px !important;",
  "grid-template-columns: minmax(0, 0.58fr) minmax(360px, 0.42fr) !important;",
  ".public-site:has(.public-login-route-cockpit) .public-auth-card",
  ".public-auth-card:has(.public-login-route-cockpit) > .public-login-route-cockpit",
  ".public-auth-card:has(.public-login-route-cockpit) > .public-credential-station",
  ".public-auth-card:has(.public-login-route-cockpit) > .public-auth-help-strip",
  "background: #fbfbfa !important;",
  "box-shadow: 0 1px 2px rgba(22, 24, 26, 0.08) !important;",
  "min-height: 44px !important;",
  "pointer-events: auto !important;"
];

for (const marker of cssMarkers) {
  assert(css.includes(marker), `missing CSS marker ${marker}`);
}

const appMarkers = [
  "<h1>Verified work records, owned by the worker.</h1>",
  "Create your Passport",
  "Start Corporate Verify",
  "$149/month per company",
  "One price per company",
  "reviewer tracking",
  "Reset password",
  "Resend verification",
  "public_login_route_cockpit_keeps_professional_login_professional_register_corporate_login_corporate_register_pricing_recovery_first_database_write_submit_and_no_open_user_database_visible_before_credentials"
];

for (const marker of appMarkers) {
  assert(app.includes(marker), `missing app marker ${marker}`);
}

assert(!app.includes("$149 pilot monthly"), "public copy must not say $149 pilot monthly.");
assert(!app.includes("team seats"), "public copy must not imply seat-limited billing.");
assert(!css.includes("letter-spacing: -"), "public shell must not use negative letter spacing.");
assert(workflow.includes("pnpm check:public-phase-d"), "CI must run the Phase D public shell check.");

console.log(`TrustGraph Phase D public shell check passed: ${appMarkers.length} app markers and ${cssMarkers.length} CSS markers verified.`);
