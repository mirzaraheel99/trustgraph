const pagesUrl = process.env.TRUSTGRAPH_PAGES_RELEASE_URL || "https://mirzaraheel99.github.io/trustgraph/trustgraph-release.json";
const vpsUrl =
  process.env.TRUSTGRAPH_VPS_RELEASE_URL || "https://trustgraph.5-75-224-110.sslip.io/trustgraph-release.json";
const expectedMarker = process.env.EXPECTED_BUNDLE_MARKER || "premium_workspace_responsive_guard";

async function readStamp(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "trustgraph-vps-status/1.0"
    }
  });
  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    return { ok: false, url, status: response.status, reason: `HTTP ${response.status}` };
  }

  if (text.trimStart().startsWith("<!DOCTYPE html") || contentType.includes("text/html")) {
    return { ok: false, url, status: response.status, reason: "served HTML app shell instead of release JSON" };
  }

  try {
    return { ok: true, url, status: response.status, stamp: JSON.parse(text) };
  } catch (error) {
    return { ok: false, url, status: response.status, reason: `invalid JSON: ${error.message}` };
  }
}

function short(stamp) {
  return stamp?.commit_short || stamp?.commit?.slice?.(0, 7) || "missing";
}

const [pages, vps] = await Promise.all([readStamp(pagesUrl), readStamp(vpsUrl)]);
const pagesCommit = pages.ok ? short(pages.stamp) : "missing";
const vpsCommit = vps.ok ? short(vps.stamp) : "missing";
const markerMatches = vps.ok && vps.stamp.bundle_marker === expectedMarker;
const commitMatches = pages.ok && vps.ok && pagesCommit === vpsCommit;
const vpsCurrent = pages.ok && vps.ok && commitMatches && markerMatches;

const report = {
  app: "TrustGraph",
  status: vpsCurrent ? "vps_current" : "vps_sync_required",
  github_pages: pages.ok
    ? { ok: true, commit_short: pagesCommit, marker: pages.stamp.bundle_marker, url: pages.url }
    : { ok: false, reason: pages.reason, url: pages.url },
  vps: vps.ok
    ? { ok: true, commit_short: vpsCommit, marker: vps.stamp.bundle_marker, url: vps.url }
    : { ok: false, reason: vps.reason, url: vps.url },
  protected_vfix_host: "https://5-75-224-110.sslip.io/CRM-client-demo/login",
  manual_update_command: "cd /opt/trustgraph && git pull --ff-only origin main && bash tools/update-vps-from-github.sh",
  html_shell_repair:
    !vps.ok && vps.reason === "served HTML app shell instead of release JSON"
      ? {
          diagnosis: "the TrustGraph host is alive but /trustgraph-release.json is being routed to the app shell, so the VPS cannot prove the saved GitHub commit",
          nginx_config_source: "tools/trustgraph-nginx.conf",
          nginx_config_target: "/opt/fixflow-nginx/conf.d/trustgraph.conf",
          nginx_test_command: "docker exec fixflow-nginx nginx -t",
          nginx_reload_command: "docker exec fixflow-nginx nginx -s reload",
          release_check_command: "curl -i https://trustgraph.5-75-224-110.sslip.io/trustgraph-release.json",
          boundary: "install only the trustgraph.5-75-224-110.sslip.io server block and keep https://5-75-224-110.sslip.io/CRM-client-demo/login unchanged"
        }
      : null,
  accepted_when: "github_pages_and_vps_release_json_match_commit_short_and_premium_workspace_responsive_guard_marker"
};

console.log(JSON.stringify(report, null, 2));

if (!vpsCurrent) {
  process.exitCode = 2;
}
