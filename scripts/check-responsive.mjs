import { readFileSync } from "node:fs";

const css = readFileSync("app/globals.css", "utf8");

const requiredMobileStacks = [
  ".auth-actions",
  ".auth-path-grid",
  ".database-status-counts",
  ".database-status-strip",
  ".connect-source-strip",
  ".connect-export-actions",
  ".corporate-task-hub-header",
  ".corporate-setup-guide",
  ".directory-source-strip",
  ".directory-review-board",
  ".evidence-source-strip",
  ".issuer-source-strip",
  ".invitation-handoff-strip",
  ".live-database-repair-grid",
  ".missing-source-strip",
  ".notification-source-strip",
  ".operations-source-strip",
  ".portal-access-steps",
  ".portal-decision-panel",
  ".portal-decision-grid",
  ".public-session-handoff",
  ".registration-path-grid",
  ".reference-source-strip",
  ".release-source-strip",
  ".team-operations-cockpit",
  ".team-operations-grid",
  ".team-source-strip",
  ".verify-reviewer-flow-header"
];

const gridStart = css.indexOf("@media (max-width: 1240px)");
const flexStart = css.indexOf("@media (max-width: 760px)");
const gridStackCss = gridStart >= 0 && flexStart > gridStart ? css.slice(gridStart, flexStart) : "";
const flexStackCss = flexStart >= 0 ? css.slice(flexStart) : "";

if (!gridStackCss.includes(".record-form-grid") || !gridStackCss.includes("grid-template-columns: 1fr")) {
  throw new Error("Responsive check failed: missing 1240px grid stacking rule.");
}

if (!css.includes(".evidence-controls") || !css.includes("grid-template-columns: minmax(0, 1fr) 128px 184px 172px")) {
  throw new Error("Responsive check failed: evidence controls must support search, filter, manifest export, and access packet export.");
}

if (!css.includes(".trust-network-visual") || !css.includes("min-height: 268px") || !css.includes(".trust-network-node")) {
  throw new Error("Responsive check failed: premium TrustGraph record graph needs stable desktop dimensions.");
}

if (!css.includes("grid-template-columns: minmax(208px, 240px) minmax(0, 1fr)") || !css.includes("contain: inline-size")) {
  throw new Error("Responsive check failed: app shell must keep the sidebar narrow and contain workspace overflow.");
}

if (!css.includes("width: min(100%, 1360px)") || !css.includes("grid-template-columns: minmax(0, 1fr) repeat(3, minmax(108px, auto))")) {
  throw new Error("Responsive check failed: premium shell must bound desktop content and wrap session actions on tablet.");
}

if (!flexStackCss.includes(".record-form-footer") || !flexStackCss.includes("flex-direction: column")) {
  throw new Error("Responsive check failed: missing 760px flex stacking rule.");
}

if (!flexStackCss.includes(".trust-network-visual") || !flexStackCss.includes("min-height: 316px")) {
  throw new Error("Responsive check failed: premium TrustGraph record graph needs stable mobile dimensions.");
}

if (!flexStackCss.includes(".audit-controls button") || !flexStackCss.includes("min-height: 42px")) {
  throw new Error("Responsive check failed: dense mobile controls need stable touch targets.");
}

const missing = requiredMobileStacks.filter((selector) => !gridStackCss.includes(selector) && !flexStackCss.includes(selector));

if (missing.length) {
  throw new Error(`Responsive check failed: mobile stacking is missing for ${missing.join(", ")}`);
}

console.log(`TrustGraph responsive check passed: ${requiredMobileStacks.length} mobile stack selectors covered.`);
