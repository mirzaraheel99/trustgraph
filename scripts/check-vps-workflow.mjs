import fs from "node:fs";

const workflowPath = ".github/workflows/deploy-vps.yml";
const workflow = fs.readFileSync(workflowPath, "utf8");

const requiredSnippets = [
  {
    snippet: "default: 5.75.224.11",
    label: "SSH target defaults to the TrustGraph VPS IP"
  },
  {
    snippet: "default: https://5-75-224-11.sslip.io",
    label: "public smoke URL defaults to the TrustGraph sslip host"
  },
  {
    snippet: 'test "$REMOTE_PATH" = "/opt/trustgraph"',
    label: "remote path is locked to /opt/trustgraph"
  },
  {
    snippet: "5.75.224.110|5-75-224-110.sslip.io",
    label: "VFIX SSH target is refused"
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
    snippet: "export TRUSTGRAPH_HOST=5-75-224-11.sslip.io",
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

const failures = requiredSnippets
  .filter((rule) => !workflow.includes(rule.snippet))
  .map((rule) => `${workflowPath}: missing ${rule.label}`);

if (failures.length) {
  throw new Error(`TrustGraph VPS workflow check failed:\n- ${failures.join("\n- ")}`);
}

console.log(`TrustGraph VPS workflow check passed: ${requiredSnippets.length} guardrails verified.`);
