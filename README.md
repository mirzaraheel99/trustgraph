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
- V1 operating map that connects website, Professional registration, Corporate registration, pricing, Corporate Verify database access, and the GitHub-to-VPS release save path

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
https://trustgraph.5-75-224-110.sslip.io
```

Use `SERVER_DEPLOYMENT.md` to install Docker, pull the GitHub repo, start Caddy HTTPS, and provision the VPS Postgres service. GitHub remains the primary source of truth; the signed-in app exposes a server release save path packet, and the server should update with `bash tools/update-vps-from-github.sh` from `/opt/trustgraph`.

For first server setup, `tools/bootstrap-vps.sh` performs the guarded `/opt/trustgraph` install and refuses the VFIX host/path.

After first server setup, the manual **Deploy TrustGraph to VPS** GitHub Actions workflow can update `/opt/trustgraph`. It refuses the existing VFIX host at `5.75.224.110`, runs the same guarded `tools/update-vps-from-github.sh` path as the server shell command, and checks `trustgraph-release.json` so the VPS must prove the GitHub source it saved.

If another service already owns public ports 80/443 on the server, set `TRUSTGRAPH_HTTP_PORT` and `TRUSTGRAPH_HTTPS_PORT` in `.env.server` before starting TrustGraph, then route the external HTTPS host through the existing reverse proxy.

## Hosted Registration Checklist

Use the hosted URL for account creation and login. The local development URL is optional and should not be used in Supabase Auth redirects for pilot users.

1. Open `https://mirzaraheel99.github.io/trustgraph/`.
2. Choose `Professional portal` to create a Passport user, or `Corporate portal` to create a company workspace.
3. For Corporate signup, enter organization name, domain, and organization type before creating the user account.
4. Confirm the Supabase email verification link. It must return to `https://mirzaraheel99.github.io/trustgraph/`, not `localhost`.
5. Login from the hosted page after verification. Corporate workspace details saved in the same browser are then provisioned into Supabase.
6. Open the Launch checklist and export the hosted login/database handoff packet before recording pilot evidence.
7. Review the live database repair queue to see which Passport, evidence, Access Grant, consent, corporate account, or billing row groups still need real Supabase rows.

## Supabase Auth

Add these repository/deployment environment variables for hosted live mode:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

In Supabase Auth URL settings, set the Site URL to the active hosted TrustGraph URL and add `https://mirzaraheel99.github.io/trustgraph/`, `https://trustgraph.5-75-224-110.sslip.io`, and `https://trustgraph.5-75-224-110.sslip.io/` under Redirect URLs before VPS login tests. If Site URL remains `localhost`, verification emails will open a localhost link instead of the hosted app.
Until those variables are present, the app stays in product preview mode and keeps a local RBAC account context available.

Supabase built-in email is limited to 2 messages per hour project-wide. If signup, resend verification, or recovery returns an email rate-limit error, wait at least 60 minutes or configure custom SMTP before heavier testing.

The hosted login/database handoff packet records the active Supabase return URL, current login state, live database acceptance requirements, TrustGraph VPS target, and VFIX isolation guard. Export it whenever account verification or database proof is being checked.

The public auth surface is intentionally split into a contained professional/corporate access desk and a sticky login/register card. The signed-in dashboard intentionally uses the top command system instead of a fixed left rail, so workspace routing, account recovery, logout, and corporate setup stay visible without horizontal overflow.

For database migrations, add these GitHub repository secrets. New SQL files under `supabase/migrations/*.sql` are applied automatically when pushed to `main`; the `Apply Supabase Migrations` workflow can also be run manually with a specific `migration_path` when a targeted repair is needed:

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

## V1 Demo Flow Check

```bash
npm run check:v1-demo-flow
```

This validates the end-to-end v1 demo path from public portal selection through registration, dashboard actions, professional records, Corporate Verify user database access, working database proof, V1 operating map, server release save path, billing boundary, and launch gates.

## Server Env Check

```bash
npm run check:server-env
npm run check:vps-workflow
```

