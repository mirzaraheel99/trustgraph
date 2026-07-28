import { readFileSync } from "node:fs";

const css = readFileSync("app/globals.css", "utf8");

const requiredMobileStacks = [
  ".auth-actions",
  ".auth-path-grid",
  ".connect-source-strip",
  ".connect-export-actions",
  ".directory-source-strip",
  ".evidence-source-strip",
  ".issuer-source-strip",
  ".invitation-handoff-strip",
  ".missing-source-strip",
  ".notification-source-strip",
  ".operations-source-strip",
  ".reference-source-strip",
  ".release-source-strip",
  ".team-source-strip"
];

const gridStart = css.indexOf("@media (max-width: 1240px)");
const flexStart = css.indexOf("@media (max-width: 760px)");
const gridStackCss = gridStart >= 0 && flexStart > gridStart ? css.slice(gridStart, flexStart) : "";
const flexStackCss = flexStart >= 0 ? css.slice(flexStart) : "";

if (!gridStackCss.includes(".record-form-grid") || !gridStackCss.includes("grid-template-columns: 1fr")) {
  throw new Error("Responsive check failed: missing 1240px grid stacking rule.");
}

if (!flexStackCss.includes(".record-form-footer") || !flexStackCss.includes("flex-direction: column")) {
  throw new Error("Responsive check failed: missing 760px flex stacking rule.");
}

const missing = requiredMobileStacks.filter((selector) => !gridStackCss.includes(selector) && !flexStackCss.includes(selector));

if (missing.length) {
  throw new Error(`Responsive check failed: mobile stacking is missing for ${missing.join(", ")}`);
}

console.log(`TrustGraph responsive check passed: ${requiredMobileStacks.length} mobile stack selectors covered.`);
