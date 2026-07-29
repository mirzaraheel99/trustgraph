import fs from "node:fs";

const envFile = process.argv[2] || "tools/test-server-env.example";

function fail(message) {
  console.error(`TrustGraph server env validation failed: ${message}`);
  process.exit(1);
}

function warn(message) {
  console.warn(`TrustGraph server env validation warning: ${message}`);
}

if (!fs.existsSync(envFile)) {
  fail(`missing env file: ${envFile}`);
}

const entries = new Map();
for (const rawLine of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith("#")) continue;
  const equalsIndex = line.indexOf("=");
  if (equalsIndex < 0) continue;
  entries.set(line.slice(0, equalsIndex), line.slice(equalsIndex + 1));
}

const trustgraphHost = entries.get("TRUSTGRAPH_HOST") || "trustgraph.5-75-224-110.sslip.io";
const postgresPassword = entries.get("POSTGRES_PASSWORD") || "";
const supabaseUrl = entries.get("NEXT_PUBLIC_SUPABASE_URL") || "";
const supabaseKey = entries.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") || "";

if (trustgraphHost === "5-75-224-110.sslip.io" || trustgraphHost === "5.75.224.110" || trustgraphHost.includes("/CRM-client-demo")) {
  fail(`TRUSTGRAPH_HOST points at protected VFIX target: ${trustgraphHost}`);
}

if (trustgraphHost !== "trustgraph.5-75-224-110.sslip.io") {
  fail(`TRUSTGRAPH_HOST must be trustgraph.5-75-224-110.sslip.io for this VPS launch, got ${trustgraphHost}`);
}

if (!postgresPassword) fail("POSTGRES_PASSWORD is required");
if (postgresPassword === "replace-with-a-long-random-password") fail("POSTGRES_PASSWORD still uses the example placeholder");
if (postgresPassword.length < 20) fail("POSTGRES_PASSWORD must be at least 20 characters");

if (!supabaseUrl || !supabaseKey) {
  warn("Supabase public env is incomplete; static app will use preview/local adapter mode");
} else {
  if (!/^https:\/\/.+\.supabase\.co$/.test(supabaseUrl)) {
    fail("NEXT_PUBLIC_SUPABASE_URL must be a Supabase HTTPS project URL");
  }
  if (!supabaseKey.startsWith("sb_publishable_") && !supabaseKey.startsWith("eyJ")) {
    fail("NEXT_PUBLIC_SUPABASE_ANON_KEY must look like a Supabase publishable or anon key");
  }
}

console.log("TrustGraph server env validation passed");
