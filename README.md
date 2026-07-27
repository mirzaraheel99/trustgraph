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

Add these repository or deployment environment variables when the Supabase project is ready:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

In Supabase Auth URL settings, allow the GitHub Pages URL above as a site/redirect URL.
Until those variables are present, the app stays in demo mode and keeps the mock RBAC account context available.

For database migrations, add this GitHub repository secret and run the `Apply Supabase Migrations` workflow manually:

```text
DIRECT_URL=
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

TypeScript mirrors for the core database rows live in `src/database.ts`.
The first Supabase REST adapter lives in `src/supabase.ts`, with account-context queries in `src/accountRepository.ts`.

## Product Planning

The `docs/` folder contains the planning documents used to shape this foundation.
