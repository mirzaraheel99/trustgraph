# TrustGraph Deployment and Operational Readiness

## 1. Document Purpose
Define environment, CI/CD, release, migration, secrets, monitoring, rollback, backup, support, and production-access rules.

## 2. Scope
GitHub Actions, GitHub Pages, Supabase migrations, secrets, feature flags, monitoring, alerts, incident response, rollback, backup/recovery, support operations, reconciliation.

## 3. Definitions
- Release: deployed frontend plus any required database migration.
- Rollback: restore previous frontend and/or apply corrective migration.

## 4. Actors
Engineering, product owner, TrustGraph admin, support operator, incident lead.

## 5. Assumptions
Current deployment uses GitHub Pages and Supabase. Production will add staging and stronger observability.

## 6. Requirements
- Separate dev/staging/prod before production.
- Store secrets in GitHub/Supabase secrets.
- Run migrations through controlled workflow.
- Keep deploy URL stable.
- Maintain audit trail for operational changes.
- Define backup and recovery targets.

## 7. Workflows
Change -> commit -> push -> Pages build -> migration workflow -> smoke test -> release note.

## 8. Business Rules
Database changes must be reviewed for migration and security impact.

## 9. Permissions
Production access limited to approved admins; support access requires reason code.

## 10. States
Draft, ready, deployed, validated, rolled back, incident, recovered.

## 11. Exceptions
Emergency fixes may bypass normal scheduling but not audit requirements.

## 12. Security and Privacy
Rotate exposed secrets, restrict database access, and use least privilege.

## 13. Audit Requirements
Audit deployments, migrations, admin role changes, support access, and incident actions.

## 14. Dependencies
GitHub, Supabase, monitoring, backups, incident process.

## 15. Acceptance Criteria
A release can be built, deployed, migrated, verified, and rolled back with documented steps.

## 16. Open Decisions
Production hosting, monitoring stack, backup retention, release cadence.

## 17. Out-of-Scope Items
Full production runbook automation.

## 18. Change History
Initial bundled build-prep version.
