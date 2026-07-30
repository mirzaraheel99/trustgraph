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
assert(authenticatedRender.includes("Sign out"), "signed-in dashboard must expose a visible sign-out action.");
assert(authenticatedRender.includes('className="workspace-route-strip"'), "workspace route strip must remain available after sidebar removal.");
assert(authenticatedRender.includes('className="workspace-flow-strip"'), "daily portal path strip must remain available after sidebar removal.");
assert(premiumRepair.includes(".sidebar") && premiumRepair.includes("display: none !important"), "final CSS layer must still suppress any legacy sidebar rail.");
assert(premiumRepair.includes("width: min(100%, 1440px)") && premiumRepair.includes("overflow: clip"), "workspace shell must be bounded and clipped.");
assert(premiumRepair.includes("display: flex !important") && premiumRepair.includes("flex-wrap: wrap"), "workspace route strips must wrap instead of overflowing.");
assert(premiumRepair.includes("repeat(auto-fit, minmax(min(100%, 180px), 1fr))"), "dense admin forms must auto-fit narrow screens.");
assert(!premiumRepair.includes("radial-gradient"), "premium shell repair must avoid decorative orb-style backgrounds.");

console.log("TrustGraph premium layout check passed: legacy rail removed, logout visible, route strips and dense forms bounded.");
