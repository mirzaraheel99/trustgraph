# TrustGraph — UI/UX Redesign & Implementation Plan
**Role:** design/architecture plan only. No code in this document. Codex implements.
**Sources reviewed:** repo README (`mirzaraheel99/trustgraph`, Next.js + React + TS + Lucide, `src/database.ts`, `src/supabase.ts`, 65 Supabase migrations, `docs/01–28`, `UI_COPY_HANDOFF.md`, `V1_READINESS_CHECKLIST.md`) and the live VPS site.

---

## 1. UI/UX diagnosis

### 1.1 The single biggest problem: the UI is a changelog, not a product
The live public page contains **40+ stacked "command / desk / hub / runway / cockpit / answer / verdict / gate / checkpoint" panels that all say roughly the same five facts**: choose Professional or Corporate, register or login, $0 / $149, "first live database write", "no open user database browse". Each past iteration added a new surface instead of replacing the previous one. Same pattern signed-in (portal desk + route shell + launch matrix + daily runway + mission control + real-row gate + completion cockpit).

Consequences:
- The most important 3 actions are buried under ~20 screens of repetition.
- Users read the same sentence 12 times and trust it less each time.
- No visual hierarchy is possible, because everything is a panel of equal weight.
- Nothing feels premium, because premium reads as *restraint*.

**Rule for this redesign: one job, one surface, one time.** Every fact appears on exactly one screen at exactly one level of prominence.

### 1.2 Engineering proof is leaking into the product
Machine identifiers are rendered as user-facing copy — e.g. `public_audience_switchboard_explains_professional_corporate_and_operator_paths...`. Visitors also see VPS release-stamp status, `/opt/trustgraph` shell commands, `trustgraph-release.json`, the protected VFIX route, Supabase table names, and email rate-limit internals. This is *internal operational telemetry on a public marketing page*. It reads as unfinished and, worse, as a security-posture smell to an enterprise buyer.

Server/deploy proof must move to **Admin → Operations → Release**, behind auth. CI markers should be assertions in tests and `data-*` attributes, not visible strings.

### 1.3 The product story is missing
The site explains *database effects*, not *value*. A visitor learns which tables get written before learning what TrustGraph does for them. There is no plain-language "what / for whom / why it's safer" above the fold, no product screenshot, no proof of the two-sided model in a single glance.

### 1.4 Login/register
Register/login exists as an enormous page section rather than a header action plus a focused auth route. There is no persistent header `Log in` / `Get started`. Recovery, rate-limit help, redirect repair, and server status are stacked into the credential form, so the form is the least prominent thing on the page that contains it.

### 1.5 Professional vs Corporate confusion
Both paths are described everywhere simultaneously, in parallel, at equal weight, dozens of times. The user must disambiguate on every screen instead of choosing once and then seeing only their own path. Corporate also has three overlapping concepts (company workspace, RBAC, Corporate Verify scoped access) that are never separated into distinct places.

### 1.6 The signed-in app is a proof ledger
Receipts, gates, verdicts, attestations, snapshots, packets, and export buttons dominate. There is no "you are here, do this next." Dense multi-value grids inside cards create overflow at tablet width, which the repo has patched repeatedly with "overflow hardening" and "clarity lock" layers — a symptom of unbounded content, not of missing CSS.

### 1.7 Visual system
Dark, heavy, high-contrast panels with glassy borders and glow, many nested cards, near-uniform type sizes, no whitespace rhythm, and no consistent status color language. There is no shared token layer joining site and app.

### 1.8 Diagnosis summary (ranked by impact)
1. Duplicate surfaces — delete/merge ~80% of panels.
2. Internal proof on public pages — move behind auth.
3. No product explanation above the fold.
4. Auth not in the header, no dedicated auth route.
5. Role paths not separated post-choice.
6. Dashboard has no next-best-action; receipts dominate.
7. Corporate concepts (org / RBAC / scoped access) conflated.
8. No shared design token layer → site and app look like different products.

---

## 2. Key questions for you before implementation

Answer these and the plan becomes exact. Suggested defaults in brackets.

**Product & audience**
1. Who is the primary Corporate buyer — staffing agency ops, HR/talent, or compliance? [staffing + compliance]
2. Which industry do we lead with in copy: healthcare/clinical, construction/trades, or general? Trust language differs a lot. [healthcare/clinical]
3. Is "Passport" the customer-facing name, or internal? [customer-facing]

**Scope of the redesign**
4. Am I allowed to *delete* duplicate UI surfaces outright, or must every existing panel remain reachable somewhere? (This is the single most consequential answer — if all must remain, they go to an Admin → Evidence archive route.) [delete from primary paths, archive the exportable ones under Admin]
5. Do CI checks assert on visible strings/panel ids? If yes, list them; those become `data-testid` attributes rather than visible copy.
6. Is a redesign of the public site and app in one pass acceptable, or is the site first? [site first, then app shell, then modules]

**Auth & routing**
7. Should Professional and Corporate share one auth form with a role toggle, or have separate `/register/professional` and `/register/corporate` routes? [separate routes, one shared login]
8. Where should a user land post-login when they belong to both a personal Passport and a company? [workspace switcher, remembers last]

