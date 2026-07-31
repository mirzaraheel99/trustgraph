# TrustGraph Current Implementation Evidence Map

## Purpose

This document maps the approved TrustGraph planning set to the current GitHub implementation so each build slice can be verified against source files, migrations, hosted checks, and remaining human decisions.

## Source Planning Set

- Steps 01-13 define product scope, roles, journeys, trust rules, business rules, privacy, legal review boundaries, information architecture, screens, UX, data model, and state model.
- Steps 14-23 define notifications, security, technical architecture, APIs, AI governance, MVP scope, roadmap, quality, deployment readiness, and pilot plan.
- Steps 24-28 define the build package: requirements index, traceability matrix, dependency map, backlog, and Codex build instructions.

## Current Hosted Surface

- Primary repo: `https://github.com/mirzaraheel99/trustgraph`
- Hosted review app: `https://mirzaraheel99.github.io/trustgraph/`
- TrustGraph VPS pilot host: `https://trustgraph.5-75-224-110.sslip.io`
- Protected VFIX app: `https://5-75-224-110.sslip.io/CRM-client-demo/login`

GitHub Pages remains the verified static review target, while the guarded TrustGraph VPS host is the pilot server target. GitHub stays the source of truth, and VFIX remains isolated on its existing path.

## 13-Track Evidence Map

| Track | Current implementation evidence | Verification evidence |
| --- | --- | --- |
| Product foundation | `src/App.tsx`, `app/page.tsx`, `app/globals.css`, `README.md` public website, portal registration, registration intent lifecycle, contained professional/corporate auth access desk, selected portal command strip, collapsible auth operator panels, dashboard session command bar, no-rail dashboard command layout, V1 operating map, pricing, hosted auth guidance, and auth readiness packets | GitHub Pages workflow, `scripts/smoke-live.mjs`, `scripts/check-responsive.mjs`, `scripts/check-v1-demo-flow.mjs` |
| Account data rights | Signed-in Account panel for data export and closure requests, admin status controls, data-rights packets, audit and notification evidence | `supabase/migrations/038`, `supabase/migrations/039`, `src/dataRightsRepository.ts`, smoke account/admin checks |
| Professional Passport | `src/recordRepository.ts`, `src/evidenceRepository.ts`, Passport record forms, structured responsibility/skill metadata, skills evidence packet, renewal readiness packet, dispute/correction workflow, evidence metadata, signed preview/download controls | `supabase/migrations/001`, `012`, `017`, `037`, smoke evidence checks |
| Corporate account | `src/accountRepository.ts`, Account panel, Corporate provisioning packet, team panels, member roster proof, account-context RPC proof | `supabase/migrations/009`, `020`, `021`, `022`, `043`, smoke corporate checks |
| RBAC | `src/rbac.ts`, workspace gating, role preview, portal access packet | `scripts/check-claims.mjs`, portal access export |
| Access Grants | `src/grantRepository.ts`, Passport approval/decline/revoke, Verify requests, shared record sync, corporate review attestations | `supabase/migrations/003`, `006`, `008`, `023`, `041` |
| Consent controls | `src/consentRepository.ts`, consent authorization and revoke UI, sensitive record controls, confidentiality review packet | `supabase/migrations/025`, `026`, RLS guard |
| References and missing records | `src/referenceRepository.ts`, `src/missingRecordRepository.ts`, request status controls and exports | `supabase/migrations/013`, `015` |
| Issuer workflow | `src/credentialRepository.ts`, issuer role activation, credential issue workflow, issuer-scoped expiration correction, and revocation lifecycle | `supabase/migrations/014`, `024`, `035`, `036` |
| Evidence preview/download | Private Supabase Storage upload, metadata listing, manifest export, signed preview/download buttons | `supabase/migrations/017`, smoke evidence assertions |
| Admin operations | Operations queue, audit exports, full audit and verification history packet, release ledger, security runbook, production gates, pilot contacts, organization RLS recursion repair, database policy repair guidance, account-context RPC marker, VPS cutover gate | `supabase/migrations/010`, `011`, `027`, `030`, `031`, `033`, `034`, `040`, `042`, `043` |
| Connect surface | `src/connectRepository.ts`, API clients, webhook subscriptions, status controls, exports | `supabase/migrations/018` |
| Advisory and notifications | `src/aiAdvisor.ts`, notification status controls, deterministic advisory packet, and review-only fraud signal packet with no automated hiring decisions | `supabase/migrations/010`, `012`, `016` |
| Pilot readiness | Launch checklist, seed evidence, seed reconciliation, working database packet, live database repair queue, v1 completion audit packet, end-to-end demo-flow gate, VPS launch guard | `supabase/migrations/029`, `032`, `PILOT_RUNBOOK.md`, `V1_READINESS_CHECKLIST.md`, `scripts/check-v1-demo-flow.mjs` |

## Live Database Proof Artifacts

The app exposes these operator exports to prove live database state after sign-in:

