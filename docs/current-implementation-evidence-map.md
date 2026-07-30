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
- TrustGraph VPS target: `https://5-75-224-11.sslip.io`
- Protected VFIX app: `https://5-75-224-110.sslip.io/CRM-client-demo/login`

GitHub Pages remains the verified review target until the guarded VPS bootstrap and secrets are completed.

## 13-Track Evidence Map

| Track | Current implementation evidence | Verification evidence |
| --- | --- | --- |
| Product foundation | `src/App.tsx`, `app/page.tsx`, `app/globals.css`, `README.md` public website, portal registration, pricing, hosted auth guidance, and auth readiness packets | GitHub Pages workflow, `scripts/smoke-live.mjs` |
| Professional Passport | `src/recordRepository.ts`, `src/evidenceRepository.ts`, Passport record forms, structured responsibility/skill metadata, skills evidence packet, renewal readiness packet, evidence metadata, signed preview/download controls | `supabase/migrations/001`, `012`, `017`, smoke evidence checks |
| Corporate account | `src/accountRepository.ts`, Account panel, Corporate provisioning packet, team panels, member roster proof | `supabase/migrations/009`, `020`, `021`, `022`, smoke corporate checks |
| RBAC | `src/rbac.ts`, workspace gating, role preview, portal access packet | `scripts/check-claims.mjs`, portal access export |
| Access Grants | `src/grantRepository.ts`, Passport approval/decline/revoke, Verify requests, shared record sync | `supabase/migrations/003`, `006`, `008`, `023` |
| Consent controls | `src/consentRepository.ts`, consent authorization and revoke UI, sensitive record controls, confidentiality review packet | `supabase/migrations/025`, `026`, RLS guard |
| References and missing records | `src/referenceRepository.ts`, `src/missingRecordRepository.ts`, request status controls and exports | `supabase/migrations/013`, `015` |
| Issuer workflow | `src/credentialRepository.ts`, issuer role activation, credential issue workflow, issuer-scoped expiration correction, and revocation lifecycle | `supabase/migrations/014`, `024`, `035`, `036` |
| Evidence preview/download | Private Supabase Storage upload, metadata listing, manifest export, signed preview/download buttons | `supabase/migrations/017`, smoke evidence assertions |
| Admin operations | Operations queue, audit exports, full audit and verification history packet, release ledger, security runbook, production gates, pilot contacts, organization RLS recursion repair | `supabase/migrations/010`, `011`, `027`, `030`, `031`, `033`, `034` |
| Connect surface | `src/connectRepository.ts`, API clients, webhook subscriptions, status controls, exports | `supabase/migrations/018` |
| Advisory and notifications | `src/aiAdvisor.ts`, notification status controls, deterministic advisory packet | `supabase/migrations/012`, `016` |
| Pilot readiness | Launch checklist, seed evidence, seed reconciliation, working database packet, live database repair queue, v1 completion audit packet, VPS launch guard | `supabase/migrations/029`, `032`, `PILOT_RUNBOOK.md`, `V1_READINESS_CHECKLIST.md` |

## Live Database Proof Artifacts

The app exposes these operator exports to prove live database state after sign-in:

- Portal access packet: signed-in profile, active membership, organization, role, workspace route, and hosted redirect.
- Corporate provisioning packet: created organization, membership, role, and database write evidence.
- Corporate user database packet: filtered professional access rows, shared record scope, structured responsibilities, skills, source counts, and missing-record gap focus visible to the active Verify workspace.
- Renewal readiness packet: visible Passport or Verify records grouped by expired, 45-day due-soon, dated, and missing-expiration review states.
- Confidentiality review packet: visible performance reviews, references, restricted records, and explicit-consent records scoped to the active Passport or Verify view.
- Skills evidence packet: visible skill claims with source records, responsibilities, statuses, and Access Grant scope from Passport or Verify.
- Full audit and verification history packet: filtered audit events with verification cases, evidence document coverage, and release ledger context from Admin.
- Pricing structure packet: configured plans, selected-seat projections, active pilot ledger subscriptions, and payment launch gates.
- Billing architecture decision packet: v1 ledger-now decision, disabled Stripe payment flows, launch requirements, and human decision gates.
- V1 completion audit packet: 13-track status, locked profile scope, evidence exports, verification gates, TrustGraph VPS target, and remaining human decisions.
- Auth redirect readiness packet: active hosted redirect URL, Supabase public configuration mode, email rate-limit note, TrustGraph VPS target, and VFIX isolation guard.
- Registration auth readiness packet: selected portal, pending corporate setup state, repaired email-link readiness, and Supabase Auth redirect action items.
- Hosted login/database handoff packet: active Supabase return URL, current login state, live database acceptance requirements, TrustGraph VPS target, and VFIX isolation guard.
- Working-data packet: currently loaded Passport, Access Grant, consent, subscription, team member, and invitation counts plus the live database repair queue for missing required row groups.
- Seed evidence packet: IDs returned by the live pilot workspace seed RPC.
- Seed reconciliation: compares seed IDs and counts to rows currently loaded through live repositories.
- Admin exports: operations cases, audit CSV/JSON, release ledger, security runbook, production gates, pilot launch contacts, Connect clients, and webhooks.
- Issuer lifecycle packet: issued credential count, active and revoked credential count, issuer organization scope, corrected expiration metadata, revocation reason, and `credential.updated` / `credential.revoked` audit expectation.

## Migration Coverage

Live Supabase migrations currently run through `036_update_issuer_credential_expiry.sql`. The RLS guard verifies protected-table enablement across 21 tables before every hosted deployment, and the app exposes a visible `034 RLS repair expected` marker so operators can distinguish code readiness from a Supabase project that still needs the organization recursion repair applied.

## Verification Commands

Run before any commit that changes product behavior:

```bash
npm run typecheck
npm run check:claims
npm run check:rls
npm run check:responsive
npm run build
```

After push, verify the GitHub Pages workflow build, deploy, and hosted smoke jobs are green.

## Remaining Human Gates

These are not engineering-complete until a human decision is recorded:

- Stripe products, taxes, invoice emails, refunds, dunning, and webhook reconciliation.
- External RLS/security review and production evidence-storage review.
- Legal review for background-check-adjacent records, adverse-action boundaries, and regulated employment decision language.
- Named pilot customers, onboarding owner, support owner, and incident response owner.
- VPS bootstrap/secrets for `5-75-224-11.sslip.io`; do not touch the VFIX host.
