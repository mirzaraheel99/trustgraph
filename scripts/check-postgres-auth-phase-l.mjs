import fs from "node:fs";

const checks = [
  {
    file: "docker-compose.server.yml",
    snippets: ["trustgraph-auth-api:", "POSTGRES_HOST: trustgraph-postgres", "NEXT_PUBLIC_AUTH_PROVIDER"]
  },
  {
    file: "Caddyfile",
    snippets: ["handle /api/*", "reverse_proxy trustgraph-auth-api:4181"]
  },
  {
    file: "server/postgres-auth-api.mjs",
    snippets: ["create table if not exists tg_auth_users", "/api/auth/signup", "/api/auth/login", "crypto.scryptSync"]
  },
  {
    file: "src/auth.ts",
    snippets: ["NEXT_PUBLIC_AUTH_PROVIDER", "postgresAuth<AuthSession>(\"login\"", "postgresAuth<AuthSession>(\"signup\""]
  },
  {
    file: ".env.server.example",
    snippets: ["NEXT_PUBLIC_AUTH_PROVIDER=postgres", "TRUSTGRAPH_SESSION_TTL_SECONDS=1209600"]
  }
];

for (const check of checks) {
  const source = fs.readFileSync(check.file, "utf8");
  for (const snippet of check.snippets) {
    if (!source.includes(snippet)) {
      console.error(`Postgres auth Phase L check failed: ${check.file} missing ${snippet}`);
      process.exit(1);
    }
  }
}

const sensitiveSources = ["server/postgres-auth-api.mjs", ".env.server.example", ".env.example"];
for (const file of sensitiveSources) {
  const source = fs.readFileSync(file, "utf8");
  if (/sb_secret_|Bx3723Dt17|SUPABASE_SECRET_KEY/.test(source)) {
    console.error(`Postgres auth Phase L check failed: ${file} must not contain pasted secrets.`);
    process.exit(1);
  }
}

console.log("Postgres auth Phase L check passed.");
