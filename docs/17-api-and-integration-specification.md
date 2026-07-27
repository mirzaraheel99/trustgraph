# TrustGraph API and Integration Specification

## 1. Document Purpose
Define internal and external API boundaries for TrustGraph workflows and integrations.

## 2. Scope
Identity, employment confirmation, license/certification verification, references, background checks, training records, digital credentials, Access Grants, shared profiles, audit events, notifications, webhooks, ATS, HRIS.

## 3. Definitions
- API Client: approved system integration identity.
- Webhook: outbound signed event delivery.
- Idempotency key: client-provided key preventing duplicate workflow creation.

## 4. Actors
Professional app, Verify app, Admin app, credential issuers, verification providers, ATS/HRIS clients, notification service.

## 5. Assumptions
MVP uses Supabase REST/RPC. Production APIs will be versioned under `/v1`.

## 6. Requirements
- Authentication: user JWT or API client credentials.
- Authorization: role, organization, Access Grant, consent, classification.
- Validation: schema validation and explicit error codes.
- Idempotency: required for create/update webhook-triggered actions.
- Audit: required for all material reads/writes.
- Rate limits: per user, org, API client, and endpoint.

## 7. Workflows
Create Access Grant, approve share, fetch shared profile, create verification case, submit verification result, request reference, submit reference, issue credential, deliver webhook.

## 8. Business Rules
APIs must not expose unapproved Passport records or raw confidential evidence.

## 9. Permissions
External clients can access only their organization scope and approved integration scopes.

## 10. States
Request accepted, processing, completed, failed, retrying, expired, revoked.

## 11. Exceptions
Provider mismatch creates Admin case. Invalid consent returns authorization error.

## 12. Security and Privacy
Use signed webhooks, replay prevention, scoped tokens, rate limits, and audit trails.

## 13. Audit Requirements
Log API client, actor, organization, record, purpose, action, result, and idempotency key.

## 14. Dependencies
Auth, RBAC, audit events, notification service, integration registry, provider credentials.

## 15. Acceptance Criteria
Every API has purpose, request, response, auth, authorization, validation, idempotency, errors, audit behavior, rate limits, and versioning.

## 16. Open Decisions
API gateway, developer portal, webhook signing format, sandbox environment.

## 17. Out-of-Scope Items
Provider-specific payload certification.

## 18. Change History
Initial bundled build-prep version.
