import { readFileSync } from "node:fs";

const css = readFileSync("app/globals.css", "utf8");

const requiredMobileStacks = [
  ".auth-actions",
  ".auth-choice-summary",
  ".auth-path-grid",
  ".auth-support-actions",
  ".account-operator-path",
  ".billing-operator-path",
  ".database-status-counts",
  ".database-status-strip",
  ".connect-source-strip",
  ".connect-export-actions",
  ".corporate-live-retest-grid",
  ".corporate-operating-plan-grid",
  ".corporate-operating-plan-header",
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
  ".portal-auth-summary-grid",
  ".portal-auth-outcome-grid",
  ".portal-decision-panel",
  ".portal-decision-grid",
  ".public-session-handoff",
  ".real-database-policy-grid",
  ".registration-path-grid",
  ".reference-source-strip",
  ".release-source-strip",
  ".setup-command-bar",
  ".setup-command-metrics",
  ".team-operations-cockpit",
  ".team-operations-grid",
  ".team-invite-path",
  ".team-source-strip",
  ".verify-request-header",
  ".verify-reviewer-flow-header",
  ".verify-user-data-proof-grid",
  ".workspace-flow-strip",
  ".workspace-route-strip"
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

if (!css.includes("grid-template-columns: minmax(260px, 300px) minmax(0, 1fr)") || !css.includes("contain: inline-size")) {
  throw new Error("Responsive check failed: app shell must keep the sidebar narrow and contain workspace overflow.");
}

if (!css.includes("width: min(100%, 1280px)") || !css.includes("grid-template-columns: repeat(3, minmax(0, 1fr))")) {
  throw new Error("Responsive check failed: premium shell must bound desktop content and wrap session actions on tablet.");
}

if (!css.includes(".workspace > *") || !css.includes("grid-template-columns: repeat(auto-fit, minmax(190px, 1fr))")) {
  throw new Error("Responsive check failed: workspace children and corporate plan cards must not force horizontal overflow.");
}

if (!css.includes(".workspace-route-strip") || !css.includes("max-width: 680px") || !css.includes(".workspace-flow-strip") || !css.includes("max-width: 760px")) {
  throw new Error("Responsive check failed: primary workspace route and portal path strips must stay compact.");
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

if (!flexStackCss.includes(".workspace-route-strip") || !flexStackCss.includes(".workspace-flow-strip") || !flexStackCss.includes("display: none")) {
  throw new Error("Responsive check failed: mobile workspace routing must stay compact.");
}

const missing = requiredMobileStacks.filter((selector) => !gridStackCss.includes(selector) && !flexStackCss.includes(selector));

if (missing.length) {
  throw new Error(`Responsive check failed: mobile stacking is missing for ${missing.join(", ")}`);
}

console.log(`TrustGraph responsive check passed: ${requiredMobileStacks.length} mobile stack selectors covered.`);
