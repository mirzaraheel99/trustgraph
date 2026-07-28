# TrustGraph UI and Copy Handoff

Use this brief for a focused premium SaaS redesign pass. The goal is to improve TrustGraph's visual quality, information hierarchy, and wording while preserving the live React/TypeScript product flows.

## Product Context

TrustGraph is a workforce trust and verification platform with three visible audiences:

1. Professionals who build a private Passport of employment, credentials, references, and evidence.
2. Corporate teams who request scoped access, manage reviewers, and verify shared records.
3. TrustGraph operators who monitor audit, release, evidence, security, pilot launch contacts, and Connect readiness.

The live app is hosted at `https://mirzaraheel99.github.io/trustgraph/`.
The GitHub repo is `https://github.com/mirzaraheel99/trustgraph`.

## Design Direction

Make the product feel like a modern, premium B2B SaaS system:

- Quiet, enterprise-grade, operational, and trustworthy.
- Dense enough for daily work, but visually polished and easy to scan.
- Clear hierarchy between public marketing, authenticated workspace, records, queues, and admin controls.
- Premium through spacing, typography, contrast, affordances, and copy precision; avoid decorative noise.
- Use restrained color with purposeful status colors, not a one-color theme.

Avoid:

- Generic startup hero copy.
- Oversized decorative cards for operational workflows.
- Vague words such as "revolutionary", "seamless", "game-changing", or "AI-powered" unless tied to a concrete workflow.
- Claims that imply automated employment decisions, background-check compliance, payment collection, or legal review is production-ready.

## Copy Principles

- Lead with what the user can do now.
- Keep legal and security boundaries clear.
- Use "pilot subscription" or "pilot ledger" until Stripe is approved.
- Use "source-grounded advisory" instead of implying autonomous decision-making.
- Use "scoped access", "consent", "audit trail", "signed evidence links", and "RBAC" consistently.
- Replace unclear demo wording with "pilot acceptance", "workflow QA", or "operator review".

## Key Screens to Improve

1. Public website first viewport: make TrustGraph, Passport, Corporate Verify, and Admin trust operations obvious in the first screen.
2. Auth panel: make Professional vs Corporate paths clearer and make hosted redirect guidance reassuring.
3. Launch checklist: make the next action obvious after signup or login.
4. Passport record detail: improve evidence preview/download, evidence manifest export, and consent messaging.
5. Verify workspace: make shared-record status, missing-record gap packets, and Access Grants faster to scan.
6. Corporate account/RBAC: make role management feel intentional and less demo-like.
7. Billing panel: keep pilot subscription language honest and premium.
8. Admin: make audit, release ledger, security review, and exports feel like an operations command center.
9. Mobile: reduce vertical clutter and make controls fit without overlap.

## Questions to Ask Before Major UI Changes

1. Which buyer should the public page sell first: hospitals/healthcare staffing, general employers, staffing agencies, or professionals?
2. Should the first pilot focus on healthcare credentials, general employment verification, or both?
3. What brand tone should dominate: enterprise compliance, fast hiring operations, or professional-owned identity?
4. Should pricing stay visible publicly, or should Corporate and Scale become "request access" flows?
5. What proof points can be stated truthfully today: live Supabase, GitHub Pages deployment, private evidence storage, RBAC, audit exports, or pilot-only readiness?

## Ready-To-Paste Claude Prompt

Use this prompt when asking another model or designer to improve the UI:

