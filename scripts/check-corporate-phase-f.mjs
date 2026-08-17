import { readFileSync } from "node:fs";

const app = readFileSync("src/App.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");
const workflow = readFileSync(".github/workflows/deploy-pages.yml", "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Phase F corporate workspace check failed: ${message}`);
  }
}

const appMarkers = [
  "$149/month per company",
  "Company setup",
  "RBAC roles",
  "Reviewer roster",
  "Team invitations",
  "No open user database",
  "Reviewer count is visibility only, never per-seat billing."
];

for (const marker of appMarkers) {
  assert(app.includes(marker), `missing app marker ${marker}`);
}

const cssMarkers = [
  "Phase F corporate workspace polish",
  ".corporate-workspace-command-strip",
  ".corporate-workspace-command-grid",
  ".corporate-workspace-command-actions",
  "grid-template-columns: repeat(auto-fit, minmax(min(100%, 172px), 1fr)) !important;",
  "min-height: 44px !important;",
  "pointer-events: auto !important;",
  "box-shadow: 0 1px 2px rgba(22, 24, 26, 0.08) !important;"
];

for (const marker of cssMarkers) {
  assert(css.includes(marker), `missing CSS marker ${marker}`);
}

assert(!app.includes("per reviewer seat"), "corporate pilot must not imply reviewer-seat billing.");
assert(!app.includes("seat quota"), "corporate pilot must not imply a reviewer seat quota.");
assert(!css.includes("letter-spacing: -"), "corporate workspace polish must not use negative letter spacing.");
assert(workflow.includes("pnpm check:corporate-phase-f"), "CI must run the Phase F corporate workspace check.");

console.log(`TrustGraph Phase F corporate workspace check passed: ${appMarkers.length} app markers and ${cssMarkers.length} CSS markers verified.`);
