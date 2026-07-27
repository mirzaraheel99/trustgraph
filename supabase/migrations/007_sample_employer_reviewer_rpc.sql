create or replace function public.create_sample_employer_reviewer_membership()
returns public.organization_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  employer_org public.organizations;
  membership_row public.organization_memberships;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (select 1 from public.profiles where id = current_id) then
    raise exception 'Profile required before creating employer reviewer membership';
  end if;

  select *
  into employer_org
  from public.organizations
  where name = 'Northstar Health'
    and type = 'employer'
  limit 1;

  if not found then
    insert into public.organizations (name, type, status, domain)
    values ('Northstar Health', 'employer', 'active', 'northstar.example')
    returning * into employer_org;
  end if;

  insert into public.organization_memberships (organization_id, profile_id, role, status)
  values (employer_org.id, current_id, 'employer_reviewer', 'active')
  on conflict (organization_id, profile_id, role)
  do update set status = 'active'
  returning * into membership_row;

  perform public.write_audit_event(
    'membership.sample_employer_reviewer_created',
    'organization_memberships',
    membership_row.id,
    employer_org.id,
    'development sample reviewer role',
    jsonb_build_object('profile_id', current_id)
  );

  return membership_row;
end;
$$;
