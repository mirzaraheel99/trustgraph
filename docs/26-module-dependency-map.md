# TrustGraph Module Dependency Map

## 1. Document Purpose
Define how TrustGraph modules depend on each other so implementation happens in the right order.

## 2. Scope
Passport, Verify, Credentials, Work Record, References, Compliance, Connect, AI, Admin, Audit.

## 3. Definitions
- Upstream dependency: module required before another module can work safely.

## 4. Actors
Engineering, product owner, QA, operations.

## 5. Assumptions
Auth, organizations, memberships, RBAC, and audit are shared platform foundations.

## 6. Requirements
- Passport depends on auth, profile, organization, record model, audit.
- Verify depends on organizations, memberships, Access Grants, shared record policies.
- Credentials depends on evidence, issuers, expirations, verification events.
- Work Record depends on employers, confirmations, responsibilities, evidence.
- References depends on invitations, reference-provider identity, confidentiality rules.
- Compliance depends on sensitive classifications, document storage, legal review.
- Connect depends on API clients, webhooks, idempotency, audit.
- AI depends on evidence, governance, human review, audit.
- Admin depends on cases, audit, role-restricted access.

## 7. Workflows
Foundation -> record modules -> sharing -> employer operations -> admin/compliance -> integrations -> AI scale.

## 8. Business Rules
No downstream module may bypass consent, classification, or audit dependencies.

## 9. Permissions
Shared modules use role and ABAC checks.

## 10. States
Dependency planned, implemented, validated, hardened.

## 11. Exceptions
Prototype-only shortcuts must be replaced before pilot.

## 12. Security and Privacy
Sensitive modules require privacy model and legal review before production.

## 13. Audit Requirements
Audit is a base dependency for all trust-critical modules.

## 14. Dependencies
Data model, permissions, business rules, state model.

## 15. Acceptance Criteria
Every module has upstream dependencies identified before implementation.

## 16. Open Decisions
Which integrations enter pilot.

## 17. Out-of-Scope Items
Detailed service deployment topology.

## 18. Change History
Initial bundled build-prep version.
