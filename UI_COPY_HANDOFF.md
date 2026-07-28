# TrustGraph UI and Copy Handoff

Use this brief for a focused premium SaaS redesign pass. The goal is to improve TrustGraph's visual quality, information hierarchy, and wording while preserving the live React/TypeScript product flows.

## Product Context

TrustGraph is a workforce trust and verification platform with three visible audiences:

1. Professionals who build a private Passport of employment, credentials, references, and evidence.
2. Corporate teams who request scoped access, manage reviewers, and verify shared records.
3. TrustGraph operators who monitor audit, release, evidence, security, and Connect readiness.

The live app is hosted at `https://mirzaraheel99.github.io/trustgraph/`.

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
4. Passport record detail: improve evidence preview/download hierarchy and consent messaging.
5. Verify workspace: make shared-record status, missing-record requests, and Access Grants faster to scan.
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
