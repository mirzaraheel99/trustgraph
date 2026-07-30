import { readFileSync } from "node:fs";

const css = readFileSync("app/globals.css", "utf8");

const requiredMobileStacks = [
  ".auth-actions",
  ".auth-choice-summary",
  ".auth-operator-path",
  ".auth-path-grid",
  ".auth-recovery-decision-grid",
  ".auth-support-actions",
  ".account-operator-path",
  ".billing-operator-path",
  ".database-status-counts",
  ".database-status-strip",
  ".dashboard-start-map-grid",
  ".connect-source-strip",
  ".connect-export-actions",
  ".corporate-data-access-path",
  ".corporate-access-review-grid",
  ".corporate-visibility-grid",
  ".corporate-live-retest-grid",
  ".corporate-operating-plan-grid",
  ".corporate-operating-plan-header",
  ".corporate-operator-strip",
  ".corporate-task-hub-header",
  ".corporate-setup-guide",
  ".directory-source-strip",
  ".directory-review-board",
  ".admin-audit-export-grid",
  ".evidence-source-strip",
  ".evidence-access-chain",
  ".evidence-preview-download-grid",
  ".issuer-source-strip",
  ".invitation-handoff-strip",
  ".live-database-repair-grid",
  ".live-data-verdict",
  ".live-data-verdict-grid",
  ".missing-source-strip",
  ".notification-source-strip",
  ".operations-source-strip",
  ".passport-record-create-path",
  ".portal-access-steps",
  ".portal-entry-path",
  ".portal-handoff-checklist",
  ".portal-launch-map-grid",
  ".portal-auth-summary-grid",
  ".portal-auth-outcome-grid",
  ".portal-login-switchboard-grid",
  ".proof-export-hub-grid",
  ".workspace-command-strip",
  ".workspace-command-metrics",
  ".portal-decision-panel",
  ".portal-decision-grid",
  ".pricing-decision-strip",
  ".public-session-handoff",
  ".real-database-policy-grid",
  ".registration-path-grid",
  ".reference-source-strip",
  ".release-source-strip",
  ".setup-command-bar",
  ".setup-command-metrics",
  ".signed-in-landing-grid",
  ".team-operations-cockpit",
  ".team-operations-grid",
  ".team-invite-path",
  ".team-source-strip",
  ".corporate-access-blocker-grid",
  ".corporate-verify-access-lane-grid",
  ".verify-request-header",
  ".verify-reviewer-flow-header",
  ".verify-user-data-proof-grid",
  ".working-database-runbook-grid",
  ".working-database-command-grid",
  ".workspace-flow-strip",
  ".workspace-route-strip"
];

const gridStart = css.indexOf("@media (max-width: 1380px)");
const flexStart = css.indexOf("@media (max-width: 760px)");
const gridStackCss = gridStart >= 0 && flexStart > gridStart ? css.slice(gridStart, flexStart) : "";
const flexStackCss = flexStart >= 0 ? css.slice(flexStart) : "";

if (!gridStackCss.includes(".record-form-grid") || !gridStackCss.includes("grid-template-columns: 1fr")) {
  throw new Error("Responsive check failed: missing 1380px grid stacking rule.");
}

if (!css.includes(".evidence-controls") || !css.includes("grid-template-columns: minmax(0, 1fr) 128px 184px 172px")) {
  throw new Error("Responsive check failed: evidence controls must support search, filter, manifest export, and access packet export.");
}

if (!css.includes(".trust-network-visual") || !css.includes("min-height: 268px") || !css.includes(".trust-network-node")) {
  throw new Error("Responsive check failed: premium TrustGraph record graph needs stable desktop dimensions.");
}

if (!css.includes("grid-template-columns: minmax(212px, 244px) minmax(0, 1fr)") || !css.includes("contain: inline-size")) {
  throw new Error("Responsive check failed: app shell must keep the sidebar narrow and contain workspace overflow.");
}

if (!css.includes(".portal-entry-path") || !css.includes(".auth-selected-route")) {
  throw new Error("Responsive check failed: portal login needs a compact entry path and selected route summary.");
}

if (!css.includes("grid-template-columns: minmax(0, 1fr) minmax(220px, 300px)") || !css.includes("max-width: 300px") || !css.includes("scrollbar-width: thin")) {
  throw new Error("Responsive check failed: premium shell actions must stay compact and preserve workspace width.");
}

if (!css.includes("width: min(100%, 1180px)") || !css.includes("grid-template-columns: repeat(3, minmax(0, 1fr))")) {
  throw new Error("Responsive check failed: premium shell must bound desktop content and wrap session actions on tablet.");
}

if (!css.includes(".workspace > *") || !css.includes("grid-template-columns: repeat(auto-fit, minmax(190px, 1fr))")) {
  throw new Error("Responsive check failed: workspace children and corporate plan cards must not force horizontal overflow.");
}

if (!css.includes(".workspace-route-strip") || !css.includes("max-width: 680px") || !css.includes(".workspace-flow-strip") || !css.includes("max-width: 760px")) {
  throw new Error("Responsive check failed: primary workspace route and portal path strips must stay compact.");
}

if (!css.includes(".workspace-command-strip") || !css.includes("grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr) minmax(150px, auto)")) {
  throw new Error("Responsive check failed: workspace command strip must summarize signed-in routing without overflow.");
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

if (!flexStackCss.includes(".hero-value") || !flexStackCss.includes("font-size: 52px")) {
  throw new Error("Responsive check failed: mobile hero cards must use app-scale type.");
}

if (!flexStackCss.includes(".ai-card .advisory-source-grid") || !flexStackCss.includes(".ai-card .advisory-actions") || !flexStackCss.includes("nth-child(n + 3)")) {
  throw new Error("Responsive check failed: mobile advisory card must stay compact.");
}

const missing = requiredMobileStacks.filter((selector) => !gridStackCss.includes(selector) && !flexStackCss.includes(selector));

if (missing.length) {
  throw new Error(`Responsive check failed: mobile stacking is missing for ${missing.join(", ")}`);
}

console.log(`TrustGraph responsive check passed: ${requiredMobileStacks.length} mobile stack selectors covered.`);
