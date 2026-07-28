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

const pageUrl = `${targetUrl}?smoke=live-script`;
const { response, text } = await fetchText(pageUrl);

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
assertIncludesAny(bundleText, ["After registration"], "registration outcome section");
assertIncludesAny(bundleText, ["Set new password"], "password recovery update control");
assertIncludesAny(bundleText, ["Recovery redirect"], "password recovery redirect guidance");
assertIncludesAny(bundleText, ["Live Supabase database mode"], "live database mode indicator");
assertIncludesAny(bundleText, ["Guided preview mode"], "preview mode indicator");

console.log(`TrustGraph live smoke passed: ${response.status} ${targetUrl} (${assetUrls.length} assets checked, portal, recovery, and data-mode copy verified)`);
