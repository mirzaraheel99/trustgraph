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

After first server setup, the manual **Deploy TrustGraph to VPS** GitHub Actions workflow can update `/opt/trustgraph`. It refuses the existing VFIX host at `5.75.224.110`, runs the same guarded `tools/update-vps-from-github.sh` path as the server shell command, and checks `trustgraph-release.json` so the VPS must prove the GitHub source and current `live_data_loading_command` bundle marker it saved. The main Pages workflow now verifies the exported release stamp asset before upload, so a missing or app-shell-fallback release stamp cannot pass as a current server save.

The Pages deployment also runs a VPS save job after the hosted smoke check. That job now fails if `TRUSTGRAPH_VPS_USER` or `TRUSTGRAPH_VPS_SSH_KEY` is missing, because a green GitHub build without a verified VPS save can leave `https://trustgraph.5-75-224-110.sslip.io/` stale.

The CI loop also runs `pnpm check:v1-pilot-route`. That verifier ties the public website, Professional and Corporate registration, pricing, hosted auth recovery, Passport evidence, Corporate scoped user database access, Admin exports, live-row repair path, and VPS release stamp into one route-level acceptance check before Pages deployment.

The CI loop also runs `pnpm check:live-database-repair`. That focused gate proves the signed-in app still exposes the next missing Supabase row group, the live pilot seed action, the proof reload route, working-data export, and visible preview-data rejection before a build can deploy.

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

The public auth surface is intentionally split into a contained professional/corporate access desk and a sticky login/register card. The signed-in dashboard intentionally uses the top command system instead of a fixed left rail, with one consolidated operator home instead of stacked duplicate command panels, so workspace routing, account recovery, logout, and corporate setup stay visible without horizontal overflow.

The public login and registration page now keeps proof receipts out of the main form path: users first choose Professional or Corporate, pick Login or Register, complete the required fields, and use the visible recovery controls if hosted verification or password reset needs repair.

The public login/register card now includes a signup decision desk directly above the email and password fields. It keeps selected portal, login/register mode, price, first database write, required fields, recovery actions, and no-preview-data proof visible at the moment the user submits.

The public login/register card also includes a registration pricing gate before credentials. It shows selected portal, register/login mode, pilot price, pricing plan id, first live database write, `registration_intents`, Stripe checkout boundary, server-save status, and live-row-only acceptance in one compact card.

The signed-in working database area now includes a live row activation handoff. It groups hosted login, live pilot row creation, browser reload, seed reconciliation, Corporate Verify review, and working-data export into one action path before real database acceptance.

The working database proof now starts with a Real database acceptance command. It rejects demo and preview data, then requires hosted login, live seed or manually loaded rows, browser reload, seed reconciliation, Corporate Verify review, working-data export, and a persisted completion receipt before the real database path is treated as accepted.

The signed-in dashboard front door now exposes clickable cards for Professional Passport, Corporate Verify, Company Admin, Account and recovery, Pricing, Database proof, and Server sync. Pricing opens the billing setup panel, Database proof scrolls to the live-row proof cockpit, and Server sync exports the GitHub-to-VPS release packet.

Corporate Verify now keeps the visible operator path focused on the quick start, progress strip, request form, request list, user-data proof, and scoped directory. Duplicate wizard/command/blocker panels remain in the bundle for proof exports and tests, but they do not crowd the working reviewer flow.

Corporate Verify also includes a reviewer front desk that summarizes request, approval, scoped rows, review proof, and the next action before the reviewer reaches filters or export receipts. This keeps the corporate database path understandable on hosted desktop and mobile views while preserving metadata-only proof packets for audit.

Corporate Verify now starts the reviewer work area with a Corporate reviewer database home. It shows the request, approval, visible scoped rows, review proof, export boundary, and no-open-user-browse rule before the reviewer reaches dense forms or directory filters.

Corporate Verify now also puts a reviewer database workbench at the top of the user database. It summarizes visible users, shared records, open gaps, review attestations, visibility snapshot, access receipt, filters, export, and the no-open-browse boundary before the row list.

