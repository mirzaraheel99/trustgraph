import fs from "node:fs";

const workflowPath = ".github/workflows/deploy-vps.yml";
const workflow = fs.readFileSync(workflowPath, "utf8");
const pagesWorkflowPath = ".github/workflows/deploy-pages.yml";
const pagesWorkflow = fs.readFileSync(pagesWorkflowPath, "utf8");
const app = fs.readFileSync("src/App.tsx", "utf8");
const compose = fs.readFileSync("docker-compose.server.yml", "utf8");
const dockerfile = fs.readFileSync("Dockerfile", "utf8");
const caddyfile = fs.readFileSync("Caddyfile", "utf8");
const releaseStamp = fs.readFileSync("public/trustgraph-release.json", "utf8");
const preflight = fs.readFileSync("tools/preflight-vps.sh", "utf8");
const updateVps = fs.readFileSync("tools/update-vps-from-github.sh", "utf8");
const envValidator = fs.readFileSync("tools/validate-server-env.sh", "utf8");
const freshnessCheck = fs.readFileSync("scripts/check-vps-freshness.mjs", "utf8");

const requiredSnippets = [
  {
    snippet: "default: 5.75.224.110",
    label: "SSH target defaults to the TrustGraph VPS IP"
  },
  {
    snippet: "default: https://trustgraph.5-75-224-110.sslip.io",
    label: "public smoke URL defaults to the TrustGraph sslip host"
  },
  {
    snippet: 'test "$REMOTE_PATH" = "/opt/trustgraph"',
    label: "remote path is locked to /opt/trustgraph"
  },
  {
    snippet: "repository secret TRUSTGRAPH_VPS_USER is required.",
    label: "missing VPS user secret produces an explicit error"
  },
  {
    snippet: "repository secret TRUSTGRAPH_VPS_SSH_KEY is required.",
    label: "missing VPS SSH key secret produces an explicit error"
  },
  {
    snippet: "Use the VPS IP for SSH, not the protected VFIX public hostname.",
    label: "VFIX public hostname is refused for SSH target"
  },
  {
    snippet: "https://5-75-224-110.sslip.io*|*CRM-client-demo*",
    label: "VFIX public URL and CRM route are refused"
  },
  {
    snippet: "Public URL must be the approved TrustGraph sslip.io host.",
    label: "unapproved public URLs are refused"
  },
  {
    snippet: "export TRUSTGRAPH_HOST=trustgraph.5-75-224-110.sslip.io",
    label: "remote preflight uses the TrustGraph host"
  },
  {
    snippet: "bash tools/update-vps-from-github.sh",
    label: "remote deploy runs the guarded VPS update script"
  },
  {
    snippet: 'export EXPECTED_BUNDLE_MARKER="premium_workspace_responsive_guard"',
    label: "remote deploy requires the current V1 bundle marker"
  },
  {
    snippet: "Checkout freshness checker",
    label: "workflow checks out the freshness checker before the public smoke"
  },
  {
    snippet: "Setup Node for freshness checker",
    label: "workflow prepares Node before running the freshness checker"
  },
  {
    snippet: "TRUSTGRAPH_VPS_URL: ${{ inputs.public_url }}",
    label: "freshness checker uses the public URL input"
  },
  {
    snippet: "node scripts/check-vps-freshness.mjs",
    label: "smoke check verifies assets and release stamp through the shared freshness checker"
  }
];

