import { execFileSync } from "node:child_process";

const vpsUrl = process.env.TRUSTGRAPH_VPS_URL || "https://trustgraph.5-75-224-110.sslip.io/";
const pagesUrl = process.env.TRUSTGRAPH_PAGES_URL || "https://mirzaraheel99.github.io/trustgraph/";
const expectedMarker = process.env.EXPECTED_BUNDLE_MARKER || "live_data_loading_command";

function fail(message) {
  console.error(`TrustGraph VPS freshness check failed: ${message}`);
  process.exit(1);
}

function shortHead() {
  return execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "trustgraph-vps-freshness/1.0"
    }
  });
  const text = await response.text();
  return { response, text };
}

async function fetchTextWithRetry(url, attempts = 4) {
  let latest;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    latest = await fetchText(url);
    if (latest.response.ok || attempt === attempts) {
      return latest;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 750 * attempt);
    });
  }

  return latest;
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

async function hostedTextWithAssets(url, label) {
  const page = await fetchTextWithRetry(url);
  if (!page.response.ok) fail(`${label} returned ${page.response.status} for ${url}`);

  const assetUrls = uniqueAssetUrls(page.text, url);
  const assetResponses = await Promise.all(assetUrls.map((assetUrl) => fetchTextWithRetry(assetUrl)));
  const failedAsset = assetResponses.find((asset) => !asset.response.ok);

  if (failedAsset) {
    fail(`${label} asset returned ${failedAsset.response.status}`);
  }

  return [page.text, ...assetResponses.map((asset) => asset.text)].join("\n");
}

const expectedCommit = shortHead();
const [pagesText, vpsText, release] = await Promise.all([
  hostedTextWithAssets(pagesUrl, "GitHub Pages"),
  hostedTextWithAssets(vpsUrl, "VPS"),
  fetchTextWithRetry(new URL("trustgraph-release.json", vpsUrl).toString())
]);

if (!pagesText.includes(expectedMarker)) fail(`GitHub Pages does not contain current marker ${expectedMarker}`);
if (!vpsText.includes(expectedMarker)) fail(`VPS 200 OK is stale; missing current marker ${expectedMarker}`);

if (!release.response.ok) fail(`VPS release stamp returned ${release.response.status}`);
const releaseContentType = release.response.headers.get("content-type") || "";
if (release.text.trimStart().startsWith("<!DOCTYPE html") || releaseContentType.includes("text/html")) {
  fail("VPS release stamp served the app shell instead of trustgraph-release.json");
}

let releaseJson;
try {
  releaseJson = JSON.parse(release.text);
} catch (error) {
  fail(`VPS release stamp is not JSON: ${error.message}`);
}

if (releaseJson.source !== "https://github.com/mirzaraheel99/trustgraph") {
  fail(`VPS release stamp source is not the TrustGraph GitHub repo: ${releaseJson.source || "missing"}`);
}

if (releaseJson.commit_short !== expectedCommit) {
  fail(`VPS release stamp commit ${releaseJson.commit_short || "missing"} does not match local HEAD ${expectedCommit}`);
}

if (releaseJson.bundle_marker !== expectedMarker) {
  fail(`VPS release stamp marker ${releaseJson.bundle_marker || "missing"} does not match required marker ${expectedMarker}`);
}

console.log(
  `TrustGraph VPS freshness check passed: ${vpsUrl} serves ${expectedMarker} at commit ${expectedCommit}.`
);
