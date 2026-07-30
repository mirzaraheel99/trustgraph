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