Corporate Verify now includes a direct attestation completion gate before the review queue. It shows live RBAC, approved shared rows, gap status, review proof, metadata-only export, no-open-browse status, and can record the first eligible reviewed attestation from the same surface.

Corporate Verify now adds a next-action commander directly under the reviewer workbench. It chooses the current live database step across corporate login, request-by-email, professional approval, scoped rows, missing gaps, review attestation, snapshot, receipt, and metadata export, then exposes the primary action plus snapshot, receipt, and export controls.

Corporate Verify keeps the review queue command in the source/export packet, but the visible reviewer path now routes through the reviewer workbench and action bar first so the main database screen does not stack duplicate proof panels before the row list.

The signed-in console keeps the daily operator path lean: one dashboard front door, the setup center, and the active workspace surface. Release, readiness, and proof machinery stay exportable from their command buttons and packets without stacking into the first screen.

The signed-in and public portal shells include a final V1 overflow hardening layer so long commands, proof text, corporate grids, billing panels, admin exports, and login/register controls stay contained on desktop, tablet, mobile, and the VPS browser viewport.

The public website and login/register card are also kept buyer-facing: portal choice, pricing, first database write, required fields, and recovery actions stay visible first, while internal redirect/recovery receipts remain available in the bundle without crowding signup.

The hosted login/register card now starts with a public auth front desk so Professional users and Corporate admins can switch account type, login/register mode, pricing review, and recovery from one compact surface before entering credentials.

The public auth page now includes a Public portal flow map before the route board and form, showing Professional versus Corporate, register versus login, pilot pricing, first database write, landing dashboard, and hosted recovery in one bounded operator path.

The public login/register surface now also includes a Public portal route board that compares Professional user and Corporate company paths side by side: price, first database write, landing dashboard, and the scoped database boundary are visible before anyone submits credentials.

The public auth form now includes a Public portal acceptance checkpoint before server-save proof. It ties account choice, hosted auth, pricing, first database write, landing portal, scoped Corporate access, and saved server build into one exportable receipt before live pilot acceptance.

The signed-in app now opens with a premium launch console that separates Personal Passport, Corporate Verify, Company Admin, Account, Pricing, Database proof, and Server sync into one bounded command surface. This is the working first screen; dense proof receipts remain exportable without taking over the daily dashboard.

The first signed-in surface now also includes a V1 portal operating center before the dense boards. It gives Professional, Corporate Verify, Company Admin, Pricing, Account recovery/logout, and Database proof one visible next-action path with preview data rejected as completion proof.

The signed-in dashboard now adds a Portal daily navigator directly after the front door, with six plain actions for Personal, Corporate, Admin, Account, Pricing, and Database proof plus visible recovery, logout, and export controls. This gives operators one calm path before the deeper audit and database panels.

Signed-in Account now has a recovery control strip that keeps hosted redirect copy, resend verification, password reset, password update, sign out, and an exportable account packet together. The actions use the current session email when the email field is empty, so hosted verification and recovery tests do not depend on retyping credentials.

The public login form now includes a hosted auth recovery board before email actions. It shows the selected Professional or Corporate path, the hosted redirect URL, Supabase email-rate-limit guidance, resend/reset actions, localhost link repair guidance, and an exportable recovery packet so account verification does not accidentally return to local development.

The public login/register card now has a simplification layer that keeps the visible path focused on portal choice, route board, pricing, recovery, and the credential form. Older receipt panels remain in source for packet exports and CI markers, but they no longer crowd the buyer-facing signup flow.

Corporate setup now uses the same simplification rule: the visible workspace starts with one launch cockpit, one setup command bar, and one route deck. Duplicate helper panels for operator status, onboarding/pricing, team/billing handoff, and the older setup guide remain in source for export evidence but no longer crowd the daily company-admin path.

Corporate setup now also includes a triage board before the dense admin controls. It shows the current blocker across hosted login, corporate workspace, RBAC/admin access, team, billing, and scoped user database rows, then gives the direct action and exportable proof while rejecting preview data.

