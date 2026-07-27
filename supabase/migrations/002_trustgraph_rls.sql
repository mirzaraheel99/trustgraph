create or replace function public.current_profile_id()
returns uuid
language sql
stable
as $$
  select auth.uid()
$$;

create or replace function public.has_active_membership(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.profile_id = public.current_profile_id()
      and membership.status = 'active'
  )
$$;

create or replace function public.has_role(target_organization_id uuid, allowed_roles role_key[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.profile_id = public.current_profile_id()
      and membership.role = any(allowed_roles)
      and membership.status = 'active'
  )
$$;

create policy "members can read their organizations"
on public.organizations
for select
using (public.has_active_membership(id));

create policy "platform admins can manage organizations"
on public.organizations
for all
using (
  exists (
    select 1
    from public.organization_memberships membership
    join public.organizations organization on organization.id = membership.organization_id
    where membership.profile_id = public.current_profile_id()
      and membership.status = 'active'
      and organization.type = 'trustgraph'
      and membership.role in ('system_admin', 'compliance_admin')
  )
);

create policy "profiles can read own profile"
on public.profiles
for select
using (id = public.current_profile_id());

create policy "profiles can update own profile"
on public.profiles
for update
using (id = public.current_profile_id())
with check (id = public.current_profile_id());

create policy "members can read organization memberships"
on public.organization_memberships
for select
using (
  profile_id = public.current_profile_id()
  or public.has_active_membership(organization_id)
);

create policy "organization admins manage memberships"
on public.organization_memberships
for all
using (public.has_role(organization_id, array['employer_admin', 'staffing_agency_admin', 'system_admin']::role_key[]));

create policy "professionals read own records"
on public.trust_records
for select
using (owner_profile_id = public.current_profile_id());

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

create policy "professionals create own records"
on public.trust_records
for insert
with check (owner_profile_id = public.current_profile_id());

create policy "issuers manage issued records"
on public.trust_records
for all
using (
  issuer_organization_id is not null
  and public.has_role(issuer_organization_id, array['credential_issuer', 'verification_partner', 'trustgraph_verifier', 'system_admin']::role_key[])
);

create policy "professionals read own grants"
on public.access_grants
for select
using (
  subject_profile_id = public.current_profile_id()
  or public.has_active_membership(requester_organization_id)
);

create policy "requesters create access grants"
on public.access_grants
for insert
with check (public.has_role(requester_organization_id, array['employer_admin', 'employer_reviewer', 'staffing_agency_admin', 'recruiter']::role_key[]));

create policy "subjects update grant decisions"
on public.access_grants
for update
using (subject_profile_id = public.current_profile_id())
with check (subject_profile_id = public.current_profile_id());

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

create policy "auditors read audit events"
on public.audit_events
for select
using (
  organization_id is not null
  and public.has_role(organization_id, array['auditor', 'compliance_admin', 'system_admin', 'trustgraph_verifier']::role_key[])
);