These validate the non-secret fixture and guarded VPS workflow. On the VPS, run `bash tools/validate-server-env.sh .env.server` before the first Docker build.

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
- `034_fix_organization_policy_recursion.sql`: first organization RLS recursion repair attempt for corporate account context.
- `035_revoke_issuer_credentials.sql`: issuer-scoped credential revocation RPC with audit event and professional notification evidence.
- `036_update_issuer_credential_expiry.sql`: issuer-scoped expiration correction RPC with audit event and professional notification evidence.
- `037_record_dispute_workflow.sql`: professional dispute and correction workflow for contested Passport records.
- `038_data_rights_requests.sql`: authenticated data export and account closure request workflow.
- `039_data_rights_status_controls.sql`: admin status controls for data-rights request review.
- `040_vps_cutover_production_gate.sql`: TrustGraph VPS cutover production gate.
- `041_corporate_access_review_attestations.sql`: corporate reviewer attestations for scoped user-database review, with RLS, audit events, and professional notifications.
- `042_fix_operator_policy_self_reference.sql`: final organization policy self-reference repair so corporate account context can load without Supabase `42P17` policy recursion failures.
- `043_account_context_rpc.sql`: account-context RPC for signed-in profile, organization membership, and active role loading after hosted login.
- `044_registration_intents.sql`: authenticated public registration intent rows for Professional and Corporate portal choices, selected plan, first database write, and next dashboard.
- `045_registration_intent_status.sql`: corporate registration completion RPC that marks captured Corporate intents as `workspace_created` after organization and admin membership creation.
- `046_registration_intent_professional_status.sql`: professional registration completion RPC that marks captured Professional intents as `passport_initialized` after hosted login creates the Passport account context.
- `047_v1_live_database_readiness_receipts.sql`: authenticated V1 live database readiness receipts for Professional, Corporate, pricing, scoped user database, registration, review, release proof, and preview-data rejection.
- `048_corporate_database_access_receipts.sql`: authenticated Corporate Verify database-access receipts that persist scoped export readiness, Access Grant counts, shared Passport row counts, review attestations, open gaps, preview-data rejection, and audit history.
- `049_evidence_access_receipts.sql`: authenticated evidence preview/download receipts that persist signed URL mode, expiry, private storage boundary, no raw URL storage, and audit history.
- `050_data_export_package_receipts.sql`: signed-in owner data export package receipts that persist metadata-only package counts, data-rights request scope, raw private file exclusion, preview-data rejection, and audit history.
- `051_data_export_packages.sql`: signed-in owner data export package manifests that persist metadata-only package rows, counts, expiry, download marking, raw private file exclusion, no signed URL storage, and audit history.
- `052_billing_architecture_decision_receipts.sql`: corporate/admin billing decision receipts that persist the pilot-ledger-now, Stripe-later architecture, with checkout, customer portal, invoices, taxes, refunds, dunning, and payment webhooks disabled until human approval.

TypeScript mirrors for database rows live in `src/database.ts`.
The Supabase REST/RPC/Storage adapter lives in `src/supabase.ts`, with focused repositories for account context, Passport records, Access Grants, evidence, references, credentials, missing records, notifications, Connect controls, operations cases, and audit events.

## Current Live Workflow

1. Sign up or sign in with Supabase Auth.
2. TrustGraph records the public registration intent and creates a Professional account automatically.
3. Add live Passport records with evidence summaries, structured responsibilities, and skills.
4. Export the renewal readiness packet to review expired and 45-day due-soon records from the visible Passport or Verify scope.
5. Export the confidentiality review packet to inspect performance reviews, references, restricted records, and explicit-consent records inside the visible scope.
6. Export the skills evidence packet to review visible skill claims with source records, responsibilities, status, and Access Grant scope.
7. Create a corporate account or accept an invitation into one, then confirm the captured Corporate registration intent moves to `workspace_created`.
8. Corporate users invite team members, activate subscriptions, and request Access Grants from professionals by email.
9. Export the portal access packet to prove the signed-in profile, active membership, organization, and workspace route used for RBAC acceptance.
10. Switch to Verify to review approved shared records.
11. Request structured references, missing records, or issuer-created credentials as needed.
12. Professionals review and resolve Corporate missing-record requests from Passport.
13. Upload private evidence files to Supabase Storage and link them to Passport records.
14. Record corporate access review attestations and export the Corporate review queue CSV plus the Corporate user database packet from Verify to prove visible professional rows, grants, shared records, structured responsibilities, skills, gap focus, review status, next action, and audit expectations.
15. Switch to Admin, create pilot operations cases only for validation workflows, and review/restrict/resolve cases.
16. Export the VPS launch packet before server deployment to confirm the TrustGraph host, `/opt/trustgraph` path, GitHub source, and VFIX refusal guards.
17. Manage Connect API clients and webhook subscriptions from Admin.
18. Manage corporate team invitations, accepted members, and subscription plans from the authenticated sidebar.
19. Export the pricing structure packet and billing architecture decision packet to prove configured plans, selected-seat projections, active ledger subscriptions, and Stripe launch gates.
20. Export the v1 completion audit packet from Admin to review all 13 tracks, locked profile scope, evidence exports, verification gates, and remaining human decisions.
21. Export the auth redirect readiness packet before invite testing to prove hosted redirect settings, email limits, TrustGraph VPS target, and VFIX isolation.
22. Use the source-grounded advisory card to review deterministic next actions from authorized records and workflow queues.
23. Admin audit trail shows recent material workflow events and exports the full audit and verification history packet.
24. Use the Launch checklist to seed a live pilot workspace when you need database-backed pilot data instead of front-end preview data.
25. Review seed reconciliation to confirm seeded Passport, evidence, Access Grant, corporate review attestation, consent, subscription, and corporate member rows match the live repository loads.
26. Export the working-data packet to prove the currently loaded Passport, Access Grant, corporate review attestation, consent, subscription, team, and invitation rows plus the live database repair queue.
27. Export the V1 operating map packet to confirm the pilot path from public website through server release is understandable.
28. Export the server release save path packet, then update the VPS from `/opt/trustgraph` with `bash tools/update-vps-from-github.sh`.
29. Record and export the V1 live database readiness receipt from Admin after signed-in Supabase rows load for Professional, Corporate, pricing, scoped database access, registration, review, and release proof.

