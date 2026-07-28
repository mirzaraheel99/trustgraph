# TrustGraph Pilot Operations Runbook

Use this runbook for v1 pilot verification before inviting real employers, staffing agencies, or professionals into sensitive workflows.

## Release Gates

1. Confirm GitHub Pages deployment is green for the latest `main` commit.
2. Smoke-check the hosted app at `https://mirzaraheel99.github.io/trustgraph/` or run `npm run smoke:live`.
3. Run only targeted Supabase migrations through `Apply Supabase Migrations`.
4. Confirm Admin release ledger shows the latest migration as `applied`.
5. Export the Admin security runbook CSV and store it with pilot QA notes.
6. Review `V1_READINESS_CHECKLIST.md` before inviting a new pilot organization.

## Live Workflow Acceptance

1. Open the hosted app at `https://mirzaraheel99.github.io/trustgraph/`; do not start pilot accounts from a `localhost` verification link.
2. Sign up or sign in with Supabase Auth from the Professional or Corporate portal.
3. For Corporate signup, enter organization name, domain, and type before creating the account, then return after email verification and login in the same browser.
4. If Supabase reports an email rate limit, wait at least 60 minutes or use custom SMTP before continuing account creation tests.
5. Confirm Professional account context is created and create at least one Passport record.
6. Attach evidence metadata and one private evidence file.
7. Create a Corporate workspace.
8. Activate a pilot subscription ledger entry.
9. Invite or activate a corporate team member.
10. Request a Passport Access Grant from Verify.
11. Approve the Access Grant from Passport and sync shared records.
12. Create or revoke a consent authorization for sensitive scope.
13. Open Verify and confirm approved shared records are visible.
14. Open Admin and review operations, Connect, audit, workflow QA, release ledger, and security panels.
15. Export audit CSV and security runbook CSV.
16. Mark the matching items in `V1_READINESS_CHECKLIST.md` as verified in the pilot notes.

## Security Review Boundary

- RLS must stay enabled on every table that stores user, organization, evidence, consent, billing, Connect, operations, audit, or release data.
- Private evidence files must use signed URLs only.
- Audit exports may include metadata, so treat exported CSV files as sensitive operational evidence.
- The current billing flow is a pilot ledger, not payment collection.
- Do not process real background-check traffic, regulated employment decisions, or live payments until an external legal/security review is complete.

## Human Decisions Still Required

- Stripe product, tax, invoice, refund, webhook, and dunning policy.
- Final legal language for background-check-adjacent records and adverse-action boundaries.
- External RLS/security review sign-off.
- Pilot customer onboarding list and support process.
