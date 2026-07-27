# TrustGraph Security Architecture

## 1. Document Purpose
Define TrustGraph security boundaries for authentication, tenant isolation, evidence protection, audit logging, and production operations.

## 2. Scope
Auth, MFA, sessions, RBAC, tenant isolation, encryption, object storage, secrets, admin access, malware scanning, API/webhook security, rate limits, monitoring, incident response, backup, recovery, deletion, and account takeover protection.

## 3. Definitions
- RBAC: role-based access by organization membership.
- ABAC: attribute checks such as owner, grant, status, classification, and purpose.
- Evidence: files, metadata, and verification artifacts supporting claims.

## 4. Actors
All user roles plus platform services, integration clients, and auditors.

## 5. Assumptions
Supabase provides current MVP auth and PostgreSQL RLS. Production will add hardened storage, monitoring, and formal incident response.

## 6. Requirements
- Require authenticated sessions for live data.
- Enforce organization membership and role checks in database RLS.
- Use Access Grants for employer/agency record visibility.
- Store secrets only in GitHub/Supabase secrets, never frontend code.
- Encrypt in transit and at rest.
- Protect documents with private storage, malware scanning, MIME validation, and signed URLs.
- Log material actions as Audit Events.
- Require reason-coded admin access for sensitive evidence.

## 7. Workflows
Sign in -> session issued -> membership loaded -> RLS applies -> action writes audit event -> UI displays permitted result.

## 8. Business Rules
No universal Trust Score, no hidden worker ranking, no final hiring decision automation.

## 9. Permissions
Professional owns Passport data. Employers view only approved shared records. Admin access is role- and reason-limited.

## 10. States
Session active/expired/revoked, role active/invited/suspended, record private/shared/restricted, case open/resolved.

## 11. Exceptions
Emergency support access requires break-glass policy, legal review, and audit.

## 12. Security and Privacy
Classify data by sensitivity. Apply least privilege, tenant isolation, retention limits, and export controls.

## 13. Audit Requirements
Audit auth-sensitive events, role changes, record changes, Access Grants, case decisions, exports, and admin evidence access.

## 14. Dependencies
Supabase Auth, PostgreSQL RLS, private storage, CI/CD secrets, monitoring, logging, backup system.

## 15. Acceptance Criteria
Every endpoint and UI action maps to role, organization, consent, data classification, and audit behavior.

## 16. Open Decisions
MFA provider, storage provider, SIEM/error monitoring, rate-limit provider, production incident process.

## 17. Out-of-Scope Items
Formal compliance certification.

## 18. Change History
Initial bundled build-prep version.
