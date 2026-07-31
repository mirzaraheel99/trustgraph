create or replace function public.get_account_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_id uuid := auth.uid();
  profile_row public.profiles;
  memberships_json jsonb;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into profile_row
  from public.profiles
  where id = current_id;

  if profile_row.id is null then
    raise exception 'Profile not found';
  end if;

  select coalesce(
    jsonb_agg(
      to_jsonb(membership) || jsonb_build_object('organization', to_jsonb(organization_row))
      order by membership.created_at asc
    ),
    '[]'::jsonb
  )
  into memberships_json
  from public.organization_memberships membership
  join public.organizations organization_row on organization_row.id = membership.organization_id
  where membership.profile_id = current_id
    and membership.status = 'active';

  return jsonb_build_object(
    'profile', to_jsonb(profile_row),
    'memberships', memberships_json
  );
end;
$$;

grant execute on function public.get_account_context() to authenticated;
