# TrustGraph Notification and Communication Model

## 1. Document Purpose
Define how TrustGraph communicates workflow events without exposing sensitive professional data.

## 2. Scope
Includes in-app notifications, email/SMS templates, expiration reminders, verification updates, reference invitations, employer access requests, missing-record alerts, disputes, security alerts, and admin operations notices.

## 3. Definitions
- Notification: user-facing message triggered by a workflow event.
- Communication: outbound email/SMS/in-app delivery.
- Sensitive detail: any identity, background-check, compliance, document, or confidential verification content.

## 4. Actors
Professional, Employer, Staffing Agency, Reference Provider, Credential Issuer, Verification Provider, TrustGraph Administrator, Auditor.

## 5. Assumptions
Messages should link users back to TrustGraph rather than carrying sensitive evidence in email/SMS. Legal review is required for background-check, adverse-action, and regulated employment communications.

## 6. Requirements
- Employer access request: professional receives in-app and email notice; audited.
- Access approval/revocation: requester receives status notice; audited.
- Expiration reminder: professional receives 60/30/14/7 day reminders.
- Missing-record alert: professional receives scoped request and reason.
- Reference invitation: reference provider receives secure invitation.
- Verification result update: professional receives status label only.
- Dispute update: involved parties receive status notice, not confidential investigation details.
- Security alert: sign-in, password, sensitive access, role changes.

## 7. Workflows
Trigger -> policy check -> template selection -> channel selection -> delivery attempt -> audit event -> retry or failure state.

## 8. Business Rules
Do not include raw evidence, SSNs, ID documents, background-check details, or confidential references in outbound messages.

## 9. Permissions
Recipients must have an active relationship to the triggering record, Access Grant, organization, or admin case.

## 10. States
Draft, queued, sent, delivered, failed, retried, suppressed, opted out.

## 11. Exceptions
Security-critical notices may bypass marketing opt-out but not legal communication limits.

## 12. Security and Privacy
Use signed short-lived links for sensitive workflows. Log delivery metadata, not message secrets.

## 13. Audit Requirements
Audit access requests, approvals, revocations, role changes, verification outcomes, disputes, and security notifications.

## 14. Dependencies
Auth, organizations, Access Grants, audit events, notification provider, email/SMS provider.

## 15. Acceptance Criteria
Every material state change has a defined recipient, channel, template purpose, retry rule, opt-out rule, and audit behavior.

## 16. Open Decisions
Choose email/SMS provider, template versioning system, and notification preference UX.

## 17. Out-of-Scope Items
Marketing campaigns and bulk candidate outreach.

## 18. Change History
Initial bundled build-prep version.
