import { readdir, readFile } from "node:fs/promises";

const targetUrl = process.env.TRUSTGRAPH_SMOKE_URL || "https://mirzaraheel99.github.io/trustgraph/";

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "trustgraph-smoke/1.0"
    }
  });

  const text = await response.text();
  return { response, text };
}

function uniqueAssetUrls(html, baseUrl) {
  const urls = new Set();
  const assetPattern = /(?:src|href)="([^"]*_next\/static\/[^"]+)"/g;
  let match = assetPattern.exec(html);

  while (match) {
    urls.add(new URL(match[1], baseUrl).toString());
    match = assetPattern.exec(html);
  }

  return [...urls];
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludesAny(source, expectedValues, label) {
  const found = expectedValues.some((value) => source.includes(value));
  assert(found, `Expected hosted build to include ${label}: ${expectedValues.join(" or ")}`);
}

async function assertRepoReadinessArtifacts() {
  const [migrationFiles, readiness, runbook] = await Promise.all([
    readdir(new URL("../supabase/migrations/", import.meta.url)),
    readFile(new URL("../V1_READINESS_CHECKLIST.md", import.meta.url), "utf8"),
    readFile(new URL("../PILOT_RUNBOOK.md", import.meta.url), "utf8")
  ]);
  const sqlMigrations = migrationFiles.filter((file) => file.endsWith(".sql")).sort();

  assert(sqlMigrations.length >= 30, `Expected at least 30 Supabase migrations, found ${sqlMigrations.length}`);
  assert(sqlMigrations[0]?.startsWith("001_"), "Expected migration sequence to start at 001");
  assert(sqlMigrations.at(-1)?.startsWith("030_"), "Expected migration sequence to include 030 production gate decisions");
  assert(readiness.includes("13-Track Product Coverage"), "Expected v1 readiness checklist to include 13-track coverage");
  assert(readiness.includes("Stop Conditions"), "Expected v1 readiness checklist to include production stop conditions");
  assert(runbook.includes("Live Workflow Acceptance"), "Expected pilot runbook to include live workflow acceptance");
  assert(runbook.includes("Human Decisions Still Required"), "Expected pilot runbook to include human decision gates");
}

const pageUrl = `${targetUrl}?smoke=live-script`;
const { response, text } = await fetchText(pageUrl);

await assertRepoReadinessArtifacts();

assert(response.ok, `Expected 2xx response from ${targetUrl}, received ${response.status}`);
assert(text.includes("<!DOCTYPE html>"), "Expected an HTML document");
assert(text.includes("TrustGraph") || text.includes("_next/static"), "Expected TrustGraph app shell or bundled assets");

const assetUrls = uniqueAssetUrls(text, pageUrl).slice(0, 8);
assert(assetUrls.length > 0, "Expected static asset references in hosted HTML");

await Promise.all(
  assetUrls.map(async (assetUrl) => {
    const { response: assetResponse } = await fetchText(assetUrl);
    assert(assetResponse.ok, `Expected asset ${assetUrl} to return 2xx, received ${assetResponse.status}`);
  })
);

const bundleText = (
  await Promise.all(
    assetUrls
      .filter((assetUrl) => assetUrl.endsWith(".js"))
      .slice(0, 6)
      .map(async (assetUrl) => {
        const { text: assetText } = await fetchText(assetUrl);
        return assetText;
      })
  )
).join("\n");

assertIncludesAny(bundleText, ["Professional Passport"], "Professional portal copy");
assertIncludesAny(bundleText, ["Corporate Verify"], "Corporate portal copy");
assertIncludesAny(bundleText, ["Pilot monthly"], "Corporate pricing cadence");
assertIncludesAny(bundleText, ["$149"], "Corporate Verify pilot price");
assertIncludesAny(bundleText, ["Corporate portal access"], "Corporate portal registration/login entry");
assertIncludesAny(bundleText, ["Professional Passport access"], "Professional portal registration/login entry");
assertIncludesAny(bundleText, ["Professional user portal"], "Professional database portal route");
assertIncludesAny(bundleText, ["Corporate company portal"], "Corporate database portal route");
assertIncludesAny(bundleText, ["Corporate Verify review"], "premium command center hero");
assertIncludesAny(bundleText, ["Organization name"], "Corporate registration organization field");
assertIncludesAny(bundleText, ["Every portal connects to the live database foundation"], "live database registration outcome copy");
assertIncludesAny(bundleText, ["After registration"], "registration outcome section");
assertIncludesAny(bundleText, ["Set new password"], "password recovery update control");
assertIncludesAny(bundleText, ["Recovery redirect"], "password recovery redirect guidance");
assertIncludesAny(bundleText, ["Copy URL"], "auth redirect copy control");
assertIncludesAny(bundleText, ["2 emails per hour"], "Supabase built-in email rate limit guidance");
assertIncludesAny(bundleText, ["not localhost"], "hosted auth redirect localhost warning");
assertIncludesAny(bundleText, ["Signed evidence links"], "private evidence signed URL label");
assertIncludesAny(bundleText, ["Live Supabase database mode"], "live database mode indicator");
assertIncludesAny(bundleText, ["Supabase rows written"], "live pilot seed database evidence");
assertIncludesAny(bundleText, ["Guided evaluation mode"], "evaluation mode indicator");
assertIncludesAny(bundleText, ["All actors"], "audit actor filter");
assertIncludesAny(bundleText, ["Last 7 days"], "audit timeframe filter");
assertIncludesAny(bundleText, ["Workflow notification rows"], "notification database source label");
assertIncludesAny(bundleText, ["Human approval required before production traffic"], "production human approval boundary");
assertIncludesAny(bundleText, ["human_decision_gate"], "security runbook human decision export rows");
assertIncludesAny(bundleText, ["13-track v1 alignment"], "v1 plan alignment register");
assertIncludesAny(bundleText, ["Human decision gates"], "production decision gate register");
assertIncludesAny(bundleText, ["Production gate decisions"], "production gate database source label");
assertIncludesAny(bundleText, ["Export production gates"], "production gate export control");
assertIncludesAny(bundleText, ["Record gate decision"], "production gate decision intake control");
assertIncludesAny(bundleText, ["Approved for production"], "production gate approved status option");
assertIncludesAny(bundleText, ["external sign-off required"], "external security gate status");
assertIncludesAny(bundleText, ["Professional Passport setup"], "13-step pilot acceptance script");
assertIncludesAny(bundleText, ["Create pilot request"], "live pilot Access Grant request control");
assertIncludesAny(bundleText, ["Add Verify reviewer role"], "Corporate Verify reviewer role control");
assertIncludesAny(bundleText, ["Live database view"], "Corporate user database source label");
assertIncludesAny(bundleText, ["Membership database"], "Corporate team member source label");
assertIncludesAny(bundleText, ["Requested Passport records"], "Professional missing-record request inbox");
assertIncludesAny(bundleText, ["Migrations through 030"], "current database migration coverage copy");
assertIncludesAny(bundleText, ["Preview context only"], "signed-out preview context label");
assertIncludesAny(bundleText, ["Evaluation role"], "signed-out evaluation role label");
assertIncludesAny(bundleText, ["Preview account context"], "signed-out account context label");
assertIncludesAny(bundleText, ["Export ledger"], "billing ledger export control");
assertIncludesAny(bundleText, ["Export gates"], "billing decision gate export control");
assertIncludesAny(bundleText, ["notes captured"], "pilot acceptance note capture");
assertIncludesAny(bundleText, ["Export runbook"], "pilot acceptance markdown runbook export control");

console.log(`TrustGraph live smoke passed: ${response.status} ${targetUrl} (${assetUrls.length} assets checked, repo artifacts, portal, recovery, and data-mode copy verified)`);
