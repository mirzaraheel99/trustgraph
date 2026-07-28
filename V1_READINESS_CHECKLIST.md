# TrustGraph v1 Readiness Checklist

Use this checklist to keep the 13-track build aligned before a pilot user reviews the hosted product.

## 13-Track Product Coverage

1. Product foundation: public website, hosted app, and GitHub Pages deployment are live.
2. Professional Passport: account creation, Passport records, record types, evidence metadata, and private evidence storage are implemented.
3. Corporate account: employer and staffing agency account creation, role activation, plans, invitations, and member controls are implemented.
4. RBAC: Professional, Corporate, Verify, Issuer, Admin, Auditor, and System roles are mapped to workspace access and permissions.
5. Access Grants: corporate requests, Passport approval/decline/revoke, and shared-record sync are implemented.
6. Consent controls: sensitive and restricted records can require explicit consent and consent can be revoked.
7. References and missing records: structured reference requests, Corporate Verify missing-record requests, and Professional Passport request resolution are implemented.
8. Issuer workflow: issuer role and verified credential creation are implemented.
9. Evidence preview/download: evidence metadata, upload, signed URL preview, and download controls are implemented.
10. Admin operations: verification cases, reason codes, decisions, release ledger, audit exports, and security runbook export are implemented.
11. Connect surface: API clients, webhook subscriptions, and status controls are implemented as a pilot control plane.
12. Advisory and notifications: deterministic advisory summary and workflow notification status controls are implemented.
13. Pilot readiness: pilot acceptance script, runbook, deployment smoke checks, and human-decision boundaries are documented.

## Verification Loop

1. Confirm the latest GitHub Actions deployment for `main` is green.
2. Smoke-check `https://mirzaraheel99.github.io/trustgraph/`.
3. Sign up or sign in with hosted Supabase Auth.
4. Confirm verification emails use the hosted GitHub Pages URL, not `localhost`.
5. Create a Passport record and attach evidence metadata.
6. Upload one private evidence file and test preview/download.
7. Create a Corporate workspace and activate a pilot plan.
8. Add or invite a reviewer, then switch to the Verify workspace.
9. Request Passport access by professional email.
10. Approve the Access Grant from Passport.
11. Confirm shared records render in Verify with scope context.
12. Create a consent authorization for a sensitive record, then revoke it.
13. Open Admin, create pilot cases if needed, resolve or restrict one case, export audit CSV, and export the security runbook.

## Stop Conditions

Do not move from pilot to real production traffic until these decisions are complete:

- Stripe products, taxes, invoice emails, refunds, dunning, and webhook reconciliation.
- External RLS/security review and production evidence-storage review.
- Legal review for background-check-adjacent records, adverse-action boundaries, and regulated employment decision language.
- Named pilot customer list, onboarding owner, support process, and incident response owner.
