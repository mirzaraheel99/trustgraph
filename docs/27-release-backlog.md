# TrustGraph Release Backlog

## 1. Document Purpose
Define epics, user stories, acceptance criteria, and technical task breakdown for upcoming releases.

## 2. Scope
MVP foundation through pilot readiness.

## 3. Definitions
- Epic: large product capability.
- Story: user-facing increment.
- Task: engineering implementation item.

## 4. Actors
Professional, Employer Reviewer, Staffing Agency Admin, Recruiter, TrustGraph Verifier, Auditor.

## 5. Assumptions
Current app has live foundations for auth, account context, records, Access Grants, Verify, Admin cases, audit panel.

## 6. Requirements
### Epic 1: Passport Record Expansion
Stories: contracts, training, skills, compliance documents, expirations. Acceptance: each record shows source, status, access, evidence, audit.

### Epic 2: Employer and Agency Readiness
Stories: missing-record requests, candidate readiness filters, credential monitoring. Acceptance: employers see only approved shared data.

### Epic 3: References
Stories: reference request, provider identity, structured response, attestation. Acceptance: confidentiality and consent rules enforced.

### Epic 4: Credentials and Issuers
Stories: issuer role, issue credential, update/revoke credential. Acceptance: issuer-scoped writes and audit events.

### Epic 5: Compliance and Documents
Stories: private evidence storage, document classification, expiration extraction. Acceptance: sensitive data stays private and audited.

### Epic 6: Connect and AI
Stories: API clients, webhooks, source-grounded summaries, fraud signals. Acceptance: no automated hiring decisions.

## 7. Workflows
Backlog item -> requirement trace -> design -> migration -> UI -> QA -> deploy.

## 8. Business Rules
Each story must identify role, entity, permission, audit, error states, and acceptance criteria.

## 9. Permissions
Backlog work cannot ship without permission behavior.

## 10. States
Ready, in progress, blocked, review, deployed, validated.

## 11. Exceptions
Legal-sensitive stories require counsel review.

## 12. Security and Privacy
Document/evidence stories require secure storage before real data.

## 13. Audit Requirements
Every epic includes audit-event coverage.

## 14. Dependencies
Docs `01` through `26`, current codebase.

## 15. Acceptance Criteria
Backlog supports MVP pilot and maps to roadmap phases.

## 16. Open Decisions
Sprint sequencing and pilot partner-specific priorities.

## 17. Out-of-Scope Items
Detailed estimation.

## 18. Change History
Initial bundled build-prep version.