**Commercial**
9. Is $149 per seat/month or per company/month? The live page shows both readings (`$149 pilot monthly per seat` vs `Corporate Verify pilot is $149 monthly`). Must be resolved before pricing UI.
10. Should the seat estimator stay public, or move behind Corporate signup? [move to billing, keep a simple 3-tier public grid]
11. Public "Scale" CTA: contact form, email, or Calendly? [contact form writing to Supabase]

**Content**
12. Can we use real product screenshots of the redesigned app for the site preview blocks, or should they be stylised UI illustrations? [real screenshots once the app shell lands]
13. Do you have a logo/wordmark file, or should the plan include a wordmark treatment? 
14. Any compliance claims we may make in copy (SOC2, GDPR/UK GDPR, DPA available)? Do **not** invent these.

**Non-negotiables**
15. Anything in the current UI you consider load-bearing and off-limits to move?

---

## 3. Recommended information architecture

### 3.1 Public (unauthenticated)
```
/                     Home (product story, both paths, product preview, pricing teaser, trust)
/professionals        Professional value page → Create Passport
/corporate            Corporate Verify value page → Start Corporate Verify
/pricing              3 tiers + FAQ
/security             Privacy, consent, evidence handling, RBAC, audit, data rights
/how-it-works         The record → grant → review model in 3 steps
/contact              Scale / enterprise enquiry
/login                Single login
/register/professional
/register/corporate
/recover              Forgot password / resend verification / link repair (one route, not a panel)
/legal/*              Terms, privacy, DPA
```

### 3.2 Signed-in app (`/app/...`)
```
/app                          Dashboard (role-aware, one next best action)
/app/passport                 Professional Passport
      /overview               readiness + record summary
      /records                identity, work, credentials, references, training
      /records/:id            record detail + evidence
      /evidence               evidence library (metadata, signed preview/download)
      /consent                consent authorisations + sensitive-record controls
      /grants                 Access Grants (requests, approved, revoked, history)
      /requests               missing-record requests from companies
      /exports                packets the professional can generate
/app/verify                   Corporate Verify (scoped review)
      /queue                  review queue (default landing)
      /requests               access requests (create, pending, declined)
      /professionals/:id      approved scoped record view
      /gaps                   missing-record requests raised
      /exports                metadata-only exports
/app/company                  Company Admin
      /overview               workspace status
      /members                team + roles
      /invitations
      /roles                  RBAC matrix
      /audit                  company-scoped audit
/app/billing                  Plan, seats, ledger, quotes, invoices (gated)
/app/settings
      /profile
      /security               password, sessions, recovery, email
      /notifications
      /data-rights            export / closure requests
/app/admin                    TrustGraph internal only (role-gated, not shown otherwise)
      /operations             verification cases
      /security               RLS review, security items
      /audit                  full audit + exports
      /release                VPS/GitHub release proof, release ledger, gates
      /connect                API clients, webhooks
      /evidence-archive       preserved legacy proof panels + packets (see Q4)
```

**Principle:** the left rail shows only the sections the current role can act on. A Professional with no company never sees `/app/company` or `/app/verify`. An internal operator sees `/app/admin`.

---

## 4. Public website structure

### 4.1 Home page, in order (this is the whole page — nothing else)

1. **Header (sticky, 64px):** wordmark · How it works · For professionals · For companies · Pricing · Security · | **Log in** (text button) · **Get started** (primary). Mobile: hamburger, but `Log in` stays visible.

2. **Hero (above the fold, ~560–640px):**
 - Eyebrow: `Workforce records` 
 - H1: *"Verified work records, owned by the worker."*
 - Sub (max 2 lines, ~24ch–90ch): *"Professionals keep one private record of identity, work history, credentials, references and evidence. Companies request access to just what they need — with consent and a full audit trail."*
 - Two CTAs side by side: **Create your Passport** (primary) · **Start Corporate Verify** (secondary outline). Each with a one-line qualifier beneath: *Free for professionals* / *$149 pilot*.
 - Right / below: **one** product preview image (the real Passport overview). No stats, no ledgers, no status strips.

3. **Two-path split (one row, two cards, once on the whole site):**
 - *I'm a professional* → what you get (4 bullets) → `Create Passport`
 - *We're a company* → what you get (4 bullets) → `Start Corporate Verify`

4. **How it works — 3 steps, horizontal, illustrated with UI crops:**
 1) Build the record 2) Approve a scoped request 3) Company reviews, everything is logged.
 Include the boundary statement **once**, as a calm line under step 3: *"Companies never browse the user database. Access is requested by email and granted per record."*

5. **Product preview band:** 2–3 real app screenshots with a short caption each (Passport overview · Review queue · Access grant). This is where "the app looks premium" gets sold.

6. **Trust & privacy:** four short columns — Owner consent · Private evidence storage · Role-based access · Audit trail. Link → `/security`.

7. **Pricing teaser:** three compact cards ($0 / $149 / Custom), one line each, `See full pricing`. No estimator, no database-path copy, no Stripe-gate copy.

8. **Closing CTA band + footer.**

### 4.2 What is removed from the public site
Audience switchboards, portal launch maps, route boards, decision matrices, entry sequences, submit-readiness strips, acceptance gates, server freshness alerts, release-stamp panels, VPS sync commands, VFIX references, Supabase table lists, registration-intent copy, email rate-limit explanations, raw snake_case marker strings, export buttons. Their content survives as: (a) one sentence in the relevant section, (b) `/security` content, or (c) Admin → Release / Evidence archive.