```text
You are improving the TrustGraph GitHub repo:
https://github.com/mirzaraheel99/trustgraph

Live app:
https://mirzaraheel99.github.io/trustgraph/

Goal:
Make TrustGraph feel like a premium modern SaaS product, not a demo. Improve visual hierarchy, wording, page structure, spacing, mobile behavior, and operational clarity while preserving the current React/TypeScript/Next.js implementation and live Supabase-backed flows.

Product:
TrustGraph is an evidence-first workforce trust platform. Professionals create a private Passport for work history, credentials, training, references, and evidence. Corporate teams use Corporate Verify to request scoped access, request missing records, export gap packets, and review only owner-approved records. Operators manage audit, release, security, Connect, evidence, pilot contacts, billing pilot, and workflow QA.

Current foundation:
- Next.js, React, TypeScript.
- Static GitHub Pages deployment.
- Supabase Auth, database, Storage, RLS, and RPC functions.
- Professional Passport, Corporate Verify, RBAC/team roles, Access Grants, evidence preview/download, evidence manifest export, missing-record requests, gap packet export, references, credentials, notifications, billing pilot ledger, production gate decisions, pilot launch contact register, audit exports, release ledger, security/RLS checklist, pilot acceptance script, and 13-track v1 alignment panel.

What to improve:
1. Public website first viewport: make Passport, Corporate Verify, and operator trust controls obvious in the first 10 seconds.
2. Auth and registration: make Professional vs Corporate paths clearer, remove confusion around local vs hosted redirect links, and reassure users about verification.
3. Workspace information architecture: make Passport, Verify, Account, Billing, Admin, Evidence, Audit, and Security feel like one coherent SaaS system.
4. Copy: replace vague demo language with concrete operational wording. Use "scoped access", "consent", "audit trail", "signed evidence links", "pilot subscription ledger", and "human decision gates" consistently.
5. Visual design: premium B2B SaaS, restrained, high-trust, dense but readable. Avoid noisy decoration, generic startup claims, one-color themes, and over-large cards inside operational screens.
6. Mobile: make navigation, cards, filters, forms, and action rows stack cleanly without overlap or clipped text.
7. Wording structure: propose clearer section names, empty states, action labels, and microcopy. Ask questions where buyer positioning or legal/payment claims require a human decision.

Hard guardrails:
- Do not remove current product workflows.
- Do not imply Stripe/payment collection is live. Billing is a pilot ledger until a human Stripe decision is approved.
- Do not imply legal/compliance/background-check production readiness.
- Do not imply automated hiring decisions.
- Do not remove Supabase environment assumptions or GitHub Pages static export behavior.
- Keep TypeScript clean.
- Do not commit generated .next, out, tsconfig.tsbuildinfo, or package-lock.json.

Before major changes, ask these questions:
1. Which first buyer should the public page prioritize: healthcare staffing, general employers, staffing agencies, or professionals?
2. Should public pricing stay visible, or should Corporate/Scale become request-access flows?
3. What truthful proof points can be shown now: live Supabase, private evidence storage, RBAC, audit exports, GitHub Pages deployment, or pilot readiness?
4. Should the visual tone be more enterprise compliance, fast hiring operations, or professional-owned identity?
5. Which pilot launch contacts are real and approved to show: customer roster, onboarding owner, support owner, and incident owner?
6. Which copy requires legal review before it can mention background-check-adjacent or regulated employment workflows?

Verification required before handoff:
- npm run typecheck
- npm run check:claims
- npm run check:rls
- npm run build
- npm run smoke:live after deployment, or explain why live smoke could not be run
```

## Review Checklist For UI Changes

- The first screen says what TrustGraph is, who it serves, and what is live.
- The Professional path and Corporate path have distinct labels, actions, and database consequences.
- Every admin/security/payment claim includes the correct pilot or human-approval boundary.
- Tables, filters, exports, and forms remain usable at mobile width.
- Status chips and metrics use consistent labels: live, preview, gated, ready, needs review.
- The smoke script includes assertions for any new critical first-screen wording or control labels.

## Engineering Guardrails

- Keep the existing Next.js, React, and TypeScript structure.
- Preserve Supabase auth, repository functions, migrations, and GitHub Pages static export behavior.
- Do not remove existing v1 workflow controls unless replacing them with equivalent usable controls.
- Run `npm run typecheck`, `npm run build`, and `npm run smoke:live` before handing back changes.
- Do not commit generated `.next`, `out`, `tsconfig.tsbuildinfo`, or `package-lock.json`.

## Success Criteria

- First-time visitors understand what TrustGraph is within 10 seconds.
- Professionals know how to create Passport records and attach evidence.
- Corporate users know how to create an account, invite reviewers, request access, and review shared records.
- Operators can find audit exports, release ledger, security review, and pilot acceptance quickly.
- The UI feels premium without overstating production/legal/payment readiness.