Corporate Verify now has a reviewer simplification layer too. The daily reviewer path keeps database home, front desk, access request, request list, and scoped user database visible first; duplicate walkthrough/proof panels remain source evidence for exports and CI without making reviewers hunt through repeated instructions.

Corporate Verify now also includes a database unlock path before the reviewer database home. It shows the live sequence from company workspace and reviewer RBAC to access request, professional approval, scoped rows, review attestation, metadata export, and the no-open-user-browse boundary.

Corporate Verify now includes an access request preflight directly before the request form. It checks corporate role, professional email, business purpose, review window, no-open-browse boundary, and live-row-only acceptance before a reviewer submits an access request.

Signed-in Account also includes an account portal route acceptance checkpoint. It proves hosted session, profile context, active workspace, role route, corporate workspace availability, recovery route visibility, and preview-data rejection before users treat portal routing as accepted.

Guided onboarding now includes an onboarding completion command that keeps hosted login, Professional Passport rows, Corporate workspace, pricing ledger, live database proof, persisted receipt, and export actions together before launch-gate review.

The signed-in dashboard now uses a reduced premium shell: the top header is work-app scale, the Portal route shell is the single visible daily start surface, and older front-door/daily command receipts stay hidden from the main path so Professional, Corporate, Pricing, Database proof, Account, and Server actions remain clickable without horizontal overflow.

The signed-in dashboard now includes a pilot journey checklist that orders the live path into hosted account, Professional Passport, Corporate workspace, pricing ledger, scoped user database, and server proof. It exports a packet and rejects preview data so operators can see the next required step before route-run acceptance.

The signed-in dashboard now starts daily work from a Portal route shell: Professional, Corporate Verify, Company Admin, Pricing, Account/logout, Database proof, and VPS freshness are tabbed in one bounded surface before older proof receipts. It keeps the corporate user database boundary visible and rejects preview data as completion proof.

The Portal route shell now includes a Server save commander inside the daily workspace. It shows whether GitHub `main` is saved to the VPS, the exact `/opt/trustgraph` manual update command, release-stamp proof, required deploy secrets for automatic save, and the protected VFIX route before the server is accepted as current.

The Portal route shell also includes a Current build server gate. It rejects the VPS as current until GitHub main is green, Pages smoke passes, the VPS release stamp returns commit JSON, the served bundle contains the current TrustGraph marker, and the protected VFIX route remains unchanged.

The public login/register flow exposes the same Current build server gate before credentials. If the VPS is stale, a buyer or pilot user sees the manual `/opt/trustgraph` sync command and knows not to treat the server as current yet.

That public server gate now includes a manual VPS sync launcher with a copyable `/opt/trustgraph` update command, release-stamp verification commands, Pages smoke context, and the VFIX protected-route boundary before anyone treats the server URL as ready for login testing.

The public login/register card now includes a route confirmation before submit. It restates the selected Professional or Corporate path, whether login or registration will create a database row, the landing portal, the Corporate scoped-access boundary, recovery action, and the no-preview-data rule.

The signed-in workspace now applies a daily SaaS route simplification layer: the tabbed Portal route shell is ordered directly after the header, oversized dashboard headings are reduced, account/logout and Corporate Verify controls stay bounded, and dense proof panels move below the primary route surface.

The public login/register card now applies the same simplification rule: account choice, Professional or Corporate switchboard, pricing/database-write confirmation, Corporate scoped-access boundary, and submit readiness appear before credentials while older audit receipts stay out of the primary form path.

Corporate Verify now applies a reviewer queue simplification layer: the user database reads as task, row-access outcome, reviewer workbench, filters, and rows first, while path receipts, proof chains, persisted acceptance, and export packets remain available below the working queue.

Corporate Verify now starts the user database with a Corporate review studio. It keeps request, approval, scoped rows, gaps, review attestation, metadata-only export, preview-data rejection, and no-open-user-browse proof in one bounded surface before filters or rows.

The signed-in portal now shows a Real row acceptance gate before the daily route shell. It blocks V1 acceptance until hosted login, registration, Passport, evidence, Corporate access, consent, team, billing, review, visibility snapshot, and release ledger rows are all loaded from Supabase; non-live preview rows are explicitly rejected.

