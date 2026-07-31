create table if not exists public.data_export_packages (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  data_rights_request_id uuid references public.data_rights_requests(id) on delete set null,
  package_receipt_id uuid references public.data_export_package_receipts(id) on delete set null,
  status text not null default 'ready' check (status in ('ready', 'downloaded', 'expired')),
  package_scope text not null,
  manifest jsonb not null default '{}'::jsonb,
  passport_record_count integer not null default 0 check (passport_record_count >= 0),
  evidence_metadata_count integer not null default 0 check (evidence_metadata_count >= 0),
  access_grant_count integer not null default 0 check (access_grant_count >= 0),
  audit_event_count integer not null default 0 check (audit_event_count >= 0),
  raw_private_files_included boolean not null default false,
  download_url_stored boolean not null default false,
  generated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  downloaded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists data_export_packages_profile_created_idx
on public.data_export_packages(profile_id, created_at desc);

alter table public.data_export_packages enable row level security;

drop trigger if exists data_export_packages_set_updated_at on public.data_export_packages;
create trigger data_export_packages_set_updated_at
before update on public.data_export_packages
for each row execute function public.set_updated_at();

drop policy if exists "profiles read own data export packages" on public.data_export_packages;
create policy "profiles read own data export packages"
on public.data_export_packages
for select
using (profile_id = public.current_profile_id());

drop policy if exists "profiles create own data export packages" on public.data_export_packages;
create policy "profiles create own data export packages"
on public.data_export_packages
for insert
with check (
  profile_id = public.current_profile_id()
  and raw_private_files_included = false
  and download_url_stored = false
);

drop policy if exists "profiles mark own data export packages" on public.data_export_packages;
create policy "profiles mark own data export packages"
on public.data_export_packages
for update
using (profile_id = public.current_profile_id())
with check (
  profile_id = public.current_profile_id()
  and raw_private_files_included = false
  and download_url_stored = false
);

drop policy if exists "admins read data export packages" on public.data_export_packages;
create policy "admins read data export packages"
on public.data_export_packages
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

create or replace function public.generate_data_export_package(
  input_data_rights_request_id uuid,
  input_package_receipt_id uuid default null,
  input_package_scope text default 'all_eligible_profile_data',
  input_passport_record_count integer default 0,
  input_evidence_metadata_count integer default 0,
  input_access_grant_count integer default 0,
  input_audit_event_count integer default 0,
  input_manifest jsonb default '{}'::jsonb
)
returns public.data_export_packages
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  request_row public.data_rights_requests;
  receipt_row public.data_export_package_receipts;
  package_row public.data_export_packages;
  acceptance_rule text := 'data_export_package_manifest_requires_owner_data_export_request_metadata_only_no_raw_private_files_no_download_url_storage_and_audit_event';
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if input_data_rights_request_id is null then
    raise exception 'Data export request required';
  end if;

  if input_passport_record_count < 0 or input_evidence_metadata_count < 0 or input_access_grant_count < 0 or input_audit_event_count < 0 then
    raise exception 'Data export package counts must be non-negative';
  end if;

  select *
    into request_row
  from public.data_rights_requests
  where id = input_data_rights_request_id
    and profile_id = current_id
    and request_type = 'data_export';

  if not found then
    raise exception 'Owner data export request required';
  end if;

  if input_package_receipt_id is not null then
    select *
      into receipt_row
    from public.data_export_package_receipts
    where id = input_package_receipt_id
      and profile_id = current_id
      and raw_private_files_included = false
      and preview_data_accepted_for_v1 = false;

    if not found then
      raise exception 'Owner metadata-only data export package receipt required';
    end if;
  end if;

  insert into public.data_export_packages (
    profile_id,
    data_rights_request_id,
    package_receipt_id,
    status,
    package_scope,
    manifest,
    passport_record_count,
    evidence_metadata_count,
    access_grant_count,
    audit_event_count,
    raw_private_files_included,
    download_url_stored
  )
  values (
    current_id,
    request_row.id,
    input_package_receipt_id,
    'ready',
    coalesce(nullif(trim(input_package_scope), ''), request_row.requested_scope),
    coalesce(input_manifest, '{}'::jsonb) || jsonb_build_object(
      'accepted_when', acceptance_rule,
      'data_rights_request_id', request_row.id,
      'package_receipt_id', input_package_receipt_id,
      'raw_private_files_included', false,
      'download_url_stored', false,
      'generated_from', 'signed_in_supabase_rows'
    ),
    input_passport_record_count,
    input_evidence_metadata_count,
    input_access_grant_count,
    input_audit_event_count,
    false,
    false
  )
  returning * into package_row;

  perform public.write_audit_event(
    'data_export.package_generated',
    'data_export_packages',
    package_row.id,
    null,
    'Data export package manifest generated',
    jsonb_build_object(
      'data_rights_request_id', request_row.id,
      'package_receipt_id', package_row.package_receipt_id,
      'package_scope', package_row.package_scope,
      'passport_record_count', package_row.passport_record_count,
      'evidence_metadata_count', package_row.evidence_metadata_count,
      'access_grant_count', package_row.access_grant_count,
      'audit_event_count', package_row.audit_event_count,
      'raw_private_files_included', false,
      'download_url_stored', false
    )
  );

  return package_row;
end;
$$;

grant execute on function public.generate_data_export_package(
  uuid,
  uuid,
  text,
  integer,
  integer,
  integer,
  integer,
  jsonb
) to authenticated;

create or replace function public.mark_data_export_package_downloaded(
  input_package_id uuid
)
returns public.data_export_packages
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  package_row public.data_export_packages;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  update public.data_export_packages
  set
    status = case when expires_at < now() then 'expired' else 'downloaded' end,
    downloaded_at = case when expires_at < now() then downloaded_at else now() end,
    raw_private_files_included = false,
    download_url_stored = false,
    updated_at = now()
  where id = input_package_id
    and profile_id = current_id
  returning * into package_row;

  if not found then
    raise exception 'Owner data export package required';
  end if;

  perform public.write_audit_event(
    'data_export.package_download_marked',
    'data_export_packages',
    package_row.id,
    null,
    'Data export package download marked',
    jsonb_build_object(
      'status', package_row.status,
      'downloaded_at', package_row.downloaded_at,
      'raw_private_files_included', false,
      'download_url_stored', false
    )
  );

  return package_row;
end;
$$;

grant execute on function public.mark_data_export_package_downloaded(uuid) to authenticated;
