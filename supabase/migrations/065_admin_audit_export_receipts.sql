create table if not exists public.admin_audit_export_receipts (
  id uuid primary key default gen_random_uuid(),
  recorded_by_profile_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  export_format text not null check (export_format in ('csv_filtered_audit_events', 'json_filtered_audit_events', 'json_full_coverage_packet', 'json_admin_readiness_packet')),
  recommended_export text not null,
  active_filters jsonb not null default '{}'::jsonb,
  filtered_event_count integer not null default 0 check (filtered_event_count >= 0),
  loaded_event_count integer not null default 0 check (loaded_event_count >= 0),
  guardrail_event_count integer not null default 0 check (guardrail_event_count >= 0),
  high_signal_event_count integer not null default 0 check (high_signal_event_count >= 0),
  verification_case_count integer not null default 0 check (verification_case_count >= 0),
  data_rights_request_count integer not null default 0 check (data_rights_request_count >= 0),
  release_ledger_count integer not null default 0 check (release_ledger_count >= 0),
  raw_private_files_included boolean not null default false,
  preview_data_accepted boolean not null default false,
  accepted_when text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_export_receipts_actor_idx
on public.admin_audit_export_receipts(recorded_by_profile_id, created_at desc);

create index if not exists admin_audit_export_receipts_org_idx
on public.admin_audit_export_receipts(organization_id, created_at desc);

alter table public.admin_audit_export_receipts enable row level security;

drop policy if exists "admin operators read audit export receipts" on public.admin_audit_export_receipts;
create policy "admin operators read audit export receipts"
on public.admin_audit_export_receipts
for select
using (
  recorded_by_profile_id = public.current_profile_id()
  or exists (
    select 1
    from public.organization_memberships membership
    where membership.profile_id = public.current_profile_id()
      and membership.status = 'active'
      and membership.role in ('compliance_admin', 'system_admin', 'auditor')
      and (admin_audit_export_receipts.organization_id is null or membership.organization_id = admin_audit_export_receipts.organization_id)
  )
);

drop policy if exists "admin operators create audit export receipts" on public.admin_audit_export_receipts;
create policy "admin operators create audit export receipts"
on public.admin_audit_export_receipts
for insert
with check (
  recorded_by_profile_id = public.current_profile_id()
  and raw_private_files_included = false
  and preview_data_accepted = false
  and exists (
    select 1
    from public.organization_memberships membership
    where membership.profile_id = public.current_profile_id()
      and membership.status = 'active'
      and membership.role in ('compliance_admin', 'system_admin', 'auditor')
      and (admin_audit_export_receipts.organization_id is null or membership.organization_id = admin_audit_export_receipts.organization_id)
  )
);

create or replace function public.record_admin_audit_export_receipt(
  input_organization_id uuid default null,
  input_export_format text default 'csv_filtered_audit_events',
  input_recommended_export text default 'Filtered audit CSV',
  input_active_filters jsonb default '{}'::jsonb,
  input_filtered_event_count integer default 0,
  input_loaded_event_count integer default 0,
  input_guardrail_event_count integer default 0,
  input_high_signal_event_count integer default 0,
  input_verification_case_count integer default 0,
  input_data_rights_request_count integer default 0,
  input_release_ledger_count integer default 0,
  input_metadata jsonb default '{}'::jsonb
)
returns public.admin_audit_export_receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  receipt_row public.admin_audit_export_receipts;
  acceptance_rule text := 'admin_audit_export_receipt_requires_admin_rbac_filtered_audit_scope_case_data_rights_release_context_metadata_only_no_raw_private_files_and_no_preview_data';
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if input_export_format not in ('csv_filtered_audit_events', 'json_filtered_audit_events', 'json_full_coverage_packet', 'json_admin_readiness_packet') then
    raise exception 'Unsupported admin audit export format';
  end if;

  if input_filtered_event_count < 0
    or input_loaded_event_count < 0
    or input_guardrail_event_count < 0
    or input_high_signal_event_count < 0
    or input_verification_case_count < 0
    or input_data_rights_request_count < 0
    or input_release_ledger_count < 0 then
    raise exception 'Admin audit export receipt counts must be non-negative';
  end if;

  if not exists (
    select 1
    from public.organization_memberships membership
    where membership.profile_id = current_id
      and membership.status = 'active'
      and membership.role in ('compliance_admin', 'system_admin', 'auditor')
      and (input_organization_id is null or membership.organization_id = input_organization_id)
  ) then
    raise exception 'Admin, compliance, or auditor role required before recording audit export receipt';
  end if;

  insert into public.admin_audit_export_receipts (
    recorded_by_profile_id,
    organization_id,
    export_format,
    recommended_export,
    active_filters,
    filtered_event_count,
    loaded_event_count,
    guardrail_event_count,
    high_signal_event_count,
    verification_case_count,
    data_rights_request_count,
    release_ledger_count,
    raw_private_files_included,
    preview_data_accepted,
    accepted_when,
    metadata
  )
  values (
    current_id,
    input_organization_id,
    input_export_format,
    input_recommended_export,
    coalesce(input_active_filters, '{}'::jsonb),
    input_filtered_event_count,
    input_loaded_event_count,
    input_guardrail_event_count,
    input_high_signal_event_count,
    input_verification_case_count,
    input_data_rights_request_count,
    input_release_ledger_count,
    false,
    false,
    acceptance_rule,
    coalesce(input_metadata, '{}'::jsonb) || jsonb_build_object(
      'receipt_recorded_at', now(),
      'metadata_only_export', true,
      'raw_private_files_included', false,
      'preview_data_accepted', false
    )
  )
  returning * into receipt_row;

  perform public.write_audit_event(
    'admin_audit_export.receipt_recorded',
    'admin_audit_export_receipts',
    receipt_row.id,
    input_organization_id,
    'Admin audit export receipt recorded',
    jsonb_build_object(
      'export_format', receipt_row.export_format,
      'filtered_event_count', receipt_row.filtered_event_count,
      'recommended_export', receipt_row.recommended_export
    )
  );

  return receipt_row;
end;
$$;

grant execute on function public.record_admin_audit_export_receipt(uuid, text, text, jsonb, integer, integer, integer, integer, integer, integer, integer, jsonb) to authenticated;
