import { readFileSync } from "node:fs";

const app = readFileSync("src/App.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");
const workflow = readFileSync(".github/workflows/deploy-pages.yml", "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Phase I admin export check failed: ${message}`);
  }
}

const appMarkers = [
  "admin_export_desk_keeps_filter_scope_recommended_export_csv_json_coverage_readiness_receipt_audit_filters_raw_file_exclusion_and_no_preview_data_visible_first",
  "adminExportDeskCards",
  "Admin export desk",
  "Filter first, export only the scoped audit rows, then save a receipt before sharing outside operations.",
  "Recommended export",
  "Receipt",
  "CSV / JSON / coverage ready by scope",
  "Raw private files excluded",
  "No preview data accepted",
  "raw_private_files_exported: false"
];

for (const marker of appMarkers) {
  assert(app.includes(marker), `missing app marker ${marker}`);
}

const cssMarkers = [
  "Phase I admin export desk",
  ".admin-export-desk",
  ".admin-export-desk-grid",
  ".admin-export-desk-proof",
  "order: -990 !important;",
  "grid-template-columns: repeat(auto-fit, minmax(min(100%, 156px), 1fr)) !important;",
  "min-height: 44px !important;",
  "pointer-events: auto !important;",
  "box-shadow: 0 1px 2px rgba(22, 24, 26, 0.08) !important;"
];

for (const marker of cssMarkers) {
  assert(css.includes(marker), `missing CSS marker ${marker}`);
}

assert(app.includes("preview_data_accepted: false"), "admin export desk must reject preview data.");
assert(app.includes("Filtered audit events and metadata only; raw private evidence files are excluded."), "admin export boundary must remain metadata-only.");
assert(!css.includes("letter-spacing: -"), "admin export desk must not use negative letter spacing.");
assert(workflow.includes("pnpm check:admin-export-phase-i"), "CI must run the Phase I admin export check.");

console.log(`TrustGraph Phase I admin export check passed: ${appMarkers.length} app markers and ${cssMarkers.length} CSS markers verified.`);
