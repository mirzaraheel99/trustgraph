import { readFileSync } from "node:fs";

const css = readFileSync("app/globals.css", "utf8");
const workflow = readFileSync(".github/workflows/deploy-pages.yml", "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Phase K product preview check failed: ${message}`);
  }
}

const markers = [
  "Phase K product preview formatting",
  ".workspace:has(.signed-in-portal-entry-desk)",
  "writing-mode: horizontal-tb !important;",
  ".auth-email-link-verdict",
  ".auth-email-troubleshooting-strip",
  ".hosted-auth-redirect-verification",
  ".current-build-server-gate.public",
  "visibility: hidden !important;",
  "grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)) !important;",
  "overflow-x: clip !important;"
];

for (const marker of markers) {
  assert(css.includes(marker), `missing CSS marker ${marker}`);
}

assert(!css.includes("letter-spacing: -"), "product preview hotfix must not add negative letter spacing.");
assert(workflow.includes("pnpm check:product-preview-phase-k"), "CI must run the Phase K product preview check.");

console.log(`TrustGraph Phase K product preview check passed: ${markers.length} CSS markers verified.`);
