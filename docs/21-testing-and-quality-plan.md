# TrustGraph Testing and Quality Plan

## 1. Document Purpose
Define the quality strategy for TrustGraph product, data, permissions, security, accessibility, and deployment.

## 2. Scope
Unit, integration, end-to-end, permission, tenant-isolation, security, accessibility, mobile, document-upload, verification workflow, expiration, audit-log, AI-output, performance, recovery testing.

## 3. Definitions
- Permission test: verifies role/tenant/consent boundaries.
- Workflow test: verifies a complete journey and audit trail.

## 4. Actors
Engineering, QA, security reviewer, product owner, admin operator, pilot users.

## 5. Assumptions
GitHub Actions is the deployment gate. More automated tests should be added as the app grows.

## 6. Requirements
- TypeScript build must pass.
- Migrations must run safely and idempotently where practical.
- RLS policies require positive and negative tests.
- Hosted page smoke test checks render, console logs, layout overflow, and critical panels.
- Accessibility checks cover keyboard controls, labels, contrast, and responsive behavior.

## 7. Workflows
Code change -> local/static checks -> commit -> GitHub Actions build -> migration workflow -> hosted smoke test -> issue follow-up.

## 8. Business Rules
No feature is complete without acceptance criteria and permission behavior.

## 9. Permissions
Test every role’s allowed and denied views.

## 10. States
Untested, smoke-tested, integration-tested, regression-covered, production-ready.

## 11. Exceptions
Manual QA is allowed in early MVP but must be documented.

## 12. Security and Privacy
Never test with real sensitive identity/background data in public environments.

## 13. Audit Requirements
Test that material actions produce Audit Events.

## 14. Dependencies
CI/CD, Supabase test data, browser automation, future test runner.

## 15. Acceptance Criteria
Critical workflows pass in hosted app and database policies block unauthorized access.

## 16. Open Decisions
Testing framework, staging environment, seeded test accounts.

## 17. Out-of-Scope Items
Formal third-party penetration test for MVP.

## 18. Change History
Initial bundled build-prep version.
