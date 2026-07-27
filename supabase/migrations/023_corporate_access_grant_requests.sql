create or replace function public.create_access_grant_request(
  target_subject_email text,
  request_purpose text,
  expires_in_days integer default 14
)
returns public.access_grants
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  requester_membership public.organization_memberships;
  subject_profile public.profiles;
  grant_row public.access_grants;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  select *
    into requester_membership
  from public.organization_memberships membership
  where membership.profile_id = current_id
    and membership.status = 'active'
    and membership.role in ('employer_admin', 'employer_reviewer', 'staffing_agency_admin', 'recruiter')
  order by
    case membership.role
      when 'employer_admin' then 1
      when 'staffing_agency_admin' then 2
      when 'employer_reviewer' then 3
      else 4
    end,
    membership.created_at asc
  limit 1;

  if not found then
    raise exception 'Corporate Verify role required';
  end if;

  select *
    into subject_profile
  from public.profiles
  where lower(email) = lower(trim(target_subject_email))
  limit 1;

  if not found then
    raise exception 'Professional profile not found for requested email';
  end if;

  if request_purpose is null or length(trim(request_purpose)) < 12 then
    raise exception 'Access request purpose must explain the business reason';
  end if;

  insert into public.access_grants (
    subject_profile_id,
    requester_organization_id,
    requested_by_profile_id,
    status,
    purpose,
    expires_at
  )
  values (
    subject_profile.id,
    requester_membership.organization_id,
    current_id,
    'requested',
    trim(request_purpose),
    now() + make_interval(days => greatest(1, least(coalesce(expires_in_days, 14), 90)))
  )
  returning * into grant_row;

  perform public.write_audit_event(
    'access_grant.requested',
    'access_grants',
    grant_row.id,
    grant_row.requester_organization_id,
    'Corporate user requested Passport access',
    jsonb_build_object('subject_profile_id', subject_profile.id, 'expires_at', grant_row.expires_at)
  );

  return grant_row;
end;
$$;
