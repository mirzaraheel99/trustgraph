import crypto from "node:crypto";
import http from "node:http";
import { Pool } from "pg";

const port = Number(process.env.TRUSTGRAPH_AUTH_API_PORT || "4181");
const sessionTtlSeconds = Number(process.env.TRUSTGRAPH_SESSION_TTL_SECONDS || String(60 * 60 * 24 * 14));
const databaseUrl =
  process.env.DATABASE_URL ||
  `postgresql://${encodeURIComponent(process.env.POSTGRES_USER || "trustgraph")}:${encodeURIComponent(
    process.env.POSTGRES_PASSWORD || ""
  )}@${process.env.POSTGRES_HOST || "trustgraph-postgres"}:${process.env.POSTGRES_PORT || "5432"}/${encodeURIComponent(
    process.env.POSTGRES_DB || "trustgraph"
  )}`;

const pool = new Pool({ connectionString: databaseUrl });

function json(response, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers
  });
  response.end(body);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        request.destroy(new Error("Request body too large"));
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON request body"));
      }
    });
    request.on("error", reject);
  });
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function validatePassword(password) {
  if (String(password || "").length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [scheme, salt, hash] = String(storedHash || "").split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), candidate);
}

async function migrate() {
  await pool.query(`
    create extension if not exists pgcrypto;

    create table if not exists tg_auth_users (
      id uuid primary key default gen_random_uuid(),
      email text not null unique,
      password_hash text not null,
      portal text not null default 'professional',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists tg_auth_sessions (
      token_hash text primary key,
      user_id uuid not null references tg_auth_users(id) on delete cascade,
      created_at timestamptz not null default now(),
      expires_at timestamptz not null
    );

    create table if not exists tg_organizations (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      organization_type text not null default 'employer',
      domain text,
      created_by uuid references tg_auth_users(id) on delete set null,
      created_at timestamptz not null default now()
    );

    create table if not exists tg_organization_memberships (
      id uuid primary key default gen_random_uuid(),
      organization_id uuid not null references tg_organizations(id) on delete cascade,
      user_id uuid not null references tg_auth_users(id) on delete cascade,
      role text not null default 'owner',
      created_at timestamptz not null default now(),
      unique (organization_id, user_id)
    );
  `);
}

function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function createSession(client, user) {
  const accessToken = crypto.randomBytes(32).toString("base64url");
  const refreshToken = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionTtlSeconds * 1000);
  await client.query("insert into tg_auth_sessions (token_hash, user_id, expires_at) values ($1, $2, $3)", [
    tokenHash(accessToken),
    user.id,
    expiresAt
  ]);
  return {
    accessToken,
    refreshToken,
    expiresAt: expiresAt.getTime(),
    user: {
      id: user.id,
      email: user.email
    }
  };
}

async function getBearerSession(request) {
  const authorization = request.headers.authorization || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
  if (!token) return null;

  const { rows } = await pool.query(
    `select u.id, u.email, s.expires_at
     from tg_auth_sessions s
     join tg_auth_users u on u.id = s.user_id
     where s.token_hash = $1 and s.expires_at > now()`,
    [tokenHash(token)]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    accessToken: token,
    refreshToken: "",
    expiresAt: new Date(row.expires_at).getTime(),
    user: { id: row.id, email: row.email }
  };
}

async function signUp(payload) {
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || "");
  const portal = String(payload.portal || "professional").includes("corporate") ? "corporate" : "professional";
  if (!email.includes("@")) throw new Error("Enter a valid email address.");
  validatePassword(password);

  const client = await pool.connect();
  try {
    await client.query("begin");
    const inserted = await client.query(
      `insert into tg_auth_users (email, password_hash, portal)
       values ($1, $2, $3)
       returning id, email, portal`,
      [email, hashPassword(password), portal]
    );
    const user = inserted.rows[0];

    if (portal === "corporate") {
      const orgName = String(payload.organizationName || "").trim() || `${email.split("@")[1] || "Company"} workspace`;
      const organizationType = String(payload.organizationType || "employer").trim().toLowerCase() || "employer";
      const domain = String(payload.organizationDomain || email.split("@")[1] || "").trim().toLowerCase();
      const org = await client.query(
        `insert into tg_organizations (name, organization_type, domain, created_by)
         values ($1, $2, $3, $4)
         returning id`,
        [orgName, organizationType, domain, user.id]
      );
      await client.query(
        `insert into tg_organization_memberships (organization_id, user_id, role)
         values ($1, $2, 'owner')`,
        [org.rows[0].id, user.id]
      );
    }

    const session = await createSession(client, user);
    await client.query("commit");
    return session;
  } catch (error) {
    await client.query("rollback");
    if (error?.code === "23505") {
      throw new Error("An account already exists for this email. Use login instead.");
    }
    throw error;
  } finally {
    client.release();
  }
}

async function signIn(payload) {
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || "");
  const client = await pool.connect();
  try {
    const { rows } = await client.query("select id, email, password_hash from tg_auth_users where email = $1", [email]);
    const user = rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      throw new Error("Email or password is incorrect.");
    }
    return createSession(client, user);
  } finally {
    client.release();
  }
}

async function signOut(request) {
  const authorization = request.headers.authorization || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
  if (token) {
    await pool.query("delete from tg_auth_sessions where token_hash = $1", [tokenHash(token)]);
  }
}

async function handler(request, response) {
  if (request.method === "GET" && request.url === "/api/health") {
    await pool.query("select 1");
    return json(response, 200, { ok: true, service: "trustgraph-postgres-auth" });
  }

  if (request.method === "GET" && request.url === "/api/auth/session") {
    const session = await getBearerSession(request);
    return session ? json(response, 200, session) : json(response, 401, { message: "Login required." });
  }

  if (request.method === "POST" && request.url === "/api/auth/signup") {
    return json(response, 200, await signUp(await readBody(request)));
  }

  if (request.method === "POST" && request.url === "/api/auth/login") {
    return json(response, 200, await signIn(await readBody(request)));
  }

  if (request.method === "POST" && request.url === "/api/auth/logout") {
    await signOut(request);
    return json(response, 200, { ok: true });
  }

  if (request.method === "POST" && request.url === "/api/auth/recover") {
    return json(response, 202, {
      ok: true,
      message: "Postgres auth is active. Email recovery will be added with SMTP; contact an admin to reset this pilot password."
    });
  }

  return json(response, 404, { message: "TrustGraph auth route not found." });
}

await migrate();

http
  .createServer((request, response) => {
    handler(request, response).catch((error) => {
      json(response, 400, { message: error instanceof Error ? error.message : "TrustGraph auth request failed." });
    });
  })
  .listen(port, "0.0.0.0", () => {
    console.log(`TrustGraph Postgres auth API listening on ${port}`);
  });