The signed-in workspace now starts with a Portal launch matrix. It keeps Professional user, Corporate reviewer, Company Admin, pricing, account/logout, database proof, and server sync paths in one bounded first-screen surface before dense proof panels.

The hosted VPS workspace now also starts with a VPS saved portal command. It puts the live server target, GitHub source, server-save requirement, Professional portal, Corporate Verify, account/logout, pricing, database proof, and VFIX protection in one bounded command surface before dense dashboard panels.

The public login/register card now starts with an Account entry launchpad. It separates User registration, User login, Corporate registration, and Corporate login while keeping selected pricing, first database write, recovery, submit, server status, and the Corporate no-open-user-browse boundary visible before credentials.

The corporate setup center now includes a Corporate database handoff command. It connects company workspace, RBAC/team, pilot pricing ledger, access request, professional approval, scoped user rows, metadata export, and the no-open-user-browse boundary in one action path before deeper setup panels.

The public login/register card now starts with a compact start strip for Professional registration, Professional login, Corporate registration, and Corporate login. It keeps price, first live database write, landing portal, recovery, scoped Corporate access, server status, and no-preview-data proof visible before credentials.

The signed-in route shell now shows a VPS freshness checkpoint immediately after the tabs. GitHub source, Pages smoke, VPS release stamp, manual save command, required deploy secrets, and VFIX protection are visible before anyone treats the server as current. The VPS release stamp is exported as a real `trustgraph-release.json` asset, and the server updater overwrites it with the current Git commit so the freshness check fails clearly if the server returns the app shell instead of JSON.

The signed-in route shell now also includes a VPS save handoff before server freshness proof. It shows the green GitHub source, the `save-vps` automation blocker, missing deploy secrets, manual `/opt/trustgraph` update command, release-stamp JSON check, and VFIX boundary before anyone tests the VPS URL as current.

The signed-in workspace now includes an operator viewport polish layer. Oversized workspace headings are capped, Passport detail panels stack before tablet widths, active corporate/admin surfaces clip overflow, and mobile views keep controls readable without horizontal scrolling.

The V1 completion cockpit now includes a Real database launch gate before the detailed ledger. It makes the acceptance decision explicit: signed-in Supabase row groups, persisted completion receipt, working-data export, preview-data rejection, and VPS freshness must be resolved before V1 review.

V1 completion now also starts with a command center before the detailed completion plan. It summarizes registration, live row groups, completion receipt, VPS freshness, the next missing live-row step, and direct receipt/export actions so operators can finish the live database path without hunting through the ledger.

V1 completion now includes a Live data acceptance contract before human launch gates. It rejects non-live preview data, requires signed-in Supabase row groups, a persisted real-database completion receipt, metadata-only working-data export, and the VPS release-stamp check before anyone treats V1 as done.

The public login/register form now shows a visible auth route summary immediately before the input fields, so Professional users and Corporate admins can confirm account type, login/register mode, pricing path, first database write, and landing portal before submitting.

The public auth card now adds a Public access desk directly before the email and password fields, with one place to switch Professional or Corporate, Register or Login, review pricing, see required fields, confirm the first live database write, and choose recovery before typing.

The public login/register card now starts with a Public auth experience studio. It keeps Professional, Corporate, Register, Login, pricing, first database write, recovery, submit, and server-save status in one premium bounded surface before dense receipts or credential fields.

The public login/register card now starts with a Public portal route shell. Professional, Corporate, Register, Login, pricing, first database write, landing portal, recovery, and server-save status are contained in one bounded surface, while older proof panels stay out of the primary credential path.

The public login/register card now includes a visible Submit readiness strip before the deeper proof receipts. It shows whether the current Professional or Corporate path has the required fields, first database write, completion status, recovery availability, and preview-data rejection before the user submits auth.

The public login/register card now also includes one visible portal switchboard for Professional login, Corporate login, Professional registration, Corporate registration, pricing review, and password recovery before older proof receipts, so users do not have to decode dense audit panels to choose the right path.

