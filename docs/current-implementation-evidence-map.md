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
| Product foundation | `src/App.tsx`, `app/page.tsx`, `app/globals.css`, `README.md` public website, portal front door, buyer decision board, portal registration, registration intent lifecycle, auth path summary, login/register server-save checkpoint, registration pre-submit checklist, signed-in dashboard front door, first-screen daily command center, contained professional/corporate auth access desk, selected portal command strip, collapsible auth operator panels, dashboard session command bar, no-rail dashboard command layout, portal usability command, portal readiness board, Corporate portal usability repair, corporate database path strip, V1 operating map, pricing, hosted auth guidance, and auth readiness packets | GitHub Pages workflow, `scripts/smoke-live.mjs`, `scripts/check-responsive.mjs`, `scripts/check-v1-demo-flow.mjs` |
| Account data rights | Signed-in Account panel for data export and closure requests, persisted metadata-only export package receipts, persisted metadata-only export package manifests, admin status controls, data-rights packets, audit and notification evidence | `supabase/migrations/038`, `supabase/migrations/039`, `supabase/migrations/050`, `supabase/migrations/051`, `src/dataRightsRepository.ts`, smoke account/admin checks |
| Professional Passport | `src/recordRepository.ts`, `src/evidenceRepository.ts`, Passport record forms, Professional Passport progress strip, structured responsibility/skill metadata, claim trust taxonomy, record provenance matrix, skills evidence packet, renewal readiness packet, dispute/correction workflow, evidence metadata, signed preview/download controls | `supabase/migrations/001`, `012`, `017`, `037`, smoke evidence checks |
| Corporate account | `src/accountRepository.ts`, Account panel, Corporate provisioning packet, team panels, member roster proof, account-context RPC proof | `supabase/migrations/009`, `020`, `021`, `022`, `043`, smoke corporate checks |
| RBAC | `src/rbac.ts`, workspace gating, role preview, portal access packet | `scripts/check-claims.mjs`, portal access export |
| Access Grants | `src/grantRepository.ts`, Passport approval/decline/revoke, Verify requests, shared record sync, corporate review attestations, corporate database access receipts, corporate visibility snapshots, Step 07 classification handling contract, seeded Corporate Verify visibility proof, compact Corporate reviewer action bar, bounded Corporate Verify directory controls and cards | `supabase/migrations/003`, `006`, `008`, `023`, `041`, `048`, `059`, `060`, `scripts/check-responsive.mjs` |
| Consent controls | `src/consentRepository.ts`, consent authorization and revoke UI, sensitive record controls, confidentiality review packet | `supabase/migrations/025`, `026`, RLS guard |
| References and missing records | `src/referenceRepository.ts`, `src/missingRecordRepository.ts`, request status controls and exports | `supabase/migrations/013`, `015` |
| Issuer workflow | `src/credentialRepository.ts`, issuer role activation, credential issue workflow, issuer provenance receipt, issuer-scoped expiration correction, and revocation lifecycle | `supabase/migrations/014`, `024`, `035`, `036` |
| Evidence preview/download | Private Supabase Storage upload, metadata listing, manifest export, signed preview/download buttons | `supabase/migrations/017`, smoke evidence assertions |
| Admin operations | Operations queue, audit exports, full audit and verification history packet, release ledger, security runbook, production gates, production gate cockpit, pilot contacts, pilot owner readiness receipts, real database completion receipts, organization RLS recursion repair, database policy repair guidance, regulated employment boundary packet, account-context RPC marker, VPS cutover gate | `supabase/migrations/010`, `011`, `027`, `030`, `031`, `033`, `034`, `040`, `042`, `043`, `057`, `058` |
| Connect surface | `src/connectRepository.ts`, API clients, webhook subscriptions, status controls, exports | `supabase/migrations/018` |
| Advisory and notifications | `src/aiAdvisor.ts`, notification status controls, deterministic advisory packet, and review-only fraud signal packet with no automated hiring decisions | `supabase/migrations/010`, `012`, `016` |
| Pilot readiness | Launch checklist, seed evidence, seed reconciliation, working database packet, live database repair queue, live database repair guide, v1 completion audit packet, end-to-end demo-flow gate, VPS launch guard | `supabase/migrations/029`, `032`, `PILOT_RUNBOOK.md`, `V1_READINESS_CHECKLIST.md`, `scripts/check-v1-demo-flow.mjs` |

