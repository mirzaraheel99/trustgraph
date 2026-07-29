import { readdir, readFile } from "node:fs/promises";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(source, expected, label) {
  assert(source.includes(expected), `Expected ${label} to include "${expected}"`);
}

function assertMigration(migrations, prefix, label) {
  assert(migrations.some((file) => file.startsWith(prefix) && file.endsWith(".sql")), `Expected migration ${prefix} for ${label}`);
}

const [appSource, packageText, readiness, runbook, evidenceMap, migrationFiles] = await Promise.all([
  readFile(new URL("../src/App.tsx", import.meta.url), "utf8"),
  readFile(new URL("../package.json", import.meta.url), "utf8"),
  readFile(new URL("../V1_READINESS_CHECKLIST.md", import.meta.url), "utf8"),
  readFile(new URL("../PILOT_RUNBOOK.md", import.meta.url), "utf8"),
  readFile(new URL("../docs/current-implementation-evidence-map.md", import.meta.url), "utf8"),
  readdir(new URL("../supabase/migrations/", import.meta.url))
]);

const packageJson = JSON.parse(packageText);
const migrations = migrationFiles.filter((file) => file.endsWith(".sql")).sort();

const acceptanceChecks = [
  {
    id: "public_site_and_pricing",
    label: "Public website, portal entry, registration, and pricing",
    source: appSource,
    required: ["Pricing structure packet", "Professional Passport access", "Corporate portal access", "$149"]
  },
  {
    id: "professional_passport",
    label: "Professional Passport records and evidence",
    source: appSource,
    required: ["Professional Passport setup", "Evidence metadata", "Export access packet", "Signed evidence links"]
  },
  {
    id: "corporate_database",
    label: "Corporate user database and shared records",
    source: appSource,
    required: ["Corporate user database packet", "per-professional shared records", "Live database view", "Export user packet"]
  },
  {
    id: "auth_recovery",
    label: "Hosted auth, verification, and recovery",
    source: appSource,
    required: ["Auth redirect readiness packet", "Account recovery readiness", "Fix localhost email link", "Reset password"]
  },
  {
    id: "admin_security_exports",
    label: "Admin audit, security, and release exports",
    source: appSource,
    required: ["Admin export readiness", "Full audit and verification history packet", "Export releases", "Security review checklist"]
  },
  {
    id: "pilot_readiness",
    label: "Pilot readiness and human gates",
    source: appSource,
    required: ["V1 completion audit packet", "Human decision gates", "Stop conditions", "Pilot-ready, not unrestricted production traffic"]
  }
];

for (const check of acceptanceChecks) {
  for (const phrase of check.required) {
    assertIncludes(check.source, phrase, check.label);
  }
}

assert(packageJson.scripts?.["check:pilot-acceptance"] === "node scripts/check-pilot-acceptance.mjs", "package script check:pilot-acceptance");
assert(migrations.length >= 33, `Expected at least 33 migrations, found ${migrations.length}`);
assertMigration(migrations, "001_", "core database foundation");
assertMigration(migrations, "012_", "evidence document metadata");
assertMigration(migrations, "017_", "private evidence storage");
assertMigration(migrations, "019_", "pricing and subscription ledger");
assertMigration(migrations, "029_", "pilot workspace seed");
assertMigration(migrations, "030_", "production gate decisions");
assertMigration(migrations, "033_", "pilot launch contacts");

assertIncludes(readiness, "13-Track Product Coverage", "v1 readiness checklist");
assertIncludes(readiness, "Verification Loop", "v1 readiness checklist");
assertIncludes(readiness, "Do not move from pilot to real production traffic", "v1 readiness checklist");
assertIncludes(runbook, "Live Workflow Acceptance", "pilot runbook");
assertIncludes(runbook, "Human Decisions Still Required", "pilot runbook");
assertIncludes(evidenceMap, "Live Database Proof Artifacts", "implementation evidence map");
assertIncludes(evidenceMap, "Remaining Human Gates", "implementation evidence map");

console.log(
  `TrustGraph pilot acceptance check passed: ${acceptanceChecks.length} workflow groups, ${migrations.length} migrations, readiness artifacts verified.`
);
