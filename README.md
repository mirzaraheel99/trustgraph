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

## Build

```bash
pnpm build
```

## Database Foundation

Supabase-ready migrations live in `supabase/migrations/`:

- `001_trustgraph_core.sql`: organizations, profiles, memberships, trust records, access grants, and audit events.
- `002_trustgraph_rls.sql`: first-pass row level security for RBAC, professional-owned records, scoped sharing, and audit access.

TypeScript mirrors for the core database rows live in `src/database.ts`.

## Product Planning

The `docs/` folder contains the planning documents used to shape this foundation.
