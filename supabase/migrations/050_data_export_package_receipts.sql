do $$
begin
  create type data_rights_request_type as enum ('data_export', 'account_closure');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type data_rights_request_status as enum ('requested', 'in_review', 'ready', 'blocked', 'completed', 'cancelled');
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.data_rights_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  request_type data_rights_request_type not null,
  status data_rights_request_status not null default 'requested',
  requested_scope text not null default 'all_eligible_profile_data',
  reason text,
  reviewer_note text,
  metadata jsonb not null default '{}'::jsonb,
  requested_at timestamptz not null default now(),
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists data_rights_requests_profile_created_idx
on public.data_rights_requests(profile_id, created_at desc);

alter table public.data_rights_requests enable row level security;

drop trigger if exists data_rights_requests_set_updated_at on public.data_rights_requests;
create trigger data_rights_requests_set_updated_at
before update on public.data_rights_requests
for each row execute function public.set_updated_at();

drop policy if exists "profiles read own data rights requests" on public.data_rights_requests;
create policy "profiles read own data rights requests"
on public.data_rights_requests
for select
using (profile_id = public.current_profile_id());

drop policy if exists "profiles create own data rights requests" on public.data_rights_requests;
create policy "profiles create own data rights requests"
on public.data_rights_requests
for insert
with check (profile_id = public.current_profile_id());

drop policy if exists "admins read data rights requests" on public.data_rights_requests;
create policy "admins read data rights requests"
on public.data_rights_requests
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

drop policy if exists "admins manage data rights requests" on public.data_rights_requests;
create policy "admins manage data rights requests"
on public.data_rights_requests
for update
using (
  exists (
    select 1
    from public.organization_memberships membership
    where membership.profile_id = public.current_profile_id()
      and membership.status = 'active'
      and membership.role in ('compliance_admin', 'system_admin')
  )
)
with check (
  exists (
    select 1
    from public.organization_memberships membership
    where membership.profile_id = public.current_profile_id()
      and membership.status = 'active'
      and membership.role in ('compliance_admin', 'system_admin')
  )
);

create or replace function public.request_data_rights_action(
  action_type data_rights_request_type,
  requested_scope text default 'all_eligible_profile_data',
  request_reason text default null
)
returns public.data_rights_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  request_row public.data_rights_requests;
  ops_org public.organizations;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  select *
    into ops_org
  from public.organizations
  where name = 'TrustGraph Operations'
    and type = 'trustgraph'
  limit 1;

  if not found then
    insert into public.organizations (name, type, status, domain)
    values ('TrustGraph Operations', 'trustgraph', 'active', 'trustgraph.local')
    returning * into ops_org;
  end if;

  insert into public.data_rights_requests (
    profile_id,
    request_type,
    status,
    requested_scope,
    reason,
    due_at,
    metadata
  )
  values (
    current_id,
    action_type,
    'requested',
    coalesce(nullif(trim(requested_scope), ''), 'all_eligible_profile_data'),
    nullif(trim(coalesce(request_reason, '')), ''),
    case
      when action_type = 'account_closure' then now() + interval '7 days'
      else now() + interval '30 days'
    end,
    jsonb_build_object(
      'workflow', 'account_data_rights',
      'requires_legal_retention_review', action_type = 'account_closure',
      'automatic_deletion_enabled', false,
      'eligible_export_scope', coalesce(nullif(trim(requested_scope), ''), 'all_eligible_profile_data')
    )
  )
  returning * into request_row;

  perform public.write_audit_event(
    case when action_type = 'account_closure' then 'account.closure_requested' else 'account.data_export_requested' end,
    'data_rights_requests',
    request_row.id,
    ops_org.id,
    case when action_type = 'account_closure' then 'Professional requested account closure review' else 'Professional requested data export' end,
    jsonb_build_object(
      'profile_id', current_id,
      'request_type', action_type,
      'requested_scope', request_row.requested_scope,
      'status', request_row.status
    )
  );

  insert into public.notification_events (
    recipient_profile_id,
    organization_id,
    channel,
    status,
    priority,
    event_type,
    title,
    body,
    target_table,
    target_id,
    metadata
  )
  values (
    current_id,
    ops_org.id,
    'in_app',
    'queued',
    case when action_type = 'account_closure' then 'high' else 'normal' end,
    case when action_type = 'account_closure' then 'account.closure_requested' else 'account.data_export_requested' end,
    case when action_type = 'account_closure' then 'Account closure request received' else 'Data export request received' end,
    case
      when action_type = 'account_closure'
        then 'TrustGraph received your closure request. Retention, legal hold, active grants, and unresolved cases are reviewed before any closure action.'
      else 'TrustGraph received your export request. Eligible Passport, evidence metadata, grants, notifications, and audit activity will be packaged according to policy.'
    end,
    'data_rights_requests',
    request_row.id,
    jsonb_build_object('workflow', 'account_data_rights', 'request_type', action_type)
  );

  return request_row;
end;
$$;

create or replace function public.mark_data_rights_request_status(
  target_request_id uuid,
  next_status data_rights_request_status,
  status_note text default null
)
returns public.data_rights_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  request_row public.data_rights_requests;
  ops_org public.organizations;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  select *
    into request_row
  from public.data_rights_requests
  where id = target_request_id;

  if not found then
    raise exception 'Data rights request not found';
  end if;

  if not exists (
    select 1
    from public.organization_memberships membership
    where membership.profile_id = current_id
      and membership.status = 'active'
      and membership.role in ('compliance_admin', 'system_admin')
  ) then
    raise exception 'Compliance admin role required';
  end if;

  select *
    into ops_org
  from public.organizations
  where name = 'TrustGraph Operations'
    and type = 'trustgraph'
  limit 1;

  if not found then
    insert into public.organizations (name, type, status, domain)
    values ('TrustGraph Operations', 'trustgraph', 'active', 'trustgraph.local')
    returning * into ops_org;
  end if;

  update public.data_rights_requests
  set
    status = next_status,
    reviewer_note = nullif(trim(coalesce(status_note, request_row.reviewer_note, '')), ''),
    completed_at = case when next_status in ('completed', 'cancelled') then now() else completed_at end,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'last_reviewed_by_profile_id', current_id,
      'last_reviewed_at', now(),
      'automatic_deletion_enabled', false
    ),
    updated_at = now()
  where id = target_request_id
  returning * into request_row;

  perform public.write_audit_event(
    'data_rights.status_changed',
    'data_rights_requests',
    request_row.id,
    ops_org.id,
    'Data rights request status changed',
    jsonb_build_object(
      'profile_id', request_row.profile_id,
      'request_type', request_row.request_type,
      'next_status', next_status,
      'reviewer_note', request_row.reviewer_note,
      'automatic_deletion_enabled', false
    )
  );

  insert into public.notification_events (
    recipient_profile_id,
    organization_id,
    channel,
    status,
    priority,
    event_type,
    title,
    body,
    target_table,
    target_id,
    metadata
  )
  values (
    request_row.profile_id,
    ops_org.id,
    'in_app',
    'queued',
    case when next_status = 'blocked' then 'high' else 'normal' end,
    'data_rights.status_changed',
    'Data rights request updated',
    'TrustGraph updated your data export or account closure request status to ' || replace(next_status::text, '_', ' ') || '.',
    'data_rights_requests',
    request_row.id,
    jsonb_build_object('workflow', 'account_data_rights', 'request_type', request_row.request_type, 'next_status', next_status)
  );

  return request_row;
end;
$$;

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