The public auth card now includes a Corporate access route preview before credentials. It explains that a company creates a workspace, activates the pilot ledger, requests access by professional email, waits for professional approval, and reviews only approved scoped rows; there is no open user database browse path.

Billing now starts with a Pricing activation workbench. Corporate plan, seats, projected monthly price, live Supabase subscription ledger, quote receipt, billing decision, Stripe gate, and export are visible before deeper billing receipts.

Professional Passport evidence now starts with an Evidence setup command. Metadata, private file attachment, signed preview/download proof, manifest export, and raw-file exclusion are visible before the document list, so the evidence path works even when the selected record has no files yet.

Admin Audit now starts with an Admin export launcher. It recommends CSV, JSON, coverage, or readiness export from the current filters and keeps case context, data-rights context, release ledger context, raw-file exclusion, and preview-data rejection visible before the dense audit table.

The public auth form also starts with a Registration route planner that keeps Professional versus Corporate, Register versus Login, price, first database write, next dashboard, recovery, and required proof in one compact operator view before the form fields.

The public auth form now includes a registration completion handoff after submit. Professional completion is tied to `passport_initialized`; Corporate completion is tied to `workspace_created`, and both show hosted verification, landing dashboard, next action, and preview-data rejection.

The public auth form now keeps the Registration outcome command visible before completion handoff. It shows selected portal and mode, required fields, price, first database write, required registration-intent completion row, landing portal, recovery availability, server freshness, and export/submit actions before credentials are accepted.

The public website now includes a hosted build source contract before login. It makes GitHub `main` the source of truth, GitHub Pages the green bundle check, the VPS release stamp the server proof, and the VFIX route an explicitly protected separate deployment so stale server saves cannot be mistaken for current code.

The public pricing section now includes a Pricing and access summary before the seat estimator, connecting the free Professional pilot, `$149` Corporate Verify pilot, first database write, scoped Corporate user access, and Stripe-off billing boundary in one visible buyer decision point.

The public pricing section now also includes a Pricing launch decision before the estimator. It shows the Professional free path, Corporate `$149` pilot path, selected first database write, and Stripe-off billing boundary with direct Professional, Corporate, and export actions before signup.

The public portal launch checklist now includes a pre-signup acceptance gate. It shows portal choice, hosted auth readiness, selected price, first database write, Corporate scoped database boundary, live-data contract, and VPS release-stamp requirement before pilot testing starts.

Billing now starts with a Billing launch board that keeps the corporate pilot plan, selected seats, live Supabase subscription ledger, pricing quote receipt, payment decision receipt, and Stripe-off gate visible before deeper billing evidence panels.

Billing now also includes a paid-launch decision bridge before the acceptance checkpoint. It separates live pricing proof from the human-gated Stripe, tax, invoice, customer portal, refund, dunning, and payment webhook decisions that must be approved before payment collection.

The signed-in workspace now starts with a Portal daily command center that keeps login/logout, Professional Passport, Corporate Verify, Account, Pricing, live database proof, and VPS sync actions visible in one bounded mobile-stacked surface before the dense evidence panels.

The signed-in database path now adds a Live data loading command before the real-row gate. It shows the next missing Supabase row group, live row counts, preview/fixture rejection, hosted login state, and direct actions for login, live pilot seed, proof view, or export.

The public website login area now starts with a Public login command center. Professional versus Corporate, Register versus Login, price, first live database write, recovery, landing portal, scoped Corporate database boundary, and server-save status stay visible before credentials.

The public login/register card now adds a visible Account access path before the older route shell. It gives four plain choices for Professional login, Corporate login, Professional registration, and Corporate registration, then keeps pricing, first database write, landing portal, recovery, and VPS server status in one bounded command surface before credentials.

Billing also includes a Billing pilot acceptance checkpoint that ties the live pricing catalog, selected seats, projected totals, live subscription ledger, quote receipt, payment decision receipt, Stripe-off boundary, and preview-data rejection into one exportable packet before paid launch work.

Billing now applies a Billing choice simplification layer. Pricing choice, activation workbench, launch board, pilot acceptance, and paid-launch gate are ordered before quote receipts, Stripe decision receipts, architecture receipts, and ledger exports, with mobile-stacked controls.

