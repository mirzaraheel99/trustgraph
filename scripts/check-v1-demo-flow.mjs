import { readdir, readFile } from "node:fs/promises";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(source, expected, label) {
  assert(source.includes(expected), `Expected ${label} to include "${expected}"`);
}

function assertAll(source, phrases, label) {
  for (const phrase of phrases) {
    assertIncludes(source, phrase, label);
  }
}

function assertMigration(migrations, prefix, label) {
  assert(migrations.some((file) => file.startsWith(prefix) && file.endsWith(".sql")), `Expected migration ${prefix} for ${label}`);
}

const [
  appSource,
  packageText,
  workflowText,
  readinessText,
  runbookText,
  evidenceMapText,
  readmeText,
  migrationFiles
] = await Promise.all([
  readFile(new URL("../src/App.tsx", import.meta.url), "utf8"),
  readFile(new URL("../package.json", import.meta.url), "utf8"),
  readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8"),
  readFile(new URL("../V1_READINESS_CHECKLIST.md", import.meta.url), "utf8"),
  readFile(new URL("../PILOT_RUNBOOK.md", import.meta.url), "utf8"),
  readFile(new URL("../docs/current-implementation-evidence-map.md", import.meta.url), "utf8"),
  readFile(new URL("../README.md", import.meta.url), "utf8"),
  readdir(new URL("../supabase/migrations/", import.meta.url))
]);

const packageJson = JSON.parse(packageText);
const migrations = migrationFiles.filter((file) => file.endsWith(".sql")).sort();

const flowChecks = [
  {
    id: "public_entry",
    label: "Public website routes visitors into the right portal",
    required: [
      "Start in the right portal before live database rows are created",
      "Professional user portal",
      "Corporate company portal",
      "Pricing structure packet"
    ]
  },
  {
    id: "auth_registration",
    label: "Professional and corporate registration stays explicit",
    required: [
      "Selected portal command",
      "Create company admin account",
      "Create Professional Passport",
      "Live database handoff",
      "Verification, recovery, and link repair"
    ]
  },
  {
    id: "dashboard_navigation",
    label: "Signed-in users can find account, corporate, public, and logout actions",
    required: [
      "Session command bar",
      "Corporate setup",
      "Public site",
      "Sign out",
      "Dashboard start map"
    ]
  },
  {
    id: "professional_database",
    label: "Professional Passport writes and exports database proof",
    required: [
      "Professional Passport setup",
      "Evidence metadata",
      "Signed evidence links",
      "Export access packet"
    ]
  },
  {
    id: "corporate_database",
    label: "Corporate Verify proves user database visibility through RBAC and grants",
    required: [
      "Corporate user database packet",
      "Corporate directory acceptance",
      "corporate_directory_acceptance",
      "Corporate Verify live access test",
      "Visible user rows"
    ]
  },
  {
    id: "working_database",
    label: "Working database acceptance rejects preview-only evidence",
    required: [
      "Working database command center",
      "Preview data is not accepted for v1 database proof",
      "Export working-data packet",
      "Seed reconciliation",
      "Prepare live pilot workspace"
    ]
  },
  {
    id: "billing_boundary",
    label: "Pricing is present while Stripe remains human-gated",
    required: [
      "Billing architecture decision packet",
      "Stripe checkout",
      "intentionally_disabled_until_human_gate",
      "live_subscription_ledger",
      "Payment launch boundary"
    ]
  },
  {
    id: "admin_launch",
    label: "Admin launch readiness keeps human gates visible",
    required: [
      "V1 completion audit packet",
      "Human decision gates",
      "Security review checklist",
      "Production gate register",
      "Pilot-ready, not unrestricted production traffic"
    ]
  }
];

for (const check of flowChecks) {
  assertAll(appSource, check.required, check.label);
}

assert(packageJson.scripts?.["check:v1-demo-flow"] === "node scripts/check-v1-demo-flow.mjs", "package script check:v1-demo-flow");
assertIncludes(workflowText, "Verify v1 demo flow", "GitHub Pages workflow");
assertIncludes(workflowText, "pnpm check:v1-demo-flow", "GitHub Pages workflow");

assertMigration(migrations, "005_", "professional onboarding RPC");
assertMigration(migrations, "009_", "corporate account and RBAC RPC");
assertMigration(migrations, "019_", "pricing and subscription ledger");
assertMigration(migrations, "023_", "corporate access grant requests");
assertMigration(migrations, "029_", "live pilot workspace seed");
assertMigration(migrations, "034_", "organization RLS recursion repair");
assertMigration(migrations, "041_", "corporate access review attestations");

assertAll(readinessText, [
  "13-Track Product Coverage",
  "Corporate directory acceptance ledger",
  "Verification Loop"
], "V1 readiness checklist");

assertAll(runbookText, [
  "Live Workflow Acceptance",
  "hosted login/database handoff packet",
  "Human Decisions Still Required"
], "pilot runbook");

assertAll(evidenceMapText, [
  "Live Database Proof Artifacts",
  "collapsible auth operator panels",
  "dashboard session command bar",
  "Remaining Human Gates"
], "implementation evidence map");

assertAll(readmeText, [
  "Professional and Corporate portal entry",
  "Corporate registration collects organization name",
  "Export the working-data packet"
], "README");

console.log(`TrustGraph v1 demo flow check passed: ${flowChecks.length} flow groups, ${migrations.length} migrations, CI and evidence artifacts verified.`);
