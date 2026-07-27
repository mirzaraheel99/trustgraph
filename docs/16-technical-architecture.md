# TrustGraph Technical Architecture

## 1. Document Purpose
Define system boundaries, modules, data flow, event flow, integration flow, AI boundaries, deployment model, scaling, and failure handling.

## 2. Scope
React, Next.js, TypeScript, PostgreSQL, Supabase MVP backend, future Node service modules, secure object storage, queues, search, integrations, observability, CI/CD.

## 3. Definitions
- Passport: professional-owned profile and record system.
- Verify: employer/staffing review portal.
- Admin: TrustGraph operations portal.
- Connect: API/integration layer.

## 4. Actors
Frontend users, backend services, external verification providers, credential issuers, ATS/HRIS systems, admin operators.

## 5. Assumptions
Current hosted MVP is static Next.js on GitHub Pages with Supabase REST/RPC. Production should move business logic into modular services when workflows require background processing.

## 6. Requirements
- Frontend: React, Next.js, TypeScript.
- Core data: PostgreSQL with RLS.
- Backend: modular TypeScript services or Supabase RPC for MVP.
- Storage: private S3-compatible object storage.
- Queues: managed event queue for verification, notifications, AI extraction, webhook delivery.
- Search: PostgreSQL first; OpenSearch later.
- Observability: structured logs, metrics, traces, error monitoring.

## 7. Workflows
User action -> frontend repository -> Supabase REST/RPC -> RLS/business function -> audit event -> UI refresh. Future async workflows emit queue events and notifications.

## 8. Business Rules
Authoritative verification writes must preserve source, status, timestamp, evidence reference, and actor.

## 9. Permissions
Database RLS is the backstop. Services must also check role, tenant, consent, and classification before writes.

## 10. States
MVP static frontend/live Supabase backend; future production app service, worker service, integration service, notification service, AI service.

## 11. Exceptions
External provider failures create retryable verification cases; they do not silently mark records verified.

## 12. Security and Privacy
No sensitive evidence in browser bundles. Use signed URLs, private storage, and server-side document handling.

## 13. Audit Requirements
Every service writes structured audit events for material changes and privileged access.

## 14. Dependencies
GitHub Actions, Supabase, PostgreSQL, future object storage, queues, monitoring, email/SMS provider.

## 15. Acceptance Criteria
Architecture supports all 19 locked profile areas, all roles, full auditability, and controlled MVP rollout.

## 16. Open Decisions
Production hosting provider, worker framework, object storage vendor, queue vendor, monitoring stack.

## 17. Out-of-Scope Items
Full infrastructure-as-code implementation in this document.

## 18. Change History
Initial bundled build-prep version.