## Live Database Proof Artifacts

The app exposes these operator exports to prove live database state after sign-in:

- Portal access packet: signed-in profile, active membership, organization, role, workspace route, and hosted redirect.
- Corporate provisioning packet: created organization, membership, role, and database write evidence.
- Corporate user database packet and review queue CSV: filtered professional access rows, shared record scope, structured responsibilities, skills, source counts, missing-record gap focus, latest review attestation state, next action, corporate access progress strip, corporate directory acceptance checks, Step 07 classification handling contract, and `corporate_access.review_recorded` audit expectation visible to the active Verify workspace.
- Corporate live row proof chain: active corporate RBAC, request-by-email path, approved Access Grants, scoped shared user rows, reviewer attestation, visibility snapshot, and metadata-only export readiness visible before persisted Corporate Verify database acceptance.
- Corporate reviewer database home: top reviewer surface for request, professional approval, visible scoped user rows, review attestation, metadata-only export, preview-data rejection, and no open user browse before forms or filters.
- Corporate visible rows handoff: approval-to-review checkpoint for approved grant, visible scoped rows, consent scope, review attestation, gap resolution, metadata-only export, and no open user database browse.
- Corporate reviewer action bar packet: request access, review rows, record attestation, export packet, and locked reason stay visible before directory filters so corporate users are not dropped into an unclear table.
- Renewal readiness packet: visible Passport or Verify records grouped by expired, 45-day due-soon, dated, and missing-expiration review states.
- Confidentiality review packet: visible performance reviews, references, restricted records, and explicit-consent records scoped to the active Passport or Verify view.
- Skills evidence packet: visible skill claims with source records, responsibilities, statuses, and Access Grant scope from Passport or Verify.
- Claim trust taxonomy packet: visible record provenance matrix with source, verifier label, verification time, current status, expiration, sensitivity, consent, and visibility scope for every Passport or Verify row.
- Corporate classification handling contract: active corporate RBAC, approved Access Grant, professional consent scope, record classification, record status, legal restriction, status/evidence visibility separation, metadata-only exports, and sensitive access audit expectations.
- Full audit and verification history packet: filtered audit events with verification cases, evidence document coverage, and release ledger context from Admin.
- Pricing structure packet: configured plans, selected-seat projections, active pilot ledger subscriptions, and payment launch gates.
- Billing architecture decision packet and database receipt: v1 ledger-now decision, disabled Stripe payment flows, launch requirements, and human decision gates.
- V1 completion audit packet: 13-track status, locked profile scope, evidence exports, verification gates, TrustGraph VPS target, and remaining human decisions.
- V1 operating map packet: single operator path from public website to Professional registration, Corporate registration, pricing ledger, corporate user database access, and the server release save path.
- Portal route shell packet: single bounded signed-in tab surface for Professional, Corporate Verify, Company Admin, Pricing, Account/logout, Database proof, VPS freshness, corporate database boundary, and preview-data rejection.
- Server release save path packet: GitHub source, GitHub Pages verification, TrustGraph VPS update command, hosted verification command, hosted version receipt, server HEAD match requirement, bundle smoke requirement, and VFIX isolation guard.
- Public hosted build source contract: public login and registration show GitHub `main` as source of truth, GitHub Pages as the green bundle, the TrustGraph VPS release stamp as server proof, and VFIX as a separate protected route before a pilot user treats the VPS as current.
- Auth redirect readiness packet: active hosted redirect URL, recovery session readiness, visible session command bar, Supabase public configuration mode, email rate-limit note, TrustGraph VPS target, and VFIX isolation guard.
- Registration auth readiness packet: selected portal, selected portal command, collapsed operator handoff/recovery panels, pending corporate setup state, repaired email-link readiness, and Supabase Auth redirect action items.
- Registration intent review packet: live `registration_intents` rows, `record_registration_intent`, Corporate `workspace_created` completion, Professional `passport_initialized` completion, selected portal, selected pricing plan, first database write, next dashboard, and export proof.
- Registration completion handoff: public auth submit proof that maps hosted verification to Professional `passport_initialized` or Corporate `workspace_created`, landing dashboard, next operator action, and preview-data rejection.
- Public signup decision desk: form-adjacent selected portal, login/register mode, price, first database write, required fields, resend verification, reset password, export decision, and no-preview-data proof before email/password entry.
- Registration pre-submit checklist packet: required fields, first database write, pricing path, next dashboard, and preview-data rejection are visible before the user submits the public auth form.
- V1 portal operating center: first signed-in screen for Professional, Corporate Verify, Company Admin, Pricing, Account recovery/logout, Database proof, live database mode, server save status, and preview-data rejection before dense proof panels.
- UI layout proof: public professional/corporate access is contained in a two-column auth access desk, the signed-in dashboard uses the top command system instead of a fixed left rail, and VFIX remains isolated on `https://5-75-224-110.sslip.io/CRM-client-demo/login`.
- Portal readiness board packet: one signed-in board for login, Professional Passport rows, Corporate workspace, pricing ledger, scoped Corporate Verify user database access, and the TrustGraph VPS release stamp; preview data is explicitly rejected as completion proof.
- Signed-in pilot journey checklist: ordered hosted account, Professional Passport, Corporate workspace, pricing ledger, scoped user database, and server proof actions with preview-data rejection before V1 route-run acceptance.
- Portal usability command packet: one signed-in guide for Personal Passport, Corporate Verify, Corporate setup, Pricing, Database proof, Account recovery, and Server sync before dense forms or operator panels appear.
- Hosted login/database handoff packet: active Supabase return URL, current login state, live database acceptance requirements, TrustGraph VPS target, and VFIX isolation guard.
- Working-data packet: currently loaded Passport, Access Grant, corporate review attestation, consent, subscription, team member, and invitation counts plus the live database repair queue and database policy repair guidance for missing required row groups or migration 042 proof.
- Live database repair guide packet: first missing live row group, seed/login/reload/export actions, source mode, and the rule that preview data cannot satisfy v1 acceptance.
- V1 live database readiness receipt: single owner-facing packet and Supabase row for Professional rows, Corporate RBAC/access rows, evidence, consent, billing, team, review, registration, release proof, required exports, the onboarding next-action rail, the live data operator strip, missing groups, and the rule that preview data is not accepted.
- V1 pilot route run receipt: persisted Supabase row for the hosted website/auth, Professional, Corporate, pricing, scoped user database, Admin export, VPS freshness, missing-step, and preview-data rejection proof before pilot acceptance.
- Real database completion receipt: persisted live-row completion plan for hosted login, registration, corporate workspace, pricing, user database access, evidence, consent, team, review, release, owner receipts, and preview-data rejection.
- Seed evidence packet: IDs returned by the live pilot workspace seed RPC, including the corporate review attestation created from the approved Access Grant.
- Seed reconciliation: compares seed IDs and counts to rows currently loaded through live repositories.
- Admin exports: operations cases, audit CSV/JSON, release ledger, security runbook, production gates, pilot launch contacts, pilot owner readiness receipts, real database completion receipts, Connect clients, and webhooks.
- Production gate cockpit packet: Stripe, external security/storage, legal/employment language, pilot owner, and TrustGraph VPS cutover gates in one Admin control surface; it keeps allowed mode at `pilot_only` until every human approval is recorded.
- Issuer lifecycle packet: issued credential count, active and revoked credential count, issuer organization scope, corrected expiration metadata, revocation reason, and `credential.updated` / `credential.revoked` audit expectation.
- Issuer provenance receipt: issuer-backed credential owner, issuer organization, source name, status, expiration, revocation state, no universal trust score, Corporate Verify visibility rule, and credential audit expectations.
- Fraud signal review packet: RLS-protected Admin verification cases, open/high signal counts, allowed human-review actions, prohibited automated hiring decisions, and evidence metadata.
- Regulated employment boundary packet: legal-review gate for background-check-adjacent records, adverse-action boundaries, authorization, disclosure, dispute handling, retention, hidden ranking prohibition, and no automated adverse action.
- Security/RLS review receipt: signed-in CI/RLS coverage, private evidence boundary, RBAC, audit, export, open security item, and production-traffic block proof for external review.