- Portal access packet: signed-in profile, active membership, organization, role, workspace route, and hosted redirect.
- Corporate provisioning packet: created organization, membership, role, and database write evidence.
- Corporate user database packet and review queue CSV: filtered professional access rows, shared record scope, structured responsibilities, skills, source counts, missing-record gap focus, latest review attestation state, next action, corporate directory acceptance checks, and `corporate_access.review_recorded` audit expectation visible to the active Verify workspace.
- Renewal readiness packet: visible Passport or Verify records grouped by expired, 45-day due-soon, dated, and missing-expiration review states.
- Confidentiality review packet: visible performance reviews, references, restricted records, and explicit-consent records scoped to the active Passport or Verify view.
- Skills evidence packet: visible skill claims with source records, responsibilities, statuses, and Access Grant scope from Passport or Verify.
- Full audit and verification history packet: filtered audit events with verification cases, evidence document coverage, and release ledger context from Admin.
- Pricing structure packet: configured plans, selected-seat projections, active pilot ledger subscriptions, and payment launch gates.
- Billing architecture decision packet: v1 ledger-now decision, disabled Stripe payment flows, launch requirements, and human decision gates.
- V1 completion audit packet: 13-track status, locked profile scope, evidence exports, verification gates, TrustGraph VPS target, and remaining human decisions.
- V1 operating map packet: single operator path from public website to Professional registration, Corporate registration, pricing ledger, corporate user database access, and the server release save path.
- Server release save path packet: GitHub source, GitHub Pages verification, TrustGraph VPS update command, hosted verification command, hosted version receipt, server HEAD match requirement, bundle smoke requirement, and VFIX isolation guard.
- Auth redirect readiness packet: active hosted redirect URL, recovery session readiness, visible session command bar, Supabase public configuration mode, email rate-limit note, TrustGraph VPS target, and VFIX isolation guard.
- Registration auth readiness packet: selected portal, selected portal command, collapsed operator handoff/recovery panels, pending corporate setup state, repaired email-link readiness, and Supabase Auth redirect action items.
- Registration intent review packet: live `registration_intents` rows, `record_registration_intent`, Corporate `workspace_created` completion, Professional `passport_initialized` completion, selected portal, selected pricing plan, first database write, next dashboard, and export proof.
- UI layout proof: public professional/corporate access is contained in a two-column auth access desk, the signed-in dashboard uses the top command system instead of a fixed left rail, and VFIX remains isolated on `https://5-75-224-110.sslip.io/CRM-client-demo/login`.
- Hosted login/database handoff packet: active Supabase return URL, current login state, live database acceptance requirements, TrustGraph VPS target, and VFIX isolation guard.
- Working-data packet: currently loaded Passport, Access Grant, corporate review attestation, consent, subscription, team member, and invitation counts plus the live database repair queue and database policy repair guidance for missing required row groups or migration 042 proof.
- V1 live database readiness receipt: single owner-facing packet and Supabase row for Professional rows, Corporate RBAC/access rows, evidence, consent, billing, team, review, registration, release proof, required exports, missing groups, and the rule that preview data is not accepted.
- Seed evidence packet: IDs returned by the live pilot workspace seed RPC, including the corporate review attestation created from the approved Access Grant.
- Seed reconciliation: compares seed IDs and counts to rows currently loaded through live repositories.
- Admin exports: operations cases, audit CSV/JSON, release ledger, security runbook, production gates, pilot launch contacts, Connect clients, and webhooks.
- Issuer lifecycle packet: issued credential count, active and revoked credential count, issuer organization scope, corrected expiration metadata, revocation reason, and `credential.updated` / `credential.revoked` audit expectation.
- Fraud signal review packet: RLS-protected Admin verification cases, open/high signal counts, allowed human-review actions, prohibited automated hiring decisions, and evidence metadata.

## Migration Coverage

Live Supabase migrations currently run through `049_evidence_access_receipts.sql`. This includes `043_account_context_rpc.sql` for signed-in profile, organization membership, and active role loading after hosted login; `044_registration_intents.sql` for public portal intent rows; `045_registration_intent_status.sql` for Corporate `workspace_created` completion; `046_registration_intent_professional_status.sql` for Professional `passport_initialized` completion; `047_v1_live_database_readiness_receipts.sql` for persisted V1 live database readiness receipts; `048_corporate_database_access_receipts.sql` for persisted Corporate Verify database-access receipts; and `049_evidence_access_receipts.sql` for persisted signed evidence preview/download receipts. The RLS guard verifies protected-table enablement across 26 tables before every hosted deployment, and the app exposes visible account-context, registration intent, persisted V1 readiness, corporate database access receipt, evidence access receipt, and RLS repair markers so operators can distinguish code readiness from a Supabase project that still needs the organization recursion repair, account-context RPC, registration intent completion RPCs, persisted readiness RPC, corporate database access receipt RPC, or evidence access receipt RPC applied.

## Verification Commands

Run before any commit that changes product behavior:

```bash
npm run typecheck
npm run check:claims
npm run check:rls
npm run check:responsive
npm run check:premium-layout
npm run check:v1-demo-flow
npm run check:vps-workflow
npm run build
```

After push, verify the GitHub Pages workflow build, deploy, and hosted smoke jobs are green.

## Remaining Human Gates

These are not engineering-complete until a human decision is recorded:

- Stripe products, taxes, invoice emails, refunds, dunning, and webhook reconciliation.
- External RLS/security review and production evidence-storage review.
- Legal review for background-check-adjacent records, adverse-action boundaries, and regulated employment decision language.
- Named pilot customers, onboarding owner, support owner, and incident response owner.
- VPS bootstrap/secrets and recorded TrustGraph VPS cutover approval for `trustgraph.5-75-224-110.sslip.io`; do not touch the VFIX host.
