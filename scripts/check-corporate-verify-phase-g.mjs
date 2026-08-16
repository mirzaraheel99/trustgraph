import { readFileSync } from "node:fs";

const app = readFileSync("src/App.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");
const workflow = readFileSync(".github/workflows/deploy-pages.yml", "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Phase G Corporate Verify check failed: ${message}`);
  }
}

const appMarkers = [
  "corporate_verify_review_desk_keeps_role_request_approval_scoped_rows_review_proof_metadata_export_empty_state_and_no_open_user_database_visible_before_dense_verify_panels",
  "corporateVerifyReviewDeskCards",
  "Corporate Verify review desk",
  "Start with one professional request",
  "Review approved scoped rows",
  "A corporate reviewer cannot browse every user.",
  "Scoped rows",
  "Review proof",
  "Metadata-only export",
  "No open user database"
];

for (const marker of appMarkers) {
  assert(app.includes(marker), `missing app marker ${marker}`);
}

const cssMarkers = [
  "Phase G Corporate Verify review desk",
  ".corporate-verify-review-desk",
  ".corporate-verify-review-desk-grid",
  ".corporate-verify-review-desk-proof",
  "order: -950 !important;",
  "grid-template-columns: repeat(auto-fit, minmax(min(100%, 158px), 1fr)) !important;",
  "min-height: 44px !important;",
  "pointer-events: auto !important;",
  "box-shadow: 0 1px 2px rgba(22, 24, 26, 0.08) !important;"
];

for (const marker of cssMarkers) {
  assert(css.includes(marker), `missing CSS marker ${marker}`);
}

assert(app.includes("cannot browse every user"), "Corporate Verify copy must state that browsing every user is not allowed.");
assert(!css.includes("letter-spacing: -"), "Corporate Verify review desk must not use negative letter spacing.");
assert(workflow.includes("pnpm check:corporate-verify-phase-g"), "CI must run the Phase G Corporate Verify check.");

console.log(`TrustGraph Phase G Corporate Verify check passed: ${appMarkers.length} app markers and ${cssMarkers.length} CSS markers verified.`);
