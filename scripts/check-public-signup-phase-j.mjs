import { readFileSync } from "node:fs";

const css = readFileSync("app/globals.css", "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Phase J public signup check failed: ${message}`);
  }
}

const markers = [
  "Phase J public signup rescue",
  "overflow-x: hidden !important;",
  ".public-credential-station",
  "order: -1000 !important;",
  ".public-credential-fields",
  "grid-template-columns: repeat(2, minmax(0, 1fr)) !important;",
  ".public-auth-action-dock",
  ".public-auth-card > :is(",
  ".public-proof.public-command-center",
  "display: none !important;",
  "clip-path: inset(50%) !important;",
  "min-height: 48px !important;"
];

for (const marker of markers) {
  assert(css.includes(marker), `missing CSS marker ${marker}`);
}

assert(css.includes(".registration-completion-handoff"), "duplicate completion handoff must be hidden from the first auth flow.");
assert(css.includes(".public-hosted-server-freshness-alert"), "server proof panel must be demoted from the first auth flow.");
assert(!css.includes("letter-spacing: -"), "public signup rescue must not add negative letter spacing.");

console.log(`TrustGraph Phase J public signup check passed: ${markers.length} CSS markers verified.`);
