do $$
begin
  create type reference_request_status as enum (
    'draft',
    'sent',
    'opened',
    'in_progress',
    'submitted',
    'declined',
    'expired',
    'cancelled'
  );
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.reference_requests (
  id uuid primary key default gen_random_uuid(),
  subject_profile_id uuid not null references public.profiles(id) on delete cascade,
  requester_profile_id uuid not null references public.profiles(id) on delete cascade,
  provider_name text not null,
  provider_email text not null,
  relationship text not null,
  status reference_request_status not null default 'sent',
  request_message text,
  submitted_summary text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reference_requests enable row level security;

drop trigger if exists reference_requests_set_updated_at on public.reference_requests;
create trigger reference_requests_set_updated_at
before update on public.reference_requests
for each row execute function public.set_updated_at();

drop policy if exists "professionals read own reference requests" on public.reference_requests;
create policy "professionals read own reference requests"
on public.reference_requests
for select
using (subject_profile_id = public.current_profile_id() or requester_profile_id = public.current_profile_id());

drop policy if exists "professionals create own reference requests" on public.reference_requests;
create policy "professionals create own reference requests"
on public.reference_requests
for insert
with check (subject_profile_id = public.current_profile_id() and requester_profile_id = public.current_profile_id());

drop policy if exists "professionals update own reference requests" on public.reference_requests;
create policy "professionals update own reference requests"
on public.reference_requests
for update
using (subject_profile_id = public.current_profile_id() or requester_profile_id = public.current_profile_id())
with check (subject_profile_id = public.current_profile_id() or requester_profile_id = public.current_profile_id());

drop policy if exists "admin operators read reference requests" on public.reference_requests;
create policy "admin operators read reference requests"
on public.reference_requests
for select
using (
  exists (
    select 1
    from public.organization_memberships membership
    join public.organizations organization on organization.id = membership.organization_id
    where membership.profile_id = public.current_profile_id()
      and membership.status = 'active'
      and organization.type = 'trustgraph'
      and membership.role in ('trustgraph_verifier', 'compliance_admin', 'system_admin', 'auditor')
  )
);

create or replace function public.create_reference_request(
  provider_name text,
  provider_email text,
  relationship text,
  request_message text default null
)
returns public.reference_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  request_row public.reference_requests;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if nullif(trim(provider_name), '') is null then
    raise exception 'Reference provider name is required';
  end if;

  if nullif(trim(provider_email), '') is null then
    raise exception 'Reference provider email is required';
  end if;

  if nullif(trim(relationship), '') is null then
    raise exception 'Reference relationship is required';
  end if;

  insert into public.reference_requests (
    subject_profile_id,
    requester_profile_id,
    provider_name,
    provider_email,
    relationship,
    status,
    request_message,
    expires_at
  )
  values (
    current_id,
    current_id,
    trim(provider_name),
    lower(trim(provider_email)),
    trim(relationship),
    'sent',
    nullif(trim(coalesce(request_message, '')), ''),
    now() + interval '30 days'
  )
  returning * into request_row;

  perform public.write_audit_event(
    'reference_request.sent',
    'reference_requests',
    request_row.id,
    null,
    'Professional created structured reference request',
    jsonb_build_object('provider_email', request_row.provider_email, 'relationship', request_row.relationship)
  );

  insert into public.notification_events (
    recipient_profile_id,
    channel,
    status,
    priority,
    event_type,
    title,
    body,
    target_table,
    target_id
  )
  values (
    current_id,
    'in_app',
    'queued',
    'normal',
    'reference_request.sent',
    'Reference request created',
    'A structured reference request was prepared for ' || request_row.provider_name || '.',
    'reference_requests',
    request_row.id
  );

  return request_row;
end;
$$;

create or replace function public.mark_reference_request_status(
  target_request_id uuid,
  next_status reference_request_status,
  summary text default null
)
returns public.reference_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  request_row public.reference_requests;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  select *
    into request_row
  from public.reference_requests
  where id = target_request_id
    and (subject_profile_id = current_id or requester_profile_id = current_id);

  if not found then
    raise exception 'Reference request not found';
  end if;

  update public.reference_requests
  set
    status = next_status,
    submitted_summary = case when next_status = 'submitted' then nullif(trim(coalesce(summary, submitted_summary, '')), '') else submitted_summary end
  where id = target_request_id
  returning * into request_row;

  perform public.write_audit_event(
    'reference_request.' || next_status::text,
    'reference_requests',
    request_row.id,
    null,
    'Reference request status changed',
    jsonb_build_object('status', next_status)
  );

  return request_row;
end;
$$;
