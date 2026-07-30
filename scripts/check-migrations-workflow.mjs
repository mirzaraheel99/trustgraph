import fs from "node:fs";

const workflowPath = ".github/workflows/supabase-migrations.yml";
const deployWorkflowPath = ".github/workflows/deploy-pages.yml";
const workflow = fs.readFileSync(workflowPath, "utf8");
const deployWorkflow = fs.readFileSync(deployWorkflowPath, "utf8");

const requiredSnippets = [
  {
    source: workflow,
    path: workflowPath,
    snippet: "push:",
    label: "push trigger is enabled"
  },
  {
    source: workflow,
    path: workflowPath,
    snippet: 'branches:\n      - main',
    label: "push trigger is scoped to main"
  },
  {
    source: workflow,
    path: workflowPath,
    snippet: '"supabase/migrations/*.sql"',
    label: "push trigger is scoped to SQL migrations"
  },
  {
    source: workflow,
    path: workflowPath,
    snippet: "workflow_dispatch:",
    label: "manual migration dispatch remains available"
  },
  {
    source: workflow,
    path: workflowPath,
    snippet: "git diff --name-only",
    label: "push workflow derives changed migration files"
  },
  {
    source: workflow,
    path: workflowPath,
    snippet: 'test -s /tmp/trustgraph-migrations.txt',
    label: "workflow refuses empty migration batches"
  },
  {
    source: workflow,
    path: workflowPath,
    snippet: 'psql "$DIRECT_URL" --set ON_ERROR_STOP=1',
    label: "workflow applies migrations with stop-on-error"
  },
  {
    source: deployWorkflow,
    path: deployWorkflowPath,
    snippet: "pnpm check:migrations-workflow",
    label: "Pages CI verifies migration workflow guardrails"
  }
];

const failures = requiredSnippets
  .filter((rule) => !rule.source.includes(rule.snippet))
  .map((rule) => `${rule.path}: missing ${rule.label}`);

if (failures.length) {
  throw new Error(`TrustGraph migration workflow check failed:\n- ${failures.join("\n- ")}`);
}

console.log(`TrustGraph migration workflow check passed: ${requiredSnippets.length} guardrails verified.`);
