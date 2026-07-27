# TrustGraph

TrustGraph is a verified professional identity and workforce record platform.

This repository contains the first React + TypeScript application foundation for:

- TrustGraph Passport for Professionals
- TrustGraph Verify for employers and staffing agencies
- TrustGraph Admin operations
- Evidence-first trust labels
- Access Grant and sharing concepts
- Credential expiration monitoring
- Verification timelines and audit-aware activity

## Tech Stack

- Next.js
- React
- TypeScript
- Lucide React icons
- PNPM

## Local Development

The app is built and deployed from GitHub Actions, so local setup is optional.
Use the hosted URL below as the main review link.

```bash
pnpm install
pnpm dev
```

## Hosted App

GitHub Pages URL:

```text
https://mirzaraheel99.github.io/trustgraph/
```

## Supabase Auth

Add these repository/deployment environment variables for hosted live mode:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

In Supabase Auth URL settings, allow the GitHub Pages URL above as a site/redirect URL.
Until those variables are present, the app stays in demo mode and keeps the mock RBAC account context available.

For database migrations, add these GitHub repository secrets and run the `Apply Supabase Migrations` workflow manually:

```text
DIRECT_URL=
SUPABASE_PROJECT_REF=
SUPABASE_SECRET_KEY=
SUPABASE_DB_PASSWORD=
```

## Build

```bash
pnpm build
```

## Database Foundation

Supabase-ready migrations live in `supabase/migrations/`:

- `001_trustgraph_core.sql`: organizations, profiles, memberships, trust records, access grants, and audit events.
- `002_trustgraph_rls.sql`: first-pass row level security for RBAC, professional-owned records, scoped sharing, and audit access.
- `003_trustgraph_workflow_functions.sql`: updated timestamp triggers, audit event writer, access grant decisions, and trust record status changes.
- `005_professional_onboarding_rpc.sql`: self-service professional profile, personal organization, and membership creation.
- `006_sample_access_grant_rpc.sql`: development sample employer Access Grant request for end-to-end sharing checks.
- `007_sample_employer_reviewer_rpc.sql`: development sample employer reviewer membership for Verify workspace checks.
- `008_sync_access_grant_records_rpc.sql`: syncs a Professional's current Passport records into approved Access Grants.
- `009_corporate_account_rbac_rpc.sql`: self-service employer/staffing account creation and scoped RBAC activation.
- `010_verification_operations_queue.sql`: TrustGraph operations case table, sample verifier role, queue seeding, and case decisions.
- `011_operations_audit_hardening.sql`: operations case timestamp trigger and operations organization helper.

TypeScript mirrors for the core database rows live in `src/database.ts`.
The Supabase REST/RPC adapter lives in `src/supabase.ts`, with focused repositories for account context, Passport records, Access Grants, operations cases, and audit events.

## Current Live Workflow

1. Sign up or sign in with Supabase Auth.
2. TrustGraph creates a Professional account automatically.
3. Add live Passport records.
4. Create a sample employer reviewer role or corporate account.
5. Generate and approve an Access Grant to share current Passport records.
6. Switch to Verify to review approved shared records.
7. Create a sample operations role, switch to Admin, seed operations cases, and review/restrict/resolve cases.
8. Admin audit trail shows recent material workflow events.

## Product Planning

The `docs/` folder contains the planning documents used to shape this foundation.

- `01` through `13`: product scope, roles, journeys, trust rules, business rules, privacy, legal, IA, screen inventory, UX, data model, and state model.
- `14` through `23`: notifications, security, technical architecture, APIs, AI governance, MVP, roadmap, quality, deployment readiness, and pilot plan.
- `24` through `28`: master requirements index, traceability matrix, module dependency map, release backlog, and Codex build instructions.

The Admin workspace includes a 13-track foundation alignment panel so the live product surface stays connected to the roadmap.
