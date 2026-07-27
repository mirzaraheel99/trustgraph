do $$
begin
  create type missing_record_request_status as enum (
    'requested',
    'in_progress',
    'fulfilled',
    'declined',
    'cancelled',
    'expired'
  );
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.missing_record_requests (
  id uuid primary key default gen_random_uuid(),
  subject_profile_id uuid not null references public.profiles(id) on delete cascade,
  requester_organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by_profile_id uuid references public.profiles(id),
  record_type record_type not null,
  title text not null,
  reason text not null,
  status missing_record_request_status not null default 'requested',
  due_at timestamptz,
  fulfilled_record_id uuid references public.trust_records(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists missing_records_subject_status_idx on public.missing_record_requests(subject_profile_id, status);
create index if not exists missing_records_requester_status_idx on public.missing_record_requests(requester_organization_id, status);

alter table public.missing_record_requests enable row level security;

drop trigger if exists missing_record_requests_set_updated_at on public.missing_record_requests;
create trigger missing_record_requests_set_updated_at
before update on public.missing_record_requests
for each row execute function public.set_updated_at();

drop policy if exists "missing record participants read requests" on public.missing_record_requests;
create policy "missing record participants read requests"
on public.missing_record_requests
for select
using (
  subject_profile_id = public.current_profile_id()
  or public.has_active_membership(requester_organization_id)
);

drop policy if exists "requesters create missing record requests" on public.missing_record_requests;
create policy "requesters create missing record requests"
on public.missing_record_requests
for insert
with check (
  public.has_role(requester_organization_id, array['employer_admin', 'employer_reviewer', 'staffing_agency_admin', 'recruiter']::role_key[])
);

drop policy if exists "participants update missing record requests" on public.missing_record_requests;
create policy "participants update missing record requests"
on public.missing_record_requests
for update
using (
  subject_profile_id = public.current_profile_id()
  or public.has_role(requester_organization_id, array['employer_admin', 'employer_reviewer', 'staffing_agency_admin', 'recruiter']::role_key[])
)
with check (
  subject_profile_id = public.current_profile_id()
  or public.has_role(requester_organization_id, array['employer_admin', 'employer_reviewer', 'staffing_agency_admin', 'recruiter']::role_key[])
);

create or replace function public.create_missing_record_request(
  subject_email text,
  subject_full_name text,
  requested_record_type record_type,
  request_title text,
  request_reason text,
  due_at timestamptz default null
)
returns public.missing_record_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  requester_membership public.organization_memberships;
  subject_profile public.profiles;
  request_row public.missing_record_requests;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if nullif(trim(subject_email), '') is null then
    raise exception 'Subject email is required';
  end if;

  if nullif(trim(request_title), '') is null then
    raise exception 'Request title is required';
  end if;

  select *
    into requester_membership
  from public.organization_memberships membership
  where membership.profile_id = current_id
    and membership.status = 'active'
    and membership.role in ('employer_admin', 'employer_reviewer', 'staffing_agency_admin', 'recruiter')
  order by membership.updated_at desc
  limit 1;

  if not found then
    raise exception 'Employer or staffing requester role required';
  end if;

  insert into public.profiles (id, full_name, email)
  values (
    gen_random_uuid(),
    coalesce(nullif(trim(subject_full_name), ''), lower(trim(subject_email))),
    lower(trim(subject_email))
  )
  on conflict (email)
  do update set full_name = coalesce(nullif(trim(subject_full_name), ''), public.profiles.full_name), updated_at = now()
  returning * into subject_profile;

  insert into public.missing_record_requests (
    subject_profile_id,
    requester_organization_id,
    requested_by_profile_id,
    record_type,
    title,
    reason,
    due_at
  )
  values (
    subject_profile.id,
    requester_membership.organization_id,
    current_id,
    requested_record_type,
    trim(request_title),
    coalesce(nullif(trim(request_reason), ''), 'Requested by Verify workspace'),
    due_at
  )
  returning * into request_row;

  perform public.write_audit_event(
    'missing_record.requested',
    'missing_record_requests',
    request_row.id,
    requester_membership.organization_id,
    'Verify workspace requested a missing Passport record',
    jsonb_build_object('subject_profile_id', subject_profile.id, 'record_type', requested_record_type)
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
    target_id
  )
  values (
    subject_profile.id,
    requester_membership.organization_id,
    'in_app',
    'queued',
    'normal',
    'missing_record.requested',
    'Missing record requested',
    'A Verify workspace requested a Passport record from you.',
    'missing_record_requests',
    request_row.id
  );

  return request_row;
end;
$$;

create or replace function public.mark_missing_record_request_status(
  target_request_id uuid,
  next_status missing_record_request_status,
  fulfilled_trust_record_id uuid default null
)
returns public.missing_record_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  request_row public.missing_record_requests;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  select *
    into request_row
  from public.missing_record_requests
  where id = target_request_id;

  if not found then
    raise exception 'Missing record request not found';
  end if;

  if request_row.subject_profile_id <> current_id
    and not public.has_role(request_row.requester_organization_id, array['employer_admin', 'employer_reviewer', 'staffing_agency_admin', 'recruiter']::role_key[]) then
    raise exception 'Missing record request participant role required';
  end if;

  update public.missing_record_requests
  set status = next_status,
      fulfilled_record_id = case when next_status = 'fulfilled' then fulfilled_trust_record_id else public.missing_record_requests.fulfilled_record_id end
  where id = target_request_id
  returning * into request_row;

  perform public.write_audit_event(
    'missing_record.status_changed',
    'missing_record_requests',
    request_row.id,
    request_row.requester_organization_id,
    'Missing record request status changed',
    jsonb_build_object('status', next_status, 'fulfilled_record_id', fulfilled_trust_record_id)
  );

  return request_row;
end;
$$;
