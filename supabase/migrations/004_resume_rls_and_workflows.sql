drop policy if exists "approved grant requesters read shared records" on public.trust_records;
create policy "approved grant requesters read shared records"
on public.trust_records
for select
using (
  exists (
    select 1
    from public.access_grants access_grant
    join public.access_grant_records shared_record on shared_record.access_grant_id = access_grant.id
    where shared_record.trust_record_id = trust_records.id
      and access_grant.status = 'approved'
      and (access_grant.expires_at is null or access_grant.expires_at > now())
      and public.has_active_membership(access_grant.requester_organization_id)
  )
);

drop policy if exists "professionals create own records" on public.trust_records;
create policy "professionals create own records"
on public.trust_records
for insert
with check (owner_profile_id = public.current_profile_id());

drop policy if exists "issuers manage issued records" on public.trust_records;
create policy "issuers manage issued records"
on public.trust_records
for all
using (
  issuer_organization_id is not null
  and public.has_role(issuer_organization_id, array['credential_issuer', 'verification_partner', 'trustgraph_verifier', 'system_admin']::role_key[])
);

drop policy if exists "professionals read own grants" on public.access_grants;
create policy "professionals read own grants"
on public.access_grants
for select
using (
  subject_profile_id = public.current_profile_id()
  or public.has_active_membership(requester_organization_id)
);

drop policy if exists "requesters create access grants" on public.access_grants;
create policy "requesters create access grants"
on public.access_grants
for insert
with check (public.has_role(requester_organization_id, array['employer_admin', 'employer_reviewer', 'staffing_agency_admin', 'recruiter']::role_key[]));

drop policy if exists "subjects update grant decisions" on public.access_grants;
create policy "subjects update grant decisions"
on public.access_grants
for update
using (subject_profile_id = public.current_profile_id())
with check (subject_profile_id = public.current_profile_id());

drop policy if exists "grant participants read scoped record links" on public.access_grant_records;
create policy "grant participants read scoped record links"
on public.access_grant_records
for select
using (
  exists (
    select 1
    from public.access_grants access_grant
    where access_grant.id = access_grant_records.access_grant_id
      and (
        access_grant.subject_profile_id = public.current_profile_id()
        or public.has_active_membership(access_grant.requester_organization_id)
      )
  )
);

drop policy if exists "subjects manage scoped record links" on public.access_grant_records;
create policy "subjects manage scoped record links"
on public.access_grant_records
for all
using (
  exists (
    select 1
    from public.access_grants access_grant
    where access_grant.id = access_grant_records.access_grant_id
      and access_grant.subject_profile_id = public.current_profile_id()
  )
);

drop policy if exists "auditors read audit events" on public.audit_events;
create policy "auditors read audit events"
on public.audit_events
for select
using (
  organization_id is not null
  and public.has_role(organization_id, array['auditor', 'compliance_admin', 'system_admin', 'trustgraph_verifier']::role_key[])
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists memberships_set_updated_at on public.organization_memberships;
create trigger memberships_set_updated_at
before update on public.organization_memberships
for each row execute function public.set_updated_at();

drop trigger if exists records_set_updated_at on public.trust_records;
create trigger records_set_updated_at
before update on public.trust_records
for each row execute function public.set_updated_at();

drop trigger if exists grants_set_updated_at on public.access_grants;
create trigger grants_set_updated_at
before update on public.access_grants
for each row execute function public.set_updated_at();

create or replace function public.write_audit_event(
  event_action text,
  event_target_table text,
  event_target_id uuid,
  event_organization_id uuid default null,
  event_reason text default null,
  event_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  event_id uuid;
begin
  insert into public.audit_events (
    actor_profile_id,
    organization_id,
    action,
    target_table,
    target_id,
    reason,
    metadata
  )
  values (
    public.current_profile_id(),
    event_organization_id,
    event_action,
    event_target_table,
    event_target_id,
    event_reason,
    event_metadata
  )
  returning id into event_id;

  return event_id;
end;
$$;

create or replace function public.decide_access_grant(
  target_grant_id uuid,
  next_status access_grant_status,
  decision_reason text default null
)
returns public.access_grants
language plpgsql
security definer
set search_path = public
as $$
declare
  grant_row public.access_grants;
begin
  if next_status not in ('approved', 'declined', 'revoked') then
    raise exception 'Invalid access grant decision status: %', next_status;
  end if;

  select *
  into grant_row
  from public.access_grants
  where id = target_grant_id
  for update;

  if not found then
    raise exception 'Access grant not found: %', target_grant_id;
  end if;

  if grant_row.subject_profile_id <> public.current_profile_id() then
    raise exception 'Only the subject can decide this access grant';
  end if;

  update public.access_grants
  set status = next_status
  where id = target_grant_id
  returning * into grant_row;

  perform public.write_audit_event(
    'access_grant.' || next_status::text,
    'access_grants',
    target_grant_id,
    grant_row.requester_organization_id,
    decision_reason,
    jsonb_build_object('subject_profile_id', grant_row.subject_profile_id)
  );

  return grant_row;
end;
$$;

create or replace function public.mark_trust_record_status(
  target_record_id uuid,
  next_status record_status,
  status_reason text default null
)
returns public.trust_records
language plpgsql
security definer
set search_path = public
as $$
declare
  record_row public.trust_records;
begin
  select *
  into record_row
  from public.trust_records
  where id = target_record_id
  for update;

  if not found then
    raise exception 'Trust record not found: %', target_record_id;
  end if;

  if record_row.owner_profile_id <> public.current_profile_id()
    and (
      record_row.issuer_organization_id is null
      or not public.has_role(
        record_row.issuer_organization_id,
        array['credential_issuer', 'verification_partner', 'trustgraph_verifier', 'compliance_admin', 'system_admin']::role_key[]
      )
    )
  then
    raise exception 'Current profile cannot update this trust record';
  end if;

  update public.trust_records
  set status = next_status
  where id = target_record_id
  returning * into record_row;

  perform public.write_audit_event(
    'trust_record.status_changed',
    'trust_records',
    target_record_id,
    record_row.issuer_organization_id,
    status_reason,
    jsonb_build_object('status', next_status)
  );

  return record_row;
end;
$$;
