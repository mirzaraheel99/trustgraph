drop policy if exists "members can read organization peer profiles" on public.profiles;
create policy "members can read organization peer profiles"
on public.profiles
for select
using (
  id = public.current_profile_id()
  or exists (
    select 1
    from public.organization_memberships viewer_membership
    join public.organization_memberships peer_membership
      on peer_membership.organization_id = viewer_membership.organization_id
    where viewer_membership.profile_id = public.current_profile_id()
      and viewer_membership.status = 'active'
      and peer_membership.profile_id = public.profiles.id
      and peer_membership.status in ('active', 'suspended', 'invited')
  )
);

create or replace function public.mark_organization_member_status(
  target_membership_id uuid,
  next_status membership_status
)
returns public.organization_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  target_row public.organization_memberships;
  actor_is_admin boolean;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if next_status not in ('active', 'suspended') then
    raise exception 'Unsupported member status: %', next_status;
  end if;

  select *
    into target_row
  from public.organization_memberships
  where id = target_membership_id;

  if not found then
    raise exception 'Organization member not found';
  end if;

  select exists (
    select 1
    from public.organization_memberships actor_membership
    where actor_membership.organization_id = target_row.organization_id
      and actor_membership.profile_id = current_id
      and actor_membership.status = 'active'
      and actor_membership.role in ('employer_admin', 'staffing_agency_admin', 'system_admin')
  )
    into actor_is_admin;

  if not actor_is_admin then
    raise exception 'Organization admin role required';
  end if;

  if target_row.profile_id = current_id and next_status = 'suspended' then
    raise exception 'Admins cannot suspend their own active seat';
  end if;

  update public.organization_memberships
  set status = next_status,
      updated_at = now()
  where id = target_membership_id
  returning * into target_row;

  perform public.write_audit_event(
    'organization.member_status_changed',
    'organization_memberships',
    target_row.id,
    target_row.organization_id,
    'Organization member status changed',
    jsonb_build_object('status', target_row.status, 'role', target_row.role)
  );

  return target_row;
end;
$$;