### 4.3 The 10-second test, mapped
| Question | Answered by |
|---|---|
| What is TrustGraph? | Hero H1 + sub |
| Am I professional or corporate? | Hero dual CTA + two-path split |
| Where do I register/login? | Header `Log in` / `Get started`, always visible |
| What does it cost? | Hero CTA qualifiers + pricing teaser |
| What happens after login? | Product preview band screenshots |

---

## 5. Login / register placement and flow

**Placement**
- Header, top right, on every public page: `Log in` (tertiary) + `Get started` (primary). Never below the fold; never a page section.
- `Get started` opens a small role chooser (two tiles) → routes to `/register/professional` or `/register/corporate`.

**Auth page layout (shared shell)**
- Centered card, max 420px, on the off-white ground. Left/behind: nothing. No proof panels.
- Card contents, in order: wordmark → title → 2–4 fields → primary submit → single secondary link row (`Forgot password?` · `Need an account?`).
- Corporate registration is **two steps**: (1) email + password, (2) organisation name, domain, org type. Step 2 shows a progress indicator. Do not put six fields in one card.
- Post-submit: a dedicated "Check your email" state — hosted-link explanation *in plain language*, one `Resend` button with a cooldown timer (which encodes the 2/hour limit instead of explaining it), and `Wrong email? Start over`.

**Recovery (`/recover`)**
- One route, three states: request reset · resend verification · paste-a-broken-link repair (collapsed under `My link opened localhost` — advanced disclosure).
- Copy is user-language: "Your email link went to the wrong address" — not "localhost redirect repair".

**Post-auth routing**
- Professional → `/app` (Passport-led dashboard).
- Corporate admin, workspace not yet created → `/app/company/overview` in setup mode.
- Corporate admin, workspace ready → `/app` (Verify-led dashboard).
- Multi-context user → last used workspace; switcher in the top-left of the app shell.

**Auth preserved (do not change):** Supabase `signUp`, `signInWithPassword`, `signOut`, `resend`, `resetPasswordForEmail`, `updateUser`, redirect URL env var, registration-intent write + completion RPCs. Only presentation moves.

---

## 6. Signed-in web app layout

**Shell (persistent):**
- **Left rail, 256px, collapsible to 64px.** Top: workspace switcher (avatar/initial + workspace name + chevron; lists "Personal Passport" and each company). Then nav groups:
 - *Work*: Dashboard · Passport · Verify (role-gated)
 - *Company*: Overview · Members · Roles · Audit (role-gated)
 - *Account*: Billing · Settings
 - Footer of rail: Help · Admin (internal only).
- **Top bar, 56px:** breadcrumb / page title on the left; on the right: search (later), notifications bell, avatar menu → Profile, Settings, **Sign out** (always one click from any screen).
- **Content area:** max-width 1200px, 24/32px gutters, single column of stacked *sections* (not a grid of equal cards).

**Dashboard (role-aware), in order:**
1. **Next best action** — one wide panel: what to do now, why, one primary button. Deterministic priority order per role (see §7/§8). Never more than one primary.
2. **Readiness / status row** — 3–4 compact stat tiles (not cards with 8 values). Professional: Passport completeness %, records, pending grant requests, expiring credentials. Corporate: open requests, awaiting approval, rows to review, gaps outstanding.
3. **Your queue** — a real table of the 5 most relevant items with row actions.
4. **Recent activity** — 5 lines, plain language, `View all` → audit.
5. Nothing else. Receipts, packets, gates, server proof: not on this screen.

**Where the "proof" machinery goes:** each module gets an `Exports` tab; operational/deployment proof goes to `/app/admin/release`; per-action receipts become *confirmation toasts + a row in an activity/history table*, not standing panels.

---

## 7. Professional Passport portal structure

**`/app/passport/overview`**
- Header: name, Passport readiness ring (%), `Share / Grants` shortcut.
- **Readiness checklist** — the primary object on this screen: 6 rows (Identity, Work history, Credentials, References, Training, Evidence), each with state (Complete / Needs attention / Empty), count, and an inline action. This replaces the wizard-plus-hero-plus-command stack.
- Alerts strip (only when non-empty): expiring credentials (45-day), disputed records, pending corporate requests.

**`/app/passport/records`** — one table, filterable by type/status/sensitivity. Columns: Record · Type · Period · Evidence · Status · Shared with · Updated. Row click → detail drawer or page.

**Record detail** — two columns: left, the record fields; right, evidence list + consent + sharing state + activity. Evidence actions are **row-level buttons** (`Preview`, `Download`), with expiry shown as a quiet caption ("link valid 5 min"), not a proof panel.

**`/app/passport/evidence`** — metadata table of all evidence: File · Linked record · Type · Size · Uploaded · Actions. Banner (one line): *"Files are stored privately. Companies see metadata only unless you approve."*

**`/app/passport/consent`** — consent authorisations table + sensitive-record toggles + revoke. Each row: Scope · Granted to · Granted on · Expires · Revoke.

**`/app/passport/grants`** — three tabs: **Requests** (needs your decision — the action) / **Active** / **History**. Approve flow is a modal that shows exactly which records will be shared, with per-record checkboxes and a review window. This is the trust moment of the whole product; give it room.

**`/app/passport/requests`** — missing-record requests from companies, each with `Add record` / `Decline`.

