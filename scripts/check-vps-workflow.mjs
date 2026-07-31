import fs from "node:fs";

const workflowPath = ".github/workflows/deploy-vps.yml";
const workflow = fs.readFileSync(workflowPath, "utf8");
const compose = fs.readFileSync("docker-compose.server.yml", "utf8");
const dockerfile = fs.readFileSync("Dockerfile", "utf8");
const caddyfile = fs.readFileSync("Caddyfile", "utf8");
const preflight = fs.readFileSync("tools/preflight-vps.sh", "utf8");
const updateVps = fs.readFileSync("tools/update-vps-from-github.sh", "utf8");
const envValidator = fs.readFileSync("tools/validate-server-env.sh", "utf8");

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
    snippet: "bash tools/preflight-vps.sh",
    label: "remote deploy runs the VPS preflight"
  },
  {
    snippet: 'curl --fail --location --silent --show-error "$PUBLIC_URL"',
    label: "smoke check uses the public URL input"
  }
];

const runtimeSnippets = [
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
    snippet: "grep -q \"$commit_short\" /tmp/trustgraph-vps-release.json",
    label: "manual VPS update verifies release stamp matches current commit"
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
