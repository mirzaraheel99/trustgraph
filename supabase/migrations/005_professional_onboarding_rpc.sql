create or replace function public.create_professional_account(
  profile_email text,
  profile_full_name text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  organization_row public.organizations;
  profile_row public.profiles;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if exists (select 1 from public.profiles where id = current_id) then
    select * into profile_row from public.profiles where id = current_id;
    return profile_row;
  end if;

  insert into public.organizations (name, type, status)
  values (coalesce(nullif(profile_full_name, ''), profile_email) || ' Passport', 'professional', 'active')
  returning * into organization_row;

  insert into public.profiles (id, full_name, email, primary_organization_id)
  values (
    current_id,
    coalesce(nullif(profile_full_name, ''), profile_email),
    profile_email,
    organization_row.id
  )
  returning * into profile_row;

  insert into public.organization_memberships (organization_id, profile_id, role, status)
  values (organization_row.id, profile_row.id, 'professional', 'active');

  perform public.write_audit_event(
    'professional_account.created',
    'profiles',
    profile_row.id,
    organization_row.id,
    'self-service onboarding',
    jsonb_build_object('organization_id', organization_row.id)
  );

  return profile_row;
end;
$$;