const runtimeSnippets = [
  {
    source: pagesWorkflow,
    path: pagesWorkflowPath,
    snippet: "Verify release stamp asset",
    label: "GitHub Pages build verifies the exported release stamp asset"
  },
  {
    source: pagesWorkflow,
    path: pagesWorkflowPath,
    snippet: "trustgraph_release_stamp_static_asset_then_vps_updater_overwrites_with_current_git_commit_and_marker",
    label: "GitHub Pages build verifies the server-save release stamp contract"
  },
  {
    source: pagesWorkflow,
    path: pagesWorkflowPath,
    snippet: "save-vps:",
    label: "GitHub Pages deploy includes an automatic VPS save job"
  },
  {
    source: pagesWorkflow,
    path: pagesWorkflowPath,
    snippet: "Automatic TrustGraph VPS save requires repository secrets TRUSTGRAPH_VPS_USER and TRUSTGRAPH_VPS_SSH_KEY",
    label: "automatic VPS save fails loudly when SSH secrets are missing"
  },
  {
    source: pagesWorkflow,
    path: pagesWorkflowPath,
    snippet: "exit 1",
    label: "automatic VPS save blocks a false-green deploy when SSH secrets are missing"
  },
  {
    source: pagesWorkflow,
    path: pagesWorkflowPath,
    snippet: "Save GitHub build to VPS",
    label: "automatic VPS save runs the guarded server updater after Pages smoke"
  },
  {
    source: pagesWorkflow,
    path: pagesWorkflowPath,
    snippet: "Verify VPS saved build",
    label: "automatic VPS save verifies the release stamp and static assets"
  },
  {
    source: pagesWorkflow,
    path: pagesWorkflowPath,
    snippet: "TRUSTGRAPH_VPS_URL: https://trustgraph.5-75-224-110.sslip.io/",
    label: "automatic VPS freshness check targets only the TrustGraph host"
  },
  {
    source: app,
    path: "src/App.tsx",
    snippet: "vps_deploy_secrets_checklist",
    label: "app exposes the VPS deploy secrets checklist"
  },
  {
    source: app,
    path: "src/App.tsx",
    snippet: "public_manual_vps_sync_launcher",
    label: "public login flow exposes the manual VPS sync launcher"
  },
  {
    source: app,
    path: "src/App.tsx",
    snippet:
      "public_manual_vps_sync_launcher_requires_copyable_update_command_release_stamp_json_commit_match_pages_smoke_and_vfix_route_unchanged_before_server_login_testing",
    label: "manual VPS sync launcher requires release stamp JSON and VFIX protection"
  },
  {
    source: app,
    path: "src/App.tsx",
    snippet: "TRUSTGRAPH_VPS_USER",
    label: "app names the missing VPS user secret"
  },
  {
    source: compose,
    path: "docker-compose.server.yml",
    snippet: "trustgraph-web:",
    label: "web service is defined"
  },
  {
    source: compose,
    path: "docker-compose.server.yml",
    snippet: "trustgraph-postgres:",
    label: "server Postgres service is defined"
  },
  {
    source: compose,
    path: "docker-compose.server.yml",
    snippet: "${TRUSTGRAPH_HTTP_BIND:-0.0.0.0}:${TRUSTGRAPH_HTTP_PORT:-80}:80",
    label: "HTTP port can be configured away from shared public edge"
  },
  {
    source: compose,
    path: "docker-compose.server.yml",
    snippet: "${TRUSTGRAPH_HTTPS_BIND:-0.0.0.0}:${TRUSTGRAPH_HTTPS_PORT:-443}:443",
    label: "HTTPS port can be configured away from shared public edge"
  },
  {
    source: dockerfile,
    path: "Dockerfile",
    snippet: "FROM caddy:2-alpine",
    label: "static build is served by Caddy"
  },
  {
    source: caddyfile,
    path: "Caddyfile",
    snippet: ":80 {",
    label: "Caddy serves HTTP-only behind the shared nginx edge"
  },
  {
    source: caddyfile,
    path: "Caddyfile",
    snippet: "handle /trustgraph-release.json",
    label: "Caddy serves the release stamp before the app shell fallback"
  },
  {
    source: caddyfile,
    path: "Caddyfile",
    snippet: 'header Content-Type "application/json; charset=utf-8"',
    label: "Caddy returns a JSON content type for the release stamp"
  },
  {
    source: releaseStamp,
    path: "public/trustgraph-release.json",
    snippet: "trustgraph_release_stamp_static_asset_then_vps_updater_overwrites_with_current_git_commit_and_marker",
    label: "public release stamp encodes the server-save contract"
  },
  {
    source: freshnessCheck,
    path: "scripts/check-vps-freshness.mjs",
    snippet: "VPS release stamp served the app shell instead of trustgraph-release.json",
    label: "freshness checker rejects HTML fallback release stamps"
  },
  {
    source: preflight,
    path: "tools/preflight-vps.sh",
    snippet: "PROTECTED_VFIX_HOST=\"5-75-224-110.sslip.io\"",
    label: "preflight knows the protected VFIX host"
  },
  {
    source: updateVps,
    path: "tools/update-vps-from-github.sh",
    snippet: "git pull --ff-only origin main",
    label: "manual VPS update pulls the GitHub main branch"
  },
  {
    source: updateVps,
    path: "tools/update-vps-from-github.sh",
    snippet: "bash tools/preflight-vps.sh",
    label: "manual VPS update runs preflight before build"
  },
  {
    source: updateVps,
    path: "tools/update-vps-from-github.sh",
    snippet: "cat > /srv/trustgraph/trustgraph-release.json",
    label: "manual VPS update writes a hosted release stamp"
  },
  {
    source: updateVps,
    path: "tools/update-vps-from-github.sh",
    snippet: "\"commit_short\": \"$commit_short\"",
    label: "hosted release stamp includes the deployed commit"
  },
  {
    source: updateVps,
    path: "tools/update-vps-from-github.sh",
    snippet: "\"bundle_marker\": \"$EXPECTED_BUNDLE_MARKER\"",
    label: "hosted release stamp includes the required bundle marker"
  },
  {
    source: updateVps,
    path: "tools/update-vps-from-github.sh",
    snippet: "grep -q \"$commit_short\" /tmp/trustgraph-vps-release.json",
    label: "manual VPS update verifies release stamp matches current commit"
  },
  {
    source: updateVps,
    path: "tools/update-vps-from-github.sh",
    snippet: "EXPECTED_BUNDLE_MARKER",
    label: "manual VPS update has a configurable latest bundle marker"
  },
  {
    source: updateVps,
    path: "tools/update-vps-from-github.sh",
    snippet: "fetch_public_bundle",
    label: "manual VPS update fetches the page and static assets before checking freshness"
  },
  {
    source: updateVps,
    path: "tools/update-vps-from-github.sh",
    snippet: "public smoke assets did not contain latest bundle marker",
    label: "manual VPS update refuses stale public bundles using asset-aware smoke"
  },
  {
    source: updateVps,
    path: "tools/update-vps-from-github.sh",
    snippet: "5-75-224-110.sslip.io|5.75.224.110|*/CRM-client-demo*",
    label: "manual VPS update refuses VFIX host and CRM route"
  },
  {
    source: envValidator,
    path: "tools/validate-server-env.sh",
    snippet: "TRUSTGRAPH_HOST must be trustgraph.5-75-224-110.sslip.io",
    label: "server env validator locks the TrustGraph host"
  }
];

const failures = requiredSnippets
  .filter((rule) => !workflow.includes(rule.snippet))
  .map((rule) => `${workflowPath}: missing ${rule.label}`);

const runtimeFailures = runtimeSnippets
  .filter((rule) => !rule.source.includes(rule.snippet))
  .map((rule) => `${rule.path}: missing ${rule.label}`);

if (failures.length || runtimeFailures.length) {
  throw new Error(`TrustGraph VPS workflow check failed:\n- ${[...failures, ...runtimeFailures].join("\n- ")}`);
}

console.log(`TrustGraph VPS workflow check passed: ${requiredSnippets.length + runtimeSnippets.length} guardrails verified.`);