**`/app/passport/exports`** — list of available packets (renewal readiness, confidentiality review, skills evidence, data export) as rows with a description and one `Generate` button. No receipts on screen; generated items appear in a history table below.

**Next-best-action priority (Professional):** verify email → complete identity → add first work record → attach evidence → respond to pending grant request → resolve missing-record request → renew expiring credential → all clear (show "Passport up to date" + share CTA).

---

## 8. Corporate Verify portal structure

**Landing = `/app/verify/queue`** (a reviewer's job is a queue, not a cockpit).

**`/app/verify/queue`**
- Header: org name · your role badge · `Request access` (primary).
- **Scope banner, one line, always visible, never repeated elsewhere:** *"You can only see records a professional has approved for this workspace."*
- Table: Professional · Requested · Approved on · Records shared · Gaps · Review window ends · Status · Action. Filters: status, reviewer, expiry, record type. Bulk select → `Mark reviewed`.

**`/app/verify/requests`** — create a request (professional email, purpose, record types, review window) and see pending/declined. Preflight validation is **inline field validation**, not a preflight panel.

**`/app/verify/professionals/:id`** — the scoped record view: left, the professional's shared records grouped by type; right, grant scope, consent state, review window, `Record review`, `Request missing record`, `Export metadata`. Evidence shows metadata + signed preview only where consent allows; raw files never listed.

**`/app/verify/gaps`** — missing-record requests raised, with state and professional response.

**`/app/verify/exports`** — metadata-only exports; the export button is disabled with a tooltip naming the missing precondition (live rows, attestation, receipt), replacing the standing "export gate" panel.

**Boundary communication (say it twice total, not twenty times):** the one-line scope banner on the queue, and a short paragraph in `/security` publicly. Everything else is enforcement, not copy.

**Next-best-action priority (Corporate reviewer):** join/activate workspace → activate pilot plan → send first access request → await approval → review approved rows → resolve gaps → record attestation → export → all clear.

---

## 9. Company Admin / RBAC structure

**`/app/company/overview`** — setup checklist when incomplete (Workspace created · Plan activated · Reviewers invited · First access request), collapsing to a compact status summary once done. Then: workspace details (name, domain, type, edit), plan/seat summary with `Manage billing`.

**`/app/company/members`** — table: Member · Email · Role · Status · Last active · Actions (change role, suspend, restore, remove). `Invite member` primary → modal (email + role + optional message).

**`/app/company/invitations`** — pending / accepted / expired tabs; resend, revoke, copy link.

**`/app/company/roles`** — an actual **RBAC matrix**: roles as columns, capabilities as rows, checkmarks. Capability rows in plain language ("Request access to a professional", "Review approved records", "Export metadata", "Manage members", "Manage billing"). This is the single artefact that makes RBAC understandable; it replaces every RBAC status panel.

**`/app/company/audit`** — company-scoped audit table with filters and one `Export` action.

---

## 10. Billing / pricing structure

**Public `/pricing`** — three cards, identical anatomy: name · who it's for · price · 5 feature bullets · CTA. Below: a short FAQ (What's in the pilot? · Is payment collected now? · Can I change seats? · What happens to my data?). One quiet line: *"Card payment isn't enabled during the pilot — we'll set up billing with you."* No estimator, no ledger, no Stripe-gate table.

**App `/app/billing`**
- Current plan panel: plan name, seats used/purchased, projected monthly, status badge, `Change plan`.
- Seats: stepper + projected monthly/annual, `Save quote` (writes the existing quote receipt row — no receipt UI panel; a toast plus a row in Quote history).
- Quote history table.
- Invoices/payments section rendered as an **empty state**, not a gate panel: *"Payment collection isn't enabled yet."* + `Talk to us`.
- Keep all existing writes: `organization_subscriptions` activation, `pricing_quote_receipts`, `billing_architecture_decision_receipts`. Only the presentation changes; the Stripe-disabled boundary becomes an empty state and a disabled control, not a wall of copy.

---

## 11. Evidence / export / audit structure

Treat these as three tools, each in one place, each looking like a normal SaaS data table.

**Evidence (Professional; scoped view for Corporate)**
- Table of metadata. Actions: `Preview` (signed URL, opens viewer), `Download` (signed URL), `Copy manifest`.
- Signed-link expiry is a caption, not a panel. Last-link proof becomes a row in the record's activity list.
- Rules shown once, as one banner line per surface: private storage; metadata-only for corporate; consent required for sensitive records.
- Keep writing `evidence_access_receipts` on every preview/download — silently.

**Exports (per module: Passport, Verify, Company, Admin)**
- Uniform pattern: a list of available packets → `Generate` → a `Generated` history table (name, scope, rows, created, download, expiry).
- Preconditions enforced by disabled buttons + tooltips.
- Keep writing `data_export_packages`, `*_export_receipts`, `admin_audit_export_receipts`.

