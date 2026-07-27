create or replace function public.create_sample_access_grant_request()
returns public.access_grants
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  requester_org public.organizations;
  grant_row public.access_grants;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (select 1 from public.profiles where id = current_id) then
    raise exception 'Profile required before creating sample grant';
  end if;

  select *
  into requester_org
  from public.organizations
  where name = 'Northstar Health'
    and type = 'employer'
  limit 1;

  if not found then
    insert into public.organizations (name, type, status, domain)
    values ('Northstar Health', 'employer', 'active', 'northstar.example')
    returning * into requester_org;
  end if;

  insert into public.access_grants (
    subject_profile_id,
    requester_organization_id,
    status,
    purpose,
    expires_at
  )
  values (
    current_id,
    requester_org.id,
    'requested',
    'ED contract readiness review for identity, employment, license, and certification records',
    now() + interval '14 days'
  )
  returning * into grant_row;

  perform public.write_audit_event(
    'access_grant.sample_requested',
    'access_grants',
    grant_row.id,
    requester_org.id,
    'development sample request',
    jsonb_build_object('subject_profile_id', current_id)
  );

  return grant_row;
end;
$$;
