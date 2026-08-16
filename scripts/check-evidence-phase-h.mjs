import { readFileSync } from "node:fs";

const app = readFileSync("src/App.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");
const workflow = readFileSync(".github/workflows/deploy-pages.yml", "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Phase H evidence handoff check failed: ${message}`);
  }
}

const appMarkers = [
  "evidence_handoff_desk_keeps_metadata_private_file_signed_preview_download_manifest_packet_audit_receipt_raw_file_exclusion_and_corporate_metadata_boundary_visible_first",
  "evidenceHandoffDeskCards",
  "Evidence handoff",
  "Evidence handoff is ready for signed preview",
  "Preview signed evidence",
  "Corporate handoff exports metadata and audit proof only.",
  "Raw private files require scoped, short-lived signed access.",
  "Manifest: metadata only",
  "Raw private files excluded",
  "Audit receipt"
];

for (const marker of appMarkers) {
  assert(app.includes(marker), `missing app marker ${marker}`);
}

const cssMarkers = [
  "Phase H evidence handoff desk",
  ".evidence-handoff-desk",
  ".evidence-handoff-desk-grid",
  ".evidence-handoff-desk-proof",
  "order: -980 !important;",
  "grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr)) !important;",
  "min-height: 44px !important;",
  "pointer-events: auto !important;",
  "box-shadow: 0 1px 2px rgba(22, 24, 26, 0.08) !important;"
];

for (const marker of cssMarkers) {
  assert(css.includes(marker), `missing CSS marker ${marker}`);
}

assert(app.includes("raw_private_files_exported: false"), "evidence packets must explicitly exclude raw private files.");
assert(app.includes("preview_window: \"5 minutes\""), "evidence handoff must show preview expiry.");
assert(app.includes("download_window: \"2 minutes\""), "evidence handoff must show download expiry.");
assert(!css.includes("letter-spacing: -"), "evidence handoff desk must not use negative letter spacing.");
assert(workflow.includes("pnpm check:evidence-phase-h"), "CI must run the Phase H evidence handoff check.");

console.log(`TrustGraph Phase H evidence handoff check passed: ${appMarkers.length} app markers and ${cssMarkers.length} CSS markers verified.`);
