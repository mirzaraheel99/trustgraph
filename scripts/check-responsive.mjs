import { readFileSync } from "node:fs";

const css = readFileSync("app/globals.css", "utf8");

const requiredMobileStacks = [
  ".auth-actions",
  ".auth-choice-summary",
  ".auth-operator-details",
  ".auth-operator-path",
  ".auth-path-grid",
  ".auth-recovery-decision-grid",
  ".auth-support-actions",
  ".account-operator-path",
  ".corporate-account-rbac-path",
  ".billing-operator-path",
  ".database-status-counts",
  ".database-status-strip",
  ".data-rights-summary-grid",
  ".data-rights-actions",
  ".dashboard-start-map-grid",
  ".connect-source-strip",
  ".connect-export-actions",
  ".corporate-data-access-path",
  ".corporate-access-review-grid",
  ".corporate-visibility-grid",
  ".dispute-source-strip",
  ".dispute-form-grid",
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
  ".fraud-review-strip",
  ".fraud-review-metrics",
  ".data-rights-review-strip",
  ".data-rights-review-metrics",
  ".data-rights-review-actions",
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
  ".portal-support-details",
  ".proof-export-hub-grid",
  ".workspace-command-strip",
  ".workspace-command-metrics",
  ".portal-decision-panel",
  ".portal-decision-grid",
  ".pricing-decision-strip",
  ".public-session-handoff",
  ".real-database-policy-grid",
  ".registration-path-grid",
  ".selected-portal-command",
  ".reference-source-strip",
  ".release-source-strip",
  ".session-command-bar",
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

const gridStart = css.indexOf("@media (max-width: 1020px)");
const flexStart = css.indexOf("@media (max-width: 760px)");
const premiumShellStart = css.indexOf("@media (max-width: 1280px)");
const gridStackCss = gridStart >= 0 && flexStart > gridStart ? css.slice(gridStart, flexStart) : "";
const flexStackCss = flexStart >= 0 ? css.slice(flexStart) : "";
const premiumShellCss = premiumShellStart >= 0 && gridStart > premiumShellStart ? css.slice(premiumShellStart, gridStart) : "";

if (!gridStackCss.includes(".record-form-grid") || !gridStackCss.includes("grid-template-columns: 1fr")) {
  throw new Error("Responsive check failed: missing 1020px grid stacking rule.");
}

if (!premiumShellCss.includes(".app") || !premiumShellCss.includes("display: block") || !premiumShellCss.includes(".sidebar") || !premiumShellCss.includes("border-bottom: 1px solid var(--line)")) {
  throw new Error("Responsive check failed: dashboard shell must collapse before cramped desktop widths.");
}

if (!css.includes(".evidence-controls") || !css.includes("grid-template-columns: minmax(0, 1fr) 128px 184px 172px")) {
  throw new Error("Responsive check failed: evidence controls must support search, filter, manifest export, and access packet export.");
}

if (!css.includes(".trust-network-visual") || !css.includes("min-height: 268px") || !css.includes(".trust-network-node")) {
  throw new Error("Responsive check failed: premium TrustGraph record graph needs stable desktop dimensions.");
}

if (!css.includes(".app") || !css.includes("display: block") || !css.includes("grid-template-columns: minmax(160px, 220px) minmax(0, 1.15fr) minmax(180px, 0.7fr) minmax(0, 0.95fr)") || !css.includes("max-height: 42vh")) {
  throw new Error("Responsive check failed: app shell must use a compact top command band instead of a fragile fixed rail.");
}

if (!css.includes(".sidebar .account-admin-row") || !css.includes(".sidebar .account-admin-form button") || !css.includes("width: 100%")) {
  throw new Error("Responsive check failed: sidebar account controls must stack without overflowing the narrow rail.");
}

if (!css.includes(".portal-entry-path") || !css.includes(".auth-selected-route") || !css.includes(".portal-support-details summary::after")) {
  throw new Error("Responsive check failed: portal login needs a compact entry path and selected route summary.");
}

if (!css.includes(".corporate-launch-command") || !css.includes("grid-template-columns: minmax(0, 0.78fr) minmax(0, 1.22fr)") || !css.includes(".corporate-launch-actions")) {
  throw new Error("Responsive check failed: corporate portal setup needs a clear launch command surface.");
}

if (!css.includes(".auth-access-command") || !css.includes("grid-template-columns: minmax(0, 0.72fr) minmax(0, 1.28fr)") || !css.includes(".auth-access-command-grid")) {
  throw new Error("Responsive check failed: auth panel needs a clear professional/corporate access command surface.");
}

if (!css.includes(".pricing-launch-command") || !css.includes("grid-template-columns: minmax(0, 0.7fr) minmax(0, 1.3fr)") || !css.includes(".pricing-launch-command-grid")) {
  throw new Error("Responsive check failed: billing panel needs a clear pricing launch command surface.");
}

if (!css.includes(".v1-audit-command") || !css.includes("grid-template-columns: minmax(0, 0.72fr) minmax(0, 1.28fr)") || !css.includes(".v1-audit-command-grid")) {
  throw new Error("Responsive check failed: v1 completion panel needs a clear audit command surface.");
}

if (!css.includes("grid-template-columns: minmax(0, 1fr) minmax(260px, 340px)") || !css.includes("max-width: 340px") || !css.includes("scrollbar-width: thin")) {
  throw new Error("Responsive check failed: premium shell actions must stay compact and preserve workspace width.");
}

if (!css.includes("width: min(100%, 1480px)") || !css.includes("margin: 0 auto") || !css.includes("grid-template-columns: minmax(240px, 0.85fr) minmax(300px, 1.08fr) minmax(280px, 0.92fr)")) {
  throw new Error("Responsive check failed: premium shell must use the available console width without centered desktop drift.");
}

if (!css.includes(".workspace > *") || !css.includes("grid-template-columns: repeat(auto-fit, minmax(260px, 1fr))")) {
  throw new Error("Responsive check failed: workspace children and corporate plan cards must not force horizontal overflow.");
}

if (!css.includes(".workspace-route-strip") || !css.includes("max-width: 100%") || !css.includes(".workspace-flow-strip") || !css.includes("grid-template-columns: repeat(auto-fit, minmax(156px, 1fr))")) {
  throw new Error("Responsive check failed: primary workspace route and portal path strips must stay compact.");
}

if (!css.includes(".workspace-command-strip") || !css.includes("grid-template-columns: minmax(180px, 0.5fr) minmax(0, 1.35fr) minmax(150px, 0.34fr)")) {
  throw new Error("Responsive check failed: workspace command strip must summarize signed-in routing without overflow.");
}

if (!gridStackCss.includes("grid-template-columns: 1fr") || !gridStackCss.includes(".sidebar .security-card")) {
  throw new Error("Responsive check failed: tablet sidebar must become a compact navigation band.");
}

if (!flexStackCss.includes(".record-form-footer") || !flexStackCss.includes("flex-direction: column")) {
  throw new Error("Responsive check failed: missing 760px flex stacking rule.");
}

if (!css.includes(".record-dispute-panel") || !css.includes(".dispute-actions") || !css.includes("grid-template-columns: repeat(2, minmax(0, auto))")) {
  throw new Error("Responsive check failed: record dispute controls need compact desktop and mobile-safe action layout.");
}

if (!css.includes(".data-rights-panel") || !css.includes(".data-rights-actions") || !css.includes(".data-rights-request-list")) {
  throw new Error("Responsive check failed: data export and closure controls must stay contained.");
}

if (!css.includes(".data-rights-review-strip") || !css.includes(".data-rights-review-metrics") || !css.includes(".data-rights-review-actions") || !css.includes(".data-rights-case-card")) {
  throw new Error("Responsive check failed: admin data-rights review must stay contained.");
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
