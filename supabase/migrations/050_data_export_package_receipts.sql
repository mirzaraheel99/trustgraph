create table if not exists public.data_export_package_receipts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  data_rights_request_id uuid references public.data_rights_requests(id) on delete set null,
  status text not null check (status in ('export_ready', 'request_required', 'review_pending')),
  requested_scope text not null,
  passport_record_count integer not null default 0 check (passport_record_count >= 0),
  evidence_metadata_count integer not null default 0 check (evidence_metadata_count >= 0),
  access_grant_count integer not null default 0 check (access_grant_count >= 0),
  audit_event_count integer not null default 0 check (audit_event_count >= 0),
  raw_private_files_included boolean not null default false,
  preview_data_accepted_for_v1 boolean not null default false,
  accepted_when text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists data_export_package_receipts_profile_idx
  on public.data_export_package_receipts(profile_id, created_at desc);

alter table public.data_export_package_receipts enable row level security;

drop policy if exists "profiles read own data export package receipts" on public.data_export_package_receipts;
create policy "profiles read own data export package receipts"
on public.data_export_package_receipts
for select
using (profile_id = public.current_profile_id());

drop policy if exists "profiles create own data export package receipts" on public.data_export_package_receipts;
create policy "profiles create own data export package receipts"
on public.data_export_package_receipts
for insert
with check (
  profile_id = public.current_profile_id()
  and raw_private_files_included = false
  and preview_data_accepted_for_v1 = false
);

drop policy if exists "admins read data export package receipts" on public.data_export_package_receipts;
create policy "admins read data export package receipts"
on public.data_export_package_receipts
for select
using (
  exists (
    select 1
    from public.organization_memberships membership
    where membership.profile_id = public.current_profile_id()
      and membership.status = 'active'
      and membership.role in ('trustgraph_verifier', 'compliance_admin', 'system_admin', 'auditor')
  )
);

create or replace function public.record_data_export_package_receipt(
  input_data_rights_request_id uuid default null,
  input_status text default 'request_required',
  input_requested_scope text default 'all_eligible_profile_data',
  input_passport_record_count integer default 0,
  input_evidence_metadata_count integer default 0,
  input_access_grant_count integer default 0,
  input_audit_event_count integer default 0,
  input_metadata jsonb default '{}'::jsonb
)
returns public.data_export_package_receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  request_row public.data_rights_requests;
  receipt_row public.data_export_package_receipts;
  acceptance_rule text := 'data_export_package_receipt_requires_signed_in_owner_live_rows_review_request_metadata_only_raw_private_files_excluded_and_no_preview_data';
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if input_status not in ('export_ready', 'request_required', 'review_pending') then
    raise exception 'Unsupported data export package receipt status';
  end if;

  if input_passport_record_count < 0 or input_evidence_metadata_count < 0 or input_access_grant_count < 0 or input_audit_event_count < 0 then
    raise exception 'Data export package receipt counts must be non-negative';
  end if;

  if input_data_rights_request_id is not null then
    select *
      into request_row
    from public.data_rights_requests
    where id = input_data_rights_request_id
      and profile_id = current_id
      and request_type = 'data_export';

    if not found then
      raise exception 'Owner data export request required';
    end if;
  end if;

  if input_status = 'export_ready' and input_data_rights_request_id is null then
    raise exception 'Export-ready receipt requires a data export request';
  end if;

  insert into public.data_export_package_receipts (
    profile_id,
    data_rights_request_id,
    status,
    requested_scope,
    passport_record_count,
    evidence_metadata_count,
    access_grant_count,
    audit_event_count,
    raw_private_files_included,
    preview_data_accepted_for_v1,
    accepted_when,
    metadata
  )
  values (
    current_id,
    input_data_rights_request_id,
    input_status,
    coalesce(nullif(trim(input_requested_scope), ''), 'all_eligible_profile_data'),
    input_passport_record_count,
    input_evidence_metadata_count,
    input_access_grant_count,
    input_audit_event_count,
    false,
    false,
    acceptance_rule,
    coalesce(input_metadata, '{}'::jsonb)
  )
  returning * into receipt_row;

  perform public.write_audit_event(
    'data_export.package_receipt_recorded',
    'data_export_package_receipts',
    receipt_row.id,
    null,
    'Data export package receipt recorded',
    jsonb_build_object(
      'data_rights_request_id', receipt_row.data_rights_request_id,
      'status', receipt_row.status,
      'requested_scope', receipt_row.requested_scope,
      'passport_record_count', receipt_row.passport_record_count,
      'evidence_metadata_count', receipt_row.evidence_metadata_count,
      'access_grant_count', receipt_row.access_grant_count,
      'audit_event_count', receipt_row.audit_event_count,
      'raw_private_files_included', false,
      'preview_data_accepted_for_v1', false
    )
  );

  return receipt_row;
end;
$$;

grant execute on function public.record_data_export_package_receipt(
  uuid,
  text,
  text,
  integer,
  integer,
  integer,
  integer,
  jsonb
) to authenticated;
