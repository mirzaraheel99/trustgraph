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
- Guarded TrustGraph-only VPS launch packet in Admin so server deployment stays separate from the existing VFIX app

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

VPS deployment target:

```text
https://5-75-224-11.sslip.io
```

Use `SERVER_DEPLOYMENT.md` to install Docker, pull the GitHub repo, start Caddy HTTPS, and provision the VPS Postgres service. GitHub remains the primary source of truth; the server should update with `git pull --ff-only origin main` and `docker compose --env-file .env.server -f docker-compose.server.yml up -d --build`.

For first server setup, `tools/bootstrap-vps.sh` performs the guarded `/opt/trustgraph` install and refuses the VFIX host/path.

After first server setup, the manual **Deploy TrustGraph to VPS** GitHub Actions workflow can update `/opt/trustgraph`. It refuses the existing VFIX host at `5.75.224.110`.

## Hosted Registration Checklist

Use the hosted URL for account creation and login. The local development URL is optional and should not be used in Supabase Auth redirects for pilot users.

1. Open `https://mirzaraheel99.github.io/trustgraph/`.
2. Choose `Professional portal` to create a Passport user, or `Corporate portal` to create a company workspace.
3. For Corporate signup, enter organization name, domain, and organization type before creating the user account.
4. Confirm the Supabase email verification link. It must return to `https://mirzaraheel99.github.io/trustgraph/`, not `localhost`.
5. Login from the hosted page after verification. Corporate workspace details saved in the same browser are then provisioned into Supabase.
6. Use the Launch checklist only when pilot operators need database-backed validation rows for workflow acceptance.

## Supabase Auth

Add these repository/deployment environment variables for hosted live mode:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

In Supabase Auth URL settings, set the Site URL to `https://mirzaraheel99.github.io/trustgraph/` and add the same URL under Redirect URLs. If Site URL remains `localhost`, verification emails will open a localhost link instead of the hosted app.
Until those variables are present, the app stays in product preview mode and keeps a local RBAC account context available.

Supabase built-in email is limited to 2 messages per hour project-wide. If signup, resend verification, or recovery returns an email rate-limit error, wait at least 60 minutes or configure custom SMTP before heavier testing.

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
- `030_production_gate_decisions.sql`: production gate decision register, RLS, seeded human gates, and audited sign-off RPC.
- `031_production_gate_status_constraints.sql`: constrained production gate statuses and stricter audited sign-off RPC validation.
- `032_operator_named_pilot_rpcs.sql`: operator-named pilot RPC aliases so the app uses live workflow language instead of sample function names.
- `033_pilot_launch_contacts.sql`: protected pilot launch contact register for customer roster, onboarding owner, support owner, and incident owner evidence.

TypeScript mirrors for database rows live in `src/database.ts`.
The Supabase REST/RPC/Storage adapter lives in `src/supabase.ts`, with focused repositories for account context, Passport records, Access Grants, evidence, references, credentials, missing records, notifications, Connect controls, operations cases, and audit events.

## Current Live Workflow

1. Sign up or sign in with Supabase Auth.
2. TrustGraph creates a Professional account automatically.
3. Add live Passport records with evidence summaries, structured responsibilities, and skills.
4. Export the renewal readiness packet to review expired and 45-day due-soon records from the visible Passport or Verify scope.
5. Export the confidentiality review packet to inspect performance reviews, references, restricted records, and explicit-consent records inside the visible scope.
6. Export the skills evidence packet to review visible skill claims with source records, responsibilities, status, and Access Grant scope.
7. Create a corporate account or accept an invitation into one.
8. Corporate users invite team members, activate subscriptions, and request Access Grants from professionals by email.
9. Export the portal access packet to prove the signed-in profile, active membership, organization, and workspace route used for RBAC acceptance.
10. Switch to Verify to review approved shared records.
11. Request structured references, missing records, or issuer-created credentials as needed.
12. Professionals review and resolve Corporate missing-record requests from Passport.
13. Upload private evidence files to Supabase Storage and link them to Passport records.
14. Export the Corporate user database packet from Verify to prove visible professional rows, grants, shared records, structured responsibilities, skills, and gap focus.
15. Switch to Admin, create pilot operations cases only for validation workflows, and review/restrict/resolve cases.
16. Export the VPS launch packet before server deployment to confirm the TrustGraph host, `/opt/trustgraph` path, GitHub source, and VFIX refusal guards.
17. Manage Connect API clients and webhook subscriptions from Admin.
18. Manage corporate team invitations, accepted members, and subscription plans from the authenticated sidebar.
19. Export the pricing structure packet to prove configured plans, selected-seat projections, active ledger subscriptions, and Stripe launch gates.
20. Export the v1 completion audit packet from Admin to review all 13 tracks, locked profile scope, evidence exports, verification gates, and remaining human decisions.
21. Export the auth redirect readiness packet before invite testing to prove hosted redirect settings, email limits, TrustGraph VPS target, and VFIX isolation.
22. Use the source-grounded advisory card to review deterministic next actions from authorized records and workflow queues.
23. Admin audit trail shows recent material workflow events and exports the full audit and verification history packet.
24. Use the Launch checklist to seed a live pilot workspace when you need database-backed pilot data instead of front-end preview data.
25. Review seed reconciliation to confirm seeded Passport, evidence, Access Grant, consent, subscription, and corporate member rows match the live repository loads.
26. Export the working-data packet to prove the currently loaded Passport, Access Grant, consent, subscription, team, and invitation rows.

## Live Database Status

Live Supabase migrations are applied through `033_pilot_launch_contacts.sql`, including corporate member-management controls, corporate Access Grant requests by professional email, first-class locked-scope record categories, consent authorization records, sensitive-record privacy controls, the Admin release migration ledger, authenticated pilot workspace seeding, database-backed production gate tracking, constrained gate decision statuses, operator-named pilot workflow RPCs, and a protected pilot launch contact register.

## Public Website and Pricing

Unauthenticated visitors land on a public TrustGraph website with portal entry points, pricing, and registration:

- Professional: free Passport foundation for records, evidence uploads, Access Grants, and references.
- Corporate Verify: `$149/month` pilot tier for corporate RBAC, shared Passport review, missing-record requests, and audit.
- TrustGraph Scale: custom/enterprise tier for issuer workflows, Connect API clients, webhooks, and compliance operations.

Corporate registration collects organization name, domain, and type, then provisions an employer or staffing agency portal after Supabase account creation and verified hosted login. Pricing cards now show the database path for each portal so buyers can see what is written immediately and what remains human-gated.

## Product Planning

The `docs/` folder contains the planning documents used to shape this foundation.

- `01` through `13`: product scope, roles, journeys, trust rules, business rules, privacy, legal, IA, screen inventory, UX, data model, and state model.
- `14` through `23`: notifications, security, technical architecture, APIs, AI governance, MVP, roadmap, quality, deployment readiness, and pilot plan.
- `24` through `28`: master requirements index, traceability matrix, module dependency map, release backlog, and Codex build instructions.
- `current-implementation-evidence-map.md`: source-to-implementation map for the 13-track build, live database proof artifacts, verification commands, and human gates.
- `PILOT_RUNBOOK.md`: short v1 operator checklist for release gates, workflow acceptance, security boundary, and human decisions.
- `V1_READINESS_CHECKLIST.md`: 13-track implementation coverage, verification loop, and production stop conditions.
- `UI_COPY_HANDOFF.md`: premium SaaS UI/copy brief for design-agent or contractor polish without breaking v1 workflows.

The Admin workspace includes a 13-track foundation alignment panel so the live product surface stays connected to the roadmap.
