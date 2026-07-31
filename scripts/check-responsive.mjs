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
  ".live-account-acceptance-grid",
  ".live-account-acceptance-top",
  ".live-data-verdict-grid",
  ".missing-source-strip",
  ".notification-source-strip",
  ".operations-source-strip",
  ".passport-record-create-path",
  ".portal-access-steps",
  ".portal-auth-command",
  ".portal-auth-command-actions",
  ".portal-entry-path",
  ".portal-handoff-checklist",
  ".portal-home-actions",
  ".portal-home-command",
  ".permission-actions",
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
  ".security-signoff-grid",
  ".security-signoff-header",
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

if (!premiumShellCss.includes(".app") || !premiumShellCss.includes("display: block") || !premiumShellCss.includes(".workspace") || !premiumShellCss.includes("padding-top: 18px")) {
  throw new Error("Responsive check failed: dashboard shell must collapse before cramped desktop widths.");
}

if (!css.includes(".evidence-controls") || !css.includes("grid-template-columns: minmax(0, 1fr) 128px 184px 172px")) {
  throw new Error("Responsive check failed: evidence controls must support search, filter, manifest export, and access packet export.");
}

if (!css.includes(".trust-network-visual") || !css.includes("min-height: 268px") || !css.includes(".trust-network-node")) {
  throw new Error("Responsive check failed: premium TrustGraph record graph needs stable desktop dimensions.");
}

if (!css.includes(".sidebar") || !css.includes("display: none") || !css.includes(".session-command-bar") || !css.includes(".workspace-route-strip")) {
  throw new Error("Responsive check failed: app shell must use the compact top command system instead of a fragile dashboard rail.");
}

if (!css.includes(".sidebar .account-admin-row") || !css.includes(".sidebar .account-admin-form button") || !css.includes("width: 100%")) {
  throw new Error("Responsive check failed: sidebar account controls must stack without overflowing the narrow rail.");
}

if (!css.includes(".portal-entry-path") || !css.includes(".auth-selected-route") || !css.includes(".portal-support-details summary::after")) {
  throw new Error("Responsive check failed: portal login needs a compact entry path and selected route summary.");
}

if (!css.includes(".portal-auth-command") || !css.includes("grid-template-columns: minmax(0, 1fr) minmax(240px, 0.52fr)") || !css.includes(".portal-auth-command-actions")) {
  throw new Error("Responsive check failed: public auth landing command must make portal/login choice clear.");
}

if (!css.includes(".public-auth-section") || !css.includes("grid-template-columns: minmax(0, 0.78fr) minmax(320px, 440px)") || !css.includes("max-width: 1240px") || !css.includes("position: sticky")) {
  throw new Error("Responsive check failed: public auth must use a contained two-column access desk with a stable form card.");
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

if (!css.includes("grid-template-columns: minmax(0, 1fr) auto") || !css.includes(".topbar-session-card") || !css.includes("display: none !important")) {
  throw new Error("Responsive check failed: premium shell must remove duplicate session cards and preserve workspace width.");
}

if (!css.includes("width: min(100%, 1440px)") || !css.includes("overflow: clip") || !css.includes("grid-template-columns: minmax(240px, 0.8fr) minmax(280px, 1fr) minmax(280px, 0.92fr)")) {
  throw new Error("Responsive check failed: premium shell must use the available console width without centered desktop drift.");
}

if (!css.includes(".workspace > *") || !css.includes("grid-template-columns: repeat(auto-fit, minmax(260px, 1fr))")) {
  throw new Error("Responsive check failed: workspace children and corporate plan cards must not force horizontal overflow.");
}

if (!css.includes(".workspace-route-strip") || !css.includes("grid-template-columns: repeat(auto-fit, minmax(136px, 1fr))") || !css.includes(".workspace-flow-strip") || !css.includes("grid-template-columns: repeat(auto-fit, minmax(190px, 1fr))")) {
  throw new Error("Responsive check failed: primary workspace route and portal path strips must stay compact.");
}

if (!css.includes(".workspace-command-strip") || !css.includes("grid-template-columns: minmax(220px, 0.7fr) minmax(0, 1fr) minmax(160px, 0.32fr)")) {
  throw new Error("Responsive check failed: workspace command strip must summarize signed-in routing without overflow.");
}

if (!css.includes(".workspace-command-strip") || !css.includes("grid-template-columns: minmax(220px, 0.78fr) minmax(0, 1fr)") || !css.includes(".workspace-command-actions") || !css.includes("grid-column: 1 / -1")) {
  throw new Error("Responsive check failed: premium shell repair must keep command actions from squeezing dashboard metrics.");
}

if (!css.includes(".portal-home-command") || !css.includes("grid-template-columns: minmax(0, 1fr) minmax(280px, 0.48fr)") || !css.includes(".portal-home-actions")) {
  throw new Error("Responsive check failed: signed-in portal home must provide a clear account/corporate command center.");
}

if (!css.includes(".session-command-bar") || !css.includes("width: fit-content") || !css.includes(".workspace-route-strip,\n.workspace-flow-strip") || !css.includes("display: flex !important")) {
  throw new Error("Responsive check failed: account/logout controls and workspace routes must wrap inside the premium shell.");
}

if (!css.includes(".account-admin-row,\n.team-controls,\n.directory-controls,\n.audit-controls,\n.evidence-controls") || !css.includes("repeat(auto-fit, minmax(min(100%, 180px), 1fr))")) {
  throw new Error("Responsive check failed: dense corporate/admin forms must auto-fit instead of forcing horizontal overflow.");
}

if (!css.includes(".sidebar") || !css.includes("display: none !important")) {
  throw new Error("Responsive check failed: authenticated workspace must not resurrect the legacy sidebar rail.");
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
