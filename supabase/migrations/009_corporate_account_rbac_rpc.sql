create or replace function public.create_corporate_account(
  organization_name text,
  organization_type organization_type,
  organization_domain text default null
)
returns public.organization_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  org_row public.organizations;
  membership_row public.organization_memberships;
  admin_role role_key;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if organization_type not in ('employer', 'staffing_agency') then
    raise exception 'Corporate account type must be employer or staffing_agency';
  end if;

  if nullif(trim(organization_name), '') is null then
    raise exception 'Organization name is required';
  end if;

  if not exists (select 1 from public.profiles where id = current_id) then
    raise exception 'Profile required before creating a corporate account';
  end if;

  insert into public.organizations (name, type, status, domain)
  values (
    trim(organization_name),
    organization_type,
    'active',
    nullif(lower(trim(organization_domain)), '')
  )
  returning * into org_row;

  admin_role := case
    when organization_type = 'staffing_agency' then 'staffing_agency_admin'::role_key
    else 'employer_admin'::role_key
  end;

  insert into public.organization_memberships (organization_id, profile_id, role, status)
  values (org_row.id, current_id, admin_role, 'active')
  returning * into membership_row;

  perform public.write_audit_event(
    'organization.corporate_created',
    'organizations',
    org_row.id,
    org_row.id,
    'Corporate account created from TrustGraph app',
    jsonb_build_object('organization_type', organization_type, 'admin_role', admin_role)
  );

  return membership_row;
end;
$$;

create or replace function public.assign_own_corporate_role(
  target_organization_id uuid,
  target_role role_key
)
returns public.organization_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  org_row public.organizations;
  membership_row public.organization_memberships;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  select *
    into org_row
  from public.organizations
  where id = target_organization_id;

  if not found then
    raise exception 'Organization not found';
  end if;

  if not public.has_role(target_organization_id, array['employer_admin', 'staffing_agency_admin', 'system_admin']::role_key[]) then
    raise exception 'Organization admin role required';
  end if;

  if org_row.type = 'employer' and target_role not in ('employer_admin', 'employer_reviewer') then
    raise exception 'Role is not valid for employer accounts';
  end if;

  if org_row.type = 'staffing_agency' and target_role not in ('staffing_agency_admin', 'recruiter') then
    raise exception 'Role is not valid for staffing agency accounts';
  end if;

  insert into public.organization_memberships (organization_id, profile_id, role, status, invited_by)
  values (target_organization_id, current_id, target_role, 'active', current_id)
  on conflict (organization_id, profile_id, role)
  do update set status = 'active', invited_by = excluded.invited_by, updated_at = now()
  returning * into membership_row;

  perform public.write_audit_event(
    'membership.own_role_assigned',
    'organization_memberships',
    membership_row.id,
    target_organization_id,
    'Organization admin activated corporate role for current profile',
    jsonb_build_object('role', target_role)
  );

  return membership_row;
end;
$$;
