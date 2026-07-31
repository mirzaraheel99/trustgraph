create table if not exists public.real_database_completion_receipts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  status text not null check (status in ('live_rows_missing', 'ready_for_v1_review', 'accepted_for_pilot')),
  completed_steps integer not null check (completed_steps >= 0),
  total_steps integer not null check (total_steps >= 1),
  missing_groups text[] not null default '{}'::text[],
  live_row_groups jsonb not null default '[]'::jsonb,
  preview_data_accepted boolean not null default false,
  production_traffic_allowed boolean not null default false,
  accepted_when text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists real_database_completion_receipts_profile_created_idx
on public.real_database_completion_receipts(profile_id, created_at desc);

create index if not exists real_database_completion_receipts_org_created_idx
on public.real_database_completion_receipts(organization_id, created_at desc);

alter table public.real_database_completion_receipts enable row level security;

drop policy if exists "owners read real database completion receipts" on public.real_database_completion_receipts;
create policy "owners read real database completion receipts"
on public.real_database_completion_receipts
for select
to authenticated
using (
  profile_id = public.current_profile_id()
  or (
    organization_id is not null
    and public.has_active_membership(organization_id)
  )
);

drop policy if exists "owners create real database completion receipts" on public.real_database_completion_receipts;
create policy "owners create real database completion receipts"
on public.real_database_completion_receipts
for insert
to authenticated
with check (
  profile_id = public.current_profile_id()
  and preview_data_accepted = false
  and production_traffic_allowed = false
  and (
    organization_id is null
    or public.has_role(
      organization_id,
      array['system_admin', 'compliance_admin', 'trustgraph_verifier', 'employer_admin', 'staffing_agency_admin']::role_key[]
    )
  )
);

create or replace function public.record_real_database_completion_receipt(
  input_organization_id uuid,
  input_status text,
  input_completed_steps integer,
  input_total_steps integer,
  input_missing_groups text[],
  input_live_row_groups jsonb,
  input_metadata jsonb default '{}'::jsonb
)
returns public.real_database_completion_receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  receipt_row public.real_database_completion_receipts;
  acceptance_rule text := 'real_database_completion_receipt_requires_hosted_login_registration_corporate_workspace_pricing_user_database_access_evidence_consent_team_review_release_owner_receipts_and_no_preview_data';
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if input_status not in ('live_rows_missing', 'ready_for_v1_review', 'accepted_for_pilot') then
    raise exception 'Unsupported real database completion receipt status';
  end if;

  if input_total_steps < 1 or input_completed_steps < 0 or input_completed_steps > input_total_steps then
    raise exception 'Invalid real database completion counts';
  end if;

  if jsonb_typeof(coalesce(input_live_row_groups, '[]'::jsonb)) <> 'array' then
    raise exception 'Live row groups must be a JSON array';
  end if;

  if input_organization_id is not null
    and not public.has_role(
      input_organization_id,
      array['system_admin', 'compliance_admin', 'trustgraph_verifier', 'employer_admin', 'staffing_agency_admin']::role_key[]
    ) then
    raise exception 'Admin role required for real database completion receipts';
  end if;

  insert into public.real_database_completion_receipts (
    profile_id,
    organization_id,
    status,
    completed_steps,
    total_steps,
    missing_groups,
    live_row_groups,
    preview_data_accepted,
    production_traffic_allowed,
    accepted_when,
    metadata
  )
  values (
    current_id,
    input_organization_id,
    input_status,
    input_completed_steps,
    input_total_steps,
    coalesce(input_missing_groups, '{}'::text[]),
    coalesce(input_live_row_groups, '[]'::jsonb),
    false,
    false,
    acceptance_rule,
    coalesce(input_metadata, '{}'::jsonb) || jsonb_build_object(
      'real_database_completion_receipt', true,
      'preview_data_accepted', false,
      'production_traffic_allowed', false
    )
  )
  returning * into receipt_row;

  perform public.log_audit_event(
    current_id,
    input_organization_id,
    'database.real_completion_receipt_recorded',
    'real_database_completion_receipts',
    receipt_row.id,
    'Real database completion receipt recorded',
    jsonb_build_object('status', receipt_row.status, 'missing_groups', receipt_row.missing_groups)
  );

  return receipt_row;
end;
$$;

grant execute on function public.record_real_database_completion_receipt(uuid, text, integer, integer, text[], jsonb, jsonb) to authenticated;