**Audit**
- Company-scoped audit at `/app/company/audit`; full audit at `/app/admin/audit`.
- One table: When · Actor · Action · Object · Scope. Filters: date range, actor, action type. One `Export` with the current filters applied (the "export launcher" becomes the export button's default plus a small "exports current filters" caption).

---

## 12. Account recovery / settings structure

**`/app/settings/profile`** — name, email, avatar, timezone.

**`/app/settings/security`** — change password · email verification status with `Resend` (cooldown-limited) · active sessions · `Sign out everywhere`. Plain error text; no redirect/rate-limit essays.

**`/app/settings/notifications`** — notification event preferences, mute controls.

**`/app/settings/data-rights`** — request data export · request account closure · request history table with status. This is the user-facing home of `data_rights_requests`.

**Public `/recover`** — as §5. Advanced disclosure holds the localhost-link repair tool.

**All recovery RPC/receipt writes preserved** (`auth_recovery_receipts`, `registration_completion_receipts`) — invisible to the user.

---

## 13. Design system proposal

The whole point is one token layer imported by both site and app, so they cannot drift.

### 13.1 Color
Light, calm, ink-and-single-accent. Light UI for both site and app (dark mode later, tokenised now).

**Neutrals (the 95%)**
| Token | Value | Use |
|---|---|---|
| `--bg` | `#FBFBFA` | public page ground |
| `--bg-app` | `#FFFFFF` | app content ground |
| `--surface` | `#FFFFFF` | cards, tables |
| `--surface-sunken` | `#F5F5F4` | table headers, wells, empty states |
| `--border` | `#E7E6E3` | hairlines, card borders |
| `--border-strong` | `#D3D2CE` | inputs, dividers under headers |
| `--text` | `#1A1A18` | primary text |
| `--text-secondary` | `#5C5B57` | labels, captions |
| `--text-tertiary` | `#8A8983` | meta, placeholders |
| `--ink` | `#16181A` | app left rail, dark bands, footer |
| `--ink-soft` | `#22262A` | rail hover |

**Accent — a single restrained one.** Deep teal, because it reads institutional/verification rather than generic startup blue, and is distinct from success green:
| Token | Value | Use |
|---|---|---|
| `--accent-700` | `#0E4F4A` | accent text on light |
| `--accent-600` | `#0F615B` | primary button bg |
| `--accent-500` | `#137C74` | hover, links |
| `--accent-100` | `#E6F2F0` | selected rows, tinted fills |
| `--focus` | `#137C74` at 40% | 2px focus ring, 2px offset |

**Status (used only for status, never decoration)**
| Role | Text/icon | Tint bg | Meaning |
|---|---|---|---|
| Success | `#146B45` | `#E8F3EC` | verified, approved, complete |
| Warning | `#8A5A10` | `#FBF2E2` | expiring, needs attention, pending you |
| Danger | `#9B2C2C` | `#FBEBEB` | revoked, expired, failed, blocked |
| Info | `#2A5591` | `#EAF0F8` | informational, awaiting others |
| Neutral | `#5C5B57` | `#F1F1EF` | draft, archived, not started |

**Rules:** no gradients except an optional ≤4% ink wash on one hero band; no glow; no glass; no colored card backgrounds except status tints; accent appears on ≤2 elements per viewport; the dark ink color is reserved for the app rail, the footer, and at most one marketing band.

### 13.2 Typography
- **UI + body:** one grotesk with true tabular figures — **Geist** or **Söhne** (avoid Inter/Roboto). Fallback stack ends in `system-ui`.
- **Numerals:** `font-variant-numeric: tabular-nums` on all tables, stats, prices, dates.
- **Scale (rem, 16px base):**
 | Token | Size / line-height / weight | Use |
 |---|---|---|
 | display | 56/60, 500, -0.02em | hero H1 (desktop) |
 | h1 | 36/42, 500 | page titles, marketing section heads |
 | h2 | 28/34, 500 | section heads |
 | h3 | 20/28, 550 | card titles |
 | body-lg | 18/28, 400 | hero sub, marketing body |
 | body | 15/22, 400 | app default |
 | small | 13/18, 400 | captions, table meta |
 | label | 12/16, 550, 0.04em, uppercase | eyebrows, table headers |
- Max 2 weights in the app (400/550). Never bold + color + size all at once for emphasis; pick one.
- Measure: 60–75ch for marketing paragraphs.

### 13.3 Spacing
4px base; allowed steps only: `4 8 12 16 20 24 32 40 48 64 80 96 120`. 
Card padding 20 (compact) / 24 (default). Section gap in app: 24. Marketing section vertical rhythm: 96 desktop / 64 tablet / 48 mobile. Nothing in the app uses more than 40px internal padding.

### 13.4 Layout grid
- Marketing: 12 columns, 1200px max content, 80px gutters at ≥1280, 24px at mobile. Hero uses 6+6 or 7+5.
- App: left rail 256 (collapsed 64), top bar 56, content max 1200 centered, page padding 32 desktop / 20 tablet / 16 mobile.
- App pages are a **single column of sections**. Two-column only for detail views (main 2fr / side 1fr, min 320px side, stacks below 1024).
- Hard rule that fixes the recurring overflow: every table wraps in a `min-width:0` scroll container; every card is `min-width:0`; no `nowrap` on user content; long identifiers/commands use a monospace token component with truncation + copy button.

### 13.5 Cards
- 1px `--border`, radius 10, `--surface`, shadow `0 1px 2px rgba(20,20,18,.04)`. That's it — no second shadow, no ring, no glass.
- Anatomy: optional label eyebrow → title (h3) → body → optional footer action row. Max **one** nesting level; never a card inside a card inside a card.
- Max 4 key/value pairs in a summary card; more than that means a table.
- Stat tile variant: label (12 uppercase) + value (28 tabular) + optional delta/caption. Fixed 96px height.

### 13.6 Buttons
Heights 36 (default) / 32 (small) / 44 (large, marketing CTA). Radius 8. Label 15/550, icon 16 Lucide, gap 8.
| Variant | Style |
|---|---|
| Primary | `--accent-600` fill, white text; hover `--accent-500`; active `--accent-700` |
| Secondary | `--surface`, 1px `--border-strong`, `--text`; hover `--surface-sunken` |
| Ghost | transparent, `--text-secondary`; hover `--surface-sunken` |
| Danger | `--surface` + danger border/text; hover danger tint |
| Link | `--accent-500`, underline on hover |
Focus: 2px `--focus` ring, 2px offset, always. Disabled: 45% opacity + `cursor:not-allowed` + tooltip stating the reason. **One primary button per screen region.**

### 13.7 Forms
- Label above (13/550, `--text-secondary`), input 40px, radius 8, 1px `--border-strong`, focus = accent border + ring. Help text 13 `--text-tertiary` below. Error: danger border + 13px danger message with an icon, and the message says how to fix it.
- One column, max 480px per field group. Multi-step for >6 fields (Corporate registration).
- Validate on blur and on submit, never on keystroke. Never disable submit without saying why.
- Required marked with `*` and a legend; optional fields labelled "(optional)" instead.

### 13.8 Tables
- Header: `--surface-sunken`, 12px uppercase label, sticky on scroll. Rows 48px, 1px bottom hairline, hover `--accent-100` at 40%. Numeric right-aligned tabular. Row density toggle optional.
- Left column is the identity (name/record), last column is actions (icon buttons revealed on hover, always visible on touch).
- Filter bar above: search + up to 3 selects + active-filter chips + result count. Pagination or "Load more" at 25/page.
- Selection: checkbox column + a bulk action bar that appears in place of the filter bar.
- Empty, loading (skeleton rows), and error states are required for every table.

### 13.9 Status badges
One component. 22px height, radius 6, 12px/550 text, tinted bg + colored text, optional 8px dot; no borders, no icons except the dot.
Canonical vocabulary (use these words everywhere — this consistency is much of what makes it feel like one product):
`Verified` · `Approved` · `Active` · `Complete` (success) — `Pending` · `Awaiting approval` · `Needs attention` · `Expiring` (warning) — `Expired` · `Revoked` · `Declined` · `Blocked` (danger) — `In review` · `Requested` · `Scoped` (info) — `Draft` · `Not started` · `Archived` (neutral).

### 13.10 Empty states
Centered in the container: 24px Lucide icon in a `--surface-sunken` circle → title (h3, states what would be here) → one line of body (why it's empty / what to do) → one primary action. Max 320px text width. Never an empty card with just a dash. Every table, queue, list, and tab needs one written for it.

### 13.11 Error states
- **Field:** inline, danger, actionable.
- **Form/section:** a danger-tinted strip at the top of the form: what failed, why, what to do, retry action.
- **Page:** centered — title, plain-language cause, `Retry` + `Go to dashboard`, and a small copyable reference id (not a stack trace).
- **Permission:** "You don't have access to this" + who to ask (workspace admin) + link to `/app/company/members`.
- **Empty-because-blocked:** state the precondition and link to it ("Activate the pilot plan to send access requests → Billing").
- Never surface raw Supabase/Postgres errors. Map known codes (rate limit, invalid credentials, expired link, RLS denial) to written messages.

### 13.12 Motion
150ms ease-out for hover/focus, 200ms for popovers/drawers, 250ms for modals. No entrance animations on page load. Respect `prefers-reduced-motion`.

---

## 14. Responsive / mobile behaviour

**Breakpoints:** `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`.

**Public site**
- ≥1024: full layouts as designed. 768–1023: hero stacks (copy then image), 3-up grids → 2-up, section rhythm 64px. <768: single column, 24px gutters, hero H1 32/38, CTAs full-width stacked (primary first), pricing cards stack with the recommended tier first, nav collapses to a sheet with `Log in` and `Get started` pinned at the bottom of the sheet.

**App**
- ≥1280: rail expanded. 1024–1279: rail collapsed to icons, expandable on hover/click. <1024: rail becomes an off-canvas drawer opened from a top-bar menu button; top bar keeps title + avatar.
- Detail two-column layouts stack at <1024 (main content first, side panel below).
- **Tables <768:** convert each row to a stacked "record card" (identity line + 2–3 key/value lines + action row) rather than horizontal scrolling. Only genuinely tabular numeric data keeps horizontal scroll, inside an explicit scroll container with an edge fade.
- Filter bars collapse into a `Filters` button opening a bottom sheet; active filters shown as chips.
- Modals become full-screen sheets <768; primary action pinned to the bottom, safe-area aware.
- Touch targets ≥44px; icon-only actions get visible labels on mobile.
- Long shell commands / ids / URLs: never displayed raw on mobile — truncated monospace + copy button.

**Global overflow rules (replaces the ad-hoc hardening layers):** `min-width:0` on all flex/grid children; `overflow-wrap:anywhere` on user-supplied strings; no fixed pixel widths on content containers; every scrollable region is explicit and labelled.

---

## 15. Implementation phases for Codex

Each phase must ship green (build + existing checks) and change **presentation only**.

**Phase 0 — Inventory & freeze (no visual change)**
- Enumerate every rendered panel/section component with its route, and mark: `keep` / `merge` / `archive` / `delete`.
- Identify which visible strings CI asserts on; convert those assertions to `data-testid` selectors so copy can change.
- No behaviour changes. Deliverable: a mapping table committed to `docs/`.

**Phase 1 — Token layer + primitives**
- One source of truth for tokens (CSS variables + Tailwind theme extension if Tailwind is present).
- Build/refit primitives: Button, Input/Field, Select, Card, Table (+Empty/Loading/Error), Badge, Tabs, Modal/Sheet, Drawer, Toast, Tooltip, StatTile, PageHeader, SectionHeader, Banner, CodeInline, EmptyState, ErrorState.
- No page rewrites yet; primitives land unused-but-tested.

**Phase 2 — Public site**
- New header with persistent `Log in` / `Get started`.
- Rebuild `/` to the §4 structure; add `/professionals`, `/corporate`, `/pricing`, `/security`, `/how-it-works`, `/contact`.
- Remove all internal/proof/marker content from public routes (relocate per §4.2).
- Auth routes `/login`, `/register/professional`, `/register/corporate`, `/recover` with the §5 card shell; keep every Supabase call and redirect env exactly as-is.

**Phase 3 — App shell**
- Left rail + workspace switcher + top bar + avatar menu with sign-out.
- Route restructure to `/app/...` with redirects from current paths.
- Role-based nav visibility.

**Phase 4 — Dashboard**
- Next-best-action engine (deterministic priority lists from §7/§8), stat tiles, queue table, activity list.
- Move release/server/gate/proof surfaces to `/app/admin/release`.

**Phase 5 — Professional Passport**
- Overview readiness checklist, records table + detail, evidence table, consent, grants (Requests/Active/History) with the scoped approval modal, missing-record requests, exports pattern.

**Phase 6 — Corporate Verify**
- Queue-first layout, request flow with inline validation, scoped professional view, gaps, exports with precondition-disabled buttons.

**Phase 7 — Company Admin / RBAC**
- Overview setup checklist, members, invitations, **RBAC matrix**, company audit.

**Phase 8 — Billing + Settings + Data rights**
- Billing per §10; settings per §12.

**Phase 9 — Admin / Operations**
- Operations cases, security review, full audit, release proof, Connect, and the **Evidence archive** route holding preserved legacy proof panels and packet exports.

**Phase 10 — Responsive, a11y, polish**
- Mobile table→card conversions, drawers/sheets, focus order, keyboard traps, contrast audit (4.5:1 body / 3:1 large), `aria` on tables and dialogs, reduced motion.
- Remove the now-redundant "overflow hardening" / "clarity lock" / "simplification layer" CSS.

**Phase 11 — Copy pass**
- Rewrite every string in user language; delete every snake_case marker from visible output; write all empty and error states; standardise the badge vocabulary.

---

## 16. Frontend files Codex will likely need to modify

Verify against the tree before starting — this is the expected shape, from the README's stated structure (Next.js app, `src/` with `database.ts` / `supabase.ts` and focused repositories).

**Add**
```
src/styles/tokens.css                     token layer (single source of truth)
tailwind.config.* (if Tailwind)           map tokens into the theme
src/components/ui/*                       Button, Field, Select, Card, Table, Badge, Tabs,
                                          Modal, Sheet, Drawer, Toast, Tooltip, StatTile,
                                          PageHeader, SectionHeader, Banner, EmptyState,
                                          ErrorState, CodeInline, Skeleton
src/components/marketing/*                Header, Hero, PathSplit, HowItWorks,
                                          PreviewBand, TrustGrid, PricingCards, Footer
src/components/app-shell/*                Sidebar, WorkspaceSwitcher, Topbar, AvatarMenu,
                                          NavGroup, MobileDrawer
src/features/dashboard/next-best-action.ts   deterministic priority logic (pure, testable)
src/lib/status.ts                         badge vocabulary + status→variant mapping
src/lib/errors.ts                         Supabase/Postgres error → user message mapping
app/(marketing)/*                         /, professionals, corporate, pricing, security,
                                          how-it-works, contact, legal
app/(auth)/*                              login, register/professional, register/corporate,
                                          recover, verify-email
app/(app)/app/**                          the /app route tree from §3.2
```

**Modify heavily (presentation only)**
```
app/layout.*, app/page.*                  root shell, font loading, metadata
app/globals.css                           replace ad-hoc layers with tokens + base reset
the current public website component(s)   split into marketing sections, delete proof panels
the current auth/login-register component  reduce to the auth card shell
the current signed-in workspace component  split into shell + route pages
the current Passport / Verify / Company Admin / Billing / Admin panel components
                                          re-skin onto primitives; collapse duplicates
```

**Read/keep, do not restructure**
```
src/supabase.ts        REST/RPC/Storage adapter + repositories
src/database.ts        row type mirrors
supabase/migrations/*  no new migrations required for this redesign
scripts/*, tools/*     CI checks, VPS scripts (may need testid updates only)
.github/workflows/*    update only if assertions move to data-testid
docs/*                 add the Phase 0 inventory + this plan
```

**Delete (after Phase 0 mapping approves each)**
Every duplicated `*_command_center`, `*_desk`, `*_hub`, `*_runway`, `*_cockpit`, `*_answer`, `*_verdict`, `*_gate`, `*_checkpoint`, `*_switchboard`, `*_route_shell`, `*_launch_matrix` component whose content is now covered by the canonical surface — or move to the Admin evidence archive if its export/CI value must persist.

---

## 17. Backend logic risk list — what Codex must not break

Presentation-only refactor. Every item below must keep working, with the same inputs, the same order, and the same error handling.

1. **Supabase Auth calls:** `signUp`, `signInWithPassword`, `signOut`, `resend`, `resetPasswordForEmail`, `updateUser`, session listener/refresh. Same options objects, especially `emailRedirectTo`.
2. **Redirect config:** `NEXT_PUBLIC_TRUSTGRAPH_AUTH_REDIRECT_URL` must remain the source of the return URL; never hardcode an origin; never allow localhost in outbound links. Hosted-link repair logic must survive the `/recover` move.
3. **Registration intents:** the intent write on registration and the completion RPCs (`passport_initialized` for professional, `workspace_created` for corporate) must still fire, in order, with the same portal/plan values. Same for `registration_completion_receipts` (which rejects localhost redirects).
4. **Account context:** the account-context RPC (migration 043) must still be called after login before role-dependent UI renders. Do not render the rail's role-gated items before it resolves — gate on loading state, not on optimistic defaults.
5. **Org RLS recursion repairs (034/042):** do not change how organization/membership reads are issued (avoid new nested selects or joins in the client that could re-trigger `42P17`).
6. **RBAC:** role checks stay server/RPC-driven. The new nav visibility is a *display* filter layered on top of existing authorisation — never a replacement. Every route still validates.
7. **Corporate scoped access:** rows must continue to come from `list_corporate_visible_passport_rows` (migration 063) only. No client-side aggregation, no alternate query, no caching that could outlive a revoked grant, and `preview_data_accepted = false` must keep being honoured.
8. **Access grants & consent:** request-by-email, approve/decline/revoke, `access_grant_records` sync (008), consent authorisations (025), sensitive-record flags (026). Approval modal must submit exactly the same scope payload.
9. **Evidence:** private bucket only; signed URLs generated server-side with the existing expiry; never persist a signed URL; never expose raw storage paths to corporate; keep writing `evidence_access_receipts` (049).
10. **Exports:** metadata-only boundary; keep `data_export_packages` (051), `data_export_package_receipts` (050), `admin_audit_export_receipts` (065), Corporate database-access receipts (048), visibility snapshots (059/060), review attestations (041). Disabled-button preconditions must mirror the existing gate conditions exactly.
11. **Billing:** `organization_subscriptions` activation, `pricing_quote_receipts` (053), `billing_architecture_decision_receipts` (052). Stripe stays off — do not add checkout, card fields, or webhook handling.
12. **Audit events:** every action that currently writes an audit event must still write it after the refactor. Verify per action, not per screen.
13. **Production gates & readiness receipts:** 030/031/040, `real_database_completion_receipts` (058), `v1_pilot_route_run_receipts` (062), security/RLS (056), pilot owner (057), onboarding (054), auth recovery (055). Moving them to Admin must not remove the write paths.
14. **Deployment/release proof:** `trustgraph-release.json` generation and stamping, `tools/update-vps-from-github.sh`, `tools/install-trustgraph-nginx.sh`, `report:vps-status`, and the VFIX host/path refusals. Untouched — only *where the UI shows it* changes.
15. **CI checks:** `check:v1-pilot-route`, `check:live-database-repair`, `check:v1-demo-flow`, `check:v1-e2e-demo`, `smoke:live`, `check:server-env`, `check:vps-workflow` must all still pass. Where they assert on visible strings, migrate the assertion to `data-testid` **in the same PR** that changes the copy.
16. **No new migrations, no RPC signature changes, no RLS policy edits** as part of this redesign.
17. **Preview/demo data rejection** must remain enforced everywhere it is today.

---

## 18. Final recommended build order

1. **Phase 0 inventory + testid migration.** Nothing else can be done safely first.
2. **Tokens + primitives.** (Phase 1)
3. **Public header + auth routes.** (Phase 2a) — fixes the loudest usability complaint fastest.
4. **Public home + product pages + pricing + security.** (Phase 2b)
5. **App shell + routes + workspace switcher + sign-out.** (Phase 3)
6. **Dashboard with next-best-action; relocate proof surfaces to Admin.** (Phase 4)
7. **Professional Passport.** (Phase 5) — the record owner is the supply side; it must feel finished first.
8. **Corporate Verify.** (Phase 6)
9. **Company Admin / RBAC matrix.** (Phase 7)
10. **Billing + Settings + Data rights.** (Phase 8)
11. **Admin / Operations / Release / Evidence archive.** (Phase 9)
12. **Responsive + accessibility.** (Phase 10)
13. **Copy pass + duplicate deletion sweep.** (Phase 11)
14. **Screenshot the finished app and drop the real images into the public site preview band.** Closes the loop on "one product family."

**Definition of done for every phase:** build green; all existing checks green; no visible snake_case markers; no internal server/deploy copy outside `/app/admin`; every table has empty/loading/error states; every screen has at most one primary button; no horizontal overflow at 375/768/1024/1440.

---

### The one rule to keep
If a fact needs to be stated more than once on a screen, the screen is wrong. Delete the duplicate rather than adding a panel that explains the duplicate.