Corporate team setup now starts with a Team launch board that keeps admin readiness, first reviewer invite, pending acceptance, accepted roster review, filtered invitation export, and database handoff visible before the dense invitation table.

Corporate Verify now includes a request-to-row rail before directory filters, showing the reviewer exactly where they are across request, professional approval, scoped rows, attestation, visibility snapshot, and metadata-only export.

Corporate Verify now also starts the user database with a Reviewer task command. It turns request, approval, scoped rows, gap follow-up, review attestation, and metadata export into one visible clickable workflow with no open user browsing.

Corporate Verify now includes a visible rows handoff for the approval-to-review transition. It tells reviewers whether they are waiting for approval, synced rows, consent coverage, review attestation, gap resolution, or scoped export, while preserving the no-open-user-browse boundary.

Corporate Verify now adds a row access outcome command directly after the reviewer task command. It answers whether Corporate can access approved user rows, shows the live Supabase/RBAC source, visible row count, review proof, persisted snapshot and receipt status, and gives the next click without exposing open user browsing or raw private files.

Corporate Verify now includes a persisted export gate after the review handoff. It keeps metadata export blocked until the reviewer has live rows, a review attestation, a saved database access receipt, a saved visibility snapshot, and the raw-private-file exclusion boundary.

Corporate Verify also includes a Missing-record cross-portal checkpoint that ties corporate requests, Professional Passport handoff, open gap status, scoped rows, review attestation, metadata-only export, and preview-data rejection into one visible proof before handoff.

Corporate Verify’s database action cockpit remains available as exportable proof, while the visible database workbench now carries the direct controls for reviewing scoped rows, saving the visibility snapshot, recording the database access receipt, and exporting the scoped metadata packet.

Corporate Verify now also includes a persisted database acceptance checkpoint in the source/export evidence. The daily reviewer screen keeps that acceptance proof behind the workbench actions while still requiring live corporate RBAC rows, approved shared user rows, review attestation, persisted database access receipt, persisted visibility snapshot, and metadata-only export before the corporate user database path can be accepted.

Corporate Verify now keeps the live row proof chain as metadata evidence behind the reviewer workbench. The operator still proves active corporate RBAC, email-based access requests, approved grants, scoped user rows, reviewer attestation, visibility snapshot, and metadata-only export status, without forcing those proof cards into the primary row-review path.

Billing now starts with a pricing choice rail that summarizes selected plan, seats, projected monthly price, live pilot ledger state, saved quote receipt, Stripe gate, and pricing packet export before the deeper billing receipts.

Passport record detail now starts evidence work with an evidence access desk: preview, download, metadata manifest export, access packet export, signed URL expiry, metadata-only boundaries, and last-link proof are visible before deeper evidence receipts.

Passport evidence now includes an Evidence action queue before the evidence table. It routes add metadata, signed preview, signed download, metadata-only manifest export, and evidence packet export from one bounded surface while keeping raw private files excluded and preview data rejected.

Evidence preview/download now includes a signed evidence acceptance checkpoint: metadata rows, private file presence, short-lived signed preview/download proof, manifest export, and raw private file exclusion must all be visible before an evidence packet is accepted.

Admin now includes an operations acceptance checkpoint that ties verification cases, data-rights requests, filtered audit exports, release ledger context, Security/RLS runbook proof, and preview-data rejection into one exportable V1 packet.

Admin readiness now starts the human launch section with a Launch decision board. It keeps Stripe/payment, security/legal, pilot-owner, and VPS cutover decisions visible above the detailed production gate cockpit, and keeps production payments plus regulated traffic blocked until those human approvals are recorded.

The signed-in dashboard now starts with a Portal UX command center. It gives separate first-screen actions for user login/Passport, Corporate setup/register, Corporate Verify scoped database review, pricing, account recovery/logout, live database proof, and server sync before dense proof panels.

The signed-in dashboard now includes a pilot journey rail that walks account, Professional Passport, company setup, Corporate Verify scoped access, pricing, database proof, and VPS server save in one bounded sequence.

