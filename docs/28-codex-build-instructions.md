# TrustGraph Codex Build Instructions

## 1. Document Purpose
Define how Codex should continue building TrustGraph in alignment with the approved plan.

## 2. Scope
Repository structure, coding standards, definition of ready, definition of done, deployment workflow, traceability.

## 3. Definitions
- Foundation-first: data, permission, audit, and workflow before decorative UI.
- Premium SaaS UI: dense, modern, trustworthy, and usable; not a generic dashboard.

## 4. Actors
Codex, product owner, engineering reviewer.

## 5. Assumptions
The GitHub repo and Supabase project are connected. GitHub Actions is the validation/deploy path.

## 6. Requirements
- Use React, Next.js, TypeScript.
- Follow existing repositories in `src/*Repository.ts`.
- Prefer Supabase RPC for sensitive workflow writes.
- Add migrations under `supabase/migrations/`.
- Update `src/database.ts` for new row types.
- Preserve RLS and audit behavior.
- Keep UI premium, dense, responsive, and clear.
- Push to GitHub and watch Actions after meaningful changes.

## 7. Workflows
Read plan -> choose next backlog group -> implement migration/repository/UI/docs -> commit -> push -> migrate -> watch deploy -> smoke test.

## 8. Business Rules
Do not silently reduce TrustGraph to references. Every feature must connect to a role, workflow, entity, permission, audit event, and acceptance criteria.

## 9. Permissions
Never add UI access without matching RLS or RPC enforcement for live data.

## 10. States
Planned, implemented, deployed, verified.

## 11. Exceptions
If user asks for design-only work, do not alter DB. If secrets are exposed, recommend rotation.

## 12. Security and Privacy
Never commit secrets. Avoid real sensitive data in demo fixtures.

## 13. Audit Requirements
New material workflow actions must call or produce Audit Events.

## 14. Dependencies
GitHub, Supabase, migrations workflow, Pages workflow, planning docs.

## 15. Acceptance Criteria
Each Codex build turn ends with commit, push, migration/deploy validation where relevant, and a concise status.

## 16. Open Decisions
When to introduce staging, object storage, and a test runner.

## 17. Out-of-Scope Items
Manual production database edits outside approved workflows.

## 18. Change History
Initial bundled build-prep version.
