# TrustGraph Master Requirements Index

## 1. Document Purpose
Provide one index for approved planning and build requirements.

## 2. Scope
Indexes docs `01` through `23`, MVP modules, product areas, roles, data entities, permissions, workflows, and acceptance criteria.

## 3. Definitions
- Requirement ID: stable identifier for traceability.
- Source document: planning doc where requirement is defined.

## 4. Actors
Product owner, engineering, QA, security, operations.

## 5. Assumptions
Docs `01` through `23` are the current canonical planning foundation.

## 6. Requirements
- REQ-FOUND-001: Account/auth foundation.
- REQ-RBAC-001: Organization membership and role enforcement.
- REQ-PASS-001: Professional Passport records across locked profile areas.
- REQ-TRUST-001: Evidence labels instead of universal Trust Score.
- REQ-GRANT-001: Access Grant request/approval/revocation.
- REQ-VERIFY-001: Employer/agency shared-profile review.
- REQ-OPS-001: Admin operations queue.
- REQ-AUDIT-001: Audit events for material actions.
- REQ-SEC-001: Tenant isolation and sensitive evidence protection.
- REQ-AI-001: AI advisory only with source grounding and human review rules.

## 7. Workflows
Use this index when creating backlog items, code changes, tests, and release notes.

## 8. Business Rules
Every feature must reference at least one requirement ID.

## 9. Permissions
Requirement ownership follows role and module definitions.

## 10. States
Planned, implemented, deployed, validated, hardened.

## 11. Exceptions
Legal-sensitive requirements require counsel review before production.

## 12. Security and Privacy
Security/privacy requirements cannot be waived without documented approval.

## 13. Audit Requirements
Audit requirements apply wherever material trust state changes.

## 14. Dependencies
Docs `01` through `23`, traceability matrix, release backlog.

## 15. Acceptance Criteria
Index covers every major platform area and provides stable IDs for implementation tracking.

## 16. Open Decisions
Add granular IDs as product modules mature.

## 17. Out-of-Scope Items
Detailed user stories; see release backlog.

## 18. Change History
Initial bundled build-prep version.