## Migration Coverage

Live Supabase migrations currently run through `062_v1_pilot_route_run_receipts.sql`. This includes `043_account_context_rpc.sql` for signed-in profile, organization membership, and active role loading after hosted login; `044_registration_intents.sql` for public portal intent rows; `045_registration_intent_status.sql` for Corporate `workspace_created` completion; `046_registration_intent_professional_status.sql` for Professional `passport_initialized` completion; `047_v1_live_database_readiness_receipts.sql` for persisted V1 live database readiness receipts; `048_corporate_database_access_receipts.sql` for persisted Corporate Verify database-access receipts; `049_evidence_access_receipts.sql` for persisted signed evidence preview/download receipts; `050_data_export_package_receipts.sql` for persisted metadata-only data export package receipts; `051_data_export_packages.sql` for persisted metadata-only data export package manifests; `052_billing_architecture_decision_receipts.sql` for persisted billing architecture decision receipts; `053_pricing_quote_receipts.sql` for persisted corporate pricing quote receipts; `054_onboarding_wizard_receipts.sql` for persisted guided onboarding wizard receipts; `055_auth_recovery_receipts.sql` for persisted hosted auth recovery receipts; `056_security_rls_review_receipts.sql` for persisted security/RLS review receipts; `057_pilot_owner_readiness_receipts.sql` for persisted pilot customer, onboarding, support, and incident-owner readiness receipts; `058_real_database_completion_receipts.sql` for persisted real database completion receipts; `059_corporate_database_visibility_snapshots.sql` for persisted Corporate Verify filtered-row snapshots, readiness buckets, row inventory, review-attestation counts, and raw-private-file exclusion; `060_pilot_visibility_snapshot_seed.sql` for one-action pilot seeding of filtered corporate visibility proof from live Supabase rows; `061_pilot_named_operator_aliases.sql` for pilot-named compatibility RPC aliases that avoid legacy sample/demo naming in live pilot operations; and `062_v1_pilot_route_run_receipts.sql` for persisted hosted route-run proof before pilot acceptance. The RLS guard verifies protected-table enablement across 37 tables before every hosted deployment, and the app exposes visible account-context, registration intent, persisted V1 readiness, persisted V1 route-run receipts, corporate database access receipt, corporate database visibility snapshot, evidence access receipt, data export package receipt, data export package manifest, billing architecture decision receipt, pricing quote receipt, onboarding wizard receipt, auth recovery receipt, security/RLS review receipt, pilot owner readiness receipt, real database completion receipt, pilot-named RPC aliases, and RLS repair markers so operators can distinguish code readiness from a Supabase project that still needs the organization recursion repair, account-context RPC, registration intent completion RPCs, persisted readiness RPC, persisted route-run receipt RPC, corporate database access receipt RPC, corporate database visibility snapshot RPC, pilot visibility snapshot seed RPC, pilot-named operator alias RPCs, evidence access receipt RPC, data export package receipt RPC, data export package manifest RPC, billing decision receipt RPC, pricing quote receipt RPC, onboarding wizard receipt RPC, auth recovery receipt RPC, security/RLS review receipt RPC, pilot owner readiness receipt RPC, or real database completion receipt RPC applied.

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
