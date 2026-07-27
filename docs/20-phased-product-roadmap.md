# TrustGraph Phased Product Roadmap

## 1. Document Purpose
Define the product roadmap from current foundation through ecosystem expansion.

## 2. Scope
Six roadmap phases: foundation, work/credentials, trust contributions, employer/agency operations, compliance/external verification, intelligence/ecosystem.

## 3. Definitions
- Foundation track: core platform capability required by multiple modules.
- Product module: end-user feature area.

## 4. Actors
All TrustGraph user roles and internal operators.

## 5. Assumptions
Build in controlled increments. Do not attempt every future feature in MVP.

## 6. Requirements
- Phase 1: auth, organizations, professional profile, identity verification, permissions, evidence documents, audit system.
- Phase 2: employment, contracts, responsibilities, licenses, certifications, expirations, employer confirmation.
- Phase 3: references, training, skills, performance reviews, continuing education, digital credentials.
- Phase 4: shared-profile review, access requests, candidate readiness, credential monitoring, team management, reporting.
- Phase 5: background checks, license integrations, credential issuers, compliance workflows, verification providers.
- Phase 6: AI, APIs, ATS/HRIS, fraud analytics, cross-industry configuration, partner ecosystem.

## 7. Workflows
Roadmap work should flow from data model -> permissions -> workflow -> UI -> audit -> QA -> deployment.

## 8. Business Rules
Every phase must preserve source labels, consent, role boundaries, and auditability.

## 9. Permissions
Each phase must list new permissions before implementation.

## 10. States
Planned, designed, implemented, deployed, validated, hardened.

## 11. Exceptions
Legal-sensitive work requires legal review before production release.

## 12. Security and Privacy
No phase may weaken tenant isolation or evidence access rules.

## 13. Audit Requirements
Every new material action maps to an Audit Event.

## 14. Dependencies
Docs `01` through `19`, migrations, Supabase policies, hosted deploy workflows.

## 15. Acceptance Criteria
Roadmap maps to all 19 locked profile areas and all platform users.

## 16. Open Decisions
Pilot sequencing, integration vendors, billing launch timing.

## 17. Out-of-Scope Items
Detailed sprint estimation.

## 18. Change History
Initial bundled build-prep version.
