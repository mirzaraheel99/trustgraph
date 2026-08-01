import { readFileSync } from "node:fs";

const css = readFileSync("app/globals.css", "utf8");

const requiredMobileStacks = [
  ".auth-actions",
  ".account-type-chooser-header",
  ".account-type-chooser-grid",
  ".account-type-chooser-actions",
  ".auth-choice-summary",
  ".auth-operator-details",
  ".auth-operator-path",
  ".auth-route-summary-grid",
  ".public-access-desk-controls",
  ".public-access-desk-grid",
  ".public-access-desk-actions",
  ".public-login-command-copy",
  ".public-login-command-grid",
  ".public-login-command-footer",
  ".auth-path-summary-grid",
  ".auth-path-grid",
  ".auth-recovery-decision-grid",
  ".auth-support-actions",
  ".hosted-auth-redirect-grid",
  ".hosted-auth-recovery-header",
  ".hosted-auth-recovery-grid",
  ".hosted-auth-recovery-actions",
  ".hosted-auth-recovery-boundary",
  ".email-verification-delivery-grid",
  ".auth-recovery-database-grid",
  ".signed-in-recovery-control-grid",
  ".signed-in-recovery-control-actions",
  ".hosted-callback-proof-grid",
  ".hosted-corporate-retest-grid",
  ".hosted-version-command",
  ".hosted-version-receipt-grid",
  ".claim-trust-taxonomy-grid",
  ".claim-trust-receipt",
  ".vps-saved-update-verification",
  ".vps-saved-update-command-list",
  ".vps-saved-update-next",
  ".stale-vps-recovery-grid",
  ".production-gate-cockpit",
  ".production-gate-cockpit-header",
  ".production-gate-cockpit-grid",
  ".production-gate-cockpit-proof",
  ".premium-launch-console-actions",
  ".premium-launch-console-proof",
  ".portal-daily-command-copy",
  ".portal-daily-command-next",
  ".portal-daily-command-grid",
  ".portal-daily-command-proof",
  ".portal-daily-navigator-header",
  ".portal-daily-navigator-actions",
  ".portal-daily-navigator-grid",
  ".portal-daily-navigator-proof",
  ".today-command-center",
  ".today-command-actions",
  ".today-command-grid",
  ".today-command-proof",
  ".portal-usability-command",
  ".portal-usability-command-header",
  ".portal-usability-command-grid",
  ".account-operator-path",
  ".corporate-account-rbac-path",
  ".billing-operator-path",
  ".database-status-counts",
  ".database-status-strip",
  ".data-rights-summary-grid",
  ".data-rights-actions",
  ".data-rights-review-lane-grid",
  ".data-export-package-grid",
  ".data-export-package-manifest-grid",
  ".data-export-package-manifest-actions",
  ".v1-completion-lane-grid",
  ".dashboard-start-map-grid",
  ".dashboard-front-door-grid",
  ".dashboard-front-door-proof",
  ".dashboard-next-action",
  ".dashboard-next-action-metrics",
  ".dashboard-next-action-buttons",
  ".connect-source-strip",
  ".connect-export-actions",
  ".console-layout-receipt-grid",
  ".corporate-data-access-path",
  ".corporate-user-database-contract-grid",
  ".corporate-database-access-decision-grid",
  ".corporate-database-action-buttons",
  ".corporate-launch-cockpit-top",
  ".corporate-launch-lanes",
  ".corporate-launch-counts",
  ".corporate-setup-triage-header",
  ".corporate-setup-triage-grid",
  ".corporate-setup-triage-proof",
  ".corporate-access-review-grid",
  ".corporate-visibility-grid",
  ".corporate-classification-grid",
  ".corporate-classification-boundary",
  ".corporate-reviewer-action-bar",
  ".corporate-reviewer-action-grid",
  ".corporate-reviewer-task-header",
  ".corporate-reviewer-task-grid",
  ".corporate-reviewer-task-proof",
  ".corporate-row-access-outcome-header",
  ".corporate-row-access-outcome-grid",
  ".corporate-row-access-outcome-proof",
  ".corporate-database-unlock-header",
  ".corporate-database-unlock-grid",
  ".corporate-database-unlock-proof",
  ".corporate-reviewer-front-desk-grid",
  ".corporate-reviewer-front-desk-actions",
  ".corporate-review-queue-command-header",
  ".corporate-review-queue-command-actions",
  ".corporate-review-queue-command-grid",
  ".corporate-database-next-action-commander",
  ".corporate-database-next-action-grid",
  ".corporate-database-next-action-controls",
  ".corporate-request-to-row-grid",
  ".corporate-request-to-row-proof",
  ".corporate-access-progress-strip-header",
  ".corporate-access-progress-grid",
  ".corporate-access-progress-proof",
  ".professional-passport-progress-header",
  ".professional-passport-progress-grid",
  ".professional-passport-progress-proof",
  ".public-buyer-decision-header",
  ".public-buyer-decision-grid",
  ".public-buyer-decision-proof",
  ".public-auth-front-desk-grid",
  ".public-auth-front-desk-actions",
  ".public-auth-help-actions",
  ".public-portal-switchboard-header",
  ".public-portal-switchboard-grid",
  ".public-portal-switchboard-footer",
  ".public-portal-switchboard-actions",
  ".public-registration-pricing-gate-header",
  ".public-registration-pricing-gate-grid",
  ".public-registration-pricing-gate-footer",
  ".public-portal-flow-map-header",
  ".public-portal-flow-map-actions",
  ".public-portal-flow-map-grid",
  ".public-portal-flow-map-proof",
  ".public-portal-route-board-header",
  ".public-portal-route-board-grid",
  ".public-portal-route-board-proof",
  ".corporate-access-route-preview-header",
  ".corporate-access-route-preview-grid",
  ".corporate-access-route-preview-boundary",
  ".corporate-database-path-grid",
  ".corporate-database-path-proof",
  ".dispute-source-strip",
  ".dispute-form-grid",
  ".corporate-live-retest-grid",
  ".corporate-operating-plan-grid",
  ".corporate-operating-plan-header",
  ".corporate-operator-strip",
  ".corporate-task-hub-header",
  ".corporate-setup-guide",
  ".corporate-setup-stepper-header",
  ".corporate-setup-stepper-grid",
  ".directory-source-strip",
  ".corporate-directory-filter-receipt",
  ".corporate-directory-filter-grid",
  ".corporate-database-visibility-grid",
  ".corporate-classification-contract",
  ".corporate-attestation-completion-header",
  ".corporate-attestation-completion-actions",
  ".corporate-attestation-completion-grid",
  ".corporate-attestation-completion-proof",
  ".corporate-scope-review-grid",
  ".corporate-access-next-action-grid",
  ".corporate-review-handoff-grid",
  ".corporate-persisted-export-header",
  ".corporate-persisted-export-grid",
  ".corporate-persisted-export-boundary",
  ".corporate-access-request-preflight-header",
  ".corporate-access-request-preflight-grid",
  ".corporate-access-request-preflight-boundary",
  ".directory-review-board",
  ".admin-audit-export-command-grid",
  ".admin-audit-export-command-actions",
  ".admin-audit-export-grid",
  ".evidence-source-strip",
  ".evidence-access-chain",
  ".evidence-access-desk-grid",
  ".evidence-access-desk-proof",
  ".evidence-preview-download-grid",
  ".signed-evidence-access-grid",
  ".v1-proof-collection-grid",
  ".fraud-review-strip",
  ".fraud-review-metrics",
  ".regulated-employment-boundary",
  ".regulated-employment-metrics",
  ".data-rights-review-strip",
  ".data-rights-review-metrics",
  ".data-rights-review-actions",
  ".issuer-source-strip",
  ".issuer-provenance-grid",
  ".invitation-handoff-strip",
  ".live-database-repair-command-top",
  ".live-database-repair-actions",
  ".live-database-repair-grid",
  ".live-row-activation-handoff-top",
  ".live-row-activation-handoff-actions",
  ".live-row-activation-handoff-grid",
  ".live-row-activation-handoff-proof",
  ".live-seed-preflight-top",
  ".live-seed-preflight-actions",
  ".live-seed-preflight-grid",
  ".live-seed-reload-grid",
  ".live-database-reload-grid",
  ".live-onboarding-contract-grid",
  ".live-onboarding-sequence",
  ".live-database-acceptance-lanes-top",
  ".live-database-acceptance-lane-grid",
  ".live-data-operator-grid",
  ".live-data-operator-proof",
  ".live-row-source-grid",
  ".live-row-source-next",
  ".live-database-contract-grid",
  ".real-data-acceptance-header",
  ".real-data-acceptance-summary",
  ".real-data-acceptance-grid",
  ".live-data-loading-header",
  ".live-data-loading-proof",
  ".live-data-loading-actions",
  ".real-database-launch-gate-header",
  ".real-database-launch-gate-grid",
  ".real-database-launch-gate-actions",
  ".live-database-repair-guide",
  ".live-database-repair-guide-header",
  ".live-database-repair-guide-summary",
  ".live-database-repair-guide-grid",
  ".live-row-completion-grid",
  ".v1-completion-command-header",
  ".v1-completion-command-grid",
  ".v1-completion-command-actions",
  ".v1-human-gate-header",
  ".v1-human-gate-grid",
  ".v1-human-gate-proof",
  ".real-database-completion-top",
  ".real-database-completion-grid",
  ".live-data-load-receipt",
  ".live-data-load-grid",
  ".live-data-verdict",
  ".login-issue-resolver-grid",
  ".hosted-auth-redirect-grid",
  ".live-account-acceptance-grid",
  ".live-account-acceptance-top",
  ".live-data-verdict-grid",
  ".missing-record-lifecycle-grid",
  ".missing-source-strip",
  ".notification-source-strip",
  ".operations-source-strip",
  ".passport-missing-handoff-grid",
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
  ".registration-database-launch-grid",
  ".portal-auth-summary-grid",
  ".portal-auth-outcome-grid",
  ".portal-choice-guide-header",
  ".portal-choice-guide-grid",
  ".v1-portal-launchpad",
  ".v1-portal-launchpad-actions",
  ".v1-portal-launchpad-grid",
  ".v1-portal-launchpad-proof",
  ".portal-readiness-board",
  ".portal-readiness-board-header",
  ".portal-readiness-board-grid",
  ".v1-launch-flow-command",
  ".v1-launch-flow-grid",
  ".onboarding-handoff-header",
  ".onboarding-handoff-grid",
  ".onboarding-next-action-header",
  ".onboarding-next-action-grid",
  ".onboarding-next-action-proof",
  ".onboarding-completion-command-header",
  ".onboarding-completion-command-actions",
  ".onboarding-completion-command-grid",
  ".onboarding-wizard-receipt-grid",
  ".portal-command-deck-header",
  ".portal-command-deck-grid",
  ".signed-in-portal-flow-contract",
  ".signed-in-portal-flow-grid",
  ".portal-login-switchboard-grid",
  ".login-decision-path-grid",
  ".login-decision-next",
  ".portal-support-details",
  ".proof-export-hub-grid",
  ".registration-intent-review-header",
  ".registration-intent-review-grid",
  ".role-workspace-switchboard",
  ".role-workspace-switchboard-grid",
  ".workspace-command-strip",
  ".workspace-command-metrics",
  ".portal-decision-panel",
  ".portal-decision-grid",
  ".public-portal-database-contract",
  ".public-portal-database-contract-grid",
  ".public-buyer-launch-path",
  ".public-buyer-launch-grid",
  ".portal-front-door-grid",
  ".portal-front-door-proof",
  ".public-portal-launchpad-grid",
  ".public-portal-launchpad-proof",
  ".pricing-decision-strip",
  ".public-pricing-access-grid",
  ".public-pricing-access-actions",
  ".public-pricing-estimator",
  ".public-pricing-estimator-grid",
  ".public-pricing-estimator-actions",
  ".pricing-choice-grid",
  ".pricing-choice-actions",
  ".billing-launch-board-header",
  ".billing-launch-board-grid",
  ".billing-launch-board-actions",
  ".paid-launch-decision-header",
  ".paid-launch-decision-grid",
  ".paid-launch-decision-proof",
  ".pricing-quote-receipt-grid",
  ".pricing-quote-receipt-actions",
  ".pilot-owner-readiness-grid",
  ".pilot-owner-readiness-database-grid",
  ".v1-live-database-readiness-grid",
  ".public-portal-launch-grid",
  ".public-server-sync-receipt",
  ".public-server-sync-grid",
  ".public-server-update-receipt",
  ".public-saved-build-verification",
  ".public-saved-build-grid",
  ".public-auth-server-checkpoint-grid",
  ".public-auth-flow-grid",
  ".stripe-checkout-decision-grid",
  ".stripe-checkout-decision-actions",
  ".billing-architecture-receipt-grid",
  ".public-session-handoff",
  ".real-database-policy-grid",
  ".request-scope-receipt-grid",
  ".registration-path-grid",
  ".registration-focus-strip",
  ".registration-route-planner-grid",
  ".registration-route-planner-actions",
  ".portal-launch-decision-strip",
  ".portal-submit-receipt-grid",
  ".registration-outcome-actions",
  ".registration-pre-submit-checklist",
  ".registration-pre-submit-grid",
  ".registration-decision-grid",
  ".selected-portal-command",
  ".security-signoff-grid",
  ".security-signoff-header",
  ".security-rls-database-grid",
  ".v1-security-review-grid",
  ".server-release-cockpit-header",
  ".server-release-command",
  ".server-release-grid",
  ".server-sync-monitor-grid",
  ".server-sync-next",
  ".current-build-server-gate-header",
  ".current-build-server-gate-grid",
  ".real-row-acceptance-header",
  ".real-row-acceptance-grid",
  ".real-row-acceptance-actions",
  ".v1-operating-map-header",
  ".v1-operating-map-grid",
  ".reference-source-strip",
  ".release-source-strip",
  ".session-command-bar",
  ".setup-command-bar",
  ".setup-command-metrics",
  ".signed-in-landing-grid",
  ".team-operations-cockpit",
  ".team-operations-grid",
  ".team-launch-board-header",
  ".team-launch-board-grid",
  ".team-launch-board-actions",
  ".team-invite-path",
  ".team-billing-handoff-header",
  ".team-billing-handoff-grid",
  ".team-billing-handoff-counts",
  ".team-source-strip",
  ".corporate-access-blocker-grid",
  ".corporate-verify-first-use-grid",
  ".corporate-verify-first-use-counts",
  ".corporate-verify-live-command-header",
  ".corporate-verify-live-command-actions",
  ".corporate-verify-live-command-grid",
  ".empty-verify-state-grid",
  ".empty-verify-state-actions",
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

if (!css.includes(".login-decision-path") || !css.includes(".login-decision-path-grid") || !css.includes("grid-template-columns: repeat(2, minmax(0, 1fr))")) {
  throw new Error("Responsive check failed: live auth needs a clear professional/corporate login decision path.");
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

if (!css.includes(".release-sync-command") || !css.includes("grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr)") || !css.includes(".release-sync-command-grid")) {
  throw new Error("Responsive check failed: v1 completion panel needs a clear release sync command surface.");
}

if (!css.includes(".live-seed-preflight") || !css.includes(".live-seed-preflight-grid") || !css.includes("grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr))")) {
  throw new Error("Responsive check failed: live seed preflight needs a bounded responsive grid.");
}

if (!css.includes(".live-data-load-receipt") || !css.includes("grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr)") || !css.includes(".live-data-load-grid")) {
  throw new Error("Responsive check failed: live data load receipt needs a bounded responsive grid.");
}

if (!css.includes(".corporate-scope-review-command") || !css.includes(".corporate-scope-review-grid") || !css.includes("grid-template-columns: repeat(auto-fit, minmax(min(100%, 170px), 1fr))")) {
  throw new Error("Responsive check failed: corporate scope review command needs a bounded responsive grid.");
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

if (!css.includes(".signed-in-portal-flow-contract") || !css.includes("grid-template-columns: minmax(0, 0.74fr) minmax(0, 1.26fr)") || !css.includes(".signed-in-portal-flow-grid")) {
  throw new Error("Responsive check failed: signed-in portal flow contract must be visible and bounded.");
}

if (!css.includes(".portal-home-command") || !css.includes("grid-template-columns: minmax(0, 1fr) minmax(280px, 0.48fr)") || !css.includes(".portal-home-actions")) {
  throw new Error("Responsive check failed: signed-in portal home must provide a clear account/corporate command center.");
}

if (!css.includes(".public-portal-database-contract") || !css.includes("grid-template-columns: minmax(0, 0.66fr) minmax(0, 1.34fr)") || !css.includes(".public-portal-database-contract-grid")) {
  throw new Error("Responsive check failed: public portal database access contract must be visible and bounded.");
}

if (!css.includes(".server-release-cockpit") || !css.includes(".server-release-command") || !css.includes(".server-release-grid")) {
  throw new Error("Responsive check failed: server release save path must be visible and bounded.");
}

if (!css.includes(".vps-saved-update-verification") || !css.includes("grid-template-columns: minmax(0, 0.86fr) minmax(260px, 0.7fr)") || !css.includes(".vps-saved-update-command-list")) {
  throw new Error("Responsive check failed: VPS saved update verification must be visible and bounded.");
}

if (!css.includes(".portal-server-save-commander") || !css.includes(".portal-server-save-grid") || !css.includes(".portal-server-save-actions") || !css.includes("grid-template-columns: minmax(0, 1fr) minmax(164px, 0.24fr)")) {
  throw new Error("Responsive check failed: portal server-save commander must be visible, bounded, and mobile stacked.");
}

if (!css.includes(".v1-operating-map") || !css.includes(".v1-operating-map-grid") || !css.includes("grid-template-columns: 30px minmax(0, 1fr)")) {
  throw new Error("Responsive check failed: V1 operating map must be visible and bounded.");
}

if (!css.includes(".session-command-bar") || !css.includes("width: fit-content") || !css.includes(".workspace-route-strip,\n  .workspace-flow-strip") || !css.includes("display: grid !important") || !css.includes("overflow-x: clip")) {
  throw new Error("Responsive check failed: account/logout controls and workspace routes must stack without horizontal scrolling.");
}

if (!css.includes(".account-admin-row,\n.team-controls,\n.team-launch-board-actions,\n.directory-controls,\n.audit-controls,\n.evidence-controls") || !css.includes("repeat(auto-fit, minmax(min(100%, 180px), 1fr))")) {
  throw new Error("Responsive check failed: dense corporate/admin forms must auto-fit instead of forcing horizontal overflow.");
}

if (!css.includes("Corporate portal usability repair") || !css.includes(".corporate-directory-panel .directory-controls") || !css.includes("repeat(auto-fit, minmax(min(100%, 168px), 1fr))")) {
  throw new Error("Responsive check failed: Corporate Verify directory controls must use the final auto-fit usability repair.");
}

if (!css.includes(".grant-card,\n.shared-record-card,\n.directory-card,\n.reference-card,\n.missing-card") || !css.includes("overflow: hidden")) {
  throw new Error("Responsive check failed: corporate record cards must be contained to prevent horizontal scroll.");
}

if (!css.includes("V1 overflow hardening") || !css.includes(".workspace code,\n.workspace pre") || !css.includes("white-space: pre-wrap") || !css.includes("@media (max-width: 900px)")) {
  throw new Error("Responsive check failed: final V1 overflow hardening must contain code blocks and stack dense grids on narrow screens.");
}

if (!css.includes(".workspace-admin-grid,\n.work-grid,\n.metrics-grid") || !css.includes("repeat(auto-fit, minmax(min(100%, 220px), 1fr))")) {
  throw new Error("Responsive check failed: broad dashboard grids must auto-fit without forcing horizontal overflow.");
}

if (
  !css.includes("Operator viewport polish") ||
  !css.includes(".workspace-main h1,\n.workspace-admin-grid h1,\n.work-grid h1,\n.verify-panel h1,\n.passport-panel h1") ||
  !css.includes("@media (max-width: 1180px)") ||
  !css.includes(".detail-panel {\n    position: static;\n    max-height: none;")
) {
  throw new Error("Responsive check failed: operator viewport polish must calm oversized headings and stack detail panels before tablet widths.");
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

if (!flexStackCss.includes(".workspace-route-strip") || !flexStackCss.includes(".workspace-flow-strip") || !flexStackCss.includes("display: grid !important")) {
  throw new Error("Responsive check failed: mobile workspace routing must stay stacked and visible.");
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
