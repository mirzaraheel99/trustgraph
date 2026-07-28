create table if not exists public.schema_migration_runs (
  id uuid primary key default gen_random_uuid(),
  migration_path text not null,
  commit_sha text,
  workflow_run_id text,
  applied_by text,
  status text not null default 'applied',
  notes text,
  applied_at timestamptz not null default now(),
  unique (migration_path, commit_sha)
);

alter table public.schema_migration_runs enable row level security;

drop policy if exists "admins read schema migration runs" on public.schema_migration_runs;
create policy "admins read schema migration runs"
on public.schema_migration_runs
for select
using (
  exists (
    select 1
    from public.organization_memberships membership
    where membership.profile_id = auth.uid()
      and membership.status = 'active'
      and membership.role in ('trustgraph_verifier', 'compliance_admin', 'system_admin', 'auditor')
  )
);

drop function if exists public.record_schema_migration_run(text, text, text, text, text, text);

create or replace function public.record_schema_migration_run(
  input_migration_path text,
  input_commit_sha text default null,
  input_workflow_run_id text default null,
  input_applied_by text default null,
  input_status text default 'applied',
  input_notes text default null
)
returns public.schema_migration_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  run_row public.schema_migration_runs;
begin
  insert into public.schema_migration_runs (
    migration_path,
    commit_sha,
    workflow_run_id,
    applied_by,
    status,
    notes
  )
  values (
    nullif(trim(input_migration_path), ''),
    nullif(trim(coalesce(input_commit_sha, '')), ''),
    nullif(trim(coalesce(input_workflow_run_id, '')), ''),
    nullif(trim(coalesce(input_applied_by, '')), ''),
    coalesce(nullif(trim(input_status), ''), 'applied'),
    nullif(trim(coalesce(input_notes, '')), '')
  )
  on conflict (migration_path, commit_sha)
  do update set
    workflow_run_id = excluded.workflow_run_id,
    applied_by = excluded.applied_by,
    status = excluded.status,
    notes = excluded.notes,
    applied_at = now()
  returning * into run_row;

  perform public.write_audit_event(
    'schema.migration_recorded',
    'schema_migration_runs',
    run_row.id,
    null,
    'Schema migration run recorded',
    jsonb_build_object(
      'migration_path', run_row.migration_path,
      'commit_sha', run_row.commit_sha,
      'workflow_run_id', run_row.workflow_run_id,
      'status', run_row.status
    )
  );

  return run_row;
end;
$$;
