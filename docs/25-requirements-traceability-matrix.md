# TrustGraph Requirements Traceability Matrix

## 1. Document Purpose
Map planning requirements to product modules, data entities, permissions, audit events, and current implementation.

## 2. Scope
Current MVP foundation plus planned roadmap modules.

## 3. Definitions
- Trace: relationship from requirement to implementation/test.

## 4. Actors
Product owner, engineering, QA, security, operations.

## 5. Assumptions
Implementation status reflects the current repository and hosted app.

## 6. Requirements
| Requirement | Module | Entity | Permission | Audit | Current status |
|---|---|---|---|---|---|
| REQ-FOUND-001 | Account | Profile, Organization, Membership | RBAC | role/account events | Implemented foundation |
| REQ-PASS-001 | Passport | Trust Record | `passport:manage_own` | record events | Implemented foundation |
| REQ-GRANT-001 | Sharing | Access Grant | `access_grant:approve` | grant events | Implemented foundation |
| REQ-VERIFY-001 | Verify | Access Grant, Trust Record | `passport:view_shared` | read/change events | Implemented foundation |
| REQ-OPS-001 | Admin | Verification Case | admin roles | case events | Implemented foundation |
| REQ-AUDIT-001 | Audit | Audit Event | `audit:view` | self | Implemented foundation |
| REQ-AI-001 | AI | AI Summary, Fraud Signal | role scoped | AI events | Planned |
| REQ-CONNECT-001 | Connect | Integration, API Client | API scopes | API events | Planned |

## 7. Workflows
Each new feature updates this table with requirement, module, entity, permission, audit, and status.

## 8. Business Rules
No orphan features: each feature must trace to product problem, role, workflow, entity, permission, business rule, audit, and acceptance criteria.

## 9. Permissions
Permissions are defined in `03-user-roles-and-permissions.md` and `src/rbac.ts`.

## 10. States
Planned, in progress, implemented, deployed, validated.

## 11. Exceptions
Untraced emergency fixes must be documented after release.

## 12. Security and Privacy
Security-impacting traces require privacy classification.

## 13. Audit Requirements
Each material workflow row must include audit behavior.

## 14. Dependencies
Master index, release backlog, codebase.

## 15. Acceptance Criteria
Matrix is updated before major implementation work is considered complete.

## 16. Open Decisions
Add automated test references when test suite is introduced.

## 17. Out-of-Scope Items
Full compliance evidence matrix.

## 18. Change History
Initial bundled build-prep version.
