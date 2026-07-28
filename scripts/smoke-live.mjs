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

console.log(`TrustGraph live smoke passed: ${response.status} ${targetUrl} (${assetUrls.length} assets checked)`);
