create table if not exists public.corporate_database_visibility_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recorded_by_profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('rows_missing', 'review_ready', 'handoff_ready')),
  filtered_professional_count integer not null default 0 check (filtered_professional_count >= 0),
  shared_record_count integer not null default 0 check (shared_record_count >= 0),
  access_grant_count integer not null default 0 check (access_grant_count >= 0),
  review_attestation_count integer not null default 0 check (review_attestation_count >= 0),
  open_gap_count integer not null default 0 check (open_gap_count >= 0),
  active_filters jsonb not null default '{}'::jsonb,
  readiness_buckets jsonb not null default '[]'::jsonb,
  row_inventory jsonb not null default '[]'::jsonb,
  raw_private_files_included boolean not null default false,
  preview_data_accepted boolean not null default false,
  accepted_when text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists corporate_database_visibility_snapshots_org_idx
on public.corporate_database_visibility_snapshots(organization_id, created_at desc);

create index if not exists corporate_database_visibility_snapshots_actor_idx
on public.corporate_database_visibility_snapshots(recorded_by_profile_id, created_at desc);

alter table public.corporate_database_visibility_snapshots enable row level security;

drop policy if exists "active corporate members read visibility snapshots" on public.corporate_database_visibility_snapshots;
create policy "active corporate members read visibility snapshots"
on public.corporate_database_visibility_snapshots
for select
to authenticated
using (
  public.has_role(
    organization_id,
    array['system_admin', 'compliance_admin', 'employer_admin', 'employer_reviewer', 'staffing_agency_admin', 'recruiter', 'auditor']::role_key[]
  )
);

drop policy if exists "active corporate reviewers create visibility snapshots" on public.corporate_database_visibility_snapshots;
create policy "active corporate reviewers create visibility snapshots"
on public.corporate_database_visibility_snapshots
for insert
to authenticated
with check (
  recorded_by_profile_id = public.current_profile_id()
  and raw_private_files_included = false
  and preview_data_accepted = false
  and public.has_role(
    organization_id,
    array['system_admin', 'compliance_admin', 'employer_admin', 'employer_reviewer', 'staffing_agency_admin', 'recruiter']::role_key[]
  )
);

create or replace function public.record_corporate_database_visibility_snapshot(
  input_organization_id uuid,
  input_status text,
  input_filtered_professional_count integer,
  input_shared_record_count integer,
  input_access_grant_count integer,
  input_review_attestation_count integer,
  input_open_gap_count integer,
  input_active_filters jsonb default '{}'::jsonb,
  input_readiness_buckets jsonb default '[]'::jsonb,
  input_row_inventory jsonb default '[]'::jsonb,
  input_metadata jsonb default '{}'::jsonb
)
returns public.corporate_database_visibility_snapshots
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  snapshot_row public.corporate_database_visibility_snapshots;
  acceptance_rule text := 'corporate_database_visibility_snapshot_requires_active_corporate_rbac_filtered_live_rows_readiness_buckets_review_attestation_and_no_raw_private_files';
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if input_organization_id is null then
    raise exception 'Organization is required for corporate database visibility snapshot';
  end if;

  if input_status not in ('rows_missing', 'review_ready', 'handoff_ready') then
    raise exception 'Unsupported corporate database visibility snapshot status';
  end if;

  if input_filtered_professional_count < 0 or input_shared_record_count < 0 or input_access_grant_count < 0 or input_review_attestation_count < 0 or input_open_gap_count < 0 then
    raise exception 'Corporate database visibility snapshot counts must be non-negative';
  end if;

  if jsonb_typeof(coalesce(input_readiness_buckets, '[]'::jsonb)) <> 'array' then
    raise exception 'Readiness buckets must be a JSON array';
  end if;

  if jsonb_typeof(coalesce(input_row_inventory, '[]'::jsonb)) <> 'array' then
    raise exception 'Row inventory must be a JSON array';
  end if;

  if not public.has_role(
    input_organization_id,
    array['system_admin', 'compliance_admin', 'employer_admin', 'employer_reviewer', 'staffing_agency_admin', 'recruiter']::role_key[]
  ) then
    raise exception 'Active corporate reviewer membership required';
  end if;

  insert into public.corporate_database_visibility_snapshots (
    organization_id,
    recorded_by_profile_id,
    status,
    filtered_professional_count,
    shared_record_count,
    access_grant_count,
    review_attestation_count,
    open_gap_count,
    active_filters,
    readiness_buckets,
    row_inventory,
    raw_private_files_included,
    preview_data_accepted,
    accepted_when,
    metadata
  )
  values (
    input_organization_id,
    current_id,
    input_status,
    input_filtered_professional_count,
    input_shared_record_count,
    input_access_grant_count,
    input_review_attestation_count,
    input_open_gap_count,
    coalesce(input_active_filters, '{}'::jsonb),
    coalesce(input_readiness_buckets, '[]'::jsonb),
    coalesce(input_row_inventory, '[]'::jsonb),
    false,
    false,
    acceptance_rule,
    coalesce(input_metadata, '{}'::jsonb) || jsonb_build_object(
      'corporate_database_visibility_snapshot', true,
      'raw_private_files_included', false,
      'preview_data_accepted', false
    )
  )
  returning * into snapshot_row;

  perform public.write_audit_event(
    'corporate_database.visibility_snapshot_recorded',
    'corporate_database_visibility_snapshots',
    snapshot_row.id,
    snapshot_row.organization_id,
    'Corporate database visibility snapshot recorded',
    jsonb_build_object(
      'status', snapshot_row.status,
      'filtered_professional_count', snapshot_row.filtered_professional_count,
      'shared_record_count', snapshot_row.shared_record_count,
      'open_gap_count', snapshot_row.open_gap_count
    )
  );

  return snapshot_row;
end;
$$;

grant execute on function public.record_corporate_database_visibility_snapshot(uuid, text, integer, integer, integer, integer, integer, jsonb, jsonb, jsonb, jsonb) to authenticated;
