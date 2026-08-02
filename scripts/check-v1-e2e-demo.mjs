import { spawn } from "node:child_process";

const steps = [
  ["RLS coverage", "scripts/check-rls.mjs"],
  ["Claims boundaries", "scripts/check-claims.mjs"],
  ["Pilot acceptance path", "scripts/check-pilot-acceptance.mjs"],
  ["V1 pilot route", "scripts/check-v1-pilot-route.mjs"],
  ["V1 demo flow", "scripts/check-v1-demo-flow.mjs"],
  ["Live database repair path", "scripts/check-live-database-repair.mjs"],
  ["Real-data readiness", "scripts/check-real-data-readiness.mjs"],
  ["Responsive coverage", "scripts/check-responsive.mjs"],
  ["Premium layout shell", "scripts/check-premium-layout.mjs"],
  ["Supabase migration workflow", "scripts/check-migrations-workflow.mjs"],
  ["Server env validator", "scripts/check-server-env.mjs", "tools/test-server-env.example"],
  ["VPS workflow guardrails", "scripts/check-vps-workflow.mjs"]
];

function runStep([label, script, ...args]) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const child = spawn(process.execPath, [script, ...args], {
      cwd: new URL("..", import.meta.url),
      stdio: "inherit",
      shell: false
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      if (code === 0) {
        console.log(`✓ ${label} passed in ${seconds}s`);
        resolve();
        return;
      }
      reject(new Error(`${label} failed with exit code ${code}`));
    });
  });
}

for (const step of steps) {
  console.log(`\nTrustGraph V1 E2E demo gate: ${step[0]}`);
  await runStep(step);
}

console.log(`\nTrustGraph V1 E2E demo check passed: ${steps.length} acceptance gates verified in order.`);
