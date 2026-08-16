import { readFileSync } from "node:fs";

const tokens = readFileSync("app/design-tokens.css", "utf8");
const layout = readFileSync("app/layout.tsx", "utf8");
const spec = readFileSync("TrustGraph-Visual-Design-Spec.md", "utf8");
const app = readFileSync("src/App.tsx", "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Visual design token check failed: ${message}`);
  }
}

for (const required of ["#0f615b", "#137c74", "#e6f2f0", "#fbfbfa", "#ffffff", "#16181a"]) {
  assert(tokens.toLowerCase().includes(required), `missing locked color ${required}.`);
}

for (const required of [
  "--tg-content-max: 1200px",
  "--tg-sidebar-width: 256px",
  "--tg-topbar-height: 56px",
  "--tg-card-padding: 24px",
  "--tg-row-height: 48px",
  "--tg-shadow: 0 1px 2px",
  "font-variant-numeric: tabular-nums",
  ".brand-symbol::before"
]) {
  assert(tokens.includes(required), `missing locked token or identity marker ${required}.`);
}

assert(layout.includes('import "./design-tokens.css";'), "layout must import the shared token file.");
assert(spec.includes("$149/month per company"), "visual spec must record company-level pilot pricing.");
assert(spec.includes("Do you charge per reviewer?"), "visual spec must answer reviewer billing directly.");
assert(spec.includes("per-seat estimator") && spec.includes("pilot billing is company-level"), "visual spec must reject seat-based billing.");
assert(spec.includes("No seat quota"), "visual spec must keep seats as team visibility only.");
assert(app.includes("Corporate Verify - $149/month per company pilot"), "public auth plan must use company-level pricing.");
assert(app.includes("One price per company"), "public pricing must explain unlimited pilot reviewers.");
assert(!app.includes("pilot monthly per seat"), "public website must not show per-seat pilot pricing.");
assert(!app.includes("Start Corporate with {normalizedPilotSeats} seats"), "public website must not use the deleted seat estimator CTA.");

console.log("Visual design tokens and company-level pilot pricing are locked.");