The public login/register page now includes a Public access command center before credentials. It makes Professional registration, Professional login, Corporate registration, Corporate login, pricing, first database write, landing portal, and the no-open-user-browse Corporate boundary visible in one premium command surface.

Public auth now includes a Public entry sequence after the access command. It shows the exact order from route choice to credentials, hosted email verification, correct portal landing, and Corporate scoped database access before submit.

Corporate Verify now includes a reviewer workflow strip before directory rows. It gives reviewers one sequence for request, approval, scoped rows, review attestation, visibility snapshot, and metadata export while keeping open user browsing blocked.

Corporate Verify now includes a scoped access journey before the workflow strip. It explains request by professional email, professional approval, visible scoped rows, review attestation, filtered visibility snapshot, metadata-only export, and no-open-user-browse in one board.

Billing now starts with a pilot package board that explains Professional Passport free pilot, Corporate Verify pilot pricing, Scale human quote, live ledger and quote proof, scoped Corporate database access, and the Stripe/payment human gate before payment work.

V1 readiness now includes a pilot route run checkpoint that proves the hosted path from website and auth through Professional rows, Corporate workspace, pricing ledger, scoped user database access, Admin proof exports, and VPS freshness before pilot acceptance.

V1 pilot route run receipts are now persisted in Supabase so the route checkpoint can be recorded as an audited live database row, not only exported as a local JSON packet.

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
- `053_pricing_quote_receipts.sql`: corporate/admin pricing quote receipts that persist selected seats, projected monthly and annual totals, active ledger count, and Stripe Checkout disabled status for pricing review.
- `054_onboarding_wizard_receipts.sql`: signed-in onboarding wizard receipts that persist hosted login, account context, Professional, Corporate, pricing, user database, and preview-data rejection progress.
- `055_auth_recovery_receipts.sql`: signed-in auth recovery receipts that persist hosted redirect proof, email rate-limit guidance, localhost link repair, selected portal, and owner-scoped recovery actions.
- `056_security_rls_review_receipts.sql`: signed-in security/RLS review receipts that persist CI RLS coverage, private evidence review boundary, RBAC/audit/export status, open security items, and the production-traffic block until external signoff.
- `057_pilot_owner_readiness_receipts.sql`: signed-in pilot owner readiness receipts that persist named customer, onboarding, support, and incident-owner coverage while production traffic remains blocked until human signoff.
- `058_real_database_completion_receipts.sql`: signed-in real database completion receipts that persist hosted login, registration, corporate workspace, pricing, user database access, evidence, consent, team, review, release, owner receipt coverage, and preview-data rejection.
- `059_corporate_database_visibility_snapshots.sql`: active corporate reviewer snapshots that persist filtered Corporate Verify user-database visibility, readiness buckets, row inventory, review attestations, raw private file exclusion, preview-data rejection, and audit history.
- `061_pilot_named_operator_aliases.sql`: pilot-named compatibility RPC aliases for Access Grant request, reviewer, verifier, issuer, verification case, and Connect client setup so live pilot flows do not depend on legacy sample/demo naming.
- `062_v1_pilot_route_run_receipts.sql`: signed-in V1 pilot route run receipts that persist website/auth, Professional, Corporate, pricing, scoped user database, Admin export, VPS freshness, missing-step, and preview-data rejection proof.
- `060_pilot_visibility_snapshot_seed.sql`: extends the live pilot seed path with a Corporate Verify visibility snapshot RPC so one hosted seed run reconciles Passport, evidence, Access Grant, consent, review attestation, billing, team, and filtered user-database visibility rows.

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
19. Record and export the pricing quote receipt, pricing structure packet, and billing architecture decision packet to prove configured plans, selected-seat projections, active ledger subscriptions, and Stripe launch gates.
20. Export the v1 completion audit packet from Admin to review all 13 tracks, locked profile scope, evidence exports, verification gates, and remaining human decisions.
21. Export the auth redirect readiness packet before invite testing to prove hosted redirect settings, email limits, TrustGraph VPS target, and VFIX isolation.
22. Use the source-grounded advisory card to review deterministic next actions from authorized records and workflow queues.
23. Admin audit trail shows recent material workflow events and exports the full audit and verification history packet.
24. Use the Launch checklist to seed a live pilot workspace when you need database-backed pilot data instead of front-end preview data.
25. Review seed reconciliation to confirm seeded Passport, evidence, Access Grant, corporate review attestation, consent, subscription, and corporate member rows match the live repository loads.
26. Export the working-data packet to prove the currently loaded Passport, Access Grant, corporate review attestation, consent, subscription, team, and invitation rows plus the live database repair queue.
27. Export the V1 operating map packet to confirm the pilot path from public website through server release is understandable.
28. Export the server release save path packet, then update the VPS from `/opt/trustgraph` with `bash tools/update-vps-from-github.sh`.
29. Record and export the onboarding wizard receipt and V1 live database readiness receipt from Admin after signed-in Supabase rows load for Professional, Corporate, pricing, scoped database access, registration, review, and release proof.
30. Export the V1 human gate separation packet from the completion command center to confirm code/live-row readiness is separated from pilot-owner, Stripe, security/storage, legal, and VPS launch approvals before production traffic.

