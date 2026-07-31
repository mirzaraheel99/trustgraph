create table if not exists public.corporate_database_access_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recorded_by_profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('ready_for_review', 'access_rows_required', 'attestation_required', 'export_recorded')),
  access_grant_count integer not null default 0 check (access_grant_count >= 0),
  shared_record_count integer not null default 0 check (shared_record_count >= 0),
  review_attestation_count integer not null default 0 check (review_attestation_count >= 0),
  open_gap_count integer not null default 0 check (open_gap_count >= 0),
  exported_packet_name text not null,
  preview_data_accepted_for_v1 boolean not null default false,
  accepted_when text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists corporate_database_access_receipts_org_idx
  on public.corporate_database_access_receipts(organization_id, created_at desc);

create index if not exists corporate_database_access_receipts_actor_idx
  on public.corporate_database_access_receipts(recorded_by_profile_id, created_at desc);

alter table public.corporate_database_access_receipts enable row level security;

drop policy if exists "active corporate members read database access receipts" on public.corporate_database_access_receipts;
create policy "active corporate members read database access receipts"
on public.corporate_database_access_receipts
for select
using (
  exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = corporate_database_access_receipts.organization_id
      and membership.profile_id = public.current_profile_id()
      and membership.status = 'active'
      and membership.role in ('employer_admin', 'employer_reviewer', 'staffing_agency_admin', 'recruiter', 'compliance_admin', 'system_admin', 'auditor')
  )
);

drop policy if exists "active corporate reviewers create database access receipts" on public.corporate_database_access_receipts;
create policy "active corporate reviewers create database access receipts"
on public.corporate_database_access_receipts
for insert
with check (
  recorded_by_profile_id = public.current_profile_id()
  and preview_data_accepted_for_v1 = false
  and exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = corporate_database_access_receipts.organization_id
      and membership.profile_id = public.current_profile_id()
      and membership.status = 'active'
      and membership.role in ('employer_admin', 'employer_reviewer', 'staffing_agency_admin', 'recruiter', 'compliance_admin')
  )
);

create or replace function public.record_corporate_database_access_receipt(
  input_organization_id uuid,
  input_status text default 'access_rows_required',
  input_access_grant_count integer default 0,
  input_shared_record_count integer default 0,
  input_review_attestation_count integer default 0,
  input_open_gap_count integer default 0,
  input_exported_packet_name text default 'corporate-user-database-packet.json',
  input_metadata jsonb default '{}'::jsonb
)
returns public.corporate_database_access_receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  receipt_row public.corporate_database_access_receipts;
  acceptance_rule text := 'corporate_database_access_receipt_requires_active_corporate_rbac_approved_access_grants_shared_rows_review_attestation_export_and_no_preview_data';
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if input_organization_id is null then
    raise exception 'Organization is required for corporate database access receipt';
  end if;

  if input_status not in ('ready_for_review', 'access_rows_required', 'attestation_required', 'export_recorded') then
    raise exception 'Unsupported corporate database access receipt status';
  end if;

  if input_access_grant_count < 0 or input_shared_record_count < 0 or input_review_attestation_count < 0 or input_open_gap_count < 0 then
    raise exception 'Corporate database access receipt counts must be non-negative';
  end if;

  if not exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = input_organization_id
      and membership.profile_id = current_id
      and membership.status = 'active'
      and membership.role in ('employer_admin', 'employer_reviewer', 'staffing_agency_admin', 'recruiter', 'compliance_admin')
  ) then
    raise exception 'Active corporate reviewer membership required';
  end if;

  if input_status in ('ready_for_review', 'export_recorded') and input_access_grant_count = 0 then
    raise exception 'Corporate database access receipt requires at least one Access Grant';
  end if;

  if input_status in ('ready_for_review', 'export_recorded') and input_shared_record_count = 0 then
    raise exception 'Corporate database access receipt requires shared Passport rows';
  end if;

  if input_status in ('ready_for_review', 'export_recorded') and input_review_attestation_count = 0 then
    raise exception 'Corporate database access receipt requires a review attestation';
  end if;

  insert into public.corporate_database_access_receipts (
    organization_id,
    recorded_by_profile_id,
    status,
    access_grant_count,
    shared_record_count,
    review_attestation_count,
    open_gap_count,
    exported_packet_name,
    preview_data_accepted_for_v1,
    accepted_when,
    metadata
  )
  values (
    input_organization_id,
    current_id,
    input_status,
    input_access_grant_count,
    input_shared_record_count,
    input_review_attestation_count,
    input_open_gap_count,
    coalesce(nullif(trim(input_exported_packet_name), ''), 'corporate-user-database-packet.json'),
    false,
    acceptance_rule,
    coalesce(input_metadata, '{}'::jsonb)
  )
  returning * into receipt_row;

  perform public.write_audit_event(
    'corporate_database_access.receipt_recorded',
    'corporate_database_access_receipts',
    receipt_row.id,
    receipt_row.organization_id,
    'Corporate database access receipt recorded',
    jsonb_build_object(
      'status', receipt_row.status,
      'access_grant_count', receipt_row.access_grant_count,
      'shared_record_count', receipt_row.shared_record_count,
      'review_attestation_count', receipt_row.review_attestation_count,
      'open_gap_count', receipt_row.open_gap_count,
      'preview_data_accepted_for_v1', receipt_row.preview_data_accepted_for_v1
    )
  );

  return receipt_row;
end;
$$;

grant execute on function public.record_corporate_database_access_receipt(
  uuid,
  text,
  integer,
  integer,
  integer,
  integer,
  text,
  jsonb
) to authenticated;