## Live Database Status

Live Supabase migrations are applied through `052_billing_architecture_decision_receipts.sql`, including corporate member-management controls, corporate Access Grant requests by professional email, first-class locked-scope record categories, consent authorization records, sensitive-record privacy controls, the Admin release migration ledger, authenticated pilot workspace seeding, database-backed production gate tracking, constrained gate decision statuses, operator-named pilot workflow RPCs, a protected pilot launch contact register, issuer credential update/revocation lifecycle, dispute and data-rights workflows, the TrustGraph VPS cutover gate, corporate user-database review attestations, the migration 042 organization RLS recursion repair required for corporate account context, the migration 043 account-context RPC required after hosted login, registration intent completion states for `workspace_created` and `passport_initialized`, persisted V1 live database readiness receipts, persisted Corporate Verify database-access receipts, persisted evidence access receipts for preview/download signed URLs, persisted metadata-only data export package receipts, persisted metadata-only data export package manifests, and persisted billing architecture decision receipts for the human-gated Stripe boundary.

## Public Website and Pricing

Unauthenticated visitors land on a public TrustGraph website with portal entry points, pricing, and registration:

- Professional: free Passport foundation for records, evidence uploads, Access Grants, and references.
- Corporate Verify: `$149/month` pilot tier for corporate RBAC, shared Passport review, missing-record requests, and audit.
- TrustGraph Scale: custom/enterprise tier for issuer workflows, Connect API clients, webhooks, and compliance operations.

Corporate registration collects organization name, domain, and type, then provisions an employer or staffing agency portal after Supabase account creation and verified hosted login. Pricing cards now show the database path for each portal so buyers can see what is written immediately and what remains human-gated. The V1 operating map shows the sequence from website to Professional registration, Corporate registration, pricing ledger, Corporate Verify user database access, and server release. The billing architecture decision packet and database receipt record the v1 choice to keep Supabase subscription ledger activation live while Stripe Checkout, customer portal, invoices, refunds, dunning, taxes, and payment webhooks wait for human approval.

## Product Planning

The `docs/` folder contains the planning documents used to shape this foundation. Root-level runbooks capture the live v1 operating checklist.

- `01` through `13`: product scope, roles, journeys, trust rules, business rules, privacy, legal, IA, screen inventory, UX, data model, and state model.
- `14` through `23`: notifications, security, technical architecture, APIs, AI governance, MVP, roadmap, quality, deployment readiness, and pilot plan.
- `24` through `28`: master requirements index, traceability matrix, module dependency map, release backlog, and Codex build instructions.
- `current-implementation-evidence-map.md`: source-to-implementation map for the 13-track build, live database proof artifacts, verification commands, and human gates.
- Root `PILOT_RUNBOOK.md`: short v1 operator checklist for release gates, workflow acceptance, security boundary, and human decisions.
- Root `V1_READINESS_CHECKLIST.md`: 13-track implementation coverage, verification loop, and production stop conditions.
- Root `UI_COPY_HANDOFF.md`: premium SaaS UI/copy brief for design-agent or contractor polish without breaking v1 workflows.

The Admin workspace includes a 13-track foundation alignment panel so the live product surface stays connected to the roadmap.
