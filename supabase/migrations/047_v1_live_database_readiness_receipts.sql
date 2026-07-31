create table if not exists public.v1_live_database_readiness_receipts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  status text not null check (status in ('live_database_rows_accepted', 'live_database_rows_required')),
  source text not null check (source in ('signed_in_supabase_rows', 'preview_or_logged_out')),
  ready_groups integer not null default 0 check (ready_groups >= 0),
  total_required_groups integer not null check (total_required_groups >= 0),
  missing_required_groups text[] not null default '{}',
  required_operator_exports text[] not null default '{}',
  preview_data_accepted_for_v1 boolean not null default false,
  accepted_when text not null,
  server_save_status text not null default 'not_proven',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists v1_live_database_readiness_profile_idx
  on public.v1_live_database_readiness_receipts(profile_id, created_at desc);

create index if not exists v1_live_database_readiness_org_idx
  on public.v1_live_database_readiness_receipts(organization_id, created_at desc);

alter table public.v1_live_database_readiness_receipts enable row level security;

drop policy if exists "owners read v1 live database readiness receipts" on public.v1_live_database_readiness_receipts;
create policy "owners read v1 live database readiness receipts"
on public.v1_live_database_readiness_receipts
for select
using (
  profile_id = public.current_profile_id()
  or exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = v1_live_database_readiness_receipts.organization_id
      and membership.profile_id = public.current_profile_id()
      and membership.status = 'active'
      and membership.role in ('employer_admin', 'staffing_agency_admin', 'compliance_admin', 'system_admin', 'auditor')
  )
);

drop policy if exists "owners create v1 live database readiness receipts" on public.v1_live_database_readiness_receipts;
create policy "owners create v1 live database readiness receipts"
on public.v1_live_database_readiness_receipts
for insert
with check (
  profile_id = public.current_profile_id()
  and preview_data_accepted_for_v1 = false
  and (
    organization_id is null
    or exists (
      select 1
      from public.organization_memberships membership
      where membership.organization_id = v1_live_database_readiness_receipts.organization_id
        and membership.profile_id = public.current_profile_id()
        and membership.status = 'active'
    )
  )
);

create or replace function public.record_v1_live_database_readiness_receipt(
  input_organization_id uuid default null,
  input_status text default 'live_database_rows_required',
  input_source text default 'preview_or_logged_out',
  input_ready_groups integer default 0,
  input_total_required_groups integer default 0,
  input_missing_required_groups text[] default '{}',
  input_required_operator_exports text[] default '{}',
  input_server_save_status text default 'not_proven',
  input_metadata jsonb default '{}'::jsonb
)
returns public.v1_live_database_readiness_receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  receipt_row public.v1_live_database_readiness_receipts;
  acceptance_rule text := 'v1_live_database_readiness_requires_signed_in_supabase_rows_for_professional_corporate_access_evidence_consent_billing_team_review_registration_release_and_no_preview_data';
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if input_status not in ('live_database_rows_accepted', 'live_database_rows_required') then
    raise exception 'Unsupported V1 live database readiness status';
  end if;

  if input_source not in ('signed_in_supabase_rows', 'preview_or_logged_out') then
    raise exception 'Unsupported V1 live database readiness source';
  end if;

  if input_ready_groups < 0 or input_total_required_groups < 0 then
    raise exception 'V1 live database row group counts must be non-negative';
  end if;

  if input_status = 'live_database_rows_accepted' and input_source <> 'signed_in_supabase_rows' then
    raise exception 'Accepted V1 live database readiness requires signed-in Supabase rows';
  end if;

  if input_status = 'live_database_rows_accepted' and input_ready_groups <> input_total_required_groups then
    raise exception 'Accepted V1 live database readiness requires all required row groups';
  end if;

  if input_organization_id is not null and not exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = input_organization_id
      and membership.profile_id = current_id
      and membership.status = 'active'
  ) then
    raise exception 'Active organization membership required';
  end if;

  insert into public.v1_live_database_readiness_receipts (
    profile_id,
    organization_id,
    status,
    source,
    ready_groups,
    total_required_groups,
    missing_required_groups,
    required_operator_exports,
    preview_data_accepted_for_v1,
    accepted_when,
    server_save_status,
    metadata
  )
  values (
    current_id,
    input_organization_id,
    input_status,
    input_source,
    input_ready_groups,
    input_total_required_groups,
    coalesce(input_missing_required_groups, '{}'),
    coalesce(input_required_operator_exports, '{}'),
    false,
    acceptance_rule,
    coalesce(nullif(trim(input_server_save_status), ''), 'not_proven'),
    coalesce(input_metadata, '{}'::jsonb)
  )
  returning * into receipt_row;

  perform public.write_audit_event(
    'v1_live_database_readiness.receipt_recorded',
    'v1_live_database_readiness_receipts',
    receipt_row.id,
    receipt_row.organization_id,
    'V1 live database readiness receipt recorded',
    jsonb_build_object(
      'status', receipt_row.status,
      'source', receipt_row.source,
      'ready_groups', receipt_row.ready_groups,
      'total_required_groups', receipt_row.total_required_groups,
      'preview_data_accepted_for_v1', receipt_row.preview_data_accepted_for_v1,
      'server_save_status', receipt_row.server_save_status
    )
  );

  return receipt_row;
end;
$$;

grant execute on function public.record_v1_live_database_readiness_receipt(
  uuid,
  text,
  text,
  integer,
  integer,
  text[],
  text[],
  text,
  jsonb
) to authenticated;