## Live Database Status

Live Supabase migrations are applied through `062_v1_pilot_route_run_receipts.sql`, including corporate member-management controls, corporate Access Grant requests by professional email, first-class locked-scope record categories, consent authorization records, sensitive-record privacy controls, the Admin release migration ledger, authenticated pilot workspace seeding, database-backed production gate tracking, constrained gate decision statuses, operator-named pilot workflow RPCs, pilot-named compatibility aliases, a protected pilot launch contact register, issuer credential update/revocation lifecycle, dispute and data-rights workflows, the TrustGraph VPS cutover gate, corporate user-database review attestations, the migration 042 organization RLS recursion repair required for corporate account context, the migration 043 account-context RPC required after hosted login, registration intent completion states for `workspace_created` and `passport_initialized`, persisted V1 live database readiness receipts, persisted Corporate Verify database-access receipts, persisted Corporate Verify visibility snapshots for filtered user-database rows, seeded Corporate Verify visibility snapshots for one-action pilot reconciliation, persisted evidence access receipts for preview/download signed URLs, persisted metadata-only data export package receipts, persisted metadata-only data export package manifests, persisted billing architecture decision receipts for the human-gated Stripe boundary, persisted pricing quote receipts for corporate pricing review, persisted onboarding wizard receipts for guided launch progress, persisted auth recovery receipts for hosted verification, recovery, and localhost-link repair proof, persisted security/RLS review receipts for CI coverage, open security items, and external signoff gating, persisted pilot owner readiness receipts for customer, onboarding, support, and incident-owner signoff proof, persisted real database completion receipts for the full live-row path, and persisted V1 pilot route run receipts for the hosted website-to-VPS pilot route.

## Public Website and Pricing

Unauthenticated visitors land on a public TrustGraph website with portal entry points, pricing, and registration:

- Professional: free Passport foundation for records, evidence uploads, Access Grants, and references.
- Corporate Verify: `$149/month` pilot tier for corporate RBAC, shared Passport review, missing-record requests, and audit.
- TrustGraph Scale: custom/enterprise tier for issuer workflows, Connect API clients, webhooks, and compliance operations.

Corporate registration collects organization name, domain, and type, then provisions an employer or staffing agency portal after Supabase account creation and verified hosted login. Pricing cards now show the database path for each portal so buyers can see what is written immediately and what remains human-gated. The V1 operating map shows the sequence from website to Professional registration, Corporate registration, pricing ledger, Corporate Verify user database access, and server release. The pricing quote receipt records selected seats, projected monthly and annual totals, active ledger count, and Stripe Checkout disabled status; the billing architecture decision packet and database receipt record the v1 choice to keep Supabase subscription ledger activation live while Stripe Checkout, customer portal, invoices, refunds, dunning, taxes, and payment webhooks wait for human approval.

The public login and registration card keeps account recovery visible in the main form: resend verification, reset password, and copied hosted-link repair stay beside the credentials while the heavier proof receipts remain hidden from the first-screen buyer/user path.

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
