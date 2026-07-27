# TrustGraph MVP Definition

## 1. Document Purpose
Define the MVP that proves TrustGraph as a complete verified professional identity and workforce record platform without building every future integration.

## 2. Scope
MVP includes account/auth, professional profile, Passport records, identity workflow placeholder, employment, contracts, licenses, certifications, references, training, skills, compliance documents, expirations, employer-confirmed work records, AI summary placeholder, sharing, Verify portal, audit history, Admin operations.

## 3. Definitions
- MVP: smallest coherent product that demonstrates the end-to-end trust model.
- Manual verification: admin-assisted or structured evidence review before automation.

## 4. Actors
Professional, Employer Reviewer, Staffing Agency Admin/Recruiter, Reference Provider, Credential Issuer, TrustGraph Verifier, Auditor.

## 5. Assumptions
MVP may use manual verification, admin-assisted workflows, limited integrations, structured document upload, and email/SMS invitations.

## 6. Requirements
- Professional can create profile and records.
- Records show source, status, currentness, evidence summary, access, and audit context.
- Employer can request and review approved records.
- Professional can approve/revoke Access Grants.
- Admin can triage verification exceptions.
- Audit trail captures material actions.

## 7. Workflows
Professional onboarding -> Passport record creation -> employer request -> Access Grant approval -> Verify shared review -> Admin exception case -> audit trail.

## 8. Business Rules
Do not present all records as equally trusted. References are one module, not the whole product.

## 9. Permissions
Use organization membership, role permissions, Access Grants, and data classification.

## 10. States
Demo, live auth, draft records, shared records, requested/approved/revoked grants, open/resolved admin cases.

## 11. Exceptions
Conflicting evidence and fraud signals must create Admin cases.

## 12. Security and Privacy
No sensitive raw evidence in email or public pages. Production document storage must be private.

## 13. Audit Requirements
Audit onboarding, record creation/update, grants, admin case decisions, role changes, exports.

## 14. Dependencies
Supabase, Next.js, GitHub Pages, migrations, RLS, repositories, future storage/notifications.

## 15. Acceptance Criteria
MVP demonstrates the core TrustGraph loop from Professional Passport to employer review to operations/audit.

## 16. Open Decisions
Identity provider, document storage, notification vendor, legal review of background/reference workflows.

## 17. Out-of-Scope Items
Full ATS/HRIS integrations, automated official verification at scale, billing, production compliance certification.

## 18. Change History
Initial bundled build-prep version.
