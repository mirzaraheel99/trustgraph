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
- Private Supabase Storage evidence uploads
- Structured references, issuer credentials, missing-record requests, Connect controls, and source-grounded advisory summaries
- Public website, Professional and Corporate portal entry, pricing tiers, subscription activation, team invitations, and corporate member-management foundation

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

In Supabase Auth URL settings, set the Site URL to `https://mirzaraheel99.github.io/trustgraph/` and add the same URL under Redirect URLs. If Site URL remains `localhost`, verification emails will open a localhost link instead of the hosted app.
Until those variables are present, the app stays in guided preview mode and keeps a local RBAC account context available.

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

## Live Smoke Check

```bash
npm run smoke:live
```

Set `TRUSTGRAPH_SMOKE_URL` to smoke-check a different hosted URL.

## Database Foundation

Supabase-ready migrations live in `supabase/migrations/`:

- `001_trustgraph_core.sql`: organizations, profiles, memberships, trust records, access grants, and audit events.
- `002_trustgraph_rls.sql`: first-pass row level security for RBAC, professional-owned records, scoped sharing, and audit access.
- `003_trustgraph_workflow_functions.sql`: updated timestamp triggers, audit event writer, access grant decisions, and trust record status changes.
- `005_professional_onboarding_rpc.sql`: self-service professional profile, personal organization, and membership creation.
- `006_sample_access_grant_rpc.sql`: QA employer Access Grant request for end-to-end sharing checks.
- `007_sample_employer_reviewer_rpc.sql`: QA employer reviewer membership for Verify workspace checks.
- `008_sync_access_grant_records_rpc.sql`: syncs a Professional's current Passport records into approved Access Grants.
- `009_corporate_account_rbac_rpc.sql`: self-service employer/staffing account creation and scoped RBAC activation.
- `010_verification_operations_queue.sql`: TrustGraph operations case table, QA verifier role, queue seeding, and case decisions.
- `011_operations_audit_hardening.sql`: operations case timestamp trigger and operations organization helper.
- `012_evidence_documents_notifications.sql`: evidence document metadata, notification events, RLS, and evidence linking.
- `013_reference_requests_foundation.sql`: structured reference request lifecycle and audit coverage.
- `014_credential_issuer_foundation.sql`: credential issuer role and verified credential issue workflow.
- `015_missing_record_requests.sql`: Verify-to-Passport missing-record request workflow.
- `016_notification_event_status_controls.sql`: notification read/mute status controls with audit events.
- `017_evidence_storage_uploads.sql`: private Supabase Storage bucket, object policies, and uploaded evidence linking.
- `018_connect_api_clients_webhooks.sql`: Connect API client registry, webhook subscriptions, status controls, and audit events.
- `019_pricing_and_subscriptions.sql`: seeded pricing plans, organization subscriptions, trial activation, and audit events.
- `020_team_invitations.sql`: corporate team invitations, invite lifecycle controls, notification events, and audit events.
- `021_accept_team_invitations.sql`: invitee-owned pending invitation reads and acceptance into active organization memberships.
- `022_member_management.sql`: corporate member directory support, peer profile reads, and admin suspend/restore workflow.
- `023_corporate_access_grant_requests.sql`: corporate Verify users request Passport access from an existing professional by email.
- `024_expand_record_types.sql`: first-class record types for contracts, training, skills, performance reviews, and continuing education.
- `025_consent_authorizations.sql`: owner-controlled consent authorization records, revoke workflow, RLS, and audit events.
- `026_sensitive_record_controls.sql`: trust record sensitivity classification, explicit consent requirement flags, and audit coverage.
- `027_migration_release_ledger.sql`: release migration ledger table, admin/auditor RLS, and workflow recording RPC.
- `028_fix_migration_ledger_rpc.sql`: production repair for deterministic migration ledger recording.
- `029_pilot_workspace_seed.sql`: authenticated pilot seed RPC for live Passport, Corporate Verify, subscription, Access Grant, consent, evidence, notification, and audit rows.

TypeScript mirrors for database rows live in `src/database.ts`.
The Supabase REST/RPC/Storage adapter lives in `src/supabase.ts`, with focused repositories for account context, Passport records, Access Grants, evidence, references, credentials, missing records, notifications, Connect controls, operations cases, and audit events.

## Current Live Workflow

1. Sign up or sign in with Supabase Auth.
2. TrustGraph creates a Professional account automatically.
3. Add live Passport records.
4. Create a corporate account or accept an invitation into one.
5. Corporate users invite team members, activate subscriptions, and request Access Grants from professionals by email.
6. Switch to Verify to review approved shared records.
7. Request structured references, missing records, or issuer-created credentials as needed.
8. Upload private evidence files to Supabase Storage and link them to Passport records.
9. Switch to Admin, seed operations cases only for test workflows, and review/restrict/resolve cases.
10. Manage Connect API clients and webhook subscriptions from Admin.
11. Manage corporate team invitations, accepted members, and subscription plans from the authenticated sidebar.
12. Use the source-grounded advisory card to review deterministic next actions from authorized records and workflow queues.
13. Admin audit trail shows recent material workflow events.
14. Use the Launch checklist to seed a live pilot workspace when you need database-backed pilot data instead of front-end preview data.

## Live Database Status

Live Supabase migrations are applied through `029_pilot_workspace_seed.sql`, including corporate member-management controls, corporate Access Grant requests by professional email, first-class locked-scope record categories, consent authorization records, sensitive-record privacy controls, the Admin release migration ledger, and authenticated pilot workspace seeding.

## Public Website and Pricing

Unauthenticated visitors land on a public TrustGraph website with portal entry points, pricing, and registration:

- Professional: free Passport foundation for records, evidence uploads, Access Grants, and references.
- Corporate Verify: `$149/month` pilot tier for corporate RBAC, shared Passport review, missing-record requests, and audit.
- TrustGraph Scale: custom/enterprise tier for issuer workflows, Connect API clients, webhooks, and compliance operations.

Corporate registration collects organization name, domain, and type, then provisions an employer or staffing agency portal after Supabase account creation.

## Product Planning

The `docs/` folder contains the planning documents used to shape this foundation.

- `01` through `13`: product scope, roles, journeys, trust rules, business rules, privacy, legal, IA, screen inventory, UX, data model, and state model.
- `14` through `23`: notifications, security, technical architecture, APIs, AI governance, MVP, roadmap, quality, deployment readiness, and pilot plan.
- `24` through `28`: master requirements index, traceability matrix, module dependency map, release backlog, and Codex build instructions.
- `PILOT_RUNBOOK.md`: short v1 operator checklist for release gates, workflow acceptance, security boundary, and human decisions.
- `V1_READINESS_CHECKLIST.md`: 13-track implementation coverage, verification loop, and production stop conditions.
- `UI_COPY_HANDOFF.md`: premium SaaS UI/copy brief for design-agent or contractor polish without breaking v1 workflows.

The Admin workspace includes a 13-track foundation alignment panel so the live product surface stays connected to the roadmap.
