import { readFileSync } from "node:fs";

const app = readFileSync("src/App.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Premium layout check failed: ${message}`);
  }
}

const authenticatedRenderStart = app.indexOf('return (\n    <div className="app">');
const authenticatedRender = authenticatedRenderStart >= 0 ? app.slice(authenticatedRenderStart) : "";
const premiumRepairStart = css.indexOf("Premium workspace shell repair");
const premiumRepair = premiumRepairStart >= 0 ? css.slice(premiumRepairStart) : "";

assert(authenticatedRenderStart >= 0, "authenticated app render block was not found.");
assert(!authenticatedRender.includes('<aside className="sidebar">'), "legacy sidebar rail must not render in the authenticated workspace.");
assert(authenticatedRender.includes('className="session-command-bar"'), "session command bar must be the primary account/logout control surface.");
assert(authenticatedRender.includes('aria-label="Dashboard next action"'), "signed-in dashboard must expose a single role-aware next-action command.");
assert(authenticatedRender.includes('aria-label="Portal home command center"'), "signed-in dashboard must expose a simple portal home command center.");
assert(authenticatedRender.includes('aria-label="V1 completion cockpit"'), "signed-in dashboard must expose a V1 completion cockpit.");
assert(authenticatedRender.includes("Sign out"), "signed-in dashboard must expose a visible sign-out action.");
assert(authenticatedRender.includes('className="workspace-route-strip"'), "workspace route strip must remain available after sidebar removal.");
assert(authenticatedRender.includes('className="workspace-flow-strip"'), "daily portal path strip must remain available after sidebar removal.");
assert(authenticatedRender.includes('className="setup-route-deck"'), "corporate setup center must expose a clear clickable route deck.");
assert(authenticatedRender.includes('aria-label="Corporate launch cockpit"'), "corporate setup center must expose a single next-action launch cockpit.");
assert(authenticatedRender.includes('aria-label="Team and billing handoff"'), "corporate setup center must connect team, billing, and Verify handoff.");
assert(app.includes('aria-label="Corporate setup stepper"'), "corporate account panel must expose a guided setup stepper.");
assert(app.includes('aria-label="Corporate Verify first-use wizard"'), "Corporate Verify must expose a guided first-use wizard for request, approval, review, and proof export.");
assert(app.includes('aria-label="Auth recovery command center"'), "account and public auth must expose visible recovery command centers.");
assert(app.includes('aria-label="Hosted callback acceptance proof"'), "account and public auth must expose a hosted callback acceptance proof without tokens.");
assert(app.includes('aria-label="Hosted corporate retest checklist"'), "readiness must expose hosted corporate retest checklist.");
assert(app.includes('aria-label="Last signed evidence link"'), "evidence preview/download must expose the last signed-link proof state.");
assert(app.includes('aria-label="Admin audit export command"'), "admin audit exports must expose a clear export command surface.");
assert(app.includes('aria-label="Audit filter receipt"'), "admin audit exports must expose a visible filter receipt.");
assert(app.includes('aria-label="Live pilot row proof"'), "v1 readiness must expose live pilot row proof.");
assert(app.includes('aria-label="Live database acceptance lanes"'), "launch checklist must expose clear Professional, Corporate, and pilot ledger database lanes.");
assert(premiumRepair.includes(".sidebar") && premiumRepair.includes("display: none !important"), "final CSS layer must still suppress any legacy sidebar rail.");
assert(premiumRepair.includes("width: min(100%, 1440px)") && premiumRepair.includes("overflow: clip"), "workspace shell must be bounded and clipped.");
assert(premiumRepair.includes(".portal-home-command") && premiumRepair.includes(".portal-home-actions"), "portal home command center must be styled and bounded in the premium shell.");
assert(premiumRepair.includes(".v1-completion-cockpit") && premiumRepair.includes(".v1-completion-lane-grid"), "V1 completion cockpit must be styled and bounded in the premium shell.");
assert(premiumRepair.includes(".dashboard-next-action") && premiumRepair.includes(".dashboard-next-action-metrics"), "dashboard next action command must be styled and bounded in the premium shell.");
assert(premiumRepair.includes("display: flex !important") && premiumRepair.includes("flex-wrap: wrap"), "workspace route strips must wrap instead of overflowing.");
assert(premiumRepair.includes("repeat(auto-fit, minmax(min(100%, 180px), 1fr))"), "dense admin forms must auto-fit narrow screens.");
assert(premiumRepair.includes(".live-pilot-row-proof") && premiumRepair.includes(".live-pilot-row-proof-grid"), "live pilot row proof must be styled as a bounded premium panel.");
assert(premiumRepair.includes(".live-database-acceptance-lanes") && premiumRepair.includes(".live-database-acceptance-lane-grid"), "live database acceptance lanes must be styled and bounded.");
assert(premiumRepair.includes(".setup-route-deck") && premiumRepair.includes("repeat(auto-fit, minmax(min(100%, 230px), 1fr))"), "setup route deck must auto-fit without overflow.");
assert(premiumRepair.includes(".corporate-launch-cockpit") && premiumRepair.includes(".corporate-launch-lanes"), "corporate launch cockpit must be styled and bounded.");
assert(premiumRepair.includes(".team-billing-handoff") && premiumRepair.includes(".team-billing-handoff-grid"), "team and billing handoff must be styled and bounded.");
assert(premiumRepair.includes(".corporate-setup-stepper") && premiumRepair.includes(".corporate-setup-stepper-grid"), "corporate setup stepper must be styled and bounded.");
assert(premiumRepair.includes(".corporate-verify-first-use") && premiumRepair.includes(".corporate-verify-first-use-grid"), "Corporate Verify first-use wizard must be styled and bounded.");
assert(premiumRepair.includes(".auth-recovery-command-grid") && premiumRepair.includes(".public-auth-recovery-actions"), "auth recovery command buttons must be included in overflow guards.");
assert(premiumRepair.includes(".hosted-callback-proof") && premiumRepair.includes(".hosted-callback-proof-grid"), "hosted callback proof must be styled and bounded.");
assert(premiumRepair.includes(".hosted-corporate-retest") && premiumRepair.includes(".hosted-corporate-retest-grid"), "hosted corporate retest must be styled and bounded.");
assert(premiumRepair.includes(".last-signed-evidence-link"), "last signed evidence link proof must be bounded in the premium shell.");
assert(premiumRepair.includes(".admin-audit-export-command") && premiumRepair.includes(".admin-audit-export-command-grid"), "admin audit export command must be bounded in the premium shell.");
assert(premiumRepair.includes(".audit-filter-receipt"), "audit filter receipt must be bounded in the premium shell.");
assert(premiumRepair.includes(".pilot-contact-form") && premiumRepair.includes(".consent-controls"), "corporate/admin form controls must be included in overflow guards.");
assert(!premiumRepair.includes("radial-gradient"), "premium shell repair must avoid decorative orb-style backgrounds.");

console.log("TrustGraph premium layout check passed: legacy rail removed, portal home visible, logout visible, route strips, setup route, live proof, and dense forms bounded.");
