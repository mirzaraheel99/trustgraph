drop policy if exists "invitees read own invitations" on public.organization_invitations;
create policy "invitees read own invitations"
on public.organization_invitations
for select
using (
  invited_email = (
    select lower(profile.email)
    from public.profiles profile
    where profile.id = public.current_profile_id()
  )
);

create or replace function public.accept_organization_invitation(
  target_invitation_id uuid
)
returns public.organization_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  profile_row public.profiles;
  invitation_row public.organization_invitations;
  membership_row public.organization_memberships;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  select *
    into profile_row
  from public.profiles
  where id = current_id;

  if not found then
    raise exception 'Profile required before accepting invitation';
  end if;

  select *
    into invitation_row
  from public.organization_invitations
  where id = target_invitation_id
    and invited_email = lower(profile_row.email)
    and status = 'pending'
    and (expires_at is null or expires_at > now());

  if not found then
    raise exception 'Pending invitation not found for current profile';
  end if;

  insert into public.organization_memberships (
    organization_id,
    profile_id,
    role,
    status,
    invited_by
  )
  values (
    invitation_row.organization_id,
    current_id,
    invitation_row.role,
    'active',
    invitation_row.invited_by_profile_id
  )
  on conflict (organization_id, profile_id, role)
  do update set status = 'active', invited_by = excluded.invited_by, updated_at = now()
  returning * into membership_row;

  update public.organization_invitations
  set status = 'accepted',
      accepted_by_profile_id = current_id
  where id = target_invitation_id
  returning * into invitation_row;

  perform public.write_audit_event(
    'organization.invitation_accepted',
    'organization_invitations',
    invitation_row.id,
    invitation_row.organization_id,
    'Corporate team invitation accepted',
    jsonb_build_object('role', invitation_row.role, 'membership_id', membership_row.id)
  );

  return invitation_row;
end;
$$;
