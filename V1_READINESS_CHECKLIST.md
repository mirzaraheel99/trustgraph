# TrustGraph v1 Readiness Checklist

Use this checklist to keep the 13-track build aligned before a pilot user reviews the hosted product.

## 13-Track Product Coverage

1. Product foundation: public website, hosted app, and GitHub Pages deployment are live.
2. Professional Passport: account creation, Passport records, record types, evidence metadata, and private evidence storage are implemented.
3. Corporate account: employer and staffing agency account creation, role activation, plans, invitations, invitee acceptance handoff, member controls, and corporate directory acceptance proof are implemented.
4. RBAC: Professional, Corporate, Verify, Issuer, Admin, Auditor, and System roles are mapped to workspace access and permissions.
5. Access Grants: corporate requests, Passport approval/decline/revoke, and shared-record sync are implemented.
6. Consent controls: sensitive and restricted records can require explicit consent and consent can be revoked.
7. References and missing records: structured reference requests, Corporate Verify missing-record requests, and Professional Passport request resolution are implemented.
8. Issuer workflow: issuer role and verified credential creation are implemented.
9. Evidence preview/download: evidence metadata, upload, signed URL preview, and download controls are implemented.
10. Admin operations: verification cases, reason codes, decisions, operations case export, release ledger export, audit exports, and security runbook export are implemented.
11. Connect surface: API clients, webhook subscriptions, status controls, client export, and webhook export are implemented as a pilot control plane.
12. Advisory and notifications: deterministic advisory summary and workflow notification status controls are implemented.
13. Pilot readiness: pilot acceptance script, runbook, deployment smoke checks, and human-decision boundaries are documented.

## V1 Operating Map

The signed-in dashboard now exposes one operator path for pilot use:

1. Website: public positioning, pricing, and portal selection.
2. Professional registration: hosted Supabase Auth, email verification, Passport records, and evidence.
3. Corporate registration: employer/staffing workspace creation, RBAC activation, reviewer invites, and Corporate Verify setup.
4. Pricing ledger: Supabase subscription ledger activation for the Corporate Verify pilot plan while Stripe remains human-gated.
5. Corporate user database: approved, consent-scoped Passport rows visible only through Access Grants and active corporate RBAC.
6. Deploy and save: GitHub remains the source of truth, the VPS pulls the green build, and the VFIX host stays isolated.

## Verification Loop

1. Confirm the latest GitHub Actions deployment for `main` is green.
2. Smoke-check `https://mirzaraheel99.github.io/trustgraph/`.
3. Sign up or sign in with hosted Supabase Auth.
4. Confirm verification emails use the hosted GitHub Pages URL, not `localhost`.
5. Create a Passport record and attach evidence metadata.
6. Upload one private evidence file and test preview/download.
7. Create a Corporate workspace and activate a pilot plan.
8. Add or invite a reviewer, then confirm the invitee can review and accept the pending workspace invitation.
9. Request Passport access by professional email.
10. Approve the Access Grant from Passport.
11. Confirm shared records render in Verify with scope context.
12. Confirm the Corporate directory acceptance ledger is accepted only when live corporate RBAC context loads Access Grants, shared Passport rows, review-ready people, and review attestations.
13. Create a consent authorization for a sensitive record, then revoke it.
14. Export team invitations and personal pending invitations for the pilot acceptance packet.
15. Open Admin, create pilot cases if needed, resolve or restrict one case, export operations cases, export audit CSV/JSON, export release ledger, and export the security runbook.
16. Confirm the CI responsive coverage guard passes before accepting mobile and narrow desktop layouts.
17. Export the V1 operating map packet and confirm it matches the current pilot route before user testing.
18. Export the server release save path packet before updating the VPS and confirm the server commit matches the latest GitHub `main`.

## Stop Conditions

Do not move from pilot to real production traffic until these decisions are complete:

- Stripe products, taxes, invoice emails, refunds, dunning, and webhook reconciliation.
- External RLS/security review and production evidence-storage review.
- Legal review for background-check-adjacent records, adverse-action boundaries, and regulated employment decision language.
- Named pilot customer list, onboarding owner, support process, and incident response owner.
