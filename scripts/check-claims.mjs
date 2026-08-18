import { readdir, readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scanRoots = [
  "src",
  "README.md",
  "PILOT_RUNBOOK.md",
  "V1_READINESS_CHECKLIST.md",
  "UI_COPY_HANDOFF.md"
];
const extensions = new Set([".md", ".mjs", ".ts", ".tsx", ".sql", ".yml", ".yaml"]);

const bannedClaims = [
  {
    pattern: /\bbackground[- ]check compliant\b/i,
    reason: "Background-check compliance must wait for legal review."
  },
  {
    pattern: /\bpayment collection is live\b/i,
    reason: "Billing is a pilot ledger until Stripe is explicitly approved."
  },
  {
    pattern: /\bpayments are live\b/i,
    reason: "Billing is a pilot ledger until Stripe is explicitly approved."
  },
  {
    pattern: /\bproduction[- ]ready payments\b/i,
    reason: "Stripe launch remains a human-gated decision."
  },
  {
    pattern: /\blegal review (complete|approved)\b/i,
    reason: "Legal approval must be recorded through the production gate register."
  },
  {
    pattern: /\bautomated (employment|hiring) decisions? (are )?(live|enabled|approved)\b/i,
    reason: "TrustGraph must stay advisory unless a human decision changes the scope."
  }
];

const bannedOperationalLanguage = [
  {
    pattern: /\bdemo\b/i,
    reason: "Use pilot acceptance, workflow QA, operator review, or live preview wording instead of demo language."
  },
  {
    pattern: /\bsample\b/i,
    reason: "Use pilot, seeded pilot, or QA fixture wording instead of sample language in app source."
  }
];
const operationalLanguageRoots = ["src/", "app/"];

const requiredPhrases = [
  {
    file: "PILOT_RUNBOOK.md",
    phrase: "The current billing flow is a pilot ledger, not payment collection."
  },
  {
    file: "V1_READINESS_CHECKLIST.md",
    phrase: "Do not move from pilot to real production traffic"
  },
  {
    file: "UI_COPY_HANDOFF.md",
    phrase: "Do not imply automated hiring decisions."
  },
  {
    file: "src/App.tsx",
    phrase: "Pilot-ready, not unrestricted production traffic"
  },
  {
    file: "src/App.tsx",
    phrase: "preview_data_accepted_for_v1: false"
  },
  {
    file: "src/App.tsx",
    phrase: "preview_data_accepted: false"
  }
];

async function collectFiles(entry) {
  const absolute = path.join(repoRoot, entry);
  const entryStat = await stat(absolute);

  if (entryStat.isFile()) {
    return extensions.has(path.extname(absolute)) ? [absolute] : [];
  }

  const children = await readdir(absolute, { withFileTypes: true });
  const nested = await Promise.all(
    children
      .filter((child) => !["node_modules", ".next", "out", ".git"].includes(child.name))
      .map((child) => collectFiles(path.join(entry, child.name)))
  );

  return nested.flat();
}

const files = (await Promise.all(scanRoots.map(collectFiles))).flat();
const failures = [];

for (const file of files) {
  const text = await readFile(file, "utf8");
  const relative = path.relative(repoRoot, file).replaceAll(path.sep, "/");
  const claimText = text
    .split(/\r?\n/)
    .filter((line) => !/\b(do not|don't|never|avoid)\b/i.test(line))
    .join("\n");

  for (const claim of bannedClaims) {
    const match = claimText.match(claim.pattern);
    if (match) {
      failures.push(`${relative}: unsafe claim "${match[0]}" found. ${claim.reason}`);
    }
  }

  if (operationalLanguageRoots.some((root) => relative.startsWith(root))) {
    for (const languageRule of bannedOperationalLanguage) {
      const match = claimText.match(languageRule.pattern);
      if (match) {
        failures.push(`${relative}: non-premium operational language "${match[0]}" found. ${languageRule.reason}`);
      }
    }
  }
}

for (const required of requiredPhrases) {
  const absolute = path.join(repoRoot, required.file);
  const text = await readFile(absolute, "utf8");

  if (!text.includes(required.phrase)) {
    failures.push(`${required.file}: missing required guardrail phrase "${required.phrase}"`);
  }
}

if (failures.length) {
  throw new Error(`TrustGraph claims check failed:\n- ${failures.join("\n- ")}`);
}

console.log(`TrustGraph claims check passed: ${files.length} source and readiness files scanned.`);
