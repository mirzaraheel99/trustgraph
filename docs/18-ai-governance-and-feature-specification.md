# TrustGraph AI Governance and Feature Specification

## 1. Document Purpose
Define where AI is allowed, where it is prohibited, and how AI output must be reviewed, labeled, and audited.

## 2. Scope
Document classification, extraction, summaries, missing-record detection, inconsistency detection, duplicate detection, expiration extraction, fraud-risk signals, admin review assistance.

## 3. Definitions
- AI advisory output: non-final machine-generated suggestion.
- Human review required: state requiring a qualified user to approve or reject output.
- Source-grounded summary: generated only from accessible verified/source-labeled data.

## 4. Actors
Professional, Employer Reviewer, TrustGraph Verifier, Compliance Administrator, AI service.

## 5. Assumptions
AI cannot make final employment decisions, invent credentials, create hidden reputation scores, or replace official verification.

## 6. Requirements
- Show source data, confidence, review requirement, model/prompt version where appropriate.
- Keep AI summaries separate from verification status.
- Route suspicious patterns to Admin cases.
- Audit AI output creation and human decisions.

## 7. Workflows
Document upload -> classification/extraction -> confidence label -> human review if needed -> record suggestion or verification case -> audit event.

## 8. Business Rules
AI can suggest, detect, classify, and summarize; it cannot verify authoritative truth without accepted source evidence.

## 9. Permissions
AI operates only on data the actor/service is authorized to process.

## 10. States
Pending, generated, human review required, accepted, rejected, superseded, archived.

## 11. Exceptions
Low confidence, conflicting sources, sensitive classification, or regulated background-check content requires human review.

## 12. Security and Privacy
Do not send unnecessary sensitive data to AI providers. Redact, minimize, log, and retain according to classification.

## 13. Audit Requirements
Audit source data references, model/prompt version, confidence, output, reviewer, and final action.

## 14. Dependencies
Evidence documents, audit events, verification cases, AI provider, privacy model, legal review.

## 15. Acceptance Criteria
Every AI feature has allowed use, prohibited use, source requirements, confidence label, human review rule, and audit event.

## 16. Open Decisions
Model provider, prompt registry, evaluation suite, bias testing, retention policy.

## 17. Out-of-Scope Items
Automated hiring decisions and worker ranking.

## 18. Change History
Initial bundled build-prep version.
