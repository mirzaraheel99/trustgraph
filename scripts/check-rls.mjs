import { readdir, readFile } from "node:fs/promises";

const migrationsDir = new URL("../supabase/migrations/", import.meta.url);
const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
const sql = (
  await Promise.all(files.map((file) => readFile(new URL(file, migrationsDir), "utf8")))
).join("\n").toLowerCase();

const requiredRlsTables = [
  "organizations",
  "profiles",
  "organization_memberships",
  "trust_records",
  "access_grants",
  "access_grant_records",
  "audit_events",
  "verification_cases",
  "evidence_documents",
  "notification_events",
  "reference_requests",
  "missing_record_requests",
  "api_clients",
  "webhook_subscriptions",
  "subscription_plans",
  "organization_subscriptions",
  "organization_invitations",
  "consent_authorizations",
  "corporate_access_reviews",
  "schema_migration_runs",
  "production_gate_decisions",
  "pilot_launch_contacts"
];

const missingTables = requiredRlsTables.filter(
  (table) => !sql.includes(`alter table public.${table} enable row level security`)
);

if (missingTables.length) {
  throw new Error(`Missing RLS enable statements for: ${missingTables.join(", ")}`);
}

console.log(`TrustGraph RLS check passed: ${requiredRlsTables.length} protected tables verified across ${files.length} migrations.`);
